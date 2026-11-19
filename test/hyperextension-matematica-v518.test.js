import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { riferimentoHyperextension, momentoCaricoEsternoHyper } from '../src/hyperextension-rank.js';
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
  assert.match(standard.limite, /Titan\/Olympian restano proiezioni non assegnabili/i);
  assert.match(standard.limite, /Strength Level pubblica per Back Extension standard in RIPETIZIONI/i);
  assert.match(standard.limite, /Non servono altre misure da inserire nell’app/i);
});

test('v519: la stessa massa produce momenti diversi se cambia la leva', () => {
  const a = momentoCaricoEsternoHyper({caricoKg:80,braccioOrizzontaleMetri:0.2});
  const b = momentoCaricoEsternoHyper({caricoKg:80,braccioOrizzontaleMetri:0.4});
  assert.ok(Math.abs(a - 156.9064) < 1e-6);
  assert.ok(Math.abs(b - 313.8128) < 1e-6);
  assert.equal(b,2*a);
  assert.equal(momentoCaricoEsternoHyper({caricoKg:80}),null,
    'mai inventare una distanza dal solo carico esterno');
  assert.equal(momentoCaricoEsternoHyper({caricoKg:80,braccioOrizzontaleMetri:''}),null);
  assert.equal(momentoCaricoEsternoHyper({caricoKg:80,braccioOrizzontaleMetri:-0.2}),null);
  assert.equal(riferimentoHyperextension(hyper).richiedeGeometria,true);
});

test('v519: la coda teorica non promuove senza leva e ROM individuali', () => {
  const diamond = valuta(35), titan = valuta(40), olympian = valuta(60);
  assert.deepEqual([diamond.rank.id, titan.rank.id, olympian.rank.id],
    ['diamond', 'diamond', 'diamond']);
  assert.equal(diamond.fuoriScalaProvvisoria, false);
  assert.equal(titan.fuoriScalaProvvisoria, true);
  assert.equal(olympian.fuoriScalaProvvisoria, true);
  assert.ok(titan.score > diamond.score);
  assert.ok(olympian.score > titan.score);
  for (const r of [diamond, titan, olympian]) {
    assert.equal(r.fonte, 'modello_hyperextension_non_validato');
    assert.equal(r.calibrazione.livello, 'bassa');
    assert.equal(r.massimale, null);
  }
  const cinqueSerie = valutaPrestazione({ esercizio: hyper,
    serie: Array.from({length: 5}, (_, i) => ({...carico(35),id:`serie-${i}`})),
    pesoCorporeo: 67 });
  assert.equal(cinqueSerie.rank.id, 'diamond', 'più serie non comprano Titan');
  assert.equal(cinqueSerie.score, diamond.score);
});

test('v519: Prova esercizio conserva lo score ma non inventa Olympian', () => {
  const prova = calcolaRankDiProva({ esercizio: hyper,
    peso: '80', ripetizioni: '7', pesoCorporeo: '67' });
  const r = valuta(80);
  assert.equal(prova.valido, true);
  assert.equal(prova.record.rank.id, 'diamond');
  assert.equal(prova.record.fuoriScalaProvvisoria, true);
  assert.equal(prova.record.fonte, 'modello_hyperextension_non_validato');
  assert.equal(prova.record.punteggio, r.score);
  assert.equal(prova.serie.peso, 80);
  assert.equal(prova.serie.ripetizioni, 7);
  assert.match(prova.record.calibrazione.descrizione, /non si assegnano automaticamente/i);
});
