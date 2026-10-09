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

/**
 * Quanto contano le RIPETIZIONI rispetto ai kg. Ste (08/10/2026):
 * "non devono contare troppissimo le ripetizioni eh".
 *
 * IL NUMERO CHE HA FATTO TROVARE IL PROBLEMA (tools/prova-rep.mjs):
 * a STESSO carico, passando da 5 a 12 ripetizioni, il Rank saltava di 4-7 pezzi:
 *   lat pulldown 88 kg: 5 rip = BRONZE, 12 rip = OLYMPIAN   (6 Rank!)
 *   shoulder press 30 kg: 5 rip = nessun livello, 12 rip = OLYMPIAN (7 Rank!)
 * Sette Rank senza alzare un grammo. Non e' che le ripetizioni contassero troppo:
 * e' che contavano TUTTO, e il Rank di un esercizio dipendeva da quante volte hai
 * deciso di spingere quella serie.
 *
 * IL RIMEDIO, che e\' una curva CONCAVATA invece che lineare.
 *
 * Prima la curva era (approssimata) lineare sulle ripetizioni: ogni ripetizione
 * valeva sempre di piu\' della precedente (la 12a valeva 0,85 della prima), quindi
 * il volume si somava quasi tutto. Adesso ogni ripetizione vale sempre MENO della
 * precedente (la 12a vale 0,30 della prima), quindi il volume conta ma non
 * comanda: raddoppiare le ripetizioni non vale il raddoppio, e soprattutto non
 * fa saltare sei Rank.
 *
 * IL VALORE SCELTO, e perche\' non 0,5.
 *
 * Con 0,5 le ripetizioni contavano ancora troppo poco: 5 ripetizioni valevano il
 * 97% di 8 (appena un 3% di differenza, e i Rank non si muovevano affatto, il
 * test V1b se n\'e\' accorto) e soprattutto la curva SATURAVA a 20 ripetizioni:
 * 20 e 40 valevano entrambe 1,004. E\' esattamente il difetto che questo file
 * promette di non avere, cioe\' la ripartizione del sistema vecchio con il tetto
 * "peso x 4,3".
 *
 * Con 0,8 invece: 5 ripetizioni valgono l\'81% di 8 (il 39% in piu\' andando a 12,
 * contro il 101% di prima) e la curva continua a crescere fino a 40 ripetizioni
 * (+20%). Quindi le ripetizioni contano POCO ma contano, e non c\'e\' nessun
 * punto in cui smettono di contare. E\' il compromesso che cercavo, e i numeri
 * sono in tools/scegli-curva.mjs.
 *
 * Nota anche l\'effetto sulle prime ripetizioni: la 5a vale ancora 0,61 della
 * prima (non 0,60 come con la curva vecchia, non 0,19 come con 0,5). Quindi un
 * set corto non viene azzerato, e uno lungo non viene premiato alle stelle.
 */
export const FATTORE_RIPETIZIONI = 0.65;

/**
 * Le ripetizioni di riferimento: la serie da 8, perche' e' il modo in cui si
 * ragiona ("3x8") e il punto in cui la curva vale esattamente 1,0.
 *
 * Sta QUI e non in valori.js perche' valori.js importa curve.js: se il numero
 * fosse li, perche' lo usa qui, i due moduli si importerebbero a vicenda e Node
 *direbbe "ReferenceError: RIPETIZIONI_RIFERIMENTO is not defined". Il ciclo
 *appare solo quando qualcuno lo tocca, quindi e' il tipo di errore che resta
 * nascosto finche' non lo trovi.
 */
export const RIPETIZIONI_RIFERIMENTO = 8;

/**
 * Le ripetizioni pesate: quante "ripetizioni piene" fa una serie.
 *
* 5 -> 0,81   8 -> 1,00   12 -> 1,12   20 -> 1,19   30 -> 1,20   40 -> 1,20
 *
 * Nota: il numero sale ANCORA, quindi chi fa piu\' ripetizioni prende di piu\' e
 * la curva NON satura mai (nel sistema vecchio sopra 30 ripetizioni la stima si
 * fermava a "peso x 4,3", un numero inventato che non cresceva piu\'). Ma sale
 * piano: da 8 a 20 ripetizioni il punteggio cresce del 19%, non del 95%.
 */
