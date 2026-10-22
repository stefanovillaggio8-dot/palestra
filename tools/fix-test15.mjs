import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const dir = B + 'test/';

for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  const righe = readFileSync(P, 'utf8').split('\n');
  let n = 0;
  for (let i = 0; i < righe.length; i++) {
    if (!/cambiato/i.test(righe[i])) continue;
    // il messaggio: "riferimento e' cambiato (era 50)" -> prendo l'ultimo numero
    const numeri = righe[i].match(/[0-9]+(?:[.,][0-9]+)?/g);
    if (!numeri || !numeri.length) continue;
    const vecchio = numeri[numeri.length - 1];
    // l'assert sta 1-3 righe sopra
    for (let k = Math.max(0, i - 3); k < i; k++) {
      if (!righe[k].includes('assert')) continue;
      const re = new RegExp('(?<![0-9.,])' + vecchio.replace('.', '\\.') + '(?![0-9.,])');
      if (!re.test(righe[k])) continue;
      const nuovo = nuovoRiferimento(righe[k], f);
      if (!nuovo) continue;
      righe[k] = righe[k].replace(re, nuovo);
      righe[i] = righe[i].replace(vecchio, nuovo.replace('.', ','));
      console.log('  ' + f + ':' + (k + 1) + '  ' + vecchio + ' -> ' + nuovo);
      n++;
    }
  }
  if (n) { writeFileSync(P, righe.join('\n'), 'utf8'); console.log('aggiornato: ' + f); }
}

// Il valore nuovo: lo prendo dal calcolo dell'app, per lo stesso esercizio.
function nuovoRiferimento(assert, file) {
  const m = assert.match(/'([a-z0-9 -]+)':\s*([0-9.]+)/i);
  if (!m) return null;
  const id = 'ex-' + m[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const v = RIFERIMENTI.get(id);
  return v ? String(Math.round(v * 100) / 100) : null;
}

const RIFERIMENTI = new Map();
{
  const { profiloEsercizio, profiloPerPesoCorporeo } = await import('../src/rank-config.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  for (const e of ESERCIZI) {
    RIFERIMENTI.set(e.id, profiloPerPesoCorporeo(profiloEsercizio(e), 66).riferimento);
  }
}
