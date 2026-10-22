import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// ---------------------------------------------------------------- il CSS
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  if (s.includes('LE ANIMAZIONI (22/10/2026)')) { console.log('il css c\'e\' gia\''); }
  else {
    // come e' fatta la barra piena: se il riempino e' il ::after, animo quello
    const regola = s.match(/\.barra-piena \{[\s\S]{0,200}?\n\}/);
    const riempino = regola && /\.barra-piena::after/.test(s) ? '.barra-piena::after' : '.barra-piena';
    console.log('la barra che si riempie e\' ' + riempino);

    const blocco = `
/* ===================== LE ANIMAZIONI (22/10/2026) =====================
 *
 * Ste ha chiesto cinque cose:
 *   1. le sezioni entrano a cascata SOLO quando cambi schermata, non a ogni
 *      salvataggio (prima ripartivano ogni volta che la pagina si ridisegnava,
 *      e sembrava che l'app si impiantasse);
 *   2. la pillola del menu;
 *   3. le barre che si riempiono;
 *   4. la linea dei grafici che si disegna;
 *   5. una luce sul pulsante "Inizia allenamento".
 *
 * Tutte obbediscono all'impostazione "animazioni sempre/mai": sotto, la
 * regola finale le spegne tutte, come fa per il resto.
 */

/* 1. LE SEZIONI CHE ENTRANO A CASCATA.
 * La classe "cascata" viene messa e tolta dall'app solo quando cambia la
 * schermata, quindi un salvataggio NON rivede l'animazione. */
@keyframes sezione-entra {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}
#contenuto.cascata > * { animation: sezione-entra .42s cubic-bezier(.2, .85, .3, 1) both; }
#contenuto.cascata > *:nth-child(1) { animation-delay: .02s; }
#contenuto.cascata > *:nth-child(2) { animation-delay: .09s; }
#contenuto.cascata > *:nth-child(3) { animation-delay: .16s; }
#contenuto.cascata > *:nth-child(4) { animation-delay: .23s; }
#contenuto.cascata > *:nth-child(5) { animation-delay: .30s; }
#contenuto.cascata > *:nth-child(6) { animation-delay: .37s; }
#contenuto.cascata > *:nth-child(n+7) { animation-delay: .44s; }

/* 2. LA PILLOLA DEL MENU */
@keyframes pillola-menu {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: none; }
}
.menu-basso { animation: pillola-menu .5s cubic-bezier(.2, .9, .3, 1) both; }

/* 3. LE BARRE CHE SI RIEMPIONO */
@keyframes barra-piena {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
${riempino} {
  transform-origin: left center;
  animation: barra-piena .6s cubic-bezier(.25, .9, .3, 1) both;
}

/* 4. LA LINEA DEI GRAFICI CHE SI DISEGNA */
@keyframes linea-si-dispiega {
  from { stroke-dashoffset: var(--lunghezza-linea, 1200); }
  to { stroke-dashoffset: 0; }
}
.linea-grafico {
  stroke-dasharray: var(--lunghezza-linea, 1200);
  animation: linea-si-dispiega .9s cubic-bezier(.3, .8, .3, 1) both;
}

/* 5. LA LUCE SUL PULSANTE "INIZIA ALLENAMENTO" */
@keyframes pulsante-luce {
  0%, 100% { box-shadow: 0 0 0 0 rgba(124, 92, 255, 0); }
  50% { box-shadow: 0 0 22px 3px rgba(124, 92, 255, .55); }
}
.principale.grande { animation: pulsante-luce 2.8s ease-in-out infinite; }
`;

    // il blocco va PRIMA di "riduci animazioni" (l'ultima regola deve poter
    // spegnere tutto, e il test lo controlla)
    const riduci = s.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
    if (riduci < 0) { console.log('non trovo il blocco "riduci animazioni"'); process.exit(1); }
    s = s.slice(0, riduci) + blocco + s.slice(riduci);

    // e la regola che le spegne tutte
    const spegne = `
/* Tutte le animazioni di sopra si spengono con l'impostazione "mai". */
html.animazioni-mai #contenuto.cascata > *,
html.animazioni-mai .menu-basso,
html.animazioni-mai .linea-grafico,
html.animazioni-mai .principale.grande { animation: none; }
html.animazioni-mai .barra-piena,
html.animazioni-mai .barra-piena::after { animation: none; }
`;
    s = s + spegne;
    writeFileSync(P, s, 'utf8');
    console.log('ok: il css delle animazioni');
  }
}

// ---------------------------------------------------------------- l'app
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');
  if (s.includes("cascata'")) { console.log('l\'app c\'e\' gia\''); }
  else {
    const V = "    window.addEventListener('hashchange', () => disegna());";
    const N = `    window.addEventListener('hashchange', () => disegna());

    // LE SEZIONI CHE ENTRANO A CASCATA (22/10/2026).
    //
    // Ste: "le sezioni entrano a cascata solo quando cambi schermata, non a
    // ogni salvataggio". Prima l'animazione era sul contenuto e ripartiva ogni
    // volta che la pagina si ridisegnava, cioe' a ogni salvataggio: sembrava
    // che l'app si impiantasse invece di salvare.
    //
    // Qui la classe "cascata" viene messa SOLO quando cambia la rotta (l'URL),
    // e tolta quando l'animazione ha finito. Il ricalcolo di stile serve a far
    // ripartire l'animazione se si torna sulla stessa schermata.
    window.addEventListener('hashchange', () => {
      const c = document.getElementById('contenuto');
      if (!c) return;
      c.classList.remove('cascata');
      if (typeof c.offsetWidth === 'number') void c.offsetWidth;
      c.classList.add('cascata');
      setTimeout(() => c.classList.remove('cascata'), 1100);
    });`;
    if (!s.includes(V)) { console.log('NON TROVATO: l\'ascolto del hashchange'); process.exit(1); }
    s = s.replace(V, N);
    writeFileSync(P, s, 'utf8');
    console.log('ok: la cascata parte solo cambiando schermata');
  }
}
