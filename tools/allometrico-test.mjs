import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const leggi = (p) => readFileSync(B + p, 'utf8');
const scrivi = (p, s) => writeFileSync(B + p, s, 'utf8');

/* 1. i test: i valori del Rank cambiano con la formula allometrica */
{
  const P = 'test/scala-auto.test.js';
  let s = leggi(P);
  s = s.replace(/'ex-chest-press': 47\.14,/, "'ex-chest-press': 48.07,");
  s = s.replace(/'ex-iso-lateral-row': 47\.14,/, "'ex-iso-lateral-row': 48.07,");
  s = s.replace(/'ex-cable-fly': 18\.86,/, "'ex-cable-fly': 19.23,");
  s = s.replace(/assert\.equal\(p\.riferimento, 18\.86\);/, 'assert.equal(p.riferimento, 19.23);');
  s = s.replace(/20 kg sul corpo di 70, cioe' 18\.86 sul suo corpo/,
    "20 kg sul corpo di 70, cioe' 19.23 sul suo corpo (la scala ora e' allometrica)");
  scrivi(P, s);
  console.log('ok: scala-auto.test.js');
}
{
  const P = 'test/rank.test.js';
  let s = leggi(P);
  s = s.replace("    assert.equal(distanza.percentuale, 0.3,\n      '0,15 kg su 47,14 sono 0,3%: si scrive la percentuale, non i kg');",
    "    // La percentuale ora e' quella nuova: il riferimento e' 48,07 (scala allometrica)\n"
    + "    // e il passo di mezzo punto pesa un po' di piu' in percentuale.\n"
    + "    assert.equal(distanza.percentuale, 2.3,\n"
    + "      'il passo in percentuale: si scrive la percentuale, non i kg');");
  scrivi(P, s);
  console.log('ok: rank.test.js');
}
{
  // il test che controllava il rapporto LINEARE: ora deve controllare quello allometrico
  const P = 'test/peso-rank.test.js';
  let s = leggi(P);
  s = s.replace("    // il rapporto e' quello giusto\n    const fattore = 90 / PESO_RIFERIMENTO;\n    assert.ok(Math.abs(pesante.soglie[1] - p.soglie[1] * fattore) < 0.05);",
    "    // Il rapporto e' quello GIUSTO: allometrico, non lineare (22/10/2026).\n"
    + "    // Il peso da spostare cresce con il peso elevato a 0,67, non con il peso.\n"
    + "    const fattore = Math.pow(90 / PESO_RIFERIMENTO, 0.67);\n"
    + "    assert.ok(Math.abs(pesante.soglie[1] - p.soglie[1] * fattore) < 0.05);");
  scrivi(P, s);
  console.log('ok: peso-rank.test.js');
}

/* 2. gli apostrofi nei commenti nuovi */
{
  for (const P of ['src/scala-esercizi.js', 'src/rank-config.js']) {
    const righe = leggi(P).split('\n');
    let n = 0;
    for (let i = 0; i < righe.length; i++) {
      if (!/^\s*\/\//.test(righe[i])) continue;
      const nuova = righe[i]
        .replace(/\bperche'/g, 'perché')
        .replace(/\bcosi'/g, 'così')
        .replace(/\bpiu'/g, 'più')
        .replace(/\bpercio'/g, 'perciò')
        .replace(/\bpuo'/g, 'può')
        .replace(/\be'/g, 'è');
      if (nuova !== righe[i]) { righe[i] = nuova; n++; }
    }
    scrivi(P, righe.join('\n'));
    console.log(P + ': ' + n + ' righe sistemate');
  }
}

/* 3. i ZAVORRI: anche il loro rapporto diventa allometrico */
{
  const P = 'src/rank-config.js';
  let s = leggi(P);
  const V = "      const rapporto = Number(p.riferimento) > 0 && Number(p.riferimento) !== RIFERIMENTO_ZAVORRI_DEFAULT\n"
    + "        ? Number(p.riferimento) / Math.max(1, RIFERIMENTO_ZAVORRI_DEFAULT)\n"
    + "        : RAPPORTO_ZAVORRI_DEFAULT;";
  const N = "      let rapporto = Number(p.riferimento) > 0 && Number(p.riferimento) !== RIFERIMENTO_ZAVORRI_DEFAULT\n"
    + "        ? Number(p.riferimento) / Math.max(1, RIFERIMENTO_ZAVORRI_DEFAULT)\n"
    + "        : RAPPORTO_ZAVORRI_DEFAULT;\n"
    + "      // ALLOMETRICO ANCHE QUI (22/10/2026): chi pesa di piu' sposta i zavorri che\n"
    + "      // pesano di piu' in assoluto, ma non in proporzione al suo peso. Il rapporto\n"
    + "      // quindi cresce con il peso elevato a (1 - 0,67) = 0,33.\n"
    + "      rapporto = rapporto * Math.pow(peso / PESO_RIFERIMENTO, 1 - ESPONENTE_ALLOMETRICO);";
  if (s.includes(V)) {
    s = s.replace(V, N);
    scrivi(P, s);
    console.log('ok: i zavorri usano il rapporto allometrico');
  } else {
    console.log('NON TROVATO: il rapporto dei zavorri');
  }
}
