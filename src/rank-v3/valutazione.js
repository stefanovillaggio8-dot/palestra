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
import { pesiCaricabili, pesoPiuVicino, PESI_GOLERIA } from '../rank-config.js';
import { soglieDaValori, rankDaScore, CURVA_SOGLIE } from '../rank-v2/scalata.js';
import { valoriPerEsercizio } from '../rank-v2/valori.js';
import {
  moltiplicatoreSerie, fattoreMeccanica, caricoReale, ripetizioniPiene, RIPETIZIONI_RIFERIMENTO,
} from '../rank-v2/curve.js';
import {
  configEsercizio, controllaIngresso, fattoreCorpo, numero, arrotonda,
  caricoEffettivo, fattoreConfrontoPolso, soglieNormalizzate, standardPerMovimento,
} from './modello.js';
import { modelloRipetizioniRank, ripetizioniPieneRank } from './ripetizioni-rank.js';

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
  const standard = standardPerMovimento(movimento, esercizio || {});
  const standardPercentili = Array.isArray(standard && standard.soglie1RMPerPeso);
  const modelloReps = modelloRipetizioniRank(movimento, esercizio || {}, standard);

  // Una fonte specifica con attrezzatura compatibile puo' riconoscere
  // automaticamente anche un esercizio nuovo non ancora presente nei valori v2.
  // Se non c'e' quella fonte, si usa il fallback precedente senza inventare Rank.
  if ((!valori || valori.multiplo === 0) && !standardPercentili) {
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
    // Ogni record storico usa il proprio peso corporeo salvato quando la
    // serie e' stata fatta, non quello della migliore serie scelta dal vecchio
    // sistema e non quello attuale. Il fallback vale solo se manca la misura.
    const pesoSalvato = numero(s.peso_corpo);
    const pesoDellaSerie = pesoSalvato !== null && pesoSalvato >= 25 && pesoSalvato <= 300
      ? pesoSalvato
      : numero(pesoCorporeo);
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
      pesoCorporeo: pesoDellaSerie,
      spotter: s.spotter === true,
      consentiCaricoZero: zavorri,
    });
    if (!controllo.valido) continue;
    for (const a of controllo.allarmi) {
      if (!allarmi.includes(a)) allarmi.push(a);
    }
    const eff = caricoEffettivo(s, cfg, { pesoCorporeo: pesoDellaSerie, esercizio: esercizio || {} });
    if (eff.carico === null) continue;
    // PER ZAVORRI (dip/trazioni): lo score usa il TOTALE, corpo + zavorra.
    // A corpo libero stai sollevando 66 kg, non zero.
    const caricoPerScore = eff.caricoPerScore ?? eff.carico;
    const meccanica = fattoreMeccanica(esercizio || {});
    const fattore = fattoreCorpo(pesoDellaSerie);
    if (fattore === null) continue;
    // LO SCORE E' LA SERIE VERA, NON IL MASSIMALE (22/10/2026).
    //
    // Ste: "non devi basarti sul massimale, ma sulla serie migliore". Quindi
    // entrano i kg che ha davvero spostato e le ripetizioni che ha davvero
    // fatto, con la curva delle ripetizioni che c'e' gia' in v2. La soglia e'
    // riportata a 8 ripetizioni una volta sola (vedi `soglieNormalizzate`).
    // Tutti gli esercizi usano la SERIE realmente eseguita.
    // A 8 ripetizioni il fattore e' 1; piu' ripetizioni aumentano lo score
    // con rendimenti decrescenti, senza simulare un massimale.
    // I riferimenti del preacher sono in 1RM, ma SOLO le soglie sono
    // convertite al formato 8 rip in modello.js; MAI il carico dell'utente.
    // Per il preacher si limita il contributo delle serie oltre 12 rip:
    // i dati pubblicati descrivono soprattutto serie a bassa/media ripetizione.
    const piene = ripetizioniPieneRank(s.ripetizioni, modelloReps);
    let score = (caricoPerScore * piene / fattore) * meccanica;
    if (s.spotter === true) score = score * PENALITA_SPOTTER;
    valutabili.push({
      serie: s,
      // Precisione interna: arrotondare a due decimali PRIMA della scelta
      // della migliore serie falsava gli 8 rep (22 kg -> 21,99 kg equivalenti)
      // e poteva cambiare Rank vicino alla soglia.
      score: arrotonda(score, 6),
      carico: eff.carico,
      caricoPerScore,
      caricoPerPolsoStimato: eff.caricoPerPolsoStimato ?? null,
      notaCarico: eff.notaCarico ?? null,
      zavorra: eff.zavorra,
      corpo: eff.corpo,
      ripetizioni: Math.floor(Number(s.ripetizioni) || 0),
      ripetizioniPiene: arrotonda(piene, 3),
      spotter: s.spotter === true,
      meccanica,
      standardPercentili,
      pesoCorporeoSerie: pesoDellaSerie,
    });
  }

  if (!valutabili.length) {
    return {
      valido: false,
      motivo: 'nessuna serie registrata',
      movimento, livello, cfg, allarmi,
    };
  }

  // Nello Strict Curl con riferimenti 1RM le singole sono prove massimali
  // legittime: non escluderle se esiste una serie piu leggera da 5+ rip.
  // Per gli altri esercizi resta la preferenza storica per 5+ ripetizioni.
  // Si confronta SEMPRE lo score delle serie REALI; nessuna stima del 1RM.
  const strictCurlMassimale = esercizio?.id === 'ex-strict-curl-ez-wall' && standardPercentili;
  const serieConRip = valutabili.filter((v) => v.ripetizioni >= RIP_MINIME_PER_PESO);
  const pool = strictCurlMassimale ? valutabili : (serieConRip.length ? serieConRip : valutabili);
  const migliore = pool.reduce((a, b) => {
    if (b.score > a.score) return b;
    if (b.score < a.score) return a;
    if (b.carico > a.carico) return b;
    if (b.carico < a.carico) return a;
    return b.ripetizioni > a.ripetizioni ? b : a;
  });

  const pesoDelRecord = migliore.pesoCorporeoSerie ?? pesoCorporeo;

  // LE SOGLIE: gli standard del movimento, convertiti a serie da 8 rip.
  // I dati del preacher sono 1RM, ma questa informazione viene usata soltanto
  // per tarare le soglie, non per cambiare i kg della migliore serie.
  if (!standard) {
    return { valido: false, motivo: 'standard di forza mancante per questo movimento', movimento, livello, cfg, allarmi };
  }
  const soglie = soglieNormalizzate({
    standard,
    difficoltaScala: cfg.difficoltaScala,
    curva: CURVA_SOGLIE,
    meccanica: migliore.meccanica,
    pesoCorporeo: pesoDelRecord,
  });
  if (!soglie || soglie.length < 2) {
    return { valido: false, motivo: 'soglie incoerenti', movimento, livello, cfg, allarmi };
  }

  // I NUMERI IN KG PER LA SCHERMATA: la soglia normalizzata riportata a 8
  // ripetizioni sul corpo di oggi. Le soglie del calcolo restano costanti; qui
  // si traduce solo per far leggere un peso che esiste davvero.
  const fattoreOggi = fattoreCorpo(pesoDelRecord);
  if (fattoreOggi === null) {
    return { valido: false, motivo: 'peso corporeo non disponibile', movimento, livello, cfg, allarmi };
  }
  const kgDaNormalizzato = (s) => arrotonda(
    (s * fattoreOggi) / migliore.meccanica,
  );
  // Le soglie sono del modello per polso; i kg da CARICARE sulla sbarra
  // comune vanno invece mostrati come TOTALE per entrambi i polsi.
  const conversioneSbarra = 1 / fattoreConfrontoPolso(esercizio);
  const ingresso = arrotonda(kgDaNormalizzato(soglie[0]) * conversioneSbarra);
  const vertice = arrotonda(kgDaNormalizzato(soglie[soglie.length - 1]) * conversioneSbarra);

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
  // Il riferimento Hyperextension non contiene dati su p98/p99,5. Non
  // inventare TITAN/OLYMPIAN da un modello in libbre. Mostra il superamento
  // del livello Elite MODELLATO e ferma il titolo competitivo a DIAMOND III.
  // Il punteggio vero e i kg registrati non vengono ridotti.
  const massimoSupportato = Number(standard?.massimoRankSupportato);
  const fuoriScalaProvvisoria = Number.isInteger(massimoSupportato)
    && massimoSupportato >= 0 && migliore.score >= soglie[massimoSupportato+1];
  const scorePerTitolo = fuoriScalaProvvisoria
    ? Math.max(soglie[massimoSupportato], soglie[massimoSupportato+1] * (1-1e-8))
    : migliore.score;
  const rank = rankDaScore(scorePerTitolo, soglie, { serieFatte: n });

  // LA DISTANZA ALLA SOGLIA, nel mondo nuovo (kg e ripetizioni veri).
  const distanza = fuoriScalaProvvisoria ? null : distanzaAllaSogliaNuova({
    score: migliore.score,
    soglie,
    indice: rank.indice,
    carico: migliore.caricoPerScore,
    caricoRegistrato: cfg.modello === 'corpo_libero'
      ? migliore.zavorra
      : numero(migliore.serie.peso),
    ripetizioni: migliore.ripetizioni,
    pesoCorporeo: pesoDelRecord,
    meccanica: migliore.meccanica,
    spotter: migliore.spotter,
    esercizio,
    cfg,
    modelloRipetizioni: modelloReps,
    pesiDisponibili: standardPercentili && cfg.caricamento === 'manubri' ? PESI_GOLERIA : null,
  });

  return {
    valido: true,
    movimento,
    livello,
    cfg,
    allarmi,
    fonte: standard.fonte || valori?.fonte || 'non_verificata',
    nota: standard.nota || valori?.nota || '',
    fuoriScalaProvvisoria,
    calibrazione: descriviAffidabilitaRank(standard, cfg, rank, migliore, pesoDelRecord, modelloReps),
    modelloRipetizioni: modelloReps,
    score: migliore.score,
    scoreConSerie: arrotonda(conVolume),
    serieFatte: n,
    serieTotali: nTotali,
    caricoReale: migliore.carico,
    caricoPerPolsoStimato: migliore.caricoPerPolsoStimato,
    notaCarico: migliore.notaCarico,
    // Identifica senza ambiguita' la serie che ha davvero vinto. Il numero
    // scritto sul carrello puo' differire dal carico al cavo 2:1.
    caricoRegistrato: cfg.modello === 'corpo_libero'
      ? migliore.zavorra
      : numero(migliore.serie.peso),
    serieId: migliore.serie.id ?? null,
    zavorra: migliore.zavorra,
    corpo: migliore.corpo,
    // IL PESO CORPOReO CON CUI E' STATA VALUTATA LA SERIE: quello del giorno in
    // cui l'hai fatta, se c'era (vedi `pesoPerSerie` in rank.js). E' quello che
    // rende un record storico un record: non si ricalcola col peso di adesso.
    pesoCorporeo: numero(pesoDelRecord),
    spotter: !!migliore.spotter,
    ripetizioni: migliore.ripetizioni,
    ripetizioniPiene: migliore.ripetizioniPiene,
    // Il Rank non dipende da un 1RM ipotetico: i kg e le ripetizioni
    // della migliore serie sono gli unici dati di prestazione usati.
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
    kgEquivalenti: arrotonda(kgEquivalenti(migliore.score, pesoDelRecord, migliore.meccanica) * conversioneSbarra),
    ...rank,
    sogliePer8Rip: true,
    ripetizioniRiferimento: RIPETIZIONI_RIFERIMENTO,
    limiteRipetizioni: modelloReps.massimo,
    distanza,
  };
}

