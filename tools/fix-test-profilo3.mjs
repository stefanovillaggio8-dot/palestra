import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/test/personaggio-svg.test.js';
const righe = readFileSync(P, 'utf8').split('\n');
const fuori = [];
for (let i = 0; i < righe.length; i++) {
  const r = righe[i];
  if (r.includes('assert.match(app, /classList') && r.includes('con-foto')) {
    fuori.push("    assert.match(app, /personaggio-svg-profilo/,");
    // la riga dopo e' il messaggio: lo riscrivo
    if (righe[i + 1] !== undefined && righe[i + 1].includes('il codice deve dire')) {
      fuori.push("      'il codice deve dire che qui dentro c\\'e il disegno');");
      i++;
    }
    continue;
  }
  if (r.trim() === '// e il codice mette la classe') {
    fuori.push("    // e il codice dice che qui dentro c'e' il DISEGNO (22/10/2026): la foto");
    continue;
  }
  if (r.trim().startsWith('// classe aveva lo sfondo nero')) {
    fuori.push("    // della classe aveva lo sfondo nero dentro l'immagine: la testa restava nera.");
    continue;
  }
  fuori.push(r);
}
writeFileSync(P, fuori.join('\n'), 'utf8');
console.log('ok: il test sul personaggio aggiornato');
