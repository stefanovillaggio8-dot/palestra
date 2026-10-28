// sedute.js -- la logica di una seduta, tenuta lontana dall'interfaccia.
// Qui dentro non cÈ nessun elemento della pagina: solo regole. Cosi' si può
// provare tutto con i test, senza aprire un browser.

import * as db from './db.js';
import { nuovoId, adesso } from './sincronizzazione.js';
import { convenzioneMisuraCarico, formattaNumero } from './numeri.js';

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

/**
 * Testo da mettere ACCANTO alla serie che ha lo spotter: quante ripetizioni
 * hai fatto in totale e quante di queste erano assistite.
 * Se le assistite non sono state scritte resta "non specificato" (non 0:
 * 0 vuol dire che le hai fatte tutte da solo, che e\' una cosa diversa).
 */
export function etichettaSpotterSerie(s) {
  if (!s || !s.spotter) return null;
  const rip = s.ripetizioni === null || s.ripetizioni === undefined ? null : Number(s.ripetizioni);
  const ass = s.rip_assistite === null || s.rip_assistite === undefined ? null : Number(s.rip_assistite);
  const testoRip = rip === null ? 'rip non specificate' : `${formattaNumero(rip)} rip`;
  const testoAss = ass === null ? 'assistite non specificate' : `${formattaNumero(ass)} assistite`;
  return `${testoRip} · ${testoAss}`;
}

/** I campi di una serie vuota, già pronti per il database. */
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
    // null vuol dire "non specificato", che È diverso da zero
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
  // IL BLOCCO CONTRO LE SEDUTE APERTE DUE VOLTE.
  //
  // Il controllo e la scrittura sono due `await` di fila, e tra i due c'è tempo per
  // un secondo tocco. Se tocchi "Inizia allenamento" due volte veloce, entrambe le
  // chiamate passano il controllo (che in quel momento non trova niente) e vengono
  // scritte due sedute aperte. Da lì l'app è bloccata: `apriSeduta` dice sempre
  // "c'è già un allenamento aperto", `sedutaInCorso` restituisce la prima delle due a
  // caso, e per sbloccare tutto devi andare a cancellare a mano la sessione fantasma.
  //
  // La catena `aperturaInCorso` tiene il posto anche se la prima chiamata non è
  // ancora finita di scrivere. Non è un blocco globale: si sblocca sempre, anche se
  // la prima chiamata va in errore.
  if (aperturaInCorso) throw sedutaAperta();
  aperturaInCorso = true;
  try {
    // si controlla solo la seduta DI QUESTA persona: una seduta lasciata aperta da
    // un altro profilo sullo stesso dispositivo non deve bloccare l'allenamento
    const attiva = await db.sedutaInCorso(versione && versione.id);
    if (attiva) throw sedutaAperta();
    const ora = oraInizio instanceof Date ? oraInizio : new Date(oraInizio);
    const data = dataPossibileOppureOggi(giorno.dataISO, ora);
    const seduta = await db.salva('sedute', {
      id: nuovoId(),
      scheda_id,
      versione_id: versione.id,
      giorno_id: giorno.id,
      nome_giorno: giorno.nome,
      data,
      ora_inizio: ora.toISOString(),
      ora_fine: null,
      durata_secondi: null,
      stato: 'in_corso',
      note: '',
    });
    await creaSeriePreviste(seduta, giorno);
    return await db.prendi('sedute', seduta.id);
  } finally {
    aperturaInCorso = false;
  }
}

/** La catena che tiene il posto mentre si apre una seduta. */
let aperturaInCorso = false;

/** L'errore "c'è già un allenamento aperto", sempre uguale. */
function sedutaAperta() {
  const errore = new Error('C\'è già un allenamento aperto: chiudi quello prima di iniziarne un altro.');
  errore.codice = 'seduta_aperta';
  return errore;
}

/**
 * La data della seduta, controllata.
 *
 * Il campo `dataISO` viene dalla scheda, e una scheda importata o scritta a mano
 * può avere "2026-13-45". Prima finiva così com'è nel database e poi la streak la
 * scartava in silenzio: una seduta davvero fatta non contava per niente e nessuno
 * diceva niente. Qui o è una data possibile, o è la data di oggi.
 */
