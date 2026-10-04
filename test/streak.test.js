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