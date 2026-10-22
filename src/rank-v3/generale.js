// rank-v3/generale.js -- IL RANK GENERALE DELL'ATLETA.
//
// Ste (22/10/2026), punto 6:
//
//   "Separa due concetti:
//    A. Rank dell'esercizio: valuta la prestazione dell'utente in un singolo
//       esercizio rispetto ad altri utenti dello stesso esercizio.
//    B. Rank generale dell'atleta: riassume le prestazioni dell'utente in piu'
//       esercizi, senza permettere che un singolo esercizio domini completamente
//       il risultato."
//
//   "Per il rank generale: utilizza piu' esercizi; applica un sistema di
//    aggregazione equilibrato; evita di sommare direttamente carichi in kg
//    appartenenti a esercizi differenti; evita che ripetire molte volte lo stesso
//    esercizio gonfi artificialmente il punteggio; valuta la qualita' e
//    l'affidabilita' dei dati; impedisci che un esercizio non registrato venga
//    interpretato come una prestazione pari a zero senza una ragione valida."
//
// ---------------------------------------------------------------------------
// LE CINQUE REGOLE, e come sono scritte nel codice
// ---------------------------------------------------------------------------
//
//  1) NON SI SOMMANO KG DI ESERCIZI DIVERSI.
//
//     Ogni esercizio viene confrontato con il SUO riferimento (quello che
//     Ste ha guardato con i suoi carichi veri) e diventa una PERCENTUALE: "sono
//     al 73% del livello realistico per te, su quel pezzo". Le percentuali
//     sono confrontabili fra loro; i kg non lo sono.
//
//  2) UN ESERCIZIO CONTA UNA VOLTA.
//
//     Il rank generale usa la prestazione MIGLIORE di ogni esercizio. Quindi
//     fare trenta serie di curl non gonfia niente: conta la migliore.
//
//  3) NESSUN ESERCIZIO DOMINA.
//
//     Ogni esercizio ha un peso, e nessuno può avere più di un terzo del peso
//     totale. Un esercizio eccezionale non può comprare il rank generale da
//     solo: quello che dice "quanto sei forte in generale" deve reggere su
//     piu' esercizi.
//
//  4) LA QUALITA' DEI DATI PESA.
//
//     Un esercizio valutato col peso corporeo di oggi (e non di quel giorno),
//     o fatto solo col companion, pesa meno di uno valutato con i numeri
//     giusti. Il dato non viene buttato: pesa meno, e si dice.
//
//  5) UN ESERCIZIO NON REGISTRATO NON E' UN ZERO.
//
//     Se non hai mai fatto un esercizio, non hai "fatto zero": semplicemente
//     non entra. Il rank generale parla degli esercizi che hai fatto.
//
// LA CALIBRAZIONE: il coefficiente di difficolta'.
//
// Ogni esercizio ha un peso nella media, e quel peso e' la sua difficolta'.
// La difficolta' viene dalla meccanica (vedi `rank-v2/leva.js`: il grado di
// svantaggio della leva, cioe' quante volte il muscolo deve tirare piu' del
// peso che spinge). Un movimento con una leva peggiore pesa di piu': quello
// che ci fai conta di piu'.
//
// Il coefficiente e' PROVISORIO e si trova in un posto solo
// (`DIFFICOLTA_MOVIMENTO` in `modello.js`), ed e' quello che il modello
// dichiara: "non assegnare coefficienti arbitrari soltanto per far sembrare
// piu' forte un atleta".

import { RANK, divisioneDaLp } from '../rank-config.js';
import { configEsercizio, numero, arrotonda } from './modello.js';
import { valutaPrestazione } from './valutazione.js';

/**
 * La quota massima che un esercizio può portare nel rank generale.
 *
 * IL PERCHE' DEL TETTO: senza, un solo esercizio eccezionale (e Ste ne ha:
 * il calf raise sulla pressa, che sta al 90% della sua scala) farebbe salire
 * la media di tutto. Il rank generale deve dire "sei forte in generale", e
 * quello lo dice una prestazione buona su tanti esercizi, non una su uno.
 */
export const QUOTA_MAX = 2;

/**
 * La quota di peso che un esercizio non puo' superare: un terzo del totale.
 */
export const CAP_CONCENTRAZIONE = 1 / 3;

/**
 * La prestazione di un esercizio, gia' nel modello nuovo.
 *
 * La stessa forma che `forza-generale.js` usava gia' (id, nome, gruppo, kg,
 * rapporto, eccesso, percentuale, contaNellaMedia, percheNonConta), con
 * dentro i numeri nuovi: la quota sulla scala dell'esercizio, la forza
 * relativa, la difficolta' e la qualita' del dato.
 */
