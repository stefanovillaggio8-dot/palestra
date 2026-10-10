// numeri.js -- parsing, formattazione e calcoli dei numeri.
// Regole che questo file rispetta sempre:
//  - le ripetizioni NON vengono mai arrotondate a intero
//  - "7,5" e "7.5" diventano entrambi il numero 7.5
//  - in interfaccia si mostra sempre la virgola
//  - mai parseInt(): qui i numeri sono decimali, punto.
// Nessuna dipendenza, nessun accesso al DOM: tutto testabile con node --test.

export const MAX_DECIMALI = 2;

export const CONVENZIONI = {
  MACCHINA: 'macchina',
  // Ste (04/10/2026): "ma deve capire che sono 35kg per braccio per chest press
  // di petto, lo sa questo no?"
  //
  // No, e il buco era grosso. Su una macchina a dischi i dischi si montano su
  // ENTRAMBI i bracci: 35 kg per braccio vuol dire 70 kg in totale. L'app
  // prendeva 35 kg come se fossero 35 in totale, quindi contava meta' del carico
  // e il Rank veniva sotto. Non È un dettaglio da visualizzazione: È il numero
  // con cui l'app giudica quanto sei forte, quindi sbagliarlo vuol dire
  // sbagliare il Rank.
  //
  // Esiste già PER_GAMBA per lo stesso motivo (17 kg per gamba sulla leg press
  // obliqua), ma mancava il caso del braccio, che È quello delle macchine a
  // dischi.
  PER_BRACCIO: 'per_braccio',
  // Ste (04/10/2026): "ai cavi cÈ il cavo con mono carrucola e doppia carrucola.
  // Per esempio di hammer curl faccio 50kg ma È doppia carrucola quindi sarebbero 25".
  //
  // Ha ragione, ed era un buco grosso: sul cavo a doppia carrucola il guadagno È
  // 2:1, quindi il carrello segna 50 ma il peso che senti È 25. È anche per
  // questo che la doppia carrucola si usa su un braccio alla volta.
  //
  // Non È un dettaglio di come si scrive: È META' del carico. Se l'app legge 50
  // quando il peso reale È 25 sbaglia di 2 volte, e sbaglia di 2 volte sul Rank
  // di tutti gli esercizi al cavo.
  CARRUCOLA_MONO: 'carrucola_mono',
  CARRUCOLA_DOPPIA: 'carrucola_doppia',
  // "macchina a dischi" non può stare in convenzione PERCHE' li' ci vuole anche
  // "per braccio": due informazioni diverse, e prima che le ho separate la
  // macchina si perdeva. Percio' l'attrezzatura È un campo per conto suo.
  MACCHINA_DISCHI: 'macchina_dischi',
  MACCHINA_STACK: 'macchina_stack',
  CAVO: 'cavo_totali',
  PER_MANUBRIO: 'per_manubrio',
  DISCHI: 'dischi',
  PER_GAMBA: 'per_gamba',
  // Ste (04/10/2026): "ma deve capire che sono 35kg per braccio per chest press
  // di petto, lo sa questo no?"
  //
  // No, non lo sapeva, ed era un buco grosso. Su una macchina a dischi i
  // dischi si montano su ENTRAMBI i bracci: 35 kg per braccio vuol dire 70 kg
  // in totale. L'app prendeva 35 kg come se fossero 35 in totale, quindi
  // contava metta' del carico e il Rank era sbagliato in basso.
  //
  // Esiste già PER_GAMBA per lo stesso motivo (17 kg per gamba sulla leg press
  // obliqua), ma mancava il caso del braccio, che È quello delle macchine a
  // dischi.
  BILANCIERE: 'bilanciere',
  ASSISTENZA: 'assistenza',
  CORPO_LIBERO: 'corpo_libero',
  ALTRO: 'altro',
};

export const ETICHETTE_CONVENZIONE = {
  [CONVENZIONI.MACCHINA]: 'kg piastre macchina',
  [CONVENZIONI.MACCHINA_DISCHI]: 'kg dischi sulla macchina',
  [CONVENZIONI.MACCHINA_STACK]: 'kg pacco dischi (linguetta)',
  [CONVENZIONI.CAVO]: 'kg totali del cavo',
  [CONVENZIONI.PER_MANUBRIO]: 'kg per manubrio',
  [CONVENZIONI.DISCHI]: 'kg dischi (senza bilanciere)',
  [CONVENZIONI.PER_GAMBA]: 'kg per gamba',
  [CONVENZIONI.PER_BRACCIO]: 'kg per braccio (totale = doppio)',
  [CONVENZIONI.BILANCIERE]: 'kg bilanciere',
  [CONVENZIONI.ASSISTENZA]: 'kg di assistenza (corpo libero)',
  [CONVENZIONI.CORPO_LIBERO]: 'corpo libero',
  [CONVENZIONI.ALTRO]: 'altro',
};

/** Arrotonda a 2 decimali evitando gli artefatti dei numeri in virgola mobile. */
export function arrotonda2(n) {
  if (n === null || n === undefined) return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const segno = v < 0 ? -1 : 1;
  return segno * Math.round(Math.abs(v) * 100 + Number.EPSILON * 100) / 100;
}

/**
 * Trasforma un testo digitale in numero decimale.
 * Accetta "7,5" e "7.5". Restituisce null se il testo non È un numero.
 * Non usa mai parseInt e non tronca: 7,5 resta 7,5.
 */
