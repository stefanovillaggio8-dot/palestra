// rank-v3/valutazione.js -- IL MOTORE NUOVO: la prestazione di un esercizio
// diventa un Rank.
//
// Ste, 22/10/2026: "modifica esclusivamente il sistema di calcolo dei rank e dei
// punti forza". Qui e' il motore che lo fa.
//
// LA CATENA (tutta in `modello.js`, i numeri):
//
//   serie + peso corporeo -> carico effettivo (col corpo dentro, se serve)
//                         -> 1RM stimato (Epley)
//                         -> punteggio normalizzato (1RM / peso^0,67)
//   esercizio + peso      -> soglie normalizzate (i numeri di Ste, convertiti)
//   punteggio + soglie    -> Rank (la scala e i LP di `rank-v2/scalata.js`)
//
// PERCHE' LA SCALA E I LP RESTANO QUELLI DI `rank-v2`:
//
//  - i NOMI, le icone, gli avatar e la progressione grafica del Rank non si
//    toccano (Ste: "conserva i nomi, le icone, gli avatar e la progressione
//    grafica attuali");
//  - la curva delle soglie (BRONZE -> OLYMPIAN) e' gia' severa e verificata;
//  - i LP dentro il Rank, la divisione (I/II/III) e la regola "il volume non
//    compra mai il Rank" restano quelle scritte da Ste.
//
// L'unica cosa che cambia e' COME si misura la prestazione, e quindi come i
// numeri di riferimento si confrontano con essa.
//
// IL MODELLO VECCHIO (rank-v2/index.js) RESTA DOVE ERA: e' il ripiego per gli
// esercizi che il modello nuovo non sa valutare, e i suoi test continuano a
// valere per quello che coprono.

import { classificaEsercizio } from '../esercizi-classificatore.js';
import { pesiCaricabili, pesoPiuVicino } from '../rank-config.js';
import { soglieDaValori, rankDaScore, CURVA_SOGLIE } from '../rank-v2/scalata.js';
import { valoriPerEsercizio } from '../rank-v2/valori.js';
import {
  moltiplicatoreSerie, fattoreMeccanica, caricoReale, ripetizioniPiene, RIPETIZIONI_RIFERIMENTO,
} from '../rank-v2/curve.js';
import {
  configEsercizio, controllaIngresso, fattoreCorpo, numero, arrotonda,
  caricoEffettivo, soglieNormalizzate, standardPerMovimento,
} from './modello.js';

/**
 * La penalita' per le serie con lo spotter.
 *
 * Ste (18/10/2026): "lo spotter fai che conta lo stesso se e' solo una serie che
 * e' con lo spotter, pero' nei rank vale di meno ma non di troppo". Dieci per
 * cento: le mani del companion stanno li', ma il lavoro e' ancora tuo.
 */
export const PENALITA_SPOTTER = 0.9;

/**
 * Le ripetizioni minime perché una serie possa diventare il record.
 *
 * Ste (18/10/2026): "conta come migliore serie con un peso piu' alto solo se la
 * serie col peso piu' alto ha fatto 5 o piu' ripetizioni". Quindi fra le serie
 * con almeno 5 ripetizioni vince il peso piu' alto, e a parita' di peso vince
 * la serie con piu' ripetizioni.
 */
export const RIP_MINIME_PER_PESO = 5;

/**
 * Il movimento di un esercizio, con la sua unita' di carico.
 */
export function movimentoDi(esercizio) {
  return classificaEsercizio({
    nome: (esercizio && esercizio.nome) || '',
    descrizione: (esercizio && esercizio.descrizione) || '',
    convenzione: (esercizio && esercizio.convenzione) || null,
    attrezzatura: (esercizio && esercizio.attrezzatura) || null,
    carrucola: (esercizio && esercizio.carrucola) || null,
    bracciaIndipendenti: !!(esercizio && esercizio.bracciaIndipendenti),
  });
}

/**
 * La valutazione completa di un esercizio: Rank, soglie e da dove vengono.
 *
 * @param esercizio     l'esercizio (nome, convenzione, attrezzatura, carrucola)
 * @param serie         le serie registrate, in qualsiasi ordine
 * @param pesoCorporeo  il peso della persona
 * @param risposte      le risposte "facile / normale / massimo" su quell'esercizio
 */
