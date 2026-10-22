// foto-nuove.mjs -- rimette le foto degli esercizi presi dalla lista, con i ritagli giusti.
//
// Uso: node tools/foto-nuove.mjs <cartella-icone> <elenco.json>
// L'elenco e' [{ nome, icona }, ...] con l'icona GIA' ritagliata (il file in
// img/esercizi/<slug>.png viene sovrascritto).

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'C:/Users/stefa/Documents/Default Project/palestra';
const dir = process.argv[2];
const elenco = JSON.parse(readFileSync(process.argv[3], 'utf8').replace(/^\uFEFF/, ''));
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let n = 0;
for (const e of elenco) {
  const sorgente = join(dir, e.icona);
  if (!existsSync(sorgente)) { console.log('  manca: ' + e.icona + ' (' + e.nome + ')'); continue; }
  copyFileSync(sorgente, BASE + '/img/esercizi/' + slug(e.nome) + '.png');
  n++;
}
console.log('  rimese ' + n + ' foto');
