/**
 * scala-esercizi.js -- i numeri che Ste ha verificato con le sue mani.
 *
 * QUI dentro ci sta una cosa sola: i numeri che qualcuno ha guardato e approvati,
 * scritti uno per esercizio. Nient'altro. Non ci sono regole, non ci sono
 * riparazioni, non ci sono livelli: solo numeri verificati.
 *
 * Perche' un file così piccolo, con 20 righe in 175?
 *
 * Perche' la scala di un esercizio si CALCOLA (vedi scala-auto.js) e i numeri
 * verificati sono le eccezioni. Il contrario di prima, quando la tabella era
 * l'unica fonte e ogni riga poteva sbagliare l'unita': in una settimana sono
 * usciti sette errori uno dietro l'altro (lo shrug con 120, che È un numero da
 * bilanciere; le tirate tarate su 1.64 volte il peso; il -23,2 kg della media).
 *
 * Quindi la regola È UNA, e vale per tutto:
 *
 *   il numero scritto qui È SEMPRE nella stessa unita' con cui l'esercizio si
 *   registra, e non si converte niente.
 *
 *  - se l'esercizio È "per braccio" / "per gamba" / "per manubrio", il numero È
 *    quello di UN lato, e il Rank confronta il numero che hai scritto con questo
 *    numero: 35 contro 35, senza raddoppi e senza dimezzi;
 *  - se È al cavo a doppia carrucola, il numero È il peso che si SENTE (cioe'
 *    meta' di quello che segna il carrello). Il dimezzamento del carrello È
 *    già in pesoReale(), dentro rank.js: È li' che si converte, una volta
 *    sola, sulla prestazione. Qui il riferimento È già nel numero che il
 *    confronto usa.
 *
 * Ste: "il massimale deve restare il numero di peso che metto in una sola parte".
 * E il numero qui dentro È quello che mette in una sola parte.
 */

// massa di riferimento: i numeri sotto sono per un corpo di questa taglia
export const PESO_RIFERIMENTO_SCALA = 70;

/**
 * Scala per esercizio, verificata a mano.
 *
 * Tenuta VOLONTARIAMENTE corta. Ogni riga qui dentro È un impegno: qualcuno ha
 * guardato quell'esercizio e ha detto "questo È il numero giusto". Se un esercizio
 * non cÈ, non È un buco: la scala la calcola scala-auto.js dal movimento e da
 * come' È fatto il carico. Quindi si mette qui solo quello che il calcolo NON
 * sa fare: le eccezioni vere (il suo Smith, la sua chest press a dischi, la
 * posizione corta del suo curl).
 *
 * Perche' si sa quali sono: sono i numeri corretti a mano dopo che una scala
 * automatica aveva detto una cosa sbagliata. Ogni riga ha la spiegazione del
 * numero che c'era prima e perchÈ era sbagliato: se un giorno il file torna
 * pieno di numeri senza spiegazione, vuol dire che la scala automatica non
 * funziona e va rifatta.
 *
 * DUE RIGHE MORTE, LE HO TROVATE E TOLTE (il test S15 le cerca, e adesso non
 * ne può sfuggire un'altra)
 *
 *  - "ex-cable-overhead-tricep-extension": l'esercizio si chiama
 *    "ex-cable-overhead-tricep", quindi quel 30 non È mai entrato in funzione e
 *    l'overhead tricep ha sempre preso la scala del movimento (32). Il 30 era
 *    un numero copiato (accanto c'era il pushdown, anch'esso 30).
 *  - "ex-dumbbell-lateral-raise": l'esercizio si chiama "ex-db-lateral-raise",
 *    quindi quel 12 non È mai entrato in funzione e l'alzata laterale con i
 *    manubri ha sempre preso la scala del movimento (13). Anche questo era un
 *    numero copiato (accanto c'era la alzata laterale al cavo, 13).
 *
 * In entrambi i casi la scala non cambia: senza la riga morta quegli esercizi
 * prendono la scala calcolata, che È la stessa di prima. Non ho corretto gli id
 * perchÈ così avrei cambiato una soglia con un numero mai verificato.
 */
