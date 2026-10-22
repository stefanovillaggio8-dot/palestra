import { montaDom, pulsante, perClasse, trova } from '../test/dom-minimo.js';

globalThis.localStorage = { _v: new Map(), getItem(k) { return this._v.has(k) ? this._v.get(k) : null; }, setItem(k, v) { this._v.set(k, String(v)); }, removeItem(k) { this._v.delete(k); }, clear() { this._v.clear(); } };
delete globalThis.indexedDB;
const { app } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

async function attendiChe(c, n = 60) {
  for (let i = 0; i < n; i++) { if (c()) return true; await new Promise((r) => setTimeout(r, 20)); }
  return false;
}

await import('../src/app.js');
await attendiChe(() => perClasse(app, 'blocco-giorno-modifica').length === 4);
globalThis.window.location.hash = '#/scheda';
await attendiChe(() => perClasse(app, 'blocco-giorno-modifica').length === 4);
const giorni = perClasse(app, 'blocco-giorno-modifica');
await pulsante(giorni[giorni.length - 1], 'Aggiungi esercizio').click();
const d = perClasse(globalThis.document.body, 'dialogo-largo')[0];
const filtri = perClasse(d, 'filtro');
console.log('i chip:', filtri.map((f) => f.textContent.trim()).join(' | '));
const deltoide = filtri.find((f) => f.textContent.trim() === 'deltoide');
if (deltoide) {
  await deltoide.click();
  const d2 = perClasse(globalThis.document.body, 'dialogo-largo')[0];
  const scelte = perClasse(d2, 'voce-scelta').map((s) => s.textContent.trim());
  console.log('con il filtro deltoide (' + scelte.length + '):');
  for (const s of scelte) console.log('   ' + s);
} else {
  console.log('NON C\'E\' il chip deltoide');
}
