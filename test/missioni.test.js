// missioni.test.js -- Daily, Weekly e Secret: le regole che devono valere
// per tutti, senza eccezioni.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  POOL, DIFFICOLTA, setSettimanale, dailyDi, idSettimana, quadroMissioni,
  ricompensaMissione, missionePerId, contaCompletate, storicoMissioni, hashTesto,
  generatoreDa, NUMERO_WEEKLY, NUMERO_SECRET, MOLTIPLICATORE_SECRET,
} from '../src/missioni.js';

const SETTIMANA = '2026-W40';

test('1. il pool ha un sacco di missioni e tutte hanno id unico', () => {
  assert.ok(POOL.length >= 40, 'il pool deve essere grande, non 5 missioni');
  const id = new Set(POOL.map((m) => m.id));
  assert.equal(id.size, POOL.length, 'due missioni hanno lo stesso id');
  for (const m of POOL) {
    assert.ok(m.titolo && m.testo, 'missione senza testo: ' + m.id);
    assert.ok(DIFFICOLTA[m.difficolta], 'difficolta\' sconosciuta: ' + m.id);
  }
});

test('2. nessuna missione e\' pericolosa o fuori luogo', () => {
  // Controllo che il pool non chieda mai cose che fanno male, che rovinano
  // l'attrezzatura o che toccano persone senza il loro permesso.
  //
  // Nota: la parola "sconosciuto" NON e\' piu\' vietata. Ste ha chiesto delle
  // sfide che vedono sconosciuti, e sono innocue: sono imbarazzanti per chi le
  // fa, non per gli altri. Restano vietate le cose che fanno davvero danno.
  const vietate = /filmare|riprendere|video|stranier|insicur|pericolos|rovinare|attrezzatur|sabot|non\s+chiedere\s+il\s+permesso/i;
  for (const m of POOL) {
    assert.equal(vietate.test(m.testo), false, 'missione da rivedere: ' + m.id);
  }
});

test('2b. con chi non conosci mai nessun contatto fisico', () => {
  // Il gruppo "sfide con gli sconosciuti" puo' usare solo la parola e il
  // sorriso. Vietato toccare, spingere, abbracciare, mettere le mani addosso a
  // chi non ha chiesto nulla. Con gli amici invece si puo' fare il pugno, per
  // quello la regola non vale.
  const contatto = /\b(tocca|toccare|toccarla|toccagli|toccargli|spingi|spingere|spingila|striscia|strisciare|abbraccia|abbracciare|palleggia|palleggi|mani\s+(sui|addosso|in\s+faccia))\b/i;
  for (const m of POOL) {
    // solo nelle missioni che vedono persone non conosciute
    if (!/sconosciut|non\s+conosci/i.test(m.testo)) continue;
    assert.equal(contatto.test(m.testo), false,
      'missione con contatto fisico verso uno sconosciuto, da rivedere: ' + m.id);
  }
});

test('2c. le sfide con gli sconosciuti esistono e sono scritte semplici', () => {
  const conSconosciuto = POOL.filter((m) => /sconosciut|non\s+conosci/i.test(m.testo));
  assert.ok(conSconosciuto.length >= 6, 'ci sono le sfide che vedono sconosciuti');
  for (const m of conSconosciuto) {
    // frasi corte e parole comuni: niente linguaggio complicato
    assert.ok(m.testo.length < 170, 'frase non troppo lunga: ' + m.id);
    assert.ok(/[.!]$/.test(m.testo.trim()), 'la frase finisce con un punto: ' + m.id);
  }
});

test('3. l\'identificatore di settimana e\' nel formato giusto', () => {
  assert.match(idSettimana('2026-10-05'), /^\d{4}-W\d{2}$/);
  assert.equal(idSettimana('2026-10-05'), idSettimana('2026-10-11'), 'la stessa settimana, stesso id');
  assert.notEqual(idSettimana('2026-10-12'), idSettimana('2026-10-05'), 'la settimana dopo cambia');
});

test('4. il set settimanale e\' UGUALE PER TUTTI', () => {
  const a = setSettimanale(SETTIMANA);
  const b = setSettimanale(SETTIMANA);
  assert.deepEqual(a.weekly.map((m) => m.id), b.weekly.map((m) => m.id));
  assert.deepEqual(a.secret.map((m) => m.id), b.secret.map((m) => m.id));
  assert.equal(a.weekly.length, NUMERO_WEEKLY);
  assert.equal(a.secret.length, NUMERO_SECRET);
});

