// rank-v2/valori.js -- i tre numeri di ogni esercizio: ingresso, vertice, e da dove
// viene il numero.
//
// Ste (07/10/2026): "ogni esercizio deve avere la propria scala di prestazione e
// delle soglie realistiche" + strada 2 scelta da lui: "i valori devono venire
// misurati sulle prestazioni reali, pero' non voglio che bastino 3-4 risposte casuali
// per cambiare completamente le soglie: usa quei dati per affinare gradualmente i
// valori e mantieni dei limiti realistici".
//
// QUINDI QUI, per ogni movimento, ci sono DUE cose e vanno tenute distinte:
//
//  1) il VERTICE: il carico che una persona di 70 kg, allenata, arriva davvero su
//     quell'esercizio. Non e' un massimo teorico, e' il numero che nella vita reale
//     si vede in palestra.
//
//  2) la QUOTA DI INGRESSO: quanto del vertice basta per entrare nel Rank piu' basso.
//     Su un esercizio difficile la quota e' PICCOLA (e' difficile anche solo arrivare
//     al vertice), su un esercizio facile e' PIU' grande.
//
// SUL NUMERO CHE PRIMA ERA SBAGLIATO (e che questo file corregge)
// Nel sistema vecchio "gambe_isolamento" valeva 88 kg e "spalle_isolamento" 13 kg:
// stessa difficolta' dichiarata, numeri che differivano di un fattore 6, e nessuno dei
// due verificato. Il risultato era che 40 kg di leg extension davano BRONZE e 40 kg
// di lateral raise davano OLYMPIAN. Qui sotto ogni numero ha la sua riga e la sua
// fonte, e le due righe sbagliate sono corrette.
//
// LA SORGENTE DEI NUMERI
//
// Nessun numero qui sotto e' ancora "misurato su di te": sono STIME DICHIARATE,
// costruite partendo dai tuoi storici (leg press 100 per lato, lat 102, chest 35x8,
// curl al cavo 40 con doppia carrucola) e completate con le medie di palestra per la
// voce. Ogni riga ha un campo `fonte` che dice da dove viene. E misura.js parte da
// qui e li affina con le tue risposte, ma NON PUO' spostarli oltre il 25%: il numero
// non puo' scivolare via dai valori realistici dichiarati, per quanto tu risponda.

import { ripetizioniPiene, fattoreMeccanica } from './curve.js';

/**
 * I valori per movimento, per una persona di 70 kg.
 *
 * fonte:
 *  - 'tuo'     = preso da uno storico che mi hai dato tu
 *  - 'stima'   = stima dichiarata, costruita su media di palestra
 */
export const VALORI_MOVIMENTO = {
  gambe_pesanti: {
    vertice: 190, quotaIngresso: 0.42, fonte: 'tuo',
    nota: 'Leg press: tu facevi 100 kg per lato = 200 totali sullo scarico normale. 190 sullo scarico obliquo (percorso piu\' corto).',
  },
  tirata_verticale: {
    vertice: 105, quotaIngresso: 0.45, fonte: 'tuo',
    nota: 'Lat pulldown: tu 102 kg, e dicevi "faccio quasi 30 kg in piu\' del mio corpo". 105 sul peso di 70.',
  },
  tirata_orizzontale: {
    vertice: 100, quotaIngresso: 0.45, fonte: 'tuo',
    nota: 'Seated cable row: stessa zona del pulldown, ma la stazza stanca prima.',
  },
  spinta_orizzontale: {
    vertice: 70, quotaIngresso: 0.45, fonte: 'tuo',
    nota: 'Chest press a dischi, valore PER BRACCIO. Il numero e\' stato corretto: avevo 95 (cioe\' 2,7 volte il corpo in totale, che non e\' un vertice ma un record del mondo). 70 per braccio su un corpo di 70 = 1,0 per braccio, che e\' il vertice reale di chi si allena bene. Tu fai 37 kg per braccio x8: con questo numero sei oltre l\'ingresso.',
  },
  spinta_verticale: {
    vertice: 42, quotaIngresso: 0.50, fonte: 'stima',
    nota: 'Spalle con i manubri, valore per MANUBRIO: verticale e\' il piu\' difficile dei due. 42 kg per mano su 70 kg di persona.',
  },
  petto_isolamento: {
    vertice: 26, quotaIngresso: 0.40, fonte: 'tuo',
    nota: 'Cable fly: tu 37 kg al cavo con doppia carrucola = 18,5 sentiti per lato. Il vertice 26 kg e\' per lato.',
  },
  spalle_isolamento: {
    vertice: 30, quotaIngresso: 0.30, fonte: 'stima',
    nota: 'ALZATE LATERALI: numero CORRETTO (il vecchio diceva 13, e con la doppia carrucola ti regalava l\'OLYMPIAN). Vertice 30 kg al cavo con doppia carrucola = 15 kg per lato.',
  },
  bicipiti: {
    vertice: 55, quotaIngresso: 0.35, fonte: 'tuo',
    nota: 'Curl al cavo con doppia carrucola: tu 40 = 20 per lato. Il vertice 55 = 27,5 per lato.',
  },
  tricipiti: {
    vertice: 50, quotaIngresso: 0.35, fonte: 'stima',
    nota: 'Pushdown al cavo con doppia carrucola. Le estensioni sopra la testa valgono circa il 70%: se serve, va un numero suo.',
  },
  gambe_isolamento: {
    vertice: 60, quotaIngresso: 0.48, fonte: 'stima',
    nota: 'LEG EXTENSION: numero CORRETTO (il vecchio diceva 88, un numero da leg press: per questo 40 kg davano BRONZE). 60 kg per persona di 70 su una macchina a stack.',
  },
  gambe_curl: {
    vertice: 45, quotaIngresso: 0.45, fonte: 'stima',
    nota: 'Leg curl seduto: il quadricipite e\' piu\' forte del femorale, quindi leggermente sotto l\'estensione.',
  },
  spalle_trapezio: {
    vertice: 85, quotaIngresso: 0.45, fonte: 'stima',
    nota: 'Shrug con i manubri, per MANUBRIO: gli scapoli sopportano tutto il tuo peso piu\' volte. 85 per mano su 70 di persona.',
  },
  corpo_libero: {
    vertice: 0, quotaIngresso: 0.30, fonte: 'nessuno',
    nota: 'Trazioni e dip: qui i kg non esistono, si contano le ripetizioni.',
  },
};

