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

function intestazioniPubbliche(cfg, extra = {}) {
  return {
    apikey: cfg.anonKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  };
}

function jwtScaduto(errore) {
  const d = errore && errore.dettaglio && typeof errore.dettaglio === 'object' ? errore.dettaglio : {};
  const testo = [errore && errore.message, d.message, d.msg, d.error_description, d.code]
    .filter(Boolean).join(' ').toLowerCase();
  return /invalid jwt|token is expired|token.{0,30}expired|expired.{0,30}token|invalid claims|unable to parse or verify signature/.test(testo);
}

async function richiesta(cfg, percorso, opzioni, { rinnovaSeScaduto = true } = {}) {
  let res;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    res = await fetch(cfg.url + percorso, { ...opzioni, signal: controller.signal });
    const corpo = await json(res);
    if (!res.ok) {
      const msg = (corpo && (corpo.msg || corpo.error_description || corpo.message)) || ('Errore ' + res.status);
      const errore = new ErroreSupabase(msg, res.status, corpo);
      const endpointToken = /\/auth\/v1\/token(?:\?|$)/.test(percorso);
      const endpointLogout = /\/auth\/v1\/logout(?:\?|$)/.test(percorso);

      if (rinnovaSeScaduto && !endpointToken && !endpointLogout && jwtScaduto(errore)) {
        const s = sessione();
        if (!s || !s.refresh_token) {
          salvaSessione(null);
          throw new ErroreSupabase('La sessione online è scaduta. Accedi di nuovo dalla sezione Amici.', 401, corpo);
        }

        try {
          await rinnovaSessione();
        } catch (eRinnovo) {
          const testoRinnovo = String((eRinnovo && eRinnovo.message) || '').toLowerCase();
          if ([400, 401, 403].includes(eRinnovo && eRinnovo.stato)
              || /invalid refresh token|refresh token.*(invalid|expired|not found|revoked)/.test(testoRinnovo)) {
            salvaSessione(null);
            throw new ErroreSupabase('La sessione online è scaduta o non è più valida. Accedi di nuovo dalla sezione Amici.', 401, eRinnovo.dettaglio || eRinnovo.message);
          }
          throw eRinnovo;
        }

        // Riusa metodo e preferenze originali, ma non il vecchio Authorization ormai scaduto.
        const opzioniAggiornate = {
          ...opzioni,
          headers: { ...(opzioni.headers || {}), ...intestazioni(cfg) },
        };
        return richiesta(cfg, percorso, opzioniAggiornate, { rinnovaSeScaduto: false });
      }

      throw errore;
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
    headers: intestazioniPubbliche(cfg),
    body: JSON.stringify({ email, password }),
  });
  salvaSessione(corpo);
  return corpo;
}

export async function registrati(email, password) {
  const cfg = leggiConfig();
  const corpo = await richiesta(cfg, '/auth/v1/signup', {
    method: 'POST',
    headers: intestazioniPubbliche(cfg),
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
  const precedente = sessione();
  if (!precedente || !precedente.refresh_token) {
    salvaSessione(null);
    throw new ErroreSupabase('La sessione online è scaduta. Accedi di nuovo dalla sezione Amici.', 401);
  }

  let corpo;
  try {
    corpo = await richiesta(cfg, '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: intestazioniPubbliche(cfg),
      body: JSON.stringify({ refresh_token: precedente.refresh_token }),
    }, { rinnovaSeScaduto: false });
  } catch (e) {
    const testo = String((e && e.message) || '').toLowerCase();
    if ([400, 401, 403].includes(e && e.stato)
        || /invalid refresh token|refresh token.*(invalid|expired|not found|revoked)/.test(testo)) {
      salvaSessione(null);
      throw new ErroreSupabase('La sessione online è scaduta o non è più valida. Accedi di nuovo dalla sezione Amici.', 401, e.dettaglio || e.message);
    }
    throw e;
  }

  if (!corpo || !corpo.access_token || !corpo.refresh_token) {
    salvaSessione(null);
    throw new ErroreSupabase('Supabase non ha restituito una sessione valida. Accedi di nuovo dalla sezione Amici.', 401, corpo);
  }
  const aggiornata = { ...precedente, ...corpo, user: corpo.user || precedente.user };
  salvaSessione(aggiornata);
  return aggiornata;
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

  const utente = await verifica();
  s = sessione() || s;

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
  const s = sessione();
  return cfg.attivo && !!(s && (s.access_token || s.refresh_token));
}
