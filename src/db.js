// db.js -- il database locale del dispositivo.
//
// Due motori dietro la stessa interfaccia:
//  - IndexedDB, quando c'e' (e' il modo normale)
//  - memoria nel browser (localStorage), se IndexedDB e' bloccata o non esiste
// Non importa quale dei due sia: l'app non se ne accorge e non si blocca mai.
//
// Tutto viene scritto qui per primo, subito, anche senza rete. Il sync verso
// il database online legge da qui e non cancella niente prima della conferma.

import { nuovoId, segnaDaSalvare, adesso } from './sincronizzazione.js';

export const TABELLE = ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note', 'conflitti',
  'profili', 'missioni', 'ricompense', 'pesi', 'appreso'];
const INDICI = {
  sedute: ['giorno_id', 'data', 'stato', 'scheda_id'],
  serie: ['seduta_id', 'esercizio_id'],
  note: ['esercizio_id', 'seduta_id', 'serie_id'],
  versioni: ['scheda_id'],
  conflitti: ['stato'],
  profili: ['username'],
  missioni: ['account_id', 'categoria', 'settimana', 'data'],
  ricompense: ['account_id', 'tipo', 'fonte'],
  // lo storico dei pesi corporei: serve per sapere quanto pesavi il giorno
  // in cui hai fatto una certa performance
  pesi: ['data'],
  // cio' che l'app ha imparato da Ste: correzioni sui livelli e parole nuove
  appreso: ['account_id', 'tipo'],
};
export const MOTORE_SCELTO = { tipo: 'non-aperto' };

/* ---------- roba sicura: niente storage può farci cadere ---------- */

function archivioSicuro() {
  try {
    const t = '__prova';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    const memoria = new Map();
    return {
      getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
      setItem: (k, v) => memoria.set(k, String(v)),
      removeItem: (k) => memoria.delete(k),
    };
  }
}

const archivio = archivioSicuro();