export function ripetizioniPiene(ripetizioni) {
  const r = Math.floor(Number(ripetizioni) || 0);
  if (r <= 0) return 0;
  const limite = Math.min(r, 40); // oltre 40 il numero non significa piu' niente
  let totale = 0;
  for (let i = 1; i <= limite; i++) totale += Math.pow(FATTORE_RIPETIZIONI, i - 1);
  // normalizzo sulla 8a ripetizione: cosi\' "8 ripetizioni" = 1,0 esatto e le
  // soglie dichiarate per 8 ripetizioni sono coerenti con la curva
  const riferimento = sommaGeometrica(RIPETIZIONI_RIFERIMENTO);
  return Math.round((totale / riferimento) * 1000) / 1000;
}

/** La somma geometrica dei primi n termini con ragione FATTORE_RIPETIZIONI. */
export function sommaGeometrica(n) {
  const limite = Math.min(Math.max(1, Math.floor(Number(n) || 1)), 40);
  let totale = 0;
  for (let i = 1; i <= limite; i++) totale += Math.pow(FATTORE_RIPETIZIONI, i - 1);
  return totale;
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
 * L'esercizio si fa su UN BRACCIO alla volta?
 *
 * E' la domanda che decide se la doppia carrucola dimezza, e nel 08/10/2026 ha
 * fatto fallire due esercizi di Ste.
 *
 * IL CASO: "Single Arm Tricep Pushdown", 21 kg, e Ste: "di tricipiti pushdown
 * monobraccio faccio 21kg e' isolamento e sono solo bronzo?". Non era bronzo:
 * nessun livello. Il motivo era qui sotto. La regola "la doppia carrucola
 * dimezza" e' giusta per gli esercizi che fai A DUE BRACCIA INSIEME (la corda
 * del fly, il curl, le alzate laterali): leggi 50 kg, ne fai 25 per braccio.
 *
 * Ma il pushdown MONOBRACCIO si fa con un manubrio solo: leggi 21 kg e quei
 * 21 kg sono gia' del tuo braccio. L'app li dimezzava a 10,5, quindi metà del
 * tuo lavoro spariva e tu restavi sotto la soglia d'ingresso senza saperlo.
 *
 * La regola e' gia' scritta piu' in basso, in questo stesso file, ma senza la
 * condizione: "la doppia carrucola dimezza, perche' su una doppia carrucola
 * lavori un braccio alla volta". Il "lavori un braccio alla volta" e' vero
 * anche quando lavori un braccio SOLO, ed e' proprio li' che il numero e' gia'
 * per braccio.
 *
 * Quindi: si dimezza solo se l'esercizio si fa a due braccia. Il nome e' la
 * prova, perche' e' l'unica cosa che distingue un monobraccio da un
 * "a due braccia con lo stesso attrezzo": non c'e' un campo dedicato.
 */
export function lavoroMonobraccio(esercizio = {}) {
  const e = esercizio || {};
  const nome = String(e.nome || e.id || '').toLowerCase();
  return /single arm|one arm|single-arm|one-arm|monobraccio|un braccio|mono.?arm/.test(nome);
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
 *
 * LA ECCEZIONE (08/10/2026), e sta per questo qui e non in un altro posto:
 * se l'esercizio e' MONOBRACCIO non si dimezza. Vedi `lavoroMonobraccio` per
 * il caso di Ste con i 21 kg del pushdown che diventavano 10,5.
 */
export function caricoReale(peso, esercizio = {}) {
  const p = Number(String(peso === null || peso === undefined ? '' : peso).replace(',', '.'));
  if (!Number.isFinite(p) || p <= 0) return null;
  const e = esercizio || {};
  if (e.carrucola === 'carrucola_doppia' && !lavoroMonobraccio(e)) {
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