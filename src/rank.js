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
  DIVISIONI,
  divisioneDaLp,
  profiloEsercizio,
  profiloPerPesoCorporeo,
  pesoCorporeoValido,
  descriviPunteggio,
  spessoreSoglia,
  pesoReale,
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
    // Ste (04/10/2026): "deve capire che sono 35 kg per braccio per chest press
    // di petto, lo sa questo no?"
    //
    // No, e il conto era dimezzato. Su una macchina a dischi i dischi stanno su
    // entrambi i bracci: 35 kg per braccio sono 70 kg, non 35. Il Rank usava 35.
    //
    // Il totale si calcola QUI e da nessun'altra parte: e' il numero che decide il
    // Rank, quindi se il fattore lo moltiplicasse un altro pezzo di codice i due
    // posti potrebbero non essere d'accordo, e il Rank dipenderebbe da quale dei
    // due hai chiesto per primo.
    // Il TOTALE si calcola qui e da nessun'altra parte, perche' e' il numero che
    // decide il Rank: se lo moltiplicasse un altro pezzo di codice, i due posti
    // potrebbero non essere d'accordo e il Rank dipenderebbe da quale dei due hai
    // chiesto per primo.
    //
    // Qui ci finisce anche la carrucola. Ste: "di hammer curl faccio 50kg ma e'
    // doppia carrucola quindi sarebbero 25". E la regola tricky e' questa: il
    // doppio carrucola si usa su UN braccio alla volta, quindi il peso e' gia'
    // dimezzato e NON va anche raddoppiato come sulle macchine a dischi. Se si
    // applicassero i due insieme la correzione si annullerebbe e l'app leggerebbe
    // di nuovo 50, cioe' il numero sbagliato di prima.
    // Ste: "il massimale deve restare il numero di peso che metto in una sola
    // parte". Quindi niente raddoppio: il massimale e' sul numero che ha scritto
    // lui. La carrucola invece resta, perche' quella e' meccanica: sul doppio
    // carrucola il peso che senti e' davvero meta'.
    const totale = pesoReale(peso, { carrucola: p.carrucola });
    if (totale === null) return { ...vuoto, motivo: 'mancano i kg o le ripetizioni' };
    const stima = stimaMassimo(totale, rip);
    if (stima === null) return { ...vuoto, motivo: 'mancano i kg o le ripetizioni' };
    // Ste: "vuol dire che il mio massimale e' 44.33? se si' scrivi massimale non
    // stima". Aveva ragione: e' il massimale, e con un termine tecnico non si
    // capisce cosa sia. Quindi: massimale.
    // Ste ha chiesto che la riga sotto la serie dica il peso VERO, non quello
    // scritto. Mostrare "50 kg" quando ne stai spostando 25 e' peggio che non
    // mostrare niente: e' un numero che mente.
    const cheSai = [];
    if (p.carrucola === 'carrucola_doppia') {
      cheSai.push(`doppia carrucola: il peso che senti e' ${totale} kg`);
    }
    const inChiaro = cheSai.length ? ` ${cheSai.join(', ')}` : '';
    return {
      valido: true,
      punteggio: stima,
      testo: `${serie.peso} kg${inChiaro} x ${serie.ripetizioni} (massimale ${stima} kg)`,
      tipo: 'stima',
    };
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
/**
 * Bonus per le serie fatte, sul Rank e non sul massimale.
 *
 * Ste (04/10/2026): "se fai piu' serie, l'app ti da' un po' di merito in piu'.
 * Sempre piccolo, al massimo l'8%".
 *
 * Perche' piccolo: se il bonus fosse grosso, salendo di livello il rank
 * crescerebbe per due motivi insieme (carico che sale e serie che salgono), e
 * non sapresti quale dei due ti abbia alzato. Con l'8% massimo il bonus non e'
 * mai la spiegazione principale.
 *
 * Perche' non la media delle serie: punirebbe chi chiude le serie a cedimento,
 * e il cedimento e' una buona abitudine. Il massimale resta quello della serie
 * migliore, che e' come si misura in palestra.
 */
const FATTORE_SERIE = [1, 1.03, 1.06, 1.08];

export function bonusSerie(serieFatte) {
  const n = Number(serieFatte);
  if (!Number.isFinite(n) || n <= 1) return { fattore: 1, bonus: 0 };
  const i = Math.min(FATTORE_SERIE.length - 1, Math.floor(n) - 1);
  const fattore = FATTORE_SERIE[i];
  return { fattore, bonus: Math.round((fattore - 1) * 100) };
}