export function valutaPrestazione({ esercizio, serie = [], pesoCorporeo = null, risposte = [] }) {
  const riconosciuto = movimentoDi(esercizio);
  const movimento = riconosciuto.movimento;
  const livello = riconosciuto.livello;
  const valori = valoriPerEsercizio(movimento, esercizio || {});
  const cfg = configEsercizio({ esercizio, movimento, livello });

  if (!valori || valori.multiplo === 0) {
    return {
      valido: false,
      motivo: 'questo esercizio si conta in ripetizioni, non in kg',
      movimento, livello, cfg,
    };
  }

  // LE SERIE, una per una: controlli, carico effettivo, punteggio.
  const valutabili = [];
  const allarmi = [];
  for (const s of serie) {
    if (!s || s.eliminata) continue;
    if (s.esercizio_id && esercizio.id && s.esercizio_id !== esercizio.id) continue;
    const zavorri = cfg.modello === 'corpo_libero';
    // I KG DI ZAVORRI: nei dip e nelle trazioni il numero che Ste scrive sta
    // nel campo dell'assistenza (vedi `caricoEffettivo`). Il fallback su `peso`
    // serve per chi ha i numeri nel campo vecchio.
    // NEI DIP E NELLE TRAZIONI LO ZERO E' VALIDO: e' il corpo libero.
    // Se il campo assistenza c'e' (anche 0), vince quello; altrimenti il vecchio
    // campo `peso`. `null` diventa 0 solo per il corpo libero.
    const pesoScritto = zavorri
      ? (s.peso_assistenza !== null && s.peso_assistenza !== undefined
        ? s.peso_assistenza
        : (s.peso ?? 0))
      : s.peso;
    const controllo = controllaIngresso({
      peso: pesoScritto,
      ripetizioni: s.ripetizioni,
      pesoCorporeo,
      spotter: s.spotter === true,
      consentiCaricoZero: zavorri,
    });
    if (!controllo.valido) continue;
    for (const a of controllo.allarmi) {
      if (!allarmi.includes(a)) allarmi.push(a);
    }
    const eff = caricoEffettivo(s, cfg, { pesoCorporeo, esercizio: esercizio || {} });
    if (eff.carico === null) continue;
    // PER ZAVORRI (dip/trazioni): lo score usa il TOTALE, corpo + zavorra.
    // A corpo libero stai sollevando 66 kg, non zero.
    const caricoPerScore = eff.carico;
    const meccanica = fattoreMeccanica(esercizio || {});
    const fattore = fattoreCorpo(pesoCorporeo);
    if (fattore === null) continue;
    // LO SCORE E' LA SERIE VERA, NON IL MASSIMALE (22/10/2026).
    //
    // Ste: "non devi basarti sul massimale, ma sulla serie migliore". Quindi
    // entrano i kg che ha davvero spostato e le ripetizioni che ha davvero
    // fatto, con la curva delle ripetizioni che c'e' gia' in v2. La soglia e'
    // riportata a 8 ripetizioni una volta sola (vedi `soglieNormalizzate`).
    const piene = ripetizioniPiene(s.ripetizioni);
    let score = (caricoPerScore * piene / fattore) * meccanica;
    if (s.spotter === true) score = score * PENALITA_SPOTTER;
    valutabili.push({
      serie: s,
      score: arrotonda(score),
      carico: eff.carico,
      zavorra: eff.zavorra,
      corpo: eff.corpo,
      ripetizioni: Math.floor(Number(s.ripetizioni) || 0),
      ripetizioniPiene: arrotonda(piene, 3),
      spotter: s.spotter === true,
      meccanica,
    });
  }

  if (!valutabili.length) {
    return {
      valido: false,
      motivo: 'nessuna serie registrata',
      movimento, livello, cfg, allarmi,
    };
  }

  // LA MIGLIORE SERIE: IL PESO PIU' ALTO, SE HA FATTO ALMENO 5 RIPETIZIONI.
  const serieConRip = valutabili.filter((v) => v.ripetizioni >= RIP_MINIME_PER_PESO);
  const pool = serieConRip.length ? serieConRip : valutabili;
  const migliore = pool.reduce((a, b) => {
    if (b.carico > a.carico) return b;
    if (b.carico < a.carico) return a;
    return b.ripetizioni > a.ripetizioni ? b : a;
  });

  // LE SOGLIE: lo standard 1RM del movimento, convertito in unita' normalizzata.
  // Vedi `soglieNormalizzate` in `modello.js`: qui il peso NON entra, entra una
  // volta sola nello score. Se entrasse in entrambi, si semplificherebbe.
  const standard = standardPerMovimento(movimento, esercizio || {});
  if (!standard) {
    return { valido: false, motivo: 'standard di forza mancante per questo movimento', movimento, livello, cfg, allarmi };
  }
  const soglie = soglieNormalizzate({
    standard,
    difficoltaScala: cfg.difficoltaScala,
    curva: CURVA_SOGLIE,
    meccanica: migliore.meccanica,
  });
  if (!soglie || soglie.length < 2) {
    return { valido: false, motivo: 'soglie incoerenti', movimento, livello, cfg, allarmi };
  }

  // I NUMERI IN KG PER LA SCHERMATA: la soglia normalizzata riportata a 8
  // ripetizioni sul corpo di oggi. Le soglie del calcolo restano costanti; qui
  // si traduce solo per far leggere un peso che esiste davvero.
  const fattoreOggi = fattoreCorpo(pesoCorporeo);
  if (fattoreOggi === null) {
    return { valido: false, motivo: 'peso corporeo non disponibile', movimento, livello, cfg, allarmi };
  }
  const kgDaNormalizzato = (s) => arrotonda(
    (s * fattoreOggi) / migliore.meccanica,
  );
  const ingresso = kgDaNormalizzato(soglie[0]);
  const vertice = kgDaNormalizzato(soglie[soglie.length - 1]);

  // IL VOLUME E' DELLA SEDUTA, non di sempre (Ste, 18/10/2026).
  const sedutaRecord = migliore.serie && migliore.serie.seduta_id;
  const tutteInUnaSeduta = valutabili.length > 0
    && valutabili.every((v) => v.serie && v.serie.seduta_id === sedutaRecord);
  const n = sedutaRecord && tutteInUnaSeduta
    ? valutabili.length
    : (sedutaRecord
      ? valutabili.filter((v) => v.serie && v.serie.seduta_id === sedutaRecord).length
      : valutabili.length);
  const nTotali = valutabili.length;
  const conVolume = migliore.score * moltiplicatoreSerie(n);
  const rank = rankDaScore(migliore.score, soglie, { serieFatte: n });

  // LA DISTANZA ALLA SOGLIA, nel mondo nuovo (kg e ripetizioni veri).
  const distanza = distanzaAllaSogliaNuova({
    score: migliore.score,
    soglie,
    indice: rank.indice,
    carico: migliore.carico,
    ripetizioni: migliore.ripetizioni,
    pesoCorporeo,
    meccanica: migliore.meccanica,
  });

  return {
    valido: true,
    movimento,
    livello,
    cfg,
    allarmi,
    fonte: valori.fonte,
    nota: valori.nota,
    score: migliore.score,
    scoreConSerie: arrotonda(conVolume),
    serieFatte: n,
    serieTotali: nTotali,
    caricoReale: migliore.carico,
    zavorra: migliore.zavorra,
    corpo: migliore.corpo,
    // IL PESO CORPOReO CON CUI E' STATA VALUTATA LA SERIE: quello del giorno in
    // cui l'hai fatta, se c'era (vedi `pesoPerSerie` in rank.js). E' quello che
    // rende un record storico un record: non si ricalcola col peso di adesso.
    pesoCorporeo: numero(pesoCorporeo),
    spotter: !!migliore.spotter,
    ripetizioni: migliore.ripetizioni,
    ripetizioniPiene: migliore.ripetizioniPiene,
    // NIENTE MASSIMALE: il Rank nasce dalla serie vera. I campi restano null
    // perche' le schermate li leggono e non devono mostrare una stima che non
    // entra piu' nel calcolo.
    massimale: null,
    metodoMassimale: null,
    massimaleAffidabile: null,
    // LA FORZA RELATIVA: la serie vera rapportata al peso corporeo.
    forzaRelativa: arrotonda(migliore.score),
    meccanica: fattoreMeccanica(esercizio || {}),
    soglie,
    // i numeri in kg per la schermata: l'ingresso e il vertice come li legge
    // Ste (il carico, non il corpo aggiunto)
    ingresso,
    vertice,
    tetto: vertice,
    tettoRaggiunto: false,
    // I KG EQUIVALENTI: che peso, a 8 ripetizioni, darebbe la stessa prestazione.
    kgEquivalenti: kgEquivalenti(migliore.score, pesoCorporeo, migliore.meccanica),
    ...rank,
    sogliePer8Rip: true,
    ripetizioniRiferimento: RIPETIZIONI_RIFERIMENTO,
    limiteRipetizioni: null,
    distanza,
  };
}

