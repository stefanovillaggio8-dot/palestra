import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Progressi: riepilogo, grafici, dettagli nell ordine richiesto',()=>{
 const app=read('src/app.js'),from=app.indexOf('function vistaProgressi(zona) {'),to=app.indexOf('/* ===================== vista: impostazioni',from);
 assert.ok(from>=0&&to>from);
 const body=app.slice(from,to);
 assert.match(body,/progressi-grafici-panel/);
 assert.match(body,/progressi-extra/);
 assert.match(body,/zona\.appendChild\(graficiPanel\);\s*zona\.appendChild\(extra\)/);
 assert.match(body,/extraDentro\.appendChild\(cardHallOfFame\(\)\)/);
 assert.match(body,/extraDentro\.appendChild\(cardCoachProgressi\(\)\)/);
 assert.match(body,/extraDentro\.appendChild\(boxTabella\)/);
});
test('grafici conservano valori e rispettano movimento ridotto',()=>{
 const js=read('src/grafici.js'),css=read('stile-premium.css');
 assert.match(js,/pathLength: 1/);
 assert.match(js,/el\('details', \{ class: 'grafico-dati'/);
 assert.match(css,/prefers-reduced-motion:no-preference/);
 assert.match(css,/@keyframes progresso-linea/);
 assert.match(css,/\.progressi-grafici-panel/);
});
