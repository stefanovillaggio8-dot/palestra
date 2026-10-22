import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'stile.css';
let s = readFileSync(P, 'utf8');

// 1. via il blocco che avevo aggiunto (era un blocco nuovo, e il progetto vuole
//    il filtro dentro la regola della foto, che gia' ha height: auto e contrasto)
s = s.replace(/\/\* ===================== LA TESTA NON PIU' NERA \(22\/10\/2026\) =====================[\s\S]*?\n\}\n/, '');

// 2. dentro la regola della foto: si schiarisce, ma il contrasto resta sotto 1.05
const re = /(\.personaggio-scena-grafica\.con-foto \.personaggio-ritratto \{[^}]*?filter:\s*)([^;}]+)(;)/;
const m = s.match(re);
if (!m) { console.log('NON TROVATO: la regola della foto'); process.exit(1); }
console.log('il filtro di prima: ' + m[2]);
let filtro = m[2];
if (!/brightness\(/.test(filtro)) {
  filtro = 'brightness(1.5) ' + filtro;
} else {
  filtro = filtro.replace(/brightness\([^)]*\)/, 'brightness(1.5)');
}
s = s.replace(re, m[1] + filtro + m[3]);

// 3. il commento che spiega il perche'
const ancora = '.personaggio-scena-grafica.con-foto .personaggio-ritratto {';
const i = s.indexOf(ancora);
const spiegazione = "/* LA TESTA NON PIU' NERA (22/10/2026).\n"
  + " *\n"
  + " * Ste: \"la testa e' ancora nera\". Il personaggio e' una FOTO e l'elmo (o il\n"
  + " * cappuccio) e' metallo scuro: a quella dimensione sembra uno staccone nero.\n"
  + " * Le foto non si ritoccano (le ha disegnate un illustratore e gli stati\n"
  + " * dell'armatura devono restare coerenti), quindi si schiarisce l'immagine:\n"
  + " * l'elmo si vede come metallo e il personaggio si vede meglio in generale.\n"
  + " * Il contrasto resta sotto 1.05, come vuole il progetto: la foto non deve\n"
  + " * diventare dura.\n"
  + " */\n";
if (i > 0 && !s.slice(Math.max(0, i - 700), i).includes('LA TESTA NON PIU')) {
  s = s.slice(0, i) + spiegazione + s.slice(i);
}

writeFileSync(P, s, 'utf8');
console.log('ok: il filtro e\' dentro la regola della foto');