/**
 * Tetti di realta'. Ste: "non voglio Rank regalati".
 *
 * - nessun Rank puo' chiedere piu' di 2,2 volte il peso della persona (fuori scala umana);
 * - e sugli ISOLAMENTI il tetto e' 0,85: il punto e' che un muscolo piccolo non
 *   regge un carico grosso, quindi se il vertice di un isolamento supera 0,85 per
 *   uno, o il numero e' sbagliato o l'esercizio non e' un isolamento.
 */
export const TETTO_PER_PESO = 2.2;
export const TETTO_ISOLAMENTI = 0.85;

/** Se il vertice e' dentro i tetti di realta' per quell'esercizio. */
export function tettoPerEsercizio(livello) {
  return livello === 'isolamento' ? TETTO_ISOLAMENTI : TETTO_PER_PESO;
}

/**
 * Il vertice di un esercizio, riportato sul corpo della persona.
 *
 * Il peso corporeo entra qui e in un solo posto: moltiplica il vertice (e quindi
 * anche l'ingresso, che e' una quota di quello). Questo vuol dire che il peso non
 * decide "quanto vale la prestazione in se'" ma "quanto ci vuole su QUEL corpo".
 */
export function verticePerCorpo(valori, livello, pesoCorporeo) {
  const peso = Number(pesoCorporeo);
  if (!Number.isFinite(peso) || peso <= 0) return null;
  const tetto = tettoPerEsercizio(livello);
  const grezzo = valori.vertice * (peso / 70);
  const limite = peso * tetto;
  return {
    vertice: Math.round(Math.min(grezzo, limite) * 100) / 100,
    tetto: Math.round(limite * 100) / 100,
    tettoRaggiunto: grezzo > limite,
  };
}

/** Le soglie complete di un esercizio sul corpo della persona, in kg. */
export function sogliePerEsercizio(valori, livello, pesoCorporeo) {
  const v = verticePerCorpo(valori, livello, pesoCorporeo);
  if (!v) return null;
  const ingresso = Math.round(v.vertice * valori.quotaIngresso * 100) / 100;
  return {
    ingresso,
    vertice: v.vertice,
    tetto: v.tetto,
    tettoRaggiunto: v.tettoRaggiunto,
    fonte: valori.fonte,
    nota: valori.nota,
  };
}

/**
 * Le soglie nella STESSA unita' dello score, e qui sta una trappola che ho preso
 * io la prima volta (e che e' utile sapere, perche' un numero senza unita' e' un
 * numero a caso).
 *
 * I valori che ho dichiarato sopra sono in CHILOGRAMMI ("vertice 95 kg alla chest
 * press"), e cosi' sono leggibili. Ma lo score di una serie e' in kg-equivalenti
 * (40 kg x 8 = 258 kg-equivalenti), quindi confrontare 258 con 95 vuol dire sempre
 * "OLYMPIAN": la prima volta che ho stampato la tabella davano TUTTI OLYMPIAN.
 *
 * La conversione c'e' e non e' un vezzo: una soglia dichiarata come "95 kg alla
 * chest press" vuol dire 95 kg fatti come una serie da 8, quindi va moltiplicata
 * per quello che 8 ripetizioni valgono e per la meccanica di quell'esercizio.
 * Solo dopo le due stanno nello stesso posto e il confronto ha un senso.
 */
export const RIPETIZIONI_RIFERIMENTO = 8;

export function fattoreSogliaDaKg(esercizio = {}) {
  return ripetizioniPiene(RIPETIZIONI_RIFERIMENTO) * fattoreMeccanica(esercizio);
}