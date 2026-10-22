// metti-esercizi.mjs -- mette nel catalogo gli esercizi presi dagli screenshot di WhatsApp.
//
// Uso: node tools/metti-esercizi.mjs <cartella-icone> <elenco.json>
//
// L'elenco e' [{ nome, muscolo, icona }, ...]: per ogniuno, la foto viene ritagliata
// gia' (dal ritagliatore) e messa in img/esercizi, e la riga del catalogo viene
// aggiunta. Se l'esercizio c'e' gia', si cambia solo la foto.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'C:/Users/stefa/Documents/Default Project/palestra';
const dirIcone = process.argv[2];
const elencoFile = process.argv[3];

const elenco = JSON.parse(readFileSync(elencoFile, 'utf8').replace(/^\uFEFF/, ''));

const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const convenzione = (nome) => {
  const n = nome.toLowerCase();
  if (/\bcable\b|cross ?over|fly|pullover|pulldown|face pull|triceps pushdown|jm press/.test(n)) return 'C.CAVO';
  if (/dumbbell|hammer|ez bar|concentration|kettlebell/.test(n)) return 'C.PER_MANUBRIO';
  if (/barbell/.test(n)) return 'C.BILANCIERE';
  if (/smith|iso ?lateral|leg press|leg curl|leg extension|calf|chest press|chest supported|seated/.test(n)) return 'C.MACCHINA';
  if (/crunch|plank|push ?up|pushup|abs|leg raise|side|lying|dip/.test(n)) return 'C.CORPO_LIBERO';
  return 'C.ALTRO';
};

const CAT = BASE + '/src/dati-iniziali.js';
let src = readFileSync(CAT, 'utf8');

const foto = new Map();     // slug -> nome del file
const nuove = [];
for (const e of elenco) {
  const s = slug(e.nome);
  const dest = BASE + '/img/esercizi/' + s + '.png';
  if (!existsSync(join(dirIcone, e.icona))) { console.log('manca l\'icona: ' + e.icona + ' (' + e.nome + ')'); continue; }
  copyFileSync(join(dirIcone, e.icona), dest);
  foto.set(s, e.nome);
  // l'esercizio c'e' gia'? allora cambio solo la foto
  const dentro = src.includes("nome: '" + e.nome + "'");
  if (dentro) {
    const riga = new RegExp("(\\{ id: '[^']+', nome: '" + e.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'[^\\n]*?foto: ')[^']*(')", 'g');
    src = src.replace(riga, "$1img/esercizi/" + s + ".png$2");
    console.log('foto aggiornata: ' + e.nome);
    continue;
  }
  nuove.push("  { id: 'ex-" + s + "', nome: '" + e.nome.replace(/'/g, "\\'") + "', gruppo: '"
    + e.nome.replace(/'/g, "\\'") + "', convenzione: " + convenzione(e.nome)
    + ", foto: 'img/esercizi/" + s + ".png', tipo: 'standard' },");
  console.log('aggiunto: ' + e.nome);
}

// le righe nuove vanno dentro l'array ESERCIZI
const inizio = src.indexOf('export const ESERCIZI');
if (inizio < 0) { console.log('non trovo ESERCIZI'); process.exit(1); }
const fine = src.indexOf('\n];', inizio);
if (fine < 0) { console.log('non trovo la fine dell\'array'); process.exit(1); }
const nuovoSrc = src.slice(0, fine) + '\n' + nuove.join('\n') + src.slice(fine);
writeFileSync(CAT, nuovoSrc, 'utf8');
console.log('aggiunte ' + nuove.length + ' righe al catalogo');
