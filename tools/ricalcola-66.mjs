import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const { profiloEsercizio, profiloPerPesoCorporeo } = await import('../src/rank-config.js');
const { ESERCIZI } = await import('../src/dati-iniziali.js');

// Il peso di Ste: 66 kg (il file dei test usa PESO_STE = 66).
const PESO_STE = 66;
const perId = new Map(ESERCIZI.map((e) => [e.id, e]));

const P = B + 'test/scala-auto.test.js';
let s = readFileSync(P, 'utf8');
let n = 0;
s = s.replace(/'(ex-[a-z0-9-]+)':\s*([0-9.]+),/g, (m, id, vecchio) => {
  const e = perId.get(id);
  if (!e) return m;
  const nuovo = profiloPerPesoCorporeo(profiloEsercizio(e), PESO_STE).riferimento;
  if (nuovo === null || nuovo === undefined) return m;
  const valore = Math.round(Number(nuovo) * 100) / 100;
  if (String(valore) === String(vecchio)) return m;
  n++;
  return "'" + id + "': " + valore + ',';
});
writeFileSync(P, s, 'utf8');
console.log('riferimenti ricalcolati a 66 kg: ' + n);
