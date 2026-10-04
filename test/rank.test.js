// rank.test.js -- il motore del Rank: soglie diverse per esercizio, la
// performance migliore (non l'ultima), gli LP calcolati e la classifica.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  stimaMassimo, punteggioSerie, performanceEsercizio, recordEsercizio,
  calcolaRank, classificaEsercizio, storicoMiglioramenti, recordAccount,
  rankPrincipale, distribuzioneRank,
} from '../src/rank.js';
import {
  RANK, MISURE, profiloEsercizio, soglieDaRiferimento, ETICHETTE_MISURA, divisioneDaLp,
} from '../src/rank-config.js';

const chest = { id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'macchina' };
const lateral = { id: 'ex-cable-lateral-raise', nome: 'Cable Lateral Raise', convenzione: 'cavo_totali' };

function serie(peso, rip, extra = {}) {
  return { id: 's' + peso + 'x' + rip + Math.random().toString(36).slice(2, 6), peso, ripetizioni: rip, stato: 'fatta', ordine: 1, ...extra };
}

test('1. i sette rank sono quelli richiesti, in ordine', () => {
  assert.deepEqual(RANK.map((r) => r.id), ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'titan', 'olympian']);
});

test('2. le cinque misure esistono tutte', () => {
  const valori = Object.values(MISURE);
  for (const v of ['kg_reps', 'solo_reps', 'tempo', 'distanza', 'kg_tempo']) {
    assert.ok(valori.includes(v), 'manca la misura ' + v);
    assert.ok(ETICHETTE_MISURA[v], 'manca l\'etichetta di ' + v);
  }
});

test('3. la stima del massimo tiene conto di peso e ripetizioni', () => {
  assert.equal(stimaMassimo(50, 1), 50);
  assert.ok(stimaMassimo(50, 5) > 50, '5 ripetizioni valgono piu\' di 1');
  assert.ok(stimaMassimo(50, 10) > stimaMassimo(50, 5), '10 ripetizioni valgono piu\' di 5');
  // una serie piu\' leggera ma lunga puo\' valere come una pesante e corta
  assert.ok(stimaMassimo(40, 12) > stimaMassimo(45, 3));
  assert.equal(stimaMassimo(null, 5), null);
  assert.equal(stimaMassimo(50, null), null);
  assert.equal(stimaMassimo(0, 5), null);
});

test('4. il rank prende la performance MIGLIORE, non l\'ultima serie', () => {
  // 45 kg x 12 e' la piu' forte delle tre (stima 64.8 kg, formula lunga):
  // l'ultima, 40 x 10, resta indietro. Il rank non dipende dall'ordine.
  const serieDelGiorno = [serie(50, 5), serie(45, 12), serie(40, 10)];
  const res = performanceEsercizio(serieDelGiorno, chest);
  assert.equal(res.tutte.length, 3);
  assert.equal(res.migliore.serie.peso, 45);
  assert.equal(res.migliore.serie.ripetizioni, 12);
  // anche mettendola per ultima il risultato non cambia
  const rovesciata = performanceEsercizio([serie(40, 10), serie(45, 12), serie(50, 5)], chest);
  assert.equal(rovesciata.migliore.serie.peso, 45);
  assert.equal(rovesciata.migliore.serie.ripetizioni, 12);
});

test('5. la stessa serie non viene contata due volte e le serie non fatte sono escluse', () => {
  const s = [serie(45, 8), serie(90, 3, { stato: 'da_fare' }), serie(45, 8, { id: 'altra' })];
  const res = performanceEsercizio(s, chest);
  assert.equal(res.tutte.length, 2);
});

test('6. le serie con lo spotter non sono record', () => {
  const res = performanceEsercizio([serie(120, 5, { spotter: true })], chest);
  assert.equal(res.migliore, null);
  const motivo = punteggioSerie(serie(120, 5, { spotter: true }), profiloEsercizio(chest));
  assert.equal(motivo.valido, false);
  assert.match(motivo.motivo, /spotter/);
});

test('7. OGNI ESERCIZIO HA SOGLIE PROPRIE: 50 kg non danno lo stesso rank', () => {
  const a = recordEsercizio([serie(50, 8)], chest);
  const b = recordEsercizio([serie(50, 8)], lateral);
  assert.notEqual(a.rankId, b.rankId, 'stesso peso, stesso rank: le soglie non sono diverse');
  assert.ok(b.rank.indice > a.rank.indice, 'il lateral raise con gli stessi numeri e\' piu\' difficile');
});

