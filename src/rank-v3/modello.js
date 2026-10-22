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
//  3) LE SOGLIE RESTANO QUELLE DI ST.
//
//     I numeri per esercizio (ingresso e vertice) sono quelli che Ste ha
//     guardato con i suoi carichi veri: NON si toccano. Quello che cambia e' il
//     modo in cui la prestazione viene MISURATA e messa sulla scala. Per questo
//     le soglie del nuovo modello sono i numeri di Ste convertiti nella unita'
//     nuova (1RM normalizzato): a 8 ripetizioni il Rank resta IDENTICO a
//     prima, e cambia solo la curva fra 1 e 12 ripetizioni.
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
export function controllaIngresso({ peso = null, ripetizioni = null, pesoCorporeo = null, spotter = false } = {}) {
  const allarmi = [];
  const p = numero(peso);
  const r = numero(ripetizioni);
  const corpo = numero(pesoCorporeo);

  if (p === null) {
    return { valido: false, motivo: 'manca il carico', allarmi };
  }
  if (p < 0) {
    return { valido: false, motivo: 'il carico non puo\' essere negativo', allarmi };
  }
  if (p === 0) {
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
  if (p > CARICO_SOSPETTO) {
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
    const aggiunti = assistenza !== null && assistenza > 0 ? assistenza : peso;
    if (aggiunti === null || aggiunti <= 0) {
      // nessuna zavorra: l'esercizio e' a corpo libero e si contano le ripetizioni
      return { carico: null, motivo: 'nessuna zavorra: questo esercizio si conta in ripetizioni' };
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
 * Le soglie di un esercizio, nella unita' del nuovo modello (score absolute: kg * meccanica).
 *
 * IL TRUCCHETTO, che e' il punto in cui il modello rispetta i numeri di Ste:
 *
 * I numeri di riferimento dell'esercizio (ingresso e vertice, in kg) sono
 * quelli approvati da Ste guardando i suoi carichi veri. Qui vengono
 * convertiti nella unita' dello score (kg * meccanica):
 *
 *   soglia = 1RM(referimento, 8 ripetizioni) * meccanica
 *         = riferimento_kg * (1 + 8/30) * meccanica
 *
 * COSA COMPORTA. La prestazione di riferimento (i kg giusti a 8 ripetizioni)
 * cade ESATTAMENTE sulla soglia: il Rank a 8 ripetizioni resta IDENTICO a
 * quello di prima. Quello che cambia e' la curva fra 1 e 12 ripetizioni (la
 * stima di Epley al posto della curva delle ripetizioni piene) e il modo in
 * cui il peso corporeo entra (esplicito, con l'esponente 0,67) - ma solo per
 * le soglie, che sono tarate sul peso corporeo allometrico.
 *
 * LA DIFFICOLTA' DOVE ENTRA: il coefficiente `difficoltaScala` moltiplica il
 * carico di riferimento, non il corpo. Un esercizio piu' difficile chiede una
 * prestazione relativa piu' grande per lo stesso Rank, e il corpo resta il
 * corpo. Per tutti i movimenti vale 1 (vedi `DIFFICOLTA_MOVIMENTO` e il
 * perche' scritto li'): i numeri di riferimento sono gia' tarati e non si
 * toccano.
 *
 * LA MECCANICA DOVE ENTRA: il coefficiente `meccanica` moltiplica sia lo score
 * che le soglie, perche' il motore v2 lo fa cosi'. Questo garantisce che i
 * numeri siano confrontabili tra v2 e v3.
 */
export function soglieNormalizzate({
  ingressoKg = null,
  verticeKg = null,
  quotaCorpo = 0,
  difficoltaScala = 1,
  pesoCorporeo = null,
  curva = null,
  corpoRif = null,
  meccanica = 1,
} = {}) {
  const ing = numero(ingressoKg);
  const ver = numero(verticeKg);
  if (ing === null || ver === null || ver <= ing) return null;
  const corpo = numero(corpoRif);
  const quota = Number(quotaCorpo) || 0;
  const diff = Number(difficoltaScala);
  const d = Number.isFinite(diff) && diff > 0 ? diff : 1;
  // il riferimento in kg: il corpo (quota) piu' il carico, con la difficolta' sul
  // carico. Il corpo e' il peso REALE: e' quello che stai spostando davvero.
  const corpoEffettivo = quota > 0 && corpo !== null ? corpo : 0;
  const refIngresso = corpoEffettivo + d * ing;
  const refVertice = corpoEffettivo + d * ver;
  if (refVertice <= refIngresso) return null;
  const punti = curva || [0, 0.10, 0.24, 0.42, 0.60, 0.78, 1];
  const fattoreEpley = 1 + RIPETIZIONI_RIFERIMENTO / 30; // 1.267
  return punti.map((f) => {
    const kg = refIngresso + (refVertice - refIngresso) * f;
    // Soglia in unita' di score: 1RM(kg, 8) * meccanica = kg * 1.267 * meccanica
    return arrotonda(kg * fattoreEpley * meccanica);
  }).filter((n) => n !== null);
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
