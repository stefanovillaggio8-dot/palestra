import { readFileSync, writeFileSync } from 'node:fs';

// Sostituisce gli apostrofi dritti con l'accento, MA SOLO nelle righe di
// commento: il codice non si tocca (una volta uno script ha mangiato una
// virgoletta e ha rotto il file).
const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/muscoli-parti.js';
const mappa = { "gia'": 'già', "piu'": 'più', "e'": 'è', "c'e'": 'c’è' };
const righe = readFileSync(P, 'utf8').split('\n');
let n = 0;
for (let i = 0; i < righe.length; i++) {
  const r = righe[i];
  if (!/^\s*\/\//.test(r)) continue;              // solo commenti
  if (!/'/.test(r)) continue;
  const nuova = r.replace(/\b(gia'|piu'|c'e'|e')/g, (m) => mappa[m] || m);
  if (nuova !== r) { righe[i] = nuova; n++; }
}
writeFileSync(P, righe.join('\n'), 'utf8');
console.log('righe di commento sistemate: ' + n);
