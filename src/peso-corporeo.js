// peso-corporeo.js -- il peso della persona e la sua storia.
//
// Il Rank tiene conto del peso corporeo: chi pesa 60 kg e chi pesa 90 kg non
// possono avere lo stesso Rank lifting gli stessi 60 kg. Per farlo bene serve
// sapere QUANTO PESAVA la persona il giorno in cui ha fatto quella performance,
// altrimenti un record di sei mesi fa verrebbe giudicato con il peso di oggi.
//
// Qui ci sono tre cose e niente di piu':
//   - il peso attuale
//   - lo storico (un peso per data)
//   - il peso che valeva in un certo giorno (per valutare le sedute passate)

import * as db from './db.js';
import { pesoCorporeoValido, PESO_RIFERIMENTO } from './rank-config.js';
import { nuovoId, adesso } from './sincronizzazione.js';
import { schedaEvento } from './ui.js';

export { pesoCorporeoValido, PESO_RIFERIMENTO };

/** Quanti giorni sono passati dall'ultimo peso messo. */
const GIORNI_MAX_SENZA_PESO = 10;

function comeNumero(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Il peso attuale. Se non c'e' nessuna misurazione torna null: l'app funziona
 * lo stesso, ma il Rank non puo' valutare la forza relativa.
 */
export async function pesoAttuale() {
  const pesi = await pesiCronologici();
  if (!pesi.length) return null;
  return pesi[pesi.length - 1].kg;
}

/** Tutte le misurazioni, dalla piu' vecchia alla piu' recente. */
export async function pesiCronologici() {
  const tutte = await db.tutti('pesi');
  return tutte
    .filter((p) => p && p.eliminata !== true)
    .map((p) => ({ ...p, kg: pesoCorporeoValido(p.kg) }))
    .filter((p) => p.kg !== null)
    .sort((a, b) => String(a.data).localeCompare(String(b.data)));
}

/**
 * Segna un peso. Se la giornata e' gia' stata compilata la corregge invece di
 * crearne una seconda, cosi' non si accumulano misurazioni identiche.
 */
export async function segnaPeso(kg, { data = null, nota = '' } = {}) {
  const valore = pesoCorporeoValido(kg);
  if (valore === null) {
    const errore = new Error('Scrivi un peso sensato, tra 25 e 300 kg.');
    errore.codice = 'peso_non_valido';
    throw errore;
  }
  const giorno = data || schedaEvento();
  const gia = (await db.tutti('pesi')).find((p) => p.data === giorno && !p.eliminata);
  if (gia) {
    return db.salva('pesi', { ...gia, kg: valore, nota: nota || gia.nota || '' });
  }
  return db.salva('pesi', {
    id: nuovoId(), data: giorno, kg: valore, nota, created_at: adesso(),
  });
}

export async function togliPeso(id) {
  return db.cestino('pesi', id);
}

/**
 * Il peso che valeva in un certo giorno: prende l'ultima misurazione che
 * precede quel giorno (o quella dello stesso giorno).
 */
export async function pesoAllaData(data) {
  const pesi = await pesiCronologici();
  if (!pesi.length) return null;
  let scelto = null;
  for (const p of pesi) {
    if (String(p.data) <= String(data)) scelto = p;
    else break;
  }
  return scelto ? scelto.kg : (pesi.length ? pesi[0].kg : null);
}

/** Il peso del giorno di una seduta, con un piccolo margine di tolleranza. */
export async function pesoAllaSeduta(seduta) {
  if (!seduta) return pesoAttuale();
  return pesoAllaData(seduta.data || schedaEvento());
}

/** L'ultima pesatura e' troppo vecchia? Serve a ricordare di aggiornare. */
export async function serveAggiornare() {
  const pesi = await pesiCronologici();
  if (!pesi.length) return { serve: true, giorni: null, motivo: 'non hai ancora segnato il peso' };
  const ultimo = pesi[pesi.length - 1];
  const giorni = giorniPassati(ultimo.data);
  if (giorni === null) return { serve: true, giorni: null, motivo: 'ultima pesatura non valida' };
  if (giorni > GIORNI_MAX_SENZA_PESO) {
    return { serve: true, giorni, motivo: `l'ultima pesatura risale a ${giorni} giorni fa` };
  }
  return { serve: false, giorni, motivo: null };
}

function giorniPassati(dataIso) {
  const oggi = new Date();
  const ieri = new Date(Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()));
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dataIso || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.round((ieri - d) / 86400000));
}

/**
 * Il peso da mettere dentro una serie quando la salvi: cosi' la performance
 * resta legata al peso che avevi quel giorno, anche se domani ti pesi divers.
 */
export async function pesoDaMettereInSerie(sede) {
  return pesoAllaSeduta(sede);
}