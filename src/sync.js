// sync.js -- il motore di sincronizzazione.
// Regole che valgono sempre:
//  - una riga locale non viene MAI cancellata prima della conferma del database
//  - ogni scrittura remota È un UPSERT sulla chiave primaria: ritentarla È sicuro
//  - se un altro dispositivo ha scritto la stessa riga, non si sovrascrive niente:
//    si conservano entrambe le versioni e le mostriamo a Ste

import * as db from './db.js';
import * as sb from './supabase.js';
import {
  TABELLE, rigaPerInvio, decidiPush, dopoInvioRiuscito, applicaRemote,
  costruisciConflitto, risolviConflitto, attesaRiprovo, statoSalvataggio, adesso, nuovoId,
} from './sincronizzazione.js';

const CHIAVE_ULTIMO_PULL = 'palestra-ultimo-pull';
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
const ascoltatori = new Set();

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

/** Il testo da mostrare in alto nell'app. */
export async function stato() {
  const cfg = sb.leggiConfig();
  const coda = sb.collegato() ? await db.codaDiInvio() : [];
  const errori = sb.collegato() ? await db.contaErrori() : 0;
  return statoSalvataggio({
    online: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
    configurato: sb.collegato(),
    coda: coda.length,
    errori,
    inCorso,
  });
}

/** Tasto "Riprova": azzera i tentativi e riparte subito. */
export async function riprovaOra() {
  const coda = await db.codaDiInvio();
  for (const { tabella, riga } of coda) {
    await db.salva(tabella, { ...riga, sync: 'da_salvare', tentativi: 0, ultimo_errore: null });
  }
  avvisa();
  return sincronizza();
}

/** Un giro di sincronizzazione. Non parte se un giro È ancora in corso. */
export async function sincronizza() {
  if (inCorso) return { fatto: false, motivo: 'gia-in-corso' };
  if (!sb.collegato()) return { fatto: false, motivo: 'non-collegato' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { fatto: false, motivo: 'offline' };
  }
  inCorso = true;
  avvisa();
  const esito = { inviati: 0, ricevuti: 0, conflitti: 0, errori: 0 };
  try {
    esito.ricevuti = await tira();
    esito.conflitti = await manda();
  } catch (e) {
    esito.errori = 1;
    esito.messaggio = e && e.message ? e.message : String(e);
  } finally {
    inCorso = false;
    avvisa();
  }
  return esito;
}

/** Manda in alto le modifiche pendenti, una alla volta. */
async function manda() {
  let conflitti = 0;
  const coda = await db.codaDiInvio();
  for (const { tabella, riga } of coda) {
    try {
      await db.salva(tabella, { ...riga, sync: 'in_corso', tentativi: Number(riga.tentativi || 0) + 1 });
      let remoto = null;
      try { remoto = await sb.leggiUno(tabella, riga.id); } catch { /* si prova comunque */ }
      const decisione = decidiPush(riga, remoto);
      if (decisione === 'conflitto') {
        await registraConflitto(tabella, riga, remoto);
        await db.salva(tabella, { ...riga, sync: 'conflitto' }, { seguiErrore: true });
        conflitti++;
        continue;
      }
      if (decisione === 'identico') {
        // IL `{ segna: false }` CHE MANCAVA.
        //
        // Tutti gli altri rami di questo ciclo passano `segna: false`, perché senza
        // quello `db.salva` rimette la riga in coda di invio e alza `rev` di uno. In
        // questo ramo la riga NON è stata inviata (è già identica al remoto): se la
        // si salva con la segna, `rev` sale senza che sia successo niente e il
        // numero locale diventa maggiore di quello del server.
        //
        // Il danno è permanente e silenzioso: in `applicaRemote` c'è
        // `if (revRemoto < revLocale) return { azione: 'ignora' }`, quindi da quel
        // momento tutte le modifiche che arrivano dagli altri dispositivi su quella
        // riga vengono scartate per sempre. Capita quando la rete va a buon fine ma
        // la scrittura locale finale fallisce: ed è esattamente il caso che tutto il
        // resto di questo file cerca di coprire.
        await db.salva(tabella, dopoInvioRiuscito(riga, Number(riga.rev || 0)), { segna: false });
        continue;
      }
      const nuovoRev = Number(riga.rev || 1);
      await sb.scrivi(tabella, { ...rigaPerInvio(riga), rev: nuovoRev });
      // la coda si svuota SOLO qui, dopo la conferma del database
      await db.salva(tabella, dopoInvioRiuscito(riga, nuovoRev), { segna: false });
    } catch (e) {
      const tentativi = Number(riga.tentativi || 0) + 1;
      await db.salva(tabella, {
        ...riga,
        sync: 'errore',
        ultimo_errore: e && e.message ? e.message : String(e),
        tentativi,
      }, { seguiErrore: true });
    }
  }
  return conflitti;
}

async function registraConflitto(tabella, locale, remoto) {
  const id = 'conf-' + nuovoId();
  await db.salva('conflitti', costruisciConflitto(id, tabella, locale, remoto || {}), { segna: true });
  return id;
}

/** Scarica quello che e\' cambiato altrove. */
async function tira() {
  const dopo = localStorage.getItem(CHIAVE_ULTIMO_PULL) || null;
  let ricevuti = 0;
  try {
    const modificati = await sb.prendiModificate(TABELLE_SINCRONIZZATE, dopo);
    for (const t of TABELLE_SINCRONIZZATE) {
      for (const remoto of modificati[t] || []) {
        const locale = await db.prendi(t, remoto.id);
        const esito = applicaRemote(locale, remoto);
        if (esito.azione === 'applica') {
          await db.salva(t, esito.riga, { segna: false });
          ricevuti++;
        } else if (esito.azione === 'conflitto') {
          await registraConflitto(t, locale, remoto);
          await db.salva(t, { ...locale, sync: 'conflitto' }, { seguiErrore: true });
        }
      }
    }
    localStorage.setItem(CHIAVE_ULTIMO_PULL, adesso());
  } catch {
    // se il download fallisce si riprova dopo: niente viene perso
    throw new Error('Non sono riuscito a scaricare gli aggiornamenti. Riprovo.');
  }
  return ricevuti;
}

/** Ste sceglie quale versione tenere. */
export async function risolvi(idConflitto, scelta) {
  const c = await db.prendi('conflitti', idConflitto);
  if (!c) return null;
  const esito = risolviConflitto(c, scelta);
  await db.salva(c.tabella, esito.riga);
  await db.salva('conflitti', { ...c, stato: scelta === 'remoto' ? 'scelta_remota' : 'scelta_locale', risolto_il: adesso(), scartato: esito.perso });
  avvisa();
  return esito;
}

export async function conflittiDaScegliere() {
  const tutti = await db.tutti('conflitti');
  return tutti.filter((c) => c.stato === 'da_scegliere');
}

/** Avvio: collega gli eventi di rete e i ritentativi automatici. */
export function avvia() {
  const online = () => { avvisa(); if (navigator.onLine !== false) sincronizza(); };
  window.addEventListener('online', online);
  window.addEventListener('offline', () => avvisa());
  setInterval(() => {
    if (typeof navigator === 'undefined' || navigator.onLine === false) return;
    if (sb.collegato()) sincronizza();
  }, 45000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { avvisa(); sincronizza(); }
  });
  sincronizza();
}

export function prossimoRiprovo(tentativi) {
  return attesaRiprovo(tentativi);
}
