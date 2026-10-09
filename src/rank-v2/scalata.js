// rank-v2/scalata.js -- le soglie di un esercizio e il Rank che nasce da quelle.
//
// Ste (07/10/2026): "le soglie devono essere costruite sulla difficolta' reale della
// prestazione e non su numeri arbitrari. Non voglio Rank regalati. Se una persona
// e' ancora principiante in un esercizio deve rimanere nei Rank bassi anche se il
// numero in kg puo' sembrare alto".
//
// LA DIFFERENZA CON IL SISTEMA VECCHIO, in una riga:
// prima le 7 soglie erano 7 multipli IDENTICI (0.50, 0.72, 0.88, 1.00, 1.10, 1.22,
// 1.35) del riferimento, quindi BRONZO era sempre il 50% e OLYMPIAN sempre il 135%,
// su QUALSIASI esercizio. Adesso ogni esercizio ha tre numeri veri (ingresso, medio,
// vertice) e le 7 soglie nascono da quelli.
//
// La curva sotto e' SEVERA di proposito: dopo il PLATINUM le soglie si fanno piu'
// radi, cosi' che DIAMOND, TITAN e OLYMPIAN costino il giusto. Chi e' principiante
// non ci arriva con il volume, e ci arriva con il lavoro vero.

import { RANK, divisioneDaLp, divisioneSuccessiva } from '../rank-config.js';
import { moltiplicatoreSerie, ripetizioniPiene } from './curve.js';

/**
 * Le 7 posizioni sulla scala, da ingresso a vertice.
 *
 * 0 = BRONZE (ingresso), 6 = OLYMPIAN (vertice).
 *
 * Nota la parte destra: dopo il PLATINUM (0.42) ci vuole il 18% del restante per
 * ogni gradino, mentre fra bronzo e platino bastava il 10-18%. E' qui che i Rank
 * alti diventano difficili: non sono una riga in piu', sono il pezzo finale.
 */
export const CURVA_SOGLIE = [0, 0.10, 0.24, 0.42, 0.60, 0.78, 1];

/**
 * Le 7 soglie dai tre valori dell'esercizio.
 *
 * @param ingresso il carico da cui l'esercizio e' "affrontato"
 * @param vertice  il carico oltre il quale, per quell'esercizio, sei al massimo
 */
export function soglieDaValori({ ingresso, vertice }) {
  const ing = Number(ingresso);
  const ver = Number(vertice);
  if (!Number.isFinite(ing) || !Number.isFinite(ver) || ing <= 0 || ver <= ing) return null;
  return CURVA_SOGLIE.map((f) => Math.round((ing + (ver - ing) * f) * 100) / 100);
}

/**
 * Quante ripetizioni servono per arrivare a quella soglia, a quel carico.
 *
 * Ste (08/10/2026) ha scelto la strada B: le soglie sono per 8 ripetizioni, il
 * Rank premia le ripetizioni vere, e la schermata deve dire sempre quanto manca.
 *
 * IL PROBLEMA CHE RISOLVE, che era il piu' grosso di tutti:
 * le soglie sono dichiarate in kg per una serie da 8, ma ogni esercizio si fa con
 * un numero di ripetizioni diverso (5, 6, 7, 9...). Quindi chi faceva 6
 * ripetizioni veniva penalizzato due volte: perche' il suo score e' naturalmente
 * piu' basso, e perche' il tetto restava ancorato a 8. Con i numeri veri di Ste:
 * la lat a 88 kg dava il 33% della scala con 8 ripetizioni ma il 6% con 6, e il
 * tricipite al 2% (praticamente "sotto il primo").
 *
 * COME SI LEGGE ADESSO: il Rank dipende dalle ripetizioni vere, che e' giusto
 * (6 ripetizioni pesanti sono meno lavoro di 8, e il motore te lo dice), e in
 * piu' la schermata sa dire "con questi kg ti mancano 2 ripetizioni per il
 * prossimo Rank". Niente viene nascosto e niente viene gonfiato.
 *
 * Il ritorno e' in ripetizioni INTERE: se ne servono 6,4 si risponde 7, perché
 * le ripetizioni sono un numero intero e dire "6,4 ripetizioni" non ha senso.
 */
