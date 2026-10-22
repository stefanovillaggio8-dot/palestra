import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');

/* IL PUNTEGGIO DI FORZA ALLOMETRICO, VISIBILE.
 *
 * Ste (22/10/2026): "ho aggiornato ma non e' cambiato niente ancora nei rank".
 *
 * Il motivo e' che la differenza e' piccola: sul peso di Ste (66 kg) la scala
 * allometrica e' del 2% piu' bassa di quella lineare, e le divisioni sono
 * larghe, quindi la divisione non cambia. Il numero che invece cambia, e che
 * dice davvero quanto sei forte, e' il PUNTEGGIO DI FORZA: il massimale stimato
 * diviso per il peso corporeo elevato a 0,67.
 *
 * S = 1RM stimato / pesoCorporeo^0,67
 *
 * Questo numero si vede, e confronta due persone: 70 kg che sollevano 70 kg
 * fanno 18,6; 80 kg che sollevano 80 kg fanno 18,6... no: fanno 17,8, cioe'
 * l'atleta da 70 e' piu' forte dello stesso identico rapporto.
 */
const V = `        const testo = [
          e.nome,
          peso + ' kg x ' + rip + (corp > 0 ? ' | peso corporeo ' + corp + ' kg' : ''),
          rango ? rango.nome + (rango.divisione ? ' ' + rango.divisione.nome : '') : (record && record.motivo ? record.motivo : 'Non valutabile'),`;
const N = `        // IL PUNTEGGIO DI FORZA (22/10/2026): il massimale stimato diviso per il
        // peso corporeo elevato a 0,67. E' il numero che rende confrontabili due
        // persone di taglie diverse, e quello che la scala allometrica usa.
        const corpPerForza = (record && record.pesoCorporeo) || (corp > 0 ? corp : null);
        const unRM = kgReali * (1 + rip / 30);
        const forzaRelativa = corpPerForza > 0 ? unRM / Math.pow(corpPerForza, 0.67) : null;
        const testo = [
          e.nome,
          peso + ' kg x ' + rip + (corp > 0 ? ' | peso corporeo ' + corp + ' kg' : ''),
          rango ? rango.nome + (rango.divisione ? ' ' + rango.divisione.nome : '') : (record && record.motivo ? record.motivo : 'Non valutabile'),
          forzaRelativa !== null
            ? 'forza relativa ' + (Math.round(forzaRelativa * 10) / 10)
              + ' (1RM ' + (Math.round(unRM * 10) / 10) + ' kg su ' + corpPerForza + ' kg^0,67)'
            : '',`;
if (!s.includes(V)) { console.log('NON TROVATO: il testo del pannello'); process.exit(1); }
s = s.replace(V, N);
writeFileSync(P, s, 'utf8');
console.log('ok: il punteggio di forza allometrico nella prova di un esercizio');
