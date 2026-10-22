import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');

// NELLA "PROVA UN ESERCIZIO" SI DICE ANCHE LA DIVISIONE (22/10/2026).
//
// Ste: "la sezione prova un esercizio non deve dirmi solo diamante ma tipo
// diamante 1/2/3".
//
// Il rank ha gia' la divisione dentro (rank.js: `divisione: r.divisione`), ma il
// pannello mostrava solo il nome. Ora scrive "Diamante 1" (o 2, o 3).
const V = "rango ? rango.nome :";
const N = "rango ? rango.nome + (rango.divisione ? ' ' + rango.divisione.nome : '') :";
let n = 0;
while (s.includes(V)) { s = s.replace(V, N); n++; }
writeFileSync(P, s, 'utf8');
console.log('ok: la divisione nella prova di un esercizio (' + n + ' posti)');
