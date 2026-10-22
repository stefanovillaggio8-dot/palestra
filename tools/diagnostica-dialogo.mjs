// diagnostica-dialogo.mjs -- guardo i figli del dialogo per capire la struttura.
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
await import('../src/app.js');
await new Promise((r) => setTimeout(r, 1500));
globalThis.window.location.hash = '#/profilo';
await new Promise((r) => setTimeout(r, 1200));
pulsanti(app).find((x) => /CREA ESERCIZIO/i.test(x.textContent || '')).click();
await new Promise((r) => setTimeout(r, 600));

const corpo = globalThis.document.body;
const d = corpo.querySelector('.dialogo');
console.log('dialogo: ' + (d ? 'si' : 'NO'));
const figli = Array.from(d.children || []);
console.log('figli diretti: ' + figli.length);
for (const f of figli.slice(0, 20)) {
  console.log('  ' + f.tagName + '  "' + String(f.textContent || '').slice(0, 45) + '"');
}