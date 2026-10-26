// supabase.js -- client Supabase scritto a mano, senza librerie.
// Nessun pacchetto da installare, niente da compilare: serve solo fetch().
//
// Sul finestrino pubblico mettiamo solo la chiave "publishable", che per
// costruzione È pubblica (come una chiave di Wikipedia). La chiave che
// davvero fa paura, la "service_role", non entra MAI in questo progetto.
// I tuoi dati sono protetti dal database stesso: le regole che ci metto in
// schema.sql dicono che ogni utente vede solo le proprie righe.

const CHIAVE_CONFIG = 'palestra-config';

// Configurazione pubblica dell'app: la publishable key è progettata per stare
// nel browser. I dati restano protetti dalle policy RLS del database.
const CONFIG_PREDEFINITA = {
  url: 'https://adnteitlhopehllutlua.supabase.co',
  anonKey: 'sb_publishable_Rho_5i5fruFZBbN_iNjN3w_ksQ2OUEI',
};

export function leggiConfig() {
  try {
    const grezzo = localStorage.getItem(CHIAVE_CONFIG);
    if (!grezzo) return { ...CONFIG_PREDEFINITA, attivo: true };
    const c = JSON.parse(grezzo);
    if (c && c.url && c.anonKey) {
      return { attivo: true, url: c.url, anonKey: c.anonKey };
    }
    return { ...CONFIG_PREDEFINITA, attivo: true };
  } catch {
    return { ...CONFIG_PREDEFINITA, attivo: true };
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

/** Recupera la sessione restituita dalla conferma email Supabase. */
export function ripristinaSessioneDaUrl() {
  if (typeof window === 'undefined' || !window.location) return false;
  const hash = String(window.location.hash || '').replace(/^#/, '');
  if (!hash || !/(^|&)access_token=/.test(hash)) return false;
  const parametri = new URLSearchParams(hash);
  const accessToken = parametri.get('access_token');
  const refreshToken = parametri.get('refresh_token');
  if (!accessToken || !refreshToken) return false;
  const expiresIn = Number(parametri.get('expires_in') || 3600);
  salvaSessione({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: parametri.get('token_type') || 'bearer',
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: null,
  });
  // Rimuove i token dalla barra del browser, conserva ?inv=... e riporta
  // l'utente alla schermata profilo senza esporre la sessione nell'URL.
  try {
    window.history.replaceState({}, '', window.location.pathname + window.location.search + '#/profilo');
  } catch { /* browser senza History API */ }
  return true;
}

function intestazioniPubbliche(cfg, extra = {}) {
  return {
    apikey: cfg.anonKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  };
}

function intestazioni(cfg, extra = {}) {
  const h = intestazioniPubbliche(cfg);
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

function scadenzaJwt(token) {
  try {
    const parte = String(token || '').split('.')[1];
    if (!parte) return null;
    const normalizzata = parte.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(normalizzata + '='.repeat((4 - normalizzata.length % 4) % 4)));
    const exp = Number(payload && payload.exp);
    return Number.isFinite(exp) && exp > 0 ? exp : null;
  } catch { return null; }
}

function erroreJwtScaduto(corpo) {
  const testo = (typeof corpo === 'string' ? corpo : JSON.stringify(corpo || {})).toLowerCase();
  return /invalid jwt|token is expired|token.{0,60}expired|expired.{0,60}token|invalid claims|token has invalid claims|unable to parse or verify signature|jwt expired|pgrst301/.test(testo);
}

function richiestaProtetta(percorso) {
  return String(percorso || '').startsWith('/rest/v1/')
    || /\/auth\/v1\/user(?:\?|$)/.test(String(percorso || ''));
}

async function richiesta(cfg, percorso, opzioni, rinnovoGiaTentato = false, tentativoRete = 0, rinnovoProattivoGiaTentato = false) {
  // Rinnova prima che scada per evitare di iniziare una sincronizzazione con un JWT vecchio.
  if (richiestaProtetta(percorso) && !rinnovoGiaTentato && !rinnovoProattivoGiaTentato) {
    const s = sessione();
    const exp = scadenzaJwt(s && s.access_token)
      || (Number(s && s.expires_at) > 0 ? Number(s.expires_at) : null);
    if (s && s.refresh_token && exp && exp <= Math.floor(Date.now() / 1000) + 45) {
      const aggiornata = await rinnovaSessione();
      const headers = { ...(opzioni.headers || {}), Authorization: 'Bearer ' + aggiornata.access_token };
      return richiesta(cfg, percorso, { ...opzioni, headers }, rinnovoGiaTentato, tentativoRete, true);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(cfg.url + percorso, { ...opzioni, signal: controller.signal });
    const corpo = await json(res);
    if (!res.ok) {
      const endpointToken = /\/auth\/v1\/token(?:\?|$)/.test(percorso);
      const endpointSignup = /\/auth\/v1\/signup(?:\?|$)/.test(percorso);
      const endpointLogout = /\/auth\/v1\/logout(?:\?|$)/.test(percorso);
      const jwtRifiutato = richiestaProtetta(percorso) && (res.status === 401 || erroreJwtScaduto(corpo));

      if (!rinnovoGiaTentato && !endpointToken && !endpointSignup && !endpointLogout && jwtRifiutato) {
        const s = sessione();
        if (!s || !s.refresh_token) {
          if (s) salvaSessione(null);
          throw new ErroreSupabase('La sessione online è scaduta. Accedi di nuovo dalla sezione Amici; gli allenamenti locali restano salvati.', 401, corpo);
        }
        let aggiornata;
        try {
          aggiornata = await rinnovaSessione();
        } catch (erroreRinnovo) {
          const corrente = sessione();
          if (!corrente || !corrente.access_token) {
            throw new ErroreSupabase('La sessione online è scaduta o non è più valida. Accedi di nuovo dalla sezione Amici; gli allenamenti locali restano salvati.', 401, erroreRinnovo && (erroreRinnovo.dettaglio || erroreRinnovo.message));
          }
          throw erroreRinnovo;
        }
        const headers = { ...(opzioni.headers || {}), Authorization: 'Bearer ' + aggiornata.access_token };
        return richiesta(cfg, percorso, { ...opzioni, headers }, true, tentativoRete, true);
      }

      if (rinnovoGiaTentato && jwtRifiutato) {
        salvaSessione(null);
        throw new ErroreSupabase('Supabase ha rifiutato anche il token rinnovato. Accedi di nuovo dalla sezione Amici; gli allenamenti locali restano salvati.', 401, corpo);
      }
      const msg = (corpo && (corpo.msg || corpo.error_description || corpo.message)) || ('Errore ' + res.status);
      throw new ErroreSupabase(msg, res.status, corpo);
    }
    return corpo;
  } catch (e) {
    if (e instanceof ErroreSupabase) throw e;
    if (e && e.name === 'AbortError') {
      if (tentativoRete < 2) {
        clearTimeout(timer);
        await new Promise(resolve => setTimeout(resolve, 700 * (tentativoRete + 1)));
        return richiesta(cfg, percorso, opzioni, rinnovoGiaTentato, tentativoRete + 1, rinnovoProattivoGiaTentato);
      }
      throw new ErroreSupabase('Il database non ha risposto entro 15 secondi dopo 3 tentativi. Controlla la connessione e riprova.', 0, String(e));
    }
    if (e && e.name === 'TypeError' && tentativoRete < 2) {
      clearTimeout(timer);
      await new Promise(resolve => setTimeout(resolve, 700 * (tentativoRete + 1)));
      return richiesta(cfg, percorso, opzioni, rinnovoGiaTentato, tentativoRete + 1, rinnovoProattivoGiaTentato);
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
        // Usa l'URL di conferma già configurato su Supabase. La memoria locale
        // dell'identità e l'eventuale invito ripristinano il profilo corretto dopo il click.
        emailRedirectTo: 'https://stefanovillaggio8-dot.github.io/palestra/index.html?p=1',
      },
    }),
  });
  if (corpo && corpo.access_token) salvaSessione(corpo);
  return corpo;
}

let rinnovoSessioneInCorso = null;

export async function rinnovaSessione() {
  if (rinnovoSessioneInCorso) return rinnovoSessioneInCorso;
  const operazione = (async () => {
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
      }, true);
    } catch (e) {
      // Un'altra scheda potrebbe avere già ruotato il refresh token.
      const corrente = sessione();
      if (corrente && corrente.access_token && corrente.refresh_token
          && corrente.refresh_token !== precedente.refresh_token) return corrente;
      const testo = String((e && e.message) || '').toLowerCase();
      if ([400, 401, 403].includes(e && e.stato)
          || /invalid_grant|invalid refresh token|refresh token.*(invalid|expired|not found|revoked|already used)|refresh token not found/.test(testo)) {
        salvaSessione(null);
        throw new ErroreSupabase('La sessione online è scaduta o non è più valida. Accedi di nuovo dalla sezione Amici; gli allenamenti locali restano salvati.', 401, e.dettaglio || e.message);
      }
      throw e;
    }
    if (!corpo || !corpo.access_token || !corpo.refresh_token) {
      salvaSessione(null);
      throw new ErroreSupabase('Supabase non ha restituito una sessione valida. Accedi di nuovo dalla sezione Amici.', 401, corpo);
    }
    const exp = scadenzaJwt(corpo.access_token);
    const aggiornata = {
      ...precedente,
      ...corpo,
      user: corpo.user || precedente.user || null,
      expires_at: exp || (Math.floor(Date.now() / 1000) + Number(corpo.expires_in || 3600)),
    };
    salvaSessione(aggiornata);
    return aggiornata;
  })();
  rinnovoSessioneInCorso = operazione;
  try {
    return await operazione;
  } finally {
    if (rinnovoSessioneInCorso === operazione) rinnovoSessioneInCorso = null;
  }
}

