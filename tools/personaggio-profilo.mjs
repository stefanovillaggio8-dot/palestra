import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// LA TESTA NERA: il profilo mostrava la FOTO della classe (un WebP con lo
// sfondo nero dentro l'immagine). Ora mostra il DISEGNO del personaggio, che e'
// vettoriale e quindi trasparente come tutto il resto.
//
// Ste (22/10/2026): "l'immagine della sezione profilo ha la testa nera,
// rendila trasparente come il resto".
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');

  const V = `      grafica.appendChild(el('img', {
        class: 'personaggio-ritratto',
        src: percorsoStato(classeId, viso.indice),
        alt: \`\${rpg.classe.nome}: \${viso.stato.riga}\`,
        loading: 'lazy',
        decoding: 'async',
      }));`;
  const N = `      // IL DISEGNO, NON LA FOTO (22/10/2026).
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
  if (!s.includes(V)) { console.log('NON TROVATO: la foto del personaggio'); process.exit(1); }
  s = s.replace(V, N);

  // la classe "con-foto" era per la foto: col disegno non serve
  s = s.replace("    grafica.classList.add('con-foto');", "    // (niente 'con-foto': ora il personaggio e' il disegno, non la foto)");

  writeFileSync(P, s, 'utf8');
  console.log('ok: il profilo mostra il disegno (testa trasparente)');
}

// il css
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  if (!s.includes('.personaggio-svg-profilo')) {
    const blocco = `
/* IL PERSONAGGIO DEL PROFILO (22/10/2026): il disegno, non la foto. */
.personaggio-svg-profilo { display: block; width: 100%; background: transparent; }
.personaggio-svg-profilo svg { width: 100%; height: auto; display: block; }
`;
    const riduci = s.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
    s = s.slice(0, riduci) + blocco + s.slice(riduci);
    writeFileSync(P, s, 'utf8');
    console.log('ok: il css del personaggio del profilo');
  }
}
