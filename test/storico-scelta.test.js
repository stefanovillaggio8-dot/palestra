// storico-scelta.test.js -- "fai un bottone anche che mi fa selezionare nello
// storico le sedute da eliminare" (Ste, 07/10/2026).
//
// Prima si eliminava una seduta SOLO aprendola e cercando il bottone in fondo.
// Con trenta sedute da ripulire era un lavoro. Qui si sceglie dalla lista e si
// elimina tutto insieme.
//
// Attenzione a una cosa che sembra un dettaglio e non lo e': in modalita' scelta
// la riga NON deve essere un link. Un link che contiene la spunta fa due cose con
// un tocco solo (seleziona E apre la seduta), e su un tocco lento da sdraio
// quello che capita e' che finisci nella pagina sbagliata. Qui il test lo blocca.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, pulsante, pulsanti, perClasse, perTesto, trova } = await import('./dom-minimo.js');
const { app } = montaDom();
const { avvia } = await import('../src/app.js');
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const db = await import('../src/db.js');
const { apriSeduta, chiudiSeduta } = await import('../src/sedute.js');
const { SCHEDA_ID } = await import('../src/dati-iniziali.js');

async function attendiChe(condizione, tentativi = 80) {
  for (let i = 0; i < tentativi; i++) {
    if (condizione()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

async function vai(rotta, condizione) {
  globalThis.window.location.hash = rotta;
  if (condizione) await attendiChe(condizione);
  await new Promise((r) => setTimeout(r, 60));
  return app.textContent || '';
}

function bottoneCon(scope, testo) {
  return trova(scope, (n) => n.tagName === 'BUTTON' && (n.textContent || '').includes(testo))[0] || null;
}

let sedute = [];

before(async () => {
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
  const v = (await db.tutti('versioni'))[0];
  // tre sedute chiuse in tre giorni diversi: cosi' l'elenco ha piu' di una riga
  for (let g = 0; g < 3; g++) {
    const data = new Date(Date.now() - g * 86400000).toISOString().slice(0, 10);
    const seduta = await apriSeduta({
      scheda_id: SCHEDA_ID, versione: v, giorno: v.snapshot.giorni[0], data,
    });
    const serie = await db.perIndice('serie', 'seduta_id', seduta.id);
    await db.salva('serie', { ...serie[0], peso: 40, ripetizioni: 8, stato: 'fatta' });
    await chiudiSeduta(seduta.id);
  }
  await avvia();
  sedute = (await db.tutti('sedute'))
    .filter((s) => s.stato === 'completata' && !s.eliminata)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
});

test('S1. nello storico c\'e\' il bottone per scegliere le sedute da eliminare', async () => {
  await vai('#/storico', () => perClasse(app, 'riga-seduta').length > 0);
  assert.ok(bottoneCon(app, 'Scegli sedute da eliminare'),
    'il bottone deve stare in cima alla lista, non in fondo: se e\' in fondo e\' la stessa impresa di prima');
});

test('S2. le righe sono link e si aprono (comportamento normale)', async () => {
  await vai('#/storico', () => perClasse(app, 'riga-seduta').length > 0);
  const righe = perClasse(app, 'riga-seduta');
  assert.ok(righe.length >= 3, 'ci sono almeno tre sedute da scegliere');
  for (const r of righe) {
    assert.equal(r.tagName, 'A', 'fuori dalla modalita\' scelta la riga deve restare un link');
    assert.match(r.attributi.href, /#\/storico\//, 'e deve portare alla seduta');
  }
});

test('S3. premendo il bottone, le righe diventano scelte e NON link', async () => {
  await vai('#/storico', () => perClasse(app, 'riga-seduta').length > 0);
  bottoneCon(app, 'Scegli sedute da eliminare').clickNonAspettando();
  await attendiChe(() => perClasse(app, 'riga-scelta').length > 0);

  const righe = perClasse(app, 'riga-scelta');
  assert.ok(righe.length >= 3, 'tutte le sedute si possono scegliere');
  for (const r of righe) {
    assert.equal(r.tagName, 'BUTTON',
      'in modalita\' scelta la riga NON deve essere un link: un tocco solo non fa due cose');
    assert.equal(r.attributi['aria-pressed'], 'false', 'e parte non scelta');
    assert.equal(perClasse(r, 'spunta-scelta').length, 1, 'la riga ha la sua spunta');
  }
});

test('S4. toccando due righe, il conteggio dice "2 sedute scelte"', async () => {
  await vai('#/storico', () => perClasse(app, 'riga-scelta').length > 0);
  // Ogni tocco ridisegna la schermata, quindi NON posso tenere le righe in mano:
  // dopo il primo tocco quelle che avevo sono nodi staccati, e premere un nodo
  // staccato non fa niente. Le riprendo ogni volta (e' la stessa trappola in cui
  // si casca coi test, quindi la lascio scritta).
  perClasse(app, 'riga-scelta')[0].clickNonAspettando();
  await attendiChe(() => perClasse(app, 'riga-scelta').filter((r) => r.classList.contains('scelta')).length === 1);
  perClasse(app, 'riga-scelta')[1].clickNonAspettando();
  await attendiChe(() => perClasse(app, 'riga-scelta').filter((r) => r.classList.contains('scelta')).length === 2);

  assert.match(app.textContent || '', /2 sedute scelte/,
    'il conteggio deve dirti quante ne hai scelte');
});

test('S5. toccando una riga gia\' scelta, la deselezioni (non si accavalla)', async () => {
  const prima = perClasse(app, 'riga-scelta').filter((r) => r.classList.contains('scelta'));
  assert.equal(prima.length, 2, 'parto da due scelte');
  prima[0].clickNonAspettando();
  await attendiChe(() => perClasse(app, 'riga-scelta').filter((r) => r.classList.contains('scelta')).length === 1);
  assert.match(app.textContent || '', /1 seduta scelta/, 'e il conteggio scende a uno (al singolare)');
});

test('S6. "Elimina scelte" chiede conferma e nel cestino ci vanno le sedute E le loro serie', async () => {
  const scelte = perClasse(app, 'riga-scelta').filter((r) => r.classList.contains('scelta'));
  assert.equal(scelte.length, 1, 'una sola seduta scelta');
  // prendo l'id dalla riga (dati.sedutaId) e non dalla data scritta a schermo:
  // la data cambia appena e finiresti per eliminare la seduta sbagliata, che è
  // il peggio che possa capitare qui
  const idScelta = scelte[0].dataset.sedutaId;
  assert.ok(idScelta, 'la riga scelta deve dire qual è la seduta');
  const serieDellaScelta = (await db.perIndice('serie', 'seduta_id', idScelta))
    .filter((x) => !x.eliminata);
  assert.ok(serieDellaScelta.length > 0, 'la seduta aveva delle serie');

  // "Elimina scelte" chiede conferma con il dialogo fatto in casa (chiediConferma),
  // quindi devo premere il suo pulsante: qui non basta globalThis.confirm, perché
  // quello è solo per i confirm di sistema e l'app non li usa
  bottoneCon(app, 'Elimina scelte').clickNonAspettando();
  // attendiChe risponde vero/falso, quindi il pulsante lo recupero DOPO
  const trovato = await attendiChe(() => !!bottoneCon(globalThis.document.body, 'Nel cestino'));
  assert.ok(trovato, 'prima di eliminare deve chiedere conferma: sono dati tuoi');
  bottoneCon(globalThis.document.body, 'Nel cestino').clickNonAspettando();
  await new Promise((r) => setTimeout(r, 400));

  // leggo INCLUSE le righe nel cestino: prendi() sulle righe eliminate non le
  // vede (e' cosi' di proposito, sono "cancellate"), quindi con prendi() avrei
  // verificato sempre "non esiste" senza mai guardare il flag
  const seduteCestino = await db.tutti('sedute', { includiEliminati: true });
  const seduta = seduteCestino.find((s) => s.id === idScelta);
  assert.ok(seduta, 'la seduta esiste ancora: va nel cestino, non viene distrutta');
  assert.equal(seduta.eliminata, true, 'la seduta scelta deve essere nel cestino');
  assert.ok(seduta.eliminata_il, 'e con la data in cui l\'ho messa');
  assert.ok(serieDellaScelta.length > 0, 'la seduta aveva delle serie');
  const serieCestino = await db.tutti('serie', { includiEliminati: true });
  for (const serie of serieDellaScelta) {
    const dopo = serieCestino.find((x) => x.id === serie.id);
    assert.ok(dopo, `la serie ${serie.id} non deve sparire, deve andare nel cestino`);
    assert.equal(dopo.eliminata, true, `anche la serie ${serie.id} deve andare nel cestino`);
  }
});

test('S7. dopo l\'eliminazione la modalita\' si chiude e la lista non mostra piu\' la seduta', async () => {
  await attendiChe(() => perClasse(app, 'riga-seduta').length > 0);
  assert.equal(perClasse(app, 'riga-scelta').length, 0,
    'la modalita\' scelta deve chiudersi da sola dopo l\'eliminazione');
  assert.ok(bottoneCon(app, 'Scegli sedute da eliminare'), 'e il bottone torna com\'era');
  const rimaste = perClasse(app, 'riga-seduta').length;
  assert.equal(rimaste, sedute.length - 1, 'la lista ha una riga in meno');
});

test('S8. "Annulla" chiude la modalita\' senza toccare niente', async () => {
  await vai('#/storico', () => perClasse(app, 'riga-seduta').length > 0);
  const prima = (await db.tutti('sedute')).filter((s) => s.stato === 'completata' && !s.eliminata).length;

  bottoneCon(app, 'Scegli sedute da eliminare').clickNonAspettando();
  await attendiChe(() => perClasse(app, 'riga-scelta').length > 0);
  perClasse(app, 'riga-scelta')[0].clickNonAspettando();
  await attendiChe(() => perClasse(app, 'riga-scelta')[0].classList.contains('scelta'));

  bottoneCon(app, 'Annulla').clickNonAspettando();
  await attendiChe(() => perClasse(app, 'riga-scelta').length === 0);
  const dopo = (await db.tutti('sedute')).filter((s) => s.stato === 'completata' && !s.eliminata).length;
  assert.equal(dopo, prima, 'annullando non deve sparire niente');
});

test('S9. il pulsante c\'e\' anche senza sedute (con un avviso, non un errore)', async () => {
  for (const s of sedute) {
    await db.cestino('sedute', s.id);
    for (const serie of await db.perIndice('serie', 'seduta_id', s.id)) await db.cestino('serie', serie.id);
  }
  await avvia();
  const testo = await vai('#/storico', () => app.textContent.includes('Nessuna seduta'));
  assert.match(testo, /Nessuna seduta registrata/);
  assert.deepEqual(errori, [], 'nessun errore a schermo vuoto');
});

const errori = [];
process.on('uncaughtException', (e) => errori.push('uncaught: ' + e.message));
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message ? e.message : String(e))));