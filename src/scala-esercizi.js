/**
 * La scala di ogni esercizio, cioe' quanto deve spostare una persona REALISTA.
 *
 * Ste (04/10/2026): "non voglio che tutti gli esercizi e tutti i muscoli vengano
 * considerati equivalenti. La difficolta' deve essere valutata in modo relativo.
 * Non e' corretto confrontare direttamente 40 kg di curl con 40 kg di lat machine
 * o 40 kg di chest press."
 *
 * Aveva ragione, ed e' il difetto di fondo di tutta la versione precedente. Prima
 * c'era UNA tabella sola per livello (isolamento 0.34, composto 0.90, grande 1.85
 * del peso corporeo), quindi tutte le spinte composte valevano uguale, tutte le
 * tirate composte valevano uguale, e tutti gli isolamenti valevano uguale. Ma un
 * curl e una lat machine non hanno niente a che fare fra loro: e' esattamente il
 * confronto che dice di non fare.
 *
 * COME E' FATTO, in modo semplice e modificabile
 *
 *  - Ogni esercizio ha un numero: il MASSIMALE che una persona forte ma non
 *    professionista sposta, su un corpo di riferimento di 70 kg. Non il record
 *    del mondo, non il massimale di un campione: quello che uno si aspetta da
 *    chi si allena bene.
 *  - Quel numero si riporta sul peso vero della persona: se pesa 66 kg invece di
 *    70, la scala si abbassa del 6%. E' l'unico posto in cui compare il peso
 *    corporeo, cosi' non si sposta niente in giro.
 *  - Se un giorno un esercizio non e' in tabella si cerca il movimento a cui
 *    appartiene, cosi' un esercizio nuovo non resta senza scala.
 *
 * Perche' i numeri sono cosi' e non altro: sono valori prudenti di "chi si allena
 * bene", non misurati su Ste. Se sono sbagliati, si cambiano in una riga di
 * questo file e nient'altro si muove. Per questo il Rank mostra sempre da dove
 * viene la soglia: un numero sbagliato, almeno, si vede.
 *
 * I valori sono nel STESSO UNITA' con cui l'esercizio si registra. Cioe' se un
 * esercizio e' "per braccio", anche la scala e' per braccio: cosi' nessuna
 * conversione puo' sbagliarsi.
 */

// massa di riferimento: i numeri sotto sono per un corpo di questa taglia

/*
 * ATTENZIONE ALL'UNITA' DI MISURA
 *
 * Ste: "il massimale deve restare il numero di peso che metto in una sola parte".
 * Quindi un numero di questa tabella e' SEMPRE nella stessa unita' con cui
 * l'esercizio si registra:
 *
 *  - se l'esercizio e' "per braccio" o "per gamba", il numero e' quello di UN lato
 *  - se e' al cavo doppio carrucola, il numero e' il peso che si SENTE, cioe'
 *    meta' di quello che segna il carrello
 *
 * Prima la scala era "tutto insieme" e il massimale no, quindi i due numeri non
 * erano confrontabili. E' la classe di errore che mi ha fatto sbagliare tre volte
 * in una settimana: quando due numeri hanno due unita' diverse, prima o poi
 * qualcuno li confronta e ottiene una sciocchezza.
 */
export const PESO_RIFERIMENTO_SCALA = 70;

/**
 * Scala per movimento, usata quando un esercizio non ha un numero suo.
 * Ste ha chiesto esplicitamente che i muscoli abbiano scale diverse:
 * bicipiti, petto, dorso, spalle, gambe non si confrontano fra loro.
 */
export const SCALA_PER_MOVIMENTO = {
  gambe_pesanti: 210,
  spinta_orizzontale: 95,
  tirata_verticale: 110,
  tirata_orizzontale: 110,
  spinta_verticale: 60,
  petto_isolamento: 34,
  spalle_isolamento: 13,
  bicipiti: 32,
  tricipiti: 32,
  gambe_isolamento: 88,
  core: 0,
};

/**
 * Scala per esercizio. Va tenuta vicino a zero: meglio "sposta il numero qui"
 * che "aggiungi un correttore" da un'altra parte. Solo se sono davvero diversi dai
 * numeri sopra.
 */
export const SCALA_ESERCIZI = {
  "ex-chest-press": 50,
  "ex-smith-incline-bench": 48,
  "ex-dumbbell-bench-pull": 45,
  "ex-neutral-grip-lat-pulldown": 115,
  "ex-lat-pulldown-lats": 108,
  "ex-iso-lateral-row": 90,
  "ex-seated-cable-row": 115,
  "ex-seated-db-shoulder-press": 58,
  "ex-cable-lateral-raise": 13,
  "ex-dumbbell-lateral-raise": 12,
  "ex-one-arm-cable-reverse-fly": 16,
  "ex-chest-supported-shrug": 120,
  "ex-cable-hammer-curl": 32,
  "ex-scott-bench-curl": 32,
  "ex-one-arm-dumbbell-preacher-curl": 30,
  "ex-single-arm-tricep-pushdown": 30,
  "ex-cable-overhead-tricep-extension": 30,
  "ex-wrist-curl": 34,
  "ex-single-leg-press": 100,
  "ex-sled-press-calf-raise": 140,
  "ex-leg-extension": 92,
  "ex-seated-leg-curl": 85,
};

/**
 * L'ultimo ripiego: la scala del LIVELLO, quando il nome non sta in tabella e il
 * movimento non e' riconosciuto.
 *
 * Serve perche' Ste ha detto una cosa che e' anche un requisito tecnico:
 * "ogni esercizio deve avere la sua scala". Se qui tornasse null, un esercizio
 * nuovo con un nome che il classificatore non conosce resterebbe senza soglie, e
 * la pagina di quell'esercizio si romperebbe. Non va bene: meglio una scala
 * generica del livello che un esercizio che non si apre.
 */
const SCALA_PER_LIVELLO = {
  grande: 210,
  composto: 95,
  isolamento: 32,
  assistito: 0,
};

/** La scala di un esercizio, in kg di massimale, sul corpo di riferimento. */
export function scalaEsercizio({ id = '', movimento = null, livello = null } = {}) {
  const perId = SCALA_ESERCIZI[id];
  if (Number.isFinite(perId)) return perId;
  const perMovimento = SCALA_PER_MOVIMENTO[movimento];
  if (Number.isFinite(perMovimento)) return perMovimento;
  const perLivello = SCALA_PER_LIVELLO[livello];
  if (Number.isFinite(perLivello)) return perLivello;
  // davvero non si sa niente: restituisco il composto, che e' il caso medio, e
  // non un numero che sembri sicuro e non lo e'
  return 95;
}

/** La scala riportata sul peso vero della persona. */
export function scalaSulCorpo(scala, pesoCorporeo) {
  if (!Number.isFinite(scala)) return null;
  const peso = Number(pesoCorporeo);
  if (!Number.isFinite(peso) || peso <= 0) return scala;
  return Math.round(scala * (peso / PESO_RIFERIMENTO_SCALA) * 100) / 100;
}
