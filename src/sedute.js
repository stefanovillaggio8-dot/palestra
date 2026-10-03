// sedute.js -- la logica di una seduta, tenuta lontana dall'interfaccia.
// Qui dentro non c'e' nessun elemento della pagina: solo regole. Cosi' si puo'
// provare tutto con i test, senza aprire un browser.

import * as db from './db.js';
import { nuovoId, adesso } from './sincronizzazione.js';
import { convenzioneMisuraCarico } from './numeri.js';

export const GIRI_DROPSET = 3;
export const STATI_SERIE = ['da_fare', 'fatta', 'saltata'];

/** La serie e\' stata fatta? */
export function eFatta(s) { return !!s && s.stato === 'fatta'; }

/** Una serie da mostrare in verde e con la spunta. */
export function commutaFatta(s) {
  const nuova = eFatta(s) ? 'da_fare' : 'fatta';
  return { ...s, stato: nuova };
}

/**
 * Cambia aspetto alla riga e alla spunta SUBITO, senza aspettare nessuna
 * risposta e senza dipendere dai nomi delle classi CSS: lo stile lo metto
 * direttamente sul nodo. Cosi' la spunta spunta anche se il CSS del browser
 * e\' vecchio o non e\' arrivato.
 */
export function segnaAspettoFatto(riga, bottoneSpunta, fatta, etichetta = null) {
  const VERDE = '#37d18b';
  const ARANCIO = '#ff9f45';
  const stile = (nodo, campi) => {
    if (!nodo || !nodo.style) return;
    for (const [k, v] of Object.entries(campi)) nodo.style[k] = v;
  };
  const st = (nodo) => (nodo && nodo.getAttribute && nodo.getAttribute('style')) || '';

  if (riga) {
    // doppio sistema: classe (per il CSS) e stile diretto (per non dipendere dal CSS)
    if (riga.classList) {
      if (fatta) riga.classList.add('serie-fatta');
      else riga.classList.remove('serie-fatta');
    }
    if (fatta) {
      const conSpotter = riga.classList && riga.classList.contains('serie-spotter');
      stile(riga, {
        background: conSpotter
          ? 'linear-gradient(90deg, #10301f 0%, #2a2016 70%)'
          : 'linear-gradient(90deg, #10301f 0%, #221b33 60%)',
        borderLeftColor: conSpotter ? ARANCIO : VERDE,
        boxShadow: 'inset 0 0 0 1px rgba(55,209,139,.45)',
      });
    } else {
      stile(riga, {
        background: '',
        borderLeftColor: '',
        boxShadow: '',
      });
    }
  }
  if (bottoneSpunta) {
    if (bottoneSpunta.classList) {
      if (fatta) bottoneSpunta.classList.add('attiva');
      else bottoneSpunta.classList.remove('attiva');
    }
    stile(bottoneSpunta, fatta
      ? { background: VERDE, borderColor: VERDE, color: '#04180f' }
      : { background: '#0b0910', borderColor: '#2e2745', color: 'transparent' });
    const segno = bottoneSpunta.firstChild;
    if (segno) segno.textContent = fatta ? '✓' : '';
    if (bottoneSpunta.setAttribute) {
      bottoneSpunta.setAttribute('aria-pressed', fatta ? 'true' : 'false');
      bottoneSpunta.title = fatta
        ? 'Serie fatta: tocca per togliere la spunta'
        : 'Segna questa serie come fatta';
    }
  }
  if (etichetta) {
    etichetta.textContent = fatta ? 'FATTA' : '';
    stile(etichetta, fatta
      ? { color: VERDE, fontSize: '.7rem', fontWeight: '800', display: 'inline-block' }
      : { display: 'none' });
  }
}

/** Tenuta delle ultime azioni: serve a capire cosa succede sul telefono. */
export const REGISTRO = [];
export function registra(riga) {
  REGISTRO.push({ quando: new Date().toLocaleTimeString('it-IT'), ...riga });
  if (REGISTRO.length > 40) REGISTRO.shift();
  return REGISTRO;
}

/**
 * Vibrazione sotto il dito quando spunti una serie.
 * Non e\' audio: e\' un impulso tattile, silenzioso.
 * Se il telefono non la supporta, non succede niente e non da problemi.
 */
export function pulsa() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
  } catch { /* pazienza */ }
}

/** I campi di una serie vuota, gia' pronti per il database. */
export function nuovaSerie({ seduta_id, esercizio_id, ordine, esercizio, prevista = {} }) {
  const assistito = !!esercizio && !convenzioneMisuraCarico(esercizio.convenzione);
  return {
    id: nuovoId(),
    seduta_id,
    esercizio_id,
    ordine: Number(ordine) || 1,
    peso: prevista.peso === undefined ? null : prevista.peso,
    peso_assistenza: prevista.peso_assistenza === undefined ? null : prevista.peso_assistenza,
    ripetizioni: prevista.ripetizioni === undefined ? null : prevista.ripetizioni,
    spotter: !!prevista.spotter,
    // null vuol dire "non specificato", che e' diverso da zero
    rip_assistite: null,
    dropset: !!prevista.dropset,
    giri_extra: prevista.dropset
      ? Array.from({ length: GIRI_DROPSET }, () => ({ peso: null, ripetizioni: null }))
      : [],
    stato: 'da_fare',
    nota: '',
    assistito,
  };
}

/**
 * Apre una seduta per un giorno della scheda e crea le serie previste.
 * Non sovrascrive niente: le sedute precedenti restano intatte.
 */
