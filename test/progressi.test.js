import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testoProgresso, serieARipetizioniCostanti, riepilogoGenerale } from '../src/progressi.js';
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

/* ---------- il riepilogo generale scritto, senza grafici ---------- */

const voce = (nome, esercizio, da, a, prima = 8, ultima = 8) => ({
  nome, esercizio,
  punti: [
    punto('2026-09-01', [s(1, da, prima)]),
    punto('2026-10-01', [s(1, a, ultima)]),
  ],
});

test('riepilogo: dice in una frase che sei migliorato', () => {
  const r = riepilogoGenerale([
    voce('Chest Press', CP, 30, 35),
    voce('Lat Pulldown', CP, 40, 45),
    voce('Leg Extension', CP, 30, 30),
  ]);
  assert.equal(r.migliorati, 2);
  assert.equal(r.fermi, 1);
  assert.equal(r.indietro, 0);
  assert.match(testo(r), /sei migliorato/i, 'la frase principale dice che e\' andato bene');
  assert.match(testo(r), /Chest Press \+5 kg/);
  assert.match(testo(r), /Lat Pulldown \+5 kg/);
  assert.match(testo(r), /Leg Extension/);
});

test('riepilogo: i numeri da mettere in evidenza ci sono', () => {
  const r = riepilogoGenerale([voce('Chest Press', CP, 30, 35), voce('Leg Extension', CP, 30, 30)]);
  assert.deepEqual(r.numeri, [
    { etichetta: 'migliorati', valore: 1 },
    { etichetta: 'fermi', valore: 1 },
    { etichetta: 'indietro', valore: 0 },
  ]);
});

test('riepilogo: non nasconde gli esercizi andati indietro', () => {
  const r = riepilogoGenerale([
    voce('Chest Press', CP, 30, 35),
    voce('Lat Pulldown', CP, 45, 40),
  ]);
  assert.equal(r.indietro, 1);
  assert.match(testo(r), /Attenzione/);
  assert.match(testo(r), /Lat Pulldown −5 kg/);
});

test('riepilogo: con l\'assistenza meno assistenza vuol dire meglio', () => {
  // Pull Ups: se l'assistenza scende da 10 a 5 hai fatto PIU' lavoro da solo
  const sAss = (o, assistenza) => ({ ordine: o, peso: null, peso_assistenza: assistenza, ripetizioni: 6, spotter: false });
  const r = riepilogoGenerale([{
    nome: 'Pull Ups', esercizio: PULL,
    punti: [
      punto('2026-09-01', [sAss(1, 10)]),
      punto('2026-10-01', [sAss(1, 5)]),
    ],
  }]);
  assert.equal(r.migliorati, 1, 'meno assistenza = meglio');
  assert.match(testo(r), /Pull Ups −5 kg di assistenza in meno/);
});

test('riepilogo: il quadro misto non viene venduto come successo', () => {
  const r = riepilogoGenerale([
    voce('A', CP, 30, 35),
    voce('B', CP, 45, 40),
    voce('C', CP, 50, 45),
  ]);
  assert.match(testo(r), /misto/i, 'un migliorato e due indietro non e\' "sei migliorato"');
  assert.doesNotMatch(testo(r), /sei migliorato/i);
});

test('riepilogo: senza dati non inventa niente', () => {
  const r = riepilogoGenerale([]);
  assert.equal(r.analizzati, 0);
  assert.deepEqual(r.numeri, []);
  assert.match(testo(r), /almeno due sedute/);
});

test('riepilogo: un esercizio con una seduta sola viene ignorato', () => {
  const r = riepilogoGenerale([{
    nome: 'Chest Press', esercizio: CP,
    punti: [punto('2026-10-01', [s(1, 30, 8)])],
  }]);
  assert.equal(r.analizzati, 0, 'con una seduta non c\'e\' confronto');
  assert.match(testo(r), /almeno due sedute/);
});

test('riepilogo: ogni gruppo sa dire di quanto e\' cambiato ogni esercizio', () => {
  const r = riepilogoGenerale([
    voce('Chest Press', CP, 30, 35),
    voce('Leg Extension', CP, 40, 40),
    voce('Lat Pulldown', CP, 45, 40),
  ]);
  // ogni gruppo ha la sua frase con la differenza esatta
  assert.equal(r.gruppi.migliorati.length, 1);
  assert.match(r.gruppi.migliorati[0].frase, /Chest Press: da 30 a 35 kg, \+5 kg/);
  assert.equal(r.gruppi.fermi.length, 1);
  assert.match(r.gruppi.fermi[0].frase, /Leg Extension: sempre 40 kg, niente cambiato/);
  assert.equal(r.gruppi.indietro.length, 1);
  assert.match(r.gruppi.indietro[0].frase, /Lat Pulldown: da 45 a 40 kg, −5 kg/);
});

test('riepilogo: la percentuale c\'e\' solo se ha un senso', () => {
  // base 0: la percentuale non si calcola, e non viene inventata
  const r = riepilogoGenerale([voce('Chest Press', CP, 0, 35)]);
  assert.match(r.gruppi.migliorati[0].frase, /da 0 a 35 kg, \+35 kg, in 2 sedute\./);
  assert.doesNotMatch(r.gruppi.migliorati[0].frase, /%/);
});

test('riepilogo: con l\'assistenza spiega il verso della differenza', () => {
  const sAss = (o, assistenza) => ({ ordine: o, peso: null, peso_assistenza: assistenza, ripetizioni: 6, spotter: false });
  const r = riepilogoGenerale([{
    nome: 'Pull Ups', esercizio: PULL,
    punti: [punto('2026-09-01', [sAss(1, 10)]), punto('2026-10-01', [sAss(1, 5)])],
  }]);
  assert.match(r.gruppi.migliorati[0].frase, /assistenza da 10 a 5 kg, −5 kg in meno/);
  assert.match(r.gruppi.migliorati[0].frase, /hai fatto piu\' lavoro da solo/);
});

test('riepilogo: i gruppi sono ordinati dal cambiamento piu\' grande', () => {
  const r = riepilogoGenerale([
    voce('Piccolo', CP, 30, 32),
    voce('Grande', CP, 30, 50),
    voce('Medio', CP, 30, 37),
  ]);
  assert.deepEqual(r.gruppi.migliorati.map((v) => v.nome), ['Grande', 'Medio', 'Piccolo']);
});
