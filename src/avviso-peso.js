// avviso-peso.js -- "Questo vale per 66 kg".
//
// Ste (07/10/2026): "il peso corporeo È l'unico numero digitato a mano che muove
// TUTTI i Rank. Tutti gli altri vengono misurati. Ogni chilo sbagliato È un Rank
// sbagliato ovunque."
//
// Per questo l'avviso ha tre regole ferree, e sono qui dentro:
//  1) il numero viene LETTO, non scritto. Se il peso nel database passa da 66 a
//     72, l'avviso deve dire 72: se quei 66 fossero a mano, il giorno che Ste si
//     pesa di nuovo l'app continuerebbe a parlare del peso vecchio e lui non
//     saprebbe quale dei due numeri sia vero;
//  2) compare SOLO se il peso È vecchio, e lo decido con serveAggiornare (già
//     esistente): se il peso È di tre giorni fa l'avviso È solo rumore;
//  3) l'avviso e il Rank devono leggere lo stesso valore dalla stessa funzione.
//     Percio' i confini qui sotto NON sono ricalcolati qui: si rifa la scala con
//     profiloPerPesoCorporeo, che È esattamente la funzione che il Rank usa. Se
//     un giorno la scala cambiasse, l'avviso cambierebbe con lei; e non cÈ modo
//     che l'avviso dica una cosa e il Rank ne dica un'altra.
//
// IL NUMERO È SCRITTO IN TRE RIGHE e non in una frase lunga perchÈ È un
// avviso: si legge di sfuggita mentre si guarda il numero grande, e in una riga
// sola il cervello salta la seconda parte, che È quella che dice cosa fare.
//
// NUOVO MODELLO (22/10/2026): il Rank usa il motore rank-v3 (Epley + normalizzazione
// allometrica 0,67 + quota di peso corporeo per dip/trazioni + coefficiente
// di difficolta'). Le soglie stanno in `record.soglie` (unita' normalizzata:
// 1RM / peso^0,67). L'avviso deve usare LA STESSA FORMULA per calcolare i confini,
// altrimenti l'avviso dice "a 66 kg tocchi il livello dopo" mentre il Rank dice
// "a 70 kg". Ecco cosa cambia:
//  - `pesoCheToccaSoglia` ora calcola le soglie con il NUOVO modello (rank-v3)
//    usando `soglieNormalizzate` per il peso corporeo variabile `w`.
//  - Il `prestazione` (record.score) È FISSO: e' la prestazione del giorno in cui
//    l'hai fatta, col peso di quel giorno. Non si ricalcola col peso di oggi.

import { profiloEsercizio, PESO_MINIMO, PESO_MASSIMO } from './rank-config.js';
import { recordEsercizio } from './rank.js';
import { pesoAttuale, serveAggiornare } from './peso-corporeo.js';
import { kgEquivalenti as kgEquivalentiScore } from './rank-v3/modello.js';

/** Un peso con al massimo due decimali e senza zeri inutili: 65,79 oppure 67. */
export function kgTesto(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(v);
}

/**
 * Il peso al confine in cui una prestazione tocca una certa soglia.
 *
 * "Tocca" È un'uguaglianza: a quel peso la scala mette quel numero esattamente
 * dove arriva la tua prestazione. Per la soglia sopra, quel peso È quello che ti
 * fa salire; per la soglia sotto, È quello oltre il quale la perdi.
 *
 * LE SOGLIE IN KG CRESCONO CON IL PESO CORPOREO (la scala È costruita sul rapporto con
 * il peso, non sul peso assoluto), quindi la funzione È monotona e il confine si
 * trova a meta' tra due pesi. Sessanta passi vanno ben oltre la precisione che ha
 * senso scrivere: sotto i 0,01 kg il numero È rumore.
 *
 * NUOVO MODELLO (22/10/2026): le soglie del record sono in unita' di SCORE
 * (kg * ripetizioniPiene * meccanica). Le convertiamo in kg dividendo per
 * la meccanica, poi usiamo la scala allometrica.
 */
