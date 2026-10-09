// annunci-automatici.test.js -- la fine seduta e il cambio peso devono dire
// qualcosa di vero, da soli.
//
// Ste (08/10/2026): "le sbarre del lp sono buggate", "di smith machine io faccio 32kg.
// i rank devono aggiornare i pesi, sistema appena finisci" e "tutto quanto deve
// farsi automaticamente".
//
// Qui non si prova il disegno a schermo (quello lo fa interfaccia.test.js
// premendo i pulsanti), ma la PARTE CHE DECIDE cosa dire. E' quella che puo'
// sbagliare in silenzio: un avviso che non arriva non fa rumore, e un avviso che
// dice una cosa falsa fa piu' danno di uno che non c'e'.
//
// Le tre regole che devono valere, e che sono le stesse per entrambi i momenti:
//
//  1) si dice SOLO quello che e' successo davvero. Niente complimenti a vuoto.
//  2) si dice il NOME del Rank, non "i Rank sono aggiornati".
//  3) se non e' successo niente, si dice che non e' successo niente (o non si dice
//     nulla alla fine seduta): mai far finta che sia andata bene una seduta in cui
//     non hai migliorato niente.

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

const { montaDom } = await import('./dom-minimo.js');
const { app } = montaDom();
const { avvia } = await import('../src/app.js');
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const db = await import('../src/db.js');
const peso = await import('../src/peso-corporeo.js');
const { ESERCIZI, SCHEDA_ID, PERSONE, accountId } = await import('../src/dati-iniziali.js');
const ACCOUNT = accountId(PERSONE.find((p) => p.predefinita).id);
const { mappaRank, annunciaFineSeduta, annunciaCambioPeso } = await import('../src/app.js');

const chest = ESERCIZI.find((e) => /chest press/i.test(e.nome));
const smith = ESERCIZI.find((e) => /smith/i.test(e.nome));

/** Gli avvisi che sono comparsi a schermo, in ordine. */
function avvisi() {
  return Array.from(app.querySelectorAll ? app.querySelectorAll('.avviso') : []);
}

/** Il testo di tutti gli avvisi presenti, insieme. */
function testoAvvisi() {
  return (app.textContent || '');
}

