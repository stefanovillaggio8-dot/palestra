import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8');
test('Progressi ha un solo riepilogo generale: resta la card compatta', () => {
 const s=read('src/app.js');
 const v=s.slice(s.indexOf('function vistaProgressi(zona) {'),s.indexOf('/* ===================== vista: impostazioni'));
 assert.ok(v.includes('cardRiepilogoMio()'));
 assert.doesNotMatch(v, /boxGenerale|spazioGenerale|riepilogo-generale/);
 assert.equal([...s.matchAll(/testo:\s*'In generale, quanto sei migliorato'/g)].length, 1);
});
test('Progressi mostra spiegazioni semplici e apre i numeri solo su richiesta', () => {
 const s=read('src/app.js'),grafici=read('src/grafici.js');
 const v=s.slice(s.indexOf('function vistaProgressi(zona) {'),s.indexOf('/* ===================== vista: impostazioni'));
 assert.match(v,/progressi-verdetto/);
 assert.match(v,/Leggi la spiegazione completa/);
 assert.match(v,/progressi-altri-grafici/);
 assert.match(v,/Altri grafici: ripetizioni e lavoro totale/);
 assert.match(v,/graficiPanel\);\s*zona.appendChild\(extra\)/);
 assert.match(grafici,/el\('details', \{ class: 'grafico-dati'/);
 assert.match(read('stile-premium.css'),/Progressi v390/);
});
