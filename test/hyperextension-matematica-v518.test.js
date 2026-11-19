import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { riferimentoHyperextension } from '../src/hyperextension-rank.js';
import { interpolaPercentiliPerPeso, estendiPercentiliAlti } from '../src/rank-v3/modello.js';
import { valutaPrestazione } from '../src/rank-v3/valutazione.js';
import { calcolaRankDiProva } from '../src/prova-rank.js';

const hyper = ESERCIZI.find(e => e.id === 'ex-back-extension-hanging');
const carico = (kg, reps = 7) => ({
  id: `test-${kg}-${reps}`, esercizio_id: hyper.id, seduta_id: 'test',
  peso: kg, ripetizioni: reps, stato: 'fatta',
});
const valuta = kg => valutaPrestazione({
  esercizio: hyper, serie: [carico(kg)], pesoCorporeo: 67,
});

test('v518: Titan e Olympian proiettati con logaritmo, senza modificare le cinque ancore', () => {
  const standard = riferimentoHyperextension(hyper);
  const base = interpolaPercentiliPerPeso(standard.soglie1RMPerPeso, 67);
  const livelli = estendiPercentiliAlti(base);
  assert.equal(livelli.length, 7);
  assert.deepEqual(livelli.slice(0, 5), base, 'i cinque riferimenti precedenti non cambiano');
  assert.ok(livelli.every((v, i) => i === 0 || v > livelli[i - 1]));
  assert.ok(Math.abs(livelli[5] - 47.705) < 0.02);
  assert.ok(Math.abs(livelli[6] - 64.085) < 0.02);
  const z80 = 0.8416212335729143, z95 = 1.6448536269514722;
  const z98 = 2.053748910631823, z995 = 2.5758293035489004;
  const slope = Math.log(base[4] / base[3]) / (z95 - z80);
  assert.ok(Math.abs(livelli[5] - base[4] * Math.exp((z98-z95)*slope)) < 1e-9);
  assert.ok(Math.abs(livelli[6] - base[4] * Math.exp((z995-z95)*slope)) < 1e-9);
  assert.equal(standard.proiezioneAlti, 'lognormale_advanced_elite');
  assert.match(standard.limite, /NON una classifica statistica verificata/);
});

test('v518: si può ottenere Titan e Olympian con la migliore serie reale, non col volume', () => {
  const diamond = valuta(35), titan = valuta(40), olympian = valuta(60);
  assert.deepEqual([diamond.rank.id, titan.rank.id, olympian.rank.id],
    ['diamond', 'titan', 'olympian']);
  for (const r of [diamond, titan, olympian]) {
    assert.equal(r.fonte, 'modello_hyperextension_non_validato');
    assert.equal(r.calibrazione.livello, 'bassa');
    assert.equal(r.massimale, null);
    assert.equal(r.fuoriScalaProvvisoria, false);
  }
  const cinqueSerie = valutaPrestazione({ esercizio: hyper,
    serie: Array.from({length: 5}, (_, i) => ({...carico(35),id:`serie-${i}`})),
    pesoCorporeo: 67 });
  assert.equal(cinqueSerie.rank.id, 'diamond', 'più serie non comprano Titan');
  assert.equal(cinqueSerie.score, diamond.score);
});

test('v518: la prova esercizio replica Olympian matematico senza salvare carichi inventati', () => {
  const prova = calcolaRankDiProva({ esercizio: hyper,
    peso: '80', ripetizioni: '7', pesoCorporeo: '67' });
  const r = valuta(80);
  assert.equal(prova.valido, true);
  assert.equal(prova.record.rank.id, 'olympian');
  assert.equal(prova.record.fonte, 'modello_hyperextension_non_validato');
  assert.equal(prova.record.punteggio, r.score);
  assert.equal(prova.serie.peso, 80);
  assert.equal(prova.serie.ripetizioni, 7);
  assert.match(prova.record.calibrazione.descrizione, /NON corrispondono a percentili realmente misurati/);
});