export async function apriSeduta({ scheda_id, versione, giorno, oraInizio = new Date() }) {
  const attiva = await db.sedutaInCorso();
  if (attiva) {
    const errore = new Error('C\'e\' gia\' un allenamento aperto: chiudi quello prima di iniziarne un altro.');
    errore.codice = 'seduta_aperta';
    throw errore;
  }
  const ora = oraInizio instanceof Date ? oraInizio : new Date(oraInizio);
  const seduta = await db.salva('sedute', {
    id: nuovoId(),
    scheda_id,
    versione_id: versione.id,
    giorno_id: giorno.id,
    nome_giorno: giorno.nome,
    data: giorno.dataISO || isoGiorno(ora),
    ora_inizio: ora.toISOString(),
    ora_fine: null,
    durata_secondi: null,
    stato: 'in_corso',
    note: '',
  });
  for (const es of (giorno.esercizi || [])) {
    const esercizio = await esercizioDi(es.esercizio_id);
    const previste = es.serie || [];
    const numero = Math.max(1, previste.length);
    for (let i = 0; i < numero; i++) {
      await db.salva('serie', nuovaSerie({
        seduta_id: seduta.id, esercizio_id: es.esercizio_id, ordine: i + 1,
        esercizio, prevista: previste[i] || {},
      }));
    }
  }
  return seduta;
}

/** Aggiunge una serie a un esercizio della seduta e la restituisce gia' salvata. */
export async function aggiungiSerie({ seduta_id, esercizio_id, esercizio, ordine, prevista = {} }) {
  const serie = nuovaSerie({ seduta_id, esercizio_id, ordine, esercizio, prevista });
  const salvata = await db.salva('serie', serie);
  return salvata;
}

/** Cambia i campi di una serie esistente. */
export async function cambiaSerie(idSerie, campi) {
  const esistente = await db.prendi('serie', idSerie);
  if (!esistente) {
    const errore = new Error('Questa serie non esiste piu\'. Ricarico la pagina.');
    errore.codice = 'serie_inesistente';
    throw errore;
  }
  return db.salva('serie', { ...esistente, ...campi });
}

/** Chiude la seduta: salvata ora di fine e durata, calcolata dall'inizio. */
export async function chiudiSeduta(idSeduta, oraFine = new Date()) {
  const seduta = await db.prendi('sedute', idSeduta);
  if (!seduta) {
    const errore = new Error('Questa seduta non esiste piu\'.');
    errore.codice = 'seduta_inesistente';
    throw errore;
  }
  const fine = oraFine instanceof Date ? oraFine : new Date(oraFine);
  const secondi = Math.max(0, Math.round((fine.getTime() - new Date(seduta.ora_inizio).getTime()) / 1000));
  return db.salva('sedute', {
    ...seduta,
    ora_fine: fine.toISOString(),
    durata_secondi: secondi,
    stato: 'completata',
  });
}

/** Secondi passati dall'inizio della seduta, anche dopo chiusura e riapertura. */
export function secondiDiAllenamento(seduta, adesso = new Date()) {
  if (!seduta || !seduta.ora_inizio) return 0;
  const inizio = new Date(seduta.ora_inizio).getTime();
  const fine = seduta.ora_fine ? new Date(seduta.ora_fine).getTime() : adesso.getTime();
  return Math.max(0, Math.round((fine - inizio) / 1000));
}

/** Le serie di un esercizio dentro una seduta, in ordine. */
export function serieDiEsercizio(serie, sedutaId, esercizioId) {
  return (serie || [])
    .filter((x) => x && !x.eliminata && x.seduta_id === sedutaId && x.esercizio_id === esercizioId)
    .sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
}

/** Le sedute finite, dalla piu' recente. */
export function seduteFinite(sedute) {
  return (sedute || [])
    .filter((s) => s && s.stato === 'completata' && !s.eliminata)
    .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
}

/** L'ultima seduta in cui hai fatto un esercizio, prima di questa. */
export function ultimaConEsercizio(sedute, serie, esercizioId, escludiSeduta) {
  for (const s of seduteFinite(sedute)) {
    if (s.id === escludiSeduta) continue;
    const ha = (serie || []).some((x) => !x.eliminata && x.seduta_id === s.id && x.esercizio_id === esercizioId);
    if (ha) return s;
  }
  return null;
}

/** Il prossimo numero di ordine libero per un esercizio. */
export function prossimoOrdine(serie, sedutaId, esercizioId) {
  const mie = serieDiEsercizio(serie, sedutaId, esercizioId);
  return mie.length ? Math.max(...mie.map((x) => x.ordine || 0)) + 1 : 1;
}

/** Aggiorna un giro del dropset senza toccare gli altri. */
export function cambiaGiro(giri, indice, campo, valore) {
  const copia = (Array.isArray(giri) ? giri : []).map((g) => ({ ...g }));
  while (copia.length < GIRI_DROPSET) copia.push({ peso: null, ripetizioni: null });
  const numero = valore === '' || valore === null || valore === undefined
    ? null
    : Number(String(valore).replace(',', '.'));
  copia[indice] = { ...(copia[indice] || {}), [campo]: numero };
  return copia.slice(0, GIRI_DROPSET);
}

async function esercizioDi(id) {
  return db.prendi('esercizi', id);
}

function isoGiorno(data) {
  const d = data instanceof Date ? data : new Date(data);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${g}`;
}

export { isoGiorno, adesso };