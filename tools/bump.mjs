// ALZA LA VERSIONE DELLA APP, OVUNQUE.
//
// I tre numeri che devono stare insieme (e che, se non coincidono, fanno
// ricaricare l'app all'infinito):
//   1. window.PALESTRA_VERSIONE in index.html
//   2. il nome della cache in sw.js (palestra-vNNN)
//   3. i numeri dei fogli di stile e delle foto (?v=NNN) in TUTTI i file
//
// Ste (22/10/2026): "appena apro l'app in basso spunta c'e' la versione 248, ti
// aggiorno e mi si aggiorna all'infinito". Era proprio questo: index.html
// diceva 247 e il sw.js diceva 248.
//
// Uso:  node tools/bump.mjs 249

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const V = process.argv[2];
if (!V) { console.log('uso: node tools/bump.mjs NUMERO'); process.exit(1); }

function tutti(dir, fuori = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome === '.git') continue;
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) tutti(p, fuori);
    else if (/\.(html|js|css|webmanifest|json)$/.test(nome)) fuori.push(p);
  }
  return fuori;
}

let cambiati = 0;
for (const p of tutti(B)) {
  const prima = readFileSync(p, 'utf8');
  let s = prima;
  // il numero che dichiara la pagina
  s = s.replace(/window\.PALESTRA_VERSIONE\s*=\s*'\d+'/g, "window.PALESTRA_VERSIONE = '" + V + "'");
  // il nome della cache del service worker
  s = s.replace(/palestra-v\d+/g, 'palestra-v' + V);
  // i numeri dei fogli di stile e delle foto
  s = s.replace(/\?v=\d+/g, '?v=' + V);
  if (s !== prima) {
    writeFileSync(p, s, 'utf8');
    console.log('  aggiornato: ' + p.replace(B, ''));
    cambiati++;
  }
}
console.log(cambiati + ' file aggiornati alla versione ' + V);
