// rank-config.js -- la configurazione del gioco: rank, soglie, misure.
//
// Tutto quello che si puo' cambiare senza toccare la logica sta QUI dentro.
// Se domani vuoi un rank nuovo, una soglia diversa o un esercizio con un
// riferimento proprio, si modifica questo file e basta: nessun'altra riga di
// codice da toccare.
//
// Le soglie sono MULTIPLI del riferimento dell'esercizio, quindi ogni esercizio
// ha soglie sue. 50 kg di Chest Press e 50 kg di Lateral Raise NON possono
// darsi lo stesso rank, perche' i due esercizi hanno due riferimenti diversi.

// ---------------------------------------------------------------------------
// 1. I sette rank, in ordine.
// ---------------------------------------------------------------------------

export const RANK = [
  { id: 'bronze',   nome: 'BRONZE',   colore: '#c9743a', ombra: '#5a2f14' },
  { id: 'silver',   nome: 'SILVER',   colore: '#c3ccdb', ombra: '#4a5568' },
  { id: 'gold',     nome: 'GOLD',     colore: '#ffc93c', ombra: '#6b4d00' },
  { id: 'platinum', nome: 'PLATINUM', colore: '#4fe3c1', ombra: '#0d5c4c' },
  { id: 'diamond',  nome: 'DIAMOND',  colore: '#8ad6ff', ombra: '#12496f' },
  { id: 'titan',    nome: 'TITAN',    colore: '#ff4d5e', ombra: '#5c0f18' },
  { id: 'olympian', nome: 'OLYMPIAN', colore: '#ffd166', ombra: '#0d5fa8' },
];

/** I due colori dell'Olympian: oro + azzurro, come richiesto. */
export const OLYMPIAN_SECONDARIO = '#4fc3ff';

export const RANK_PER_ID = new Map(RANK.map((r, i) => [r.id, { ...r, indice: i }]));

/**
 * Le divisioni dentro un rank (come nei giochi online).
 * La IV non esiste: la I e' la piu' vicina al rank successivo.
 */
export const DIVISIONI = [
  { id: 3, nome: 'III', min: 0 },
  { id: 2, nome: 'II',  min: 34 },
  { id: 1, nome: 'I',   min: 67 },
];

export function divisioneDaLp(lp) {
  const n = Math.max(0, Number(lp) || 0);
  let scelta = DIVISIONI[0];
  for (const d of DIVISIONI) if (n >= d.min) scelta = d;
  return scelta;
}

// ---------------------------------------------------------------------------
// 2. I tipi di misura di un esercizio.
//    Ogni tipo ha il suo modo di calcolare la "forza" della serie.
// ---------------------------------------------------------------------------

export const MISURE = {
  KG_REPS: 'kg_reps',      // kg + ripetizioni -> stima 1RM
  SOLO_REPS: 'solo_reps',  // solo ripetizioni (corpo libero, panca, trazioni)
  TEMPO: 'tempo',          // secondi tenuti
  DISTANZA: 'distanza',     // metri
  KG_TEMPO: 'kg_tempo',    // kg tenuti per dei secondi
};

export const ETICHETTE_MISURA = {
  [MISURE.KG_REPS]: 'KG + REPS',
  [MISURE.SOLO_REPS]: 'SOLO REPS',
  [MISURE.TEMPO]: 'TEMPO',
  [MISURE.DISTANZA]: 'DISTANZA',
  [MISURE.KG_TEMPO]: 'KG + TEMPO',
};

/** Il campo della serie dove scrivere il valore, e come chiamarlo. */
export const CAMPO_MISURA = {
  [MISURE.KG_REPS]: { valore: 'peso', unita: 'kg', secondario: 'ripetizioni' },
  [MISURE.SOLO_REPS]: { valore: 'ripetizioni', unita: 'rip', secondario: null },
  [MISURE.TEMPO]: { valore: 'ripetizioni', unita: 'secondi', secondario: null },
  [MISURE.DISTANZA]: { valore: 'ripetizioni', unita: 'metri', secondario: null },
  [MISURE.KG_TEMPO]: { valore: 'peso', unita: 'kg', secondario: 'ripetizioni' },
};

