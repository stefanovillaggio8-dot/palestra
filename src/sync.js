// sync.js -- il motore di sincronizzazione.
// Regole che valgono sempre:
//  - una riga locale non viene MAI cancellata prima della conferma del database
//  - ogni scrittura remota È un UPSERT sulla chiave primaria: ritentarla È sicuro
//  - se un altro dispositivo ha scritto la stessa riga, non si sovrascrive niente:
//    si conservano entrambe le versioni e le mostriamo a Ste

import * as db from './db.js';
import * as sb from './supabase.js';
import {
  TABELLE, rigaPerInvio, preservaMetadatiProfiloLocaleSuRemoto, decidiPush, dopoInvioRiuscito, applicaRemote,
  costruisciConflitto, risolviConflitto, preparaRigaDopoSceltaConflitto,
  attesaRiprovo, statoSalvataggio, adesso, nuovoId,
} from './sincronizzazione.js';

const CHIAVE_ULTIMO_PULL = 'palestra-ultimo-pull';
const CHIAVE_ULTIMO_PULL_COMPLETO = 'palestra-ultimo-pull-completo-v1';
const INTERVALLO_PULL_COMPLETO = 24 * 60 * 60 * 1000;
// LE TABELLE SCENDONO E SALGONO DA QUI.
//
// `pesi` È STATA AGGIUNTA IL 08/10/2026, e fino ad allora mancava. La tabella
// esiste su Supabase (schema.sql, con la sua policy "propri pesi"), e l'app la
// scriveva localmente, ma non era in questa lista: quindi il peso corporeo non
// veniva MAI scaricato al cambio dispositivo. In pratica aprivi l'app sul
// telefono nuovo, i tuoi record c'erano tutti, ma il peso non c'era: il Rank
// veniva valutato senza peso corporeo (o sul peso di default), quindi diceva il
// numero sbagliato proprio mentre i kg a schermo erano giusti.
//
// Nota: `conflitti` e `appreso` restano fuori di proposito e non per dimenticanza.
// I conflitti nascono da una scelta di Ste fra due versioni, quindi non hanno
// senso da scaricare da un altro dispositivo. `appreso` sono le correzioni che
// Ste ha insegnato all'app: se le sincronizzassi, la correzione che fai sul
// telefono viaggerebbe anche al computer (e forse è quello che vuoi, ma non è
// una cosa da decidere di nascosto).
const TABELLE_SINCRONIZZATE = ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note',
  'profili', 'missioni', 'ricompense', 'pesi'];

let inCorso = false;
let avvioRegistrato = false;
let promessaSincronizzazione = null;
let timerRiprovo = null;
let erroriConsecutivi = 0;
const ascoltatori = new Set();