export function ripetizioniPerSoglia(scoreRiferimento, sogliaTarget, { carico, meccanica = 1 }) {
  const s = Number(sogliaTarget);
  const c = Number(carico);
  const m = Number(meccanica) || 1;
  if (!Number.isFinite(s) || !Number.isFinite(c) || c <= 0 || m <= 0) return null;
  // quante "ripetizioni piene" servono: s = c * piene * m  ->  piene = s / (c*m)
  const pieneNecessarie = s / (c * m);
  if (!Number.isFinite(pieneNecessarie) || pieneNecessarie <= 0) return null;
  // il cammino inverso: quante ripetizioni danno quel numero di rip piene
  let n = 1;
  let piene = 0;
  while (n < 60 && piene < pieneNecessarie) {
    n += 1;
    // riciclo la curva del modulo curve.js senza importarlo due volte
    piene = pienePerRipetizioni(n);
  }
  return Math.max(n, 1);
}

/**
 * Le ripetizioni pesate.
 *
 * Prima qui c'era una copia della formula di curve.js con il decadimento 0,075
 * scritto a mano, per non dipendere dall'ordine degli import. Il problema e' che
 * due copie di una formula diventano due regole: quando ho cambiato la curva per
 *che le ripetizioni contassero meno, questa copia era rimasta indietro e la
 * frase "ti mancano N ripetizioni" diceva il numero sbagliato. Nessuna copia:
 * qui si importa quella vera.
 */
export function pienePerRipetizioni(n) {
  return ripetizioniPiene(n);
}

/**
 * Quanto ti manca per la soglia dopo, in due modi leggibili.
 *
 * - in RIPETIZIONI: quante ne faresti in piu' a questo carico (quando si puo')
 * - in KG: quanto carico in piu' con le ripetizioni che hai gia' fatto
 *
 * Serve perche' un numero solo non basta mai ("ti manca 0,4" non dice niente):
 * chi si allena ha bisogno di sapere se deve aggiungere peso o ripetizioni.
 */
