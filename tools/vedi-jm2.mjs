import { readFileSync } from 'node:fs';

const src = readFileSync('C:/Users/stefa/Documents/Default Project/palestra/src/muscoli-parti.js', 'utf8');
const i = src.indexOf("id: 'estensione_gomito'");
const blocco = src.slice(i, i + 700);
console.log('il blocco contiene jm press:', /jm press/.test(blocco));
console.log(bloco.split('\n').slice(0, 6).map((r) => '   ' + r.trim().slice(0, 110)).join('\n'));
// la normalizzazione
const normalizza = (t) => String(t).toLowerCase()
  .replace(/[àáâ]/g, 'a').replace(/[èéê]/g, 'e').replace(/[ìíî]/g, 'i')
  .replace(/[òóô]/g, 'o').replace(/[ùúû]/g, 'u')
  .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
console.log('normale: "' + normalizza('JM Press') + '"');
const parola = normalizza('jm press');
console.log('conta:', (' ' + normalizza('JM Press') + ' ').split(parola).length - 1);