// ---------------------------------------------------------------------------
// 3. La scala dei rank.
//    I multipli sono relativi al RIFERIMENTO dell'esercizio, che vale
//    come un PLATINUM. Sotto il riferimento si sta bene, molto sopra si e' un
//    campione. Ogni esercizio ha il suo riferimento, quindi le soglie sono sue.
// ---------------------------------------------------------------------------

/**
 * x il riferimento: bronze, silver, gold, platinum(=1), diamond, titan, olympian.
 *
 * Ste (04/10/2026), due volte sulla stessa cosa:
 *  - "il posizionamento del grado deve variare per esercizio, ci sono esercizi
 *    piu' difficili e piu' facili tipo con la chest press 35 kg x 8 mi sembra
 *    poco argento 3 o no?"  -> l'argento deve arrivare con una serie normale
 *  - poi, sapendo che pesa 66 kg: la stessa 35x8 doveva dargli ARGENTO 3
 *
* Quindi: l'oro resta impegnativo (88%), il platino è il traguardo (100%), e
 * l'argento è il salto vero ma raggiungibile con una serie onesta. Il bronzo
 * è il gradino d'ingresso, non un premio.
 *
 * Ste (04/10/2026): "per essere olympian 110 kg? manco Ronnie Coleman
 * riuscirebbe, devi renderla realistica". Aveva ragione: sopra il platino la
 * scala cresceva a multiplicative (1.22, 1.52, 1.90) e l'OLYMPIAN finiva a
 * 1.9 volte il platino. Su una chest press, a 66 kg di persona, voleva dire
 * 113 kg di massimale, cioe' 89 kg x 8: non e' un obiettivo, e' un numero
 * inventato.
 *
 * Quindi sopra il platino i gradini sono ravvicinati: il diamondo e' un passo
 * oltre, il titan e' il serio, l'olympian e' il vertice. E resta un tetto:
 * nessun rank puo' chiedere piu' di 2.2 volte il peso della persona, che
 * sarebbe gia' fuori scala umana.
 */
export const MOLTIPLICATORI_SOGLIA = [0.50, 0.72, 0.88, 1.00, 1.10, 1.22, 1.35];

/** Oltre questo multiplo del peso, il rank non e' piu' realistico. */
export const TETTO_PER_PESO = 2.2;

/** Sotto questa soglia non c'e' rank: l'esercizio e' "non ancora valutato". */
export const SOGLIA_MINIMA_ASSOLUTA = 0.0001;

/**
 * Quanti punti di differenza servono per salire di un rank: serve a trasformare
 * il progresso in LP. Ogni rank ha lo stesso "spessore" in multipli, quindi i
 * LP sono sempre comparabili fra un esercizio e l'altro.
 */
export function spessoreSoglia(profilo, indiceRank) {
  const soglie = profilo.soglie;
  const i = Math.max(0, Math.min(indiceRank, soglie.length - 1));
  const sotto = soglie[i];
  const sopra = soglie[i + 1];
  if (sopra === undefined || sopra <= sotto) return 1;
  return sopra - sotto;
}

// ---------------------------------------------------------------------------
// 3 bis. Quanto e' difficile l'esercizio.
// Ste (04/10/2026): "i rank per ogni esercizio devono adattarsi al tipo di
// esercizio, se e' difficile, facile, medio. Tipo alzate laterali e'
// difficile quindi anche un carico basso puo' essere tanto".
//
// Ha ragione, ed e' il punto che mancava: avevo scritto 27 numeri a mano e non
// si capiva da dove venissero. Ora ogni esercizio ha un LIVELLO di difficolta'
// e il suo riferimento nasce da li'.
//
// I rapporti dicono quanto vale il PLATINUM in rapporto al peso della persona:
// sull'esercizio grande e forte (leg press) vale circa il doppio del peso, su
// un esercizio vero di palestra circa il peso, e su un isolamento circa un
// quarto. E' esattamente il punto di Ste: sulle alzate laterali un carico
// basso e' gia' tanto.
// ---------------------------------------------------------------------------

// il classificatore: se l'esercizio non e' nella lista scritta a mano,
// il livello lo capisce dal nome ("Dumbbell Lateral Raise" -> isolamento)
import { classificaEsercizio } from './esercizi-classificatore.js';

