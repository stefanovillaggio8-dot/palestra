import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  confrontaEsercizio, motivoNonConfrontabile, riassuntoEsercizio,
  recordSenzaAssistenza, miglioreAssistito, NON_DISPONIBILE,
} from '../src/confronto.js';
import { CONVENZIONI } from '../src/numeri.js';

const CP = { id: 'ex-chest-press', nome: 'Chest Press', convenzione: CONVENZIONI.MACCHINA };
const CP_ALTRO = { id: 'ex-chest-press-b', nome: 'Chest Press - macchina B', convenzione: CONVENZIONI.MACCHINA };
const CP_CAVO = { id: 'ex-chest-press', nome: 'Chest Press', convenzione: CONVENZIONI.CAVO };
const PULL_UP = { id: 'ex-pull-ups', nome: 'Pull Ups', convenzione: CONVENZIONI.ASSISTENZA };

const s = (o, peso, rip, extra = {}) => ({ ordine: o, peso, ripetizioni: rip, spotter: false, ...extra });

test('21a. due varianti diverse non sono mai confrontate', () => {
  const r = confrontaEsercizio([s(1, 35, 8)], [s(1, 30, 8)], CP, CP_ALTRO);
  assert.equal(r.disponibile, false);
  assert.equal(r.righe.length, 0);
  assert.match(r.motivo, /varianti diverse/);
});

test('21b. stessa variante ma convenzione diversa: non confrontabile', () => {
  const r = confrontaEsercizio([s(1, 35, 8)], [s(1, 70, 8)], CP, CP_CAVO);
  assert.equal(r.disponibile, false);
  assert.match(r.motivo, /convenzione/);
});

test('21c. stessa variante e stessa convenzione: confronto disponibile', () => {
  const r = confrontaEsercizio([s(1, 35, 8), s(2, 35, 7)], [s(1, 30, 8), s(2, 30, 6)], CP, CP);
  assert.equal(r.disponibile, true);
  assert.equal(r.righe.length, 2);
  assert.equal(r.righe[0].differenzaPeso, 5);
  assert.equal(r.righe[0].differenzaPesoPerc, 16.67);
  assert.equal(r.righe[1].differenzaRip, 1);
  assert.equal(r.righe[1].messaggio, null);
});

test('21d. dati insufficienti -> "Confronto non disponibile"', () => {
  const r = confrontaEsercizio([s(1, 35, 8)], [s(1, null, null)], CP, CP);
  assert.equal(r.righe[0].haConfronto, false);
  assert.equal(r.righe[0].messaggio, NON_DISPONIBILE);
});

test('21e. serie in piu\' da una parte: la serie mancante non inventa numeri', () => {
  const r = confrontaEsercizio([s(1, 35, 8), s(2, 35, 7)], [s(1, 30, 8)], CP, CP);
  assert.equal(r.righe.length, 2);
  assert.equal(r.righe[1].haConfronto, false);
  assert.equal(r.righe[1].messaggio, NON_DISPONIBILE);
});

test('21f. confronto con decimali senza arrotondare', () => {
  const r = confrontaEsercizio([s(1, 7.5, 7.5)], [s(1, 5, 6)], CP, CP);
  assert.equal(r.righe[0].differenzaPeso, 2.5);
  assert.equal(r.righe[0].differenzaRip, 1.5);
});

test('22/23. gli esercizi assistiti non producono un record di carico', () => {
  const serie = [s(1, null, 7, { peso_assistenza: 15, spotter: true })];
  const rec = recordSenzaAssistenza(serie, PULL_UP);
  assert.equal(rec.valido, false);
  assert.equal(rec.valore, null);
  const mig = miglioreAssistito(serie);
  assert.equal(mig.valido, true);
  assert.equal(mig.valore, 15, 'meno assistenza e\' il risultato migliore');
});

test('il record esclude le serie con spotter', () => {
  const serie = [s(1, 40, 5), s(2, 37.5, 4, { spotter: true }), s(3, 35, 6)];
  const rec = recordSenzaAssistenza(serie, CP);
  assert.equal(rec.valido, true);
  assert.equal(rec.valore, 40);
  const senzaSpotter = recordSenzaAssistenza([s(1, 20, 5, { spotter: true })], CP);
  assert.equal(senzaSpotter.valido, false);
});

test('riassunto: conta spotter e segnala le assistite non specificate', () => {
  const serie = [
    s(1, 45, 7),
    s(2, 45, 6, { spotter: true, rip_assistite: 2 }),
    s(3, 45, 6, { spotter: true, rip_assistite: null }),
  ];
  const r = riassuntoEsercizio(serie, { id: 'x', convenzione: CONVENZIONI.PER_MANUBRIO });
  assert.equal(r.serie, 3);
  assert.equal(r.pesoMassimo, 45);
  assert.equal(r.serieConSpotter, 2);
  assert.equal(r.ripetizioniMedie, 6.33);
  assert.equal(r.volume, 855);
  assert.equal(r.assistenzaNonSpecificata, true, 'spotter senza numero di assistite resta "non specificato"');
});

test('riassunto: le serie con spotter contano nel volume ma non come record', () => {
  const serie = [s(1, 30, 8), s(2, 30, 8, { spotter: true })];
  const r = riassuntoEsercizio(serie, { id: 'y', convenzione: CONVENZIONI.MACCHINA });
  assert.equal(r.volume, 480);
  assert.equal(recordSenzaAssistenza(serie, { id: 'y', convenzione: CONVENZIONI.MACCHINA }).valore, 30);
});

test('confronto assistito: meno contrappeso = meglio', () => {
  const r = confrontaEsercizio(
    [s(1, null, 7, { peso_assistenza: 10 })],
    [s(1, null, 6, { peso_assistenza: 15 })],
    PULL_UP, PULL_UP,
  );
  assert.equal(r.disponibile, true);
  assert.equal(r.assistito, true);
  assert.equal(r.righe[0].differenzaAssistenza, -5);
  assert.equal(r.righe[0].menoAssistenza, true);
});

test('motivoNonConfrontabile: esercizi mancanti', () => {
  assert.equal(motivoNonConfrontabile(null, CP), 'esercizio sconosciuto');
  assert.equal(motivoNonConfrontabile(CP, CP), null);
});
