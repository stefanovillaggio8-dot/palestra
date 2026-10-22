import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/muscoli-parti.js';
const righe = readFileSync(P, 'utf8').split('\n');
for (let i = 0; i < righe.length; i++) {
  if (/nota: .*bassa schiena/.test(righe[i])) {
    righe[i] = "    nota: 'La bassa schiena, cioè i muscoli che stanno lungo la colonna (l’erector spinae). Nell’iperextensione lavorano insieme ai glutei, ma più piano: per questo si vedono meno chiari. Se ti fa male la schiena, questo esercizio non è per te.',";
  }
}
writeFileSync(P, righe.join('\n'), 'utf8');
console.log('ok: la nota dei lombari riscritta');
