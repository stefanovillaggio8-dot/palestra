import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js';
let s = readFileSync(P, 'utf8');

const prima = s.length;
s = s.replace(/(\r?\n)(<path\s*\\n\s*d=\\"M287,336)/g, '\\n$2');
s = s.replace(/(\r?\n)(<path\s*\\n\s*d=\\"M309,336)/g, '\\n$2');
writeFileSync(P, s, 'utf8');
console.log('byte tolti: ' + (prima - s.length) + ' (i newline veri cambiati in \\n)');
