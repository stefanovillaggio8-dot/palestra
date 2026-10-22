// prova-pulsante.mjs -- il pulsante "Come funziona questo RPG?" apre e chiude.
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
await attesa(1500);

const spiegazioni = () => app.querySelectorAll('.rpg-spiegazione');
const testo = () => (spiegazioni()[0] ? (spiegazioni()[0].textContent || '') : '');
const bottone = pulsanti(app).find((b) => /Come funziona|Chiudi/.test(b.textContent || ''));

console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));
console.log('bottone trovato: ' + (bottone ? '"' + (bottone.textContent || '').trim() + '"' : 'NO'));
console.log('prima di premere: riquadro presente = ' + (spiegazioni().length > 0) + ', nascosto = ' + (spiegazioni()[0] ? !!spiegazioni()[0].hidden : 'n/d'));
console.log('  testo mostrato: "' + testo().slice(0, 60).replace(/\s+/g, ' ') + '"');

if (bottone) {
  bottone.click();
  await attesa(300);
  console.log('');
  console.log('DOPO il primo click (deve aprirsi):');
  console.log('  nascosto = ' + (spiegazioni()[0] ? !!spiegazioni()[0].hidden : 'n/d'));
  console.log('  etichetta bottone: "' + (bottone.textContent || '').trim() + '"');
  const t = testo();
  console.log('  contiene "Forza": ' + (t.includes('Forza') ? 'SI' : 'NO'));
  console.log('  contiene "Cosa NON conta": ' + (t.includes('Cosa NON conta') ? 'SI' : 'NO'));
  console.log('  testo: "' + t.slice(0, 150).replace(/\s+/g, ' ') + '"');

  bottone.click();
  await attesa(300);
  console.log('');
  console.log('DOPO il secondo click (deve chiudersi):');
  console.log('  nascosto = ' + (spiegazioni()[0] ? !!spiegazioni()[0].hidden : 'n/d'));
  console.log('  etichetta bottone: "' + (bottone.textContent || '').trim() + '"');
}
console.log('');
console.log('errori finali: ' + (errori.length ? errori.join(' | ') : 'nessuno'));