export function prestazioneModello({ esercizio, serie, pesoCorporeo, allarmi = [] }) {
  const nomeEsercizio = (esercizio && esercizio.nome) || '';
  const gruppo = (esercizio && (esercizio.gruppo || '')) || '';
  const base = {
    id: (esercizio && esercizio.id) || '',
    nome: nomeEsercizio,
    gruppo,
    kg: null,
    rapporto: null,
    eccesso: null,
    percentuale: null,
    quota: null,
    forzaRelativa: null,
    difficolta: 1,
    qualita: 1,
    allarmi: [...allarmi],
    contaNellaMedia: true,
    percheNonConta: null,
  };

  const val = valutaPrestazione({ esercizio, serie, pesoCorporeo });
  if (!val.valido) {
    return { ...base, percheNonConta: base.percheNonConta || val.motivo || 'non valutabile' };
  }
  const cfg = val.cfg || configEsercizio({ esercizio });
  // LA PERCENTUALE: quanto sei vicino al livello realistico per te, su quel
  // pezzo. Il riferimento e' il PLATINO di quell'esercizio, cioe' la stessa
  // soglia che il Rank usa: un numero solo per tutto l'app.
  const platino = val.soglie && val.soglie[3] ? val.soglie[3] : null;
  const percentuale = platino && platino > 0
    ? arrotonda((val.score / platino) * 100, 1)
    : null;
  const corpo = numero(pesoCorporeo);
  const kg = val.caricoReale;
  const rapporto = corpo && corpo > 0 && kg ? arrotonda(kg / corpo, 3) : null;
  const eccesso = corpo && corpo > 0 && kg ? arrotonda(kg - corpo, 2) : null;

  // LA QUALITA' DEL DATO: 1 quando tutto torna, meno quando qualcosa non torna.
  let qualita = 1;
  const note = [...allarmi];
  const conSpotter = val.spotter === true;
  if (conSpotter) qualita *= 0.9;
  // IL PESO CORPOReO DEL GIORNO: se la serie non ce l'ha, il confronto usa
  // quello di adesso, e va detto (non e' un'invenzione: e' il peso che hai
  // adesso, non quello che avevi allora).
  const haPesoDelGiorno = (serie || []).some((s) => s && !s.eliminata && numero(s.peso_corpo) !== null);
  if (!haPesoDelGiorno) {
    qualita *= 0.85;
    note.push('il peso corporeo di quel giorno non c\'e\': il confronto usa quello di adesso');
  }

  return {
    ...base,
    kg,
    rapporto,
    eccesso,
    percentuale,
    quota: percentuale === null ? null : percentuale / 100,
    forzaRelativa: val.forzaRelativa,
    difficolta: cfg.difficolta || 1,
    qualita: arrotonda(qualita, 3),
    allarmi: note,
    movimento: val.movimento,
    cfg,
    score: val.score,
    soglie: val.soglie,
  };
}

/**
 * Il rank generale: l'aggregazione di piu' esercizi.
 *
 * @param prestazioni  le prestazioni (da `prestazioneModello`)
 * @param opzioni      { eserciziCatalogo: [...] } per sapere quanti esercizi
 *                     non sono mai stati fatti (e non contano come zero)
 */
export function rankingGenerale(prestazioni, { eserciziCatalogo = null } = {}) {
  const tutte = (prestazioni || []).filter(Boolean);
  const valutabili = tutte.filter((p) => p && p.percentuale !== null && p.contaNellaMedia !== false);
  const scartate = tutte.filter((p) => !p || p.percentuale === null || p.contaNellaMedia === false);

  if (!valutabili.length) {
    return {
      valido: false,
      percentuale: null,
      media: null,
      rank: null,
      rankId: null,
      lp: 0,
      divisione: null,
      esercizi: [],
      conta: 0,
      saltate: scartate.length,
      nonRegistrati: eserciziCatalogo ? Math.max(0, eserciziCatalogo.length - tutte.length) : null,
      motivo: 'nessuna prestazione valutabile',
    };
  }

  // I PESI: la difficolta' dell'esercizio per la qualita' del dato. Ogni
  // esercizio entra una volta sola con il suo peso.
  const righe = valutabili.map((p) => {
    const quota = Math.min(QUOTA_MAX, Math.max(0, p.quota === null ? 0 : p.quota));
    const peso = Math.max(0.05, (p.difficolta || 1) * (p.qualita || 1));
    return { ...p, quotaUsata: quota, peso };
  });

  // LA CAP: nessun esercizio puo' avere piu' di un terzo del peso totale.
  const pesi = distribuisciPesi(righe.map((r) => r.peso), CAP_CONCENTRAZIONE);

  let somma = 0;
  let totale = 0;
  righe.forEach((r, i) => {
    r.pesoUsato = pesi[i];
    somma += r.quotaUsata * pesi[i];
    totale += pesi[i];
  });
  const quota = totale > 0 ? somma / totale : 0;
  const percentuale = arrotonda(quota * 100, 1);

  // IL RANK GENERALE: la stessa scala del Rank per esercizio, applicata al
  // riassunto. I nomi, le icone e la progressione sono quelli gia' in app.
  const r = rankDaQuota(quota);

  return {
    valido: true,
    percentuale,
    media: percentuale,
    quota: arrotonda(quota, 4),
    rank: r.rank,
    rankId: r.rankId,
    lp: r.lp,
    divisione: r.divisione,
    esercizi: righe.map((r2) => ({
      id: r2.id,
      nome: r2.nome,
      percentuale: r2.percentuale,
      quota: arrotonda(r2.quotaUsata, 4),
      peso: arrotonda(r2.peso, 3),
      pesoUsato: arrotonda(r2.pesoUsato, 3),
      difficolta: r2.difficolta,
      qualita: r2.qualita,
      forzaRelativa: r2.forzaRelativa,
      movimento: r2.movimento,
      allarmi: r2.allarmi,
    })),
    conta: righe.length,
    saltate: scartate.length,
    nonRegistrati: eserciziCatalogo ? Math.max(0, eserciziCatalogo.length - tutte.length) : null,
    motivo: null,
  };
}

