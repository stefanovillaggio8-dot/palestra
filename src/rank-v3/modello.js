// rank-v3/modello.js -- IL MODELLO MATEMATICO DEL RANK.
//
// Ste, 22/10/2026 (la richiesta per esteso):
//
//   "Analizza il progetto esistente della mia app palestra e modifica esclusivamente
//    il sistema di calcolo dei rank e dei punti forza, integrandolo con un algoritmo
//    matematico piu' realistico."
//
//   Il punteggio deve dipendere da quattro elementi:
//     1) il carico effettivamente utilizzato nell'esercizio,
//     2) il numero di ripetizioni completate,
//     3) il peso corporeo dell'atleta,
//     4) la difficolta' specifica dell'esercizio e il tipo di movimento.
//
// QUI C'E' IL MODELLO, e nient'altro: i numeri, le formule e i controlli.
// Il motore che lo usa sta in `valutazione.js`, il rank generale in `generale.js`.
//
// ---------------------------------------------------------------------------
// LA CATENA, in quattro passi
// ---------------------------------------------------------------------------
//
//   carico + ripetizioni  ->  stimaMassimale()   : il 1RM stimato (Epley)
//   1RM + peso corporeo   ->  punteggioNormalizzato() : 1RM / peso^0,67
//   esercizio             ->  soglieNormalizzate() : la scala di QUEL esercizio
//   punteggio + soglie    ->  il Rank (in `valutazione.js`, con la scala di v2)
//
// IL PERCHE' DI QUESTA FORMA, e la cosa da non dimenticare:
//
//  1) IL PESO CORPOReO NON DECIDE IL RANK DA SOLO.
//
//     Il peso entra NORMALIZZANDO, non decidendo: il punteggio e' "quanto hai
//     spinto per come sei fatto", non "quanto pesi". Due persone con lo stesso
//     peso possono avere livelli diversi, e chi pesa di piu' non e' chiuso
//     fuori perche' pesa di piu'.
//
//  2) LA STIMA DEL MASSIMALE (Epley) Serve A CONFRONTARE, NON A MOSTRARE.
//
//     Ste (07/10/2026) aveva scritto il contrario: "non voglio che l'app
//     trasformi quella prestazione in un ipotetico 1RM e poi assegni il Rank in
//     base a quello". Il 22/10 la richiesta e' cambiata: "utilizza inizialmente
//     la formula di Epley per stimare il massimale teorico... questa stima deve
//     essere utilizzata per valutare la prestazione". Quindi: il 1RM stimato
//     ENTRA nel calcolo del Rank, ma nella schermata resta chiaro che e' una
//     stima (vedi `metodo` e `affidabile` qui sotto, e la scritta nella scheda).
//
//  3) LE SOGLIE SONO STANDARD 1RM, E NON FINGONO CHE IL RANK SIA LO STESSO.
//
//     I numeri per esercizio sono standard di forza realistici, nel formato
//     "1RM / peso corporeo" (vedi `STANDARD_1RM`). Non sono i vecchi tetti
//     usati come se fossero carichi da 8 ripetizioni: quella confusione
//     rimetteva Epley due volte e teneva i Rank fermi. Quindi una stessa serie
//     puo' cambiare Rank rispetto al motore vecchio: e' voluto, ed e' la
//     conseguenza di misurare la prestazione in 1RM normalizzato. I casi con i
//     carichi veri di Ste restano comunque sotto il vertice (V35).
//
//  4) IL MODELLO NON INVENTA NULLA.
//
//     Ogni numero che esce da qui ha una formula e un nome. Dove il numero non
//     c'e' (un peso corporeo che non c'e', un esercizio senza kg), il modello
//     dice che non puo' valutare: non tira fuori un numero per far piacere.
//
// ---------------------------------------------------------------------------
// I LIMITI DICHIARATI, che sono parte del modello
// ---------------------------------------------------------------------------
//
//  - L'esponente 0,67 e' un PARAMETRO, non una verita' fisiologica. Viene dalla
//    letteratura sull'allometria muscolare (sezione trasversale ~ massa^0,67),
//    ed e' in UN posto solo: `ESPONENTE_ALLOMETRICO`. Cambiarlo per una
//    calibrazione futura e' una riga.
//  - La stima del 1RM e' affidabile da 1 a 12 ripetizioni. Oltre, il modello
//    cambia metodo (Brzycki) e LO DICE: `affidabile: false`.
//  - I coefficienti di difficolta' sono PROVISORI, e il tavolo lo dice
//    (`DIFFICOLTA_MOVIMENTO`): sono un punto di partenza documentato, non una
//    verita'. Il posto per tararli con i dati veri e' quel tavolo.

import { ESPONENTE_ALLOMETRICO, PESO_ALLOMETRICO_RIFERIMENTO, pesoAllometrico } from '../rank-v2/valori.js';
import { caricoReale, fattoreMeccanica, RIPETIZIONI_RIFERIMENTO } from '../rank-v2/curve.js';

export { ESPONENTE_ALLOMETRICO, PESO_ALLOMETRICO_RIFERIMENTO, pesoAllometrico, RIPETIZIONI_RIFERIMENTO };

// ---------------------------------------------------------------------------
// 1. I NUMERI FISSI DEL MODELLO
// ---------------------------------------------------------------------------

/**
 * Le ripetizioni oltre le quali la stima del massimale non e' piu' affidabile.
 *
 * Ste (22/10/2026): "Limita l'applicazione della formula a un intervallo di
 * ripetizioni ragionevole, ad esempio 1-12 ripetizioni. Oltre tale intervallo,
 * applica una strategia documentata e coerente oppure segnala che la stima e'
 * meno affidabile".
 *
 * Qui la strategia e' documentata E il modello segnala l'incertezza:
 *  - 1..12   : Epley (il metodo che usa quasi tutti), affidabile
 *  - 13..30  : Brzycki, che stima meglio le serie lunghe, NON affidabile
 *  - oltre 30 : il valore di Brzycki a 30 ripetizioni, fermo, NON affidabile
 *
 * "Fermo" vuol dire che il numero non cresce piu': una serie da 80 ripetizioni
 * non vale piu' di una da 30. Il difetto che questo modello non deve avere e'
 * proprio quello (il vecchio motore fermava la stima a "peso x 4,3" e la
 * faceva sembrare una realta').
 */
