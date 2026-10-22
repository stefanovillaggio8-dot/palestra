import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const { profiloEsercizio, profiloPerPesoCorporeo, riferimentoPerEsercizio } =
  await import('../src/rank-config.js');
const { ESERCIZI } = await import('../src/dati-iniziali.js');
const PESO_STE = 70;

// I RIFERIMENTI NUOVI: li calcolo con il codice dell'app, cosi' la tabella
// dei test dice la verita' (la scala e' cambiata: ora e' allometrica).
const perId = new Map(ESERCIZI.map((e) => [e.id, e]));
const nuovi = new Map();
for (const e of ESERCIZI) {
  const p = profiloPerPesoCorporeo(profiloEsercizio(e), PESO_STE);
  nuovi.set(e.id, p.riferimento);
}

const P = B + 'test/scala-auto.test.js';
let s = readFileSync(P, 'utf8');
let n = 0;
s = s.replace(/'(ex-[a-z0-9-]+)':\s*([0-9.]+),/g, (m, id, vecchio) => {
  const nuovo = nuovi.get(id);
  if (nuovo === undefined || nuovo === null) return m;
  const valore = Math.round(Number(nuovo) * 100) / 100;
  if (String(valore) === String(vecchio)) return m;
  n++;
  return "'" + id + "': " + valore + ',';
});
writeFileSync(P, s, 'utf8');
console.log('riferimenti aggiornati nella tabella: ' + n);
