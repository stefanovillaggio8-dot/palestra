import { readFileSync, writeFileSync } from 'node:fs';

// Toglie le parole con l'apostrofo dritto al posto dell'accento.
// Uso:  node tools/fix-accenti.mjs src/muscoli-parti.js [altro.js ...]
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const mappa = {
  "gia'": 'già', "piu'": 'più', "e'": 'è', "c'e'": 'c’è', "l'e'": 'l’è',
  "s'e'": 's’è', "un'": 'un’', "dall'": 'dall’', "all'": 'all’', "nell'": 'nell’',
};
const file = process.argv.slice(2);
if (!file.length) { console.log('uso: node tools/fix-accenti.mjs FILE...'); process.exit(1); }
for (const f of file) {
  const P = B + f;
  let s = readFileSync(P, 'utf8');
  const prima = s;
  s = s.replace(/\b(gia'|piu'|c'e'|l'e'|s'e'|e')/g, (m) => mappa[m] || m);
  if (s !== prima) { writeFileSync(P, s, 'utf8'); console.log('  ok: ' + f); }
  else console.log('  ' + f + ': niente da cambiare');
}