async function attendiChe(condizione, tentativi = 80) {
  for (let i = 0; i < tentativi; i++) {
    if (condizione()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

before(async () => {
  await attendiChe(() => (app.textContent || '').length > 0, 120);
});

test('A1. la mappa dei Rank ha un esercizio per ogni serie registrata', async () => {
  // Il presupposto di tutto: se la mappa e' vuota, i confronti non trovano niente e
  // l'app non annuncerebbe MAI niente, senza dare un errore. E' il difetto peggiore
  // di tutti perche' e' silenzioso.
  const serie = [
    { id: 'x1', seduta_id: 's1', esercizio_id: chest.id, peso: 37, ripetizioni: 8, stato: 'fatta' },
  ];
  const sedute = [{ id: 's1', data: '2026-10-08', stato: 'completata', eliminata: false }];
  const m = mappaRank([chest], serie, sedute, 66);
  assert.ok(m.size >= 1, `la mappa deve avere almeno un esercizio, ne ha ${m.size}`);
  const voce = m.get(chest.id);
  assert.ok(voce, 'deve esserci la voce della chest press');
  assert.ok(voce.nome && voce.nome.length > 0, 'la voce deve avere il nome del Rank');
  assert.equal(typeof voce.indice, 'number', 'e un indice numerico: serve a capire se e\' salito');
  assert.equal(typeof voce.punteggio, 'number', 'e il punteggio: serve a capire se e\' un record');
});

test('A2. a fine seduta dice il NOME del Rank quando sali', () => {
  // il caso vero: prima SILVER, dopo GOLD. Deve dire "SILVER" e "GOLD", non
  // "i tuoi Rank sono stati aggiornati".
  const prima = new Map([[chest.id, { nome: 'SILVER', indice: 1, lp: 40, punteggio: 40 }]]);
  const dopo = new Map([[chest.id, { nome: 'GOLD', indice: 2, lp: 20, punteggio: 46 }]]);
  const nodo = annunciaFineSeduta(prima, dopo);
  const testo = (nodo && nodo.textContent) || '';
  assert.match(testo, /SILVER/, 'deve dire da dove sei partito');
  assert.match(testo, /GOLD/, 'e dove sei arrivato');
  assert.match(testo, /salito/i, 'e che sei salito');
  assert.doesNotMatch(testo, /aggiornati/, 'NON il messaggio generico di prima: non dice niente');
});

test('A3. a fine seduta NON dice niente se non e\' successo niente', () => {
  // La regola che rende l'avviso credibile. Se dicesse sempre qualcosa, dopo tre
  // settimane non lo guarderesti piu', e anche quando avresti davvero salito di fascia
  // non lo vedresti.
  const m = new Map([[chest.id, { nome: 'SILVER', indice: 1, lp: 40, punteggio: 40 }]]);
  const uguale = new Map([[chest.id, { nome: 'SILVER', indice: 1, lp: 40, punteggio: 40 }]]);
  assert.equal(annunciaFineSeduta(m, uguale), null,
    'niente e\' cambiato: nessun avviso, e non un avviso vuoto');
});

test('A4. a fine seduta dice il record battuto, senza dire che sei salito', () => {
  // Stessa fascia, ma il numero e' migliore: e' un record, non una promozione.
  // Dire "sei salito" qui sarebbe falso.
  const prima = new Map([[chest.id, { nome: 'SILVER', indice: 1, lp: 40, punteggio: 40 }]]);
  const dopo = new Map([[chest.id, { nome: 'SILVER', indice: 1, lp: 55, punteggio: 44 }]]);
  const nodo = annunciaFineSeduta(prima, dopo);
  const testo = (nodo && nodo.textContent) || '';
  assert.match(testo, /record/i, 'deve dire che e\' un record');
  assert.doesNotMatch(testo, /Sei salito/i, 'e NON che sei salito: sei nella stessa fascia');
});

test('A5. il cambio di peso dice QUANTO e\' cambiato, non "sono aggiornati"', () => {
  // Ste: "i rank devono aggiornare i pesi". Il messaggio di prima era "Peso salvato:
  // 68 kg. I Rank sono aggiornati", che non dice niente di verificabile.
  const prima = new Map([[chest.id, { nome: 'SILVER', indice: 1, lp: 40, punteggio: 44 }]]);
  const dopo = new Map([[chest.id, { nome: 'GOLD', indice: 2, lp: 10, punteggio: 44 }]]);
  const nodo = annunciaCambioPeso(prima, dopo, 68);
  const testo = (nodo && nodo.textContent) || '';
  assert.match(testo, /68/, 'deve dire il peso nuovo');
  assert.match(testo, /SILVER/, 'e il Rank di prima');
  assert.match(testo, /GOLD/, 'e quello di dopo: il punto e\' questo');
  assert.doesNotMatch(testo, /aggiornati/i, 'NON la promessa generica');
});

test('A6. il cambio di peso dice anche quando SEI SCESO', () => {
  // Il caso scomodo, e il piu' importante: se ti pesa di piu' puoi scendere di
  // fascia, e dirlo e' l'unico modo di non pensare che sia un bug. Una versione
  // che dice solo "Sei salito" sarebbe una versione che mente metta' delle volte.
  const prima = new Map([[chest.id, { nome: 'GOLD', indice: 2, lp: 30, punteggio: 44 }]]);
  const dopo = new Map([[chest.id, { nome: 'SILVER', indice: 1, lp: 70, punteggio: 44 }]]);
  const nodo = annunciaCambioPeso(prima, dopo, 70);
  const testo = (nodo && nodo.textContent) || '';
  assert.match(testo, /sceso/i, 'deve dire che sei sceso');
  assert.match(testo, /GOLD/, 'e da dove');
  assert.match(testo, /SILVER/, 'e dove sei arrivato');
  assert.doesNotMatch(testo, /salito/i, 'e NON che sei salito: sarebbe falso');
});

test('A7. se il peso non cambia nessun Rank, lo dice e basta', () => {
  // Il caso normale, e il piu' frequente: ti pesi, il peso non sposta niente, e il
  // messaggio deve essere quello e non un elenco di nomi inventato.
  const m = new Map([[chest.id, { nome: 'SILVER', indice: 1, lp: 40, punteggio: 44 }]]);
  const uguale = new Map([[chest.id, { nome: 'SILVER', indice: 1, lp: 40, punteggio: 44 }]]);
  const nodo = annunciaCambioPeso(m, uguale, 66);
  const testo = (nodo && nodo.textContent) || '';
  assert.match(testo, /66/, 'deve comunque dire il peso salvato');
  assert.match(testo, /nessun rank cambia/i,
    'e dire chiaramente che nessun Rank e\' cambiato');
});

test('A8. il peso NON cambia il punteggio, solo la scala', () => {
  // Il presupposto che rende sensato tutto: se il peso cambiasse anche il punteggio,
  // i confronti sopra misurerebbero la cosa sbagliata. Il punteggio dipende SOLO
  // dai kg e dalle ripetizioni che hai scritto; il peso sposta le soglie.
  const serie = [{ id: 'x1', seduta_id: 's1', esercizio_id: chest.id, peso: 37, ripetizioni: 8, stato: 'fatta' }];
  const sedute = [{ id: 's1', data: '2026-10-08', stato: 'completata', eliminata: false }];
  const leggero = mappaRank([chest], serie, sedute, 60);
  const pesante = mappaRank([chest], serie, sedute, 75);
  assert.equal(leggero.get(chest.id).punteggio, pesante.get(chest.id).punteggio,
    'la prestazione e\' la stessa: cambia la scala, non il numero che hai fatto');
});