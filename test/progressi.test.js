import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testoProgresso, serieARipetizioniCostanti } from '../src/progressi.js';
import { CONVENZIONI } from '../src/numeri.js';

const CP = { id: 'ex-chest-press', nome: 'Chest Press', convenzione: CONVENZIONI.MACCHINA };
const PULL = { id: 'ex-pull-ups', nome: 'Pull Ups', convenzione: CONVENZIONI.ASSISTENZA };

const s = (o, peso, rip, extra = {}) => ({ ordine: o, peso, ripetizioni: rip, spotter: false, ...extra });
const punto = (data, serie) => ({ data, serie });
const testo = (r) => r.linee.join(' ');

test('una sola seduta: nessun confronto inventato', () => {
  const r = testoProgresso('Chest Press', CP, [punto('2026-10-01', [s(1, 30, 8)])]);
  assert.match(testo(r), /una sola seduta registrata/);
  assert.doesNotMatch(testo(r), /Carico massimo: da/);
});

test('nessuna seduta: dice semplicemente che non c\'e\' niente', () => {
  const r = testoProgresso('Chest Press', CP, []);
  assert.match(testo(r), /Nessuna seduta registrata/);
});

test('aumento del carico massimo spiegato in parole', () => {
  const r = testoProgresso('Chest Press', CP, [
    punto('2026-09-01', [s(1, 30, 8), s(2, 30, 7)]),
    punto('2026-10-01', [s(1, 35, 8), s(2, 35, 7)]),
  ]);
  assert.match(testo(r), /2 sedute registrate/);
  assert.match(testo(r), /da 30 kg a 35 kg/);
  assert.match(testo(r), /\+5 kg/);
  assert.match(testo(r), /\+16,67%/);
});

test('un peso maggiore non e\' detto automaticamente "meglio"', () => {
  const r = testoProgresso('Chest Press', CP, [
    punto('2026-09-01', [s(1, 30, 10)]),
    punto('2026-10-01', [s(1, 40, 5)]),
  ]);
  assert.match(testo(r), /non e\' automaticamente meglio/);
});

test('carico sceso: avviso esplicito', () => {
  const r = testoProgresso('Chest Press', CP, [
    punto('2026-09-01', [s(1, 35, 8)]),
    punto('2026-10-01', [s(1, 30, 8)]),
  ]);
  assert.match(testo(r), /il carico e' sceso/i);
  assert.match(testo(r), /−5 kg/);
});

test('24. partendo da zero non si produce la percentuale', () => {
  const r = testoProgresso('Chest Press', CP, [
    punto('2026-09-01', [s(1, 0, 8)]),
    punto('2026-10-01', [s(1, 20, 8)]),
  ]);
  assert.match(testo(r), /da 0 kg a 20 kg/);
  assert.match(testo(r), /Non calcolo la percentuale/);
  assert.doesNotMatch(testo(r), /%/);
});

test('22. le serie con spotter sono segnalate e non contano come record', () => {
  const r = testoProgresso('Chest Press', CP, [
    punto('2026-09-01', [s(1, 30, 8)]),
    punto('2026-10-01', [s(1, 40, 5, { spotter: true, rip_assistite: 2 }), s(2, 37.5, 6)]),
  ]);
  assert.match(testo(r), /1 serie ha avuto lo spotter/);
  assert.match(testo(r), /non contano come record/);
  assert.match(testo(r), /Record senza assistenza in questa seduta: 37,5 kg/);
});

test('spotter senza numero di assistite: resta "non specificato"', () => {
  const r = testoProgresso('Chest Press', CP, [
    punto('2026-09-01', [s(1, 30, 8)]),
    punto('2026-10-01', [s(1, 40, 5, { spotter: true, rip_assistite: null }), s(2, 35, 6)]),
  ]);
  assert.match(testo(r), /non hai indicato quante ripetizioni erano assistite/);
  assert.match(testo(r), /non specificato/);
});

test('ripetizioni parziali: segnalate e conservate', () => {
  const r = testoProgresso('Chest Press', CP, [
    punto('2026-09-01', [s(1, 30, 8)]),
    punto('2026-10-01', [s(1, 30, 7.5)]),
  ]);
  assert.match(testo(r), /ripetizioni parziali/);
  assert.match(testo(r), /esattamente cosi/);
});

test('volume con decimali: dichiarato indicatore convenzionale', () => {
  const r = testoProgresso('Chest Press', CP, [
    punto('2026-09-01', [s(1, 30, 8)]),
    punto('2026-10-01', [s(1, 30, 7.5)]),
  ]);
  assert.match(testo(r), /indicatore convenzionale/);
});

test('23. esercizi assistiti: meno contrappeso = piu\' lavoro, mai "record"', () => {
  const r = testoProgresso('Pull Ups', PULL, [
    punto('2026-09-01', [s(1, null, 6, { peso_assistenza: 15 })]),
    punto('2026-10-01', [s(1, null, 7, { peso_assistenza: 10 })]),
  ]);
  assert.match(testo(r), /5 kg di assistenza in meno/);
  assert.match(testo(r), /meno aiuto significa piu' lavoro/);
  assert.match(testo(r), /non e' un record e il volume non viene calcolato/);
  assert.doesNotMatch(testo(r), /Volume dell'ultima seduta/);
});

test('23b. assistenza salita: detto che NON e\' un passo avanti', () => {
  const r = testoProgresso('Pull Ups', PULL, [
    punto('2026-09-01', [s(1, null, 6, { peso_assistenza: 10 })]),
    punto('2026-10-01', [s(1, null, 6, { peso_assistenza: 20 })]),
  ]);
  assert.match(testo(r), /non e' un passo avanti/);
});

test('i dati del grafico escono puliti e in ordine', () => {
  const r = testoProgresso('Chest Press', CP, [
    punto('2026-09-01', [s(1, 30, 8)]),
    punto('2026-10-01', [s(1, 35, 8)]),
  ]);
  assert.equal(r.dati.length, 2);
  assert.equal(r.dati[0].pesoMassimo, 30);
  assert.equal(r.dati[1].pesoMassimo, 35);
  assert.equal(r.convenzione, 'kg piastre macchina');
});

test('ripetizioni a parita\' di peso: solo i punti allo stesso peso', () => {
  const out = serieARipetizioniCostanti([
    punto('2026-09-01', [s(1, 30, 8)]),
    punto('2026-10-01', [s(1, 35, 6)]),
    punto('2026-10-08', [s(1, 30, 7)]),
  ], CP);
  assert.equal(out.peso, 30);
  assert.equal(out.punti.length, 2, 'il punto a 35 kg non entra: peso diverso');
  assert.equal(out.punti[0].ripetizioniMedie, 8);
  assert.equal(out.punti[1].data, '2026-10-08');
  assert.equal(out.punti[1].ripetizioniMedie, 7);
});
