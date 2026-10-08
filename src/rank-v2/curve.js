// rank-v2/curve.js -- le curve della PRESTAZIONE REALE.
//
// Ste (07/10/2026): "il Rank non deve essere calcolato usando il massimale stimato
// come parametro principale. Se faccio 45x8 non voglio che l'app trasformi quella
// prestazione in un ipotetico 1RM e poi assegni il Rank in base a quello. Il Rank
// deve basarsi sulla prestazione realmente eseguita: peso, ripetizioni, serie".
//
// QUI NASCE LA DIFFERENZA CON IL SISTEMA VECCHIO.
//
// Il vecchio: 45 kg x 8 -> Epley -> 57 kg ("quanto reggeresti con una rip sola") ->
// confrontato con le soglie. Quel 57 non l'hai mai fatto: e' una domanda ipotetica.
//
// Qui: 45 kg x 8 -> 45 kg per 6,46 "ripetizioni piene" -> 290 kg-equivalenti di
// lavoro davvero svolto. Il numero e' la prestazione, non una stima di un'altra.
//
// Le tre regole delle curve, e perche' sono cosi':
//
//  1) OGNI RIPETIZIONE CONTA, MA MENO DELLA PRECEDENTE. E' la cosa che rende
//     giusta la progressione 40x6 -> 40x8 -> 40x10 (la salta, e la sente) senza
//     far esplodere il numero: con 20 ripetizioni il totale e' circa il doppio
//     di 8, non cinque volte. La curva NON satura mai a un numero fisso: nel
//     sistema vecchio sopra 30 ripetizioni la stima si fermava a "peso x 4,3",
//     cioe' un numero inventato che non cresceva piu'.
//
//  2) IL VOLUME NON COMPRA UN RANK DA SOLO. Tre serie valgono piu' di una (e
//     devi sentirlo), ma il bonus e' fermo al 20% e c'e' anche un freno in
//     scalata.js: il volume spinge gli LP dentro il Rank che hai, e per far
//     salire di Rank la tua serie migliore deve essere gia' vicina alla soglia.
//     Altrimenti 10 serie da 5 kg ti portano al vertice.
//
//  3) LA MECCANICA E' UN PICCOLO CORRETTIVO (max +10%). I kg della macchina a
//     stack non sono gli stessi kg del bilanciere, ma la differenza e' piccola:
//     se fosse grossa, un curl su stack prenderebbe due Rank sulle spalle di chi
//     lo fa col bilanciere. E la carrucola continua a essere un fatto di COME
//     registri il carico, non di quanto sei forte: quindi dimezza e basta.

/** Quanto vale una ripetizione, rispetto a una ripetizione "piena". */
export const DECADIMENTO_RIPETIZIONE = 0.075;

/**
 * Le ripetizioni pesate di una serie: quanto lavoro fa davvero, senza stime.
 *
 * 1 -> 1, 5 -> 4,39, 8 -> 6,46, 12 -> 8,25, 20 -> 11,83, 30 -> 15,5.
 *
 * Nota come cresce: raddoppiare le ripetizioni non raddoppia il punteggio, ma
 * non lo annulla nemmeno. E non c'e' nessun punto in cui la curva smette di
 * crescere.
 */
export function ripetizioniPiene(ripetizioni) {
  const r = Math.floor(Number(ripetizioni) || 0);
  if (r <= 0) return 0;
  const limite = Math.min(r, 40); // oltre 40 il numero non significa piu' niente
  let totale = 0;
  for (let i = 1; i <= limite; i++) totale += 1 / (1 + DECADIMENTO_RIPETIZIONE * (i - 1));
  return Math.round(totale * 1000) / 1000;
}

/**
 * Il premio per le serie fatte. Sale e si ferma.
 *
 * Ste (07/10/2026): "fare 3x8 deve valere piu' di 1x8, per\u00f2 non deve bastare il
 * volume da solo per far salire di Rank una prestazione mediocre".
 * Quindi: +10% alla seconda serie, +16% alla terza, +20% dalla quarta in poi, e
 * basta. In pi\u00f9 il volume da solo non compra un Rank (vedi scalata.js).
 */
