import { readFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/muscoli-parti.js';
const righe = readFileSync(P, 'utf8').split('\n');
for (let i = 212; i < 224; i++) {
  console.log((i + 1) + ': ' + JSON.stringify(righe[i].slice(0, 150)));
}