export function distanzaAllaSoglia(score, soglie, indice, { carico, meccanica = 1, ripetizioniFatte = 8 } = {}) {
  // indice -1 = sei SOTTO la prima soglia, e li' la domanda e\' l\'opposta:
  // "come arrivo al primo livello", non "quanto manca al prossimo". Prima
  // usciva "niente: sei in cima" per chi non aveva ancora un Rank, che e\' il
  // contrario della verta\' e il messaggio piu\' importante di tutti.
  if (indice === -1) {
    const prima = soglie[0];
    if (!Number.isFinite(Number(prima))) return null;
    const manca = prima - Number(score);
    if (!Number.isFinite(manca) || manca <= 0) return null;
    const ripTotali = ripetizioniPerSoglia(score, prima, { carico, meccanica });
    const pieneFatte = pienePerRipetizioni(ripetizioniFatte);
    const kgNecessari = Number.isFinite(carico) && carico > 0
      ? Math.round((prima / (pieneFatte * (Number(meccanica) || 1))) * 100) / 100
      : null;
    const LIMITE = 12;
    const ripInPiu = ripTotali ? Math.max(0, ripTotali - Math.floor(ripetizioniFatte)) : null;
    const ripUtili = ripInPiu !== null && ripInPiu <= LIMITE ? ripInPiu : null;
    return {
      sottoPrimaSoglia: true,
      mancaScore: Math.round(manca * 100) / 100,
      ripetizioniNecessarie: ripTotali,
      ripetizioniInPiu: ripUtili,
      ripetizioniImpossibili: ripInPiu !== null && ripUtili === null ? ripInPiu : null,
      kgNecessari,
      frase: 'per sbloccare il primo livello: '
        + (ripUtili === null
          ? (kgNecessari ? `serve piu' carico, circa ${kgNecessari} kg` : 'serve piu\' carico')
          : (ripUtili === 1 ? '1 ripetizione in piu\'' : `${ripUtili} ripetizioni in piu'`))
        + (ripUtili !== null && kgNecessari ? `, oppure ${kgNecessari} kg` : ''),
    };
  }
  if (indice < 0 || indice >= soglie.length - 1) return null;
  const prossima = soglie[indice + 1];
  const manca = prossima - Number(score);
  if (!Number.isFinite(manca) || manca <= 0) return null;
  const ripTotali = ripetizioniPerSoglia(score, prossima, { carico, meccanica });
  const pieneFatte = pienePerRipetizioni(ripetizioniFatte);
  const kgNecessari = Number.isFinite(carico) && carico > 0
    ? Math.round((prossima / (pieneFatte * (Number(meccanica) || 1))) * 100) / 100
    : null;
  // qui stava un difetto mio: la frase diceva "N ripetizioni in piu'" usando il
  // TOTALE necessario, quindi se ne servivano 8 a te che ne facevi 7 leggevi
  // "8 ripetizioni in piu'" invece di "1". Un numero che sbaglia di sette
  // ripetizioni fa prendere decisioni sbagliate in palestra.
  //
  // E poi un difetto piu' grossa, trovato girando l'app per davvero: quando la
  // soglia successiva e' vicina ma il carico non puo' salire (i dischi vanno a
  // scatti di 2,5 kg), il calcolo delle ripetizioni usciva con "52 ripetizioni
  // in piu'": vero sul piano del punteggio, ma nessuno in palestra fa 60
  // ripetizioni di chest press. Un numero che si puo' calcolare ma che non si puo'
  // fare non serve a niente, quindi oltre il limite si dice solo il peso.
  const LIMITE_RIPETIZIONI = 12;
  const ripInPiu = ripTotali ? Math.max(0, ripTotali - Math.floor(ripetizioniFatte)) : null;
  const ripUtili = ripInPiu !== null && ripInPiu <= LIMITE_RIPETIZIONI ? ripInPiu : null;
  const fraseRip = ripUtili === null
    ? null
    : ripUtili === 1
      ? '1 ripetizione in piu\''
      : `${ripUtili} ripetizioni in piu'`;
  return {
    mancaScore: Math.round(manca * 100) / 100,
    ripetizioniNecessarie: ripTotali,
    ripetizioniInPiu: ripUtili,
    ripetizioniImpossibili: ripInPiu !== null && ripUtili === null ? ripInPiu : null,
    kgNecessari,
    frase: ripUtili === null
      // oltre il limite di ripetizioni si dice solo il peso, e senza la "o" in
      // mezzo: una frase con la congiunzione e senza il primo membro ("o 95 kg")
      // e' grammatica rotta e sembra un errore
      ? (kgNecessari ? `circa ${kgNecessari} kg in piu' con le ripetizioni che hai` : 'serve piu\' carico')
      : `${fraseRip} a questo carico, o circa ${kgNecessari} kg con le ripetizioni che hai`,
  };
}

/**
 * Dal punteggio al Rank, con gli LP dentro.
 *
 * Regole che ho fissato e che diventano test:
 *  - il volume (le serie) spinge gli LP dentro il Rank che hai;
 *  - per far salire di RANK col solo volume, la tua serie migliore deve essere
 *    gia' vicina alla soglia: sotto il 92% il volume non basta e viene fermato,
 *    e te lo dico, perche' un Rank deve dire quanto sei forte;
 *  - nessun Rank si compra con una serie sola e niente di piu': il volume massimo
 *    e' il 20% e resta dentro quel vincolo.
 */
export const SOGLIA_PER_CROSSARE = 0.92;

