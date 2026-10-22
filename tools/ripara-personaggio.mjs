import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// 1. torna la FOTO (Ste: il personaggio vettoriale sembrava "un ologramma")
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');
  const V = `      // IL DISEGNO, NON LA FOTO (22/10/2026).
      //
      // La foto della classe e' una foto: ha lo sfondo nero dentro l'immagine, e
      // la testa del personaggio restava uno staccone nero. Il disegno e'
      // vettoriale, quindi la testa e' trasparente come tutto il resto.
      //
      // Il disegno cambia da solo con i premi sbloccati, come faceva la foto:
      // l'armatura che hai vinto si vede.
      grafica.appendChild(el('div', {
        class: 'personaggio-ritratto personaggio-svg-profilo',
        html: personaggioSvg({ classe: classeId, sbloccati: idsIndossati }),
      }));`;
  const N = `      // LA FOTO DEL PERSONAGGIO (22/10/2026).
      //
      // Prima l'avevo sostituita con il disegno vettoriale, perche' la foto ha
      // lo sfondo nero dentro l'immagine e la testa restava uno staccone nero.
      // Ma Ste: "si e' rotto il personaggio rpg, e' come era agli inizi tipo un
      // ologramma": il disegno e' la versione vecchia, e la foto e' meglio.
      //
      // Il nero si toglie senza ritoccare l'immagine: con "mix-blend-mode: screen"
      // il nero diventa trasparente e la parte luminosa resta com'e'.
      grafica.classList.add('con-foto');
      grafica.appendChild(el('img', {
        class: 'personaggio-ritratto',
        src: percorsoStato(classeId, viso.indice),
        alt: \`\${rpg.classe.nome}: \${viso.stato.riga}\`,
        loading: 'lazy',
        decoding: 'async',
      }));`;
  if (!s.includes(V)) { console.log('NON TROVATO: il disegno del personaggio'); process.exit(1); }
  s = s.replace(V, N);
  writeFileSync(P, s, 'utf8');
  console.log('ok: torna la foto del personaggio');
}

// 2. il css: il nero sparisce con "screen"
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  s = s.replace(/\/\* IL PERSONAGGIO DEL PROFILO \(22\/10\/2026\)[\s\S]*?\.personaggio-svg-profilo svg \{[^}]*\}\n/,
    "/* IL PERSONAGGIO DEL PROFILO (22/10/2026): la foto col nero trasparente.\n"
    + " *\n"
    + " * Con \"mix-blend-mode: screen\" il nero dello sfondo sparisce (diventa\n"
    + " * trasparente) e la parte luminosa del personaggio resta com'e'. Cosi' la\n"
    + " * testa non e' piu' uno staccone nero e il personaggio resta quello vero.\n"
    + " */\n"
    + ".personaggio-ritratto { mix-blend-mode: screen; }\n");
  writeFileSync(P, s, 'utf8');
  console.log('ok: il css del personaggio');
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
