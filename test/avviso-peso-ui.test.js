// avviso-peso-ui.test.js -- l'avviso "Questo vale per 66 kg" VISTO A SCHERMO.
//
// In avviso-peso.test.js ho provato la funzione. Qui la provo premendo: avvio
// l'app, registro un peso vecchio e una serie, apro la pagina dell'esercizio e
// guardo cosa c'e' scritto. Serve per una cosa precisa: la pagina dell'esercizio
// ora LEGGE il peso (quindi aspetta il database), e se quella lettura va storta
// la pagina non si disegna piu'. Un avviso che non compare e' una sciagura, ma
// una pagina che sparisce e' di peggio.

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

const { montaDom, perClasse } = await import('./dom-minimo.js');
const { app } = montaDom();
const { avvia } = await import('../src/app.js');
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const db = await import('../src/db.js');
const peso = await import('../src/peso-corporeo.js');
const { apriSeduta, chiudiSeduta } = await import('../src/sedute.js');
const { SCHEDA_ID, PERSONE, accountId } = await import('../src/dati-iniziali.js');
// l'app guarda il peso del profilo con cui sta girando: qui e' quello di Stefano
const ACCOUNT = accountId(PERSONE.find((p) => p.predefinita).id);

const errori = [];
globalThis.__erroriClick = [];
process.on('uncaughtException', (e) => errori.push('uncaught: ' + e.message));
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message ? e.message : String(e))));

async function attendiChe(condizione, tentativi = 80) {
  for (let i = 0; i < tentativi; i++) {
    if (condizione()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

async function vai(rotta) {
  globalThis.window.location.hash = rotta;
  await new Promise((r) => setTimeout(r, 40));
  await attendiChe(() => true);
  await new Promise((r) => setTimeout(r, 60));
  return app.textContent || '';
}

before(async () => {
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
  // un peso di 66 kg messo 40 giorni fa: il caso che l'avviso descrive
  const data = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
  await peso.segnaPeso(66, { data, account: ACCOUNT });
  // e una serie fatta sul primo esercizio della scheda, cosi' c'e' un Rank.
  //
  // IL CARICO E' 37 KG E NON 25, e il motivo e' questo test.
  // L'avviso ha TRE righe quando sei dentro la scala: il peso registrato, a che
  // peso tocchi il livello dopo, a che peso lo perdi. La terza riga (da quanto in
  // giu' scendi sotto la fascia che hai) esiste SOLO se sei dentro la scala, cioe'
  // se hai gia' un Rank. Con 25 kg x 8 su un corpo da 66 kg sei sotto l'ingresso
  // (29,7 kg): nessun Rank, e l'app dice giustamente "per sbloccare il primo
  // livello", NON "lo perdi". Il test metteva 25 e pretendeva "lo perdi": stava
  // chiedendo una frase che in quel caso non deve esistere.
  //
  // 37 kg x 8 e' il carico vero di Ste e dà SILVER 72%: dentro la scala, con un
  // tetto sopra (il livello dopo) e un pavimento sotto (la fascia che hai). E'
  // il caso che l'avviso descrive.
  const v = (await db.tutti('versioni'))[0];
  const giorno = v.snapshot.giorni[0];
  const seduta = await apriSeduta({ scheda_id: SCHEDA_ID, versione: v, giorno });
  const serie = await db.perIndice('serie', 'seduta_id', seduta.id);
  await db.salva('serie', { ...serie[0], peso: 37, ripetizioni: 8, stato: 'fatta' });
  await chiudiSeduta(seduta.id);
  // riapro l'app: e' quello che fa Ste quando torna sulla pagina dell'esercizio,
  // e serve perche' la serie l'ho scritta nel database alle spalle dell'app (che
  // in memoria non la vede). Senza questo riavvio l'avviso non avrebbe niente da
  // valutare e il test passerebbe buggerato dicendo "non c'e' l'avviso".
  await avvia();
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
});

test('1. la pagina dell\'esercizio si disegna e mostra l\'avviso col peso del database', async () => {
  const v = (await db.tutti('versioni'))[0];
  const esercizio = v.snapshot.giorni[0].esercizi[0].esercizio_id;
  const testo = await vai('#/esercizio/' + esercizio);
  // la pagina c'e' tutta: se l'avviso avesse rotto la lettura del peso, di qui
  // non sarebbe uscito niente
  assert.match(testo, /Torna ai Rank/, 'la pagina dell\'esercizio si e\' disegnata');
  assert.match(testo, /PERCHE/, 'e c\'e\' il resto del giudizio');
  // e l'avviso c'e', con il numero che viene dal database
  assert.match(testo, /Questo vale per 66 kg\./, 'l\'avviso c\'e\' con il peso registrato');
  assert.match(testo, /tocchi il livello dopo/, 'e dice a che peso sali');
  assert.match(testo, /lo perdi/, 'e a che peso perdi');
  assert.deepEqual(errori, [], 'nessun errore mentre si disegna');
});

test('2. l\'avviso sta vicino alla riga delle soglie, non nascosto in fondo', async () => {
  const v = (await db.tutti('versioni'))[0];
  const esercizio = v.snapshot.giorni[0].esercizi[0].esercizio_id;
  globalThis.window.location.hash = '#/esercizio/' + esercizio;
  await new Promise((r) => setTimeout(r, 120));
  const testoSchermata = (app.textContent || '');
  const iSoglie = testoSchermata.indexOf('Soglie:');
  const iAvviso = testoSchermata.indexOf('Questo vale per');
  assert.ok(iSoglie >= 0, 'c\'e\' la riga delle soglie');
  assert.ok(iAvviso > iSoglie,
    'l\'avviso viene DOPO le soglie, che sono la cosa a cui si riferisce');
  assert.ok(iAvviso - iSoglie < 400, 'e subito dopo, non due schermate piu\' in giu\'');
});

test('3. se il peso non c\'e\' la pagina non si rompe (niente avviso, niente errore)', async () => {
  for (const p of await peso.pesiCronologici(ACCOUNT)) await peso.togliPeso(p.id);
  const v = (await db.tutti('versioni'))[0];
  const esercizio = v.snapshot.giorni[0].esercizi[0].esercizio_id;
  // torno a casa e poi riapro l'esercizio: se resto sulla stessa rotta la pagina
  // non si ridisegna (l'indirizzo non cambia) e guarderei il testo di prima
  await vai('#/');
  const testo = await vai('#/esercizio/' + esercizio);
  assert.match(testo, /Torna ai Rank/, 'la pagina c\'e\' anche senza peso');
  assert.doesNotMatch(testo, /Questo vale per/, 'e l\'avviso non parla di un peso che non c\'e\'');
  assert.deepEqual(errori, [], 'nessun errore');
});