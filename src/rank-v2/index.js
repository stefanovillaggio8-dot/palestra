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

/**
 * Quanto vale una serie fatta con lo spotter: 90%.
 *
 * Ste (18/10/2026): "lo spotter fai che conta lo stesso se Ã¨ solo una serie che Ã¨ con lo
 * spotter, perÃ² nei rank vale di meno ma non di troppo".
 *
 * Dieci per cento Ã¨ "non di troppo": le mani del companion stanno lÃ¬, ma il lavoro Ã¨
 * ancora tuo, e una serie col solo spotter batte la stessa serie senza. Il peso e le
 * ripetizioni che si leggono sono quelli veri: la penalitÃ  Ã¨ sul punteggio.
 */
export const PENALITA_SPOTTER = 0.9;

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

  const zavorri = esercizio.convenzione === 'zavorri';
  const valutabili = [];
  for (const s of serie) {
    if (!s || s.eliminata) continue;
    if (s.esercizio_id && esercizio.id && s.esercizio_id !== esercizio.id) continue;
    // I KG DI ZAVORRI (16/10/2026). Il campo del peso Ã¨ VUOTO su un dip o su una
    // trazione: quello che scrivi Ã¨ il carico della zavorra, e sta nel campo
    // dell'assistenza (vedi la stessa regola in `rank.js`). Qui si leggeva solo `s.peso`,
    // quindi nessuna serie risultava valutabile, `valutaEsercizio` rispondeva "nessuna
    // serie registrata" e il Rank ripiegava sul motore VECCHIO: quello che ha dato a
    // Ste l'OLYMPIAN sui dip.
    //
    // E si ragiona sui KG AGGIUNTI, non sul totale col corpo. Ãˆ la scelta di Ste
    // (16/10/2026): "il massimale mettilo per i pesi in piÃ¹ rispetto al mio corpo non in
    // generale". Il corpo ce l'ha giÃ  tutto: quello che si misura Ã¨ quello che hai
    // appeso alla cintura, e sono gli stessi numeri che le macchine della palestra hanno
    // nei piatti.
    const carico = zavorri
      ? (s.peso_assistenza !== null && s.peso_assistenza !== undefined && s.peso_assistenza > 0
        ? s.peso_assistenza
        : s.peso)
      : s.peso;
    const sc = scoreSerie({ peso: carico, ripetizioni: s.ripetizioni, esercizio });
    if (sc) {
      // IL SPOTTER NON ESCLUDE LA SERIE, LA PENALIZZA (Ste, 18/10/2026)
      //
      // "lo spotter fai che conta lo stesso se Ã¨ solo una serie che Ã¨ con lo spotter,
      // perÃ² nei rank vale di meno ma non di troppo".
      //
      // Prima la serie con lo spotter veniva BUTTATA via, e su un esercizio come la Smith
      // incline succedeva questo: le quattro serie da 32 kg erano tutte col spotter,
      // restava solo una da 30 kg, e il Rank diceva BRONZE su una panca che Ste fa senza
      // problemi. Non era un record sbagliato: era un record che non esisteva, perche' gli
      // si erano cancellate dal basso le serie migliori.
      //
      // Dieci per cento e' "non di troppo": le mani del companion stanno li', ma il lavoro
      // e' ancora tuo. Il peso e le ripetizioni mostrati sono quelli veri: la penalita' e'
      // sul punteggio, non sulla lettura.
      const score = s.spotter === true
        ? Math.round(sc.score * PENALITA_SPOTTER * 100) / 100
        : sc.score;
      valutabili.push({ serie: s, ...sc, score, spotter: s.spotter === true });
    }
  }
  if (!valutabili.length) {
    return { valido: false, motivo: 'nessuna serie registrata', movimento, livello };
  }
  // LA MIGLIORE SERIE: IL PESO PIU' ALTO, SE HA FATTO ALMENO 5 RIPETIZIONI
// (Ste, 18/10/2026)
  //
  // "conta come migliore serie con un peso piu' alto solo se la serie col peso piu' alto
  // ha fatto 5 o piu' ripetizioni. quindi se per esempio ho fatto 85kg x8 di pulley, se
  // la volta dopo faccio 90x5, e' meglio".
  //
  // Prima vinceva il punteggio, e li' finiva il contrario: 85 kg x 8 faceva 85 punti,
  // 90 kg x 5 ne faceva 81, e il record restava sul peso piu' basso. Non e' che 85 kg x 8
  // sia una serie migliore di 90 kg x 5: sono cinque buone ripetizioni con piu' ferro.
  //
  // Quindi: fra le serie con almeno 5 ripetizioni vince il peso piu' alto, e a parita' di
  // peso vince la serie con piu' ripetizioni. Una serie con MENO di 5 ripetizioni non
  // puo' diventare il record solo perche' pesa di piu': se non c'e' niente con 5 o piu',
  // si sceglie comunque la piu' buona fra quelle che ci sono, altrimenti non ci sarebbe
  // nessun record.
  const RIP_MINIME_PER_PESO = 5;
  const serieConRip = valutabili.filter((v) => v.ripetizioni >= RIP_MINIME_PER_PESO);
  const pool = serieConRip.length ? serieConRip : valutabili;
  const migliore = pool.reduce((a, b) => {
    if (b.carico > a.carico) return b;
    if (b.carico < a.carico) return a;
    return b.ripetizioni > a.ripetizioni ? b : a;
  });

  // le soglie: tre valori dell'esercizio, riportati sul tuo corpo e convertiti
  // nell'unita' dello score (kg-equivalenti per 8 rip)
  const tre = sogliePerEsercizio(valori, livello, pesoCorporeo, movimento, esercizio || {});
  if (!tre) {
    return { valido: false, motivo: 'peso corporeo non disponibile', movimento, livello };
  }
  const fattore = fattoreSogliaDaKg(esercizio);
  const soglie = soglieDaValori({
    ingresso: tre.ingresso * fattore,
    vertice: tre.vertice * fattore,
    curva: tre.curvaRank || undefined,
  });
  if (!soglie) {
    return { valido: false, motivo: 'soglie incoerenti', movimento, livello };
  }

  // IL VOLUME E' DELLA SEDUTA, NON DI SEMPRE (Ste, 18/10/2026): "ma non sono 6 serie".
  //
  // Il bonus contava TUTTE le serie di sempre: tre del 10/10 piu' tre del 17/10 facevano
  // sei, e la scheda scriveva "volume: 6 serie (+20%)". Ma due allenamenti a una
  // settimana di distanza non sono un volume: il volume e' quello che hai fatto IN QUELLA
  // SEDUTA, cioe' quante serie hai spinto insieme alla serie che ti ha fatto il record.
  //
  // Quindi si conta la seduta della serie migliore. Se le serie non hanno un `seduta_id`
  // (i test, e gli esercizi vecchi) si torna a contarle tutte: peglio il numero che
  // avevamo prima che nessun numero.
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
    serieTotali: nTotali,
    caricoReale: migliore.carico,
    spotter: !!migliore.spotter,
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
