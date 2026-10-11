// rank-v2/index.js -- il motore nuovo, in un pezzo solo.
//
// Ste (07/10/2026): "il Rank deve rispondere a: quanto e' forte questa prestazione per
// una persona di questo peso corporeo che esegue QUESTO specifico esercizio? E NON
// semplicemente: qual e' il massimale stimato".
//
// Questo file mette insieme i pezzi e NON tocca il Rank vecchio: sta in
// src/rank-v2/ e nessuno lo importa ancora. Serve a due cose:
//  1) decidere i valori e le soglie (con valori.js e misura.js);
//  2) quando Ste approva i numeri, questo diventa il motore che il Rank usa.
//
// LA CATENA, in quattro passi:
//   serie     -> scoreSerie     : kg realmente spostati x ripetizioni pesate x meccanica
//   esercizio -> migliorSerie   : la migliore delle serie, e quante ne hai fatte
//   soglie    -> soglieDaValori : i tre valori dell'esercizio riportati sul tuo corpo
//   rank      -> rankDaScore    : il Rank da score e soglie, con la regola sul volume
//
// Il massimale stimato qui NON C'E': entra solo come numero informativo che la
// schermata puo' mostrare accanto ("massimale 57 kg"). Il Rank non lo guarda.

import { classificaEsercizio } from '../esercizi-classificatore.js';
import { scoreSerie, moltiplicatoreSerie } from './curve.js';
import { soglieDaValori, rankDaScore, distanzaAllaSoglia } from './scalata.js';
import { valoriPerEsercizio, sogliePerEsercizio, fattoreSogliaDaKg, RIPETIZIONI_RIFERIMENTO } from './valori.js';
import { affinaVertice } from './misura.js';

/** Il movimento di un esercizio, con la sua unita' di carico. */
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
 * @param risposte      le tue risposte "facile / normale / massimo" su quell'esercizio
 */
export function valutaEsercizio({ esercizio, serie = [], pesoCorporeo = null, risposte = [] }) {
  const riconosciuto = movimentoDi(esercizio);
  const movimento = riconosciuto.movimento;
  // i valori dipendono anche dall'attrezzatura, non solo dal movimento: stesso
  // petto, ma il fly al cavo e il bench pull coi manubri non hanno lo stesso tetto
  const valori = valoriPerEsercizio(movimento, esercizio || {});
  const livello = riconosciuto.livello;

  if (!valori || valori.multiplo === 0) {
    return {
      valido: false,
      motivo: 'questo esercizio si conta in ripetizioni, non in kg',
      movimento, livello,
    };
  }

  const valutabili = [];
  for (const s of serie) {
    if (!s || s.eliminata) continue;
    if (s.esercizio_id && esercizio.id && s.esercizio_id !== esercizio.id) continue;
    if (s.stato && s.stato !== 'fatta') continue;
    if (s.spotter === true) continue;
    const sc = scoreSerie({ peso: s.peso, ripetizioni: s.ripetizioni, esercizio });
    if (sc) valutabili.push({ serie: s, ...sc });
  }
  if (!valutabili.length) {
    return { valido: false, motivo: 'nessuna serie registrata', movimento, livello };
  }
  valutabili.sort((a, b) => b.score - a.score);
  const migliore = valutabili[0];

  // le soglie: tre valori dell'esercizio, riportati sul tuo corpo e convertiti
  // nell'unita' dello score (kg-equivalenti per 8 rip)
  const tre = sogliePerEsercizio(valori, livello, pesoCorporeo, movimento, esercizio || {});
  if (!tre) {
    return { valido: false, motivo: 'peso corporeo non disponibile', movimento, livello };
  }
  const fattore = fattoreSogliaDaKg(esercizio);
  const soglie = soglieDaValori({ ingresso: tre.ingresso * fattore, vertice: tre.vertice * fattore });
  if (!soglie) {
    return { valido: false, motivo: 'soglie incoerenti', movimento, livello };
  }

  const n = valutabili.length;
  const conVolume = migliore.score * moltiplicatoreSerie(n);
  const rank = rankDaScore(migliore.score, soglie, { serieFatte: n });

  // strada B (Ste, 08/10/2026): il Rank premia le ripetizioni vere, ma la
  // schermata dice sempre quanto manca alla soglia dopo, in ripetizioni o in kg.
  // Le soglie sono per 8 ripetizioni e chi ne fa meno va legittimamente piu'
  // in basso: il punto e' che lo vede, e sa quanto ci mette ad arrivarci.
  const distanza = distanzaAllaSoglia(migliore.score, soglie, rank.indice, {
    carico: migliore.carico,
    meccanica: migliore.meccanica,
    ripetizioniFatte: migliore.ripetizioni,
  });

  // e l'affinamento: le tue risposte spostano il vertice di un pezzo alla volta
  const affinato = affinaVertice({
    verticeDichiarato: pesoCorporeo ? tre.vertice : valori.multiplo * 70,
    risposte,
    livello,
    movimento,
    pesoCorporeo: pesoCorporeo || 70,
    // l'esercizio serve per i tetti che cambiano da macchina a macchina
    esercizio: esercizio || {},
  });

  return {
    valido: true,
    movimento,
    livello,
    fonte: valori.fonte,
    nota: valori.nota,
    score: migliore.score,
    scoreConSerie: Math.round(conVolume * 100) / 100,
    serieFatte: n,
    caricoReale: migliore.carico,
    ripetizioni: migliore.ripetizioni,
    ripetizioniPiene: migliore.ripetizioniPiene,
    meccanica: migliore.meccanica,
    soglie,
    ingresso: tre.ingresso,
    vertice: tre.vertice,
    tetto: tre.tetto,
    tettoRaggiunto: tre.tettoRaggiunto,
    // e i numeri in kg, per la schermata: sono quelli che si leggono
    kgEquivalenti: Math.round((migliore.score / fattore) * 100) / 100,
    ...rank,
    // le soglie sono per 8 ripetizioni: questo e' il tetto dichiarato in quel
    // riferimento, e serve alla schermata per non far leggere "66 kg" come se
    // valesse lo stesso con 5 o con 12 ripetizioni
    sogliePer8Rip: true,
    ripetizioniRiferimento: RIPETIZIONI_RIFERIMENTO,
    distanza,
    affinamento: affinato,
  };
}