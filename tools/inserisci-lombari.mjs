import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js';
let s = readFileSync(P, 'utf8');

if (s.includes('erector_spinae')) { console.log('gia fatto'); process.exit(0); }

const iR = s.indexOf('export const ATLANTE_RETRO = ');
const retro = s.slice(iR);

// il tag di un path gia' presente, copiato pari pari (stessa escaping)
const iTag = retro.indexOf('id=\\"trapezius_upper_r\\"');
if (iTag < 0) { console.log('non trovo il tag'); process.exit(1); }
const inizio = retro.lastIndexOf('<path', iTag);
const fine = retro.indexOf('/>', iTag) + 2;
const tag = retro.slice(inizio, fine);

// clono: cambio id e d
const dSx = 'M287,336 L285,372 L280,424 L277,456 L297,456 L297,336 Z';
const dDx = 'M309,336 L311,372 L316,424 L319,456 L299,456 L299,336 Z';
const clona = (id, d) => tag
  .replace('id=\\"trapezius_upper_r\\"', 'id=\\"' + id + '\\"')
  .replace(/\sd="[^"]*"/, ' d=\\"' + d + '\\"');

const nuovo = tag + '\n' + clona('erector_spinae_l', dSx) + '\n' + clona('erector_spinae_r', dDx);
const nuovoRetro = retro.slice(0, fine) + nuovo + retro.slice(fine);
s = s.slice(0, iR) + nuovoRetro;
writeFileSync(P, s, 'utf8');
console.log('ok: i due path dei lombari inseriti nel RETRO (copia di un path esistente)');
