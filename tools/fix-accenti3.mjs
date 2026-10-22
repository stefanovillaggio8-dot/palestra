import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/app.js';
const mappa = {
  "cosi'": 'così', "piu'": 'più', "perche'": 'perché', "gia'": 'già',
  "e'": 'è', "c'e'": 'c’è', "cos'e'": 'cos’è', "poi'": 'poi',
};
const righe = readFileSync(P, 'utf8').split('\n');
let n = 0;
for (let i = 0; i < righe.length; i++) {
  const r = righe[i];
  if (!/^\s*\/\//.test(r)) continue;
  const nuova = r.replace(/\b(cosi'|piu'|perche'|gia'|c'e'|cos'e'|poi'|e')/g, (m) => mappa[m] || m);
  if (nuova !== r) { righe[i] = nuova; n++; }
}
writeFileSync(P, righe.join('\n'), 'utf8');
console.log('righe sistemate: ' + n);