// Il recupero avviene SOLO quando la PWA è aperta. Non si riscrivono revisioni,
// non si eliminano sedute e non si crea una seconda coda: sono gli stessi UPSERT
// già protetti da decidiPush e dalla lettura del remoto.
function programmaRiprovo() {
  if (!avvioRegistrato || timerRiprovo !== null || !sb.collegato()
      || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  const pausa = attesaRiprovo(Math.min(erroriConsecutivi, 4));
  timerRiprovo = setTimeout(() => {
    timerRiprovo = null;
    if (sb.collegato() && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
      void sincronizza();
    }
  }, pausa);
}

function fermaRiprovo() {
  if (timerRiprovo !== null) clearTimeout(timerRiprovo);
  timerRiprovo = null;
  erroriConsecutivi = 0;
}

function erroreTransitorio(e) {
  const stato = Number(e?.stato || 0);
  if ([408, 425, 429, 500, 502, 503, 504, 520, 522, 524].includes(stato)) return true;
  if (stato >= 400 && stato < 500) return false; // RLS/constraint: segnalare, non nascondere.
  const s = String(e?.message || e || '').toLowerCase();
  return stato === 0 && /rete|network|connessione|timeout|non ha risposto|failed to fetch|load failed|abort|offline|temporan/.test(s);
}

export function iscriviti(fn) {
  ascoltatori.add(fn);
  return () => ascoltatori.delete(fn);
}

export function avvisa() {
  for (const fn of ascoltatori) {
    try { fn(); } catch { /* un ascoltatore rotto non deve fermare gli altri */ }
  }
}

export function inEsecuzione() { return inCorso; }

/** Dopo una nuova amicizia scarica anche le sedute vecchie dell'amico.
 * Non cancella dati né il cursore incrementale: forza soltanto un pull completo sicuro.
 */
export function richiediPullCompleto() {
  try { localStorage.removeItem(CHIAVE_ULTIMO_PULL_COMPLETO); } catch { /* browser senza memoria */ }
}

/** Il testo da mostrare in alto nell'app. */
export async function stato() {
  const cfg = sb.leggiConfig();
  const coda = sb.collegato() ? await db.codaDiInvio() : [];
  const errori = sb.collegato() ? await db.contaErrori() : 0;
  const stato = statoSalvataggio({
    online: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
    configurato: sb.collegato(),
    coda: coda.length,
    errori,
    inCorso,
  });
  // Mostra la causa concreta dell'ultimo errore, invece di lasciare soltanto
  // un contatore che non distingue rete, autorizzazioni e schema del database.
  if (errori > 0) {
    for (const tabella of TABELLE_SINCRONIZZATE) {
      const righe = await db.tutti(tabella, { includiEliminati: true });
      // Gli esercizi del catalogo condiviso sono locali: non devono bloccare
      // la sincronizzazione né continuare a mostrare un errore RLS ormai noto.
      if (tabella === 'esercizi') {
        for (const r of righe) {
          if ((String(r.id || '').startsWith('ex-') || r.globale === true)
              && (r.sync === 'errore' || r.sync === 'da_salvare' || r.sync === 'in_corso')) {
            await db.aggiornaSe(
              'esercizi',
              r.id,
              (attuale) => attuale && (attuale.sync === 'errore' || attuale.sync === 'da_salvare' || attuale.sync === 'in_corso'),
              (attuale) => ({ ...attuale, sync: 'pulito', ultimo_errore: null, tentativi: 0, in_flight: false }),
              { seguiErrore: true },
            );
          }
        }
      }
      const ultimo = righe.find((r) => r.sync === 'errore' && r.ultimo_errore
        && !(tabella === 'esercizi' && (String(r.id || '').startsWith('ex-') || r.globale === true)));
      if (ultimo) {
        const testoErrore = String(ultimo.ultimo_errore || '').toLowerCase();
        if (/invalid jwt|token is expired|token.{0,60}expired|expired.{0,60}token|invalid claims|token has invalid claims|unable to parse or verify signature|jwt expired|pgrst301/.test(testoErrore)) {
          stato.dettaglio = 'La sessione online è scaduta o non è più valida. Apri Amici e accedi di nuovo; gli allenamenti locali restano salvati.';
        } else {
          stato.dettaglio = 'Ultimo errore (' + tabella + '): ' + ultimo.ultimo_errore;
        }
        break;
      }
    }
  }
  return stato;
}

/** Tasto "Riprova": azzera i tentativi e riparte subito. */
export async function riprovaOra() {
  const coda = await db.codaDiInvio();
  for (const { tabella, riga } of coda) {
    // Il catalogo iniziale usa ID condivisi (ex-...). Non va inserito nella tabella
    // privata public.esercizi: se un altro account possiede già lo stesso ID,
    // l'UPSERT viene respinto dalla policy RLS. Il catalogo resta locale; si sincronizzano
    // soltanto esercizi personali con ID propri.
    if (tabella === 'esercizi' && (String(riga.id || '').startsWith('ex-') || riga.globale === true)) {
      await db.aggiornaSe(
        tabella,
        riga.id,
        (attuale) => attuale && (attuale.sync === 'da_salvare' || attuale.sync === 'errore'),
        (attuale) => ({ ...attuale, sync: 'pulito', ultimo_errore: null, tentativi: 0 }),
        { seguiErrore: true },
      );
      continue;
    }
    await db.salva(tabella, { ...riga, sync: 'da_salvare', tentativi: 0, ultimo_errore: null });
  }
  avvisa();
  return sincronizza();
}

/** Un giro di sincronizzazione. Se richiesto, condivide il giro già partito. */
export async function sincronizza({ attendiSeInCorso = false } = {}) {
  if (inCorso) {
    return attendiSeInCorso && promessaSincronizzazione
      ? promessaSincronizzazione
      : { fatto: false, motivo: 'gia-in-corso' };
  }
  if (!sb.collegato()) return { fatto: false, motivo: 'non-collegato' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { fatto: false, motivo: 'offline' };
  }
  inCorso = true;
  avvisa();
  const esito = { inviati: 0, ricevuti: 0, conflitti: 0, errori: 0 };
  const lavoro = (async () => {
    // Se il download fallisce, prova comunque gli invii: manda() controlla
    // la revisione di OGNI riga remota prima di scrivere, quindi non sovrascrive
    // versioni più recenti. Il pull incompleto non avanza il cursore locale.
    try {
      try {
        const scaricati = await tira();
        esito.ricevuti = scaricati.ricevuti;
        esito.conflitti += scaricati.conflitti;
      } catch (e) {
        esito.errori++;
        esito.messaggio = e?.message || String(e);
      }
      const inviati = await manda();
      esito.inviati = inviati.inviati;
      esito.conflitti += inviati.conflitti;
      esito.errori += inviati.errori;
      if (inviati.messaggio) {
        esito.messaggio = [esito.messaggio, inviati.messaggio].filter(Boolean).join(' · ');
      }
    } catch (e) {
      esito.errori++;
      esito.messaggio = e?.message || String(e);
    } finally {
      inCorso = false;
      avvisa();
    }
    esito.fatto = esito.errori === 0;
    return esito;
  })();
  promessaSincronizzazione = lavoro;
  try {
    const risultato = await lavoro;
    if (risultato.errori) {
      erroriConsecutivi++;
      programmaRiprovo();
    } else {
      fermaRiprovo();
    }
    return risultato;
  } finally {
    if (promessaSincronizzazione === lavoro) promessaSincronizzazione = null;
  }
}

/** Manda in alto le modifiche pendenti, una alla volta. */
async function manda() {
  const esito = { inviati: 0, conflitti: 0, errori: 0, messaggio: '' };
  const coda = await db.codaDiInvio();
  for (const { tabella, riga } of coda) {
    // Gli esercizi del catalogo condiviso non appartengono alla tabella privata
    // public.esercizi. Non inviarli: la policy RLS rifiuta gli ID condivisi.
    if (tabella === 'esercizi' && (String(riga.id || '').startsWith('ex-') || riga.globale === true)) {
      await db.aggiornaSe(
        tabella,
        riga.id,
        (attuale) => attuale && (attuale.sync === 'da_salvare' || attuale.sync === 'errore'),
        (attuale) => ({ ...attuale, sync: 'pulito', ultimo_errore: null, tentativi: 0, in_flight: false }),
        { seguiErrore: true },
      );
      continue;
    }
    // Il record potrebbe essere stato modificato dopo la lettura della coda.
    // La transazione condizionale evita di spedire una fotografia vecchia o di
    // rimettere in corso una modifica che un'altra scheda ha già aggiornato.
    const avviata = await db.aggiornaSe(
      tabella,
      riga.id,
      (attuale) => attuale
        && (attuale.sync === 'da_salvare' || attuale.sync === 'errore')
        && Number(attuale.rev || 0) === Number(riga.rev || 0)
        && attuale.updated_at === riga.updated_at,
      (attuale) => ({
        ...attuale,
        sync: 'in_corso',
        tentativi: Number(attuale.tentativi || 0) + 1,
      }),
    );
    if (!avviata) continue;

    try {
      // Se la lettura fallisce non si può sapere se il server abbia una versione
      // più nuova: fermarsi qui evita che un successivo upsert la sovrascriva.
      const remoto = await sb.leggiUno(tabella, riga.id);
      const decisione = decidiPush(riga, remoto);
      if (decisione === 'conflitto') {
        const idConflitto = await registraConflitto(tabella, riga, remoto);
        const marcata = await db.aggiornaSe(
          tabella,
          riga.id,
          (attuale) => attuale && attuale.sync === 'in_corso'
            && Number(attuale.rev || 0) === Number(riga.rev || 0)
            && attuale.updated_at === riga.updated_at,
          (attuale) => ({ ...attuale, sync: 'conflitto' }),
          { seguiErrore: true },
        );
        if (marcata) esito.conflitti++;
        else await archiviaConflittoSuperato(idConflitto);
        continue;
      }
      if (decisione === 'identico') {
        // Il server ha già la stessa revisione: si conferma in locale senza
        // riscriverla né incrementarne la revisione.
        //
        // IL `segna: false` QUI NON E' UN DETTAGLIO. `db.salva` con `segna: true`
        // rimette la riga in coda e alza `rev` di uno: il numero locale diventava maggiore
        // di quello del server, e da quel momento `applicaRemote` scartava PER SEMPRE le
        // modifiche che arrivavano dagli altri dispositivi su quella riga. Il danno e'
        // permanente e silenzioso.
        await confermaInvio(tabella, riga, Number(riga.rev || 0), { segna: false });
        continue;
      }
      const nuovoRev = Number(riga.rev || 1);
      // Le righe personali devono sempre appartenere all'utente autenticato su Supabase.
      // Alcuni dati locali più vecchi possono contenere user_id dell'account interno
      // dell'app (o nessun user_id): Postgres RLS li rifiuta. La coda è già locale
      // a questo account autenticato, quindi assegniamo l'UUID verificato dalla sessione.
      const utenteVerificato = await sb.utenteCorrente();
      const utenteSupabase = utenteVerificato && utenteVerificato.id;
      if (!utenteSupabase) throw new Error('Supabase non ha confermato l’utente autenticato: accedi di nuovo e riprova.');
      // L'UPSERT e' una sostituzione JSON completa del profilo, non un PATCH
      // campo-per-campo. Mantieni accrediti e ripartenze già sul server quando
      // questa PWA locale non li conosce ancora (es. reinstallazione iPhone).
      const daInviare = tabella === 'profili'
        ? preservaMetadatiProfiloLocaleSuRemoto(rigaPerInvio(riga,tabella), remoto)
        : rigaPerInvio(riga,tabella);
      await sb.scrivi(tabella, { ...daInviare, user_id: utenteSupabase, rev: nuovoRev });
      // La coda si svuota solo dopo la conferma. Se nel frattempo la riga è
      // cambiata, la modifica più nuova resta in coda con la base aggiornata.
      await confermaInvio(tabella, riga, nuovoRev);
      esito.inviati++;
    } catch (e) {
      const messaggioBase = e && e.message ? e.message : String(e);
      // Aggiunge tabella e ID alla diagnosi: così si può distinguere un ID
      // condiviso/duplicato da un problema di sessione o di policy RLS.
      const messaggio = tabella + ' [' + String(riga.id || '(senza id)') + ']: ' + messaggioBase;
      await db.aggiornaSe(
        tabella,
        riga.id,
        (attuale) => attuale && attuale.sync === 'in_corso'
          && Number(attuale.rev || 0) === Number(riga.rev || 0)
          && attuale.updated_at === riga.updated_at,
        (attuale) => ({
          ...attuale,
          // Rete instabile: la modifica resta da inviare. Non trasformare un
          // timeout in un errore permanente che sembra richiedere un riavvio.
          sync: erroreTransitorio(e) ? 'da_salvare' : 'errore',
          ultimo_errore: messaggio,
        }),
        { seguiErrore: true },
      );
      esito.errori++;
      esito.messaggio = messaggio;
      // Se la rete o il database non rispondono, non provare subito tutte le
      // altre righe in errore: possono essercene centinaia e ogni richiesta
      // ha un timeout. Fermarsi qui evita che l'interfaccia resti in
      // "Salvataggio..." per un tempo enorme; il prossimo giro ritenterà.
      break;
    }
  }
  return esito;
}

function stessaVersione(a, b) {
  return !!a && !!b
    && Number(a.rev || 0) === Number(b.rev || 0)
    && a.updated_at === b.updated_at;
}

function stessaRigaAttesa(attuale, attesa) {
  if (!attesa) return !attuale;
  return stessaVersione(attuale, attesa) && attuale.sync === attesa.sync;
}

/**
 * Registra la conferma remota senza cancellare un'eventuale modifica fatta
 * mentre la richiesta era in viaggio.
 */
async function confermaInvio(tabella, snapshot, revRemoto, opzioni = {}) {
  const baseAttesa = Number(snapshot.base_rev || 0);
  const revSpedita = Number(snapshot.rev || 0);
  return db.aggiornaSe(
    tabella,
    snapshot.id,
    (attuale) => {
      if (!attuale) return false;
      if (attuale.sync === 'in_corso' && stessaVersione(attuale, snapshot)) return true;
      return (attuale.sync === 'da_salvare' || attuale.sync === 'errore')
        && Number(attuale.rev || 0) > revSpedita
        && Number(attuale.base_rev || 0) === baseAttesa;
    },
    (attuale) => {
      if (attuale.sync === 'in_corso' && stessaVersione(attuale, snapshot)) {
        return dopoInvioRiuscito(attuale, revRemoto);
      }
      return { ...attuale, base_rev: revRemoto, sync: 'da_salvare' };
    },
    opzioni,
  );
}

async function archiviaConflittoSuperato(id) {
  await db.aggiornaSe(
    'conflitti',
    id,
    (conflitto) => conflitto && conflitto.stato === 'da_scegliere',
    (conflitto) => ({ ...conflitto, stato: 'superato', risolto_il: adesso() }),
  );
}

async function registraConflitto(tabella, locale, remoto) {
  const id = 'conf-' + nuovoId();
  await db.salva('conflitti', costruisciConflitto(id, tabella, locale, remoto || {}), { segna: true });
  return id;
}

/** Scarica quello che e\' cambiato altrove. */
async function tira() {
  const inizioPull = adesso();
  const dopo = localStorage.getItem(CHIAVE_ULTIMO_PULL) || null;
  let ricevuti = 0;
  let conflitti = 0;
  try {
    // Ripara anche le righe remote più vecchie che questo dispositivo non ha mai
    // scaricato (per esempio una seduta del 14 ottobre assente in locale). Il pull
    // incrementale da solo non le recupera se updated_at è precedente al cursore.
    // Al primo avvio dopo questa correzione, e poi una volta ogni 24 ore, facciamo
    // un pull completo. applicaRemote protegge le modifiche locali e i conflitti.
    const ultimoCompleto = localStorage.getItem(CHIAVE_ULTIMO_PULL_COMPLETO);
    const dataUltimoCompleto = ultimoCompleto ? Date.parse(ultimoCompleto) : 0;
    const pullCompleto = !dopo || !dataUltimoCompleto
      || Date.now() - dataUltimoCompleto >= INTERVALLO_PULL_COMPLETO;
    const modificati = await sb.prendiModificate(TABELLE_SINCRONIZZATE, pullCompleto ? null : dopo);
    for (const t of TABELLE_SINCRONIZZATE) {
      for (const remoto of modificati[t] || []) {
        const locale = await db.prendi(t, remoto.id);
        const esito = applicaRemote(locale, remoto);
        if (esito.azione === 'applica') {
          const applicata = await db.aggiornaSe(
            t,
            remoto.id,
            (attuale) => stessaRigaAttesa(attuale, locale),
            () => esito.riga,
          );
          if (applicata) ricevuti++;
        } else if (esito.azione === 'conflitto') {
          const idConflitto = await registraConflitto(t, locale, remoto);
          const marcata = await db.aggiornaSe(
            t,
            remoto.id,
            (attuale) => stessaRigaAttesa(attuale, locale),
            (attuale) => ({ ...attuale, sync: 'conflitto' }),
            { seguiErrore: true },
          );
          if (marcata) conflitti++;
          else await archiviaConflittoSuperato(idConflitto);
        }
      }
    }
    localStorage.setItem(CHIAVE_ULTIMO_PULL, inizioPull);
    if (pullCompleto) localStorage.setItem(CHIAVE_ULTIMO_PULL_COMPLETO, adesso());
  } catch (e) {
    // Conserva il messaggio reale del server: è fondamentale per distinguere
    // una tabella/colonna mancante da una sessione scaduta o un problema di rete.
    throw new Error('Download (' + (e && e.message ? e.message : String(e)) + ').');
  }
  return { ricevuti, conflitti };
}

/** Ste sceglie quale versione tenere. */
export async function risolvi(idConflitto, scelta) {
  if (scelta !== 'locale' && scelta !== 'remoto') {
    throw new Error('Scelta del conflitto non valida.');
  }
  const c = await db.prendi('conflitti', idConflitto);
  if (!c || c.stato !== 'da_scegliere') return null;
  const esito = risolviConflitto(c, scelta);

  // Non usare db.salva(..., segna:true): incrementerebbe di nuovo
  // la revisione locale e RIPORTEREBBE base_rev alla versione vecchia.
  // Il giro successivo creerebbe lo stesso conflitto una seconda volta.
  // La transazione condizionale protegge anche gli edit fatti in un'altra
  // scheda fra l'apertura della finestra e il click dell'utente.
  const aggiornata = await db.aggiornaSe(
    c.tabella,
    c.riga_id,
    (attuale) => !!attuale && attuale.sync === 'conflitto'
      && Number(attuale.rev || 0) === Number(c.locale?.rev || 0)
      && attuale.updated_at === c.locale?.updated_at,
    (attuale) => preparaRigaDopoSceltaConflitto(c, esito, attuale),
  );
  if (!aggiornata) {
    throw new Error('Questi dati sono cambiati dopo il conflitto. Riapri la schermata e controlla le due versioni.');
  }
  await db.salva('conflitti', {
    ...c,
    stato: scelta === 'remoto' ? 'scelta_remota' : 'scelta_locale',
    risolto_il: adesso(),
    scartato: esito.perso,
  });
  avvisa();
  return esito;
}

export async function conflittiDaScegliere() {
  const tutti = await db.tutti('conflitti');
  return tutti.filter((c) => c.stato === 'da_scegliere');
}

/** Avvio: collega gli eventi di rete e i ritentativi automatici. */
export function avvia() {
  // La stessa PWA può richiamare il bootstrap più volte dopo errori o cambio
  // account: un solo listener/timer evita pull duplicati e lag progressivi.
  if (avvioRegistrato) return;
  avvioRegistrato = true;
  let ultimoRisveglio = 0;
  const riprendi = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    if (!sb.collegato()) return;
    // Su iPhone focus e visibilitychange arrivano insieme: un solo pull,
    // senza impedire i salvataggi espliciti e il retry del motore di sync.
    if (Date.now() - ultimoRisveglio < 3000) return;
    ultimoRisveglio = Date.now();
    void sincronizza();
  };
  const online = () => { avvisa(); riprendi(); };
  window.addEventListener('online', online);
  window.addEventListener('focus', online);
  window.addEventListener('offline', () => avvisa());
  setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    riprendi();
  }, 45000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { avvisa(); riprendi(); }
  });
  riprendi();
}

export function prossimoRiprovo(tentativi) {
  return attesaRiprovo(tentativi);
}