/** Verifica l'identità effettiva del token presso Supabase Auth.
 * Non fidarsi soltanto dell'oggetto user salvato nel localStorage.
 */
export async function utenteCorrente() {
  const cfg = leggiConfig();
  let s = sessione();
  if (!cfg.attivo) throw new ErroreSupabase('Database online non configurato.', 400);
  if (!s || (!s.access_token && !s.refresh_token)) {
    salvaSessione(null);
    throw new ErroreSupabase('Non sei autenticato su Supabase. Accedi con email e password.', 401);
  }
  if (!s.access_token && s.refresh_token) s = await rinnovaSessione();
  const utente = await richiesta(cfg, '/auth/v1/user', {
    method: 'GET',
    headers: intestazioni(cfg),
  });
  // La richiesta può aver rinnovato automaticamente il JWT.
  s = sessione() || s;
  if (!utente || !utente.id) {
    throw new ErroreSupabase('Supabase non ha restituito un utente valido. Accedi di nuovo.', 401);
  }
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

/** Chiamata RPC a funzioni Postgres autorizzate tramite Supabase Auth. */
export async function rpc(nome, argomenti = {}) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(String(nome || ''))) {
    throw new Error('Nome della funzione non valido.');
  }
  const cfg = leggiConfig();
  if (!cfg.attivo) throw new ErroreSupabase('Database non configurato.', 0);
  if (!sessione() || !sessione().access_token) {
    throw new ErroreSupabase('Accedi prima di usare questa funzione.', 401);
  }
  return richiesta(cfg, '/rest/v1/rpc/' + nome, {
    method: 'POST',
    headers: intestazioni(cfg),
    body: JSON.stringify(argomenti || {}),
  });
}

/** Solo i profili degli amici che hanno autorizzato la condivisione. */
export async function profiliAmici() {
  if (!collegato()) return [];
  const dati = await rpc('profili_amici', {});
  return Array.isArray(dati) ? dati : [];
}

export async function creaInvitoAmico(profiloId, trasferisciAndrea = false) {
  return rpc('crea_invito_amico', {
    p_profilo_id: profiloId,
    p_trasferisci_andrea: !!trasferisciAndrea,
  });
}

export async function accettaInvitoAmico(token, profiloId) {
  return rpc('accetta_invito_amico', {
    p_token: token,
    p_profilo_id: profiloId,
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