export const SCALA_ESERCIZI = {
  "ex-chest-press": 50,
  // 48 era un numero da bilanciere. Lui i dischi li mette su ENTRAMBI i lati del
// bilanciere, 30 per lato, e sui rails della Smith il percorso È guidato: scala
// intorno ai 30-32 per lato.
"ex-smith-incline-bench": 32,
  "ex-dumbbell-bench-pull": 45,
  // Ste (04/10/2026): "la lat machine e la seated cable row sono di tirata, faccio
  // quasi 30kg in più del mio corpo, come può essere sotto il 100%?"
  //
  // Aveva ragione: avevo tarato le TIRATE su 1.64 volte il peso corporeo, che È la
  // fascia di chi È molto forte. Lui faceva 1.36, che È un numero solido.
  //
  // La regola che tengo da qui in avanti, e che dice di non tarare su di lui:
  //   sotto 1.3 volte il peso -> il riferimento È troppo alto, si abbassa
  //   tra 1.3 e 1.5        -> numero giusto
  //   sopra 1.5             -> il riferimento È troppo basso, si alza
  // Le tirate vanno portate a circa 1.45 volte il peso: la fascia media di chi si
  // allena bene. Non al 100% a ogni costo, perchÈ allora l'app non distingue più
  // nessuno.
  "ex-neutral-grip-lat-pulldown": 102,
  "ex-lat-pulldown-lats": 101,
  "ex-seated-cable-row": 102,
  "ex-iso-lateral-row": 50,
  // 58 era un numero da manubri bilaterali. Lui lo fa con i MANUBRI, 30 kg per
// mano, da seduto: la scala deve stare intorno ai 30-32 che È quanto sposta in
// modo decente una persona forte con i manubri, per un braccio.
"ex-seated-db-shoulder-press": 32,
  "ex-cable-lateral-raise": 13,
  "ex-one-arm-cable-reverse-fly": 16,
  // 120 era un numero da bilanciere, e lui lo fa con i MANUBRI: 45 kg per mano.
  // Ste (04/10/2026): "di chest supported dumbbell shrug faccio 45kg per braccio e
  // non penso che ti aspetti di più da uno del mio peso". Quindi la scala di
  // quell'esercizio deve stare intorno ai 45 che lui solleva, non a 120.
  "ex-chest-supported-shrug": 45,
  "ex-cable-hammer-curl": 32,
  // 32 era un numero da curl bilaterale. Lui lo fa a UN braccio alla volta, 20 kg
  // per mano, e con il braccio in alto che È la posizione corta, quindi la posizione
  // difficile: scala intorno ai 21.
  "ex-scott-bench-curl": 21,
  // 30 era un numero da curl bilaterale. Lui lo fa a un braccio solo, 18 kg per
  // mano, col braccio appoggiato che aiuta ma stringe il movimento.
  "ex-one-arm-preacher-curl": 19,
  "ex-single-arm-tricep-pushdown": 30,
  "ex-wrist-curl": 34,
  // QUI C'ERA "ex-single-leg-press: 40", e l'ho tolta (Ste, 06/10/2026).
  //
  // Il 40 era un numero PRESTATO dalla leg press normale a 100 kg per lato, che È
  // un esercizio diverso fatto su un'altra macchina. Non era un numero verificato:
  // era la mia stima. Ste: "il riferimento viene dalla leg press normale a 100 per
  // lato che facevi prima, ma l'obliqua È un esercizio diverso".
  //
  // Adesso quell'esercizio prende la base derivata (scala-auto.js), che vale 34
  // e ha una ragione scritta. La riga non È stata sostituita con un 34 "verificato"
  // perchÈ mettere li' un numero che nessuno ha verificato È esattamente il
  // difetto di questo file.
  "ex-sled-press-calf-raise": 140,
  "ex-leg-extension": 92,
  "ex-seated-leg-curl": 85,
};

/**
 * Il numero verificato di quell'esercizio, o null se non È verificato.
 *
 * Il nome È volutamente diverso da "scala dell'esercizio": questo file NON sa
 * calcolare la scala, sa solo dire se un numero È stato approvato. Chiamarlo
 * "scalaEsercizio" È stato proprio l'errore che ha fatto sette bug: due cose
 * diverse con lo stesso nome, e chi scriveva il codice non sapeva quale stesse
 * usando.
 */
export function scalaVerificata(id) {
  const n = SCALA_ESERCIZI[id || ''];
  return Number.isFinite(n) ? n : null;
}

/** La scala riportata sul peso vero della persona. */
export function scalaSulCorpo(scala, pesoCorporeo) {
  if (!Number.isFinite(scala)) return null;
  const peso = Number(pesoCorporeo);
  if (!Number.isFinite(peso) || peso <= 0) return scala;
  return Math.round(scala * (peso / PESO_RIFERIMENTO_SCALA) * 100) / 100;
}
