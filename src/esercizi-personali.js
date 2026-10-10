// esercizi-personali.js -- l'app impara a conoscere TE.
//
// Ste (04/10/2026): "non ho capito bene spiega meglio, comunque si fai tutto".
//
// Tre cose, e sono tre modi diversi di diventare più bravi:
//
//  1) QUANTO È PESANTE PER TE.
//     Il classificatore guarda il NOME e dice "lateral raise = isolamento".
//     Ma il nome non dice nulla di te. Se tu nella chest press spingi 40 kg e
//     sul cable fly ne spingi 4, allora per TE il cable fly È un esercizio
//     leggero, anche se sulla carta sembra impegnativo.
//     Qui si fa proprio quello: si prende il tuo carico su quell'esercizio e
//     si divide per il carico più alto che raggiungi su un esercizio di forza.
//     Il risultato È una percentuale, e da quella una parola.
//
//  2) LE TUE CORREZIONI.
//     Se il classificatore sbaglia, tocchi il pulsante giusto e la correzione
//     vale per sempre. Non serve più che io metta una parola chiave.
//
//  3) LE PAROLE CHE NON CONOSCE.
//     L'app legge i nomi di tutti i tuoi esercizi, trova le parole che nel
//     suo vocabolario non compaiono e te le chiede una volta sola.

import * as db from './db.js';
import { classificaEsercizio, paroleConosciute, parolaConosciuta } from './esercizi-classificatore.js';
import { recordEsercizio, stimaMassimo } from './rank.js';
import { profiloPerPesoCorporeo } from './rank-config.js';
import { nuovoId } from './sincronizzazione.js';

// ---------------------------------------------------------------------------
// PARTE 1 -- quanto È pesante per te
// ---------------------------------------------------------------------------

/**
 * Quanto quell'esercizio È pesante PER TE.
 *
 * Non guardo il nome: guardo il tuo numero. Lo confronto con il numero più
 * alto che hai mai raggiunto su un esercizio di forza, e ne ricavo una
 * percentuale. Più È bassa, più È un esercizio "spezzato"; più È alta,
 * più È un esercizio che ti impegna davvero.
 */
export function quantoEPesantePerTe({ serie = [], esercizi = [], esercizioId = null, peso = null } = {}) {
  if (!esercizi.length) return null;

  const record = new Map();
  for (const e of esercizi) {
    const mie = (serie || []).filter((x) => x && !x.eliminata && x.esercizio_id === e.id);
    if (!mie.length) continue;
    const rec = recordEsercizio(mie, e, null, peso);
    if (rec.valido) record.set(e.id, { punteggio: rec.punteggio, testo: rec.testo, esercizio: e });
  }
  if (!record.size) return null;

  // il riferimento È il tuo numero più alto in assoluto: È il massimale
  // TUO, non quello di un manuale
  let massimo = 0;
  let nomeMassimo = '';
  for (const [, r] of record) {
    if (r.punteggio > massimo) { massimo = r.punteggio; nomeMassimo = r.esercizio.nome; }
  }
  if (!massimo) return null;

  // se mi chiedi UN esercizio, rispondo su quello; altrimenti faccio la
  // panoramica di tutti, ordinata dal più pesante
  const righe = [];
  for (const [, r] of record) {
    const quota = r.punteggio / massimo;
    righe.push({
      esercizio_id: r.esercizio.id,
      nome: r.esercizio.nome,
      testo: r.testo,
      punteggio: Math.round(r.punteggio * 100) / 100,
      percentuale: Math.round(quota * 100),
      giudizio: giudizioDaQuota(quota),
      frase: fraseDaQuota(quota, r.esercizio.nome),
    });
  }
  righe.sort((a, b) => b.percentuale - a.percentuale);

  const scelto = esercizioId ? righe.find((r) => r.esercizio_id === esercizioId) : null;
  return {
    massimo: Math.round(massimo * 100) / 100,
    nomeMassimo,
    righe,
    scelto,
  };
}

function giudizioDaQuota(quota) {
  if (quota >= 0.80) return 'massimo';
  if (quota >= 0.50) return 'pesante';
  if (quota >= 0.20) return 'medio';
  if (quota >= 0.08) return 'leggero';
  return 'spezzato';
}

function fraseDaQuota(quota, nome) {
  const p = Math.round(quota * 100);
  switch (giudizioDaQuota(quota)) {
    case 'massimo': return `Su ${nome} arrivi al ${p}% del massimo che spingi: è l'esercizio più forte che fai.`;
    case 'pesante': return `Su ${nome} arrivi al ${p}% del massimo: è un esercizio impegnativo.`;
    case 'medio': return `Su ${nome} arrivi al ${p}% del massimo: è un esercizio di lavoro.`;
    case 'leggero': return `Su ${nome} arrivi al ${p}% del massimo: per te è un esercizio leggero, anche se il nome sembra impegnativo.`;
    default: return `Su ${nome} arrivi al ${p}% del massimo: per te è uno "spezzato", serve solo per la pompa.`;
  }
}

