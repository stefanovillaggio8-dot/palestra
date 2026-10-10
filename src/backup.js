// backup.js -- esportazione e importazione. Tutto gratis, tutto in locale.
// Nessuna dipendenza dal DOM così i formati si possono testare con node --test.

import { formattaNumero } from './numeri.js';

export const FORMATO = 'palestra-backup';
export const VERSIONE_SCHEMA = 1;

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
      mappa.set(r.id, { ...r, sync: 'da_salvare', base_rev: Number(esistente.base_rev || 0) });
      aggiornate++;
    } else {
      lasciate++;
    }
  }
  return { righe: [...mappa.values()], aggiunte, aggiornate, lasciate };
}

function cella(v) {
  if (v === null || v === undefined) return '';
  // i numeri escono con la virgola, così Excel in italiano li legge come numeri
  if (typeof v === 'number' && Number.isFinite(v)) v = formattaNumero(v);
  const s = String(v);
  return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
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
