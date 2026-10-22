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

import { RANK, divisioneDaLp, divisioneSuccessiva, pesoPiuVicino, pesiCaricabili } from '../rank-config.js';
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
  // LE SOGLIE DEL MOTORE RESTANO CON I DECIMALI, E NON SI ARROTONDANO MAI (16/10/2026).
  //
  // Ste ha dato la lista dei pesi della palestra ("2 4 6 7 8 10 12 12,5 14 15 16 18
  // 20 22 24 26 28 30 32,5 35 37,5 40 42,5 45 47,5 50 60 kg") perche' sulla scheda
  // leggeva soglie tipo 18,42 kg, che non si comprano.
  //
  // SONO STATI PROVATI DUE MODI DI USARE LA LISTA, E SONO ENTRAMBI SBAGLIATI. Il
  // primo, arrotondare a kg intero: sul corpo di 66 kg le soglie diventavano
  // 13/15/17/21/24/27/31, i suoi 18 kg x 8 ripetizioni tornavano ARGENTO 96 (erano ORO
  // 13) e sul corpo da 100 kg i suoi stessi 18 kg non prendevano piu' nessun Rank.
  //
  // Il secondo, arrotondare sul peso reale piu' vicino (quello che ho provato adesso,
  // ed e' quello che fa sbagliare i test): il difetto e' che il passo NON e' di 1 kg, e
  // su una forcella stretta di peso corporeo due soglie diverse finiscono sullo stesso
  // manubrio. Il tetto smette di salire ("pesando di piu' il tetto deve salire:
  // 60 -> 60") e la scala si accavalla: un Rank diventa irraggiungibile e il successivo
  // salta. Non e' un problema estetico, e' la scala che smette di funzionare.
  //
  // QUINDI: il motore tiene i suoi numeri esatti, e la lista dei pesi serve SOLO per
  // quello che si legge. Vedi `kgPerLaLettura`.
  return CURVA_SOGLIE.map((f) => Math.round((ing + (ver - ing) * f) * 100) / 100);
}

/**
 * Le soglie come le vede l'utente: il peso REALE che c'è e che BASTA davvero.
 *
 * IL PUNTO CHE MANCAVA (16/10/2026). Le soglie sono in PUNTEGGIO, non in kg, e il
 * punteggio dipende dal movimento: a 8 ripetizioni e` kg x meccanica, e la meccanica
 * cambia da esercizio a esercizio. Sui CAVI c'e' di piu': la soglia e` per lato ma il
 * peso che si registra e` quello del carrello, quindi con la doppia carrucola il
 * numero che si mette e` il doppio. Dividere per la meccanica, come faceva la v203,
 * dava sul Cable Lateral Raise "BRONZE da 7 kg" mentre 7 kg sul carrello non
 * prendevano nessun Rank (servivano 14, perche' sono 7 per lato).
 *
 * QUINDI SI SMETTE DI CALCOLARE E SI CERCA. `scoreDi(kg)` dice che punteggio dà un
 * peso a 8 ripetizioni, e la soglia viene tradotta nel PRIMO peso caricabile che la
 * raggiunge. Non c'e' piu' nessuna formula da indovinare: il numero e' verificato, e
 * per costruzione quello che leggi e' quello che il motore fa.
 *
 * Il riferimento e' 8 ripetizioni perche' e` cosi' che le soglie sono definite
 * (`CURVA_SOGLIE`, e la scelta di Ste dell'08/10: le soglie sono per 8 ripetizioni e
 * il Rank premia le ripetizioni vere).
 */
export function soglieLegibili(soglie, scoreDi, passo = 1) {
  if (typeof scoreDi !== 'function') return soglie;
  const pesi = pesiCaricabili(passo);
  return soglie.map((s) => {
  const trovato = pesi.find((kg) => scoreDi(kg) >= s);
  if (trovato !== undefined) return trovato;
  // nessun peso della lista arriva: si lascia il numero più vicino, con lo stesso passo
  return pesoPiuVicino(s, { passo });
  });
}

/**
 * Una soglia sola, come la vede l'utente. Serve a `kgPerLaLettura`, che e' il nome
 * che si usa in `app.js`.
 */
