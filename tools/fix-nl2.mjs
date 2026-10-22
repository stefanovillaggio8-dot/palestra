import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js';
let s = readFileSync(P, 'utf8');

// I due path dei lombari sono finiti con un newline VERO dentro la stringa:
// la stringa si spezza e il file non si carica piu'. Il newline dentro una
// stringa va scritto come i due caratteri \ e n.
const re = /\n(<path\s*\\n\s*d=\\"M2[89]7,336)/g;
let n = 0;
s = s.replace(re, (m, g1) => { n++; return '\\n' + g1; });
writeFileSync(P, s, 'utf8');
console.log('newline veri corretti: ' + n);