/**
 * Quanto e' affidabile QUESTO Rank (non la forza della persona).
 * La qualita' dello standard e la precisione della prestazione sono
 * cose separate: i percentili estremi NON sono osservati da Strength Level.
 */
export function descriviAffidabilitaRank(standard, cfg, rank, migliore, pesoCorporeo, modelloReps) {
  const s = standard || {};
  const macchina = String(cfg?.tipoAttrezzatura || '');
  const specifico = s.fonte === 'strengthlevel_esercizio';
  const cadNonValidato = s.fonte === 'proxy_cad_non_validato';
  const hyperNonValidato = s.fonte === 'modello_hyperextension_non_validato';
  const estremo = (rank?.indice ?? -1) >= 5;
  const ripLunghe = Number(migliore?.ripetizioni) > 12;
  const fuoriDati = Array.isArray(s.soglie1RMPerPeso) && (
    pesoCorporeo < s.soglie1RMPerPeso[0][0] ||
    pesoCorporeo > s.soglie1RMPerPeso[s.soglie1RMPerPeso.length - 1][0]
  );
  const attrezzoIncerto = /ignoto|non_identificato|da_verificare/.test(macchina);
  const motivi = [];
  let livello = specifico ? (s.affidabilitaBase || 'media') : 'bassa';
  if (specifico) {
    motivi.push('Riferimenti pubblicati da una community di sollevatori, non tecnica verificata da giudici');
  } else if (cadNonValidato) {
    motivi.push('Il CAD Curl si esegue sulla Scott al contrario, con gomiti appoggiati e busto arretrato: posizione muscolare e momento torcente cambiano, ma non è dimostrata una percentuale universale di maggiore difficoltà');
    motivi.push('Riferimento numerico temporaneo: Dumbbell Curl, senza alcun bonus percentuale. Questi NON sono percentili scientifici del CAD Curl');
    motivi.push('Studi sull’influenza della posizione: Oliveira 2009 (PMID 24150552), Attarieh 2025 (PMID 40082069), Kobayashi 2026 (PMID 42829982). Nessuno confronta direttamente il CAD Curl con il curl normale');
  } else if (hyperNonValidato) {
    motivi.push('Hyperextension: kg ESTERNI e ripetizioni della serie migliore. Benchmark FitnessVolt modellato in libbre, non percentile misurato di atleti. Il dato non prova alcun record o titolo agonistico');
    motivi.push('Panca, ROM e leva del carico cambiano il momento resistente. Petto e braccia tese verso il pavimento sono varianti distinte senza coefficienti sperimentali di conversione');
    if (rank?.indice === 4 && Number(migliore?.score) >= 0) motivi.push('Se il risultato eccede la fascia modellata, TITAN e OLYMPIAN non vengono assegnati senza standard validati');
  } else {
    motivi.push('Soglie derivate da un modello di movimento, senza cinque percentili specifici per questa variante');
  }
  if (s.limite && (specifico || cadNonValidato || hyperNonValidato)) motivi.push(s.limite);
  if (s.nota && specifico && s.affidabilitaBase === 'indicativa') motivi.push(s.nota);
  if (estremo) {
    livello = 'bassa';
    motivi.push('Titan e Olympian sono estrapolazioni matematiche oltre il percentile 95, non risultati misurati');
  }
  if (ripLunghe) {
    livello = 'bassa';
    motivi.push('Oltre 12 ripetizioni il punteggio e piu incerto e la curva viene attenuata o limitata');
  }
  const singolaMassimaleStrict = modelloReps?.tipo === 'strict_curl_basse_rip'
    && Number(migliore?.ripetizioni) === 1 && specifico;
  if (singolaMassimaleStrict) {
    // La prova massimale da 1 rip NON e una stima. L'incertezza rimasta
    // e nella conformita tecnica e nella differenza tra EZ a presa interna
    // e l'esecuzione auto-dichiarata della community, non nel numero di reps.
    if (livello === 'bassa' && !estremo && !ripLunghe && !fuoriDati && !attrezzoIncerto) {
      livello = 'indicativa';
    }
    motivi.push('Una singola eseguita e un 1RM misurato direttamente, non una stima. La conformita tecnica al regolamento agonistico non e stata verificata');
  } else if (Number(migliore?.ripetizioni) < 5) {
    livello = 'bassa';
    motivi.push('Per 2-4 ripetizioni la conversione alle soglie 1RM e indicativa; a 1 ripetizione lo Strict Curl usa il massimale realmente eseguito');
  }
  if (fuoriDati) {
    livello = 'bassa';
    motivi.push('Peso corporeo fuori dall intervallo pubblicato: riferimento extrapolato');
  }
  if (attrezzoIncerto) {
    livello = 'bassa';
    motivi.push('Tipo di carico o rapporto della macchina non verificato');
  }
  if (macchina.includes('stack') || macchina.includes('cavo')) {
    motivi.push('Su cavi e macchine marche, pulegge e camme cambiano la resistenza: confronta soprattutto la stessa macchina');
  }
  return {
    livello,
    titolo: livello === 'media' ? 'Attendibilita media' :
      livello === 'indicativa' ? 'Attendibilita indicativa' : 'Attendibilita limitata',
    origine: specifico ? 'Riferimento statistico specifico'
      : cadNonValidato ? 'CAD Curl: calibrazione scientifica non disponibile'
        : hyperNonValidato ? 'Hyperextension: benchmark MODELLATO non agonistico'
          : 'Modello provvisorio per famiglia',
    fonteUrl: s.fonteUrl || null,
    riferimentoNome: s.riferimentoNome || null,
    fonteData: s.dataFonte || null,
    descrizione: motivi.join('. ') + '.',
    attrezzatura: cfg?.notaAttrezzatura || '',
    ripetizioni: modelloReps?.tipo || 'generico',
    notaHyperextension: hyperNonValidato ? s.nota : null,
    notaMassimale: singolaMassimaleStrict
      ? '1 ripetizione massimale registrata: confronto diretto con lo standard 1RM. Nessuna penalita per la singola; tecnica e presa EZ non certificate da un giudice.'
      : null,
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
/**
 * Il prossimo obiettivo usa i KG DA DIGITARE nell'app, non il carico
 * meccanicamente effettivo: 2:1 ai cavi, zavorra nei dips, kg per manubrio.
 * Anche l'assistenza dello spotter resta applicata, altrimenti si suggerisce
 * un carico che in realta' non fa superare la soglia.
 */
export function distanzaAllaSogliaNuova({
  score, soglie, indice, carico, caricoRegistrato = null, ripetizioni,
  pesoCorporeo, meccanica = 1, spotter = false, esercizio = {},
  cfg = null, limiteRipetizioni = null, modelloRipetizioni = null,
  pesiDisponibili = null,
}) {
  const sog = Array.isArray(soglie) ? soglie : [];
  if (!sog.length) return null;
  const fattore = fattoreCorpo(pesoCorporeo);
  if (fattore === null) return null;
  const mec = Number(meccanica);
  const m = Number.isFinite(mec) && mec > 0 ? mec : 1;
  const valore = Number(score);
  if (!Number.isFinite(valore)) return null;
  const bersaglio = indice < 0 ? sog[0]
    : (indice >= sog.length - 1 ? null : sog[indice + 1]);
  if (bersaglio === null) return null;
  const manca = bersaglio - valore;
  if (!Number.isFinite(manca) || manca <= 0) return null;

  const ripFatte = Math.floor(Number(ripetizioni) || 0);
  const modello = modelloRipetizioni || modelloRipetizioniRank(null);
  const pieneFatte = ripetizioniPieneRank(ripFatte, modello);
  if (!(pieneFatte > 0)) return null;
  const penalty = spotter ? PENALITA_SPOTTER : 1;
  const e = esercizio || {};
  const corpoLibero = cfg?.modello === 'corpo_libero';
  const doppiaCarrucola = !corpoLibero && e.carrucola === 'carrucola_doppia';
  const fattorePolso = fattoreConfrontoPolso(e);
  const numeroRegistrato = numero(caricoRegistrato);
  const pesoAttuale = numeroRegistrato !== null ? numeroRegistrato
    : corpoLibero ? Math.max(0, Number(carico) - Number(pesoCorporeo))
      : (Number(carico) / fattorePolso) * (doppiaCarrucola ? 2 : 1);

  // Carico effettivo richiesto dallo score, poi inverso del sistema
  // dichiarato sul dispositivo. Con spotter si richiede piu' carico.
  const caricoEffettivoNecessario =
    (bersaglio * fattore) / (m * penalty * pieneFatte);
  const kgGrezzo = corpoLibero
    ? Math.max(0, caricoEffettivoNecessario - Number(pesoCorporeo))
    : (caricoEffettivoNecessario / fattorePolso) * (doppiaCarrucola ? 2 : 1);

  const pesoCaricabile = Array.isArray(pesiDisponibili)
    ? pesiDisponibili.find(p => p >= kgGrezzo - 1e-8 && p > pesoAttuale)
    : null;
  // Quando la lista limitata dei manubri termina a 60 kg, NON si puo'
  // mostrare un peso inesistente o un punteggio come se fosse un peso.
  const kgNecessari = Array.isArray(pesiDisponibili)
    ? (pesoCaricabile ?? null)
    : kgRealizzabile(kgGrezzo, pesoAttuale);

  // Anche il calcolo delle ripetizioni tiene conto dell'aiuto ricevuto.
  let ripTotali = null;
  const massimo = Math.max(1, Math.min(40, modello.massimo || limiteRipetizioni || 20));
  if (Number.isFinite(carico) && carico > 0) {
    for (let r = ripFatte + 1; r <= massimo; r++) {
      const p = ripetizioniPieneRank(r, modello);
      if (carico * p * m * penalty / fattore >= bersaglio - 1e-8) {
        ripTotali = r;
        break;
      }
    }
  }
  const ripInPiu = ripTotali !== null ? Math.max(0, ripTotali - ripFatte) : null;
  const ripUtili = ripInPiu !== null && ripInPiu <= 12 ? ripInPiu : null;
  const nomeUnita = corpoLibero ? 'kg di zavorra'
    : doppiaCarrucola ? 'kg sul carrello'
      : fattorePolso !== 1 ? 'kg totali sulla sbarra'
      : e.convenzione === 'per_manubrio' ? 'kg per manubrio'
        : e.convenzione === 'per_braccio' ? 'kg per lato'
          : e.convenzione === 'per_gamba' ? 'kg per gamba'
            : e.convenzione === 'bilanciere' ? 'kg sul bilanciere'
              : 'kg registrati';
  const frasePeso = kgNecessari !== null
    ? `circa ${kgNecessari} ${nomeUnita} con le ripetizioni che hai`
    : 'il peso richiesto non e disponibile fra i carichi elencati';
  const fraseRip = ripUtili === null ? null
    : ripUtili === 1 ? '1 ripetizione in piu'
      : `${ripUtili} ripetizioni in piu'`;
  const sottoPrima = indice < 0;
  const frase = (sottoPrima ? 'per sbloccare Bronze: ' : '')
    + (fraseRip === null ? frasePeso : `${fraseRip} a questo carico, oppure ${frasePeso}`);
  return {
    sottoPrimaSoglia: sottoPrima,
    mancaScore: arrotonda(manca),
    ripetizioniNecessarie: ripTotali,
    ripetizioniInPiu: ripUtili,
    kgNecessari,
    unitaCarico: nomeUnita,
    caricoRegistrato: pesoAttuale,
    spotterConsiderato: !!spotter,
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
  const basePesi = config.caricamento === 'manubri' ? PESI_GOLERIA : pesiCaricabili(passo);
  // Dip e trazioni: la prima soglia puo' essere gia' raggiunta senza
  // aggiungere dischi. 0 kg di zavorra e' un peso caricabile REALE.
  const pesi = config.modello === 'corpo_libero' ? [0, ...basePesi] : basePesi;
  const corpo = numero(pesoCorporeo);
  const punteggioDi = (kg) => {
    const carico = config.modello === 'corpo_libero'
      ? (corpo === null ? null : corpo + kg)
      : caricoReale(kg, esercizio);
    const caricoPerScore = carico === null ? null : carico * fattoreConfrontoPolso(esercizio);
    if (caricoPerScore === null || caricoPerScore <= 0) return null;
    const fattore = fattoreCorpo(pesoCorporeo);
    if (fattore === null) return null;
    // A 8 ripetizioni `ripetizioniPiene` vale 1: lo score e' il carico diviso
    // per il fattore corporeo. Le soglie contengono gia' la meccanica, quindi
    // lo score deve contenerla anche lui.
    return (caricoPerScore / fattore) * fattoreMeccanica(esercizio);
  };
  return soglie.map((s) => {
    const trovato = pesi.find((kg) => {
      const p = punteggioDi(kg);
      return p !== null && p >= s;
    });
    if (trovato !== undefined) return trovato;
    // Nessun carico DISPONIBILE raggiunge la soglia. In precedenza la
    // soglia NORMALIZZATA veniva interpretata come kg e visualizzata
    // come un manubrio arbitrario: molto fuorviante.
    return null;
  });
}

export { numero, arrotonda };
