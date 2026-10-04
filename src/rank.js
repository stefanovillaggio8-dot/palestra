// rank.js -- il motore del Rank. Nessun DOM, nessuna rete: solo calcoli,
// cosi' si puÃ² provare tutto con node --test.
//
// Regola piu' importante: il Rank dipende dalla MIGLIORE performance mai fatta
// su quell'esercizio, mai dall'ultima serie. E la performance non e' il peso
// grezzo: tiene conto anche delle ripetizioni (stima 1RM), del tempo, della
// distanza, secondo il tipo di misura dell'esercizio.

import {
  RANK,
  RANK_PER_ID,
  MISURE,
  divisioneDaLp,
  profiloEsercizio,
  profiloPerPesoCorporeo,
  pesoCorporeoValido,
  descriviPunteggio,
  spessoreSoglia,
} from './rank-config.js';

const R = RANK;
const PER_ID = RANK_PER_ID;
const M = MISURE;

// ---------------------------------------------------------------------------
// 1. La stima del massimo: quanto hai spinto davvero.
// ---------------------------------------------------------------------------

/**
 * 1RM stimato da una serie di kg e ripetizioni.
 *  - fino a 10 ripetizioni: Epley (quella che usa quasi tutti)
 *  - da 11 a 30: Brzycki, che stima meglio le serie lunghe
 *  - oltre 30: non si stima (il numero diventa inventato): si prende il tetto
 * Non e' mai il peso della serie: e' la stima di quanto reggeresti con una
 * ripetizione sola.
 */
export function stimaMassimo(peso, ripetizioni) {
  const p = Number(peso);
  const r = Number(ripetizioni);
  if (!Number.isFinite(p) || !Number.isFinite(r)) return null;
  if (p <= 0 || r <= 0) return null;
  if (r <= 1) return arrotonda(p);
  if (r <= 10) return arrotonda(p * (1 + r / 30));
  if (r <= 30) return arrotonda((p * 36) / (37 - r));
  return arrotonda(p * 4.3);
}