export const LIMITE_RIP_FIDATE = 12;
export const LIMITE_RIP_BRZYCKI = 30;

/**
 * I pesi fuori da questo range non sono errori di scrittura: sono valori
 * assurdi, e il modello li SEGNA (non li cancella e non li stima).
 */
export const PESO_MINIMO = 25;
export const PESO_MASSIMO = 300;

/** Sopra questo carico una serie e' sospetta: nessuno sposta 500 kg in palestra. */
export const CARICO_SOSPETTO = 400;

/** Sopra questo numero di ripetizioni una serie e' sospetta, non impossibile. */
export const RIPETIZIONI_SOSPETTE = 60;

// ---------------------------------------------------------------------------
// 2. LA STIMA DEL MASSIMALE (Epley)
// ---------------------------------------------------------------------------

/**
 * Il 1RM stimato di una serie: quanto reggeresti con una ripetizione sola.
 *
 * NON E' il massimale che hai mai fatto: e' una stima, e il modello lo dice
 * restituendo `metodo` e `affidabile`.
 *
 * LA REGOLA DI UNA RIPETIZIONE (Ste, 22/10/2026): "se utilizzi la formula di
 * Epley, per una ripetizione il massimale stimato deve coincidere con il carico
 * della singola ripetizione". Quindi con una ripetizione la stima e' il carico
 * stesso, e non "carico x 1,03": la formula di Epley comincia dalle 2
 * ripetizioni.
 */
export function stimaMassimale(carico, ripetizioni, { limiteFidate = LIMITE_RIP_FIDATE } = {}) {
  const c = Number(carico);
  const r = Math.floor(Number(ripetizioni));
  if (!Number.isFinite(c) || c <= 0) return null;
  if (!Number.isFinite(r) || r <= 0) return null;
  if (r === 1) {
    return { valore: arrotonda(c), metodo: 'carico', affidabile: true };
  }
  if (r <= limiteFidate) {
    // EPLEY: 1RM = carico x (1 + rip / 30)
    return { valore: arrotonda(c * (1 + r / 30)), metodo: 'epley', affidabile: true };
  }
  if (r <= LIMITE_RIP_BRZYCKI) {
    // BRZYCKI: 1RM = carico x 36 / (37 - rip). Stima meglio le serie lunghe,
    // ma e' una stima pi' spinta: per questo `affidabile` e' false.
    return { valore: arrotonda(c * (36 / (37 - r))), metodo: 'brzycki', affidabile: false };
  }
  // Oltre 30 ripetizioni il numero non cresce piu': si tiene il valore di Brzycki
  // a 30 ripetizioni e si dice che la stima non vale piu'.
  return { valore: arrotonda(c * (36 / 7)), metodo: 'brzycki_fermo', affidabile: false };
}

/**
 * Il 1RM stimato, e basta: il numero quando c'e', `null` quando non c'e'.
 * Comodo per chi non ha bisogno del metodo.
 */
export function massimaleStimato(carico, ripetizioni, opzioni = {}) {
  const s = stimaMassimale(carico, ripetizioni, opzioni);
  return s ? s.valore : null;
}

// ---------------------------------------------------------------------------
// 3. LA NORMALIZZAZIONE PER PESO CORPOREO
// ---------------------------------------------------------------------------

/**
 * Il fattore con cui si divide: peso corporeo elevato all'esponente.
 *
 * Ste (22/10/2026): "punteggio normalizzato = 1RM stimato / peso corporeo ^ 0,67".
 *
 * IL PERCHE' DEL 0,67 (e non 1): la forza di un muscolo va con la sua sezione
 * trasversale, e la sezione cresce con la massa del corpo a esponente 0,67,
 * non a esponente 1. Il corpo cresce in lunghezza E in larghezza, e i muscoli
 * crescono soprattutto in sezione.
 *
 * LA CONSEGUENZA, che e' un fatto matematico e non una verita' fisiologica:
 * chi solleva un carico pari al proprio peso vale un 4,5% in piu' se pesa
 * 80 kg invece di 70. Il test A lo verifica, e il commento del test dice
 * chiaramente che e' una conseguenza dell'esponente scelto.
 */
export function fattoreCorpo(pesoCorporeo, esponente = ESPONENTE_ALLOMETRICO) {
  const p = Number(pesoCorporeo);
  if (!Number.isFinite(p) || p <= 0) return null;
  return Math.pow(p, esponente);
}

/**
 * Il punteggio normalizzato di una prestazione: 1RM stimato / peso^0,67.
 *
 * E' il numero che rende confrontabili due persone di taglie diverse: e' la
 * "forza relativa". Lo stesso numero che la schermata mostra vicino al
 * massimale, ma calcolato in un posto solo.
 */
export function punteggioNormalizzato(carico, ripetizioni, pesoCorporeo, opzioni = {}) {
  const stima = stimaMassimale(carico, ripetizioni, opzioni);
  const fattore = fattoreCorpo(pesoCorporeo, opzioni.esponente);
  if (!stima || fattore === null) return null;
  return {
    punteggio: arrotonda(stima.valore / fattore),
    massimale: stima.valore,
    metodo: stima.metodo,
    affidabile: stima.affidabile,
    fattore: arrotonda(fattore),
  };
}

// ---------------------------------------------------------------------------
// 4. I CONTROLLI SULL'INGRESSO
// ---------------------------------------------------------------------------

/**
 * I controlli sui numeri che arrivano dalla tastiera.
 *
 * Ste (22/10/2026), punto 7: "Aggiungi controlli per: peso corporeo mancante,
 * nullo o negativo; carico negativo o non valido; numero di ripetizioni nullo o
 * negativo; valori estremi o palesemente anomali; unita' di misura;
 * duplicazioni delle registrazioni; variazioni del peso corporeo nel tempo.
 * Non permettere che un singolo errore di inserimento generi un rank
 * eccezionalmente elevato. Non cancellare automaticamente registrazioni valide
 * solo perche' insolite. Segnala i dati sospetti e gestiscili in modo
 * trasparente."
 *
 * QUINDI QUI CI SONO DUE COSE DIVERSE, e non vanno confuse:
 *   - `motivo`: la prestazione NON si puo' valutare (non e' un numero).
 *   - `allarmi`: il numero c'e' ed e' valido, ma e' strano, e si segnala.
 *
 * Un allarme non cancella niente e non abbassa il Rank da solo: il Rank resta
 * quello che hai fatto, e l'allarme spiega il perché.
 */