function uuid() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* si prosegue con il metodo di riserva */ }
  const b = new Uint8Array(16);
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
    else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  } catch { for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

let idDispositivoSalvato = null;
export function idDispositivo() {
  if (idDispositivoSalvato) return idDispositivoSalvato;
  try { idDispositivoSalvato = archivio.getItem('palestra-dispositivo'); } catch { idDispositivoSalvato = null; }
  if (!idDispositivoSalvato) {
    idDispositivoSalvato = 'disp-' + uuid();
    try { archivio.setItem('palestra-dispositivo', idDispositivoSalvato); } catch { /* pazienza */ }
  }
  return idDispositivoSalvato;
}

/* ---------- motore 1: IndexedDB ---------- */

/**
 * La versione del database si calcola da sola partendo dalle tabelle.
 *
 * Prima era scritta a mano (2) e non si alzava quando aggiungevo 'pesi',
 * 'profili' e cosi' via: il gioco apriva la versione 2, non scattava nessun
 * upgrade, la tabella nuova non veniva mai creata e sul telefono compariva
 * "One of the specificied object stores was not found": l'app intera non
 * partiva piu'. Ora basta aggiungere una tabella alla lista e la versione sale
 * da sola, quindi le tabelle nuove vengono davvero create senza perdere i dati
 * gia' salvati.
 */
export const VERSIONE_IDB = 1 + TABELLE.length;

function apriIdb() {
  return new Promise((risolvi, rifiuta) => {
    const richiesta = indexedDB.open('palestra', VERSIONE_IDB);
    richiesta.onupgradeneeded = () => {
      const db = richiesta.result;
      for (const t of TABELLE.concat(['meta'])) {
        if (db.objectStoreNames.contains(t)) continue;
        const store = db.createObjectStore(t, { keyPath: t === 'meta' ? 'chiave' : 'id' });
        for (const idx of (INDICI[t] || [])) store.createIndex(idx, idx, { unique: false });
      }
    };
    richiesta.onsuccess = () => risolvi(richiesta.result);
    richiesta.onerror = () => rifiuta(new Error('IndexedDB non si e\' aperto'));
    richiesta.onblocked = () => rifiuta(new Error('IndexedDB bloccato da un\'altra scheda aperta'));
    setTimeout(() => rifiuta(new Error('IndexedDB non ha risposto in tempo')), 8000);
  });
}

function motoreIdb(db) {
  const esegui = (nomi, modo, corpo) => new Promise((risolvi, rifiuta) => {
    let risultato;
    try {
      const trans = db.transaction(nomi, modo);
      risultato = corpo(trans);
      trans.oncomplete = () => risolvi(risultato && risultato.result !== undefined ? risultato.result : risultato);
      trans.onerror = () => rifiuta(trans.error || new Error('operazione fallita'));
      trans.onabort = () => rifiuta(trans.error || new Error('operazione annullata'));
    } catch (e) { rifiuta(e); }
  });
  const chiedi = (req) => new Promise((risolvi, rifiuta) => {
    req.onsuccess = () => risolvi(req.result);
    req.onerror = () => rifiuta(req.error || new Error('lettura fallita'));
  });
  return {
    tipo: 'IndexedDB',
    async prendi(store, id) { return esegui([store], 'readonly', (t) => chiedi(t.objectStore(store).get(id))); },
    async tutti(store) { return esegui([store], 'readonly', (t) => chiedi(t.objectStore(store).getAll())) || []; },
    async perIndice(store, indice, valore) {
      return esegui([store], 'readonly', (t) => chiedi(t.objectStore(store).index(indice).getAll(valore))) || [];
    },
    async scrivi(store, riga) { return esegui([store], 'readwrite', (t) => { t.objectStore(store).put(riga); return riga; }); },
    async svuota(store) { return esegui([store], 'readwrite', (t) => { t.objectStore(store).clear(); }); },
  };
}

/* ---------- motore 2: memoria nel browser ---------- */

const CHIAVE_MEM = 'palestra-mem-';

function motoreMemoria() {
  const leggi = (store) => {
    try {
      const grezzo = archivio.getItem(CHIAVE_MEM + store);
      const v = grezzo ? JSON.parse(grezzo) : [];
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  };
  const scrivi = (store, righe) => {
    try { archivio.setItem(CHIAVE_MEM + store, JSON.stringify(righe)); return true; }
    catch { return false; }
  };
  return {
    tipo: 'memoria del browser',
    async prendi(store, id) { return leggi(store).find((r) => r.id === id || r.chiave === id) || null; },
    async tutti(store) { return leggi(store); },
    async perIndice(store, indice, valore) { return leggi(store).filter((r) => r[indice] === valore); },
    async scrivi(store, riga) {
      const righe = leggi(store);
      const chiave = riga.id || riga.chiave;
      const i = righe.findIndex((r) => (r.id || r.chiave) === chiave);
      if (i >= 0) righe[i] = riga; else righe.push(riga);
      if (!scrivi(store, righe)) throw new Error('spazio nel browser esaurito: esporta un backup e libera spazio');
      return riga;
    },
    async svuota(store) { scrivi(store, []); },
  };
}

/* ---------- scelta del motore ---------- */

let promessaMotore = null;

export function apriDb() {
  if (promessaMotore) return promessaMotore;
  promessaMotore = (async () => {
    let idb = null;
    try {
      if (typeof indexedDB !== 'undefined' && indexedDB) idb = motoreIdb(await apriIdb());
    } catch (e) {
      console.warn('IndexedDB non disponibile, passo alla memoria del browser:', e);
      idb = null;
    }
    if (idb) {
      // una prova vera e propria: se questa fallisce, non mi fido
      try {
        await idb.scrivi('meta', { chiave: '_prova', valore: '1' });
        MOTORE_SCELTO.tipo = idb.tipo;
        return idb;
      } catch (e) {
        console.warn('IndexedDB aperto ma non scrivibile, passo alla memoria del browser:', e);
      }
    }
    const memoria = motoreMemoria();
    // e qui faccio la prova anche sulla memoria
    await memoria.scrivi('meta', { chiave: '_prova', valore: '1' });
    MOTORE_SCELTO.tipo = memoria.tipo;
    return memoria;
  })();
  return promessaMotore;
}

/* ---------- API usata dall'app ---------- */

/** Scrive una riga e la mette in coda per il sync. */
export async function salva(tabella, riga, { segna = true } = {}) {
  const m = await apriDb();
  const base = riga.id || uuid();
  const esistente = await m.prendi(tabella, base);
  const completa = {
    ...esistente,
    ...riga,
    id: base,
    updated_at: riga.updated_at || adesso(),
    device_id: riga.device_id || idDispositivo(),
  };
  if (segna) {
    const segnata = segnaDaSalvare(esistente || completa);
    completa.rev = segnata.rev;
    completa.sync = 'da_salvare';
    completa.base_rev = Number((esistente && esistente.base_rev) || 0);
    completa.ultimo_errore = null;
    completa.tentativi = 0;
  } else {
    completa.rev = Number(riga.rev || 1);
    completa.sync = riga.sync || 'pulito';
    completa.base_rev = Number(riga.base_rev || completa.rev);
  }
  return m.scrivi(tabella, completa);
}

export async function prendi(tabella, id) {
  const m = await apriDb();
  return (await m.prendi(tabella, id)) || null;
}

export async function tutti(tabella, { includiEliminati = false } = {}) {
  const m = await apriDb();
  const righe = (await m.tutti(tabella)) || [];
  const vivi = righe.filter((r) => includiEliminati || !r.eliminata);
  return vivi.sort((a, b) => String(a.ordine ?? '').localeCompare(String(b.ordine ?? '')));
}

export async function perIndice(tabella, indice, valore) {
  const m = await apriDb();
  const righe = (await m.perIndice(tabella, indice, valore)) || [];
  return righe.filter((r) => !r.eliminata);
}

/** Cancella davvero ma passando dal cestino: si puo' sempre recuperare. */
export async function cestino(tabella, id) {
  const riga = await prendi(tabella, id);
  if (!riga) return null;
  return salva(tabella, { ...riga, eliminata: true, eliminata_il: adesso() });
}

export async function recupera(tabella, id) {
  const riga = await prendi(tabella, id);
  if (!riga) return null;
  // metto false esplicitamente: se si "cancellassero" le chiavi, la versione
  // piu' vecchia (eliminata = true) ricomparirebbe e la riga resterebbe nel cestino
  return salva(tabella, { ...riga, eliminata: false, eliminata_il: null });
}

/** Tutto quello che aspetta di essere mandato online. */
export async function codaDiInvio() {
  const out = [];
  for (const t of TABELLE) {
    if (t === 'conflitti') continue;
    const righe = await tutti(t, { includiEliminati: true });
    for (const r of righe) {
      if (r.sync === 'da_salvare' || r.sync === 'errore') out.push({ tabella: t, riga: r });
    }
  }
  return out;
}

export async function contaErrori() {
  let n = 0;
  for (const t of TABELLE) {
    if (t === 'conflitti') continue;
    const righe = await tutti(t, { includiEliminati: true });
    n += righe.filter((r) => r.sync === 'errore').length;
  }
  return n;
}

export async function leggiMeta(chiave, default_ = null) {
  const m = await apriDb();
  const r = await m.prendi('meta', chiave);
  return r ? r.valore : default_;
}

export async function scriviMeta(chiave, valore) {
  const m = await apriDb();
  return m.scrivi('meta', { chiave, valore });
}

export async function esportaTutto() {
  const out = {};
  for (const t of TABELLE) out[t] = await tutti(t, { includiEliminati: true });
  return out;
}

export async function svuotaTutto() {
  const m = await apriDb();
  for (const t of TABELLE.concat(['meta'])) {
    try { await m.svuota(t); } catch { /* prossima volta */ }
  }
  try { archivio.removeItem('palestra-ultimo-pull'); } catch { /* pazienza */ }
}

/** La seduta attiva: massimo una, garantito dal database sul lato online. */
export async function sedutaInCorso() {
  const righe = await perIndice('sedute', 'stato', 'in_corso');
  return righe.length ? righe[0] : null;
}