/**
 * I kg che, a 8 ripetizioni, valgono come la prestazione fatta.
 *
 * Serve alla schermata per dire "questa prestazione vale come N kg a 8
 * ripetizioni", che e' il modo in cui si legge un numero normalizzato.
 *
 * Lo score e' la serie vera: score = kg x ripetizioniPiene x meccanica / peso^0,67.
 * A 8 ripetizioni `ripetizioniPiene` vale 1, quindi il carico equivalente e':
 *   kg = score x peso^0,67 / meccanica
 */
export function kgEquivalenti(score, pesoCorporeo, meccanica = 1) {
  if (!Number.isFinite(score) || score <= 0) return null;
  const m = Number(meccanica);
  const mec = Number.isFinite(m) && m > 0 ? m : 1;
  const fattore = fattoreCorpo(pesoCorporeo);
  if (fattore === null) return null;
  // CON DUE DECIMALI, NON AL KG INTERO: questo numero e' un ingresso del
  // calcolo (l'avviso del peso e `distanzaAllaSogliaNuova`), non un peso da
  // caricare. Arrotondarlo al kg appiattisce due soglie vicine sullo stesso
  // numero. Il kg intero si arrotonda solo quando si scrive "carica N kg".
  return Math.round((score / mec) * fattore * 100) / 100;
}

