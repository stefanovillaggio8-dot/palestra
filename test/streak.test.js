// streak.test.js -- la streak: giorni consecutivi, reset, milestone e colori.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  giorniAllenati, calcolaStreak, aspettoStreak, livelloFuoco, prossimoMilestone,
  traguardiFinoA, traguardiNuovi, ricompensaTraguardo, contaConsecutivi, LIVELLI_FUOCO,
} from '../src/streak.js';

function seduta(data, stato = 'completata') {
  return { id: 's' + data, data, stato, ora_inizio: data + 'T18:00:00.000Z' };
}

test('1. contano solo gli allenamenti davvero finiti', () => {
  const giorni = giorniAllenati([
    seduta('2026-10-01'),
    seduta('2026-10-02', 'in_corso'),   // non finita: non conta
    seduta('2026-10-03'),
    { id: 'x', data: '2026-10-04', stato: 'completata', eliminata: true }, // nel cestino
  ]);
  assert.deepEqual(giorni, ['2026-10-03', '2026-10-01']);
});

test('2. la stessa giornata non viene contata due volte', () => {
  const giorni = giorniAllenati([seduta('2026-10-01'), seduta('2026-10-01'), seduta('2026-10-02')]);
  assert.deepEqual(giorni, ['2026-10-02', '2026-10-01']);
});

test('3. la streak sale di un giorno alla volta', () => {
  const s = calcolaStreak([seduta('2026-10-03'), seduta('2026-10-02'), seduta('2026-10-01')], '2026-10-03');
  assert.equal(s.giorni, 3);
  assert.equal(s.attiva, true);
  assert.equal(s.interrotta, false);
});

test('4. se oggi non hai ancora allenato, la streak regge fino a ieri', () => {
  const s = calcolaStreak([seduta('2026-10-03'), seduta('2026-10-02')], '2026-10-04');
  assert.equal(s.giorni, 2);
  assert.equal(s.attiva, true);
  assert.equal(s.fattoOggi, false);
});

test('5. saltare un giorno INTERROMPE la streak e riparte da zero', () => {
  const s = calcolaStreak([seduta('2026-10-01'), seduta('2026-10-02'), seduta('2026-10-03')], '2026-10-05');
  assert.equal(s.giorni, 0);
  assert.equal(s.attiva, false);
  assert.equal(s.interrotta, true);
  assert.match(s.testo, /riparti da 1/);
});

test('6. il giorno mancante NON si recupera dopo', () => {
  const giorni = ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-11'];
  const s = calcolaStreak(giorni.map((d) => seduta(d)), '2026-10-11');
  assert.equal(s.giorni, 1, 'il 10 non si recupera: si riparte dall\'11, quindi 1');
});

test('7. senza allenamenti la streak e\' zero e non e\' un errore', () => {
  const s = calcolaStreak([], '2026-10-03');
  assert.equal(s.giorni, 0);
  assert.equal(s.attiva, false);
  assert.match(s.testo, /primo allenamento/);
});

test('8. la streak NON ha un tetto', () => {
  const sedute = [];
  // 1200 giorni consecutivi fino a ieri rispetto al 15 giugno 2026
  const oggi = new Date(Date.UTC(2026, 5, 15));
  for (let i = 1; i <= 1200; i++) {
    const d = new Date(oggi.getTime() - i * 86400000);
    sedute.push(seduta(d.toISOString().slice(0, 10)));
  }
  const s = calcolaStreak(sedute, '2026-06-15');
  assert.equal(s.giorni, 1200);
  assert.equal(s.attiva, true);
});

test('9. i traguardi sono dinamici e non si fermano a 1000', () => {
  assert.equal(prossimoMilestone(0), 10);
  assert.equal(prossimoMilestone(10), 20);
  assert.equal(prossimoMilestone(95), 100);
  assert.equal(prossimoMilestone(1500), 2000);
  const t = traguardiFinoA(1200);
  assert.ok(t.includes(1000));
  assert.ok(!t.includes(1200), '1200 non e\' un traguardo: oltre 1000 si conta a mille');
  assert.ok(traguardiFinoA(2500).includes(2000), 'oltre 1000 si continua a mille');
  assert.ok(traguardiFinoA(3000).includes(3000));
});

test('10. un traguardo non viene ridato', () => {
  const nuovi = traguardiNuovi(52, [10, 20, 30, 40, 50]);
  assert.deepEqual(nuovi, []);
  const nuovi2 = traguardiNuovi(55, [10, 20, 30, 40, 50]);
  assert.deepEqual(nuovi2, []);
});

test('11. il colore del fuoco cambia ai traguardi', () => {
  assert.equal(livelloFuoco(0).chiave, 'spenta');
  assert.equal(livelloFuoco(1).chiave, 'normale');
  assert.equal(livelloFuoco(9).chiave, 'normale');
  assert.equal(livelloFuoco(10).chiave, 'giallo');
  assert.equal(livelloFuoco(20).chiave, 'arancio');
  assert.equal(livelloFuoco(50).chiave, 'rosa');
  assert.equal(livelloFuoco(100).chiave, 'viola');
  assert.equal(livelloFuoco(500).chiave, 'blu');
  assert.equal(livelloFuoco(5000).chiave, 'ciano');
});

test('12. ogni livello di fuoco ha un colore diverso', () => {
  const colori = LIVELLI_FUOCO.map((l) => l.colore);
  assert.equal(new Set(colori).size, colori.length);
});