test('5. la settimana dopo ha un set diverso', () => {
  const a = setSettimanale('2026-W40');
  const b = setSettimanale('2026-W41');
  const idsA = a.weekly.map((m) => m.id);
  const idsB = b.weekly.map((m) => m.id);
  assert.notDeepEqual(idsA, idsB, 'due settimane diverse devono avere set diversi');
});

test('6. dentro una settimana non ci sono missioni ripetute', () => {
  for (const s of ['2026-W40', '2026-W41', '2026-W01', '2026-W52']) {
    const set = setSettimanale(s);
    const tutti = [...set.weekly, ...set.secret].map((m) => m.id);
    assert.equal(new Set(tutti).size, tutti.length, 'missione ripetuta nella settimana ' + s);
  }
});

test('7. le secret sono davvero segrete (id dedicato) e valgono di piu\'', () => {
  const set = setSettimanale(SETTIMANA);
  for (const m of set.secret) assert.equal(m.segreta, true);
  const ric = ricompensaMissione(set.secret[0], { segreta: true });
  const ricNormale = ricompensaMissione(set.secret[0], { segreta: false });
  assert.ok(ric.aura > ricNormale.aura, 'una secret deve valere di piu\'');
  assert.equal(ric.aura, Math.round(ricNormale.aura * MOLTIPLICATORE_SECRET));
});

test('8. piu\' e\' difficile, piu\' alta la ricompensa', () => {
  const ordine = ['easy', 'unhinged', 'insane', 'legendary'];
  for (let i = 1; i < ordine.length; i++) {
    assert.ok(DIFFICOLTA[ordine[i]].aura > DIFFICOLTA[ordine[i - 1]].aura);
    assert.ok(DIFFICOLTA[ordine[i]].xp > DIFFICOLTA[ordine[i - 1]].xp);
  }
  assert.equal(DIFFICOLTA.easy.aura, 20);
  assert.equal(DIFFICOLTA.unhinged.aura, 40);
  assert.equal(DIFFICOLTA.insane.aura, 75);
  assert.equal(DIFFICOLTA.legendary.aura, 150);
});

test('9. la Daily e\' diversa per ogni utente', () => {
  const a = dailyDi('account-1', '2026-10-05');
  const b = dailyDi('account-2', '2026-10-05');
  const ids = new Set();
  for (let i = 0; i < 12; i++) ids.add(dailyDi('account-' + i, '2026-10-05').id);
  assert.ok(ids.size > 1, 'la Daily deve cambiare da utente a utente');
  assert.ok(a && b);
});

test('10. la Daily cambia ogni giorno ed e\' stabile dentro lo stesso giorno', () => {
  const primo = dailyDi('account-1', '2026-10-05');
  const stesso = dailyDi('account-1', '2026-10-05');
  assert.equal(primo.id, stesso.id);
  const giorni = new Set();
  for (let i = 1; i <= 20; i++) {
    giorni.add(dailyDi('account-1', '2026-10-' + String(i).padStart(2, '0')).id);
  }
  assert.ok(giorni.size > 5, 'in 20 giorni la Daily deve cambiare parecchie volte');
});

test('11. la Daily non e\' mai una missione segreta', () => {
  for (let i = 1; i <= 15; i++) {
    const m = dailyDi('account-1', '2026-11-' + String(i).padStart(2, '0'));
    assert.equal(m.segreta, false);
  }
});

test('12. il quadro missioni dice cosa e\' gia\' fatto', () => {
  const q = quadroMissioni({ accountId: 'a1', dataISO: '2026-10-05', settimana: SETTIMANA, completamenti: [] });
  assert.ok(q.daily && !q.daily.completata);
  assert.equal(q.weekly.length, NUMERO_WEEKLY);
  assert.equal(q.secret.length, NUMERO_SECRET);
  assert.equal(q.settimana, SETTIMANA);
  // le secret partono coperte
  for (const s of q.secret) assert.equal(s.rivelata, false);
  for (const w of q.weekly) assert.equal(w.rivelata, true);
});

