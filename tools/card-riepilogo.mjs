import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// ---------------------------------------------------------------- la card compatta
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');
  if (s.includes('function cardRiepilogoMio')) { console.log('la card c\'e\' gia\''); }
  else {
    const V = "/* ===================== vista: progressi ===================== */";
    const N = `/* ===================== la card "quanto sei migliorato" =====================
 *
 * Ste (22/10/2026): "ordina tutta la pagina dei progressi (e anche del profilo e
 * impostazioni), e' troppo incasinata e troppo lunga e metti che segna che
 * esercizi hai migliorato, in quale sei peggiorato ecc.. come nella foto".
 *
 * Nella foto: tre riquadri con il numero (migliorati, invariati, peggiorati) e
 * sotto la frase che spiega il verdetto. Nient'altro, tutto stretto.
 *
 * La stessa card va in cima alla pagina dei Progressi, del Profilo e delle
 * Impostazioni: e' il riepilogo che si guarda per primo.
 */

/** Gli esercizi che ho fatto, con tutto il loro storico. */
function vociEserciziMie() {
  const mie = serieDellaPersona() || [];
  const ids = [...new Set(mie.filter((x) => x && !x.eliminata).map((x) => x.esercizio_id))];
  return ids.map((id) => {
    const punti = storicoDi(id);
    const ultima = punti.length ? punti[punti.length - 1] : null;
    return {
      nome: (esercizioPerId(id) || {}).nome || id,
      esercizio: esercizioPerId(id),
      punti,
      prevista: pesoPrevistoPerSessione(id, ultima && ultima.seduta),
    };
  });
}

/** I tre riquadri: quanti esercizi sono andati avanti, quanti fermi, quanti indietro. */
function cardRiepilogoMio() {
  const generale = riepilogoGenerale(vociEserciziMie());
  if (!generale || !generale.analizzati) return null;
  const card = el('div', { class: 'card-riepilogo' });
  card.appendChild(el('p', { class: 'titolo-riepilogo', testo: 'In generale, quanto sei migliorato' }));
  const quadro = (numero, parola, colore) => el('div', { class: 'quadro-riepilogo ' + colore }, [
    el('strong', { class: 'numero-riepilogo', testo: String(numero) }),
    el('span', { class: 'parola-riepilogo', testo: parola }),
  ]);
  card.appendChild(el('div', { class: 'tre-riquadri' }, [
    quadro(generale.migliorati, 'MIGLIORATI', 'verde'),
    quadro(generale.fermi, 'INVARIATI', 'neutro'),
    quadro(generale.indietro, 'PEGGIORATI', 'rosso'),
  ]));
  if (generale.linee && generale.linee.length) {
    card.appendChild(el('p', { class: 'nota nota-piccola', testo: generale.linee[0] }));
  }
  return card;
}

/* ===================== vista: progressi ===================== */`;
    if (!s.includes(V)) { console.log('NON TROVATO: la vista progressi'); process.exit(1); }
    s = s.replace(V, N);
    console.log('ok: la funzione della card');
  }

  // in cima alla pagina dei progressi
  const V2 = "function vistaProgressi(zona) {\n  zona.appendChild(el('h1', { testo: 'Progressi' }));";
  const N2 = "function vistaProgressi(zona) {\n  zona.appendChild(el('h1', { testo: 'Progressi' }));\n"
    + "  // LA CARD COMPATTA PRIMA DI TUTTO (22/10/2026): e' il riepilogo che si\n"
    + "  // guarda per primo, e sta in alto anche nel Profilo e nelle Impostazioni.\n"
    + "  const cardRiepilogo = cardRiepilogoMio();\n"
    + "  if (cardRiepilogo) zona.appendChild(cardRiepilogo);";
  if (s.includes(V2)) { s = s.replace(V2, N2); console.log('ok: la card in cima ai Progressi'); }
  else console.log('NON TROVATO: l\'inizio della vista progressi');

  // in cima al profilo
  const V3 = "  const testa = el('div', { class: 'testa-profilo' }, [";
  const N3 = "  // LA CARD COMPATTA ANCHE QUI (22/10/2026): la stessa del Profilo.\n"
    + "  const cardRiepilogo = cardRiepilogoMio();\n"
    + "  if (cardRiepilogo) zona.appendChild(cardRiepilogo);\n"
    + "  const testa = el('div', { class: 'testa-profilo' }, [";
  if (s.includes(V3)) { s = s.replace(V3, N3); console.log('ok: la card in cima al Profilo'); }
  else console.log('NON TROVATO: la testa del profilo');

  writeFileSync(P, s, 'utf8');
}

// ---------------------------------------------------------------- il css
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  if (s.includes('.card-riepilogo')) { console.log('il css c\'e\' gia\''); }
  else {
    const blocco = `
/* ===================== LA CARD "QUANTO SEI MIGLIORATO" (22/10/2026) =============
 *
 * Ste ha mandato la foto: tre riquadri con il numero e sotto la parola, e poi
 * la frase con il verdetto. Stretto, e leggibile in un colpo d'occhio.
 */
.card-riepilogo {
  background: var(--card); border: 1px solid var(--bordo);
  border-radius: var(--r); padding: 12px; margin: 0 0 14px;
}
.titolo-riepilogo { font-weight: 800; font-size: .95rem; margin: 0 0 10px; }
.tre-riquadri { display: flex; gap: 8px; }
.quadro-riepilogo {
  flex: 1; text-align: center; border: 1px solid var(--bordo);
  border-radius: 10px; padding: 10px 4px; background: rgba(255, 255, 255, .03);
}
.numero-riepilogo { display: block; font-size: 1.5rem; line-height: 1.1; }
.parola-riepilogo { display: block; font-size: .58rem; font-weight: 800; letter-spacing: .06em; opacity: .85; }
.quadro-riepilogo.verde { border-color: #1f6b3f; color: #35d07f; }
.quadro-riepilogo.rosso { border-color: #6b2430; color: #ff6b7a; }
.quadro-riepilogo.neutro { color: var(--testo-2); }
`;
    const riduci = s.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
    s = s.slice(0, riduci) + blocco + s.slice(riduci);
    writeFileSync(P, s, 'utf8');
    console.log('ok: il css della card');
  }
}

// ---------------------------------------------------------------- dove sono le impostazioni
{
  const s = readFileSync(B + 'src/app.js', 'utf8');
  const m = [...s.matchAll(/function (vista[A-Za-z]*Impostazioni|vistaImpostazioni|sezioneImpostazioni)\w*\(/g)];
  console.log('le impostazioni: ' + (m.length ? m.map((x) => x[1]).join(', ') : 'non trovo una vista dedicata'));
  const dentro = s.match(/impostazioni/gi);
  console.log('parole "impostazioni" nel file: ' + (dentro ? dentro.length : 0));
}
