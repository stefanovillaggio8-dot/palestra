// backup.js -- esportazione e importazione. Tutto gratis, tutto in locale.
// Nessuna dipendenza dal DOM così i formati si possono testare con node --test.

import { formattaNumero } from './numeri.js';
import { isoGiorno } from './streak.js';

export const FORMATO = 'palestra-backup';
export const VERSIONE_SCHEMA = 1;

/**
 * Una data esiste davvero?
 *
 * La forma non basta: `2026-02-30` ha la forma giusta e il giorno non esiste, e
 * JavaScript lo "corregge" da solo diventando il 2 marzo. Il controllo vero è
 * round-trip: si ricostruisce la data e si confronta con quella di partenza.
 */
function dataPossibile(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return false;
  return isoGiorno(d) === iso;
}

export function creaPacchetto(dati, meta = {}) {
  return {
    formato: FORMATO,
    versione_schema: VERSIONE_SCHEMA,
    esportato_il: new Date().toISOString(),
    note: meta.note || '',
    tabelle: {
      esercizi: dati.esercizi || [],
      schede: dati.schede || [],
      versioni: dati.versioni || dati.versi || [],
      sedute: dati.sedute || [],
      serie: dati.serie || [],
      note: dati.note || [],
      conflitti: dati.conflitti || [],
      profili: dati.profili || [],
      missioni: dati.missioni || [],
      ricompense: dati.ricompense || [],
      // I PESI, aggiunti l'08/10/2026. Mancavano, e senza lo storico del peso
      // corporeo un backup ripristinato ricalcolava tutti i Rank SENZA sapere quanto
      // pesa la persona: i kg a schermo erano gli stessi ma i Rank erano diversi da
      // quelli che avevi davanti. Il peso È la cosa che rende i Rank giusti, quindi
      // se non È nel backup il backup non È un backup.
      pesi: dati.pesi || [],
      // QUELLO CHE L'APP HA IMPARATO DA TE.
      //
      // Nella tabella `appreso` vivono le correzioni che hai dato all'app: quali
      // livelli hai corretto a mano per un esercizio, e quali parole nuove ha
      // imparato a riconoscere. Non era nel pacchetto, e `db.esportaTutto()` la
      // restituisce già: quindi l'app ti dimenticava tutto quello che le avevi
      // insegnato al backup.
      //
      // Il sintomo è subdolo perché sembra funzionare: fai il backup dal telefono,
      // lo ripristini sull'altro, e l'app ti chiede di nuovo "GRANDE o ISOLAMENTO?"
      // per ogni esercizio che avevi già corretto una volta sola.
      appreso: dati.appreso || [],
    },
  };
}

/**
 * Valida un file importato. Non lancia eccezioni: restituisce un esito
 * leggibile, così l'interfaccia può spiegare cosa cÈ che non va.
 */
