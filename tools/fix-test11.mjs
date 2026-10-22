import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const dir = B + 'test/';

for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  const righe = readFileSync(P, 'utf8').split('\n');
  let n = 0;
  for (let i = 0; i < righe.length; i++) {
    // il messaggio "a 65 kg ..." e l'assert sulla riga precedente
    if (righe[i].includes('65 kg') && i > 0 && righe[i - 1].includes('platino')) {
      righe[i - 1] = righe[i - 1].replace("'platino'", "'gold'").replace("'platino", "'gold");
      n++;
    }
    // "era 50" -> "era 48,07" e il valore 50 -> 48,07
    if (righe[i].includes('era 50')) {
      righe[i] = righe[i].replace('era 50', 'era 48,07');
      for (let k = Math.max(0, i - 3); k <= i; k++) {
        if (/(?<![0-9.])50(?![0-9.])/.test(righe[k]) && righe[k].includes('riferimento')) {
          righe[k] = righe[k].replace(/(?<![0-9.])50(?![0-9.])/, '48.07');
        }
      }
      n++;
    }
  }
  if (n) {
    writeFileSync(P, righe.join('\n'), 'utf8');
    console.log('aggiornato: ' + f + ' (' + n + ')');
  }
}