export function rankDaScore(score, soglie, { serieFatte = 1 } = {}) {
  const sog = Array.isArray(soglie) ? soglie : [];
  if (!sog.length) return { rank: null, indice: -1, lp: 0, motivo: 'nessuna soglia' };
  const valore = Number(score);
  if (!Number.isFinite(valore)) return { rank: null, indice: -1, lp: 0, motivo: 'nessun punteggio' };

  // la serie migliore da sola: e' questa che decide il Rank onesto
  const conSerie = valore * moltiplicatoreSerie(serieFatte);
  const onesto = bandaDaValore(conSerie, sog);
  const daSola = bandaDaValore(valore, sog);
  const haVolume = serieFatte > 1 && onesto.indice > daSola.indice;

  if (haVolume && valore < sog[daSola.indice + 1] * SOGLIA_PER_CROSSARE) {
    // Il volume voleva farti salire ma la tua serie migliore non e' ancora vicina
    // alla soglia.
    //
    // QUI C'ERA UN BUG MIO, e me lo ha fatto vedere il test V6: restituivo la
    // fascia calcolata sul numero CON il volume, quindi il Rank era gia' salito
    // ("bloccato" ma salito). Il blocco deve valere per il RANK, non per gli LP:
    // quindi qui si tiene la fascia della serie migliore e si prende solo il
    // merito delle serie, cioe' gli LP, fermati dentro quella fascia.
    const fermato = { ...daSola };
    fermato.lp = lpDentro(conSerie, sog, daSola.indice);
    // QUI STAVA UN BUG MIO: gli LP venivano ricalcolati a mano ma la divisione
    // restava quella del Record senza volume. Il risultato era una contraddizione
    // che Ste aveva gia' segnalato una volta ("99 LP" con "platinum 2"):
    // fermando il volume a 99 LP la divisione restava "I", che vuol dire "la
    // piu' bassa", mentre 99 LP dovrebbero dire "III", la piu' alta. La divisione
    // si ricalcola SEMPRE dagli LP, in un posto solo.
    fermato.divisione = divisioneDaLp(fermato.lp);
    // E POI UN ALTRO, PIU' VISIBILE AGLI OCCHI DI STE.
    //
    // "progresso" e' la barra che vede a schermo. Prima qui finiva 1,000: la barra
    // si mostrava PIENA con due serie, ma il Rank non era cambiato e la soglia
    // dopo non era stata toccata. Cioe' l'app diceva "hai finito" mentre non
    // aveva finito niente, che e\' il modo peggiore di mentire.
    //
    // Ora la barra resta ferma sul posto del LAVORO VERO (la serie migliore da
    // sola), e il merito delle serie si legge negli LP. Il volume spinge gli LP
    // dentro il Rank che hai, non la barra verso il Rank dopo: e\' esattamente la
    // regola secca di Ste, resa visibile.
    fermato.progresso = daSola.progresso;
    fermato.progressoConVolume = progressoDentro(conSerie, sog, daSola.indice);
    fermato.volumeBloccato = true;
    fermato.lpConVolume = onesto.lp;
    fermato.rankCheAvrestiAvuto = onesto.rank;
    fermato.massimoRichiesto = Math.round(sog[daSola.indice + 1] * SOGLIA_PER_CROSSARE * 100) / 100;
    return fermato;
  }
  // LA BARRA SEMPRE SUL LAVORO VERO, E ADESSO SEMPRE (08/10/2026).
  //
  // Prima la barra si fermava sul lavoro vero SOLO quando il volume veniva fermato
  // (il ramo sopra). Quando invece il volume riusciva a spingere dentro la stessa
  // fascia, la barra prendeva `onesto.progresso`, cioe' il numero COL volume: e
  // allora due serie identiche movevano la barra quanto una serie piu' pesante.
  //
  // Il caso vero, con i numeri di Ste (corpo 66, chest press 35 kg x 8):
  //
  //   1x8  -> GOLD   1 LP  barra   1%
  //   2x8  -> GOLD  48 LP  barra  49%
  //   3x8  -> GOLD  77 LP  barra  77%
  //
  // Stesso esercizio, stesso peso, e la barra arriva al 77% perche' ha fatto tre
  // volte la stessa identica serie. Non e' sbagliato (tre serie SONO piu' lavoro),
  // ma e' una cosa che si rompe appena cambi qualcosa: prima del 15% sugli ingressi
  // la 3a serie cambiava fascia, quindi la barra saliva "onestamente" e il test
  // passava senza accorgersene. Con gli ingressi bassi non cambia piu' fascia, e il
  // gonfiaggio e' comparso.
  //
  // Ste ha deciso: "barra = lavoro vero". Quindi qui sotto `progresso` e' SEMPRE
  // quello della serie migliore da sola, e il volume si legge solo negli LP. E'
  // la regola che rende impossibile comprare una fascia col volume.
  const fermo = { ...onesto };
  fermo.progresso = daSola.progresso;
  fermo.volumeBloccato = false;
  // `progressoConVolume` resta il posto dove si vede quanto avrebbe fatto la barra
  // col volume, se un domani volessi mostrarlo. Serve anche alla schermata per
  // spiegare "con 3 serie saresti al 77%". Non e' mai la barra principale.
  fermo.progressoConVolume = onesto.progresso;
  return fermo;
}