export function recordEsercizio(serie, esercizio, profilo = null, pesoAttuale = null) {
  const res = performanceEsercizio(serie, esercizio, profilo, pesoAttuale);
  if (!res.migliore) {
    return {
      esercizio, profilo: res.profilo, valido: false, motivo: 'nessuna prestazione registrata',
      punteggio: null, rank: null, lp: 0, testo: '', pesoCorporeo: null,
      sottoSoglia: false, mancaAlPrimo: null, prossimoObiettivo: null,
    };
  }
  // Bonus serie: Ste "se fai piu' serie l'app ti da' un po' di merito in piu'".
  // Va sul rank e non sul massimale, perche' il massimale deve restare quello
  // della serie migliore: e' quello che si misura in palestra.
  const bonus = bonusSerie(res.tutte.length);
  const punteggioConSerie = bonus.fattore > 1
    ? Math.round(res.migliore.punteggio * bonus.fattore * 100) / 100
    : res.migliore.punteggio;
  const r = calcolaRank(punteggioConSerie, res.profilo);
  const testoSerie = bonus.bonus > 0
    ? ` (+${bonus.bonus}% per ${res.tutte.length} serie)`
    : '';
  return {
    esercizio,
    profilo: res.profilo,
    valido: true,
    punteggio: res.migliore.punteggio,
    testo: res.migliore.testo + testoSerie,
    serieFatte: res.tutte.length,
    bonusSerie: bonus.bonus,
    serie: res.migliore.serie,
    pesoCorporeo: res.migliore.pesoCorporeo,
    // tutto quello che calcola calcolaRank, così le schermate non perdono
    // campi (prima "prossimoObiettivo" non arrivava e la frase del Rank
    // ricadeva sul nome del rank sbagliato)
    rank: r.rank,
    rankId: r.rankId,
    lp: r.lp,
    divisione: r.divisione,
    progresso: r.progresso,
    prossimoRank: r.prossimoRank,
    prossimaDivisione: r.prossimaDivisione,
    prossimoObiettivo: r.prossimoObiettivo,
    sogliaAttuale: r.sogliaAttuale,
    sogliaSuccessiva: r.sogliaSuccessiva,
    sottoSoglia: r.sottoSoglia,
    mancaAlPrimo: r.mancaAlPrimo,
    inTop: r.inTop,
    quanteSerieValide: res.tutte.length,
  };
}

/**
 * QUANTO HO FATTO, in parole semplici.
 *
 * Ste (04/10/2026): "aggiungi un qualcosa che identifica se l'esercizio e'
 * facile o difficile e capisce se e' tanto quello che fai o poco e stabilisce
 * il tuo rank".
 *
 * Il numero da solo non basta: 12 kg su un esercizio di isolamento sono
 * tantissimi, e 12 kg su un leg press non sono niente. Quindi qui si fa due
 * cose insieme:
 *   1) si guarda DOVE sei nella scala di quell'esercizio (e la scala cambia
 *      per esercizio, per il suo livello di difficolta' e per il tuo peso);
 *   2) si tiene conto del livello: sulle alzate laterali un numero basso e'
 *      gia' tanto, quindi la frase lo dice, e il giudizio sale un gradino.
 *
 * Restituisce un giudizio con parole, non colori da capire: "poco", "discreto",
 * "tanto", "molto".
 */
export function giudizioPerformance(profilo, punteggio) {
  const p = profilo || profiloEsercizio(null);
  const s = p.soglie || [];
  const n = numero(punteggio);
  const livello = p.livello || null;
  if (!s.length || n === null) {
    return { valido: false, livello, frase: 'Non c\'e\' ancora nessuna prestazione su questo esercizio.', giudizio: null };
  }

  // quanto vale, in percentuale, il riferimento (PLATINUM) di questo esercizio
  const rif = p.riferimento || s[3] || 1;
  const quota = Math.max(0, n / rif);

  // il livello sposta la percezione: sull'isolamento gli stessi numeri valgono
  // molto di piu' che su un esercizio grande, quindi il giudizio sale.
  // Ste: "tipo alzate laterali e' difficile quindi anche un carico basso puo'
  // essere tanto": quindi sull'isolamento la scala sale parecchio.
  const alza = livello === 'isolamento' ? 0.28 : (livello === 'grande' ? -0.12 : 0);
  const q = quota + alza;

  let giudizio;
  let fraseBase;
  if (n < s[0]) {
    giudizio = 'sotto';
    fraseBase = 'sotto il bronzo: hai appena mosso i pesi su questo esercizio';
  } else if (q < 0.72) {
    giudizio = 'poco';
    fraseBase = 'poco, ma e\' il primo gradino e l\'hai preso';
  } else if (q < 0.88) {
    giudizio = 'discreto';
    fraseBase = 'discreto: e\' un buon livello per un esercizio';
  } else if (q < 1.00) {
    giudizio = 'tanto';
    fraseBase = 'tanto: sei vicino al platino';
  } else {
    giudizio = 'molto';
    fraseBase = 'molto: questo e\' un livello alto, guarda solo te';
  }

  // la frase finale tiene conto del livello dell'esercizio, che e' il punto
  // che Ste ha chiesto esplicitamente
  let frase = fraseBase;
  if (livello === 'isolamento' && (giudizio === 'discreto' || giudizio === 'tanto' || giudizio === 'molto')) {
    frase += '. E su un esercizio di isolamento il numero e\' basso ma il lavoro e\' vero';
  } else if (livello === 'grande' && (giudizio === 'poco' || giudizio === 'sotto')) {
    frase += '. Qui i numeri sono alti per natura, non ti preoccupare';
  } else if (livello === 'assistito' && (giudizio === 'tanto' || giudizio === 'molto')) {
    frase += '. E su questo esercizio contano le ripetizioni, non i kg';
  }

  return {
    valido: true,
    livello,
    quota: Math.round(quota * 1000) / 1000,
    giudizio,
    frase,
  };
}