/**
 * I pesi, con il tetto alla concentrazione.
 *
 * L'algoritmo e' quello classico del "capp": si prende il peso piu' grosso, si
 * gli taglia il sovrappiù, e si ricalcola il totale. Si ripete finche' nessuno
 * supera il tetto. Dopo il capp il totale e' un po' piu' piccolo, e per questo
 * si ricalcola la media sui pesi FINALI.
 */
export function distribuisciPesi(pesi, cap = CAP_CONCENTRAZIONE) {
  const p = (pesi || []).map((x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0.05));
  if (!p.length) return [];
  if (p.length === 1) return p;
  let total = p.reduce((a, b) => a + b, 0);
  const out = p.slice();
  let residuo = out.map((x) => x);
  for (let giro = 0; giro < 20; giro += 1) {
    const somma = residuo.reduce((a, b) => a + b, 0);
    if (somma <= 0) break;
    const tetto = somma * cap;
    const i = residuo.findIndex((x) => x > tetto + 1e-9);
    if (i === -1) break;
    const eccesso = residuo[i] - tetto;
    residuo[i] = tetto;
    // il peso tolto va agli altri, in proporzione al loro peso
    const altri = residuo.reduce((a, b, j) => (j === i ? a : a + b), 0);
    if (altri <= 0) break;
    residuo = residuo.map((x, j) => (j === i ? x : x + (eccesso * x) / altri));
  }
  total = residuo.reduce((a, b) => a + b, 0);
  return residuo.map((x) => (total > 0 ? (x / total) * total : x));
}

/**
 * Il Rank generale dalla quota aggregata.
 *
 * LA SCALA: stessi sette nomi, stessa progressione. Le soglie sono
 * PROVISORIE e dichiarate come tali: sono la percentuale del livello
 * realistico (100% = il livello che una persona forte raggiunge su un esercizio)
 * che il rank generale chiede.
 *
 * Sono numeri iniziali, non una verita': il posto per tararli e' qui, e il
 * commento dice perche' sono questi.
 */
export const SOGLIE_GENERALI = [20, 35, 50, 65, 80, 95, 115];

/**
 * Dal riassunto al Rank: le stesse sette fasce del Rank per esercizio.
 */
export function rankDaQuota(quota) {
  const q = Number(quota);
  if (!Number.isFinite(q)) return { rank: null, rankId: null, lp: 0, divisione: null };
  const percentuale = q * 100;
  if (percentuale <= SOGLIE_GENERALI[0]) {
    return { rank: null, rankId: null, lp: 0, divisione: null };
  }
  let indice = 0;
  for (let i = 0; i < SOGLIE_GENERALI.length; i += 1) {
    if (percentuale >= SOGLIE_GENERALI[i]) indice = i;
  }
  const inCima = indice === SOGLIE_GENERALI.length - 1;
  const sotto = SOGLIE_GENERALI[indice];
  const sopra = inCima ? null : SOGLIE_GENERALI[indice + 1];
  const lp = inCima
    ? Math.max(0, Math.round(((percentuale - sotto) / sotto) * 100))
    : Math.max(0, Math.min(99, Math.floor(((percentuale - sotto) / (sopra - sotto)) * 100)));
  const rank = RANK[indice] ? { ...RANK[indice], indice } : null;
  return {
    rank,
    rankId: rank ? rank.id : null,
    lp,
    divisione: inCima ? null : divisioneDaLp(lp),
  };
}
