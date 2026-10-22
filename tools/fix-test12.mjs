import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const dir = B + 'test/';

for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  const righe = readFileSync(P, 'utf8').split('\n');
  let n = 0;
  for (let i = 0; i < righe.length; i++) {
    const finestra = righe.slice(Math.max(0, i - 4), i + 1).join('\n');
    if (finestra.includes('65 kg') && finestra.includes('platino')) {
      for (let k = Math.max(0, i - 4); k <= i; k++) {
        if (righe[k].includes("'platinum'")) {
          righe[k] = righe[k].replace("'platinum'", "'gold'");
          n++;
        }
      }
    }
    if (finestra.includes('era 50')) {
      for (let k = Math.max(0, i - 4); k <= i; k++) {
        if (/(?<![0-9.,])50(?![0-9.,])/.test(righe[k])) {
          righe[k] = righe[k].replace(/(?<![0-9.,])50(?![0-9.,])/, '48.07');
          n++;
        }
      }
    }
  }
  if (n) {
    writeFileSync(P, righe.join('\n'), 'utf8');
    console.log('aggiornato: ' + f + ' (' + n + ')');
  }
}
