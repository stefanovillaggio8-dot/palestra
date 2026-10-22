import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// 1. l'apostrofo dentro la stringa rompeva il file
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');
  s = s.replace("testo: 'Quanto stai sollevando in piu' del tuo corpo'",
    "testo: 'Quanto stai sollevando in più del tuo corpo'");
  // 2. la scheda resta com'era (Ste, 22/10/2026: "la mia scheda va bene così come è")
  s = s.replace("el('strong', { testo: 'Modifica la scheda' }),\n"
    + "          // La spiegazione come nella foto (22/10/2026): quale versione stai\n"
    + "          // modificando e cosa succede quando salvi.\n"
    + "          el('div', { class: 'nota', testo: `Stai modificando la versione numero ${(v && v.numero) || '?'}. Quando salvi, nasce una versione nuova: la scheda diventa la versione nuova e quella vecchia resta nel numero.` }),",
    "el('strong', { testo: 'Stai modificando la scheda' }),");
  writeFileSync(P, s, 'utf8');
  console.log('ok: apostrofo e scheda');
}

// 3. il css delle schede chiuse
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  if (!s.includes('.scheda-chiusa')) {
    const blocco = `
/* ===================== LE SCHEDE CHIUSE (22/10/2026) =====================
 *
 * La pagina dei Progressi era troppo lunga: i paragrafi lunghi stanno dentro
 * una scheda chiusa, il titolo si vede e il resto si apre con un tocco.
 */
.scheda-chiusa { margin: 4px 0 8px; }
.scheda-chiusa > summary {
  cursor: pointer; font-weight: 800; font-size: .88rem; padding: 8px 0;
  list-style: none; color: var(--testo-2);
}
.scheda-chiusa > summary::-webkit-details-marker { display: none; }
.scheda-chiusa > summary::before { content: '\\25B8  '; color: var(--viola); }
.scheda-chiusa[open] > summary::before { content: '\\25BE  '; }
.dentro-scheda { padding-top: 2px; }
.duplicato-nascosto { display: none; }
`;
    const riduci = s.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
    s = s.slice(0, riduci) + blocco + s.slice(riduci);
    writeFileSync(P, s, 'utf8');
    console.log('ok: il css delle schede chiuse');
  }
}