function arrotonda(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function numero(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// 2. Il punteggio di una singola serie.
// ---------------------------------------------------------------------------

/**
 * Quanto vale, in punteggio, questa serie di questo esercizio.
 * Restituisce sempre un oggetto: `valido: false` spiega perche' non si puo'
 * valutare la serie (manca il numero, e' saltata, c'e' stato lo spotter).
 */
export function punteggioSerie(serie, profilo) {
  const p = profilo || profiloEsercizio(null);
  const vuoto = { valido: false, punteggio: null, motivo: 'serie vuota', testo: '' };
  if (!serie) return vuoto;
  if (serie.eliminata) return { ...vuoto, motivo: 'serie cancellata' };
  if (serie.stato && serie.stato !== 'fatta') {
    // una serie non spuntata non e' una prestazione: non la si premia
    return { ...vuoto, motivo: 'serie non fatta' };
  }
  if (serie.spotter === true) {
    return { ...vuoto, motivo: 'serie con lo spotter: non e\' un record pulito' };
  }

  const peso = numero(serie.peso);
  const rip = numero(serie.ripetizioni);
  const assistenza = numero(serie.peso_assistenza);

  if (p.misura === M.KG_REPS) {
    const stima = stimaMassimo(peso, rip);
    if (stima === null) return { ...vuoto, motivo: 'mancano i kg o le ripetizioni' };
    return { valido: true, punteggio: stima, testo: `${serie.peso} kg x ${serie.ripetizioni} (stima ${stima} kg)`, tipo: 'stima' };
  }

  if (p.misura === M.SOLO_REPS) {
    if (rip === null || rip <= 0) return { ...vuoto, motivo: 'mancano le ripetizioni' };
    let punteggio = rip;
    if (p.assistito && assistenza !== null && assistenza > 0) {
      punteggio = Math.max(0, rip - assistenza * p.coefficientAssistenza);
    }
    const testoAssistenza = (p.assistito && assistenza)
      ? ` (${assistenza} kg di assistenza)`
      : '';
    return {
      valido: true,
      punteggio: arrotonda(punteggio),
      testo: `${serie.ripetizioni} ripetizioni${testoAssistenza}`,
      tipo: 'ripetizioni',
    };
  }

  if (p.misura === M.TEMPO) {
    if (rip === null || rip <= 0) return { ...vuoto, motivo: 'mancano i secondi' };
    return { valido: true, punteggio: arrotonda(rip), testo: `${serie.ripetizioni} secondi`, tipo: 'tempo' };
  }

  if (p.misura === M.DISTANZA) {
    if (rip === null || rip <= 0) return { ...vuoto, motivo: 'mancano i metri' };
    return { valido: true, punteggio: arrotonda(rip), testo: `${serie.ripetizioni} metri`, tipo: 'distanza' };
  }

  if (p.misura === M.KG_TEMPO) {
    if (peso === null || peso <= 0 || rip === null || rip <= 0) {
      return { ...vuoto, motivo: 'mancano i kg o i secondi' };
    }
    // kg tenuti per minuto: piu' kg e piu' secondi insieme valgono di piu'
    const punteggio = arrotonda((peso * rip) / 60);
    return { valido: true, punteggio, testo: `${serie.peso} kg per ${serie.ripetizioni} secondi`, tipo: 'kg_tempo' };
  }

  return { ...vuoto, motivo: 'tipo di misura sconosciuto' };
}

// ---------------------------------------------------------------------------
// 3. La performance migliore di un esercizio.
// ---------------------------------------------------------------------------

/**
 * Il peso corporeo da usare per valutare una serie.
 *
 * Se la serie ha il peso salvato dentro (quando e' stata fatta), si usa QUELLO:
 * e' il peso che avevi in quel momento, e il record storico resta giusto anche
 * se poi ti sei pesato di nuovo. Se invece non c'e', si usa quello di adesso.
 */
export function pesoPerSerie(serie, pesoAttuale) {
  const salvato = pesoCorporeoValido(serie && serie.peso_corpo);
  if (salvato !== null) return salvato;
  return pesoCorporeoValido(pesoAttuale);
}

/**
 * Tutte le serie valutabili di un esercizio, dalla migliore in giu'.
 * Non usa "l'ultima serie": vede tutto quello che e' stato registrato e sceglie
 * il numero piu' alto, che e' la performance migliore.
 *
 * Ogni serie e' valutata con il SUO peso corporeo (quello del giorno in cui l'hai
 * fatta), quindi le performance vecchie non cambiano quando ti pesi di nuovo.
 */
export function performanceEsercizio(serie, esercizio, profilo = null, pesoAttuale = null) {
  const base = profilo || profiloEsercizio(esercizio);
  const tutte = [];
  for (const s of (serie || [])) {
    if (!s || s.eliminata) continue;
    const peso = pesoPerSerie(s, pesoAttuale);
    const p = profiloPerPesoCorporeo(base, peso);
    const res = punteggioSerie(s, p);
    if (!res.valido) continue;
    tutte.push({
      serie: s, punteggio: res.punteggio, testo: res.testo,
      ordine: Number(s.ordine || 0),
      pesoCorporeo: peso,
      soglie: p.soglie,
    });
  }
  tutte.sort((a, b) => {
    if (b.punteggio !== a.punteggio) return b.punteggio - a.punteggio;
    return a.ordine - b.ordine;
  });
  const migliore = tutte.length ? tutte[0] : null;
  // il profilo del record e' quello con il peso del giorno in cui l'hai fatto
  const profiloDelRecord = migliore
    ? profiloPerPesoCorporeo(base, migliore.pesoCorporeo)
    : profiloPerPesoCorporeo(base, pesoAttuale);
  return { profilo: profiloDelRecord, tutte, migliore };
}

/**
 * Il record di un esercizio, con dentro il rank e gli LP corrispondenti.
 * Se non c'e' niente di registrato non viene inventato nessun record.
 */
export function recordEsercizio(serie, esercizio, profilo = null, pesoAttuale = null) {
  const res = performanceEsercizio(serie, esercizio, profilo, pesoAttuale);
  if (!res.migliore) {
    return {
      esercizio, profilo: res.profilo, valido: false, motivo: 'nessuna prestazione registrata',
      punteggio: null, rank: null, lp: 0, testo: '', pesoCorporeo: null,
    };
  }
  const r = calcolaRank(res.migliore.punteggio, res.profilo);
  return {
    esercizio,
    profilo: res.profilo,
    valido: true,
    punteggio: res.migliore.punteggio,
    testo: res.migliore.testo,
    serie: res.migliore.serie,
    pesoCorporeo: res.migliore.pesoCorporeo,
    rank: r.rank,
    rankId: r.rankId,
    lp: r.lp,
    divisione: r.divisione,
    progresso: r.progresso,
    prossimoRank: r.prossimoRank,
    sogliaAttuale: r.sogliaAttuale,
    sogliaSuccessiva: r.sogliaSuccessiva,
    inTop: r.inTop,
    quanteSerieValide: res.tutte.length,
  };
}

// ---------------------------------------------------------------------------
// 4. Il rank e gli LP.
// ---------------------------------------------------------------------------

/**
 * Dal punteggio al rank, con gli LP dentro.
 *
 * Gli LP sono SEMPRE calcolati, mai scritti a mano:
 *  - LP 0 = appena entrato in quel rank
 *  - LP 99 = sta per salire
 *  - LP 100 = sale al rank successivo e ricomincia da 0 con l'avanzo
 *  - sul rank piu' alto (OLYMPIAN) non c'e' niente sopra: gli LP continuano a
 *    crescere per sempre, e i 183 LP dell'esempio sono possibili perche' il
 *    tetto non c'e'.
 */
export function calcolaRank(punteggio, profilo) {
  const p = profilo || profiloEsercizio(null);
  const soglie = p.soglie || [];
  const valore = numero(punteggio);
  const vuoto = {
    rank: null, rankId: null, lp: 0, divisione: null, progresso: 0,
    sogliaAttuale: soglie[0], sogliaSuccessiva: soglie[1] || null, inTop: false,
    prossimoRank: R[0] || null, punteggio: valore === null ? null : valore,
  };
  if (valore === null || valore <= soglie[0]) return vuoto;

  // qual e' l'ultima soglia superata?
  let indice = 0;
  for (let i = 0; i < soglie.length; i++) {
    if (valore >= soglie[i]) indice = i;
  }
  const rank = R[indice];
  const id = PER_ID.get(rank.id);
  const eTop = indice === soglie.length - 1;

  let lp;
  let progresso;
  if (eTop) {
    // oltre l'ultima soglia non c'e' prossimo rank: gli LP crescono senza fine
    const base = soglie[indice] || 1;
    lp = valore > 0 ? Math.max(0, Math.round(((valore - base) / base) * 100)) : 0;
    progresso = 1;
  } else {
    const sotto = soglie[indice];
    const sopra = soglie[indice + 1];
    const spessore = spessoreSoglia(p, indice) || 1;
    const dentro = valore - sotto;
    lp = Math.max(0, Math.min(99, Math.floor((dentro / spessore) * 100)));
    progresso = Math.max(0, Math.min(1, dentro / spessore));
  }

  return {
    rank: { ...rank, indice },
    rankId: rank.id,
    indice,
    lp,
    divisione: eTop ? null : divisioneDaLp(lp),
    progresso,
    sogliaAttuale: soglie[indice],
    sogliaSuccessiva: eTop ? null : soglie[indice + 1],
    inTop: eTop,
    prossimoRank: eTop ? null : R[indice + 1],
    prossimaDivisione: (!eTop && lp >= 90 && id) ? prossimaDivisione(id) : null,
    punteggio: valore,
  };
}

function prossimaDivisione(rank) {
  const ordine = ['III', 'II', 'I'];
  const i = ordine.indexOf(rank.divisione ? rank.divisione.nome : '');
  if (i < 0 || i >= ordine.length - 1) return null;
  return { nome: ordine[i + 1], aLp: 100 - 33 * (2 - i) };
}

// ---------------------------------------------------------------------------
// 5. La classifica di UN esercizio.
// ---------------------------------------------------------------------------

/**
 * La classifica confronta SOLO esercizi fra loro: non somma mai pesi di
 * esercizi diversi (sarebbe sbilanciato: 50 kg di chest press e 50 kg di
 * lateral raise non si possono mettere nella stessa scala).
 *
 * voci = [{ account, username, esercizio, serie, punteggioCalcolato }]
 */
export function classificaEsercizio(voci, profilo = null) {
  const p = profilo || profiloEsercizio(null);
  const righe = [];
  for (const v of (voci || [])) {
    if (!v) continue;
    const punteggio = v.punteggioCalcolato !== undefined && v.punteggioCalcolato !== null
      ? numero(v.punteggioCalcolato)
      : (recordEsercizio(v.serie, v.esercizio, p).valido
        ? recordEsercizio(v.serie, v.esercizio, p).punteggio
        : null);
    if (punteggio === null) continue;
    const r = calcolaRank(punteggio, p);
    righe.push({
      account: v.account || null,
      username: v.username || 'senza nome',
      avatar_id: v.avatar_id || null,
      punteggio,
      testo: v.testo || descriviPunteggio(p, punteggio),
      rank: r.rank,
      rankId: r.rankId,
      lp: r.lp,
      divisione: r.divisione,
      esercizio: v.esercizio || null,
      posizione: 0,
    });
  }
  righe.sort((a, b) => {
    if (b.punteggio !== a.punteggio) return b.punteggio - a.punteggio;
    // a parita' di punteggio chi ha piu' LP davanti, poi nome: la classifica
    // resta stabile e non "salta" da un giorno all'altro
    if (b.lp !== a.lp) return b.lp - a.lp;
    return String(a.username).localeCompare(String(b.username));
  });
  let precedente = null;
  let posizione = 0;
  righe.forEach((r, i) => {
    if (precedente === null || precedente !== r.punteggio) posizione = i + 1;
    r.posizione = posizione;
    precedente = r.punteggio;
  });
  return righe;
}

// ---------------------------------------------------------------------------
// 6. Lo storico dei miglioramenti di un esercizio.
// ---------------------------------------------------------------------------

/**
 * Tutti i momenti in cui il record Ã¨ migliorato.
 * sedute = [{ id, data, completata:true }], serie = tutte le serie.
 * Serve alla pagina dell'esercizio ("storico dei miglioramenti").
 */
export function storicoMiglioramenti(serie, esercizio, sedute, profilo = null) {
  const p = profilo || profiloEsercizio(esercizio);
  const ordinate = (sedute || [])
    .filter((s) => s && s.completata !== false && s.stato !== 'in_corso')
    .slice()
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));
  const tappe = [];
  let migliore = null;
  for (const s of ordinate) {
    const mie = (serie || []).filter((x) => x && !x.eliminata && x.seduta_id === s.id && x.esercizio_id === (esercizio && esercizio.id));
    const res = performanceEsercizio(mie, esercizio, p);
    if (!res.migliore) continue;
    if (migliore !== null && res.migliore.punteggio <= migliore.punteggio) continue;
    migliore = { punteggio: res.migliore.punteggio, testo: res.migliore.testo };
    const r = calcolaRank(migliore.punteggio, p);
    tappe.push({
      data: s.data,
      seduta_id: s.id,
      punteggio: migliore.punteggio,
      testo: migliore.testo,
      testoSerie: res.migliore.testo,
      rank: r.rank,
      rankId: r.rankId,
      lp: r.lp,
      miglioramento: tappe.length ? true : false,
    });
  }
  return tappe;
}