export function controllaIngresso({
  peso = null,
  ripetizioni = null,
  pesoCorporeo = null,
  spotter = false,
  consentiCaricoZero = false,
} = {}) {
  const allarmi = [];
  const p = numero(peso);
  const r = numero(ripetizioni);
  const corpo = numero(pesoCorporeo);

  // NEL CORPO LIBERO LO ZERO E' UN CARICO VALIDO (22/10/2026).
  //
  // Un dip o una trazione senza zavorra hanno zero kg scritti, ma non sono
  // "carico zero": stanno sollevando tutto il corpo. Il chiamante lo sa e passa
  // `consentiCaricoZero: true`; per tutti gli altri esercizi lo zero resta un
  // errore, perche' una panca a zero kg non e' una panca.
  if (p === null) {
    if (consentiCaricoZero) {
      // niente zavorra: si va avanti col solo corpo
    } else {
      return { valido: false, motivo: 'manca il carico', allarmi };
    }
  }
  if (p !== null && p < 0) {
    return { valido: false, motivo: 'il carico non puo\' essere negativo', allarmi };
  }
  if (p === 0 && !consentiCaricoZero) {
    return { valido: false, motivo: 'il carico e\' zero', allarmi };
  }
  if (r === null) {
    return { valido: false, motivo: 'mancano le ripetizioni', allarmi };
  }
  if (r <= 0) {
    return { valido: false, motivo: 'le ripetizioni non possono essere zero o negative', allarmi };
  }
  if (!Number.isInteger(r)) {
    allarmi.push('le ripetizioni non sono un numero intero: il modello le arrotonda');
  }
  if (r > RIPETIZIONI_SOSPETTE) {
    allarmi.push(`${r} ripetizioni in una serie: e\' un numero altissimo, controlla di averlo scritto bene`);
  }
  if (p !== null && p > CARICO_SOSPETTO) {
    allarmi.push(`${p} kg: un carico cosi\' alto e\' da controllare`);
  }
  if (corpo !== null) {
    if (corpo <= 0) {
      return { valido: false, motivo: 'il peso corporeo non puo\' essere zero o negativo', allarmi };
    }
    if (corpo < PESO_MINIMO || corpo > PESO_MASSIMO) {
      allarmi.push(`peso corporeo di ${corpo} kg: e\' fuori dal range ${PESO_MINIMO}-${PESO_MASSIMO} kg`);
    }
  }
  if (spotter === true) {
    allarmi.push('serie con lo spotter: vale il 90%');
  }
  return { valido: true, motivo: null, allarmi };
}

/**
 * Le registrazioni duplicate: due serie identiche nella stessa seduta.
 *
 * Ste (22/10/2026): "duplicazioni delle registrazioni". Il modello NON cancella
 * niente: segnala, e lascia che siano loro a decidere. Il controllo e' qui per
 *che il calcolo sappia cosa dire, non perche' butti via una serie.
 */
export function serieDuplicate(serie) {
  const visti = new Map();
  const doppie = [];
  for (const s of serie || []) {
    if (!s || s.eliminata) continue;
    const chiave = [
      s.seduta_id || '',
      s.esercizio_id || '',
      numero(s.peso) ?? '',
      numero(s.peso_assistenza) ?? '',
      numero(s.ripetizioni) ?? '',
      s.ordine ?? '',
    ].join('|');
    if (visti.has(chiave)) doppie.push(s);
    else visti.set(chiave, s);
  }
  return doppie;
}

// ---------------------------------------------------------------------------
// 5. LA CONFIGURAZIONE DI UN ESERCIZIO
// ---------------------------------------------------------------------------

/**
 * La tabella di configurazione, un pezzo per movimento.
 *
 * Ste (22/10/2026), punto 4: "Crea, se l'architettura lo consente, una
 * configurazione per ogni esercizio contenente: categoria del movimento;
 * modalita' di caricamento: bilanciere, manubri, macchina, cavo, corpo libero o
 * zavorra; coefficiente di difficolta' iniziale; eventuale quota stimata di peso
 * corporeo coinvolta; modello di calcolo appropriato; eventuali limiti di
 * ripetizioni; parametri necessari per la normalizzazione."
 *
 * I campi:
 *
 *  - `categoria`: il gruppo muscolare del movimento (petto, dorso, gambe...).
 *  - `caricamento`: COME si registra il carico. E' il default del movimento:
 *    se l'esercizio ha un'attrezzatura o una convenzione, quella vince (vedi
 *    `configEsercizio`).
 *  - `difficolta`: il COEFFICIENTE DI DIFFICOLTA' dell'esercizio, e serve
 *    NEL RANK GENERALE (vedi `generale.js`): quanto pesa la prestazione su
 *    quell'esercizio quando si sommano piu' esercizi. I valori vengono dalla
 *    meccanica (`rank-v2/leva.js`: il grado di svantaggio della leva, cioe'
 *    quante volte il muscolo deve tirare piu' del peso che spinge), rapportato
 *    alla mediana di tutti i movimenti. Sono PROVISORI.
 *  - `difficoltaScala`: il moltiplicatore del riferimento dell'esercizio NEL
 *    RANK DELL'ESERCIZIO. Vale 1 per tutti, e il perche' e' scritto sotto:
 *    i numeri di riferimento sono gia' tarati esercizio per esercizio, e
 *    moltiplicarli per la difficolta' conterebbe due volte la stessa cosa.
 *    E' il posto dove si scrive "questo esercizio e' piu' difficile di quanto
 *    sia tarato".
 *  - `quotaCorpo`: QUANTO PESO CORPOReO va contato in quell'esercizio. Zero
 *    per i carichi esterni, 1 per le trazioni (sollevi tutto il corpo).
 *  - `modello`: 'carico_esterno' (Epley sul carico), 'corpo_libero' (il corpo
 *    conta e il carico e' quello aggiunto).
 *  - `limiteRip`: oltre quante ripetizioni la stima non e' piu' affidabile
 *    per quel movimento (il default e' 12).
 *
 * I COEFFICIENTI DI DIFFICOLTA' SONO PROVISORI. Lo dice la parola
 * "provvisorio" qui sotto, e lo ripete il report: sono un punto di partenza
 * ragionato, non una calibrazione. Il posto per tararli con i dati veri e'
 * questo tavolo, e nient'altro.
 *
 * IL PERCHE' DI `difficoltaScala` A 1 PER TUTTI, che e' la cosa piu' importante
 * di questa tabella: il numero di riferimento di un esercizio (il suo tetto) e'
 * gia' stato tarato guardando i carichi VERI di Ste, e ogni nota nei numeri
 * scrive dove lui sta ("i 12,5 kg per lato della alzata laterale stanno al
 * 50% della scala"). Se il modello moltiplicasse quel numero per la difficolta'
 * meccanica, la scala si sposterebbe due volte: una per il tarato e una per la
 * meccanica, e i Rank gia' approvati cambierebbero senza che nessuno l'avesse
 * deciso. La difficolta' meccanica entra invece nel RANK GENERALE, dove non
 * c'e' nessun numero tarato da spostare.
 */
