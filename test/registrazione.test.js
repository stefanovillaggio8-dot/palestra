import { test } from 'node:test';
import assert from 'node:assert/strict';

// Ste (06/10/2026): "se un amico apre il link vede Stefano. Deve chiedere il nome e
// diventare se stesso".
//
// Qui NON provo la funzione che decide (quella e' in nome-avvio.test.js): qui
// avvio l'app vera, su un telefono finto che ha fatto una cosa sola e semplice:
// aprire il link. Se l'amico non si ritrovasse con una scheda sua, vuota e senza le
// 35 kg di Stefano, qui lo vedrei.

// il telefono di un amico: nessuna memoria, nessuna scheda, e la URL del link
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
globalThis.window.location.search = '?n=Luca&k=aa11';
const { avvia } = await import('../src/app.js');
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const db = await import('../src/db.js');
const { costruisciSnapshot } = await import('../src/dati-iniziali.js');

test('R1. il link crea la scheda dell\'amico, non quella di Stefano', async () => {
  await avvia();

  const schede = await db.tutti('schede');
  const nomi = schede.map((s) => s.id);
  assert.deepEqual(nomi, ['scheda-aa11'],
    'deve esserci una scheda sola, quella di Luca: non anche quella di Ste');
  assert.equal((await db.prendi('schede', 'scheda-gym-3')), null,
    'la scheda di Stefano NON viene creata su un telefono che non e\' il suo');
});

test('R2. il nuovo amico vede solo giorno 1,2,3,4, senza nessun esercizio', async () => {
  const v=(await db.tutti('versioni'))[0];
  assert.equal(v.scheda_id,'scheda-aa11');
  assert.equal(v.snapshot.scheda_id,'scheda-aa11');
  const giorni=v.snapshot.giorni;
  assert.equal(giorni.length,4);
  assert.deepEqual(giorni.map(g=>g.nome),['giorno 1','giorno 2','giorno 3','giorno 4']);
  assert.deepEqual(giorni.map(g=>g.ordine),[1,2,3,4]);
  for(const g of giorni) assert.deepEqual(g.esercizi,[]);
  assert.deepEqual(giorni.map(g=>g.id),[
    'giorno-scheda-aa11-1','giorno-scheda-aa11-2',
    'giorno-scheda-aa11-3','giorno-scheda-aa11-4',
  ]);
});

test('R3. nessun peso, ripetizione, esercizio o nota personale di Stefano arriva col link', async () => {
  const v=(await db.tutti('versioni'))[0];
  assert.equal(v.snapshot.giorni.flatMap(g=>g.esercizi).length,0);
  assert.equal((await db.tutti('sedute')).length,0);
  assert.equal((await db.tutti('serie')).length,0);
  const payload=JSON.stringify(v.snapshot);
  assert.doesNotMatch(payload,/ex-chest-press|ex-scott-bench-curl|es-1-1|"peso"|"ripetizioni"|"nota"/);
  const mia=costruisciSnapshot({conSerie:true});
  assert.ok(mia.giorni.some(g=>g.esercizi.length>0),
    'l esercizio e il peso di Stefano devono restare nella sua scheda originale');
});

test('R4. le schede create da nuovi inviti sono realmente indipendenti', async () => {
  const v=(await db.tutti('versioni'))[0];
  const mia=costruisciSnapshot({conSerie:true});
  assert.notEqual(v.snapshot.scheda_id,mia.scheda_id);
  assert.notDeepEqual(v.snapshot.giorni.map(g=>g.id),mia.giorni.map(g=>g.id));
  assert.equal(v.snapshot.giorni.flatMap(g=>g.esercizi).length,0);
  assert.ok(mia.giorni.flatMap(g=>g.esercizi).length>0);
});

test('R5. l\'app si apre sulla sua scheda e non gli mostra la mia', async () => {
  const testo = app.textContent || '';
  assert.match(testo, /Palestra di Luca/, 'il titolo e\' della sua scheda, col suo nome');
  assert.match(testo, /Luca/, 'il suo nome si vede: deve sapere di chi e\' la scheda');
  // i titoli degli altri non devono comparire: "Palestra A" e' la scheda di Andrea,
  // "gym 3" e' il nome vecchio di quella di Ste
  assert.doesNotMatch(testo, /Palestra A/, 'la scheda di Andrea non deve comparire su quella di Luca');
  assert.doesNotMatch(testo, /gym 3/i, 'e nemmeno il nome vecchio della scheda di Ste');
});

test('R6. il nome non viene chiesto due volte sullo stesso telefono', async () => {
  // il link resta nella URL, ma anche senza link la memoria del dispositivo deve
  // ricordare chi è: riaprire l'app non può rimandare a una domanda già fatta
  globalThis.window.location.search = '';
  const { avvia: rilancia } = await import('../src/app.js');
  await rilancia();
  const schede = await db.tutti('schede');
  assert.deepEqual(schede.map((s) => s.id), ['scheda-aa11'],
    'la memoria del dispositivo ha tenuto: nessuna scheda nuova, nessuna domanda');
  assert.match(app.textContent || '', /Luca/);
});