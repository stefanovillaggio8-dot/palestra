import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');
let n = 0;

// NELLA "PROVA UN ESERCIZIO" SI DICE ANCHE LA DIVISIONE (22/10/2026).
//
// Ste: "la sezione prova un esercizio non deve dirmi solo diamante ma tipo
// diamante 1/2/3".
//
// Il rank ha gia' la divisione dentro (rank.js: `divisione: r.divisione`),
// ma il pannello mostrava solo il nome. Ora scrive "Diamante 1" (o 2, o 3).
const V1 = "          rango ? rango.nome : (record && record.motivo ? record.motivo : 'Non valutabile'),";
const N1 = "          rango ? rango.nome + (rango.divisione ? ' ' + rango.divisione.nome : '')\n"
  + "            : (record && record.motivo ? record.motivo : 'Non valutabile'),";
if (s.includes(V1)) { s = s.replace(V1, N1); n++; }

const V2 = "          el('div', { class: 'pannello-prova-titolo', testo: rango ? rango.nome : 'Non valutabile' }),";
const N2 = "          el('div', {\n"
  + "            class: 'pannello-prova-titolo',\n"
  + "            // Con la divisione: \"Diamante 1\", non solo \"Diamante\" (22/10/2026).\n"
  + "            testo: rango\n"
  + "              ? rango.nome + (rango.divisione ? ' ' + rango.divisione.nome : '')\n"
  + "              : 'Non valutabile',\n"
  + "          }),";
if (s.includes(V2)) { s = s.replace(V2, N2); n++; }

writeFileSync(P, s, 'utf8');
console.log('ok: la divisione nella prova di un esercizio (' + n + ' posti)');