export function pesoCheToccaSoglia({ kgEquivalenti, soglie, indiceSoglia, w0, meccanica }) {
  if (!soglie || !soglie.length || indiceSoglia >= soglie.length) return null;
  const sogliaScore = soglie[indiceSoglia];
  if (!Number.isFinite(sogliaScore) || sogliaScore <= 0) return null;
  const kg8 = Number(kgEquivalenti);
  if (!Number.isFinite(kg8) || kg8 <= 0) return null;
  const m = Number(meccanica);
  const mec = Number.isFinite(m) && m > 0 ? m : 1;
  // IL PESO CHE CONTA E' QUELLO DI OGGI, NON UN RAPPORTO.
  //
  // Le soglie sono COSTANTI: non crescono col peso. Quello che cambia e' lo
  // score, perché è 1RM / peso^0,67. Con lo stesso carico da 8 ripetizioni:
  //   score(w) = kg8 x Epley x meccanica / w^0,67
  // e il confine e' dove score(w) = soglia:
  //   w = (kg8 x Epley x meccanica / soglia)^(1/0,67)
  const ratio = (kg8 * mec) / sogliaScore;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  const w = Math.pow(ratio, 1 / 0.67);
  if (!Number.isFinite(w) || w < PESO_MINIMO || w > PESO_MASSIMO) return null;
  return Math.round(w * 100) / 100;
}

export function pesoCheToccaSogliaSafe(args) {
  // Una sola formula. Il vecchio "fallback lineare" usava una scala che cresceva
  // col peso: era il bug, non una rete di sicurezza.
  return pesoCheToccaSoglia(args);
}

/** In che gradino della scala sta una prestazione. -1 se È sotto il primo. */
function gradinoAvviso(punteggioKg, soglie, w0, meccanica) {
  const m = Number(meccanica);
  const mec = Number.isFinite(m) && m > 0 ? m : 1;
  const kg8 = Number(punteggioKg);
  const w = Number(w0);
  if (!Number.isFinite(kg8) || kg8 <= 0 || !Number.isFinite(w) || w <= 0) return -1;
  const punteggioScore = (kg8 * mec) / Math.pow(w, 0.67);
  let dentro = -1;
  for (let i = 0; i < soglie.length; i++) {
    if (punteggioScore >= soglie[i]) dentro = i;
  }
  return dentro;
}

/**
 * I due pesi che contano: quello che ti fa salire e quello che ti fa perdere.
 *
 * Se sei sotto il primo gradino cÈ solo il primo; se sei in cima cÈ solo il
 * secondo. Dirgli "tocchi il livello dopo" quando non esiste un livello dopo
 * sarebbe una promessa falsa.
 *
 * Una cosa che sembra strana e che vale la pena sapere: i due pesi NON dipendono
 * dal peso di oggi. La scala cresce con il peso corporeo, quindi il peso in cui
 * una prestazione fissa tocca una riga dipende solo dall'esercizio e da quanto hai
 * sollevato. Il peso di oggi dice invece DOVE sei fra quei due confini, e quindi
 * quanto sei vicino a perderlo. È il senso dell'avviso: non "il Rank È sbagliato",
 * ma "e' fragile, e lo vedi da quanto sei dentro la forbice".
 */
export function confiniPerIlRank({ kgEquivalenti, soglie, w0, meccanica }) {
  const i = gradinoAvviso(kgEquivalenti, soglie, w0, meccanica);
  let sale = null;
  let scende = null;
  if (i < 0) {
    // sei sotto il primo gradino: l'unica direzione possibile e' in su
    sale = pesoCheToccaSogliaSafe({ kgEquivalenti, soglie, indiceSoglia: 0, w0, meccanica });
  } else {
    // in cima non esiste "il livello dopo": dirglielo sarebbe una promessa
    // falsa, quindi l'unico confine che ha senso e' quello in cui lo perdi.
    //
    // I CONFINI NON DIPENDONO DAL PESO DI OGGI (la scala cresce col peso),
    // quindi il peso corporeo in cui una prestazione FISSA tocca la soglia i+1
    // e' sempre più grande di quello in cui tocca la soglia i. Aggiungere peso
    // corporeo fa SCENDERE lo score a parita' di carico: da 66 a 72 kg questo
    // Rank scende da TITAN a DIAMOND, non sale. Quindi l'unico confine che
    // esiste davvero e' quello in cui lo perdi (la soglia i): il livello dopo
    // lo tocchi SOLO se dimagrisci.
    scende = pesoCheToccaSogliaSafe({ kgEquivalenti, soglie, indiceSoglia: i, w0, meccanica });
  }
  return { sale, scende, inCima: i === soglie.length - 1, sotto: i < 0 };
}