export const DIFFICOLTA_MOVIMENTO = {
  // Standard separati per i tre movimenti principali delle gambe.
  gambe_pressa: { categoria: 'gambe', caricamento: 'macchina', difficolta: 1, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  gambe_squat_macchina: { categoria: 'gambe', caricamento: 'macchina', difficolta: 1, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  gambe_squat_front: { categoria: 'gambe', caricamento: 'bilanciere', difficolta: 1, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  gambe_squat: { categoria: 'gambe', caricamento: 'bilanciere', difficolta: 1, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  gambe_stacco_manubri: { categoria: 'gambe', caricamento: 'manubri', difficolta: 1, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  gambe_stacco_rumeno: { categoria: 'gambe', caricamento: 'bilanciere', difficolta: 1, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  gambe_stacco: { categoria: 'gambe', caricamento: 'bilanciere', difficolta: 1, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  // Fallback per affondi e altri esercizi pesanti non ancora calibrati singolarmente.
  gambe_pesanti: { categoria: 'gambe', caricamento: 'macchina', difficolta: 1, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  gambe_isolamento: { categoria: 'gambe', caricamento: 'macchina', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  gambe_curl: { categoria: 'gambe', caricamento: 'macchina', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  gambe_stabilizzatore: { categoria: 'gambe', caricamento: 'macchina', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  tirata_verticale: { categoria: 'dorso', caricamento: 'macchina', difficolta: 1.05, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  tirata_verticale_larga: { categoria: 'dorso', caricamento: 'macchina', difficolta: 1.05, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  tirata_orizzontale: { categoria: 'dorso', caricamento: 'macchina', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  tirata_manubri: { categoria: 'dorso', caricamento: 'manubri', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  spinta_orizzontale: { categoria: 'petto', caricamento: 'macchina', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  spinta_verticale: { categoria: 'spalle', caricamento: 'manubri', difficolta: 1.4, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  spalle_trapezio: { categoria: 'dorso', caricamento: 'manubri', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  spalle_isolamento: { categoria: 'spalle', caricamento: 'cavo', difficolta: 1.4, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  spalle_posteriori: { categoria: 'spalle', caricamento: 'cavo', difficolta: 1.4, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  petto_isolamento: { categoria: 'petto', caricamento: 'cavo', difficolta: 1.25, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  bicipiti: { categoria: 'bicipiti', caricamento: 'cavo', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  bicipiti_panca: { categoria: 'bicipiti', caricamento: 'manubri', difficolta: 1.1, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  tricipiti: { categoria: 'tricipiti', caricamento: 'cavo', difficolta: 1, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  tricipiti_alta: { categoria: 'tricipiti', caricamento: 'cavo', difficolta: 1.4, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  polso: { categoria: 'avambraccio', caricamento: 'cavo', difficolta: 1.4, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  polpacci: { categoria: 'polpacci', caricamento: 'macchina', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  addome: { categoria: 'core', caricamento: 'cavo', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  core: { categoria: 'core', caricamento: 'cavo', difficolta: 1.4, difficoltaScala: 1, quotaCorpo: 0, modello: 'carico_esterno' },
  // I DUE ESERCIZI COL PESO DEL CORPO.
  //
  // Qui la quota di corpo e' 1: sulle trazioni e sui dip il corpo sale e scende
  // intero, quindi il carico effettivo e' il corpo PIU' quello che hai appeso.
  // E' la regola che Ste ha scritto il 22/10: "per gli esercizi con zavorra,
  // come dips e trazioni, considera anche il peso corporeo effettivamente
  // coinvolto nel movimento".
  //
  // ATTENZIONE AL DOPPIO CONTO, che il test E verifica: il corpo si conta UNA
  // volta sola. Il carico che Ste scrive nei dip e' la ZAVORRA (il campo
  // `peso_assistenza`), e il corpo e' un'altra cosa: il totale e' corpo + zavorra,
  // mai corpo + zavorra + corpo.
  spinta_corpo_libero: { categoria: 'petto', caricamento: 'corpo_libero', difficolta: 0.9, difficoltaScala: 1, quotaCorpo: 1, modello: 'corpo_libero' },
  tirata_verticale_corpo: { categoria: 'dorso', caricamento: 'corpo_libero', difficolta: 1.1, difficoltaScala: 1, quotaCorpo: 1, modello: 'corpo_libero' },
  corpo_libero: { categoria: 'corpo libero', caricamento: 'corpo_libero', difficolta: 1, difficoltaScala: 1, quotaCorpo: 0, modello: 'ripetizioni' },
};

/**
 * Le correzioni per ESERCIZIO, quando un esercizio e' piu' difficile (o piu'
 * facile) del movimento a cui appartiene.
 *
 * STAVolta e' un tavolo VUOTO, e vuoto per una ragione: i numeri di Ste sono
 * gia' calibrati esercizio per esercizio (vedi `scala-esercizi.js`), e cambiarli
 * qui sposterebbe Rank che Ste ha approvato guardando i suoi carichi veri.
 *
 * Il posto esiste perche' Ste ha scritto: "Se non esistono dati sufficienti per
 * calibrare la difficolta' degli esercizi, implementa coefficienti iniziali
 * provvisori chiaramente identificati come tali e predisponi una struttura per
 * migliorarli in seguito".
 *
 * COME SI USA: si scrive l'id dell'esercizio e il coefficiente.
 *
 *   'ex-cable-lateral-raise': { difficolta: 1.3 }
 *
 * e da quel momento quel solo esercizio chiede il 30% di prestazione in piu'
 * per lo stesso Rank. Nessun altro si muove.
 */
export const CONFIG_ESERCIZI = {};

// ---------------------------------------------------------------------------
// 5-bis. GLI STANDARD DI FORZA REALISTICI (1RM)
// ---------------------------------------------------------------------------
//
// Ste, 22/10/2026: "fai la cosa piu' realistica e segui le formule matematiche".
//
// QUESTI NUMERI SONO 1RM, NON CARICHI DA 8 RIPETIZIONI. E' la differenza che
// faceva restare i Rank fermi: prima la tabella veniva letta come "quanto fai a
// 8 ripetizioni", poi lo score la riportava a 1RM con Epley, e la stessa
// conversione veniva fatta anche sulle soglie. Le due conversioni si
// annullavano, quindi a 8 ripetizioni il Rank era identico al vecchio.
//
// QUI INVECE il numero e' gia' il massimale: un 1,0x significa "con una
// ripetizione sola sollevi il tuo peso". Lo score invece parte dai kg veri e
// stima il 1RM con Epley. A 8 ripetizioni il 1RM stimato e' 1,267 volte il
// carico, quindi la stessa serie vale di piu' sulla scala: e' voluto, ed e' la
// conseguenza matematica di usare standard 1RM.
//
// L'UNITA' DI MISURA E' QUELLA CHE L'APP REGISTRA:
//  - `per_manubrio` e `per_braccio`: il numero e' per un lato, non doppio;
//  - cavo a doppia carrucola: il numero e' per lato;
//  - macchine a pila: il numero e' quello sullo stack;
//  - dip e trazioni: il numero e' il TOTALE (corpo + zavorra).
//
// I VALORI SONO MULTIPLI DEL PESO CORPOREO A 75 KG. Sono una sintesi di range
// pubblici di forza (principiante / intermedio / avanzato / elite) adattati
// all'attrezzatura e alla convenzione di carico di questa app. Non sono una
// verita' fisiologica: sono il punto di partenza documentato, e si cambiano
// SOLO qui. La conversione in unita' normalizzata e' in `normalizzaStandard`.
export const PESO_RIFERIMENTO_1RM = PESO_ALLOMETRICO_RIFERIMENTO;

export const STANDARD_1RM = {
  // LEG PRESS: standard mantenuto, ma ora riservato alla pressa.
  // I dati OpenPowerlifting non validano la leg press; il valore resta quindi
  // provvisorio e non viene spacciato per un percentile agonistico.
  gambe_pressa: {
    ingresso: 0.80, vertice: 3.10,
    nota: 'Leg press a due gambe: 0,80x-3,10x. Standard provvisorio, non calibrato con dati agonistici specifici della pressa.',
    varianti: { per_gamba: { ingresso: 0.40, vertice: 1.55 } },
  },
  // SQUAT: il report OpenPowerlifting mostra che 3,10x viene superato dal 6,50%
  // degli uomini raw agonisti (18-39 anni). Per rendere TITAN e OLYMPIAN davvero
  // selettivi, alziamo il vertice a 4,20x. È una soglia di prodotto provvisoria,
  // NON un percentile certificato: il dataset descrive powerlifter, non utenti
  // generici di palestra, e la distribuzione completa va ricalcolata per sesso.
  gambe_squat: {
    ingresso: 0.80, vertice: 4.20,
    nota: 'Squat con bilanciere: 0,80x-4,20x. Vertice provvisorio volutamente severo; 3,10x era superato dal 6,50% degli uomini nel campione OpenPowerlifting.',
  },
  // Varianti separate: vertici provvisori di prodotto, NON percentili misurati.
  gambe_squat_macchina: {
    ingresso: 0.80, vertice: 3.10,
    nota: 'Hack/power/pendulum squat su macchina: 0,80x-3,10x. Provvisorio; il carico indicato dipende dalla macchina e non e\' confrontabile con il bilanciere.',
  },
  gambe_squat_front: {
    ingresso: 0.80, vertice: 3.60,
    nota: 'Front squat: 0,80x-3,60x. Vertice provvisorio inferiore al back squat; da calibrare con distribuzioni specifiche.',
  },
  // STACCO: il medesimo 3,10x viene superato dal 22,85% degli uomini agonisti,
  // prova che non può condividere il tetto dello squat. Il vertice 4,60x è una
  // scelta provvisoria conservativa per rendere TITAN/OLYMPIAN molto più rari;
  // non viene dichiarato un percentile esatto senza il ricalcolo dei quantili.
  gambe_stacco: {
    ingresso: 0.80, vertice: 4.60,
    nota: 'Stacco da terra: 0,80x-4,60x. Vertice provvisorio severo; 3,10x era superato dal 22,85% degli uomini nel campione OpenPowerlifting.',
  },
  gambe_stacco_manubri: {
    ingresso: 0.25, vertice: 1.20,
    nota: 'Deadlift con manubri, carico espresso per manubrio: 0,25x-1,20x. Stima provvisoria conservativa, non percentile certificato.',
  },
  gambe_stacco_rumeno: {
    ingresso: 0.80, vertice: 3.80,
    nota: 'Stacco rumeno/RDL: 0,80x-3,80x. Vertice provvisorio: ROM e convenzione differiscono dallo stacco da terra; percentile non certificato.',
  },
  // Fallback legacy per altri esercizi pesanti non ancora calibrati singolarmente.
  gambe_pesanti: {
    ingresso: 0.80, vertice: 3.10,
    nota: 'Standard provvisorio per affondi e altri esercizi pesanti non ancora separati; non usare per squat, stacco o leg press.',
  },
  tirata_verticale_larga: {
    ingresso: 0.55, vertice: 1.75,
    nota: 'Lat pulldown a presa larga: 0,55x-1,75x. La presa larga e\' leggermente piu\' difficile della stretta.',
  },
  tirata_verticale: {
    ingresso: 0.60, vertice: 1.90,
    nota: 'Lat pulldown a presa stretta: 0,60x-1,90x. E\' il riferimento delle tirate verticali.',
  },
  tirata_orizzontale: {
    ingresso: 0.65, vertice: 1.85,
    nota: 'Remo al cavo: 0,65x-1,85x. Il dorso orizzontale regge piu\' della lat a parita\' di sensazione.',
  },
  spinta_orizzontale: {
    ingresso: 0.30, vertice: 0.85,
    nota: 'Chest press a dischi PER BRACCIO: 0,30x-0,85x per lato. La panca a bilanciere ha la sua scala.',
    varianti: {
      guidata: { ingresso: 0.25, vertice: 0.75 },
      bilanciere: { ingresso: 0.50, vertice: 1.60 },
    },
  },
  spinta_verticale: {
    ingresso: 0.15, vertice: 0.70,
    nota: 'Spinta sopra la testa PER MANUBRIO: 0,15x-0,70x per mano. La spalla regge meno del petto. '
      + 'Vertice 0,60 -> 0,70 (22/10/2026): Strength Level da\' 0,70x per manubrio come elite, nella '
      + 'nostra stessa unita\' (per lato), quindi il vecchio vertice tagliava fuori chi e\' davvero elite.',
  },
  spalle_trapezio: {
    ingresso: 0.45, vertice: 1.50,
    nota: 'Shrug PER MANUBRIO: 0,45x-1,50x per mano. Il trapezio e\' forte ma la corsa e\' corta.',
  },
  petto_isolamento: {
    ingresso: 0.10, vertice: 0.50,
    nota: 'Cable fly PER LATO sentito (la doppia carrucola dimezza): 0,10x-0,50x. Vertice 0,35 -> 0,50 '
      + '(22/10/2026): Strength Level da\' elite 84 kg a 1RM sul carrello = 66 kg a 6 rip = 33 kg per '
      + 'lato su 66 kg di corpo = 0,50x. Prima 0,35x rendeva TITAN un cable fly che nella realta\' e\' '
      + 'DIAMOND, e Ste stesso l\'aveva notato.',
  },
  tirata_manubri: {
    ingresso: 0.40, vertice: 1.10,
    nota: 'Bench pull PER MANUBRIO: 0,40x-1,10x per mano.',
  },
  spalle_isolamento: {
    ingresso: 0.08, vertice: 0.45,
    nota: 'Alzate laterali PER LATO: 0,08x-0,45x. 20 kg per mano a 8 ripetizioni sono TITAN, non OLYMPIAN.',
  },
  spalle_posteriori: {
    ingresso: 0.08, vertice: 0.55,
    nota: 'Reverse fly PER MANUBRIO: 0,08x-0,55x per lato. Il deltoide posteriore e\' piccolo e la leva '
      + 'e\' sfavorevole, ma Strength Level da\' 0,55x per manubrio come elite. Vertice 0,30 -> 0,55 '
      + '(22/10/2026): a 0,30 chi faceva 28 kg sentiti risultava OLYMPIAN senza esserlo.',
  },
  bicipiti: {
    ingresso: 0.15, vertice: 0.95,
    nota: 'Curl al cavo e coi manubri PER LATO: 0,15x-0,95x. Con la doppia carrucola i kg letti sono gia\' la meta\'.',
  },
  bicipiti_panca: {
    ingresso: 0.15, vertice: 0.85,
    nota: 'Curl alla panca Scott PER BRACCIO: 0,15x-0,85x. La leva e\' peggiore del cavo, quindi il vertice e\' piu\' basso.',
  },
  tricipiti: {
    ingresso: 0.10, vertice: 0.48,
    nota: 'Pushdown PER LATO: 0,10x-0,48x.',
  },
  tricipiti_alta: {
    ingresso: 0.16, vertice: 0.62,
    nota: 'Estensione sopra la testa PER LATO: 0,16x-0,62x.',
  },
  gambe_isolamento: {
    ingresso: 0.55, vertice: 1.80,
    nota: 'Leg extension sullo stack: 0,55x-1,80x.',
  },
  gambe_curl: {
    ingresso: 0.40, vertice: 1.25,
    nota: 'Leg curl sullo stack: 0,40x-1,25x.',
  },
  gambe_stabilizzatore: {
    ingresso: 1.00, vertice: 3.00,
    nota: 'Hip thrust e glutei: 1,00x-3,00x. E\' un movimento di anca, non un isolamento piccolo.',
  },
  polso: {
    ingresso: 0.12, vertice: 0.75,
    nota: 'Wrist curl: 0,12x-0,75x. Strength Level da\' 0,75x come elite per manubrio. Vertice 0,60 -> '
      + '0,75 (22/10/2026): i 30 kg veri di Ste restano dentro la scala e non toccano piu\' il vertice.',
  },
  polpacci: {
    ingresso: 0.45, vertice: 1.70,
    nota: 'Calf raise al carrello: 0,45x-1,70x. Sulla pressa orizzontale la scala e\' quella delle gambe.',
    varianti: { pressa: { ingresso: 0.90, vertice: 3.00 } },
  },
  // Dip e trazioni: il numero e' il TOTALE (corpo + zavorra), non i soli kg
  // appesi. Un dip a corpo libero e' 1,0x: e' il primo gradino.
  spinta_corpo_libero: {
    ingresso: 1.00, vertice: 2.10,
    nota: 'Dip: totale corpo + zavorra, 1,00x-2,10x. A corpo libero sei gia\' all\'ingresso.',
  },
  tirata_verticale_corpo: {
    ingresso: 1.00, vertice: 1.95,
    nota: 'Trazioni: totale corpo + zavorra, 1,00x-1,95x. La presa larga sta sotto la lat.',
  },
  addome: {
    ingresso: 0.12, vertice: 0.45,
    nota: 'Crunch al cavo PER LATO: 0,12x-0,45x.',
  },
  core: {
    ingresso: 0.12, vertice: 0.45,
    nota: 'Crunch al cavo PER LATO: 0,12x-0,45x.',
  },
};

/**
 * Il moltiplicatore 1RM standard di un movimento, scegliendo la variante giusta.
 *
 * La scelta e' la stessa logica di `valoriPerEsercizio` di v2: prima la
 * convenzione (una gamba sola), poi la macchina (Smith, pressa), poi il tipo di
 * carico. Non si guarda il nome dell'esercizio se non per le macchine che non
 * hanno un campo dedicato.
 */
export function standardPerMovimento(movimento, esercizio = {}) {
  const base = STANDARD_1RM[movimento];
  if (!base) return null;
  const e = esercizio || {};
  let scelto = base;

  if (base.varianti) {
    if ((movimento === 'gambe_pesanti' || movimento === 'gambe_pressa') && e.convenzione === 'per_gamba') {
      scelto = base.varianti.per_gamba || base;
    } else if (movimento === 'spinta_orizzontale') {
      const nome = String(e.nome || '').toLowerCase();
      const guidata = String(e.id || '').toLowerCase().includes('smith')
        || nome.includes('smith') || nome.includes('multipower') || nome.includes('multigym');
      if (guidata) scelto = base.varianti.guidata || base;
      else if (e.convenzione === 'bilanciere') scelto = base.varianti.bilanciere || base;
    } else if (movimento === 'polpacci') {
      const id = String(e.id || '').toLowerCase();
      const nome = String(e.nome || '').toLowerCase();
      const pressa = id.includes('sled') || nome.includes('sled')
        || nome.includes('pressa') || nome.includes('press');
      if (pressa) scelto = base.varianti.pressa || base;
    }
  }

  return {
    ingresso: Number(scelto.ingresso),
    vertice: Number(scelto.vertice),
    nota: scelto.nota || base.nota || '',
    fonte: 'standard_1rm',
  };
}

/** 75 kg elevato a 0,33: il ponte fra "multiplo del peso" e unita' normalizzata. */
const PONTE_1RM = Math.pow(PESO_RIFERIMENTO_1RM, 1 - ESPONENTE_ALLOMETRICO);

/**
 * Il ponte fra uno standard 1RM e il carico da 8 ripetizioni.
 *
 * Lo score nuovo usa direttamente la serie vera: a 8 ripetizioni vale il carico
 * scritto, non un massimale stimato. Gli standard restano espressi in 1RM, quindi
 * vanno riportati UNA VOLTA a 8 ripetizioni: 1RM / (1 + 8/30).
 *
 * Non e' Epley applicato alla serie: e' la conversione fissa dello standard, e
 * non dipende da quante ripetizioni ha fatto Ste.
 */
export const FATTORE_8_RIP = 1 + RIPETIZIONI_RIFERIMENTO / 30;

/**
 * Da "1,5x il corpo a 75 kg" all'unita' dello score, che non dipende dal peso.
 *
 * LA FORMULA, in una riga:
 *   standard_normalizzato = multiplo_1RM * 75 / 75^0,67
 *                         = multiplo_1RM * 75^0,33
 *
 * Perche' non si moltiplica per il peso di chi si allena: lo score e' gia'
 * 1RM / peso^0,67. Se anche la soglia venisse moltiplicata per peso^0,67, il
 * peso si semplificherebbe e il Rank non cambierebbe mai. La soglia e' la
 * prestazione attesa per un corpo di riferimento, e il peso entra una volta
 * sola, nel punteggio.
 */
export function normalizzaStandard(multiplo) {
  const m = Number(multiplo);
  if (!Number.isFinite(m) || m <= 0) return null;
  return arrotonda(m * PONTE_1RM, 4);
}

/**
 * La configurazione completa di un esercizio.
 *
 * L'ordine e' uno solo e vale per tutti:
 *   1) il tavolo dei movimenti (il default),
 *   2) il tavolo degli esercizi (le eccezioni),
 *   3) l'esercizio stesso (attrezzatura e convenzione: COME si registra).
 *
 * Il punto 3 e' importante: il movimento dice "cavo" ma un esercizio puo' essere
 * fatto coi manubri, e il modo in cui registri il carico e' la cosa che conta.
 */
export function configEsercizio({ esercizio = null, movimento = null, livello = null } = {}) {
  const base = DIFFICOLTA_MOVIMENTO[movimento] || {
    categoria: livello || 'sconosciuto',
    caricamento: 'sconosciuto',
    difficolta: 1,
    difficoltaScala: 1,
    quotaCorpo: 0,
    modello: 'carico_esterno',
  };
  const eccezione = CONFIG_ESERCIZI[(esercizio && esercizio.id) || ''] || {};
  const cfg = { ...base, ...eccezione };
  cfg.movimento = movimento || null;
  cfg.livello = livello || null;
  cfg.id = (esercizio && esercizio.id) || '';
  cfg.nome = (esercizio && esercizio.nome) || '';
  // LA MODALITA' DI CARICAMENTO, che dipende da COME l'esercizio e' fatto.
  cfg.caricamento = modoDiCaricamento(cfg, esercizio);
  return cfg;
}

/**
 * Come si registra il carico di quell'esercizio: il dato che decide se i kg
 * che leggi sono per un braccio, per lato, o il totale.
 *
 * La regola e' gia' nel progetto (`moltiplicatoreCarico` in rank-config.js) e
 * qui viene SOLO letta, non reinterpretata: un posto solo per la regola.
 */
export function modoDiCaricamento(cfg, esercizio) {
  const e = esercizio || {};
  if (cfg.modello === 'ripetizioni') return 'ripetizioni';
  if (cfg.modello === 'corpo_libero') return 'corpo_libero';
  if (e.convenzione === 'zavorri') return 'zavorra';
  if (e.convenzione === 'per_manubrio') return 'manubri';
  if (e.convenzione === 'bilanciere') return 'bilanciere';
  if (e.carrucola === 'carrucola_doppia' || e.carrucola === 'carrucola_mono') return 'cavo';
  if (e.attrezzatura === 'macchina_stack' || e.attrezzatura === 'macchina_dischi') return 'macchina';
  return cfg.caricamento || 'sconosciuto';
}

// ---------------------------------------------------------------------------
// 6. IL CARICO EFFETTIVO DI UNA SERIE
// ---------------------------------------------------------------------------

/**
 * Il carico che una serie sposta davvero, con dentro il corpo quando l'esercizio
 * e' col peso del corpo.
 *
 * Ste (22/10/2026): "Non confondere il carico totale con il peso corporeo:
 * gestisci correttamente esercizi con bilanciere, manubri, macchine, cavi,
 * zavorre e corpo libero. Per gli esercizi con zavorra, come dips e trazioni,
 * considera anche il peso corporeo effettivamente coinvolto nel movimento. Non
 * applicare automaticamente la stessa formula utilizzata per una macchina a
 * cavi."
 *
 * QUATTRO CASI, e sono tutti qui dentro:
 *
 *  - CARICO ESTERNO (bilanciere, manubri, macchina, cavo): il carico e' quello
 *    che hai scritto, con la carrucola gia' dimezzata (`caricoReale`).
 *  - CORPO LIBERO (dip, trazioni): il carico e' il CORPO PIU' la zavorra. Il
 *    corpo si conta una volta sola, e la zavorra e' il numero che hai scritto
 *    (nel campo dell'assistenza, perche' e' li' che l'app mette i kg dei dip e
 *    delle trazioni).
 *  - SOLO RIPETIZIONI: non c'e' carico, e il modello non può valutare.
 *  - ASSISTENZA: i kg che la macchina ti regge contano al contrario (non
 *    sono prestazione): per quelli il modore dice "non valutabile" e lascia
 *    fare il conto alle ripetizioni.
 */
export function caricoEffettivo(serie, cfg, { pesoCorporeo = null, esercizio = {} } = {}) {
  const peso = numero(serie && serie.peso);
  const assistenza = numero(serie && serie.peso_assistenza);
  if (cfg.modello === 'ripetizioni') {
    return { carico: null, motivo: 'questo esercizio si conta in ripetizioni, non in kg' };
  }
  if (cfg.modello === 'corpo_libero') {
    const corpo = numero(pesoCorporeo);
    if (corpo === null || corpo <= 0) {
      return { carico: null, motivo: 'manca il peso corporeo: senza quello non si puo\' contare il corpo' };
    }
    // LA ZAVORRA: il numero che Ste scrive. Nei dip e nelle trazioni sta nel
    // campo dell'assistenza; il fallback su `peso` serve per chi ha i numeri
    // nel campo vecchio.
    //
    // ZERO E' UN NUMERO, NON UN ERRORE (22/10/2026). Prima qui si usciva con
    // "nessuna zavorra: si contano le ripetizioni", e un dip a corpo libero non
    // aveva nessun Rank. Ma il dip a corpo libero e' il primo gradino della
    // scala: il carico e' il corpo, non la zavorra.
    const aggiunti = assistenza !== null ? assistenza : (peso !== null ? peso : 0);
    if (aggiunti < 0) {
      return { carico: null, motivo: 'la zavorra non puo\' essere negativa' };
    }
    const totale = corpo + aggiunti;
    return {
      carico: arrotonda(totale),
      zavorra: aggiunti,
      corpo: corpo,
      motivo: null,
    };
  }
  // CARICO ESTERNO
  if (cfg.caricamento === 'assistenza') {
    return { carico: null, motivo: 'i kg di assistenza non sono una prestazione' };
  }
  const reale = caricoReale(peso, esercizio || {});
  if (reale === null) {
    return { carico: null, motivo: 'mancano i kg o le ripetizioni' };
  }
  return { carico: reale, zavorra: null, corpo: null, motivo: null };
}

// ---------------------------------------------------------------------------
// 7. LE SOGLIE DI UN ESERCIZIO, NELLA UNITA' NUOVA
// ---------------------------------------------------------------------------

/**
 * Le soglie di un esercizio, nella unita' normalizzata dello score.
 *
 * PRIMA (fino al 21/10/2026) qui c'era un errore che teneva fermi tutti i Rank:
 * le soglie erano `1RM(kg, 8) * meccanica / peso^0,67`, e lo score era
 * `1RM(carico) * meccanica / peso^0,67`. Il peso si semplificava, ma restava
 * anche la conversione Epley a 8 ripetizioni su entrambi i lati: a 8 ripetizioni
 * il Rank tornava esattamente quello vecchio. Non era un caso: era la stessa
 * formula scritta due volte.
 *
 * ORA le soglie sono COSTANTI NORMALIZZATE, una per movimento:
 *
 *   soglia = standard_1RM(multiplo del corpo a 75 kg) * 75^0,33 * meccanica
 *
 * Il peso corporeo entra UNA VOLTA SOLA, nello score (`1RM / peso^0,67`). A 75 kg
 * lo standard e' esattamente il multiplo scritto nella tabella; a 90 kg lo stesso
 * Rank chiede piu' kg, perche' un corpo piu' grande ha piu' sezione muscolare
 * (`90^0,67 / 75^0,67`), ma non tutti i kg in piu' del suo peso.
 *
 * LA DIFFICOLTA' dove entra: moltiplica il moltiplicatore prima di normalizzarlo.
 * Oggi vale 1 per tutti (i numeri sono gia' tarati); resta configurabile perche'
 * e' parte del modello, non un numero nascosto.
 */
export function soglieNormalizzate({
  standard = null,
  difficoltaScala = 1,
  curva = null,
  meccanica = 1,
} = {}) {
  if (!standard) return null;
  const ingresso = numero(standard.ingresso);
  const vertice = numero(standard.vertice);
  if (ingresso === null || vertice === null || vertice <= ingresso) return null;
  const diff = Number(difficoltaScala);
  const d = Number.isFinite(diff) && diff > 0 ? diff : 1;
  // GLI STANDARD SONO 1RM, LO SCORE E' LA SERIE VERA (22/10/2026).
  //
  // Lo score nuovo vale `kg x ripetizioniPiene / peso^0,67 x meccanica`: a 8
  // ripetizioni il carico vale 1,0. Lo standard 1RM va quindi riportato a 8
  // ripetizioni una volta sola, dividendo per (1 + 8/30). La serie di Ste non
  // viene trasformata in 1RM: la conversione e' solo nella soglia.
  const ing1rm = normalizzaStandard(ingresso * d);
  const ver1rm = normalizzaStandard(vertice * d);
  if (ing1rm === null || ver1rm === null || ver1rm <= ing1rm) return null;
  const ing = arrotonda(ing1rm / FATTORE_8_RIP, 4);
  const ver = arrotonda(ver1rm / FATTORE_8_RIP, 4);
  if (ing === null || ver === null || ver <= ing) return null;
  const m = numero(meccanica);
  const mec = m !== null && m > 0 ? m : 1;
  const punti = curva || [0, 0.10, 0.24, 0.42, 0.60, 0.78, 1];
  return punti.map((f) => arrotonda((ing + (ver - ing) * f) * mec));
}

// ---------------------------------------------------------------------------
// 8. UTILITTA'
// ---------------------------------------------------------------------------

export function numero(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function arrotonda(v, cifre = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const f = 10 ** cifre;
  return Math.round(n * f) / f;
}

/**
 * Il fattore di meccanica dell'esercizio (dalla `curve.js` di v2).
 *
 * Si ri-esporta perche' il nuovo modello e' usato anche da schermate che non
 * importano `rank-v2`, e due copie della stessa regola sono due regole.
 */
export { fattoreMeccanica };
export { kgEquivalenti } from './valutazione.js';