export const LIVELLI_DIFFICOLTA = {
  grande:     { id: 'grande',     nome: 'GRANDE',     rapporto: 1.85 },
  composto:   { id: 'composto',   nome: 'COMPOSTO',   rapporto: 0.90 },
  isolamento: { id: 'isolamento', nome: 'ISOLAMENTO', rapporto: 0.34 },
  assistito:  { id: 'assistito',  nome: 'ASSISTITO',  rapporto: null },
};

/**
 * Il livello di ogni esercizio.
 *   grande     = carichi pesanti, movimento facilitato (leg press, sled, row)
 *   composto   = i veri esercizi di palestra (press, pulldown, shoulder press)
 *   isolamento = un muscolo solo e carico basso (lateral raise, curl, pushdown)
 *   assistito  = trazioni e dip: il riferimento sono le ripetizioni pulite
 */
export const LIVELLO_ESERCIZI = {
  'ex-chest-press': 'composto',
  'ex-cable-hammer-curl': 'isolamento',
  'ex-cable-lateral-raise': 'isolamento',
  'ex-cable-overhead-tricep': 'isolamento',
  'ex-leg-extension': 'isolamento',
  'ex-neutral-grip-lat-pulldown': 'grande',
  'ex-dumbbell-bench-pull': 'isolamento',
  'ex-seated-db-shoulder-press': 'composto',
  'ex-cable-fly': 'isolamento',
  'ex-scott-bench-curl': 'isolamento',
  'ex-single-arm-tricep-pushdown': 'isolamento',
  'ex-seated-leg-curl': 'grande',
  'ex-smith-incline-bench': 'composto',
  'ex-seated-cable-row': 'grande',
  'ex-chest-supported-shrug': 'isolamento',
  'ex-sled-press-calf-raise': 'grande',
  'ex-single-leg-press': 'isolamento',
  'ex-one-arm-preacher-curl': 'isolamento',
  'ex-one-arm-cable-reverse-fly': 'isolamento',
  'ex-wrist-curl': 'isolamento',
  'ex-iso-lateral-row': 'grande',
  'ex-lat-pulldown-lats': 'grande',
  'ex-db-lateral-raise': 'isolamento',
  'ex-lying-cable-curl': 'composto',
  'ex-bodyweight-overhead-tricep': 'assistito',
  'ex-pull-ups': 'assistito',
  'ex-dips': 'assistito',
};

/**
 * Come si spiega il livello di un esercizio, in italiano semplice.
 *
 * Serve perché il numero da solo non dice niente: 12 kg su un esercizio di
 * isolamento sono tantissimi, e 12 kg su un leg press sono niente.
 * Ste: "tipo alzate laterali e' difficile quindi anche un carico basso puo'
 * essere tanto".
 */
export function descrizioneLivello(livello) {
  const d = LIVELLI_DIFFICOLTA[livello] || LIVELLI_DIFFICOLTA.composto;
  if (livello === 'isolamento') {
    return 'ISOLAMENTO · carico basso, ma il muscolo lavora tanto';
  }
  if (livello === 'grande') {
    return 'GRANDE · carichi alti, movimento facilitato';
  }
  if (livello === 'assistito') {
    return 'ASSISTITO · contano le ripetizioni, non i kg';
  }
  return 'COMPOSTO · esercizio di forza vero, qui contano i kg';
}

/**
 * Il livello di un esercizio.
 *
 * Ste (04/10/2026): "deve riconoscere si, per questo ti ho detto se puoi
 * metterci un ia".
 *
 * L'ordine e' importante:
 *   1) se l'esercizio e' nella lista scritta a mano,vinca quella (l'ho
 *      verificata una per una e so che e' giusta);
 *   2) altrimenti lo RICONOSCO dal nome, con il classificatore.
 */
export function livelloEsercizio(esercizio) {
  const id = (esercizio && esercizio.id) || '';
  const convenzione = (esercizio && esercizio.convenzione) || null;
  const noto = LIVELLO_ESERCIZI[id];
  if (noto) return noto;
  if (convenzione === 'corpo_libero' || convenzione === 'assistenza') return 'assistito';
  return classificaEsercizio({
    nome: (esercizio && esercizio.nome) || id,
    convenzione,
  }).livello;
}

/** Anche il gruppo muscolare, quando serve saperlo. */
export function gruppoEsercizio(esercizio) {
  const id = (esercizio && esercizio.id) || '';
  const nome = (esercizio && esercizio.nome) || id;
  return classificaEsercizio({ nome, convenzione: (esercizio && esercizio.convenzione) || null }).gruppo;
}