test('8. gli LP stanno fra 0 e 99 dentro un rank e crescono col punteggio', () => {
  const profilo = profiloEsercizio(chest);
  const basso = calcolaRank(profilo.soglie[0], profilo);
  const alto = calcolaRank(profilo.soglie[2] + profilo.soglie[3] / 4, profilo);
  assert.equal(basso.lp, 0);
  assert.ok(alto.lp > 0 && alto.lp <= 99);
  assert.ok(alto.progresso > basso.progresso);
});

test('9. gli LP crescono quando la performance cresce, a parita\' di rank', () => {
  const profilo = profiloEsercizio(chest);
  const a = calcolaRank(55, profilo);
  const b = calcolaRank(60, profilo);
  assert.equal(a.rankId, b.rankId);
  assert.ok(b.lp > a.lp, 'sempre piu\' LP quando il punteggio sale');
});

test('10. sul rank piu\' alto gli LP non hanno un tetto (183 LP come nell\'esempio)', () => {
  const profilo = profiloEsercizio(chest);
  const tanto = calcolaRank(profilo.soglie[6] * 3, profilo);
  assert.equal(tanto.rankId, 'olympian');
  assert.ok(tanto.lp > 100, 'sopra 100 LP sul rank alto: deve essere possibile');
  assert.equal(tanto.inTop, true);
  assert.equal(tanto.sogliaSuccessiva, null);
});

test('11. chi non ha nessuna prestazione non riceve un rank inventato', () => {
  const r = recordEsercizio([], chest);
  assert.equal(r.valido, false);
  assert.equal(r.rank, null);
  assert.equal(r.punteggio, null);
});

test('12. sotto la prima soglia non c\'e\' rank', () => {
  const profilo = profiloEsercizio(chest);
  const r = calcolaRank(0.00001, profilo);
  assert.equal(r.rank, null);
  assert.equal(r.lp, 0);
});

test('13. la classifica confronta solo lo stesso esercizio e usa la migliore', () => {
  const voci = [
    { account: 'a', username: 'Stefano', serie: [serie(80, 6)], esercizio: chest },
    { account: 'b', username: 'Andrea', serie: [serie(75, 8)], esercizio: chest },
    { account: 'c', username: 'Marco', serie: [serie(70, 10)], esercizio: chest },
  ];
  const classifica = classificaEsercizio(voci, profiloEsercizio(chest));
  assert.equal(classifica.length, 3);
  assert.equal(classifica[0].username, 'Stefano');
  assert.equal(classifica[0].posizione, 1);
  assert.equal(classifica[2].posizione, 3);
  // ogni riga ha il punteggio migliore, non l'ultima serie
  for (const r of classifica) assert.ok(r.punteggio > 0);
});

test('14. a parita\' di punteggio la posizione e\' la stessa (ex aequo)', () => {
  const voci = [
    { account: 'a', username: 'A', punteggioCalcolato: 50 },
    { account: 'b', username: 'B', punteggioCalcolato: 50 },
    { account: 'c', username: 'C', punteggioCalcolato: 40 },
  ];
  const c = classificaEsercizio(voci, profiloEsercizio(chest));
  assert.equal(c[0].posizione, 1);
  assert.equal(c[1].posizione, 1);
  assert.equal(c[2].posizione, 3);
});

test('15. chi non ha il record non finisce in classifica', () => {
  const c = classificaEsercizio([{ account: 'a', username: 'A', serie: [] }], profiloEsercizio(chest));
  assert.equal(c.length, 0);
});

test('16. le divisioni stanno dentro il rank', () => {
  assert.equal(divisioneDaLp(0).nome, 'III');
  assert.equal(divisioneDaLp(40).nome, 'II');
  assert.equal(divisioneDaLp(80).nome, 'I');
});

test('17. solo reps: conta il numero, non i kg', () => {
  const trazioni = { id: 'ex-pull-ups', nome: 'Pull Ups', convenzione: 'assistenza' };
  const profilo = profiloEsercizio(trazioni);
  assert.equal(profilo.misura, MISURE.SOLO_REPS);
  const res = performanceEsercizio([{ id: 'x', peso: null, peso_assistenza: 0, ripetizioni: 12, stato: 'fatta' }], trazioni);
  assert.equal(res.migliore.punteggio, 12);
  // con 20 kg di zavorra le stesse 12 ripetizioni valgono meno
  const assistito = performanceEsercizio([
    { id: 'y', peso: null, peso_assistenza: 20, ripetizioni: 12, stato: 'fatta' },
  ], trazioni);
  assert.ok(assistito.migliore.punteggio < 12, 'la zavorra deve abbassare il punteggio');
});

