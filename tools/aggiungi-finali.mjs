// aggiungi-finali.mjs -- mette nel catalogo i 7 esercizi che mancavano.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'C:/Users/stefa/Documents/Default Project/palestra';
const DIR = 'C:/Users/stefa/AppData/Local/Temp/opencode/iconetel3';

const nuovi = [
  { nome: 'Face Pull', muscolo: 'Rear Delt', icona: 'icona-024.png', convenzione: 'C.CAVO', carrucola: 'C.CARRUCOLA_DOPPIA' },
  { nome: 'Back Extension', muscolo: 'Lower Back', icona: 'icona-045.png', convenzione: 'C.CORPO_LIBERO' },
  { nome: 'Hip Extension', muscolo: 'Glutes', icona: 'icona-046.png', convenzione: 'C.CORPO_LIBERO' },
  { nome: 'Smith Machine Bench Press', muscolo: 'Upper Chest', icona: 'icona-041.png', convenzione: 'C.MACCHINA', attrezzatura: 'macchina_dischi' },
  { nome: 'Smith Machine Bent Over Row', muscolo: 'Upper Back', icona: 'icona-042.png', convenzione: 'C.MACCHINA' },
  { nome: 'Smith Machine Shrug', muscolo: 'Trapezius', icona: 'icona-044.png', convenzione: 'C.MACCHINA' },
  { nome: 'JM Press', muscolo: 'Triceps', icona: 'icona-034.png', convenzione: 'C.BILANCIERE' },
];

const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CAT = BASE + '/src/dati-iniziali.js';
let src = readFileSync(CAT, 'utf8');
const righe = [];
for (const e of nuovi) {
  const s = slug(e.nome);
  if (!existsSync(join(DIR, e.icona))) { console.log('manca l\'icona: ' + e.icona); continue; }
  copyFileSync(join(DIR, e.icona), BASE + '/img/esercizi/' + s + '.png');
  if (src.includes("nome: '" + e.nome + "'")) { console.log('gia\' c\'e\' (foto aggiornata): ' + e.nome); continue; }
  const carrucola = e.carrucola ? ', carrucola: ' + e.carrucola : '';
  const attrezzatura = e.attrezzatura ? ', attrezzatura: ' + e.attrezzatura : '';
  righe.push("  { id: 'ex-" + s + "', nome: '" + e.nome + "', gruppo: '" + e.nome + "', convenzione: "
    + e.convenzione + carrucola + attrezzatura + ", foto: 'img/esercizi/" + s + ".png', tipo: 'standard' },");
  console.log('aggiunto: ' + e.nome);
}
const inizio = src.indexOf('export const ESERCIZI');
const fine = src.indexOf('\n];', inizio);
writeFileSync(CAT, src.slice(0, fine) + '\n' + righe.join('\n') + src.slice(fine), 'utf8');
console.log('aggiunte ' + righe.length + ' righe');
