// db.js -- il database locale del dispositivo (IndexedDB).
// Tutto viene scritto qui per primo, subito, anche senza rete.
// Il sync verso Supabase legge da qui e non cancella niente prima della conferma.

import { nuovoId, segnaDaSalvare, adesso } from './sincronizzazione.js';

export const NOME_DB = 'palestra';
export const VERSIONE_DB = 1;
export const TABELLE = ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note', 'conflitti'];
export const INDICI = {
  sedute: ['giorno_id', 'data', 'stato', 'scheda_id'],
  serie: ['seduta_id', 'esercizio_id'],
  note: ['esercizio_id', 'seduta_id', 'serie_id'],
  versioni: ['scheda_id'],
  conflitti: ['stato'],
};

let promessaDb = null;

export function apriDb() {
  if (promessaDb) return promessaDb;
  promessaDb = new Promise((risolvi, rifiuta) => {
    const richiesta = indexedDB.open(NOME_DB, VERSIONE_DB);
    richiesta.onupgradeneeded = () => {
      const db = richiesta.result;
      for (const t of TABELLE) {
        if (db.objectStoreNames.contains(t)) continue;
        const store = db.createObjectStore(t, { keyPath: 'id' });
        for (const idx of (INDICI[t] || [])) store.createIndex(idx, idx, { unique: false });
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'chiave' });
    };
    richiesta.onsuccess = () => risolvi(richiesta.result);
    richiesta.onerror = () => rifiuta(richiesta.onerror || new Error('apertura database fallita'));
  });
  return promessaDb;
}

export function idDispositivo() {
  const salvato = localStorage.getItem('palestra-dispositivo');
  if (salvato) return salvato;
  const nuovo = 'disp-' + nuovoId();
  localStorage.setItem('palestra-dispositivo', nuovo);
  return nuovo;
}

function transazione(db, nomi, modo) {
  return db.transaction(nomi, modo);
}

function aspetta(trans) {
  return new Promise((risolvi, rifiuta) => {
    trans.oncomplete = () => risolvi();
    trans.onerror = () => rifiuta(trans.error || new Error('operazione fallita'));
    trans.onabort = () => rifiuta(trans.error || new Error('operazione annullata'));
  });
}

function chiedi(req) {
  return new Promise((risolvi, rifiuta) => {
    req.onsuccess = () => risolvi(req.result);
    req.onerror = () => rifiuta(req.error);
  });
}

/** Scrive una riga e la mette in coda per il sync. */
export async function salva(tabella, riga, { segna = true } = {}) {
  const db = await apriDb();
  const ora = adesso();
  const completa = {
    id: riga.id || nuovoId(),
    ...riga,
    updated_at: riga.updated_at || ora,
    device_id: idDispositivo(),
  };
  if (segna) {
    const vecchia = await prendi(tabella, completa.id);
    completa.rev = segnaDaSalvare(vecchia || completa).rev;
    completa.sync = 'da_salvare';
    completa.base_rev = Number((vecchia && vecchia.base_rev) || 0);
    completa.ultimo_errore = null;
    completa.tentativi = 0;
  } else {
    completa.rev = Number(riga.rev || 1);
    completa.sync = riga.sync || 'pulito';
    completa.base_rev = Number(riga.base_rev || completa.rev);
  }
  const trans = transazione(db, [tabella], 'readwrite');
  trans.objectStore(tabella).put({ ...completa, _tabella: tabella });
  await aspetta(trans);
  return completa;
}

export async function prendi(tabella, id) {
  const db = await apriDb();
  const trans = transazione(db, [tabella], 'readonly');
  const r = await chiedi(trans.objectStore(tabella).get(id));
  return r || null;
}

export async function tutti(tabella, { includiEliminati = false } = {}) {
  const db = await apriDb();
  const trans = transazione(db, [tabella], 'readonly');
  const righe = await chiedi(trans.objectStore(tabella).getAll());
  const vivi = righe.filter((r) => includiEliminati || !r.eliminata);
  return vivi.sort((a, b) => String(a.ordine ?? '').localeCompare(String(b.ordine ?? '')));
}

export async function perIndice(tabella, indice, valore) {
  const db = await apriDb();
  const trans = transazione(db, [tabella], 'readonly');
  const righe = await chiedi(trans.objectStore(tabella).index(indice).getAll(valore));
  return righe.filter((r) => !r.eliminata);
}

/** Cancella davvero ma passando dal cestino: si puo' sempre recuperare. */
export async function cestino(tabella, id) {
  const db = await apriDb();
  const riga = await prendi(tabella, id);
  if (!riga) return null;
  return salva(tabella, { ...riga, eliminata: true, eliminata_il: adesso() });
}

export async function recupera(tabella, id) {
  const db = await apriDb();
  const riga = await prendi(tabella, id);
  if (!riga) return null;
  const copia = { ...riga };
  delete copia.eliminata;
  delete copia.eliminata_il;
  return salva(tabella, copia);
}

/** Tutto quello che aspetta di essere mandato online. */
export async function codaDiInvio() {
  const out = [];
  for (const t of ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note']) {
    const righe = await tutti(t, { includiEliminati: true });
    for (const r of righe) {
      if (r.sync === 'da_salvare' || r.sync === 'errore') out.push({ tabella: t, riga: r });
    }
  }
  return out;
}

export async function contaErrori() {
  let n = 0;
  for (const t of ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note']) {
    const righe = await tutti(t, { includiEliminati: true });
    n += righe.filter((r) => r.sync === 'errore').length;
  }
  return n;
}

export async function leggiMeta(chiave, default_ = null) {
  const db = await apriDb();
  const trans = transazione(db, ['meta'], 'readonly');
  const r = await chiedi(trans.objectStore('meta').get(chiave));
  return r ? r.valore : default_;
}

export async function scriviMeta(chiave, valore) {
  const db = await apriDb();
  const trans = transazione(db, ['meta'], 'readwrite');
  trans.objectStore('meta').put({ chiave, valore });
  await aspetta(trans);
}

export async function esportaTutto() {
  const out = {};
  for (const t of ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note', 'conflitti']) {
    out[t] = await tutti(t, { includiEliminati: true });
  }
  return out;
}

export async function svuotaTutto() {
  const db = await apriDb();
  const trans = transazione(db, [...TABELLE], 'readwrite');
  for (const t of TABELLE) trans.objectStore(t).clear();
  await aspetta(trans);
}

export async function inserisciMolte(tabella, righe, { segna = true } = {}) {
  const salvate = [];
  for (const r of righe) salvate.push(await salva(tabella, r, { segna }));
  return salvate;
}

/** La seduta attiva: massimo una, garantito dal database. */
export async function sedutaInCorso() {
  const righe = await perIndice('sedute', 'stato', 'in_corso');
  return righe.length ? righe[0] : null;
}
