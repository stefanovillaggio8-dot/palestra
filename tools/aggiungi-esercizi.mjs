// aggiungi-esercizi.mjs -- mette le foto degli esercizi nell'app.
//
// Uso:
//   node tools/aggiungi-esercizi.mjs <cartella> <mappa.json>
//
// La mappa è un JSON: { "IMG_1234.jpg": "Cable Fly", "IMG_5678.jpg": "Lat Pulldown" }
// (il nome del file come sta sul disco -> il nome dell'esercizio nell'app).
//
// Cosa fa:
//  1. ridimensiona ogni foto (le foto del telefono sono 3-4 MB: nell'app devono stare
//     in 30 KB, e la foto si vede in un quadratino piccolo)
//  2. la scrive in img/esercizi/<nome-slug>.png
//  3. stampa le righe del catalogo pronte da copiare
//
// Le righe del catalogo NON vengono scritte da sole: il catalogo e' un file che ha
// dentro i numeri di tutto (i Rank, le scale, i pesi), e metterci dentro le righe nuove
// a caso sarebbe una scherzata. Il file lo tocca chi ci mette mano.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename, extname } from 'node:path';

const cartella = process.argv[2];
const mappaFile = process.argv[3];
if (!cartella || !mappaFile) {
  console.log('Uso: node tools/aggiungi-esercizi.mjs <cartella> <mappa.json>');
  process.exit(1);
}
if (!existsSync(cartella)) { console.log('Cartella non trovata: ' + cartella); process.exit(1); }

// il BOM: un file scritto da PowerShell lo mette, e JSON.parse lo odia
const mappa = JSON.parse(readFileSync(mappaFile, 'utf8').replace(/^\uFEFF/, ''));
const BASE = 'C:/Users/stefa/Documents/Default Project/palestra';
const DEST = join(BASE, 'img/esercizi');
const TMP = process.env.TEMP + '/opencode/foto-esercizi';

const slug = (nome) => nome.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const trovati = readdirSync(cartella).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
console.log('foto nella cartella: ' + trovati.length);

const PY = `
import json, sys, os
from PIL import Image
cartella, tmp, nome, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
os.makedirs(tmp, exist_ok=True)
im = Image.open(os.path.join(cartella, nome)).convert('RGB')
# il quadratino: si ritaglia al centro e si stira sul quadrato, come le altre foto
lato = max(im.size)
quad = Image.new('RGB', (lato, lato), (24, 22, 30))
quad.paste(im, ((lato - im.width) // 2, (lato - im.height) // 2))
# le foto dell'app sono 104x104 (e pesano 5-10 KB): le nuove devono stare nello stesso
# mondo, altrimenti l'app si gonfia di qualche megabyte
quad = quad.resize((160, 160), Image.LANCZOS)
quad = quad.quantize(colors=128, method=Image.MEDIANCUT)
quad.save(out, 'PNG', optimize=True)
print(out, os.path.getsize(out))
`;

const righe = [];
const scritte = [];
for (const file of trovati) {
  const nome = mappa[file];
  if (!nome) { console.log('  (senza nome, saltata) ' + file); continue; }
  const out = join(TMP, slug(nome) + '.png');
  try {
    const r = execFileSync('python', ['-c', PY, cartella, TMP, file, out], { encoding: 'utf8' });
    const [percorso, byte] = r.trim().split(/\s+/);
    scritte.push([nome, file, Math.round(byte / 1024)]);
    righe.push({ nome, id: 'ex-' + slug(nome), foto: 'img/esercizi/' + slug(nome) + '.png' });
  } catch (e) {
    console.log('  FALLITA ' + file + ': ' + String(e.message).slice(0, 120));
  }
}

console.log('');
console.log('--- le foto preparate ---');
for (const [nome, file, kb] of scritte) console.log('  ' + String(kb).padStart(4) + ' KB  ' + nome + '   (' + file + ')');
console.log('');
console.log('--- le righe del catalogo (da mettere in src/dati-iniziali.js) ---');
for (const r of righe) {
  console.log("  { id: '" + r.id + "', nome: '" + r.nome + "', gruppo: '" + r.nome
    + "', convenzione: C.CAVO, foto: '" + r.foto + "', tipo: 'standard' },");
}
console.log('');
console.log('Le foto sono in: ' + TMP);
console.log('Copia da img/esercizi con: Copy-Item "' + TMP + '\\*.png" "' + DEST + '\\"');