export function analizzaDecimale(testo) {
  if (testo === null || testo === undefined) return null;
  let s = String(testo).trim();
  if (s === '') return null;
  s = s.replace(/[\s\u00a0]/g, '');
  if (s === '') return null;
  // solo cifre, un eventuale separatore e un eventuale segno
  if (!/^[+-]?[0-9]*([.,][0-9]*)?$/.test(s)) return null;
  if ((s.match(/[.,]/g) || []).length > 1) return null;
  if (!/[0-9]/.test(s)) return null;
  s = s.replace(',', '.');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('.')) s = '0' + s;
  if (s.startsWith('-.')) s = '-0' + s.slice(1);
  const v = Number(s);
  if (!Number.isFinite(v)) return null;
  if (v < 0) return null;
  return arrotonda2(v);
}

/** Numero -> testo italiano con la virgola. 7.5 diventa "7,5", 8 diventa "8". */
export function formattaNumero(n) {
  if (n === null || n === undefined || n === '') return '';
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: MAX_DECIMALI,
  }).format(v);
}

export function formattaPeso(n) { return formattaNumero(n); }
export function formattaRipetizioni(n) { return formattaNumero(n); }

/** Una convenzione di carico permette di parlare di "carico sollevato"? */
export function convenzioneMisuraCarico(conv) {
  return conv !== CONVENZIONI.ASSISTENZA && conv !== CONVENZIONI.CORPO_LIBERO;
}

/** Le convenzioni "assistenza" si muovono al contrario: più kg = meno lavoro. */
export function convenzioneInvertita(conv) {
  return conv === CONVENZIONI.ASSISTENZA;
}

/**
 * Volume di una serie = peso x ripetizioni.
 * Restituisce null quando il calcolo non ha senso (corpo libero, assistenza,
 * peso assente, ripetizioni assenti). MAI arrotonda le ripetizioni.
 */
export function volumeSerie(s) {
  if (!s) return null;
  if (!convenzioneMisuraCarico(s.convenzione)) return null;
  const p = s.peso === null || s.peso === undefined ? null : Number(s.peso);
  const r = s.ripetizioni === null || s.ripetizioni === undefined ? null : Number(s.ripetizioni);
  if (p === null || r === null) return null;
  if (!Number.isFinite(p) || !Number.isFinite(r)) return null;
  if (p === 0) return 0;
  return arrotonda2(p * r);
}

/** Il volume ha senso solo se non ci sono ripetizioni frazionarie? */
export function volumeEConvenzionale(s) {
  if (volumeSerie(s) === null) return false;
  const r = Number(s.ripetizioni);
  if (!Number.isFinite(r)) return false;
  return r % 1 !== 0;
}

/** Differenza assoluta. Se manca un valore -> null. */
export function differenzaAssoluta(da, a) {
  if (da === null || a === null || da === undefined || a === undefined) return null;
  const x = Number(da); const y = Number(a);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return arrotonda2(y - x);
}

/**
 * Differenza percentuale. Restituisce null se il valore iniziale È zero:
 * con base zero la percentuale non È definita e non va inventata.
 */
export function differenzaPercentuale(base, valore) {
  if (base === null || valore === null || base === undefined || valore === undefined) return null;
  const b = Number(base); const v = Number(valore);
  if (!Number.isFinite(b) || !Number.isFinite(v)) return null;
  if (b === 0) return null;
  return arrotonda2(((v - b) / Math.abs(b)) * 100);
}

/** Etichetta dell'unita' di carico, usata nelle intestazioni. */
export function etichettaUnita(conv) {
  if (conv === CONVENZIONI.ASSISTENZA) return 'ASSISTENZA (kg)';
  if (conv === CONVENZIONI.PER_GAMBA) return 'KG PER GAMBA';
  return 'KG';
}

/** Il campo da mostrare come "carico" per questa convenzione. */
export function campoCarico(conv) {
  return convenzioneMisuraCarico(conv) ? 'peso' : 'peso_assistenza';
}

/** Formatta un orario in secondi -> "1h 12m 05s". */
export function formattaDurata(secondi) {
  if (secondi === null || secondi === undefined) return '';
  const s = Math.max(0, Math.floor(Number(secondi)));
  if (!Number.isFinite(s)) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const due = (x) => String(x).padStart(2, '0');
  if (h > 0) return `${h}h ${due(m)}m ${due(sec)}s`;
  if (m > 0) return `${m}m ${due(sec)}s`;
  return `${sec}s`;
}

/** Formatta un orario in secondi -> "1:12:05" per il cronometro. */
export function formattaCronometro(secondi) {
  const s = Math.max(0, Math.floor(Number(secondi) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const due = (x) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${due(m)}:${due(sec)}` : `${due(m)}:${due(sec)}`;
}

/** Media delle ripetizioni, senza arrotondare a intero. */
export function mediaRipetizioni(serie) {
  const valori = [];
  for (const s of serie || []) {
    if (!s) continue;
    const v = s.ripetizioni === null || s.ripetizioni === undefined ? null : Number(s.ripetizioni);
    if (v !== null && Number.isFinite(v)) valori.push(v);
  }
  if (!valori.length) return null;
  const tot = valori.reduce((a, b) => a + b, 0);
  return arrotonda2(tot / valori.length);
}