// ---------------------------------------------------------------------------
// PARTE 2 -- le tue correzioni
// ---------------------------------------------------------------------------

const CHIAVE_LIVELLO = 'appreso_livelli';

function rigaLivello(accountId, esercizioId, livello, fonte = 'correzione') {
  return {
    id: `${accountId}:${esercizioId}`,
    account_id: accountId,
    esercizio_id: esercizioId,
    livello,
    fonte,
    imparato_il: new Date().toISOString().slice(0, 10),
  };
}

/** Le correzioni salvate per questo account. */
export async function livelliImparati(accountId) {
  const tutte = await db.tutti('appreso');
  const mappa = {};
  for (const r of tutte) {
    if (!r || r.tipo !== 'livello') continue;
    if (r.account_id !== accountId) continue;
    mappa[r.esercizio_id] = r.livello;
  }
  return mappa;
}

/** Ricorda la correzione: da qui in poi quell'esercizio È come dici tu. */
export async function correggiLivello(accountId, esercizioId, livello) {
  const validi = ['grande', 'composto', 'isolamento', 'assistito'];
  if (!validi.includes(livello)) return null;
  const riga = rigaLivello(accountId, esercizioId, livello);
  riga.tipo = 'livello';
  await db.salva('appreso', riga);
  return riga;
}

/** Hai già corretto questo esercizio? */
export async function livelloImparato(accountId, esercizioId) {
  const mappa = await livelliImparati(accountId);
  return mappa[esercizioId] || null;
}

/** Scordati una correzione: l'app torna a fidarsi del classificatore. */
export async function dimenticaLivello(accountId, esercizioId) {
  const tutte = await db.tutti('appreso');
  const riga = tutte.find((r) => r && r.tipo === 'livello'
    && r.account_id === accountId && r.esercizio_id === esercizioId);
  if (riga) await db.cestino('appreso', riga.id);
  return true;
}

// ---------------------------------------------------------------------------
// PARTE 3 -- le parole che l'app non conosce
// ---------------------------------------------------------------------------

/** Toglie le parole che non aggiungono niente (preposizioni, articoli...). */
const PAROLE_VUOTE = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'uno', 'a', 'al', 'alla', 'ai', 'agli', 'alle',
  'di', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'con', 'per', 'da', 'dal', 'in', 'sul',
  'sulla', 'e', 'ed', 'o', 'che', 'del', 'posizione', 'posizionata', 'seduto', 'seduta',
]);

function paroleDelNome(nome) {
  return String(nome || '')
    .toLowerCase()
    .replace(/[àáâ]/g, 'a').replace(/[èéê]/g, 'e').replace(/[ìíî]/g, 'i')
    .replace(/[òóô]/g, 'o').replace(/[ùúû]/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((p) => p.length > 2 && !PAROLE_VUOTE.has(p));
}

/**
 * Le parole che l'app non conosce, fra i nomi dei tuoi esercizi.
 *
 * Non ti chiede niente che le sai già: solo quelle che non trova da sole.
 * Ogni parola viene chiesto una volta sola.
 */
export async function paroleDaChiedere(accountId, esercizi) {
  const conosciute = paroleConosciute();
  const imparate = await paroleImparate(accountId);
  const out = [];
  for (const e of (esercizi || [])) {
    const parole = paroleDelNome(e.nome);
    const ignote = parole.filter((p) => !parolaConosciuta(p) && !imparate[p]);
    if (!ignote.length) continue;
    const r = classificaEsercizio({ nome: e.nome, convenzione: e.convenzione });
    out.push({
      esercizio_id: e.id,
      nome: e.nome,
      parole: ignote,
      livoloIndovinato: r.livello,
      confidenza: r.confidenza,
    });
  }
  return out;
}

/** Le parole che hai già insegnato, con il livello che hai detto. */
export async function paroleImparate(accountId) {
  const tutte = await db.tutti('appreso');
  const mappa = {};
  for (const r of tutte) {
    if (!r || r.tipo !== 'parola') continue;
    if (r.account_id !== accountId) continue;
    mappa[r.parola] = r.livello;
  }
  return mappa;
}

/** Insegna all'app una parola nuova. */
export async function imparaParola(accountId, parola, livello) {
  const validi = ['grande', 'composto', 'isolamento', 'assistito'];
  const p = String(parola || '').toLowerCase().trim();
  if (!p || !validi.includes(livello)) return null;
  const riga = {
    id: `${accountId}:parola:${p}`,
    tipo: 'parola',
    account_id: accountId,
    parola: p,
    livello,
    imparato_il: new Date().toISOString().slice(0, 10),
  };
  await db.salva('appreso', riga);
  return riga;
}

export { nuovoId, stimaMassimo };