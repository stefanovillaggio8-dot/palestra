import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/test/personaggio-svg.test.js';
const righe = readFileSync(P, 'utf8').split('\n');
let fatto = 0;
for (let i = 0; i < righe.length; i++) {
  if (righe[i].includes("con-foto") && righe[i].includes('assert.match')) {
    righe[i] = "    // e il codice dice che qui dentro c'e' il DISEGNO (22/10/2026): la foto della";
    righe[i + 1] = "    // classe aveva lo sfondo nero dentro l'immagine, e la testa restava nera.";
    if (righe[i + 2] !== undefined && righe[i + 2].includes('il codice deve dire')) {
      righe[i + 2] = "    assert.match(app, /personaggio-svg-profilo/,";
      righe[i + 3] = "    'il codice deve dire che qui dentro c\\'e il disegno');";
    }
    fatto++;
    break;
  }
}
if (!fatto) { console.log('NON TROVATO: l\'assert sulla foto'); process.exit(1); }
writeFileSync(P, righe.join('\n'), 'utf8');
console.log('ok: il test aggiornato');
