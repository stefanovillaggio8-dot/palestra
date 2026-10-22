import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// 1. le icone del menu dentro un <svg> (il disegno era solo il path)
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');
  const V = "    el('span', { class: 'icona-menu', html: ICONE_MENU[chiaveIcona(percorso)] || '' }),";
  const N = "    el('span', {\n"
    + "      class: 'icona-menu',\n"
    + "      html: ICONE_MENU[chiaveIcona(percorso)]\n"
    + "        ? '<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">' + ICONE_MENU[chiaveIcona(percorso)] + '</svg>'\n"
    + "        : '',\n"
    + "    }),";
  if (!s.includes(V)) { console.log('NON TROVATO: la icona-menu'); process.exit(1); }
  s = s.replace(V, N);
  writeFileSync(P, s, 'utf8');
  console.log('ok: le icone sono dentro un svg');
}

// 2. il CSS
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  if (s.includes('.icona-menu')) { console.log('il css c\'e\' gia\''); process.exit(0); }
  const blocco = `

/* ===================== LE ICONE DEL MENU (22/10/2026) =====================
 *
 * Ste ha mandato la foto della barra che vuole: ogni voce ha la sua icona
 * SOPRA la parola. Le icone sono linee disegnate in css (currentColor), quindi
 * la voce attiva si accende tutta e non c'e' nessun file da caricare.
 */
.voce-menu {
  flex-direction: column; align-items: center; gap: 2px;
  padding: 7px 2px 9px;
}
.icona-menu { display: block; width: 23px; height: 23px; }
.icona-menu svg { display: block; width: 100%; height: 100%; }
.icona-menu path {
  fill: none; stroke: currentColor; stroke-width: 1.7;
  stroke-linecap: round; stroke-linejoin: round;
}
.voce-menu.attiva .icona-menu path { stroke-width: 2.1; }
.parola-menu { display: block; font-size: .72rem; line-height: 1.1; }

/* ===================== LA BARRA IN FONDO (22/10/2026) =====================
 *
 * Ste: "per terminare l'allenamento metti solo questo quando scorri verso il
 * basso cosi' da occupare meno spazio". Nella foto che ha mandato il bottone
 * e' una barra stretta in fondo, con il cronometro e il contatore delle serie
 * a sinistra e il bottone rosso a destra.
 */
.barra-fine {
  position: sticky; bottom: 0; z-index: 6;
  display: flex; align-items: center; gap: 10px;
  margin-top: 14px; padding: 9px 10px;
  background: rgba(11, 9, 16, .95);
  border-top: 1px solid var(--bordo);
  backdrop-filter: blur(10px);
}
.barra-fine-contatori { display: flex; align-items: center; gap: 8px; }
.barra-fine-crono { font-weight: 800; font-size: 1.05rem; }
.barra-fine-serie {
  background: #1f9d55; color: #04150b; border-radius: 999px;
  padding: 2px 9px; font-weight: 800; font-size: .8rem;
}
.barra-fine .pericolo { margin-left: auto; padding: 10px 16px; font-size: .9rem; }
.barra-fine .pericolo.grande { font-size: 1.1rem; padding: 14px 22px; }
`;
  s = s + blocco;
  writeFileSync(P, s, 'utf8');
  console.log('ok: il css delle icone e della barra in fondo');
}
