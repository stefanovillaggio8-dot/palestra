// supabase.js -- client Supabase scritto a mano, senza librerie.
// Nessun pacchetto da installare, niente da compilare: serve solo fetch().
//
// Sul finestrino pubblico mettiamo solo la chiave "publishable", che per
// costruzione È pubblica (come una chiave di Wikipedia). La chiave che
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

async function richiesta(cfg, percorso, opzioni, rinnovoGiaTentato = false) {
  let res;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    res = await fetch(cfg.url + percorso, { ...opzioni, signal: controller.signal });
    const corpo = await json(res);
    if (!res.ok) {
      // Se il JWT è scaduto o non è più valido, la REST API risponde 401
      // (spesso PGRST303). Prima il download si fermava qui senza tentare il
      // rinnovo, anche se nel dispositivo era presente un refresh_token valido.
      // Rinnoviamo una sola volta e ripetiamo la stessa richiesta con il token nuovo.
      if (res.status === 401 && !rinnovoGiaTentato && percorso.startsWith('/rest/v1/')) {
        const s = sessione();
        if (s && s.refresh_token) {
          const nuovaSessione = await rinnovaSessione();
          const headers = { ...(opzioni.headers || {}) };
          if (nuovaSessione && nuovaSessione.access_token) {
            headers.Authorization = 'Bearer ' + nuovaSessione.access_token;
          }
          return await richiesta(cfg, percorso, { ...opzioni, headers }, true);
        }
      }
      const msg = (corpo && (corpo.msg || corpo.error_description || corpo.message)) || ('Errore ' + res.status);
      throw new ErroreSupabase(msg, res.status, corpo);
    }
    return corpo;
  } catch (e) {
    if (e instanceof ErroreSupabase) throw e;
    if (e && e.name === 'AbortError') {
      throw new ErroreSupabase('Il database non ha risposto entro 15 secondi. Controlla la connessione e riprova.', 0, String(e));
    }
    throw new ErroreSupabase('Nessuna connessione con il database.', 0, String(e));
  } finally {
    clearTimeout(timer);
  }
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
    body: JSON.stringify({
      email,
      password,
      options: {
        emailRedirectTo: 'https://stefanovillaggio8-dot.github.io/palestra/index.html?p=1',
      },
    }),
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


/** Verifica l'identità effettiva del token presso Supabase Auth.
 * Non fidarsi soltanto dell'oggetto user salvato nel localStorage.
 */
export async function utenteCorrente() {
  const cfg = leggiConfig();
  let s = sessione();
  if (!cfg.attivo || !s || !s.access_token) {
    throw new ErroreSupabase('Non sei autenticato su Supabase. Accedi con email e password.', 401);
  }

  const verifica = async () => richiesta(cfg, '/auth/v1/user', {
    method: 'GET',
    headers: intestazioni(cfg),
  });

  let utente;
  try {
    utente = await verifica();
  } catch (e) {
    if (e && e.stato === 401 && s.refresh_token) {
      s = await rinnovaSessione();
      utente = await verifica();
    } else {
      throw e;
    }
  }

  if (!utente || !utente.id) {
    throw new ErroreSupabase('Supabase non ha restituito un utente valido. Accedi di nuovo.', 401);
  }

  // Aggiorna i metadati utente memorizzati senza toccare i dati degli allenamenti.
  if (!s.user || s.user.id !== utente.id) {
    salvaSessione({ ...s, user: { ...(s.user || {}), ...utente } });
  }
  return utente;
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
 * Scrive una riga. È un UPSERT sulla chiave primaria generata da questo
 * dispositivo: mandarne due la stessa riga non crea duplicati, quindi il
 * sync È idempotente e si può ritentare senza paura.
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
