import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// 1. il css: il blocco "riduci animazioni" deve restare L'ULTIMO
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  const inizio = s.indexOf('\n/* ===================== LE ICONE DEL MENU (22/10/2026) =====================');
  if (inizio < 0) { console.log('il blocco delle icone non c\'e\''); process.exit(1); }
  const blocco = s.slice(inizio);
  s = s.slice(0, inizio);
  // lo metto subito PRIMA del blocco "riduci animazioni"
  const riduci = s.search(/\n\/\*[^\n]*riduci animazioni|\n@media \(prefers-reduced-motion/);
  if (riduci < 0) { console.log('non trovo il blocco riduci animazioni'); process.exit(1); }
  s = s.slice(0, riduci) + blocco + s.slice(riduci);
  writeFileSync(P, s, 'utf8');
  console.log('ok: il blocco delle icone sta prima di "riduci animazioni"');
}

// 2. l'apostrofo nel commento
{
  const P = B + 'src/app.js';
  const righe = readFileSync(P, 'utf8').split('\n');
  let n = 0;
  for (let i = 0; i < righe.length; i++) {
    const r = righe[i];
    if (!/^\s*\/\//.test(r)) continue;
    const nuova = r.replace(/\bcosi'/g, 'così').replace(/\bperche'/g, 'perché');
    if (nuova !== r) { righe[i] = nuova; n++; }
  }
  writeFileSync(P, righe.join('\n'), 'utf8');
  console.log('ok: commenti sistemati: ' + n);
}
