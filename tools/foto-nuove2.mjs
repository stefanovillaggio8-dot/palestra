// foto-nuove2.mjs -- rimette le foto, abbinando per (file, posizione) così i numeri
// non contano.
//
// Uso: node tools/foto-nuove2.mjs <cartella-icone-VECCHIA> <cartella-icone-NUOVA> <elenco.json>

import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'C:/Users/stefa/Documents/Default Project/palestra';
const vecchia = process.argv[2];
const nuova = process.argv[3];
const elenco = JSON.parse(readFileSync(process.argv[4], 'utf8').replace(/^\uFEFF/, ''));
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const posizioni = (dir) => {
  const fuori = new Map();
  for (const f of readdirSync(dir).filter((x) => /^icona-\d+\.png$/.test(x)).sort()) {
    try {
      const p = readFileSync(join(dir, f + '.pos'), 'utf8').trim().split(/\s+/);
      fuori.set(f, { file: p.slice(4).join(' '), cy: (+p[1] + +p[3]) / 2 });
    } catch (e) { }
  }
  return fuori;
};

const vec = posizioni(vecchia);
const nuov = posizioni(nuova);

let n = 0;
for (const e of elenco) {
  const v = vec.get(e.icona);
  if (!v) { console.log('  vecchia non trovata: ' + e.icona + ' (' + e.nome + ')'); continue; }
  // la nuova icona: stesso file, verticale piu' vicina
  let scelta = null;
  let d = 1e9;
  for (const [f, p] of nuov) {
    if (p.file !== v.file) continue;
    const dd = Math.abs(p.cy - v.cy);
    if (dd < d) { d = dd; scelta = f; }
  }
  if (!scelta) { console.log('  nuova non trovata per ' + e.nome); continue; }
  copyFileSync(join(nuova, scelta), BASE + '/img/esercizi/' + slug(e.nome) + '.png');
  n++;
  console.log('  ' + e.nome.padEnd(34) + ' ' + e.icona + ' -> ' + scelta);
}
console.log('  rimesse ' + n + ' foto');
