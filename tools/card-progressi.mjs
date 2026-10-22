import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// ---------------------------------------------------------------- 1. la card in cima ai Progressi
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');

  // la creazione del riquadro generale, PRIMA di tutto il resto
  const V = "function vistaProgressi(zona) {\n  zona.appendChild(el('h1', { testo: 'Progressi' }));";
  const N = "function vistaProgressi(zona) {\n  zona.appendChild(el('h1', { testo: 'Progressi' }));\n"
    + "\n  // LA CARD COMPATTA PRIMA DI TUTTO (22/10/2026):\n"
    + "  //\n"
    + "  // Ste ha mandato la foto: in alto, tre riquadri con il numero (migliorati,\n"
    + "  // invariati, peggiorati) e sotto la frase con il verdetto. Tutto il resto della\n"
    + "  // pagina viene dopo, e ripiegato dentro sezioni chiuse: la pagina era troppo\n"
    + "  // lunga e troppo incasinata.\n"
    + "  const boxGenerale = el('div', { class: 'spiegazione generale box-riepilogo' });\n"
    + "  const spazioGenerale = el('div', { id: 'riepilogo-generale' });\n"
    + "  boxGenerale.appendChild(el('h3', { testo: 'In generale, quanto sei migliorato' }));\n"
    + "  boxGenerale.appendChild(spazioGenerale);\n"
    + "  zona.appendChild(boxGenerale);";
  if (!s.includes(V)) { console.log('NON TROVATO: l\'inizio di vistaProgressi'); process.exit(1); }
  s = s.replace(V, N);

  // e tolgo la creazione di troppo (ora sta piu' in alto)
  const V2 = `  // Il riquadro vecchio "In generale, quanto sei migliorato" duplicava la card
  // nuova (che sta in cima alla pagina, con i riquadri cliccabili). Ste (22/10/2026):
  // "la cosa dei progressi in quanti sono migliorato peggiorato e uguale non deve
  // spuntare anche nel profilo".
  // Quindi questo qui sotto si nasconde e resta solo la card.
  const boxGenerale = el('div', { class: 'spiegazione generale duplicato-nascosto' });
  boxGenerale.appendChild(el('h3', { testo: 'In generale, quanto sei migliorato' }));
  const spazioGenerale = el('div', { id: 'riepilogo-generale' });
  boxGenerale.appendChild(spazioGenerale);
  zona.appendChild(boxGenerale);
`;
  if (s.includes(V2)) {
    s = s.replace(V2, '');
    console.log('ok: tolta la creazione di troppo');
  } else {
    console.log('NON TROVATO: il riquadro vecchio (provo a rimuoverlo a mano)');
    const re = /\n  const boxGenerale = el\('div', \{ class: 'spiegazione generale duplicato-nascosto' \}\);[\s\S]*?zona\.appendChild\(boxGenerale\);\n/;
    if (re.test(s)) { s = s.replace(re, '\n'); console.log('ok: tolto (a mano)'); }
    else console.log('ANCORA NON TROVATO: il riquadro vecchio');
  }

  writeFileSync(P, s, 'utf8');
  console.log('ok: la card sta in cima ai Progressi');
}

// ---------------------------------------------------------------- 2. il css della card compatta
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  if (!s.includes('.box-riepilogo')) {
    const blocco = `
/* ===================== LA CARD "QUANTO SEI MIGLIORATO" (22/10/2026) =============
 *
 * Come nella foto di Ste: tre riquadri con il numero grande e la parola sotto,
 * e sotto la frase con il verdetto. Stretta, e leggibile in un colpo d'occhio.
 */
.box-riepilogo { padding: 10px 12px 12px; }
.box-riepilogo h3 { margin: 0 0 8px; font-size: .92rem; }
.box-riepilogo .tre-riquadri {
  display: flex; gap: 8px; margin: 0;
}
.box-riepilogo .quadro-riepilogo {
  flex: 1; text-align: center; border: 1px solid var(--bordo);
  border-radius: 10px; padding: 8px 4px; background: rgba(255, 255, 255, .03);
}
.box-riepilogo .numero-riepilogo { display: block; font-size: 1.6rem; line-height: 1.05; font-weight: 900; }
.box-riepilogo .parola-riepilogo {
  display: block; font-size: .56rem; font-weight: 800; letter-spacing: .06em; opacity: .85;
}
.box-riepilogo .quadro-riepilogo.verde { border-color: #1f6b3f; color: #35d07f; }
.box-riepilogo .quadro-riepilogo.rosso { border-color: #6b2430; color: #ff6b7a; }
.box-riepilogo .quadro-riepilogo.neutro { color: var(--testo-2); }
.box-riepilogo .dettaglio-riepilogo { margin-top: 8px; }
.box-riepilogo .dettaglio-riepilogo:empty { display: none; }
`;
    const riduci = s.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
    s = s.slice(0, riduci) + blocco + s.slice(riduci);
    writeFileSync(P, s, 'utf8');
    console.log('ok: il css della card compatta');
  }
}
