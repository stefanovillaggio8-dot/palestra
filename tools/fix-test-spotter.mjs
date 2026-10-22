import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/test/rpg-chiaro.test.js';
let s = readFileSync(P, 'utf8');
const V = `  const iSpotter = riga.indexOf('riga.appendChild(botSpotter)');
  const iBloccoSpotter = riga.lastIndexOf('if (!serieCardio)', iSpotter);
  assert.ok(iSpotter > 0, 'lo spotter viene aggiunto da qualche parte');
  assert.ok(iBloccoSpotter > 0, 'ed è dentro un blocco "non cardio"');
  const dentroBlocco = riga.slice(iBloccoSpotter, riga.indexOf('}', iBloccoSpotter));`;
const N = `  // I QUATTRO PULSANTI IN UNA RIGA (22/10/2026): lo spotter non e' piu' un
  // figlio diretto della riga, sta nel contenitore "riga-bottoni-serie".
  const iSpotter = riga.indexOf('botSpotter,');
  const iBloccoSpotter = riga.lastIndexOf('if (!serieCardio)', iSpotter);
  assert.ok(iSpotter > 0, 'lo spotter viene aggiunto da qualche parte');
  assert.ok(iBloccoSpotter > 0, 'ed è dentro un blocco "non cardio"');
  const dentroBlocco = riga.slice(iBloccoSpotter, riga.indexOf('riga.appendChild(rigaBottoni)', iBloccoSpotter));`;
if (!s.includes(V)) { console.log('NON TROVATO: il controllo dello spotter'); process.exit(1); }
s = s.replace(V, N);
writeFileSync(P, s, 'utf8');
console.log('ok: il test del blocco "non cardio" aggiornato');
