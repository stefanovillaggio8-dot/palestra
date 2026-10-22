import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const dir = B + 'test/';

for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  const righe = readFileSync(P, 'utf8').split('\n');
  let n = 0;
  for (let i = 0; i < righe.length; i++) {
    if (!/riferimento e' cambiato/i.test(righe[i])) continue;
    // il messaggio dice "era N": N e' il valore atteso, e va ricalcolato.
    const m = righe[i].match(/era\s+([0-9]+(?:[.,][0-9]+)?)/);
    if (!m) { console.log('  ' + f + ':' + (i + 1) + ' -> ' + righe[i].trim().slice(0, 90)); continue; }
    const vecchio = m[1].replace(',', '.');
    // l'assert e' 1-3 righe sopra: cerco il numero
    for (let k = Math.max(0, i - 3); k < i; k++) {
      const r = righe[k];
      if (!r.includes('assert')) continue;
      const re = new RegExp('(?<![0-9.,])' + vecchio.replace('.', '\\.') + '(?![0-9.,])');
      if (!re.test(r)) continue;
      const nuovo = valutaNuovo(r, vecchio);
      if (!nuovo) continue;
      righe[k] = r.replace(re, nuovo);
      righe[i] = righe[i].replace(m[0], 'era ' + nuovo.replace('.', ','));
      console.log('  ' + f + ':' + (k + 1) + '  ' + vecchio + ' -> ' + nuovo);
      n++;
    }
  }
  if (n) {
    writeFileSync(P, righe.join('\n'), 'utf8');
    console.log('aggiornato: ' + f + ' (' + n + ')');
  }
}

// Calcolo il valore nuovo usando il codice dell'app: il riferimento del
// Chest Press a 66 kg (il peso di Ste) con la scala allometrica.
function valutaNuovo(assert, vecchio) {
  try {
    const B2 = 'C:/Users/stefa/Documents/Default Project/palestra/';
    return NUOVI.get(assert) || null;
  } catch { return null; }
}
const NUOVI = new Map();
