import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('v523: la scheda Rank resta selezionata quando la pagina viene ridisegnata', () => {
  assert.match(app, /let memoriaVistaRank = \{ account: null, scheda: 'miei', prova: \{\} \}/);
  assert.match(app, /if \(memoriaVistaRank\.account !== account\)/);
  assert.match(app, /let scheda = memoria\.scheda/);
  assert.match(app, /memoria\.scheda = k/);
});

test('v523: cambio di account azzera la prova precedente', () => {
  assert.match(app, /memoriaVistaRank = \{ account, scheda: 'miei', prova: \{\} \}/);
});

test('v523: prova esercizio ricorda selezione e input durante il sync', () => {
  assert.match(app, /provaMemoria\.esercizioId = e\.id/);
  assert.match(app, /\.find\(\(e\) => e\.id === provaMemoria\.esercizioId\)/);
  assert.match(app, /provaMemoria\.peso = pesoCampo\.value/);
  assert.match(app, /provaMemoria\.ripetizioni = repCampo\.value/);
  assert.match(app, /provaMemoria\.pesoCorporeo = corpCampo\.value/);
});

test('v523: ricerca e filtri persistono senza cambiare la finestra di modifica scheda', () => {
  assert.match(app, /function costruisciSelettoreEsercizi\(esercizi, onScelta, memoria = null\)/);
  assert.match(app, /onScelta\(e\)/);
  assert.match(app, /filtroGruppo,? \}/);
  assert.match(app, /\}, provaMemoria\)\);/);
});

test('PWA: HTML, service worker e modulo principale usano la stessa versione', () => {
  const versione = html.match(/PALESTRA_VERSIONE = 'palestra-v(\d+)'/)?.[1];
  assert.ok(versione, 'la pagina dichiara una versione numerica');
  assert.match(worker, new RegExp("const VERSIONE = 'palestra-v" + versione + "'"));
  assert.match(html, new RegExp('src/app\\.js\\?v=' + versione));
});
