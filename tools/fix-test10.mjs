import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const dir = B + 'test/';

for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  const righe = readFileSync(P, 'utf8').split('\n');
  let n = 0;
  for (let i = 1; i < righe.length; i++) {
    const msg = righe[i];
    const assert = righe[i - 1];
    if (msg.includes('65 kg lo stesso punteggio') && assert.includes("'platinum'")) {
      righe[i - 1] = assert.replace("'platinum'", "'gold'");
      righe[i] = msg.replace("e' platino", "e' gold");
      n++;
    }
    if (msg.includes("Chest Press: il riferimento e' cambiato") && /era 50/.test(msg)) {
      righe[i] = msg.replace('era 50', 'era 48,07');
      // il valore verificato sta nella riga prima del messaggio
      for (let k = i - 2; k <= i - 1; k++) {
        if (k >= 0 && /\b50\b/.test(righe[k])) { righe[k] = righe[k].replace(/\b50\b/, '48.07'); n++; }
      }
      n++;
    }
  }
  if (n) {
    writeFileSync(P, righe.join('\n'), 'utf8');
    console.log('aggiornato: ' + f + ' (' + n + ')');
  }
}