// ---------------------------------------------------------------------------
// 7. I punteggi di un account, esercizio per esercizio.
// ---------------------------------------------------------------------------

/**
 * Tutti i record di un account, dal rank piu' alto al piu' basso.
 * esercizi = catalogo, gruppi = [{esercizio_id, seduta_id, serie}]
 */
export function recordAccount(esercizi, gruppi, { soloConDati = true } = {}) {
  const perEsercizio = new Map();
  for (const g of (gruppi || [])) {
    if (!g || !g.esercizio_id) continue;
    if (!perEsercizio.has(g.esercizio_id)) perEsercizio.set(g.esercizio_id, []);
    perEsercizio.get(g.esercizio_id).push(...(g.serie || []));
  }
  const out = [];
  for (const e of (esercizi || [])) {
    const serie = perEsercizio.get(e.id);
    if (soloConDati && (!serie || !serie.length)) continue;
    const rec = recordEsercizio(serie || [], e);
    out.push(rec);
  }
  out.sort((a, b) => {
    const ia = a.valido && a.rank ? a.rank.indice : -1;
    const ib = b.valido && b.rank ? b.rank.indice : -1;
    if (ib !== ia) return ib - ia;
    return (b.punteggio || 0) - (a.punteggio || 0);
  });
  return out;
}

/** Il rank principale: quello con l'indice di rank piu' alto. */
export function rankPrincipale(records) {
  const validi = (records || []).filter((r) => r && r.valido && r.rank);
  if (!validi.length) return null;
  return validi.slice().sort((a, b) => {
    if (b.rank.indice !== a.rank.indice) return b.rank.indice - a.rank.indice;
    return b.lp - a.lp;
  })[0];
}

/** Quanti record ha per ogni rank: serve al profilo e alle statistiche. */
export function distribuzioneRank(records) {
  const conta = new Map(R.map((r) => [r.id, 0]));
  for (const rec of (records || [])) {
    if (!rec || !rec.valido || !rec.rankId) continue;
    conta.set(rec.rankId, (conta.get(rec.rankId) || 0) + 1);
  }
  return R.map((r) => ({ rank: r, numero: conta.get(r.id) || 0 }));
}

export { MISURE as MISURE_RANK, profiloEsercizio, descriviPunteggio };