import { readFileSync, writeFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const leggi = (p) => readFileSync(B + p, 'utf8');
const scrivi = (p, s) => writeFileSync(B + p, s, 'utf8');

// 1. il test del rapporto: meglio sul RIFERIMENTO (che non ha il tetto di
//    realismo addosso), cosi' il controllo dice davvero "la scala e' allometrica"
{
  const P = 'test/peso-rank.test.js';
  let s = leggi(P);
  s = s.replace(
    "    // il rapporto e' quello giusto\n    const fattore = 90 / PESO_RIFERIMENTO;\n    assert.ok(Math.abs(pesante.soglie[1] - p.soglie[1] * fattore) < 0.05);",
    "    // Il rapporto e' quello GIUSTO: allometrico, non lineare (22/10/2026).\n"
    + "    // Il peso da spostare cresce con il peso elevato a 0,67, non con il peso\n"
    + "    // se stesso: chi pesa 90 kg non sposta il 90% in piu' di chi pesa 70.\n"
    + "    const fattore = Math.pow(90 / PESO_RIFERIMENTO, 0.67);\n"
    + "    assert.ok(Math.abs(pesante.riferimento - p.riferimento * fattore) < 0.05,\n"
    + "      'il riferimento segue il peso elevato a 0,67');");
  scrivi(P, s);
  console.log('ok: peso-rank.test.js controlla il riferimento allometrico');
}

// 2. rank.test.js: la percentuale del passo
{
  const P = 'test/rank.test.js';
  let s = leggi(P);
  s = s.replace("    assert.equal(distanza.percentuale, 0.3,\n      '0,15 kg su 47,14 sono 0,3%: si scrive la percentuale, non i kg');",
    "    // La scala ora e' allometrica: il riferimento e' 48,07 e il passo in percentuale\n"
    + "    // e' 2,3. Quello che conta e' che sia una percentuale, non i kg.\n"
    + "    assert.equal(distanza.percentuale, 2.3,\n"
    + "      'si scrive la percentuale, non i kg');");
  s = s.replace("    assert.equal(distanza.percentuale, 1.2,", "    assert.equal(distanza.percentuale, 3.2,");
  scrivi(P, s);
  console.log('ok: rank.test.js');
}

// 3. scala-auto.test.js: la tabella dei riferimenti attesi
{
  const P = 'test/scala-auto.test.js';
  let s = leggi(P);
  s = s.replace(/30\.17/g, '30.76');
  scrivi(P, s);
  console.log('ok: scala-auto.test.js (30.17 -> 30.76)');
}
