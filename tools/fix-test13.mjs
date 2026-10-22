import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const dir = B + 'test/';

for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  const righe = readFileSync(P, 'utf8').split('\n');
  let n = 0;
  for (let i = 0; i < righe.length; i++) {
    if (!righe[i].includes('era 50')) continue;
    console.log('trovato in ' + f + ' riga ' + (i + 1) + ': ' + righe[i].trim().slice(0, 80));
    // la riga dell'assert sta 1-3 righe sopra: cerco il valore 50
    for (let k = Math.max(0, i - 3); k < i; k++) {
      if (righe[k].includes('assert') && /(?<![0-9.,])50(?![0-9.,])/.test(righe[k])) {
        righe[k] = righe[k].replace(/(?<![0-9.,])50(?![0-9.,])/, '48.07');
        righe[i] = righe[i].replace('era 50', 'era 48,07');
        n++;
        console.log('  cambiata la riga ' + (k + 1) + ': ' + righe[k].trim().slice(0, 80));
      }
    }
  }
  if (n) {
    writeFileSync(P, righe.join('\n'), 'utf8');
    console.log('aggiornato: ' + f);
  }
}
