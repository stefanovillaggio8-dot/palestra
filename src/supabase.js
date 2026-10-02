// supabase.js -- client Supabase scritto a mano, senza librerie.
// Nessun pacchetto da installare, niente da compilare: serve solo fetch().
//
// Sul finestrino pubblico mettiamo solo la chiave "publishable", che per
// costruzione e' pubblica (come una chiave di Wikipedia). La chiave che
// davvero fa paura, la "service_role", non entra MAI in questo progetto.
// I tuoi dati sono protetti dal database stesso: le regole che ci metto in
// schema.sql dicono che ogni utente vede solo le proprie righe.

const CHIAVE_CONFIG = 'palestra-config';

export function leggiConfig() {
  try {
    const grezzo = localStorage.getItem(CHIAVE_CONFIG);
    if (!grezzo) return { attivo: false };
    const c = JSON.parse(grezzo);
    return { attivo: !!(c.url && c.anonKey), url: c.url || '', anonKey: c.anonKey || '' };
  } catch {
    return { attivo: false };
  }
}

export function scriviConfig(cfg) {
  localStorage.setItem(CHIAVE_CONFIG, JSON.stringify(cfg));
}

export function sessione() {
  try {
    const s = localStorage.getItem('palestra-sessione');
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function salvaSessione(s) {
  if (s) localStorage.setItem('palestra-sessione', JSON.stringify(s));
  else localStorage.removeItem('palestra-sessione');
}

function intestazioni(cfg, extra = {}) {
  const h = {
    apikey: cfg.anonKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const s = sessione();
  if (s && s.access_token) h.Authorization = 'Bearer ' + s.access_token;
  return { ...h, ...extra };
}

async function json(res) {
  const testo = await res.text();
  if (!testo) return null;
  try { return JSON.parse(testo); } catch { return testo; }
}

export class ErroreSupabase extends Error {
  constructor(messaggio, stato, dettaglio) {
    super(messaggio);
    this.name = 'ErroreSupabase';
    this.stato = stato;
    this.dettaglio = dettaglio;
  }
}

async function richiesta(cfg, percorso, opzioni) {
  let res;
  try {
    res = await fetch(cfg.url + percorso, opzioni);
  } catch (e) {
    throw new ErroreSupabase('Nessuna connessione con il database.', 0, String(e));
  }
  const corpo = await json(res);
  if (!res.ok) {
    const msg = (corpo && (corpo.msg || corpo.error_description || corpo.message)) || ('Errore ' + res.status);
    throw new ErroreSupabase(msg, res.status, corpo);
  }
  return corpo;
}

/* ---------------- autenticazione ---------------- */

export async function accedi(email, password) {
  const cfg = leggiConfig();
  const corpo = await richiesta(cfg, '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: intestazioni(cfg),
    body: JSON.stringify({ email, password }),
  });
  salvaSessione(corpo);
  return corpo;
}

export async function registrati(email, password) {
  const cfg = leggiConfig();
  const corpo = await richiesta(cfg, '/auth/v1/signup', {
    method: 'POST',
    headers: intestazioni(cfg),
    body: JSON.stringify({ email, password }),
  });
  if (corpo && corpo.access_token) salvaSessione(corpo);
  return corpo;
}

export async function rinnovaSessione() {
  const cfg = leggiConfig();
  const s = sessione();
  if (!s || !s.refresh_token) throw new ErroreSupabase('Sessione scaduta.', 401);
  const corpo = await richiesta(cfg, '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: intestazioni(cfg),
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  salvaSessione(corpo);
  return corpo;
}

export async function esci() {
  const cfg = leggiConfig();
  try { await richiesta(cfg, '/auth/v1/logout', { method: 'POST', headers: intestazioni(cfg) }); } catch { /* pazienza */ }
  salvaSessione(null);
}

/* ---------------- REST ---------------- */

export async function leggi(tabella, filtri = {}) {
  const cfg = leggiConfig();
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filtri)) q.set(k, v);
  q.set('select', '*');
  return richiesta(cfg, `/rest/v1/${tabella}?${q.toString()}`, { headers: intestazioni(cfg) }) || [];
}

export async function leggiUno(tabella, id) {
  const cfg = leggiConfig();
  const righe = await richiesta(
    cfg,
    `/rest/v1/${tabella}?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers: intestazioni(cfg) },
  );
  return (righe && righe[0]) || null;
}

/**
 * Scrive una riga. E' un UPSERT sulla chiave primaria generata da questo
 * dispositivo: mandarne due la stessa riga non crea duplicati, quindi il
 * sync e' idempotente e si puo' ritentare senza paura.
 */
export async function scrivi(tabella, riga) {
  const cfg = leggiConfig();
  return richiesta(cfg, `/rest/v1/${tabella}?on_conflict=id`, {
    method: 'POST',
    headers: intestazioni(cfg, {
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify(riga),
  });
}

export async function rimuovi(definitivo, tabella, id) {
  const cfg = leggiConfig();
  return richiesta(cfg, `/rest/v1/${tabella}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: intestazioni(cfg),
  });
}

/** Righe cambiate dall'ultima sincronizzazione riuscita. */
export async function prendiModificate(tabelle, dopoIso, { limite = 500 } = {}) {
  const risultati = {};
  for (const t of tabelle) {
    const q = new URLSearchParams();
    q.set('select', '*');
    q.set('order', 'updated_at.asc');
    q.set('limit', String(limite));
    if (dopoIso) q.set('updated_at', 'gt.' + dopoIso);
    risultati[t] = await richiesta(leggiConfig(), `/rest/v1/${t}?${q.toString()}`, {
      headers: intestazioni(leggiConfig()),
    }) || [];
  }
  return risultati;
}

export function collegato() {
  const cfg = leggiConfig();
  return cfg.attivo && !!sessione();
}
