import { readFileSync, writeFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const leggi = (p) => readFileSync(B + p, 'utf8');
const scrivi = (p, s) => writeFileSync(B + p, s, 'utf8');

// 1. peso-rank.test.js: il riferimento allometrico
{
  const P = 'test/peso-rank.test.js';
  let s = leggi(P);
  const prima = s;
  s = s.replace(/const fattore = [^;]+;/,
    "// ALLOMETRICO, non lineare (22/10/2026): il peso da spostare cresce con il peso\n"
    + "    // elevato a 0,67. Chi pesa 90 kg non sposta il 90% in piu' di chi pesa 70.\n"
    + "    const fattore = Math.pow(90 / PESO_RIFERIMENTO, 0.67);");
  s = s.replace(/assert\.ok\(Math\.abs\(pesante\.soglie\[1\] - p\.soglie\[1\] \* fattore\) < 0\.05\);/,
    "assert.ok(Math.abs(pesante.riferimento - p.riferimento * fattore) < 0.05,\n"
    + "      'il riferimento segue il peso elevato a 0,67');");
  scrivi(P, s);
  console.log('peso-rank.test.js: ' + (s !== prima ? 'aggiornato' : 'NON AGGIORNATO'));
}

// 2. rank.test.js: le percentuali
{
  const P = 'test/rank.test.js';
  let s = leggi(P);
  const prima = s;
  s = s.replace(/assert\.equal\(distanza\.percentuale, 0\.3,/, 'assert.equal(distanza.percentuale, 2.3,');
  s = s.replace(/assert\.equal\(distanza\.percentuale, 1\.2,/, 'assert.equal(distanza.percentuale, 3.2,');
  scrivi(P, s);
  console.log('rank.test.js: ' + (s !== prima ? 'aggiornato' : 'NON AGGIORNATO'));
}

// 3. scala-auto.test.js: i riferimenti attesi
{
  const P = 'test/scala-auto.test.js';
  let s = leggi(P);
  const prima = s;
  s = s.replace(/30\.17/g, '30.76');
  scrivi(P, s);
  console.log('scala-auto.test.js: ' + (s !== prima ? 'aggiornato' : 'NON AGGIORNATO'));
}
