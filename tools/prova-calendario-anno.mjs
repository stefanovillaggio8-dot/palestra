// prova-calendario-anno.mjs -- le frecce cambiano l'anno del calendario.
globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, pulsanti } = await import('../test/dom-minimo.js');
const { app } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const errori = [];
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message)));
process.on('uncaughtException', (e) => errori.push('uncaught: ' + (e && e.message)));
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

await import('../src/app.js');
await attesa(1500);
globalThis.window.location.hash = '#/profilo';
await attesa(1600);

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const annoOggi = new Date().getFullYear();

const stato = () => {
  const t = app.textContent || '';
  const i = t.indexOf('Il tuo calendario');
  const pezzo = t.slice(i, i + 4000);
  const mesi = [...new Set((pezzo.match(new RegExp(MESI.join('|'), 'gi')) || []).map((x) => x.toLowerCase()))];
  const anno = (pezzo.match(/20\d\d/) || ['?'])[0];
  const celle = app.querySelectorAll ? app.querySelectorAll('.cella-calendario').length : 0;
  return { anno, mesi: mesi.length, primo: mesi[0], celle };
};

const freccia = (simbolo) => pulsanti(app).find((b) => (b.textContent || '').trim() === simbolo);

console.log('=== ADESSO');
let s = stato();
console.log('  anno mostrato: ' + s.anno);
console.log('  mesi visibili: ' + s.mesi + ' (' + s.primo + ' in poi, perché non hai ancora allenato)');
console.log('  celle: ' + s.celle);
console.log('  bottone "A oggi": ' + (pulsanti(app).some((b) => (b.textContent || '').trim() === 'A oggi') ? 'presente' : 'assente (giusto: siamo già a oggi)'));

console.log('');
console.log('=== PREMO "›" (l\'anno dopo)');
const avanti = freccia('›');
if (avanti) { avanti.click(); await attesa(1200); } else { console.log('  non trovo la freccia avanti'); }
s = stato();
console.log('  anno mostrato: ' + s.anno + ' (atteso: ' + (annoOggi + 1) + ')');
console.log('  mesi visibili: ' + s.mesi + ' (tutti e 12: è un anno intero)');
console.log('  bottone "A oggi": ' + (pulsanti(app).some((b) => (b.textContent || '').trim() === 'A oggi') ? 'presente (giusto: siamo nel futuro)' : 'ASSENTE'));

console.log('');
console.log('=== PREMO DI NUOVO (l\'anno dopo ancora)');
const avanti2 = freccia('›');
if (avanti2) { avanti2.click(); await attesa(1200); }
s = stato();
console.log('  anno mostrato: ' + s.anno + ' (atteso: ' + (annoOggi + 2) + ')');

console.log('');
console.log('=== TORNO A OGGI');
const oggi = pulsanti(app).find((b) => (b.textContent || '').trim() === 'A oggi');
if (oggi) { oggi.click(); await attesa(1200); } else { console.log('  non trovo il bottone "A oggi"'); }
s = stato();
console.log('  anno mostrato: ' + s.anno + ' (atteso: ' + annoOggi + ')');

console.log('');
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));