/**
 * Il riferimento PLATINUM di un esercizio, legato al peso della persona.
 *
 * Se il peso non c'e' uso il numero storico (valutato su una persona da 70 kg),
 * cosi' l'app resta usabile anche senza aver mai segnato il peso.
 */
export function riferimentoPerEsercizio(esercizio, pesoCorporeo = null, { storico = null } = {}) {
  const rapporto = LIVELLI_DIFFICOLTA[livelloEsercizio(esercizio)].rapporto;
  if (rapporto === null) {
    return Number(storico) > 0 ? Number(storico) : (RIFERIMENTO_DEFAULT[MISURE.SOLO_REPS] || 12);
  }
  const peso = pesoCorporeoValido(pesoCorporeo);
  if (peso) return Math.round(rapporto * peso * 100) / 100;
  if (Number(storico) > 0) return Number(storico);
  return Math.round(rapporto * PESO_RIFERIMENTO * 100) / 100;
}

// ---------------------------------------------------------------------------
// 4. Il profilo di un esercizio.
//    E' l'unica cosa che serve per calcolare il rank: quale misura si usa e
//    quanto e' "bravura" il riferimento.
// ---------------------------------------------------------------------------

/** Riferimento di default quando un esercizio non ha un profilo suo. */
export const RIFERIMENTO_DEFAULT = {
  [MISURE.KG_REPS]: 60,
  [MISURE.SOLO_REPS]: 15,
  [MISURE.TEMPO]: 60,
  [MISURE.DISTANZA]: 1000,
  [MISURE.KG_TEMPO]: 120,
};

/**
 * Quanto vale 1 kg di assistenza, in ripetizioni perse.
 * Serve per gli esercizi assistiti (trazioni, dip, push up con zavorra):
 * se ti fai aiutare con 15 kg, le ripetizioni contano un po' meno.
 * Cambiabile esercizio per esercizio.
 */
export const COEFFICIENTE_ASSISTENZA_DEFAULT = 0.5;

/**
 * I profili dei singoli esercizio: qui ci sono solo le personalita' che NON
 * si ricavano dal livello di difficolta'.
 *
 * Il riferimento PLATINUM NON e' piu' scritto qui: nasce da
 * LIVELLO_ESERCIZI + il peso della persona (vedi riferimentoPerEsercizio).
 * Ste: "i rank per ogni esercizio devono adattarsi al tipo di esercizio, se e'
 * difficile, facile, medio. Tipo alzate laterali e' difficile quindi anche un
 * carico basso puo' essere tanto".
 *
 * Se un giorno un esercizio ha bisogno di un numero suo, si mette qui
 * `{ riferimento: 123 }` e vince lui.
 */
export const PROFILI = {
  // (nessun riferimento fisso: li decide il livello)
};

/** Le sette soglie di un esercizio, calcolate dal suo riferimento. */
export function soglieDaRiferimento(riferimento, moltiplicatori = MOLTIPLICATORI_SOGLIA) {
  const r = Number(riferimento);
  if (!Number.isFinite(r) || r <= 0) return null;
  return moltiplicatori.map((m) => Math.round(r * m * 100) / 100);
}

// ---------------------------------------------------------------------------
// 3. IL PESO DEL CORPO.
//    Ste ha chiesto che il Rank tenga conto del peso corporeo: chi pesa 60 kg e
//    chi pesa 90 kg non possono avere lo stesso Rank lifting gli stessi 60 kg.
//
//    Come funziona, senza creare un secondo sistema: le soglie di ogni
//    esercizio sono gia' sue (nascono dal suo riferimento).Qui le riscalo in
//    base al peso corporeo della persona. Un uno di 70 kg e' il "peso di
//    riferimento": per lui le soglie sono quelle scritte nella configurazione.
//    Chi pesa meno le soglie scendono, chi pesa piu' salgono.
// ---------------------------------------------------------------------------

export const PESO_RIFERIMENTO = 70;
export const PESO_MINIMO = 25;
export const PESO_MASSIMO = 300;