function dataPossibileOppureOggi(dataISO, ora) {
  const testo = String(dataISO || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(testo)) {
    const d = new Date(testo + 'T12:00:00');
    if (!Number.isNaN(d.getTime()) && isoGiorno(d) === testo) return testo;
  }
  return isoGiorno(ora);
}

/** Crea le serie previste per la seduta appena aperta. */
async function creaSeriePreviste(seduta, giorno) {
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

/** Aggiunge una serie a un esercizio della seduta e la restituisce già salvata. */
export async function aggiungiSerie({ seduta_id, esercizio_id, esercizio, ordine, prevista = {} }) {
  const serie = nuovaSerie({ seduta_id, esercizio_id, ordine, esercizio, prevista });
  const salvata = await db.salva('serie', serie);
  return salvata;
}

// Una coda per ogni serie: i cambiamenti della stessa serie vanno in fila.
// Senza questo, due scritture quasi contemporanee (per esempio i kg che
// salvano in ritardo e la spunta) possono leggere la stessa versione vecchia e
// l'ultima che arriva cancella il cambiamento dell'altra. È successo a Ste
// sul telefono: spuntava la serie e un secondo dopo la spunta spariva.
const codeSerie = new Map();
// tutti i salvataggi ancora in volo: serve per aspettarli prima di chiudere
// la seduta (vedi aspettaSalvataggi)
const inVolo = new Set();

/**
 * Aspetta che tutti i salvataggi partiti finiscano.
 *
 * Serve quando finisci l'allenamento: se tocchi lo spotter e subito dopo
 * premi "Allenamento finito", senza aspettare la scheda risulterebbe "niente di
 * nuovo" e la conferma di aggiornarla non comparirebbe.
 */
export function aspettaSalvataggi() {
  if (!inVolo.size) return Promise.resolve();
  return Promise.all([...inVolo].map((p) => p.catch(() => {}))).then(() => {});
}

/** Cambia i campi di una serie esistente. */
export async function cambiaSerie(idSerie, campi) {
  const precedente = codeSerie.get(idSerie) || Promise.resolve();
  const lavoro = precedente.then(async () => {
    const esistente = await db.prendi('serie', idSerie);
    if (!esistente) {
      const errore = new Error('Questa serie non esiste piu\'. Ricarico la pagina.');
      errore.codice = 'serie_inesistente';
      throw errore;
    }
    return db.salva('serie', { ...esistente, ...campi });
  });
  inVolo.add(lavoro);
  const pulito = () => { inVolo.delete(lavoro); };
  lavoro.then(pulito, pulito);
  // anche se una scrittura fallisce, le successive devono poter andare avanti
  codeSerie.set(idSerie, lavoro.catch(() => {}));
  return lavoro;
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
  // LA DURATA VA CALCOLATA CON I NUMERI VERI.
  //
  // Qui si faceva `new Date(seduta.ora_inizio)` senza controllare che ci sia. E se
  // non c'è, `new Date(null)` è il 1970: la durata diventava di 56 anni e finiva
  // nelle statistiche per sempre. Se invece `ora_inizio` era una stringa che non è
  // una data, il risultato era `NaN`, e `Math.max(0, NaN)` restituisce `NaN`: la
  // protezione non proteggeva niente.
  //
  // Basta una seduta arrivata da un backup (che non validava l'ora di inizio) per
  // rovinare il totale delle durate in modo definitivo. Ora si usa la funzione
  // gemella, che già aveva la guardia giusta.
  const secondi = secondiDiAllenamento({ ...seduta, ora_fine: fine.toISOString() }, fine);
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

/** Le sedute finite, dalla più recente. */
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

/**
 * Mette sopra i giri appena scritti quelli che sono ancora in viaggio verso il
 * database (16/10/2026).
 *
 * IL DIFETTO CHE HA MESSO QUI. I giri del dropset si salvano UNO PER VOLTA. Prima
 * ogni campo del blocco chiudeva sulla copia degli giri letta al momento del disegno,
 * e ricostruiva l'array da quella copia: ogni scrittura conteneva un campo modificato e
 * tutti gli altri vuoti, e l'ultima scrittura vinceva. Ste: "io spungo l'esercizio e i
 * kg e le rip delle serie dropset (2,3,4) spariscono".
 *
 * Anche leggere ogni volta dalla serie viva non basta: `conRitardo` aspetta prima di
 * scrivere, e la serie viene rimessa in memoria solo DOPO che il salvataggio è finito.
 * Due campi corretti di fila arriverebbero al secondo senza il primo.
 *
 * Per questo i valori appena scritti si mettono da parte subito, in modo sincrono, e
 * `sovrapponiGiri` li rimette sopra quello che si trova sul disco.
 *
 * Qui la copia è LETTERALE, anche per un campo che vale `null`, e va spiegato il
 * perché non è pericoloso: quello che è in attesa arriva sempre da `cambiaGiro`, che
 * parte dall'array completo e cambia UN campo. Quindi un `null` in attesa vuol dire
 * "l'ho svuotato io", non "non l'ho toccato". Anzi deve vincere: se un campo svuotato
 * tenesse il valore vecchio, non si potrebbe più cancellare un numero da un giro.
 *
 * @param base     i giri come si trovano adesso (dal database o dalla vista)
 * @param inAttesa i giri appena scritti e non ancora salvati, se ci sono
 */
export function sovrapponiGiri(base, inAttesa) {
  const giri = [];
  for (let i = 0; i < GIRI_DROPSET; i++) {
    const g = Array.isArray(base) ? base[i] : null;
    giri.push({ ...(g && typeof g === 'object' ? g : { peso: null, ripetizioni: null }) });
  }
  if (Array.isArray(inAttesa)) {
    for (let i = 0; i < giri.length; i++) {
      const p = inAttesa[i];
      if (!p || typeof p !== 'object') continue;
      for (const campo of ['peso', 'ripetizioni']) {
        if (p[campo] !== undefined) giri[i][campo] = p[campo];
      }
    }
  }
  return giri;
}
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
/** Ricostruisce il giro dai dati persistenti, senza contatori locali da sincronizzare. */
export function indiceProssimoGiorno(versione, sedute = [], versioni = []) {
  const giorni = versione?.snapshot?.giorni || [];
  if (!giorni.length) return -1;
  const nome = (v) => String(v || '').trim().toLocaleLowerCase('it');
  const delleVersioni = new Map(versioni.map(v => [v.id, v]));
  delleVersioni.set(versione.id, versione);
  const data = (s) => {
    // La data dell'allenamento prevale sulla data di inserimento/importazione.
    const giorno = String(s.data || '').slice(0, 10);
    const t = Date.parse(giorno || s.ora_inizio || s.ora_fine || '');
    return Number.isFinite(t) ? t : -Infinity;
  };
  const valide = sedute.filter(s => s && !s.eliminata && s.stato === 'completata'
    && (s.scheda_id ? s.scheda_id === versione.scheda_id
      : delleVersioni.get(s.versione_id)?.scheda_id === versione.scheda_id)
    && Number.isFinite(data(s)))
    .sort((a, b) => data(b) - data(a)
      || String(b.ora_inizio || '').localeCompare(String(a.ora_inizio || ''))
      || String(b.id || '').localeCompare(String(a.id || '')));
  for (const s of valide) {
    let indice = giorni.findIndex(g => g.id && g.id === s.giorno_id);
    if (indice < 0) {
      const originale = delleVersioni.get(s.versione_id)?.snapshot?.giorni?.find(g => g.id === s.giorno_id);
      const etichetta = nome(s.nome_giorno || s.giorno_nome || originale?.nome);
      const corrispondenze = giorni.map((g, i) => nome(g.nome) === etichetta && etichetta ? i : -1).filter(i => i >= 0);
      if (corrispondenze.length === 1) indice = corrispondenze[0];
    }
    if (indice >= 0) return (indice + 1) % giorni.length;
  }
  return 0;
}
