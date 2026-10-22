import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js';
let s = readFileSync(P, 'utf8');

// il tag e' finito due volte di fila: ne tolgo uno
const i = s.indexOf('id=\\"trapezius_upper_r\\"');
const inizio = s.lastIndexOf('<path', i);
const fine = s.indexOf('/>', i) + 2;
const tag = s.slice(inizio, fine);
const dopo = s.slice(fine);
// se subito dopo c'e' lo stesso tag, lo salto
if (dopo.trimStart().startsWith(tag.trimStart().slice(0, 40))) {
  const spazi = dopo.length - dopo.trimStart().length;
  s = s.slice(0, fine) + dopo.slice(spazi + tag.length);
  writeFileSync(P, s, 'utf8');
  console.log('ok: tolto il tag doppione');
} else {
  console.log('non c\'era il doppione (inizio dopo: ' + JSON.stringify(dopo.slice(0, 40)) + ')');
}