export const MOLTIPLICATORI_SERIE = [1, 1.10, 1.16, 1.20];

/** Il premio serie, fermato al massimo. */
export function moltiplicatoreSerie(serieFatte) {
  const n = Math.floor(Number(serieFatte) || 0);
  if (n <= 1) return 1;
  return MOLTIPLICATORI_SERIE[Math.min(MOLTIPLICATORI_SERIE.length - 1, n - 1)];
}

/**
 * La difficolta' TECNICA e MECCANICA, e solo quella: max +10%.
 *
 * Il livello (isolamento/composto/grande) NON entra qui: quello agisce sulla
 * scala, non sul punteggio. Se agisse su entrambi la stessa cosa conterebbe due
 * volte, e un isolamento finirebbe con la scala bassa E il punteggio gonfiato.
 */
export const MECCANICA = {
  macchina_stack: 1.06, // i kg li spinge la macchina
  macchina_dischi: 1.04,
  per_manubrio: 1.05, // l'equilibrio lo fai tu
  bilanciere: 1.02,
  instabilita: 1.08, // braccia indipendenti, trazioni libere, equilibrio
};

/** Il correttivo di meccanica, con tetto. */
export function fattoreMeccanica(esercizio = {}) {
  const e = esercizio || {};
  let f = 1;
  if (e.attrezzatura === 'macchina_stack') f *= MECCANICA.macchina_stack;
  else if (e.attrezzatura === 'macchina_dischi') f *= MECCANICA.macchina_dischi;
  if (e.convenzione === 'per_manubrio') f *= MECCANICA.per_manubrio;
  else if (e.convenzione === 'bilanciere') f *= MECCANICA.bilanciere;
  if (e.bracciaIndipendenti || e.livello === 'assistito') f *= MECCANICA.instabilita;
  // mai sotto 1 e mai sopra 1.10: oltre, la meccanica comincia a decidere il Rank
  return Math.min(1.10, Math.round(f * 1000) / 1000);
}

/**
 * Il carico REALE di una serie: quello che hai davvero spostato.
 *
 * Copia la regola che c'e' gia' nel Rank vecchio, e la copia perche' e' giusta:
 *  - i kg per braccio restano quello che hai scritto (i dischi stanno su tutti e
 *    due i bracci, ma Ste ha deciso che il numero deve restare quello che scrive
 *    lui);
 *  - la doppia carrucola DIMEZZA, perche' su una doppia carrucola lavori un
 *    braccio alla volta e il numero che leggi e' gia' meta'. E non si raddoppia
 *    dopo, altrimenti le due correzioni si annullerebbero.
 */
export function caricoReale(peso, esercizio = {}) {
  const p = Number(String(peso === null || peso === undefined ? '' : peso).replace(',', '.'));
  if (!Number.isFinite(p) || p <= 0) return null;
  if (esercizio && esercizio.carrucola === 'carrucola_doppia') {
    return Math.round((p / 2) * 100) / 100;
  }
  return Math.round(p * 100) / 100;
}

/**
 * Lo SCORE di una singola serie: kg realmente spostati per ripetizioni pesate,
 * con dentro la meccanica. Nessuna stima, nessun "quanto reggeresti".
 *
 * Restituisce anche i pezzi, cosi' la schermata puo' mostrare da dove viene il
 * numero invece di farlo sembrare magico.
 */
export function scoreSerie({ peso, ripetizioni, esercizio = {} }) {
  const carico = caricoReale(peso, esercizio);
  const rip = Math.floor(Number(ripetizioni) || 0);
  if (carico === null || rip <= 0) return null;
  const piene = ripetizioniPiene(rip);
  const meccanica = fattoreMeccanica(esercizio);
  const grezzo = carico * piene * meccanica;
  return {
    score: Math.round(grezzo * 100) / 100,
    carico,
    ripetizioni: rip,
    ripetizioniPiene: piene,
    meccanica,
    pezzi: `${carico} kg x ${rip} = ${piene} rip. piene`,
  };
}