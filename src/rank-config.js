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

/** x il riferimento: bronze, silver, gold, platinum(=1), diamond, titan, olympian. */
export const MOLTIPLICATORI_SOGLIA = [0.45, 0.62, 0.80, 1.00, 1.25, 1.55, 2.00];

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
 * I profili dei singoli esercizi.
 * Il numero e' il PUNTEGGIO di un livello PLATINUM per quell'esercizio:
 * per il Chest Press (kg + ripetizioni) il punteggio e' una stima del massimo
 * cheriesci a spingere in una ripetizione, quindi 65 vuol dire che 65 kg
 * stimati sono il livello platino.
 * Per un esercizio a sole ripetizioni il riferimento sono le ripetizioni.
 */
export const PROFILI = {
  'ex-chest-press':                 { riferimento: 65 },
  'ex-cable-hammer-curl':           { riferimento: 70 },
  'ex-cable-lateral-raise':         { riferimento: 30 },
  'ex-cable-overhead-tricep':       { riferimento: 75 },
  'ex-leg-extension':               { riferimento: 110 },
  'ex-neutral-grip-lat-pulldown':   { riferimento: 130 },
  'ex-dumbbell-bench-pull':         { riferimento: 70 },
  'ex-seated-db-shoulder-press':    { riferimento: 50 },
  'ex-cable-fly':                   { riferimento: 55 },
  'ex-scott-bench-curl':            { riferimento: 32 },
  'ex-single-arm-tricep-pushdown':  { riferimento: 65 },
  'ex-seated-leg-curl':             { riferimento: 110 },
  'ex-smith-incline-bench':         { riferimento: 55 },
  'ex-seated-cable-row':            { riferimento: 135 },
  'ex-chest-supported-shrug':       { riferimento: 70 },
  'ex-sled-press-calf-raise':       { riferimento: 160 },
  'ex-single-leg-press':            { riferimento: 35 },
  'ex-one-arm-preacher-curl':       { riferimento: 30 },
  'ex-one-arm-cable-reverse-fly':   { riferimento: 40 },
  'ex-wrist-curl':                  { riferimento: 38 },
  'ex-iso-lateral-row':             { riferimento: 110 },
  'ex-lat-pulldown-lats':           { riferimento: 130 },
  'ex-db-lateral-raise':            { riferimento: 20 },
  'ex-lying-cable-curl':            { riferimento: 60 },
  // assistiti: il riferimento sono le ripetizioni pulite
  'ex-bodyweight-overhead-tricep':  { riferimento: 12 },
  'ex-pull-ups':                    { riferimento: 12 },
  'ex-dips':                        { riferimento: 15 },
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
  if (!peso || !usa) {
    return { ...p, soglie: p.soglie, pesoCorporeo: peso, pesoConsiderato: false };
  }
  const fattore = peso / PESO_RIFERIMENTO;
  return {
    ...p,
    soglie: p.soglie.map((s) => Math.round(s * fattore * 100) / 100),
    pesoCorporeo: peso,
    pesoConsiderato: true,
    fattorePeso: Math.round(fattore * 1000) / 1000,
  };
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
  const defaultRiferimento = RIFERIMENTO_DEFAULT[misura] || 60;
  const riferimento = Number(configurato.riferimento) > 0
    ? Number(configurato.riferimento)
    : defaultRiferimento;
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