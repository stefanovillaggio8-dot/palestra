// prova-impostazioni.mjs -- il blocco dei giorni spunta nelle Impostazioni?
globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, perClasse, pulsanti } = await import('../test/dom-minimo.js');
const { app } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const errori = [];
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message)));
process.on('uncaughtException', (e) => errori.push('uncaught: ' + (e && e.message)));

await import('../src/app.js');
await new Promise((r) => setTimeout(r, 1800));
globalThis.window.location.hash = '#/impostazioni';
await new Promise((r) => setTimeout(r, 1500));

const testo = app.textContent || '';
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));
console.log('titolo pagina: ' + (testo.match(/^Impostazioni/) ? 'Impostazioni OK' : 'NON c\'e\' "Impostazioni"'));
console.log('c\'e "I giorni in cui alleni": ' + (testo.includes('I giorni in cui alleni') ? 'SI' : 'NO'));
console.log('');
const i = testo.indexOf('I giorni in cui alleni');
if (i >= 0) {
  console.log('il blocco dice:');
  console.log('  ...' + testo.slice(i, i + 320).replace(/\s+/g, ' ') + '...');
}
console.log('');
console.log('bottoni nella pagina:');
for (const b of pulsanti(app)) {
  const t = (b.textContent || '').trim();
  if (t) console.log('  - ' + t);
}