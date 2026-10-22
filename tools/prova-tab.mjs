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
await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);

globalThis.window.location.hash = '#/rank';
await attendiChe(() => perClasse(app, 'chip-scelte').length > 0 || perClasse(app, 'chip').length > 0);
await new Promise((r) => setTimeout(r, 400));

const chips = perClasse(app, 'chip');
console.log('le voci nella barra del Rank: ' + (chips.length ? chips.map((c) => c.textContent.trim()).join(' | ') : '(nessuna)'));
const prova = chips.find((c) => /prova/i.test(c.textContent));
console.log('il tasto PROVA esiste: ' + !!prova);
if (prova) {
  await prova.click();
  await new Promise((r) => setTimeout(r, 400));
  const campi = perClasse(app, 'campo-num');
  console.log('i campi del simulatore: ' + campi.length);
  const datalist = perClasse(app, 'datalist');
  console.log('l\'elenco degli esercizi: ' + (datalist.length ? datalist[0].children.length + ' nomi' : 'manca'));
}
