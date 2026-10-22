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
import { valoriPerEsercizio, sogliePerEsercizio } from '../rank-v2/valori.js';
import { moltiplicatoreSerie, fattoreMeccanica, caricoReale, RIPETIZIONI_RIFERIMENTO } from '../rank-v2/curve.js';
import {
  configEsercizio, controllaIngresso, stimaMassimale, fattoreCorpo, numero, arrotonda,
  caricoEffettivo, soglieNormalizzate, LIMITE_RIP_FIDATE,
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
    const pesoScritto = zavorri
      ? (s.peso_assistenza !== null && s.peso_assistenza !== undefined && s.peso_assistenza > 0
        ? s.peso_assistenza
        : s.peso)
      : s.peso;
    const controllo = controllaIngresso({
      peso: pesoScritto,
      ripetizioni: s.ripetizioni,
      pesoCorporeo,
      spotter: s.spotter === true,
    });
    if (!controllo.valido) continue;
    for (const a of controllo.allarmi) {
      if (!allarmi.includes(a)) allarmi.push(a);
    }
    const eff = caricoEffettivo(s, cfg, { pesoCorporeo, esercizio: esercizio || {} });
    if (eff.carico === null) continue;
    // PER ZAVORRI (dip/trazioni): lo score usa SOLO i kg aggiunti, non il totale col corpo.
    // Ste (16/10/2026): "il massimale mettilo per i pesi in piu' rispetto al mio corpo non in generale".
    const caricoPerScore = cfg.modello === 'corpo_libero' && eff.zavorra !== null
      ? eff.zavorra
      : eff.carico;
    const stima = stimaMassimale(caricoPerScore, s.ripetizioni);
    if (!stima) continue;
    const meccanica = fattoreMeccanica(esercizio || {});
    let score = stima.valore * meccanica;
    if (s.spotter === true) score = score * PENALITA_SPOTTER;
    valutabili.push({
      serie: s,
      score: arrotonda(score),
      carico: eff.carico,
      zavorra: eff.zavorra,
      corpo: eff.corpo,
      ripetizioni: Math.floor(Number(s.ripetizioni) || 0),
      massimale: stima.valore,
      metodo: stima.metodo,
      affidabile: stima.affidabile,
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

  // LE SOGLIE: i numeri di Ste (ingresso e vertice in kg) convertiti nella
  // unita' nuova. Vedi `soglieNormalizzate` in `modello.js`.
  const tre = sogliePerEsercizio(valori, livello, pesoCorporeo, movimento, esercizio || {});
  if (!tre) {
    return { valido: false, motivo: 'peso corporeo non disponibile', movimento, livello, cfg, allarmi };
  }
  const soglie = soglieNormalizzate({
    ingressoKg: tre.ingresso,
    verticeKg: tre.vertice,
    quotaCorpo: cfg.quotaCorpo,
    difficoltaScala: cfg.difficoltaScala,
    pesoCorporeo,
    curva: CURVA_SOGLIE,
    meccanica: migliore.meccanica,
  });
  if (!soglie || soglie.length < 2) {
    return { valido: false, motivo: 'soglie incoerenti', movimento, livello, cfg, allarmi };
  }

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
    // IL MASSIMALE STIMATO: la stima di Epley, che entra nel calcolo e resta
    // un numero INFORMATIVO (Ste: "questa stima deve essere utilizzata per
    // valutare la prestazione, NON per mostrare all'utente un massimale
    // realmente testato").
    massimale: migliore.massimale,
    metodoMassimale: migliore.metodo,
    massimaleAffidabile: migliore.affidabile,
    // LA FORZA RELATIVA: il punteggio normalizzato, cioe' 1RM / peso^0,67.
    forzaRelativa: arrotonda(migliore.score),
    meccanica: fattoreMeccanica(esercizio || {}),
    soglie,
    // i numeri in kg per la schermata: l'ingresso e il vertice come li legge
    // Ste (il carico, non il corpo aggiunto)
    ingresso: tre.ingresso,
    vertice: tre.vertice,
    tetto: tre.tetto,
    tettoRaggiunto: tre.tettoRaggiunto,
    // I KG EQUIVALENTI: che peso, a 8 ripetizioni, darebbe la stessa prestazione.
    kgEquivalenti: kgEquivalenti(migliore.score, pesoCorporeo),
    ...rank,
    sogliePer8Rip: true,
    ripetizioniRiferimento: RIPETIZIONI_RIFERIMENTO,
    limiteRipetizioni: LIMITE_RIP_FIDATE,
    distanza,
  };
}

/**
 * I kg che, a 8 ripetizioni, valgono come la prestazione fatta.
 *
 * Serve alla schermata per dire "questa prestazione vale come N kg a 8
 * ripetizioni", che e' il modo in cui si legge un numero normalizzato.
 *
 * Lo score e': score = 1RM * meccanica (unita' assolute).
 * Quindi 1RM = score / meccanica.
 * Il carico a 8 ripetizioni che da lo stesso 1RM e': 1RM / (1 + 8/30).
 */
export function kgEquivalenti(score, pesoCorporeo, meccanica = 1) {
  if (!Number.isFinite(score) || score <= 0) return null;
  const m = Number(meccanica);
  if (!Number.isFinite(m) || m <= 0) m = 1;
  const oneRM = score / m;
  const carico8 = oneRM / (1 + RIPETIZIONI_RIFERIMENTO / 30);
  return arrotonda(carico8);
}

/**
 * Quanto manca alla soglia dopo, in kg e in ripetizioni.
 *
 * IL NUMERO "IMPOSSIBILE" NON SI MOSTRA (la regola del progetto): se le
 * ripetizioni che servono sono troppe, si dice solo il peso. E il peso sale
 * sempre al kg intero successivo: un manubrio non si compra a 18,08 kg.
 */
export function distanzaAllaSogliaNuova({ score, soglie, indice, carico, ripetizioni, pesoCorporeo }) {
  const sog = Array.isArray(soglie) ? soglie : [];
  if (!sog.length) return null;
  const fattore = fattoreCorpo(pesoCorporeo);
  if (fattore === null) return null;
  const valore = Number(score);
  if (!Number.isFinite(valore)) return null;

  const bersaglio = indice < 0 ? sog[0] : (indice >= sog.length - 1 ? null : sog[indice + 1]);
  if (bersaglio === null) return null;
  const manca = bersaglio - valore;
  if (!Number.isFinite(manca) || manca <= 0) return null;

  // IL KG NECESSARIO, con le ripetizioni che hai fatto.
  // Il punteggio normalizzato e' 1RM/P^0,67, e 1RM = kg x (1 + rip/30) con Epley:
  // quindi kg = soglia x P^0,67 / (1 + rip/30).
  const ripFatte = Math.floor(Number(ripetizioni) || 0);
  const fattoreEpley = 1 + ripFatte / 30;
  const kgGrezzo = (bersaglio * fattore) / fattoreEpley;
  const kgNecessari = kgRealizzabile(kgGrezzo, carico);

  // LE RIPETIZIONI NECESSARIE, al carico che hai.
  // kg x (1 + rip/30) = soglia x P^0,67  ->  rip = 30 x (soglia x P^0,67 / kg - 1)
  let ripTotali = null;
  if (Number.isFinite(carico) && carico > 0) {
    const necessarie = 30 * ((bersaglio * fattore) / carico - 1);
    if (Number.isFinite(necessarie) && necessarie > 0) {
      ripTotali = Math.max(1, Math.ceil(necessarie));
      // oltre il limite di Epley la stima non vale: meglio il peso
      if (ripTotali > LIMITE_RIP_FIDATE) ripTotali = null;
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
 * IL PERCHE' NON SI CALCOLA E SI CERCA: le soglie sono in PUNTEGGIO (1RM
 * normalizzato) e non in kg, e il punteggio di un peso dipende dall'esercizio (la
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
    const stima = stimaMassimale(carico, RIPETIZIONI_RIFERIMENTO);
    const fattore = fattoreCorpo(pesoCorporeo);
    if (!stima || fattore === null) return null;
    return stima.valore / fattore;
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