export function kgPerLaLettura(soglia, scoreDi, passo = 1) {
  if (typeof scoreDi !== 'function') return pesoPiuVicino(soglia, { passo });
  return soglieLegibili([soglia], scoreDi, passo)[0];
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
 * Un kg che si può davvero mettere sul bilanciere.
 *
 * IL NUMERO "TI MANCA 0,01 KG" NON SI PUÒ FARE (16/10/2026). Ste, sul preacher
 * curl: "sono bronzo 3 con 99 lp e devo fare 18,08 kg per il silver, ma come dovrei
 * fare 0,8 grammi in più?". Aveva ragione: il conto veniva arrotondato a due
 * decimali, quindi uscivano numeri come 16,01 kg o 18,08 kg. Un manubrio non si
 * compra a 18,08 kg: i dischi vanno a kg interi, e i manubri per lato pure.
 *
 * Quindi il numero sale sempre al kg INTERO successivo, e mai meno di 1 kg sopra il
 * carico che hai già fatto: se il conto dice 16,01 e tu fai 16, la risposta utile è
 * "17 kg", non "16,01 kg".
 *
 * Non è una scelta sul merito del tetto: è solo rendere realizzabile il numero che il
 * motore aveva già calcolato. Il tetto e le soglie non si toccano qui.
 */
function kgRealizzabile(g, caricoAttuale) {
  const n = Number(g);
  if (!Number.isFinite(n)) return null;
  const attuale = Number(caricoAttuale);
  const minimo = Number.isFinite(attuale) && attuale > 0 ? Math.floor(attuale) + 1 : 0;
  return Math.max(Math.ceil(n), minimo);
}

/**
 * Quanto ti manca per la soglia dopo, in due modi leggibili.
 *
 * - in RIPETIZI: quante ne faresti in piu' a questo carico (quando si puo')
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
    const kgGrezzo = Number.isFinite(carico) && carico > 0
      ? prima / (pieneFatte * (Number(meccanica) || 1))
      : null;
    // kg intero successivo: vedi `kgRealizzabile`, non si compra un manubrio a 18,08 kg
    const kgNecessari = kgRealizzabile(kgGrezzo, carico);
    const LIMITE = 12;
    const ripInPiu = ripTotali ? Math.max(0, ripTotali - Math.floor(ripetizioniFatte)) : null;
    const ripUtili = ripInPiu !== null && ripInPiu <= LIMITE ? ripInPiu : null;
    // IL NUMERO "impossibile" NON SI MOSTRA, e non si tiene da parte per un uso
    // futuro: si butta via. Il suo posto nella frase e' l'altro membro.
    //
    // Prima la schermata aggiungeva il suo "% manca" e la frase diceva "circa 34,9
    // kg in piu'", quindi il 52 compariva solo se qualcuno leggeva il campo. Un
    // numero che puo' essere calcolato ma non puo' essere fatto non serve a niente,
    // e tenerselo nel record e' l'invito a stamparlo per sbaglio domani.
    return {
      sottoPrimaSoglia: true,
      mancaScore: Math.round(manca * 100) / 100,
      ripetizioniNecessarie: ripTotali,
      ripetizioniInPiu: ripUtili,
      kgNecessari,
      frase: 'per sbloccare il primo livello: '
        + (ripUtili === null
          ? (kgNecessari ? `circa ${kgNecessari} kg, con le ripetizioni che hai` : 'serve piu\' carico')
          : (ripUtili === 1 ? '1 ripetizione in piu\'' : `${ripUtili} ripetizioni in piu'`)
            + (kgNecessari ? `, oppure circa ${kgNecessari} kg` : '')),
    };
  }
  if (indice < 0 || indice >= soglie.length - 1) return null;
  const prossima = soglie[indice + 1];
  const manca = prossima - Number(score);
  if (!Number.isFinite(manca) || manca <= 0) return null;
  const ripTotali = ripetizioniPerSoglia(score, prossima, { carico, meccanica });
  const pieneFatte = pienePerRipetizioni(ripetizioniFatte);
  const kgGrezzo = Number.isFinite(carico) && carico > 0
    ? prossima / (pieneFatte * (Number(meccanica) || 1))
    : null;
  // kg intero successivo: vedi `kgRealizzabile`
  const kgNecessari = kgRealizzabile(kgGrezzo, carico);
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
    // idem: il numero impossibile non viene tenuto, per lo stesso motivo di sopra
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
 * Dal punteggio al Rank, con i LP dentro.
 *
 * Regole che ho fissato e che diventano test:
 *  - il RANK lo decide SEMPRE la serie migliore da sola, mai le serie;
 *  - le serie spingono gli LP dentro il Rank che hai, e possono portarti al
 *    massimo (99 LP, divisione III), ma non al Rank dopo;
 *  - il volume non spinge nemmeno la barra: la barra è il lavoro vero.
 *
 * IL PERCHE' DEL FERMO (Ste, 06/10/2026): "la regola secca. Il bonus non cambia
 * mai il Rank, sposta solo i LP dentro del Rank... perche' un Rank deve dire
 * quanto sei forte. Se il numero di serie decide meta' dei Rank, il Rank non sta
 * misurando quello che dice di misurare".
 *
 * QUI C'ERA UNA FINESTA, E IL 15/10/2026 L'HA FATTA VEDERE. C'era
 * `SOGLIA_PER_CROSSARE = 0,92`: se la serie migliore era gia' al 92% della soglia
 * dopo, il volume POTeva spingerla al Rank successivo. Sembrava una via di mezzo
 * ("se sei davvero vicino, ti si lascia passare"), ma è una regola diversa da
 * quella che Ste ha scritto, e per un anno intero è rimasta nascosta perché i
 * numeri di allora non ci finivano mai dentro.
 *
 * Poi è finito dentro per un motivo vero. Con lo scalare allometrico del peso
 * (vedi `pesoAllometrico` in valori.js) la scala è salita del 4,4% e la chest
 * press di Ste si e' trovata al 96% della soglia dopo: con una serie era SILVER,
 * con due GOLD. Cioe' il Rank dipendeva dal numero di serie, che e' esattamente
 * quello che Ste aveva detto di non volere, e che il test bonus-serie.test.js
 * (S5) segnalava gia' da prima e che passava solo per caso.
 *
 * Quindi la finestra e' stata tolta, e non sostituita con un'altra: ora la regola
 * e' quella che Ste ha scritto, e il volume fa esattamente una cosa, spingere gli
 * LP dentro il Rank che hai. Non c'e' piu' nessun numero che decide se si puo'
 * passare: meno codice e una regola sola.
 */
export function rankDaScore(score, soglie, { serieFatte = 1 } = {}) {
  const sog = Array.isArray(soglie) ? soglie : [];
  if (!sog.length) return { rank: null, indice: -1, lp: 0, motivo: 'nessuna soglia' };
  const valore = Number(score);
  if (!Number.isFinite(valore)) return { rank: null, indice: -1, lp: 0, motivo: 'nessun punteggio' };

  // la serie migliore da sola: e' questa che decide il Rank, sempre
  const conSerie = valore * moltiplicatoreSerie(serieFatte);
  const onesto = bandaDaValore(conSerie, sog);
  const daSola = bandaDaValore(valore, sog);
  const haVolume = serieFatte > 1 && onesto.indice > daSola.indice;

  if (haVolume) {
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
    // aveva finito niente, che e' il modo peggiore di mentire.
    //
    // Ora la barra resta ferma sul posto del LAVORO VERO (la serie migliore da
    // sola), e il merito delle serie si legge negli LP. Il volume spinge gli LP
    // dentro il Rank che hai, non la barra verso il Rank dopo: e' esattamente la
    // regola secca di Ste, resa visibile.
    fermato.progresso = daSola.progresso;
    fermato.progressoConVolume = progressoDentro(conSerie, sog, daSola.indice);
    fermato.volumeBloccato = true;
    fermato.lpConVolume = onesto.lp;
    fermato.rankCheAvrestiAvuto = onesto.rank;
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
    return Math.max(0, Math.min(99, Math.round(((valore - base) / base) * 100)));
  }
  const sotto = soglie[indice];
  const spessore = soglie[indice + 1] - sotto || 1;
  // IL NUMERO NON PUO' SCENDERE SOTTO ZERO E IL MASSIMO E' 99 (100 e' il Rank dopo).
  //
  // IL DIFETTO CHE HO CORRETTO QUI (08/10/2026), e che Ste ha visto: con 18 kg al
  // preacher, 1x8 dava 63 LP ma 2x8 dava 25 LP. Gli LP SCENDEVANO con il volume.
  //
  // Il motivo: se il volume passa la soglia SOPRA (es. 21,42 su una soglia di 19,9)
  // ma la fascia viene trattenuta indietro dal blocco del 92%, il calcolo
  // ((21,42 - sotto) / spessore) * 100 dava 156, che il min(99) schiacciava a 99. Ma
  // non finiva a 99: finiva a un numero che dipende da quanto il volume aveva
  // superato la soglia, e che poteva essere PIU' BASSO dei LP che avevi senza
  // volume. Piu' serie, meno LP: il contrario di quello che il volume deve fare.
  //
  // Il volume spinge gli LP AVANTI e non puo' mai tirarli indietro. Se il volume
  // vuole uscire dalla fascia, gli LP vanno a 99 (pieno) e la divisione a III: e
  // il messaggio che ti resta da leggere e' "il Rank dopo non lo compra il volume",
  // che e' esattamente quello che il blocco del 92% sta già dicendo.
  const grezzo = Math.floor(((valore - sotto) / spessore) * 100);
  return Math.max(0, Math.min(99, grezzo));
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
    lp = Math.max(0, Math.min(99, Math.round(((valore - base) / base) * 100)));
  } else {
    const sotto = soglie[indice];
    const sopra = soglie[indice + 1];
    const spessore = sopra - sotto || 1;
    lp = Math.max(0, Math.min(99, Math.floor(((valore - sotto) / spessore) * 100)));
    progresso = Math.max(0, Math.min(1, (valore - sotto) / spessore));
  }
  // la divisione: I e' la piu' bassa e III la piu' alta (Ste, 07/10/2026)
  // Anche in cima (OLYMPIAN) la divisione va calcolata dagli LP
  const divisione = divisioneDaLp(lp);
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