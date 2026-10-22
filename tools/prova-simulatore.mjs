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
await attendiChe(() => perClasse(app, 'chip').length > 0);
await new Promise((r) => setTimeout(r, 300));

const prova = perClasse(app, 'chip').find((c) => /prova/i.test(c.textContent));
await prova.click();
await new Promise((r) => setTimeout(r, 300));

const campo = perClasse(app, 'campo-testo')[0];
console.log('il campo di ricerca c\'e\': ' + !!campo);
const suggerite = () => perClasse(app, 'voce-suggerita').map((b) => b.textContent.trim());
console.log('senza scrivere: ' + suggerite().length + ' suggerimenti');
campo.value = 'S';
await campo.dispatch('input', { type: 'input', target: campo });
const conS = suggerite();
console.log('scrivendo "S": ' + conS.length + ' -> ' + conS.slice(0, 4).join(' | '));
campo.value = 'St';
await campo.dispatch('input', { type: 'input', target: campo });
const conSt = suggerite();
console.log('scrivendo "St": ' + conSt.length + ' (nessuno comincia con St: giusto)');
campo.value = 'Cable';
await campo.dispatch('input', { type: 'input', target: campo });

// scelgo il primo suggerimento e calcolo
await suggerite()[0] && (await perClasse(app, 'voce-suggerita')[0].click());
const campi = perClasse(app, 'campo-num');
console.log('i campi: ' + campi.length);
if (campi.length >= 2) {
  campi[0].value = 60;
  campi[1].value = 8;
  console.log('i valori dei campi: ' + campi.map((c) => c.value).join(' | '));
  console.log('il testo del campo cerca: "' + campo.value + '"');
  console.log('i pulsanti: ' + perClasse(app, 'bot').map((b) => b.textContent.trim().slice(0, 18)).join(' | '));
  const calcola = perClasse(app, 'bot').find((b) => /calcola/i.test(b.textContent));
  try { await calcola.click(); } catch (e) { console.log("ERRORE: " + e.message + " | " + (e.stack || "").split("\n")[1]); }
  await new Promise((r) => setTimeout(r, 300));
  const pannello = perClasse(globalThis.document.body, 'pannello-prova');
  console.log('il messaggio: ' + perClasse(app, 'nota').map((n) => n.textContent.trim()).filter((t) => t && t.length < 60).join(' | '));
  console.log('il pannello a tutto schermo: ' + (pannello.length ? 'SI, dice "' + pannello[0].textContent.trim().slice(0, 60) + '"' : 'NO'));
}