test('13. completare una missione una volta sola: la chiave e\' univoca', () => {
  const q = quadroMissioni({ accountId: 'a1', dataISO: '2026-10-05', settimana: SETTIMANA, completamenti: [] });
  const chiave = q.daily.chiave;
  assert.equal(chiave, 'a1:' + q.daily.missione.id + ':2026-10-05');
  const dopo = quadroMissioni({
    accountId: 'a1', dataISO: '2026-10-05', settimana: SETTIMANA,
    completamenti: [{ id: chiave, missione_id: q.daily.missione.id, categoria: 'daily', data: '2026-10-05', settimana: SETTIMANA, completata_il: '2026-10-05T19:00:00.000Z', aura: 30 }],
  });
  assert.equal(dopo.daily.completata, true, 'la stessa chiave non puo\' completarsi due volte');
});

test('14. domani la Daily e\' di nuovo disponibile', () => {
  const ieri = quadroMissioni({ accountId: 'a1', dataISO: '2026-10-05', settimana: SETTIMANA, completamenti: [] });
  const chiave = ieri.daily.chiave;
  const oggi = quadroMissioni({
    accountId: 'a1', dataISO: '2026-10-06', settimana: SETTIMANA,
    completamenti: [{ id: chiave, categoria: 'daily', data: '2026-10-05', settimana: SETTIMANA, completata_il: '2026-10-05T19:00:00.000Z' }],
  });
  assert.equal(oggi.daily.completata, false);
  assert.notEqual(oggi.daily.chiave, chiave);
});

test('15. la settimana dopo le weekly ricominciano', () => {
  const q1 = quadroMissioni({ accountId: 'a1', dataISO: '2026-10-05', settimana: '2026-W40', completamenti: [] });
  const chiavi = q1.weekly.map((w) => w.chiave);
  const completamentiRigi = chiavi.map((k) => ({ id: k, categoria: 'weekly', settimana: '2026-W40', completata_il: '2026-10-05T19:00:00.000Z' }));
  const q2 = quadroMissioni({
    accountId: 'a1', dataISO: '2026-10-12', settimana: '2026-W41',
    completamenti: completamentiRigi,
  });
  assert.equal(q2.weekly.every((w) => !w.completata), true, 'la settimana nuova ricomincia');
  assert.equal(contaCompletate(completamentiRigi, { settimana: '2026-W41' }), 0);
  assert.equal(contaCompletate(completamentiRigi), 5, 'lo storico della settimana passata resta');
});

test('16. lo storico tiene le missioni passate', () => {
  const completamenti = [
    { id: 'a1:il-campione:2026-10-01', missione_id: 'il-campione', categoria: 'daily', data: '2026-10-01', settimana: '2026-W40', completata_il: '2026-10-01T18:00:00.000Z', aura: 20 },
    { id: 'a1:la-lotta:2026-W39', missione_id: 'la-lotta', categoria: 'weekly', data: null, settimana: '2026-W39', completata_il: '2026-09-28T18:00:00.000Z', aura: 40 },
  ];
  const storico = storicoMissioni(completamenti);
  assert.equal(storico.length, 2);
  assert.equal(storico[0].titolo, 'IL CAMPIONE');
  assert.equal(storico[0].missione.titolo, 'IL CAMPIONE');
  assert.equal(contaCompletate(completamenti), 2);
  assert.equal(contaCompletate(completamenti, { settimana: '2026-W39' }), 1);
});

test('17. contare le missioni aperte non e\' contarle come fatte', () => {
  const aperti = [{ id: 'x', categoria: 'daily', data: '2026-10-05', settimana: SETTIMANA, rivelata: true }];
  assert.equal(contaCompletate(aperti), 0);
});

test('18. missionePerId trova la missione del pool', () => {
  const m = missionePerId('il-boss-finale');
  assert.ok(m);
  assert.equal(missionePerId('non-esiste'), null);
});

test('19. lo stesso seme dà sempre la stessa sequenza (su qualsiasi dispositivo)', () => {
  const a = generatoreDa('2026-W40');
  const b = generatoreDa('2026-W40');
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  assert.equal(hashTesto('abc'), hashTesto('abc'));
  assert.notEqual(hashTesto('abc'), hashTesto('abd'));
});

test('20. ogni missione del pool e\' usabile: settimana diverse coprono tutto', () => {
  const viste = new Set();
  for (let w = 1; w <= 40; w++) {
    const set = setSettimanale(`2026-W${String(w).padStart(2, '0')}`);
    for (const m of set.weekly) viste.add(m.id);
  }
  assert.ok(viste.size >= 35, 'in 40 settimane devono comparire quasi tutte le missioni normali');
});