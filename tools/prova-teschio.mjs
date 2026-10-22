// prova-teschio.mjs -- cosa dice davvero la card della streak nei tre casi.
import { readFile } from 'node:fs/promises';

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, perClasse } = await import('../test/dom-minimo.js');
const { app } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const errori = [];
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message)));
process.on('uncaughtException', (e) => errori.push('uncaught: ' + (e && e.message)));
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

const { aspettoStreak } = await import('../src/streak.js');
const srcApp = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');

console.log('=== LA CARD NEI TRE STATI (come la legge l\'app)');
const dow = new Date().getDay();
const casi = [
  ['accesa, 4 giorni di fila', { giorni: 4, attiva: true, fattoOggi: true, giorniPrevisti: [dow] }],
  ['DA ACCENDERE, 0 giorni', { giorni: 0, attiva: false, fattoOggi: false, giorniPrevisti: [dow] }],
  ['da accendere, 3 giorni', { giorni: 3, attiva: false, fattoOggi: false, giorniPrevisti: [dow] }],
  ['spenta davvero', { giorni: 0, attiva: false, fattoOggi: false, giorniPrevisti: [(dow + 1) % 7] }],
];
for (const [nome, s] of casi) {
  const a = aspettoStreak(s);
  // numero: "??" solo quando è spenta
  const numero = a.stato === 'spenta' ? '??' : String(a.giorni);
  // frase sotto il numero
  const frase = a.stato === 'acceso'
    ? (a.giorni === 1 ? 'un giorno di fila' : 'giorni di fila')
    : (a.stato === 'da accendere'
      ? (a.giorni === 0 ? 'ti tocca oggi: allenati e parte da 1' : `ti tocca oggi: allenati e sale a ${a.giorni + 1}`)
      : a.nome);
  console.log('');
  console.log('  ' + nome);
  console.log('    numero grande: "' + numero + '"   stato: ' + a.stato + '   colore: ' + a.colore);
  console.log('    sotto: "' + frase + '"');
  const avviso = a.stato === 'da accendere'
    ? (a.giorni === 0 ? '▲ Non è ancora accesa: oggi ti tocca. Allenati e parte da 1.' : `▲ Oggi ti tocca: allenati e sale a ${a.giorni + 1}`)
    : '(nessun avviso)';
  console.log('    avviso: ' + avviso);
}

console.log('');
console.log('=== LA CARD SEMBRA ACCESA QUANDO NON LO È?');
const stile = /\.teschio-streak\.da-accendere \{[\s\S]{0,300}?\}/.exec(css);
console.log('  ha box-shadow (alone): ' + (/box-shadow/.test(stile[0]) ? 'SI — sembra accesa' : 'no'));
console.log('  ha animation (pulsazione): ' + (/animation/.test(stile[0]) ? 'SI — sembra accesa' : 'no'));
const numeroStile = /\.teschio-streak\.da-accendere \.fuoco \{[^}]*\}/.exec(css);
console.log('  il numero è colorato: ' + (/var\(--testo\)/.test(numeroStile[0]) ? 'no (colore normale)' : 'SI'));
console.log('  l\'avviso è marcato: ' + (/\.richiamo-streak \{[\s\S]{0,200}?font-weight: 800/.test(css) ? 'si' : 'no'));

console.log('');
console.log('=== A SCHERMO (home con dati)');
await import('../src/app.js');
await attesa(1500);
globalThis.window.location.hash = '#/';
await attesa(1500);
const t = perClasse(app, 'teschio-streak')[0];
if (t) {
  console.log('  classi: ' + String(t.className || ''));
  console.log('  testo: ' + (t.textContent || '').replace(/\s+/g, ' ').trim());
} else {
  console.log('  (nessuna card: non ci sono dati in questa prova)');
}
console.log('');
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));