/**
 * Quanto manca alla soglia dopo, in kg e in ripetizioni.
 *
 * IL NUMERO "IMPOSSIBILE" NON SI MOSTRA (la regola del progetto): se le
 * ripetizioni che servono sono troppe, si dice solo il peso. E il peso sale
 * sempre al kg intero successivo: un manubrio non si compra a 18,08 kg.
 */
export function distanzaAllaSogliaNuova({ score, soglie, indice, carico, ripetizioni, pesoCorporeo, meccanica = 1 }) {
  const sog = Array.isArray(soglie) ? soglie : [];
  if (!sog.length) return null;
  const fattore = fattoreCorpo(pesoCorporeo);
  if (fattore === null) return null;
  const m = Number(meccanica);
  const mec = Number.isFinite(m) && m > 0 ? m : 1;
  const valore = Number(score);
  if (!Number.isFinite(valore)) return null;

  const bersaglio = indice < 0 ? sog[0] : (indice >= sog.length - 1 ? null : sog[indice + 1]);
  if (bersaglio === null) return null;
  const manca = bersaglio - valore;
  if (!Number.isFinite(manca) || manca <= 0) return null;

  // IL KG NECESSARIO, con le ripetizioni che hai fatto.
  // score = kg x ripetizioniPiene x meccanica / P^0,67, quindi:
  //   kg = soglia x P^0,67 / (meccanica x ripetizioniPiene)
  const ripFatte = Math.floor(Number(ripetizioni) || 0);
  const pieneFatte = ripetizioniPiene(ripFatte);
  const kgGrezzo = (bersaglio * fattore) / (mec * pieneFatte);
  const kgNecessari = kgRealizzabile(kgGrezzo, carico);

  // LE RIPETIZIONI NECESSARIE, al carico che hai.
  // piene(rip) = (rip / 8)^0,20, quindi rip = 8 x piene^5.
  let ripTotali = null;
  if (Number.isFinite(carico) && carico > 0) {
    const pieneNecessarie = (bersaglio * fattore) / (mec * carico);
    if (Number.isFinite(pieneNecessarie) && pieneNecessarie > pieneFatte) {
      ripTotali = Math.max(1, Math.ceil(8 * Math.pow(pieneNecessarie, 5)));
    }
  }
  const LIMITE_RIP = 12;
  const ripInPiu = ripTotali !== null ? Math.max(0, ripTotali - ripFatte) : null;
  const ripUtili = ripInPiu !== null && ripInPiu <= LIMITE_RIP ? ripInPiu : null;

  const sottoPrima = indice < 0;
  const fraseRip = ripUtili === null
    ? null
    : ripUtili === 1
      ? '1 ripetizione in piu\''
      : `${ripUtili} ripetizioni in piu'`;
  const frase = sottoPrima
    ? (fraseRip === null
      ? (kgNecessari ? `per sbloccare il primo livello: circa ${kgNecessari} kg` : 'serve piu\' carico')
      : `per sbloccare il primo livello: ${fraseRip}`
        + (kgNecessari ? `, oppure circa ${kgNecessari} kg` : ''))
    : (fraseRip === null
      ? (kgNecessari ? `circa ${kgNecessari} kg in piu' con le ripetizioni che hai` : 'serve piu\' carico')
      : `${fraseRip} a questo carico, o circa ${kgNecessari} kg con le ripetizioni che hai`);

  return {
    sottoPrimaSoglia: sottoPrima,
    mancaScore: arrotonda(manca),
    ripetizioniNecessarie: ripTotali,
    ripetizioniInPiu: ripUtili,
    kgNecessari,
    frase,
  };
}

