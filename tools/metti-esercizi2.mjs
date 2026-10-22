import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'C:/Users/stefa/Documents/Default Project/palestra';
const dirIcone = process.argv[2];   // la cartella delle icone
const elencoFile = process.argv[3];

const elenco = JSON.parse(readFileSync(elencoFile, 'utf8').replace(/^\uFEFF/, ''));
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const CAT = BASE + '/src/dati-iniziali.js';
let src = readFileSync(CAT, 'utf8');

const nuove = [];
for (const e of elenco) {
  const s = slug(e.nome);
  if (!existsSync(join(dirIcone, e.icona))) { console.log('manca l\'icona: ' + e.icona); continue; }
  copyFileSync(join(dirIcone, e.icona), BASE + '/img/esercizi/' + s + '.png');

  if (src.includes("nome: '" + e.nome + "'")) {
    // l'esercizio c'era gia': gli cambio la foto (e la convenzione, se diversa)
    const riga = new RegExp("(\\{ id: '[^']+', nome: '" + e.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'[^\\n]*?convenzione: )C\\.\\w+", 'g');
    src = src.replace(riga, '$1' + e.convenzione);
    const foto = new RegExp("(nome: '" + e.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'[^\\n]*?foto: ')[^']*(')", 'g');
    src = src.replace(foto, '$1img/esercizi/' + s + ".png$2");
    console.log('aggiornato: ' + e.nome);
    continue;
  }
  const carrucola = e.carrucola ? ', carrucola: ' + e.carrucola : '';
  nuove.push("  { id: 'ex-" + s + "', nome: '" + e.nome.replace(/'/g, "\\'") + "', gruppo: '"
    + e.nome.replace(/'/g, "\\'") + "', convenzione: " + e.convenzione + carrucola
    + ", foto: 'img/esercizi/" + s + ".png', tipo: 'standard' },");
  console.log('aggiunto: ' + e.nome);
}

const inizio = src.indexOf('export const ESERCIZI');
const fine = src.indexOf('\n];', inizio);
writeFileSync(CAT, src.slice(0, fine) + '\n' + nuove.join('\n') + src.slice(fine), 'utf8');
console.log('aggiunte ' + nuove.length + ' righe al catalogo');