test('18. tempo e distanza dipendono dalla loro unita\'', () => {
  const tempo = { id: 'plank', nome: 'Plank', convenzione: 'macchina', misura: MISURE.TEMPO };
  const res = performanceEsercizio([{ id: 't', peso: null, ripetizioni: 120, stato: 'fatta' }], tempo);
  assert.equal(res.migliore.punteggio, 120);
  const distanza = { id: 'tiro', nome: 'Tiro a centro', convenzione: 'macchina', misura: MISURE.DISTANZA };
  const res2 = performanceEsercizio([{ id: 'd', peso: null, ripetizioni: 250, stato: 'fatta' }], distanza);
  assert.equal(res2.migliore.punteggio, 250);
});

test('19. kg + tempo considera entrambi i numeri', () => {
  const iso = { id: 'iso', nome: 'Iso laterale', convenzione: 'macchina', misura: MISURE.KG_TEMPO };
  const corto = performanceEsercizio([{ id: 'k1', peso: 40, ripetizioni: 10, stato: 'fatta' }], iso);
  const lungo = performanceEsercizio([{ id: 'k2', peso: 40, ripetizioni: 30, stato: 'fatta' }], iso);
  const pesante = performanceEsercizio([{ id: 'k3', peso: 60, ripetizioni: 10, stato: 'fatta' }], iso);
  assert.ok(lungo.migliore.punteggio > corto.migliore.punteggio, 'piu\' tempo conta');
  assert.ok(pesante.migliore.punteggio > corto.migliore.punteggio, 'piu\' kg conta');
});

test('20. un esercizio nuovo senza profilo ha comunque soglie', () => {
  const nuovo = { id: 'ex-nuovo-admin', nome: 'Esercizio nuovo', convenzione: 'macchina' };
  const p = profiloEsercizio(nuovo);
  assert.equal(p.soglie.length, RANK.length);
  assert.ok(p.soglie[3] > p.soglie[0]);
});

test('21. le soglie si possono scrivere a mano per un esercizio', () => {
  const p = profiloEsercizio(chest, { soglie: [1, 2, 3, 4, 5, 6, 7] });
  assert.deepEqual(p.soglie, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(calcolaRank(6.5, p).rankId, 'titan');
});

test('22. soglieDaRiferimento cresce sempre e parte da zero', () => {
  const s = soglieDaRiferimento(100);
  assert.equal(s.length, RANK.length);
  for (let i = 1; i < s.length; i++) assert.ok(s[i] > s[i - 1]);
  assert.equal(soglieDaRiferimento(0), null);
  assert.equal(soglieDaRiferimento(-5), null);
});

test('23. lo storico dei miglioramenti tiene solo i passi in avanti', () => {
  const sedute = [
    { id: 's1', data: '2026-09-01', stato: 'completata' },
    { id: 's2', data: '2026-09-08', stato: 'completata' },
    { id: 's3', data: '2026-09-15', stato: 'completata' },
  ];
  const registrate = [
    { ...serie(30, 8), seduta_id: 's1', esercizio_id: chest.id },
    { ...serie(32, 8), seduta_id: 's2', esercizio_id: chest.id },
    { ...serie(31, 8), seduta_id: 's3', esercizio_id: chest.id },
  ];
  const tappe = storicoMiglioramenti(registrate, chest, sedute);
  assert.equal(tappe.length, 2, 'il terzo giorno e\' peggio: non e\' un miglioramento');
  assert.equal(tappe[0].miglioramento, false);
  assert.equal(tappe[1].miglioramento, true);
});

test('24. recordAccount e\' gia\' ordinato dal rank piu\' alto', () => {
  const catalogo = [
    chest,
    lateral,
    { id: 'ex-pull-ups', nome: 'Pull Ups', convenzione: 'assistenza' },
  ];
  const gruppi = [
    { esercizio_id: chest.id, serie: [{ id: 'a', peso: 50, ripetizioni: 8, stato: 'fatta' }] },
    { esercizio_id: lateral.id, serie: [{ id: 'b', peso: 15, ripetizioni: 12, stato: 'fatta' }] },
  ];
  const record = recordAccount(catalogo, gruppi);
  assert.equal(record.length, 2);
  assert.equal(record[0].esercizio.id, chest.id);
  assert.ok(record[0].rank.indice > record[1].rank.indice);
  assert.equal(rankPrincipale(record).esercizio.id, chest.id);
  const d = distribuzioneRank(record);
  assert.equal(d.length, RANK.length);
  assert.equal(d.reduce((a, x) => a + x.numero, 0), 2);
});