/** Il kg che si puo' davvero mettere: intero, e almeno uno piu' del carico fatto. */
function kgRealizzabile(g, caricoAttuale) {
  const n = Number(g);
  if (!Number.isFinite(n)) return null;
  const attuale = Number(caricoAttuale);
  const minimo = Number.isFinite(attuale) && attuale > 0 ? Math.floor(attuale) + 1 : 0;
  return Math.max(Math.ceil(n), minimo);
}

/**
 * Le soglie del record, tradotte in PESI CHE SI CARICANO.
 *
 * Ste (16/10/2026): "i pesi di 23,2 kg non esistono". E prima: la scheda scriveva
 * "BRONZE da 7 kg" sulle alzate laterali, mentre 7 kg sul carrello non prendevano
 * nessun Rank (servivano 14, perche' sono 7 per lato).
 *
 * IL PERCHE' NON SI CALCOLA E SI CERCA: le soglie sono in PUNTEGGIO (serie vera
 * normalizzata) e non in kg, e il punteggio di un peso dipende dall'esercizio (la
 * doppia carrucola dimezza, il corpo conta nei dip). Quindi non c'e' nessuna
 * formula da indovinare: si chiede al motore che punteggio da' ogni peso
 * caricabile e si prende il primo che raggiunge la soglia. Il numero e'
 * verificato, e per costruzione quello che leggi e' quello che il motore fa.
 */
export function soglieLegibiliNuove(soglie, { esercizio = {}, pesoCorporeo = null, cfg = null, passo = 1 } = {}) {
  if (!Array.isArray(soglie)) return soglie;
  const config = cfg || configEsercizio({ esercizio });
  const pesi = pesiCaricabili(passo);
  const corpo = numero(pesoCorporeo);
  const punteggioDi = (kg) => {
    const carico = config.modello === 'corpo_libero'
      ? (corpo === null ? null : corpo + kg)
      : caricoReale(kg, esercizio);
    if (carico === null || carico <= 0) return null;
    const fattore = fattoreCorpo(pesoCorporeo);
    if (fattore === null) return null;
    // A 8 ripetizioni `ripetizioniPiene` vale 1: lo score e' il carico diviso
    // per il fattore corporeo. Le soglie contengono gia' la meccanica, quindi
    // lo score deve contenerla anche lui.
    return (carico / fattore) * fattoreMeccanica(esercizio);
  };
  return soglie.map((s) => {
    const trovato = pesi.find((kg) => {
      const p = punteggioDi(kg);
      return p !== null && p >= s;
    });
    if (trovato !== undefined) return trovato;
    // nessun peso della lista arriva: si lascia il numero piu' vicino
    return pesoPiuVicino(s, { passo });
  });
}

export { numero, arrotonda };
