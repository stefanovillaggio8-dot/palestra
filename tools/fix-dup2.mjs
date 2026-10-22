import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js';
let s = readFileSync(P, 'utf8');

const pos = 277124; // il secondo trapezius_upper_r (il duplicato)
const inizio = s.lastIndexOf('<path', pos);
const fine = s.indexOf('/>', pos) + 2;
// via anche il separatore \n prima
let tag = s.slice(inizio, fine);
s = s.slice(0, inizio) + s.slice(fine);
// se era preceduto da \n, lo tolgo
s = s.replace(/\\n\s*$/, (m) => '');
writeFileSync(P, s, 'utf8');
console.log('ok: tolto il path duplicato (' + tag.length + ' caratteri)');
