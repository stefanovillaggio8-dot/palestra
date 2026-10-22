import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'stile.css';
let s = readFileSync(P, 'utf8');

// 1. la luminosita' torna a 1.04 (il progetto vieta di alzarla: e' stata la nebbia)
s = s.replace(/filter: contrast\(1\.04\) saturate\(1\.02\) brightness\(1\.5\);/,
  'filter: contrast(1.04) saturate(1.02) brightness(1.04);');

// 2. la LUCE SULLA TESTA: non schiarisce la foto (il progetto non vuole), mette
//    una luce morbida sopra l'elmo, cosi' si vede che e' metallo e non un buco.
if (!s.includes('LA LUCE SULLA TESTA')) {
  const blocco = `
/* ===================== LA LUCE SULLA TESTA (22/10/2026) =====================
 *
 * Ste: "la testa e' ancora nera".
 *
 * Il personaggio e' una FOTO e l'elmo (o il cappuccio) e' metallo scuro: a
 * quella dimensione, sullo sfondo scuro, sembra uno staccone nero.
 *
 * Non si schiarisce la foto (il progetto vieta di alzare la luminosita': e' stata
 * la nebbia di una volta) e non si ritoccano le immagini (le ha disegnate un
 * illustratore). Quindi si mette una LUCE morbida sopra la testa: l'elmo si
 * vede come metallo illuminato, e la foto resta quella.
 */
.personaggio-scena-grafica.con-foto::after {
  content: '';
  position: absolute;
  left: 50%; top: 3%;
  width: 30%; height: 20%;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center,
    rgba(255, 238, 205, .30) 0%,
    rgba(255, 238, 205, .12) 45%,
    rgba(255, 238, 205, 0) 72%);
  pointer-events: none;
  z-index: 2;
}
`;
  const riduci = s.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
  s = s.slice(0, riduci) + blocco + s.slice(riduci);
  writeFileSync(P, s, 'utf8');
  console.log('ok: la luce sulla testa');
}
