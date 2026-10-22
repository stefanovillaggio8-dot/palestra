import { readFileSync, writeFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

/* 1. l'animazione del contenuto ripartiva a ogni salvataggio.
 *    Ora parte SOLO quando cambia la schermata (classe "cascata"). */
{
  const P = B + 'stile-rpg.css';
  let s = readFileSync(P, 'utf8');
  const V = '  animation: copia-ingresso .38s cubic-bezier(.2, .75, .25, 1) both;';
  const N = '  /* Solo quando cambia la schermata (22/10/2026): prima l\'animazione ripartiva\n'
    + '   * a ogni salvataggio, e sembrava che l\'app si impiantasse. La classe\n'
    + '   * "cascata" la mette app.js quando cambia la rotta. */\n'
    + '  animation: none;\n'
    + '  #contenuto.cascata { animation: copia-ingresso .38s cubic-bezier(.2, .75, .25, 1) both; }';
  if (s.includes(V)) {
    s = s.replace(V, N);
    writeFileSync(P, s, 'utf8');
    console.log('ok: l\'animazione del contenuto parte solo cambiando schermata');
  } else {
    console.log('NON TROVATO: l\'animazione del contenuto');
  }
}

/* 2. il test del personaggio: ora il profilo mostra la FOTO, non il disegno */
{
  const P = B + 'test/personaggio-svg.test.js';
  let s = readFileSync(P, 'utf8');
  const prima = s;
  s = s.replace(/assert\.match\(app, \/personaggio-svg-profilo\/,[\s\S]*?\);/,
    "assert.match(app, /classList\\.add\\('con-foto'\\)/,\n"
    + "      'il profilo mostra la foto del personaggio, non il disegno');");
  if (s !== prima) {
    writeFileSync(P, s, 'utf8');
    console.log('ok: il test del personaggio aggiornato');
  } else {
    console.log('NON AGGIORNATO: il test del personaggio');
  }
}
