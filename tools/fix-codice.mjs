import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/muscoli-parti.js';
const righe = readFileSync(P, 'utf8').split('\n');
let sistemate = 0;
for (let i = 0; i < righe.length; i++) {
  // la riga che il fix-accenti ha rotto: gli manca la virgoletta di chiusura
  if (/\.replace\(\/\[èéê\]\/g, 'è\)/.test(righe[i])) {
    righe[i] = righe[i].replace(".replace(/[èéê]/g, 'è)", ".replace(/[èéê]/g, 'e')");
    sistemate++;
  }
}
writeFileSync(P, righe.join('\n'), 'utf8');
console.log('righe sistemate: ' + sistemate);
