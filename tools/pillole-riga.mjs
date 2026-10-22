import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// ------------------------------------------------- 1. la riga delle pillole in alto
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');
  const V = `function vistaCasa(zona) {
  const st = statoMio();
  const profilo = profiloAttivo();
  zona.appendChild(el('div', { class: 'riga-titoli' }, [`;
  const N = `// LA RIGA DELLE PILLOLE (22/10/2026).
//
// Ste ha mandato la foto: in alto, una riga sola con il cerchietto con le
// iniziali, la streak, l'Aura e il livello. "in alto invece inserisci anche
// queste che in questo modo e' piu' carino".
//
// Sono le stesse informazioni delle schede grandi che stanno piu' in basso
// (la streak, l'Aura e il livello), ma compatte: si vedono subito e non
// costringono a scorrere. Le icone sono emoji perche' sono le stesse che
// usa gia' l'app.
function rigaPillole(st, profilo) {
  const iniziali = String((profilo && profilo.username) || '??').slice(0, 2).toUpperCase();
  return el('div', { class: 'riga-pillole' }, [
    el('span', { class: 'pallone-classe', testo: iniziali }),
    el('span', { class: 'pillola pillola-streak', testo: '\\u{1F525} ' + st.fuoco.giorni }),
    el('span', { class: 'pillola pillola-aura', testo: '\\u2728 ' + formattaAura(st.aura) }),
    el('span', { class: 'pillola pillola-livello', testo: '\\u2B21 ' + st.livello.livello }),
  ]);
}

function vistaCasa(zona) {
  const st = statoMio();
  const profilo = profiloAttivo();
  zona.appendChild(rigaPillole(st, profilo));
  zona.appendChild(el('div', { class: 'riga-titoli' }, [`;
  if (!s.includes(V)) { console.log('NON TROVATO: vistaCasa'); process.exit(1); }
  s = s.replace(V, N);
  writeFileSync(P, s, 'utf8');
  console.log('ok: la riga delle pillole');
}

// ------------------------------------------------- 2. spotter/dropset/nota/elimina in una riga
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');
  const V = `  if (!serieCardio) {
    riga.appendChild(botSpotter);
    riga.appendChild(pulsanteDropset(serie, { perView }));
    riga.appendChild(badgeSpotter);
  }`;
  const N = `  if (!serieCardio) {
    // I QUATTRO PULSANTI IN UNA RIGA SOLA (22/10/2026).
    //
    // Ste: "spotter dropset nota ed elimina mettili tutti in una riga cosi' da
    // occupare meno spazio". Prima erano quattro figli della riga della serie,
    // e ognuno andava a capo: la riga occupava tre righe di schermo.
    //
    // Ora stanno in un contenitore solo, e il contenitore e' una riga: il
    // testo si accorcia se non ci sta (con la regola "flex-wrap: nowrap" e
    // i pulsanti che si restringono).
    const rigaBottoni = el('div', { class: 'riga-bottoni-serie' }, [
      botSpotter,
      pulsanteDropset(serie, { perView }),
      badgeSpotter,
    ]);
    riga.appendChild(rigaBottoni);
  }`;
  if (!s.includes(V)) { console.log('NON TROVATO: i pulsanti della serie'); process.exit(1); }
  s = s.replace(V, N);
  writeFileSync(P, s, 'utf8');
  console.log('ok: i quattro pulsanti in una riga');
}

// ------------------------------------------------- 3. il CSS
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  if (s.includes('LA RIGA DELLE PILLOLE (22/10/2026)')) { console.log('il css c\'e\' gia\''); }
  else {
    const blocco = `
/* ===================== LA RIGA DELLE PILLOLE (22/10/2026) ===================== */
.riga-pillole { display: flex; align-items: center; gap: 8px; margin: 8px 0 4px; flex-wrap: wrap; }
.pallone-classe {
  width: 38px; height: 38px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #ff9f1c, #ff6b00);
  color: #2a1500; font-weight: 900; font-size: .95rem; letter-spacing: .02em;
  box-shadow: 0 0 14px rgba(255, 138, 0, .45);
}
.pillola {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--bordo); border-radius: 999px;
  padding: 6px 12px; font-size: .78rem; font-weight: 800; letter-spacing: .03em;
  background: rgba(255, 255, 255, .04);
}
.pillola-streak { border-color: #4a3a1c; color: var(--arancio); }
.pillola-aura { border-color: #3a3a5c; color: var(--viola); }
.pillola-livello { border-color: #2c4a5c; color: var(--blu); }

/* ===================== I QUATTRO PULSANTI IN UNA RIGA (22/10/2026) ============= */
.riga-bottoni-serie {
  display: flex; align-items: center; gap: 6px;
  flex-wrap: nowrap; width: 100%; margin-top: 4px;
}
.riga-bottoni-serie .bot {
  padding: 5px 9px; min-height: 34px; font-size: .66rem; font-weight: 800;
  white-space: nowrap; flex: 0 0 auto;
}
.riga-bottoni-serie .badge-spotter { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;
    // va PRIMA di "riduci animazioni"
    const riduci = s.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
    if (riduci < 0) { console.log('non trovo "riduci animazioni"'); process.exit(1); }
    s = s.slice(0, riduci) + blocco + s.slice(riduci);

    // 4. LA BARRA IN BASSO PIU' TRASPARENTE (Ste, 22/10/2026)
    s = s.replace(
      '.menu-basso {\n     display: flex; gap: 4px;\n     background: rgba(11, 9, 16, 0.94);',
      '.menu-basso {\n     display: flex; gap: 4px;\n     background: rgba(11, 9, 16, 0.55);');
    writeFileSync(P, s, 'utf8');
    console.log('ok: il css delle pillole, della riga pulsanti e la barra trasparente');
  }
}