/** Le misure dove il peso corporeo conta davvero. */
export const MISURE_CON_PESO = {
  [MISURE.KG_REPS]: true,    // forza relativa: 60 kg sollevati su 60 kg corporei
  [MISURE.KG_TEMPO]: true,  // kg tenuti: conta quanto pesi rispetto a te
  [MISURE.SOLO_REPS]: false, // trazioni e push-up: contano le ripetizioni, non il rapporto
  [MISURE.TEMPO]: false,     // plank: 60 secondi sono 60 secondi per tutti
  [MISURE.DISTANZA]: false,  // corsa: metri, non kg
};

/** Il peso corporeo e' sensato? */
export function pesoCorporeoValido(peso) {
  const n = Number(String(peso === null || peso === undefined ? '' : peso).replace(',', '.'));
  if (!Number.isFinite(n) || n < PESO_MINIMO || n > PESO_MASSIMO) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Il profilo di un esercizio con le soglie gia' adatte al peso corporeo.
 *
 * - se il peso non c'e' o non e' sensato, le soglie restano quelle scritte:
 *   l'app continua a funzionare, semplicemente non si valuta la forza relativa.
 * - se l'esercizio e' di tipo TEMPO o DISTANZA, il peso non entra: non ha
 *   senso che un plank di 60 secondi valga di piu' per uno leggero.
 *
 * NON crea un sistema nuovo: restituisce lo stesso profilo con le soglie
 * riscalate, quindi tutto il resto (rank, LP, progressione) resta identico.
 */
export function profiloPerPesoCorporeo(profilo, pesoCorporeo) {
  const p = profilo || profiloEsercizio(null);
  const peso = pesoCorporeoValido(pesoCorporeo);
  const usa = !!MISURE_CON_PESO[p.misura];
  const livello = livelloEsercizio({ id: p.id, convenzione: p.assistito ? 'assistenza' : null });

  if (!usa) {
    // trazioni, dip, plank: il riferimento sono le ripetizioni e non dipende
    // dal peso, quindi le soglie restano quelle del profilo
    return {
      ...p,
      livello,
      soglie: p.soglie,
      pesoCorporeo: peso,
      pesoConsiderato: false,
    };
  }

  // Due casi, e vanno tenuti separati (il bug che avevo: li tenevo uniti e il
  // riferimento diceva 63 mentre le soglie erano fatte su 59.4, quindi il
  // giudizio "quanto ho fatto" era sbagliato):
  //
  //  - riferimento FISSO: qualcuno l'ha scritto a mano. Vince lui, e le soglie
  //    si riscalano sul peso come prima.
  //  - riferimento DA LIVELLO: non l'ha scritto nessuno. Allora il riferimento
  //    e' rapporto x peso della persona e le soglie nascono da quel numero.
  let riferimento;
  let soglie;
  if (p.riferimentoFisso) {
    riferimento = p.riferimento;
    soglie = p.soglie.map((s) => Math.round(s * (peso / PESO_RIFERIMENTO) * 100) / 100);
  } else {
    riferimento = riferimentoPerEsercizio({ id: p.id, convenzione: p.assistito ? 'assistenza' : null }, peso);
    // tetto di realismo: l'OLYMPIAN non puo' valere piu' di 2.2 volte il peso,
    // altrimenti si arriva a numeri che nessuno umano puo' spingere
    const tetto = peso * TETTO_PER_PESO;
    const alto = soglieDaRiferimento(riferimento);
    if (alto[alto.length - 1] > tetto) {
      // stringo i gradini alti per farlo entrare sotto il tetto, restando
      // strettamente crescenti: la prima volta li avevo scalati e senza
      // ricontrollare l'ordine, cosi' il diamondo era piu' basso del platino
      const fattore = tetto / alto[alto.length - 1];
      for (let i = 4; i < alto.length; i++) {
        alto[i] = Math.round(Math.max(alto[i] * fattore, alto[i - 1] + 0.5) * 100) / 100;
      }
      // se il tetto e' talmente streto da starci sotto il platino, il platino
      // stesso si abbassa: meglio una scala piccola che una scala rotta
      if (alto[4] <= alto[3]) {
        for (let i = 1; i < alto.length; i++) {
          alto[i] = Math.round(alto[i] * fattore * 100) / 100;
        }
        for (let i = 1; i < alto.length; i++) {
          if (alto[i] <= alto[i - 1]) alto[i] = Math.round((alto[i - 1] + 0.5) * 100) / 100;
        }
      }
    }
    soglie = alto;
  }
  if (!peso) {
    // nessun peso: il profilo resta come com'e'
    return { ...p, livello, pesoCorporeo: null, pesoConsiderato: false };
  }

  return {
    ...p,
    riferimento,
    soglie,
    livello,
    pesoCorporeo: peso,
    pesoConsiderato: true,
    fattorePeso: Math.round((peso / PESO_RIFERIMENTO) * 1000) / 1000,
  };
}

/** Il riferimento di riserva per una misura, quando nessuno lo ha scritto. */
function defaultRiferimentoPerMisura(misura) {
  return RIFERIMENTO_DEFAULT[misura] || 60;
}

/**
 * Il profilo completo di un esercizio: misura, soglie, unita'.
 * Se l'esercizio non ha un profilo scritto, si usa quello di default in base
 * alla misura, cosi' anche un esercizio creato dall'amministratore ha subito
 * un rank senza dover configurare niente.
 */
export function profiloEsercizio(esercizio, extra = {}) {
  const id = (esercizio && esercizio.id) || '';
  const configurato = Object.assign({}, PROFILI[id] || {}, extra || {});
  const convenzione = (esercizio && esercizio.convenzione) || null;
  const assistito = convenzione === 'assistenza' || convenzione === 'corpo_libero';
  const misura = configurato.misura
    || (esercizio && esercizio.misura)
    || (assistito ? MISURE.SOLO_REPS : MISURE.KG_REPS);
  const campo = CAMPO_MISURA[misura] || CAMPO_MISURA[MISURE.KG_REPS];

  // Il riferimento si distingue in due casi, ed e' importante non confonderli:
  //  - "fisso": qualcuno l'ha scritto a mano (PROFILI o il form admin). Vince
  //    sempre, e non viene toccato dal peso.
  //  - "da livello": non l'ha scritto nessuno. Allora dipende da quanto e'
  //    difficile l'esercizio (LIVELLO_ESERCIZI) e dal peso della persona.
  //    Prima mettevo qui il default per misura (60 kg) e questo rendeva inutile
  //    il livello: tutti gli esercizi avevano lo stesso riferimento.
  const scritto = Number(configurato.riferimento) > 0;
  const rapporto = LIVELLI_DIFFICOLTA[livelloEsercizio({ id, convenzione })].rapporto;
  let riferimento;
  if (scritto) {
    riferimento = Number(configurato.riferimento);
  } else if (rapporto === null) {
    // assistito: il riferimento sono le ripetizioni, e non dipendono dal peso
    riferimento = defaultRiferimentoPerMisura(misura);
  } else {
    // ancora senza peso: uso il rapporto sul peso di riferimento (70 kg).
    // Poi profiloPerPesoCorporeo lo ricalcola sul peso vero della persona.
    riferimento = Math.round(rapporto * PESO_RIFERIMENTO * 100) / 100;
  }

  const soglie = Array.isArray(configurato.soglie) && configurato.soglie.length === RANK.length
    ? configurato.soglie.map((n) => Number(n))
    : soglieDaRiferimento(riferimento);
  return {
    id,
    nome: (esercizio && esercizio.nome) || id,
    misura,
    assistito,
    unita: (configurato.unita) || campo.unita,
    campoSecondario: (configurato.campoSecondario !== undefined && configurato.campoSecondario !== null)
      ? configurato.campoSecondario
      : campo.secondario,
    riferimento,
    // segnalo se il numero e' stato scritto a mano: se si', il peso non lo
    // tocca. Serve a profiloPerPesoCorporeo per non fare due calcoli diversi.
    riferimentoFisso: scritto,
    soglie,
    coefficientAssistenza: Number.isFinite(Number(configurato.coefficientAssistenza))
      ? Number(configurato.coefficientAssistenza)
      : COEFFICIENTE_ASSISTENZA_DEFAULT,
  };
}

/** Etichetta leggibile del punteggio: "65 kg", "12 rip", "75 secondi". */
export function descriviPunteggio(profilo, valore) {
  if (valore === null || valore === undefined) return 'nessuna performance';
  const n = Math.round(Number(valore) * 100) / 100;
  if (profilo.misura === MISURE.KG_TEMPO) return `${n} kg x minuti`;
  return `${n} ${profilo.unita}`;
}