test('13. la streak spenta appare spenta', () => {
  const spenta = aspettoStreak(calcolaStreak([seduta('2026-01-01')], '2026-10-03'));
  assert.equal(spenta.acceso, false);
  assert.equal(spenta.colore, LIVELLI_FUOCO[0].colore);
  const accesa = aspettoStreak(calcolaStreak([seduta('2026-10-03')], '2026-10-03'));
  assert.equal(accesa.acceso, true);
  assert.equal(accesa.giorni, 1);
});

test('14. il traguardo dà piu\' Aura quanto e\' alto', () => {
  assert.ok(ricompensaTraguardo(10).aura < ricompensaTraguardo(100).aura);
  assert.ok(ricompensaTraguardo(100).aura < ricompensaTraguardo(1000).aura);
  assert.equal(ricompensaTraguardo(3).aura, 0, 'sotto i 10 giorni niente premio');
});

test('15. contaConsecutivi non si blocca', () => {
  assert.equal(contaConsecutivi([], '2026-10-03'), 0);
  assert.equal(contaConsecutivi(['2026-10-02', '2026-10-01'], '2026-10-03'), 2);
});

// ---------------------------------------------------------------------------
// IL CASO DI STE, 13/10/2026: la card diceva 0 con tre allenamenti a portale
// ---------------------------------------------------------------------------
//
// "sono a 3 di streak ma dice 0 anche se ancora devo allenarmi e spunta che devo
// andarci e si attiva ad 1"
//
// Ottobre 2026: il 7 e' un mercoledi', il 9 un venerdi', il 10 un sabato, e i
// giorni scelti da Ste sono mar/mer/ven/sab. Il calendario mostrava i tre
// allenamenti, ma la card diceva zero e "sale a 1".
//
// Il difetto: il cammino che verifica se la streak e' ancora viva guardava in
// AVANTI fino a oggi, e trattava OGGI come un giorno saltato quando oggi e' uno
// dei giorni scelti e non l'hai ancora fatto. Ma oggi non e' finito.
//
// Nota che il test 4 qui sopra copriva lo stesso caso, ma SOLO senza giorni
// scelti: con i giorni scelti il percorso e' un altro, e quello non era provato.
const GIORNI_STE = [2, 3, 5, 6];   // mar, mer, ven, sab

test('16. con giorni scelti, oggi non ancora allenato NON azzera la streak', () => {
  const s = calcolaStreak(
    [seduta('2026-10-07'), seduta('2026-10-09'), seduta('2026-10-10')],
    '2026-10-13',
    { giorni_allenamento: GIORNI_STE },
  );
  assert.equal(s.giorni, 3, 'tre allenamenti di fila: mercoledi 7, venerdi 9, sabato 10');
  assert.equal(s.attiva, true, 'la streak e\' accesa: oggi non e\' ancora finito');
  assert.equal(s.fattoOggi, false, 'oggi non ha ancora allenato');
  assert.equal(s.interrotta, false, 'non e\' interrotta: nessun giorno suo e\' saltato');
  assert.match(s.testo, /3 allenamenti di fila/);
});

test('17. la card deve dire che oggi sale a 4, non "sale a 1"', () => {
  const s = calcolaStreak(
    [seduta('2026-10-07'), seduta('2026-10-09'), seduta('2026-10-10')],
    '2026-10-13',
    { giorni_allenamento: GIORNI_STE },
  );
  // allenandoti oggi la streak sale di uno: il testo non deve promettere "da 1"
  assert.doesNotMatch(s.testo, /riparti da 1/,
    'la streak non e\' rotta, quindi non deve parlare di ripartire da 1');
  assert.equal(s.prossimoObiettivo, 10, 'il prossimo obiettivo parte dal record');
});

test('18. saltare un giorno scelto PRIMA di oggi rompe davvero', () => {
  // saltato il mercoledi' 7, che era un suo giorno: la serie 9-10 resta viva e
  // vale 2. Il punto e\' che non si deve confondere "rotta" con "azzerata".
  const s = calcolaStreak(
    [seduta('2026-10-09'), seduta('2026-10-10')],
    '2026-10-13',
    { giorni_allenamento: GIORNI_STE },
  );
  assert.equal(s.giorni, 2, 'la serie 9-10 e\' ancora viva');
  assert.equal(s.attiva, true);
});

test('19. saltare un giorno NON scelto non rompe niente', () => {
  // saltato solo il lunedi' 12, che non e' un suo giorno
  const s = calcolaStreak(
    [seduta('2026-10-07'), seduta('2026-10-09'), seduta('2026-10-10')],
    '2026-10-13',
    { giorni_allenamento: GIORNI_STE },
  );
  assert.equal(s.giorni, 3, 'il lunedi\' non e\' un giorno suo: il riposo non azzera');
  assert.equal(s.attiva, true);
});

test('20. allenando oggi la streak sale davvero di uno', () => {
  const s = calcolaStreak(
    [seduta('2026-10-07'), seduta('2026-10-09'), seduta('2026-10-10'), seduta('2026-10-13')],
    '2026-10-13',
    { giorni_allenamento: GIORNI_STE },
  );
  assert.equal(s.giorni, 4);
  assert.equal(s.fattoOggi, true);
  assert.equal(s.record, 4);
});