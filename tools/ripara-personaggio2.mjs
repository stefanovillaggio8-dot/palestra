import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// 1. torna la FOTO del personaggio RPG (Ste: il disegno vettoriale sembrava
//    "un ologramma", la foto e' il personaggio vero)
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');

  const re = /grafica\.appendChild\(el\('div', \{\s*class: 'personaggio-ritratto personaggio-svg-profilo',[\s\S]*?\}\)\);/;
  if (!re.test(s)) { console.log('NON TROVATO: il disegno del personaggio'); process.exit(1); }
  const img = "grafica.appendChild(el('img', {\n"
    + "        class: 'personaggio-ritratto',\n"
    + "        src: percorsoStato(classeId, viso.indice),\n"
    + "        alt: `${rpg.classe.nome}: ${viso.stato.riga}`,\n"
    + "        loading: 'lazy',\n"
    + "        decoding: 'async',\n"
    + "      }));";
  s = s.replace(re, img);

  // la classe "con-foto" (il riquadro della foto) torna al suo posto
  s = s.replace("    // (niente 'con-foto': ora il personaggio e' il disegno, non la foto)",
    "    grafica.classList.add('con-foto');");
  writeFileSync(P, s, 'utf8');
  console.log('ok: torna la foto del personaggio rpg');
}

// 2. il css del disegno sparisce
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  s = s.replace(/\/\* IL PERSONAGGIO DEL PROFILO \(22\/10\/2026\)[\s\S]*?\.personaggio-svg-profilo svg \{[^}]*\}\n/g, '');
  writeFileSync(P, s, 'utf8');
  console.log('ok: il css del disegno tolto');
}

// 3. il test torna a chiedere la foto
{
  const P = B + 'test/personaggio-svg.test.js';
  let s = readFileSync(P, 'utf8');
  s = s.replace(
    "    assert.match(app, /personaggio-svg-profilo/,\n      'il codice deve dire che qui dentro c\\'e il disegno');",
    "    assert.match(app, /classList\\.add\\('con-foto'\\)/,\n      'il codice deve dire che qui dentro c\\'e una foto');");
  writeFileSync(P, s, 'utf8');
  console.log('ok: il test aggiornato');
}
