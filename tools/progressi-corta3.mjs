import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');

// 1. la spiegazione lunga del peso: dentro una scheda chiusa
{
  const re = /      const boxForza = el\('div', \{ class: 'spiegazione generale' \}\);\n      const apriForza = el\('details',[\s\S]*?\n      \]\);\n      boxForza\.appendChild\(el\('h3', \{ testo: 'Quanto stai sollevando in pi[^']*' \}\)\);\n/;
  const m = s.match(re);
  if (!m) { console.log('NON TROVATO: il blocco del peso'); process.exit(1); }
  const nuovo = "      const boxForza = el('div', { class: 'spiegazione generale' });\n"
    + "      // La spiegazione lunga sta in una SCHEDA CHIUSA (22/10/2026): la pagina dei\n"
    + "      // Progressi era troppo lunga e troppo incasinata. Il titolo si vede, il\n"
    + "      // resto si apre con un tocco.\n"
    + "      const dentroForza = el('div', { class: 'dentro-scheda' });\n"
    + "      boxForza.appendChild(el('details', { class: 'scheda-chiusa' }, [\n"
    + "        el('summary', { class: 'scheda-titolo', testo: 'Quanto stai sollevando in piu' del tuo corpo' }),\n"
    + "        dentroForza,\n"
    + "      ]));\n";
  s = s.replace(m[0], nuovo);

  // i paragrafi che vengono dopo vanno dentro la scheda
  const inizio = s.indexOf('const dentroForza = el(');
  const fine = s.indexOf('zona.appendChild(boxForza);', inizio);
  const mezzo = s.slice(inizio, fine).replace(/boxForza\.appendChild\(/g, 'dentroForza.appendChild(');
  s = s.slice(0, inizio) + mezzo + s.slice(fine);
  console.log('ok: la spiegazione del peso sta in una scheda chiusa');
}

writeFileSync(P, s, 'utf8');
