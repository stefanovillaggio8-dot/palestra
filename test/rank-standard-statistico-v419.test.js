import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { RANK } from '../src/rank-config.js';
import { rankDaScore } from '../src/rank-v2/scalata.js';
import {
  PREACHER_PERCENTILI_1RM, interpolaPercentiliPerPeso,
  estendiPercentiliAlti, standardPerMovimento, soglieNormalizzate,
  fattoreCorpo, stimaMassimale,
} from '../src/rank-v3/modello.js';
import { valutaPrestazione, soglieLegibiliNuove } from '../src/rank-v3/valutazione.js';

const preacher = ESERCIZI.find((e) => e.id === 'ex-one-arm-preacher-curl');
const scott = ESERCIZI.find((e) => e.id === 'ex-scott-bench-curl');
const ez = ESERCIZI.find((e) => e.id === 'ex-ez-bar-preacher-curl');
const prova = (esercizio, kg, rep, bw = 66, spotter = false) =>
  valutaPrestazione({ esercizio, pesoCorporeo: bw, serie: [{
    esercizio_id: esercizio.id, peso: kg, ripetizioni: rep,
    stato: 'fatta', seduta_id: 'test-completata', spotter,
  }] });

test('v419: cinque percentili documentati, interpolazione per 66 kg e NON numero inventato', () => {
  assert.deepEqual(PREACHER_PERCENTILI_1RM.find((r) => r[0] === 65), [65, 7, 12, 18, 25, 34]);
  assert.deepEqual(PREACHER_PERCENTILI_1RM.find((r) => r[0] === 70), [70, 8, 13, 19, 27, 35]);
  assert.deepEqual(interpolaPercentiliPerPeso(PREACHER_PERCENTILI_1RM, 65), [7, 12, 18, 25, 34]);
  const v = interpolaPercentiliPerPeso(PREACHER_PERCENTILI_1RM, 66);
  for (const [i, atteso] of [7.2, 12.2, 18.2, 25.4, 34.2].entries())
    assert.ok(Math.abs(v[i] - atteso) < 1e-9, String(i));
  assert.equal(interpolaPercentiliPerPeso(PREACHER_PERCENTILI_1RM, 0), null);
});

test('v419: Titan e Olympian sono extrapolazioni z-logaritmiche con intervallo reale', () => {
  const a = interpolaPercentiliPerPeso(PREACHER_PERCENTILI_1RM, 66);
  const q = estendiPercentiliAlti(a);
  assert.equal(q.length, 7);
  assert.ok(q[5] > 39 && q[5] < 41); // p98 STIMATO, non misurato
  assert.ok(q[6] > 47 && q[6] < 50); // p99.5 STIMATO
  assert.ok(q[6] - q[5] > 7); // non e' più un intervallo di 0,5 kg
  assert.equal(estendiPercentiliAlti([7, 12, 18, 25, 25]), null);
});

test('v419: Epley a 1 rip coincide con il carico; 22 x 8 = 27,87 kg stimati', () => {
  assert.equal(stimaMassimale(22, 1)?.valore, 22);
  assert.ok(Math.abs(stimaMassimale(22, 8)?.valore - 27.87) <= .01);
  assert.equal(prova(preacher, 22, 8).metodoMassimale, 'epley');
  assert.equal(prova(preacher, 22, 8).massimaleAffidabile, true);
});

test('v419: stessi riferimenti, non promuovere 22kg ad Elite per accontentare utente', () => {
  for (const rip of [5, 6, 8, 10, 12]) {
    const r = prova(preacher, 22, rip);
    assert.equal(r.valido, true);
    assert.equal(r.rank.id, 'platinum', `22kg x${rip}: ${r.rank?.id}`);
  }
  assert.equal(prova(preacher, 30, 8).rank.id, 'diamond');
  assert.equal(prova(preacher, 32, 8).rank.id, 'titan');
  assert.equal(prova(preacher, 40, 8).rank.id, 'olympian');
});

test('v419: serie lunghe non possono comprarsi Olympian da rep impossibili', () => {
  const r12 = prova(preacher, 20, 12);
  const r100 = prova(preacher, 20, 100);
  assert.equal(r12.rank.id, r100.rank.id);
  assert.equal(r100.massimaleAffidabile, false);
});

test('v419: soglie visibili, score e rank della serie concordano per tutti i livelli', () => {
  const r = prova(preacher, 22, 8);
  const pesi = soglieLegibiliNuove(r.soglie, {
    esercizio: preacher, cfg: r.cfg, pesoCorporeo: 66,
  });
  assert.equal(pesi.length, 7);
  assert.ok(pesi[5] >= 30 && pesi[5] <= 35);
  assert.ok(pesi[6] >= 38 && pesi[6] <= 45);
  const testTitan = prova(preacher, pesi[5], 8);
  const testOly = prova(preacher, pesi[6], 8);
  assert.ok(testTitan.rank.indice >= RANK.findIndex((x) => x.id === 'titan'));
  assert.equal(testOly.rank.id, 'olympian');
});

test('v419: livelli monotoni per carico/reps e peso corporeo, senza ricompense dal volume', () => {
  for (const bw of [50, 55, 65, 66, 75, 85, 100, 140]) {
    let precedente = -1;
    for (const kg of [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35, 40, 45, 50]) {
      const r = prova(preacher, kg, 8, bw);
      assert.ok(r.valido);
      assert.ok(r.indice >= precedente, `non monotono: bw=${bw} carico=${kg}`);
      precedente = r.indice;
    }
  }
  assert.ok(prova(preacher, 22, 8, 55).indice >= prova(preacher, 22, 8, 85).indice);
  assert.ok(prova(preacher, 22, 8, 66, true).indice <= prova(preacher, 22, 8, 66).indice);
});

test('v419: variante Scott monobraccio uguale; EZ curl e altri movimenti invariati', () => {
  assert.deepEqual(standardPerMovimento('bicipiti_panca', scott).soglie1RMPerPeso, PREACHER_PERCENTILI_1RM);
  assert.equal(standardPerMovimento('bicipiti_panca', ez).soglie1RMPerPeso, null);
  assert.equal(standardPerMovimento('bicipiti', preacher).soglie1RMPerPeso, null);
  assert.equal(standardPerMovimento('spinta_orizzontale', {
    id: 'ex-chest-press', nome: 'Chest Press',
  }).soglie1RMPerPeso, null);
  const std = standardPerMovimento('bicipiti_panca', preacher);
  const q = soglieNormalizzate({ standard: std, pesoCorporeo: 66, meccanica: 1 });
  const src = estendiPercentiliAlti(interpolaPercentiliPerPeso(PREACHER_PERCENTILI_1RM, 66));
  for (let i = 0; i < 7; i++)
    assert.ok(Math.abs(q[i] * fattoreCorpo(66) - src[i]) < .1);
});
