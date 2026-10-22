import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');

// IL PUNTEGGIO DI FORZA ALLOMETRICO, VISIBILE (Ste, 22/10/2026):
// "ho aggiornato ma non e' cambiato niente ancora nei rank".
//
// Sul suo peso (66 kg) la scala allometrica e' del 2% piu' bassa di quella
// lineare e le divisioni sono larghe: la divisione non cambia. Il numero che
// invece cambia, e che dice quanto sei forte davvero, e' il PUNTEGGIO DI FORZA:
// il massimale stimato diviso per il peso corporeo elevato a 0,67.
const re = /([ \t]*)const testo = \[\r?\n([ \t]*)e\.nome,/;
const m = s.match(re);
if (!m) { console.log('NON TROVATO: il testo del pannello'); process.exit(1); }
const ind = m[2];
const N = m[1] + "// IL PUNTEGGIO DI FORZA (22/10/2026): il massimale stimato diviso per il\n"
  + m[1] + "// peso corporeo elevato a 0,67. E' il numero che rende confrontabili due\n"
  + m[1] + "// persone di taglie diverse, e quello che la scala allometrica usa.\n"
  + m[1] + "const corpPerForza = (record && record.pesoCorporeo) || (corp > 0 ? corp : null);\n"
  + m[1] + "const unRM = kgReali * (1 + rip / 30);\n"
  + m[1] + "const forzaRelativa = corpPerForza > 0 ? unRM / Math.pow(corpPerForza, 0.67) : null;\n"
  + m[1] + "const testo = [\n"
  + ind + "  forzaRelativa !== null\n"
  + ind + "    ? 'forza relativa ' + (Math.round(forzaRelativa * 10) / 10)\n"
  + ind + "      + ' (1RM ' + (Math.round(unRM * 10) / 10) + ' kg su ' + corpPerForza + ' kg^0,67)'\n"
  + ind + "    : '',\n"
  + ind + "e.nome,";
s = s.replace(re, N);
writeFileSync(P, s, 'utf8');
console.log('ok: il punteggio di forza allometrico nella prova di un esercizio');
