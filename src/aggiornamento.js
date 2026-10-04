// aggiornamento.js -- "quello che ho fatto diventa la scheda".
//
// Quando finisci un allenamento puoi far salire quello che hai fatto davvero
// nella scheda, cosi' la prossima volta la trovi gia' aggiornata.
//
// Regole che valgono sempre:
//  - si aggiorna SOLO il giorno che hai allenato, gli altri giorni non si toccano
//  - si aggiornano solo gli esercizi che hai davvero fatto
//  - le sedute gia' registrate non cambiano MAI: l'aggiornamento crea una
//    versione nuova della scheda, quelle vecchie restano com'erano
//  - niente spotter e niente ripetizioni assistite nella scheda: la scheda
//    contiene pesi e ripetizioni, il resto sta nello storico

import { formattaNumero, convenzioneMisuraCarico } from './numeri.js';

export const MODALITA = { CHIEDI: 'chiedi', SEMPRE: 'sempre', MAI: 'mai' };

/** Le serie di una seduta, raggruppate per esercizio e in ordine. */
export function raccogliPerEsercizio(serie, sessioneId) {
  const perId = new Map();
  for (const s of (serie || [])) {
    if (!s || s.eliminata || s.seduta_id !== sessioneId) continue;
    if (!perId.has(s.esercizio_id)) perId.set(s.esercizio_id, []);
    perId.get(s.esercizio_id).push(s);
  }
  const ordinate = new Map();
  for (const [id, lista] of perId) {
    ordinate.set(id, lista.slice().sort((a, b) => (a.ordine || 0) - (b.ordine || 0)));
  }
  return ordinate;
}

/** Una serie conta come fatta se ha almeno i kg o le ripetizioni. */
export function serieRegistrata(s) {
  if (!s) return false;
  const haPeso = s.peso !== null && s.peso !== undefined && s.peso !== '';
  const haAss = s.peso_assistenza !== null && s.peso_assistenza !== undefined && s.peso_assistenza !== '';
  const haRip = s.ripetizioni !== null && s.ripetizioni !== undefined && s.ripetizioni !== '';
  return (haPeso || haAss) && haRip;
}

/** Converte una serie registrata in una serie "prevista" per la scheda. */
export function aPrevista(s, esercizio) {
  const assistito = !!esercizio && !convenzioneMisuraCarico(esercizio.convenzione);
  return {
    peso: assistito ? null : numeroOppure(s.peso),
    peso_assistenza: assistito ? numeroOppure(s.peso_assistenza) : null,
    ripetizioni: numeroOppure(s.ripetizioni),
    // lo spotter finisce nella scheda: se l'hai fatto cosi' una volta, la
    // prossima volta la serie e' gia' segnata come "da fare con lo spotter"
    spotter: !!s.spotter,
    dropset: !!s.dropset,
  };
}

