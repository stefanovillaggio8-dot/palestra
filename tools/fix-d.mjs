import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js';
let s = readFileSync(P, 'utf8');

const dSx = 'M287,336 L285,372 L280,424 L277,456 L297,456 L297,336 Z';
const dDx = 'M309,336 L311,372 L316,424 L319,456 L299,456 L299,336 Z';

function cambiaD(id, d) {
  const i = s.indexOf('id=\\"' + id + '\\"');
  if (i < 0) return 'non trovo ' + id;
  const inizio = s.lastIndexOf('<path', i);
  const fine = s.indexOf('/>', i);
  const tag = s.slice(inizio, fine + 1);
  const nuovo = tag.replace(/\sd=\\"[^"]*\\"/, ' d=\\"' + d + '\\"');
  s = s.slice(0, inizio) + nuovo + s.slice(fine);
  return 'ok ' + id;
}

console.log(cambiaD('erector_spinae_l', dSx));
console.log(cambiaD('erector_spinae_r', dDx));
writeFileSync(P, s, 'utf8');