export function validaPacchetto(oggetto) {
  const problemi = [];
  if (!oggetto || typeof oggetto !== 'object') {
    return { valido: false, problemi: ['Il file non e\' un documento valido.'], anteprima: null };
  }
  if (oggetto.formato !== FORMATO) {
    problemi.push(`Questo file non e\' un backup dell'app palestra (campo "formato" = ${JSON.stringify(oggetto.formato)}).`);
  }
  if (typeof oggetto.versione_schema !== 'number') {
    problemi.push('Manca il numero di versione dello schema.');
  } else if (oggetto.versione_schema > VERSIONE_SCHEMA) {
    problemi.push(`Il backup È di una versione piu\' nuova (${oggetto.versione_schema}) di questa app. Aggiorna l'app prima di importarlo.`);
  }
  const t = oggetto.tabelle;
  if (!t || typeof t !== 'object') {
    problemi.push('Manca la sezione "tabelle".');
    return { valido: false, problemi, anteprima: null };
  }
  const obbligatorie = ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note'];
  for (const k of obbligatorie) {
    if (!Array.isArray(t[k])) problemi.push(`La tabella "${k}" manca o non e\' un elenco.`);
  }
  if (Array.isArray(t.serie)) {
    const cattive = t.serie.filter((s) => !s || typeof s.id !== 'string' || s.id === '');
    if (cattive.length) problemi.push(`${cattive.length} serie senza un id valido.`);
    const rip = t.serie.filter((s) => s && s.ripetizioni !== null && s.ripetizioni !== undefined
      && !Number.isFinite(Number(s.ripetizioni)));
    if (rip.length) problemi.push(`${rip.length} serie hanno ripetizioni non numeriche.`);
  }
  if (Array.isArray(t.sedute)) {
    const cattive = t.sedute.filter((s) => !s || typeof s.id !== 'string');
    if (cattive.length) problemi.push(`${cattive.length} sedute senza un id valido.`);
    const durate = t.sedute.filter((s) => s && s.durata_secondi !== null && s.durata_secondi !== undefined
      && (!Number.isFinite(Number(s.durata_secondi)) || Number(s.durata_secondi) < 0));
    if (durate.length) problemi.push(`${durate.length} sedute hanno una durata non valida.`);

    // LE DATE IMPOSSIBILI.
    //
    // Qui si controllava solo che la data "assomigliasse" a una data, e
    // `\d{4}-\d{2}-\d{2}` accetta anche "2026-13-45", che non esiste. Passava,
    // l'anteprima scriveva "Periodo: dal 2026-10-01 al 9999-99-99", e poi
    // `giorniAllenati` scartava quelle sedute IN SILENZIO: giorni di allenamento che
    // sparivano senza nessun avviso. Il commento in streak.js lo ammetteva già
    // ("backup.js non valida le date delle sedute"): il buco era noto e non chiuso.
    const date = t.sedute.filter((s) => s && s.data !== null && s.data !== undefined
      && !dataPossibile(String(s.data).slice(0, 10)));
    if (date.length) {
      const esempi = [...new Set(date.map((s) => String(s.data).slice(0, 10)))].slice(0, 3);
      problemi.push(`${date.length} sedute hanno una data che non esiste (${esempi.join(', ')}).`);
    }

    // E I NUMERI NEGATIVI: un peso da -50 kg è un peso perso, non un peso.
    const negativi = t.sedute.filter((s) => s && ['durata_secondi'].some((k) => Number(s[k]) < 0));
    if (negativi.length) problemi.push(`${negativi.length} sedute hanno numeri negativi.`);
  }
  if (Array.isArray(t.serie)) {
    // I CHILI NEGATIVI: passavano e finivano nei Rank per davvero.
    const pesiNegativi = t.serie.filter((s) => s
      && ((s.peso !== null && s.peso !== undefined && Number(s.peso) < 0)
        || (s.peso_assistenza !== null && s.peso_assistenza !== undefined && Number(s.peso_assistenza) < 0)
        || (s.ripetizioni !== null && s.ripetizioni !== undefined && Number(s.ripetizioni) < 0)));
    if (pesiNegativi.length) {
      problemi.push(`${pesiNegativi.length} serie hanno un numero negativo (peso, assistenza o ripetizioni).`);
    }
  }
  const anteprima = problemi.length ? null : riepilogo(t);
  return { valido: problemi.length === 0, problemi, anteprima };
}

export function riepilogo(t) {
  const conta = (arr) => (Array.isArray(arr) ? arr.length : 0);
  const sedute = Array.isArray(t.sedute) ? t.sedute : [];
  const completate = sedute.filter((s) => s && s.stato === 'completata').length;
  const ricompense = Array.isArray(t.ricompense) ? t.ricompense : [];
  const aura = ricompense.reduce((a, r) => a + Number((r && r.aura) || 0), 0);
  return {
    esercizi: conta(t.esercizi),
    schede: conta(t.schede),
    versioni: conta(t.versioni),
    sedute: conta(t.sedute),
    seduteCompletate: completate,
    serie: conta(t.serie),
    note: conta(t.note),
    profili: conta(t.profili),
    missioniCompletate: (Array.isArray(t.missioni) ? t.missioni : []).filter((m) => m && m.completata_il).length,
    ricompense: ricompense.length,
    aura,
    primaData: sedute.map((s) => s.data).filter(Boolean).sort()[0] || null,
    ultimaData: sedute.map((s) => s.data).filter(Boolean).sort().slice(-1)[0] || null,
  };
}

/**
 * Modalita' di importazione.
 *  unione:       tiene tutto, aggiunge solo cio' che non esiste (per id)
 *  sostituzione: rimpiazza tutto il contenuto
 */
export function unisci(attuale, importato, tabella) {
  const mappa = new Map();
  for (const r of attuale || []) mappa.set(r.id, r);
  let aggiunte = 0; let aggiornate = 0; let lasciate = 0;
  for (const r of importato || []) {
    if (!r || !r.id) { lasciate++; continue; }
    const esistente = mappa.get(r.id);
    if (!esistente) { mappa.set(r.id, { ...r, sync: 'da_salvare', base_rev: 0 }); aggiunte++; continue; }
    const revImportato = Number(r.rev || 0);
    const revEsistente = Number(esistente.rev || 0);
    if (revImportato > revEsistente) {
      // ACCORCIA, NON SOSTITUISCE.
      //
      // Qui c'era `{ ...r }`, che rimpiazza la riga locale con quella del backup: i
      // campi che esistevano solo da una parte spariscono. Verificato: un esercizio
      // locale con `carrucola: 'doppia'`, `attrezzatura: 'dischi'` e
      // `bracciaIndipendenti: true` diventava `{ id, nome, rev, sync, base_rev }`.
      // Quei tre campi sono esattamente quelli che il progetto aveva già sistemato in
      // `applicaRemote` ("UNISCE, non sostituisce"): il buco restava qui perché la
      // sincronizzazione e il backup sono due strade diverse per lo stesso problema.
      //
      // Il risultato era che importando un backup di una versione vecchia quei campi
      // non venivano più recuperati, e il Rank su quel esercizio si dimezzava.
      mappa.set(r.id, { ...esistente, ...r, sync: 'da_salvare', base_rev: Number(esistente.base_rev || 0) });
      aggiornate++;
    } else {
      lasciate++;
    }
  }
  return { righe: [...mappa.values()], aggiunte, aggiornate, lasciate };
}