/** Le tre righe dell'avviso. Vedi i due pesi: `sale` e `scende`. */
export function righeAvviso({ peso, sale, scende }) {
  if (peso === null || peso === undefined) return [];
  const pezzi = [];
  if (sale !== null && sale !== undefined) pezzi.push(`a ${kgTesto(sale)} kg tocchi il livello dopo`);
  if (scende !== null && scende !== undefined) pezzi.push(`a ${kgTesto(scende)} kg lo perdi`);
  // nessuno dei due ha un peso sensato: meglio non scrivere una frase che non
  // dice niente che dirgli "ogni chilo sposta questo Rank" e poi tacere
  if (!pezzi.length) return [];
  return [
    `Questo vale per ${kgTesto(peso)} kg.`,
    `Ogni chilo di peso corporeo sposta questo Rank: ${pezzi.join(', ')}. `
      + 'Se il tuo peso è cambiato, aggiornalo.',
  ];
}

/**
 * L'avviso per un esercizio, letto tutto dal database.
 *
 * Restituisce null quando non serve: niente record, peso assente, peso fresco
 * (perchÈ allora l'avviso sarebbe solo rumore) oppure confini che non esistono.
 */
export async function avvisoPesoEsercizio({ serie, esercizio, account = null }) {
  if (!esercizio) return null;
  const peso = await pesoAttuale(account);
  if (peso === null || peso === undefined) return null;
  // regola 2: se serveAggiornare dice che il peso È a posto, l'avviso sparisce.
  // Non faccio un controllo nuovo: quello che sa se il peso È vecchio È già
  // dentro serveAggiornare, e due posti che decidono la stessa cosa prima o poi
  // dicono cose diverse.
  const stato = await serveAggiornare(account);
  if (!stato || !stato.serve) return null;
  // regola 3: la stessa base e la stessa funzione del Rank. `base` È la scala
  // PRIMA di adattarla al peso, ed È quella che il Rank usa per costruirla.
  const base = profiloEsercizio(esercizio);
  const record = recordEsercizio(serie || [], esercizio, base, peso);
  if (!record.valido) return null;
  // il peso con cui la scala È davvero stata costruita: quello della serie
  // migliore, se ce l'ha salvato dentro, altrimenti quello di adesso
  const pesoUsato = record.pesoCorporeo || peso;
  // LE SOGLIE SONO QUELLE DEL MOTORE NUOVO (record.soglie).
  const soglie = Array.isArray(record.soglie) && record.soglie.length
    ? record.soglie
    : (record.profilo ? record.profilo.soglie : null);
  if (!soglie || !soglie.length) return null;
  // LA PRESTAZIONE IN KG EQUIVALENTI (quella che l'utente legge: "37 kg x 8").
  // Serve per trovare i confini in kg, non in unita' normalizzate.
  const kgEquivalenti = record.kgEquivalenti ?? (() => {
    if (!record.score || !record.pesoCorporeo) return null;
    return kgEquivalentiScore(record.score, record.pesoCorporeo, record.meccanica || 1);
  })();
  if (kgEquivalenti === null) return null;
  
  // CALCOLA I CONFINI usando il modello nuovo (in KG)
  const confini = confiniPerIlRank({
    kgEquivalenti,
    soglie,
    w0: pesoUsato,
    meccanica: record.meccanica || 1,
  });
  
  // CHI È SOTTO LA PRIMA SOGLIA ha un solo confine, quello in su, e senza Rank.
  // Prima non succedeva (il motore vecchio non restituiva mai Rank null); qui il
  // `record.rank.nome` sarebbe andato in crash, quindi il confine sotto non
  // viene nemmeno calcolato.
  const righe = righeAvviso({ peso: pesoUsato, sale: confini.sale, scende: confini.scende });
  if (!righe.length) return null;
  return { righe, peso: pesoUsato, record, confini, sottoSoglia: !!record.sottoSoglia, motivo: stato.motivo };
}