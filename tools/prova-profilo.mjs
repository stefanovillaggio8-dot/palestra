// prova-profilo.mjs -- il Profilo col calendario grande e il personaggio.
globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom } = await import('../test/dom-minimo.js');
const { app } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const errori = [];
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message)));
process.on('uncaughtException', (e) => errori.push('uncaught: ' + (e && e.message)));

await import('../src/app.js');
await new Promise((r) => setTimeout(r, 1500));
globalThis.window.location.hash = '#/profilo';
await new Promise((r) => setTimeout(r, 1500));

const t = app.textContent || '';
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));
console.log('');
console.log('--- c\'e il calendario grande?');
console.log('  "Il tuo calendario": ' + (t.includes('Il tuo calendario') ? 'SI' : 'NO'));
const mesi = (t.match(/gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre/gi) || []);
console.log('  mesi citati: ' + mesi.length + (mesi.length ? ' (' + [...new Set(mesi)].join(', ') + ')' : ''));
console.log('');
console.log('--- c\'e il personaggio?');
console.log('  "Il tuo personaggio": ' + (t.includes('Il tuo personaggio') ? 'SI' : 'NO'));
console.log('  "Come funziona questo RPG?": ' + (t.includes('Come funziona questo RPG?') ? 'SI' : 'NO'));
console.log('');
console.log('--- la frase in cima al calendario');
const i = t.indexOf('Il tuo calendario');
if (i >= 0) console.log('  "' + t.slice(i + 18, i + 190).replace(/\s+/g, ' ') + '"');