/**
 * Il rank e' SEMPRE il risultato della scala dell'esercizio: niente settaggi a
 * mano, niente fudge. Questa funzione esiste solo per ricordarlo a chi legge
 * il codice, e restituisce la scala usata.
 */
export function scalaDelGiudizio(profilo, punteggio) {
  const p = profilo || profiloEsercizio(null);
  return {
    soglie: p.soglie || [],
    riferimento: p.riferimento,
    livello: p.livello || null,
    giudizio: giudizioPerformance(p, punteggio),
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
  const primo = R[0] || null;
  const vuoto = {
    rank: null, rankId: null, lp: 0, divisione: null, progresso: 0,
    sogliaAttuale: soglie[0], sogliaSuccessiva: soglie[0], inTop: false,
    prossimoRank: primo, prossimaDivisione: null,
    // qui si sa ancora quanto manca per il PRIMO rank. Prima questo caso non
    // diceva niente e la card restava vuota: Ste vedeva "nessuna prestazione
    // registrata" anche avendo allenato, e pensava che il Rank fosse rotto.
    sottoSoglia: true,
    mancaAlPrimo: valore === null ? null : Math.max(0, soglie[0] - valore),
    prossimoObiettivo: primo ? { etichetta: `${primo.nome} ${DIVISIONI[0].nome}`, solaDivisione: false } : null,
    punteggio: valore === null ? null : valore,
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

  // "prossimoObiettivo" e' il pezzo successivo con il nome ESATTO che vede
  // Ste, e soprattutto con il numero GIUSTO per quel pezzo.
  //
  // Prima abbinavo la cifra della soglia del RANK DOPIO al nome della DIVISIONE:
  // se eri a BRONZE 2 ti diceva "54 kg per BRONZE 1", ma 54 kg era la soglia
  // del SILVER. Ste: "per arrivare argento 2 devo fare 53.93 kg, che sono un
  // botto". Non era un botto: era semplicemente il numero sbagliato.
  //
  // Adesso il numero e' quello del pezzo indicato:
  //  - se il prossimo passo e' una DIVISIONE dello stesso rank, il numero e'
  //    la soglia di quella divisione;
  //  - se il prossimo passo e' il RANK dopo, il numero e' la sua soglia.
  const divisioneCorrente = divisioneDaLp(lp);
  const sotto = soglie[indice];
  let prossimoObiettivo = null;
  if (!eTop) {
    const prossima = prossimaDivisione(divisioneCorrente);
    const seguente = R[indice + 1];
    if (prossima) {
      // stessa fascia di rank: la divisione si raggiunge a un certo punto
      // dentro il rank, calcolato con gli stessi LP della barra
      const spessore = spessoreSoglia(p, indice) || 1;
      const aLp = 100 - 33 * (2 - DIVISIONI.findIndex((d) => d.nome === prossima.nome));
      prossimoObiettivo = {
        etichetta: `${rank.nome} ${prossima.nome}`,
        solaDivisione: true,
        punteggio: sotto + spessore * (aLp / 100),
      };
    } else {
      prossimoObiettivo = {
        etichetta: `${seguente.nome} ${DIVISIONI[0].nome}`,
        solaDivisione: false,
        punteggio: soglie[indice + 1],
      };
    }
  }

  return {
    rank: { ...rank, indice },
    rankId: rank.id,
    indice,
    lp,
    divisione: eTop ? null : divisioneCorrente,
    progresso,
    sogliaAttuale: soglie[indice],
    sogliaSuccessiva: eTop ? null : soglie[indice + 1],
    inTop: eTop,
    prossimoRank: eTop ? null : R[indice + 1],
    prossimaDivisione: (!eTop && lp >= 90) ? prossimaDivisione(divisioneCorrente) : null,
    prossimoObiettivo,
    punteggio: valore,
  };
}

/**
 * La divisione DOPO quella indicata.
 *
 * Prima questa funzione riceveva un oggetto rank, ma un rank non ha mai avuto
 * la proprieta' "divisione": quindi non trovava nulla e restituiva sempre null.
 * Ora riceve direttamente la divisione corrente ({ nome: 'II' }) e restituisce
 * davvero la successiva ('I'), oppure null se sei gia' alla I.
 */
function prossimaDivisione(divisione) {
  const ordine = ['III', 'II', 'I'];
  const nome = divisione && divisione.nome ? String(divisione.nome).toUpperCase() : '';
  const i = ordine.indexOf(nome);
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
export function recordAccount(esercizi, gruppi, { soloConDati = true, pesoAttuale = null } = {}) {
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
    const rec = recordEsercizio(serie || [], e, null, pesoAttuale);
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