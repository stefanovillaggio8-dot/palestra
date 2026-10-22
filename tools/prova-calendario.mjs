// prova-calendario.mjs -- il calendario mostra i giorni giusti?
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

await import('../src/app.js');
await new Promise((r) => setTimeout(r, 1500));
globalThis.window.location.hash = '#/profilo';
await new Promise((r) => setTimeout(r, 1400));

const testo = app.textContent || '';
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));
const caselle = perClasse(app, 'casella-calendario');
console.log('caselle: ' + caselle.length + '  (devono essere 7)');
console.log('giorni previsti: ' + perClasse(app, 'casella-calendario').filter((n) => (n.className || '').includes('previsto')).length);
console.log('oggi evidenziato: ' + caselle.filter((n) => (n.className || '').includes('oggi')).length);
console.log('fatti: ' + caselle.filter((n) => (n.className || '').includes('fatto')).length);
console.log('');
console.log('ordine delle caselle (deve essere lun,mar,mer,gio,ven,sab,dom):');
console.log('  ' + caselle.map((c) => (c.textContent || '').trim()).join(' | '));
console.log('');
console.log('la frase in cima:');
const i = testo.indexOf('Il tuo calendario');
console.log('  ...' + testo.slice(i, i + 180).replace(/\s+/g, ' ') + '...');