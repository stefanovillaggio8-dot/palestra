import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');

/* IL PUNTEGGIO DI FORZA ALLOMETRICO, VISIBILE.
 *
 * Ste (22/10/2026): "ho aggiornato ma non e' cambiato niente ancora nei rank".
 *
 * Il motivo: sul peso di Ste (66 kg) la scala allometrica e' del 2% piu' bassa di
 * quella lineare, e le divisioni sono larghe, quindi la divisione non cambia.
 * Il numero che invece cambia, e che dice davvero quanto sei forte, e' il
 * PUNTEGGIO DI FORZA: il massimale stimato diviso per il peso corporeo
 * elevato a 0,67.
 *
 * S = 1RM stimato / pesoCorporeo^0,67
 */
const V = "        const testo = [\n          e.nome,";
const N = "        // IL PUNTEGGIO DI FORZA (22/10/2026): il massimale stimato diviso per il\n"
  + "        // peso corporeo elevato a 0,67. E' il numero che rende confrontabili due\n"
  + "        // persone di taglie diverse, e quello che la scala allometrica usa.\n"
  + "        const corpPerForza = (record && record.pesoCorporeo) || (corp > 0 ? corp : null);\n"
  + "        const unRM = kgReali * (1 + rip / 30);\n"
  + "        const forzaRelativa = corpPerForza > 0 ? unRM / Math.pow(corpPerForza, 0.67) : null;\n"
  + "        const testo = [\n"
  + "          forzaRelativa !== null\n"
  + "            ? 'forza relativa ' + (Math.round(forzaRelativa * 10) / 10)\n"
  + "              + ' (1RM ' + (Math.round(unRM * 10) / 10) + ' kg su ' + corpPerForza + ' kg^0,67)'\n"
  + "            : '',\n"
  + "          e.nome,";
if (!s.includes(V)) { console.log('NON TROVATO: il testo del pannello'); process.exit(1); }
s = s.replace(V, N);
writeFileSync(P, s, 'utf8');
console.log('ok: il punteggio di forza allometrico nella prova di un esercizio');
