// test/css-variabili.test.js
//
// Ste (10/10/2026): "non ce sono palline".
//
// IL BUG: avevo scritto `background: var(--oro)` e `--oro` non era definita DA
// NESSUNA PARTE del CSS. Una variabile CSS che non esiste non dà un errore: la
// dichiarazione semplicemente non vale, e il colore diventa trasparente. Quindi la
// pallina gialla era invisibile, e sembrava che le animazioni non funzionassero.
//
// Non era solo la pallina: `--oro` compariva in 14 posti, fra cui il calendario
// (giorni attesi e il giorno di oggi), le card del personaggio e il bordo dei
// pulsanti scelti. Erano tutti rotti da un pezzo, senza che niente dicesse che
// qualcosa non andava.
//
// Qui si controlla che OGNI variabile usata con var() sia definita da qualche
// parte, con due eccezioni che sono giuste:
//  - quelle con un fallback scritto dentro var(--nome, valore)
//  - quelle che JavaScript imposta a runtime prima di usarle

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../stile.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

/** Tutte le variabili definite da una dichiarazione `--nome:`. */
function definiteInCss() {
  return new Set([...css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map((m) => m[1]));
}

/** Le variabili che il codice JavaScript mette sul posto a runtime. */
function definiteDaCodice() {
  const fuori = new Set();
  // stile inline: `--fuoco:${...}` e simili
  for (const m of app.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*\$\{/g)) fuori.add(m[1]);
  // setProperty('--nome', ...)
  for (const m of app.matchAll(/setProperty\((['"`])(--[a-zA-Z0-9_-]+)\1/g)) fuori.add(m[2]);
  // array di stili inline passati a el(): '--fuoco:${f.colore}'
  for (const m of app.matchAll(/style:\s*`([^`]+)`/g)) {
    for (const v of m[1].matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) fuori.add(v[1]);
  }
  return fuori;
}

test('ogni variabile usata con var() è definita', () => {
  const definite = definiteInCss();
  const daCodice = definiteDaCodice();

  // tutte le uscite var(--nome), con l'eventuale fallback
  const usate = new Map(); // nome -> true se ha il fallback
  for (const m of css.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(,)?/g)) {
    if (!usate.has(m[1])) usate.set(m[1], false);
    if (m[2]) usate.set(m[1], true);
  }

  const mancanti = [];
  for (const [nome, haFallback] of usate) {
    if (definite.has(nome)) continue;
    if (daCodice.has(nome)) continue;
    if (haFallback) continue; // var(--nome, 34px) va bene anche senza definizione
    mancanti.push(nome);
  }

  assert.deepEqual(mancanti, [],
    `var() senza definizione e senza fallback: ${mancanti.join(', ')}. Una variabile `
    + 'CSS inesistente non dà errore: la dichiarazione semplicemente non vale e '
    + 'il colore sparisce.');
});

test('il colore giallo è quello giusto', () => {
  // I 14 usi che erano rotti puntavano a "--oro", che non esiste. Ora devono
  // puntare a "--giallo", che invece è definita in :root.
  assert.ok(/--giallo\s*:/.test(css), '--giallo deve esistere');
  assert.ok(!/var\(--oro\)/.test(css), 'e non deve restare nessun var(--oro)');
});

test('la pallina della prova ha un colore vero', () => {
  // Il sintomo che ha fatto trovare il bug: una pallina invisibile.
  const i = css.indexOf('.prova-pallina {');
  const blocco = css.slice(i, css.indexOf('}', i));
  assert.match(blocco, /background:\s*var\(--giallo\)/, 'la pallina deve avere il colore');
  assert.doesNotMatch(blocco, /var\(--oro\)/, 'e non una variabile inesistente');
});

test('le variabili impostate da JavaScript sono davvero impostate prima', () => {
  // Le eccezioni del test di sopra sono due: --fuoco e --altezza-barra-in-alto.
  // Se un giorno il codice smette di impostarle, non devono più essere accettate
  // in silenzio: è il caso in cui una variabile diventa inesistente senza che
  // nessuno se ne accorga.
  for (const nome of ['--fuoco', '--altezza-barra-in-alto']) {
    assert.ok(app.includes(nome),
      `${nome} viene usata nel CSS ma il codice non la imposta più: o si rimette, `
      + 'o si toglie dal CSS');
  }
});