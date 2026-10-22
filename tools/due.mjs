import { readFileSync } from 'node:fs';
const s = readFileSync('C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js', 'utf8');
let pos = -1;
const posti = [];
while ((pos = s.indexOf('id=\\"trapezius_upper_r\\"', pos + 1)) !== -1) posti.push(pos);
for (const p of posti) {
  const inizio = s.lastIndexOf('<path', p);
  console.log('pos ' + p + ' -> ' + JSON.stringify(s.slice(inizio, inizio + 90)));
}
