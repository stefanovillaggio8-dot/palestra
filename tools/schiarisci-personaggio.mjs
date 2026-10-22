import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'stile.css';
let s = readFileSync(P, 'utf8');

if (s.includes('LA TESTA NON PIU\' NERA')) {
  console.log('il filtro c\'e\' gia\'');
} else {
  const blocco = `
/* ===================== LA TESTA NON PIU' NERA (22/10/2026) =====================
 *
 * Ste: "la testa e' ancora nera".
 *
 * Il personaggio e' una FOTO (18 immagini, disegnate da un illustratore), e
 * l'elmo - o il cappuccio - e' metallo scuro: a quella dimensione, sullo
 * sfondo scuro della pagina, sembra uno staccone nero.
 *
 * Le foto non le tocciamo (sono il lavoro del disegnatore e gli stati
 * dell'armatura devono restare coerenti), quindi la soluzione e' schiarire
 * l'immagine con un filtro: l'elmo si vede come metallo, e il personaggio si
 * vede meglio in generale.
 */
.personaggio-scena-grafica.con-foto .personaggio-ritratto {
  filter: brightness(1.5) saturate(1.08);
}
`;
  const riduci = s.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
  if (riduci < 0) { console.log('non trovo "riduci animazioni"'); process.exit(1); }
  s = s.slice(0, riduci) + blocco + s.slice(riduci);
  writeFileSync(P, s, 'utf8');
  console.log('ok: il filtro che schiarisce il personaggio');
}