/** Gli LP che il volume ti porta a prendere, fermati dentro la fascia data. */
function lpDentro(valore, soglie, indice) {
  if (indice < 0) return 0;
  if (indice >= soglie.length - 1) {
    const base = soglie[indice] || 1;
    return Math.max(0, Math.round(((valore - base) / base) * 100));
  }
  const sotto = soglie[indice];
  const spessore = soglie[indice + 1] - sotto || 1;
  return Math.max(0, Math.min(99, Math.floor(((valore - sotto) / spessore) * 100)));
}

/** La percentuale di riempimento della fascia, fermata dentro la fascia data. */
function progressoDentro(valore, soglie, indice) {
  if (indice < 0) return 0;
  if (indice >= soglie.length - 1) return 1;
  const sotto = soglie[indice];
  const spessore = soglie[indice + 1] - sotto || 1;
  return Math.max(0, Math.min(1, (valore - sotto) / spessore));
}

/** In quale fascia cade questo punteggio, e a quanti LP sei dentro. */
function bandaDaValore(valore, soglie) {
  if (valore <= soglie[0]) {
    return {
      indice: -1, rank: null, divisione: null, lp: 0, progresso: 0, sottoSoglia: true,
      mancaAllaPrima: Math.round((soglie[0] - valore) * 100) / 100,
    };
  }
  let indice = 0;
  for (let i = 0; i < soglie.length; i++) if (valore >= soglie[i]) indice = i;
  const inCima = indice === soglie.length - 1;
  let lp = 0;
  let progresso = 1;
  if (inCima) {
    const base = soglie[indice] || 1;
    lp = Math.max(0, Math.round(((valore - base) / base) * 100));
  } else {
    const sotto = soglie[indice];
    const sopra = soglie[indice + 1];
    const spessore = sopra - sotto || 1;
    lp = Math.max(0, Math.min(99, Math.floor(((valore - sotto) / spessore) * 100)));
    progresso = Math.max(0, Math.min(1, (valore - sotto) / spessore));
  }
  // la divisione: I e' la piu' bassa e III la piu' alta (Ste, 07/10/2026)
  const divisione = inCima ? null : divisioneDaLp(lp);
  // l'oggetto rank deve avere 'indice' per compatibilita' con il codice che
  // leggeva rank.indice dal motore vecchio. Senza questo, record[0].rank.indice
  // era undefined e i confronti (a.rank.indice > b.rank.indice) davano sempre
  // false, rompendo l'ordinamento della lista Rank.
  const rank = RANK[indice] ? { ...RANK[indice], indice } : null;
  return {
    indice,
    rank,
    divisione,
    lp,
    progresso,
    sottoSoglia: false,
    prossimaSoglia: inCima ? null : soglie[indice + 1],
    prossimoRank: inCima ? null : (RANK[indice + 1] || null),
    prossimaDivisione: inCima ? null : divisioneSuccessiva(divisione),
  };
}