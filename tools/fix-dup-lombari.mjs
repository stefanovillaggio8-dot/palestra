import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js';
let s = readFileSync(P, 'utf8');
const iR = s.indexOf('export const ATLANTE_RETRO = ');
let retro = s.slice(iR);

// toglie il PRIMO paio di path dei lombari (sono duplicati: ne erano stati
// inseriti due volte) e lascia il secondo
const re = /<path[^>]*id=\\"erector_spinae_[lr]\\"[^>]*\/>\s*/g;
let trovati = 0;
retro = retro.replace(re, (m) => {
  trovati++;
  // ne tengo due (uno per lato), scarto gli altri
  if (trovati > 2) return '';
  return m;
});
console.log('path dei lombari trovati nel retro: ' + trovati);
writeFileSync(P, s.slice(0, iR) + retro, 'utf8');
console.log('ok: tolto il doppione');
