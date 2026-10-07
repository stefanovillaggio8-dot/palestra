// avviso-peso.js -- "Questo vale per 66 kg".
//
// Ste (07/10/2026): "il peso corporeo e' l'unico numero digitato a mano che muove
// TUTTI i Rank. Tutti gli altri vengono misurati. Ogni chilo sbagliato e' un Rank
// sbagliato ovunque."
//
// Per questo l'avviso ha tre regole ferree, e sono qui dentro:
//  1) il numero viene LETTO, non scritto. Se il peso nel database passa da 66 a
//     72, l'avviso deve dire 72: se quei 66 fossero a mano, il giorno che Ste si
//     pesa di nuovo l'app continuerebbe a parlare del peso vecchio e lui non
//     saprebbe quale dei due numeri sia vero;
//  2) compare SOLO se il peso e' vecchio, e lo decido con serveAggiornare (gia'
//     esistente): se il peso e' di tre giorni fa l'avviso e' solo rumore;
//  3) l'avviso e il Rank devono leggere lo stesso valore dalla stessa funzione.
//     Percio' i confini qui sotto NON sono ricalcolati qui: si rifa la scala con
//     profiloPerPesoCorporeo, che e' esattamente la funzione che il Rank usa. Se
//     un giorno la scala cambiasse, l'avviso cambierebbe con lei; e non c'e' modo
//     che l'avviso dica una cosa e il Rank ne dica un'altra.
//
// Il numero e' scritto in TRE RIGHE e non in una frase lunga perche' e' un
// avviso: si legge di sfuggita mentre si guarda il numero grande, e in una riga
// sola il cervello salta la seconda parte, che e' quella che dice cosa fare.

import { profiloEsercizio, profiloPerPesoCorporeo, PESO_MINIMO, PESO_MASSIMO } from './rank-config.js';
import { recordEsercizio } from './rank.js';
import { pesoAttuale, serveAggiornare } from './peso-corporeo.js';

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
 * "Tocca" e' un'uguaglianza: a quel peso la scala mette quel numero esattamente
 * dove arriva la tua prestazione. Per la soglia sopra, quel peso e' quello che ti
 * fa salire; per la soglia sotto, e' quello oltre il quale la perdi.
 *
 * Le soglie crescono con il peso corporeo (la scala e' costruita sul rapporto con
 * il peso, non sul peso assoluto), quindi la funzione e' monotona e il confine si
 * trova a meta' tra due pesi. Sessanta passi vanno ben oltre la precisione che ha
 * senso scrivere: sotto i 0,01 kg il numero e' rumore.
 */
export function pesoCheToccaSoglia(profiloBase, indiceSoglia, prestazione) {
  const differenza = (w) => {
    const soglie = profiloPerPesoCorporeo(profiloBase, w).soglie || [];
    const soglia = soglie[indiceSoglia];
    return Number.isFinite(soglia) ? soglia - prestazione : null;
  };
  let basso = PESO_MINIMO;
  let alto = PESO_MASSIMO;
  const aBasso = differenza(basso);
  const adAlto = differenza(alto);
  // se non c'e' nessun peso valido in cui la soglia arriva a quella prestazione,
  // non si inventa un numero: si dice solo la parte che si puo' dire
  if (aBasso === null || adAlto === null) return null;
  if (aBasso >= 0 || adAlto <= 0) return null;
  for (let i = 0; i < 60; i++) {
    const meta = (basso + alto) / 2;
    if (differenza(meta) >= 0) alto = meta; else basso = meta;
  }
  return Math.round(((basso + alto) / 2) * 100) / 100;
}

/** In che gradino della scala sta una prestazione. -1 se e' sotto il primo. */
function gradino(punteggio, soglie) {
  let dentro = -1;
  for (let i = 0; i < soglie.length; i++) {
    if (punteggio >= soglie[i]) dentro = i;
  }
  return dentro;
}

/**
 * I due pesi che contano: quello che ti fa salire e quello che ti fa perdere.
 *
 * Se sei sotto il primo gradino c'e' solo il primo; se sei in cima c'e' solo il
 * secondo. Dirgli "tocchi il livello dopo" quando non esiste un livello dopo
 * sarebbe una promessa falsa.
 *
 * Una cosa che sembra strana e che vale la pena sapere: i due pesi NON dipendono
 * dal peso di oggi. La scala cresce con il peso corporeo, quindi il peso in cui
 * una prestazione fissa tocca una riga dipende solo dall'esercizio e da quanto hai
 * sollevato. Il peso di oggi dice invece DOVE sei fra quei due confini, e quindi
 * quanto sei vicino a perderlo. E' il senso dell'avviso: non "il Rank e' sbagliato",
 * ma "e' fragile, e lo vedi da quanto sei dentro la forbice".
 */
export function confiniPerIlRank(profiloBase, prestazione, soglieAttuali) {
  const soglie = soglieAttuali || [];
  const i = gradino(prestazione, soglie);
  let sale = null;
  let scende = null;
  if (i < 0) {
    // sei sotto il primo gradino: l'unica direzione possibile e' in su
    sale = pesoCheToccaSoglia(profiloBase, 0, prestazione);
  } else {
    // in cima non esiste "il livello dopo": dirglielo sarebbe una promessa falsa,
    // quindi l'unico confine che ha senso e' quello in cui lo perdi
    if (i < soglie.length - 1) sale = pesoCheToccaSoglia(profiloBase, i + 1, prestazione);
    scende = pesoCheToccaSoglia(profiloBase, i, prestazione);
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
 * (perche' allora l'avviso sarebbe solo rumore) oppure confini che non esistono.
 */
export async function avvisoPesoEsercizio({ serie, esercizio, account = null }) {
  if (!esercizio) return null;
  const peso = await pesoAttuale(account);
  if (peso === null || peso === undefined) return null;
  // regola 2: se serveAggiornare dice che il peso e' a posto, l'avviso sparisce.
  // Non faccio un controllo nuovo: quello che sa se il peso e' vecchio e' gia'
  // dentro serveAggiornare, e due posti che decidono la stessa cosa prima o poi
  // dicono cose diverse.
  const stato = await serveAggiornare(account);
  if (!stato || !stato.serve) return null;
  // regola 3: la stessa base e la stessa funzione del Rank. `base` e' la scala
  // PRIMA di adattarla al peso, ed e' quella che il Rank usa per costruirla.
  const base = profiloEsercizio(esercizio);
  const record = recordEsercizio(serie || [], esercizio, base, peso);
  if (!record.valido) return null;
  // il peso con cui la scala e' davvero stata costruita: quello della serie
  // migliore, se ce l'ha salvato dentro, altrimenti quello di adesso
  const pesoUsato = record.pesoCorporeo || peso;
  const confini = confiniPerIlRank(base, record.punteggio, record.profilo.soglie);
  const righe = righeAvviso({ peso: pesoUsato, sale: confini.sale, scende: confini.scende });
  if (!righe.length) return null;
  return { righe, peso: pesoUsato, record, confini, motivo: stato.motivo };
}