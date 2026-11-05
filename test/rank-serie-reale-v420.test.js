import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { ripetizioniPiene } from '../src/rank-v2/curve.js';
import { valutaPrestazione, soglieLegibiliNuove } from '../src/rank-v3/valutazione.js';
import { stimaMassimale, standardPerMovimento, soglieNormalizzate,
  FATTORE_8_RIP, PREACHER_PERCENTILI_1RM, fattoreCorpo } from '../src/rank-v3/modello.js';
import { presentaRank } from '../src/rank-spiegato.js';

const preacher = ESERCIZI.find(e => e.id === 'ex-one-arm-preacher-curl');
const scott = ESERCIZI.find(e => e.id === 'ex-scott-bench-curl');
const esercizioTest = (nome = 'Chest Press') => ESERCIZI.find(e => e.nome === nome);
const serie = (kg, reps, spotter = false, id = 1) => ({
  id: 's' + id, esercizio_id: preacher.id, peso: kg, ripetizioni: reps,
  spotter, stato: 'fatta', seduta_id: 'finita',
});
const valuta = (ss, pesoCorporeo = 70) =>
  valutaPrestazione({ esercizio: preacher, pesoCorporeo, serie: ss });

test('v420: il Preacher Curl usa kg e ripetizioni reali, mai 1RM dedotto dalla prestazione', () => {
  const r = valuta([serie(22, 8)]);
  assert.equal(r.valido, true);
  assert.equal(r.caricoReale, 22);
  assert.equal(r.ripetizioni, 8);
  assert.equal(r.kgEquivalenti, 22);
  assert.equal(r.massimale, null);
  assert.equal(r.metodoMassimale, null);
  assert.equal(r.rank.id, 'platinum');
  assert.ok(Math.abs(r.score - 22 * r.meccanica / fattoreCorpo(70)) < 0.02);
  // Una stima 1RM esiste come funzione separata, ma non compare in score.
  const ipotetico = stimaMassimale(22, 8).valore;
  assert.ok(ipotetico > 27 && ipotetico < 29);
  assert.notEqual(r.kgEquivalenti, ipotetico);
});

test('v420: a 70 kg il livello Advanced viene dai dati esterni, confrontati in serie da 8', () => {
  const std = standardPerMovimento('bicipiti_panca', preacher);
  const soglie = soglieNormalizzate({ standard: std, pesoCorporeo: 70, meccanica: 1 });
  const advanced1RM = PREACHER_PERCENTILI_1RM.find(x => x[0] === 70)[4];
  assert.equal(advanced1RM, 27);
  assert.ok(Math.abs(soglie[3] * fattoreCorpo(70) * FATTORE_8_RIP - 27) < 0.08);
  assert.equal(valuta([serie(22, 8)], 70).rank.id, 'platinum');
  assert.equal(valuta([serie(22, 5)], 70).rank.id, 'gold');
});

test('v420: la serie migliore e quella con il punteggio maggiore, non la piu pesante', () => {
  const r = valuta([serie(23, 5, false, 1), serie(22, 8, false, 2), serie(20, 12, false, 3)]);
  assert.equal(r.caricoReale, 22);
  assert.equal(r.ripetizioni, 8);
  assert.equal(r.rank.id, 'platinum');
  assert.ok(22 > 23 * ripetizioniPiene(5));
  // Una serie di 21x12 supera 22x8: anche le ripetizioni contano.
  const r2 = valuta([serie(23, 5, false, 1), serie(22, 8, false, 2), serie(21, 12, false, 3)]);
  assert.equal(r2.caricoReale, 21);
  assert.equal(r2.ripetizioni, 12);
});

test('v420: spotter riduce lo score e altre serie non comprano nuovi rank', () => {
  const sola = valuta([serie(22, 8)], 70);
  const assistita = valuta([serie(22, 8, true)], 70);
  assert.ok(assistita.score < sola.score);
  const soloPlatinum = valuta([serie(22, 8)], 70);
  const tantoVolume = valuta(Array.from({ length: 5 }, (_, i) => serie(22, 8, false, i + 1)), 70);
  assert.equal(tantoVolume.rank.id, soloPlatinum.rank.id);
  assert.ok(tantoVolume.lp >= soloPlatinum.lp);
});

test('v420: maggiore carico e numero ripetizioni non fanno scendere il rank', () => {
  let count = 0;
  for (const bw of [50, 60, 66, 70, 75, 90, 120]) {
    for (const rep of [5, 6, 8, 10, 12]) {
      let precedente = -1;
      for (const kg of [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35, 40, 45]) {
        const r = valuta([serie(kg, rep)], bw);
        assert.ok(r.valido);
        assert.ok(r.indice >= precedente, `bw=${bw}, kg=${kg}, rip=${rep}`);
        precedente = r.indice;
        count++;
      }
    }
  }
  assert.equal(count, 595);
});

test('v420: 100 ripetizioni non valgono piu di 12 sul preacher; Titan disponibile', () => {
  const r12 = valuta([serie(20, 12)], 70);
  const r100 = valuta([serie(20, 100)], 70);
  assert.equal(r12.score, r100.score);
  assert.equal(r12.rank.id, r100.rank.id);
  assert.equal(valuta([serie(32, 8)], 66).rank.id, 'titan');
  assert.equal(valuta([serie(40, 8)], 66).rank.id, 'olympian');
});

test('v420: pesi leggibili e scheda spiegano serie reale, non 1RM ipotetico', () => {
  const r = valuta([serie(22, 8)], 70);
  const pesi = soglieLegibiliNuove(r.soglie, { esercizio: preacher, cfg: r.cfg, pesoCorporeo: 70 });
  assert.equal(pesi.length, 7);
  assert.ok(pesi[3] <= 22);
  assert.ok(pesi[4] >= 28);
  const p = presentaRank({
    ...r, rankId: r.rank.id, esercizio: preacher,
    serie: { peso: 22, ripetizioni: 8 }, profilo: { unita: 'kg' },
  });
  assert.ok(p.frasi.some(x => x.includes('migliore serie effettiva')));
  assert.ok(!p.frasi.some(x => x.includes('Per confrontarti uso un 1RM')));
});

test('v420: una serie storica conserva il peso corporeo del proprio giorno', () => {
  const vecchia = { ...serie(22, 8, false, 1), peso_corpo: 66 };
  const recente = { ...serie(22, 8, false, 2), peso_corpo: 80 };
  const r = valuta([vecchia, recente], 80);
  assert.equal(r.pesoCorporeo, 66);
  assert.equal(r.caricoReale, 22);
  assert.equal(r.ripetizioni, 8);
  assert.equal(r.rank.id, 'platinum');
  assert.equal(r.kgEquivalenti, 22);
});

test('v423: il riferimento monobraccio non viene attribuito allo Scott con due manubri', () => {
  const cad = standardPerMovimento('bicipiti_panca', scott);
  assert.ok(Array.isArray(cad.soglie1RMPerPeso));
  assert.equal(cad.fonte,'proxy_cad_non_validato');
  assert.notDeepEqual(cad.soglie1RMPerPeso,
    standardPerMovimento('bicipiti_panca',preacher).soglie1RMPerPeso,
    'lo standard Scott monobraccio non si puo riusare sul CAD Curl');
  assert.ok(standardPerMovimento('bicipiti_panca', preacher).soglie1RMPerPeso);
  const press = esercizioTest('Chest Press');
  assert.ok(press);
  assert.equal(standardPerMovimento('spinta_orizzontale', press).soglie1RMPerPeso, null);
});