function numeroOppure(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** "35x8, 35x7S, 35x6" per capire subito cosa c'era e cosa mettiamo. */
export function descriviSerie(serie, esercizio) {
  const assistito = !!esercizio && !convenzioneMisuraCarico(esercizio.convenzione);
  return (serie || [])
    .map((s) => {
      const p = assistito ? s.peso_assistenza : s.peso;
      const peso = p === null || p === undefined ? '?' : formattaNumero(p);
      const rip = s.ripetizioni === null || s.ripetizioni === undefined ? '?' : formattaNumero(s.ripetizioni);
      const segni = (s.spotter ? 'S' : '') + (s.dropset ? 'D' : '');
      return `${segni}${peso}x${rip}`;
    })
    .join(', ');
}

/**
 * Prepara la scheda aggiornata e l'elenco delle modifiche.
 * Non scrive niente: restituisce solo la proposta, che va mostrata a Ste
 * prima di entrare nel database.
 */
export function proposta(snapshot, giornoId, seriePerEsercizio, eserciziPerId) {
  const bozza = JSON.parse(JSON.stringify(snapshot));
  const giorno = bozza.giorni.find((g) => g.id === giornoId);
  const cambiamenti = [];
  if (!giorno) return { snapshot: bozza, cambiamenti, nessunaNovita: true };

  for (const es of giorno.esercizi) {
    const registrate = (seriePerEsercizio.get(es.esercizio_id) || []).filter(serieRegistrata);
    if (!registrate.length) continue;
    const esercizio = eserciziPerId.get(es.esercizio_id) || null;
    const nuove = registrate.map((s) => aPrevista(s, esercizio));
    const prima = descriviSerie(es.serie, esercizio);
    const dopo = descriviSerie(nuove, esercizio);
    const primaN = (es.serie || []).length;
    const dopoN = nuove.length;
    if (prima === dopo && primaN === dopoN) continue;
    const aggiunta = dopoN > primaN;
    const tolta = dopoN < primaN;
    cambiamenti.push({
      esercizio_id: es.esercizio_id,
      nome: (esercizio && esercizio.nome) || es.esercizio_id,
      prima,
      dopo,
      aggiunta,
      tolta,
      serieAggiunte: Math.max(0, dopoN - primaN),
      serieTolte: Math.max(0, primaN - dopoN),
      pesoCambiato: pesoCambiato(es.serie, nuove, esercizio),
      ripCambiate: ripCambiate(es.serie, nuove),
      spotterCambiato: spotterCambiato(es.serie, nuove),
    });
    es.serie = nuove;
  }

  return { snapshot: bozza, cambiamenti, nessunaNovita: cambiamenti.length === 0 };
}

function pesoCambiato(vecchie, nuove, esercizio) {
  const assistito = !!esercizio && !convenzioneMisuraCarico(esercizio.convenzione);
  const a = vecchie.map((s) => (assistito ? s.peso_assistenza : s.peso));
  const b = nuove.map((s) => (assistito ? s.peso_assistenza : s.peso));
  if (a.length !== b.length) return false;
  return a.some((v, i) => Number(v) !== Number(b[i]));
}

function ripCambiate(vecchie, nuove) {
  const a = vecchie.map((s) => s.ripetizioni);
  const b = nuove.map((s) => s.ripetizioni);
  if (a.length !== b.length) return false;
  return a.some((v, i) => Number(v) !== Number(b[i]));
}

function spotterCambiato(vecchie, nuove) {
  const a = vecchie.map((s) => !!s.spotter);
  const b = nuove.map((s) => !!s.spotter);
  if (a.length !== b.length) return a.some(Boolean) !== b.some(Boolean);
  return a.some((v, i) => v !== b[i]);
}

/**
 * Quante ripetizioni hai fatto con lo spotter in questa seduta.
 * Te lo dice a parole, perche' il numero da solo non si capisce:
 * conta le serie, le ripetizioni totali di quelle serie, e quante di queste
 * sono state assistite davvero (se non le hai segnate, resta "non specificato").
 */
export function riassuntoSpotter(seriePerEsercizio, nomiEsercizi = new Map()) {
  let serie = 0;
  let ripetizioni = 0;
  let assistite = 0;
  let assistiteDette = 0;
  let nonSpecificato = 0;
  const dettaglio = [];

  for (const [esercizioId, lista] of (seriePerEsercizio || new Map())) {
    const conSpotter = (lista || []).filter((s) => serieRegistrata(s) && s.spotter === true);
    if (!conSpotter.length) continue;
    serie += conSpotter.length;
    for (const s of conSpotter) {
      const rip = numeroOppure(s.ripetizioni);
      if (rip !== null) ripetizioni += rip;
      const ass = numeroOppure(s.rip_assistite);
      if (ass === null) nonSpecificato++;
      else { assistite += ass; assistiteDette++; }
    }
    dettaglio.push({
      esercizio_id: esercizioId,
      nome: nomiEsercizi.get(esercizioId) || esercizioId,
      serie: conSpotter.length,
      ripetizioni: conSpotter.reduce((a, s) => a + (numeroOppure(s.ripetizioni) || 0), 0),
      assistite: conSpotter.reduce((a, s) => a + (numeroOppure(s.rip_assistite) || 0), 0),
    });
  }

  const frasi = [];
  if (!serie) return { serie: 0, ripetizioni: 0, assistite: 0, nonSpecificato: 0, frase: 'Nessuna serie con lo spotter.', dettaglio };

  // Prima diceva una cosa sola tre volte: "1 serie con lo spotter, 6
  // ripetizioni in tutto, 1 serie senza il numero delle assistite". Ste:
  // "togli questo non ha senso". Ora e' una frase sola, e le assistite sono
  // un'informazione a se' invece di una frase che sembra un errore.
  const capi = [];
  capi.push(`${serie} ${serie === 1 ? 'serie' : 'serie'} con lo spotter`);
  if (ripetizioni) capi.push(`${formattaNumero(ripetizioni)} ${ripetizioni === 1 ? 'ripetizione' : 'ripetizioni'} in tutto`);

  let frase = capi.join(', ') + '.';
  // vanno mostrate SEMPRE entrambe le informazioni: anche quando in una serie
  // non hai scritto quante ripetizioni erano assistite, le altre serie le hai
  // scelte e quel numero non deve sparire. Prima era un if/else if e quindi
  // spariva.
  if (nonSpecificato) {
    frase += ` Non hai scritto quante ripetizioni sono state assistite in ${nonSpecificato} ${nonSpecificato === 1 ? 'serie' : 'serie'}.`;
  }
  if (assistiteDette) {
    frase += ` In tutto ${formattaNumero(assistite)} ${assistite === 1 ? 'ripetizione assistita' : 'ripetizioni assistite'}.`;
  }
  return {
    serie, ripetizioni, assistite, nonSpecificato, dettaglio,
    frase,
  };
}

/** Frase pronta da leggere: "Chest Press: 35x8, 35x7, 35x6 -> 35x8, 35x7, 35x8". */
export function fraseCambiamento(c) {
  return `${c.nome}: ${c.prima} → ${c.dopo}`;
}

/**
 * Come spiegare il cambiamento quando cambiano le SERIE e non solo i numeri.
 * Se aggiungi una serie durante l'allenamento, qui si vede che ne hai
 * aggiunta una: cosi' non ti scappa che stai allungando la scheda.
 */
export function notaSulNumeroSerie(c) {
  if (c.aggiunta) {
    return c.serieAggiunte === 1
      ? 'hai aggiunto 1 serie a quelle previste'
      : `hai aggiunto ${c.serieAggiunte} serie a quelle previste`;
  }
  if (c.tolta) {
    return c.serieTolte === 1
      ? 'questa volta hai fatto 1 serie in meno del previsto'
      : `questa volta hai fatto ${c.serieTolte} serie in meno del previsto`;
  }
  return '';
}

/** Quanti kg/ripetizioni in piu' o in meno, per dirlo con le parole. */
export function riassuntoVoce(c) {
  const pezzi = [];
  if (c.pesoCambiato) pezzi.push('pesi aggiornati');
  if (c.ripCambiate) pezzi.push('ripetizioni aggiornate');
  if (c.spotterCambiato) pezzi.push('spotter aggiornato');
  if (!pezzi.length) pezzi.push('serie da completare');
  return pezzi.join(' e ');
}