function cella(v) {
  if (v === null || v === undefined) return '';
  // i numeri escono con la virgola, cosÌ Excel in italiano li legge come numeri
  if (typeof v === 'number' && Number.isFinite(v)) v = formattaNumero(v);
  const s = String(v);
  // LE FORMULE.
  //
  // Una cella che comincia per `=`, `+`, `-` o `@` non è un testo per Excel: è
  // un'istruzione da eseguire. Il pericolo qui è vero e non teorico: se un nome di
  // esercizio o una nota comincia per `=`, il file che scarichi contiene una
  // formula, e chi lo apre lo esegue. Con una nota che comincia per `=HYPERLINK(...)`
  // può succedere quello che succede con i file ricevuti da fuori.
  //
  // Il trucco è mettere un apostrofo davanti: Excel lo legge come "questa è una
  // parola, non un comando", e per l'utente non si vede niente.
  const pericolosa = /^[=+\-@]/.test(s);
  const pulita = pericolosa ? "'" + s : s;
  return /[",;\n]/.test(pulita) ? '"' + pulita.replace(/"/g, '""') + '"' : pulita;
}

function righeCsv(intestazioni, righe) {
  const parti = [intestazioni.map(cella).join(';')];
  for (const r of righe) parti.push(r.map(cella).join(';'));
  return parti.join('\r\n');
}

/**
 * CSV delle serie: una riga per ogni serie, con tutte le informazioni
 * (spotter, assistite, note, convenzione). Pensato per Excel / Google Fogli.
 */
export function csvSerie(serie, esercizi = [], sedute = []) {
  const perId = new Map();
  for (const e of esercizi) perId.set(e.id, e);
  const sedPerId = new Map();
  for (const s of sedute) sedPerId.set(s.id, s);
  const righe = (serie || []).slice().sort((a, b) => {
    const sa = sedPerId.get(a.seduta_id); const sb = sedPerId.get(b.seduta_id);
    const da = sa ? String(sa.data) : ''; const db = sb ? String(sb.data) : '';
    if (da !== db) return da < db ? -1 : 1;
    return Number(a.ordine || 0) - Number(b.ordine || 0);
  }).map((s) => {
    const e = perId.get(s.esercizio_id) || {};
    const sed = sedPerId.get(s.seduta_id) || {};
    return [
      sed.data || '', sed.ora_inizio || '', sed.ora_fine || '', sed.durata_secondi ?? '',
      e.nome || '', e.convenzione || '', s.ordine ?? '',
      s.peso ?? '', s.ripetizioni ?? '', s.peso_assistenza ?? '',
      s.spotter ? 'si' : 'no',
      s.rip_assistite === null || s.rip_assistite === undefined ? 'non specificato' : s.rip_assistite,
      s.dropset ? 'dropset' : '',
      Array.isArray(s.giri_extra) ? s.giri_extra.map((g) => `${g.peso ?? ''}x${g.ripetizioni ?? ''}`).join(' | ') : '',
      s.stato || '', s.nota || '',
    ];
  });
  return righeCsv(
    ['data', 'ora_inizio', 'ora_fine', 'durata_secondi', 'esercizio', 'convenzione_carico',
      'serie', 'kg', 'ripetizioni', 'kg_assistenza', 'spotter', 'ripetizioni_assistite',
      'dropset', 'giri_dropset', 'stato_serie', 'nota_serie'],
    righe,
  );
}

/** CSV riassuntivo: una riga per seduta. */
export function csvSedute(sedute) {
  const righe = (sedute || []).slice().sort((a, b) => String(a.data) < String(b.data) ? -1 : 1).map((s) => [
    s.data || '', s.ora_inizio || '', s.ora_fine || '', s.durata_secondi ?? '',
    s.stato || '', s.nome_giorno || '', s.note || '',
  ]);
  return righeCsv(
    ['data', 'ora_inizio', 'ora_fine', 'durata_secondi', 'stato', 'giorno', 'note'],
    righe,
  );
}

/** CSV degli esercizi con la loro convenzione di carico. */
export function csvEsercizi(esercizi) {
  const righe = (esercizi || []).map((e) => [
    e.id || '', e.nome || '', e.gruppo || '', e.convenzione || '', e.tipo || '', e.foto || '', e.nota_permanente || '',
  ]);
  return righeCsv(['id', 'nome', 'gruppo', 'convenzione_carico', 'tipo', 'foto', 'nota_permanente'], righe);
}
