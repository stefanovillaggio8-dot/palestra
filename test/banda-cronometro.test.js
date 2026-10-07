// banda-cronometro.test.js -- "il coso con scritto 'allenamento iniziato alle',
// il tempo ecc, e' troppo grosso, fallo piu' piccolo quando scorro verso il basso"
// (Ste, 07/10/2026).
//
// Due cose da provare, e sono diverse.
// La prima e' la logica: quando scendi, la pagina deve dirlo al CSS aggiungendo
// una classe. Questa la provo premendo, e si vede nel DOM.
// La seconda e' l'aspetto: quanto diventa piccola la banda. Quella la decide il
// foglio di stile, quindi il test LEGGE il CSS e pretende dei numeri: altrimenti
// direbbe "funziona" anche se la regola sparisse.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, perClasse, trova } = await import('./dom-minimo.js');
const { app, body } = montaDom();
const { avvia } = await import('../src/app.js');
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const db = await import('../src/db.js');
const { apriSeduta } = await import('../src/sedute.js');
const { SCHEDA_ID } = await import('../src/dati-iniziali.js');

const CSS = readFileSync(new URL('../stile.css', import.meta.url), 'utf8');

async function attendiChe(condizione, tentativi = 80) {
  for (let i = 0; i < tentativi; i++) {
    if (condizione()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

/** scorre davvero: il DOM finto ha scrollY e i suoi ascoltatori */
async function scorridi(y) {
  globalThis.window.scrollTo(0, y);
  globalThis.window.dispatch('scroll');
  await new Promise((r) => setTimeout(r, 30));
}

let banda = null;

before(async () => {
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
  const v = (await db.tutti('versioni'))[0];
  const seduta = await apriSeduta({ scheda_id: SCHEDA_ID, versione: v, giorno: v.snapshot.giorni[0] });
  globalThis.window.location.hash = '#/seduta/' + seduta.id;
  await attendiChe(() => perClasse(app, 'banda-cronometro').length === 1);
  banda = perClasse(app, 'banda-cronometro')[0];
  // torna in cima: i test partono tutti dalla stessa parte
  await scorridi(0);
});

test('1. la banda col cronometro c\'e\' e con la scritta che ha citato Ste', () => {
  assert.ok(banda, 'la banda col cronometro deve esserci nella seduta');
  const testo = banda.textContent || '';
  assert.match(testo, /Allenamento iniziato alle/, 'la scritta "Allenamento iniziato alle"');
  assert.match(testo, /\d\d:\d\d/, 'e il tempo che passa');
});

test('2. all\'inizio NON e\' compatta (la pagina e\' in cima)', () => {
  assert.equal(body.classList.contains('scorso'), false,
    'in cima la banda deve stare com\'e\' era: si vede tutto, non serve stringere niente');
});

test('3. scendendo la pagina si segna "scorso" e salendo sparisce', async () => {
  await scorridi(300);
  assert.equal(body.classList.contains('scorso'), true,
    'scendendo la banda deve diventare piccola');
  await scorridi(0);
  assert.equal(body.classList.contains('scorso'), false,
    'tornando in su deve tornare com\'era, altrimento la prossima volta la trovi piccola e non sai perche\'');
});

test('4. un piccolo scorrimento NON la stringe (senn\' oscillerebbe a ogni dito)', async () => {
  await scorridi(10);
  assert.equal(body.classList.contains('scorso'), false,
    'dieci pixel non sono "sto scorrendo": la banda deve stare ferma');
  await scorridi(0);
});

test('5. la banda resta APPICCICATA anche compatta (deve poter cambiare esercizio scorrendo)', () => {
  const regola = /\.banda-cronometro\s*\{([^}]*)\}/.exec(CSS)[1];
  assert.match(regola, /position:\s*sticky/,
    'se non e\' sticky, scorrendo la banda sparisce e non serve piu\' stringerla');
});

/**
 * I rem dentro un pezzo di CSS.
 *
 * La regex accetta sia "3rem" sia "1.6rem" E ".5rem": la prima versione accettava
 * solo due di queste tre e, quando non tornava, restituiva null. E un null non
 * dice niente: il test cadeva con un errore suo ("non posso leggere la proprieta'
 * 1 di null") invece che con "questa regola non c'e' piu'". Un test che quando
 * sbaglia dice una cosa diversa da quella che voleva verificare e' un test che
 * ti fa perdere mezz'ora.
 */
function remDa(css, dove) {
  const m = /font-size:\s*(\d*\.?\d+)rem/.exec(css || '');
  assert.ok(m, `${dove}: non c'e' nessun font-size in rem (${JSON.stringify((css || '').trim())})`);
  return Number(m[1]);
}

test('6. compatta, spariscono i pezzi di testo e il cronometro si dimezza', () => {
  const compatta = [...CSS.matchAll(/body\.scorso\s+([^,{]+)\s*\{([^}]*)\}/g)];
  assert.ok(compatta.length >= 4,
    `le regole "body.scorso" sono ${compatta.length}: sotto devono restare cronometro, etichetta, totale e bottone`);
  const perSelettore = new Map(compatta.map((m) => [m[1].trim(), m[2]]));

  // l'etichetta "Allenamento iniziato alle" sparisce: e' la piu' grossa e quando
  // stai contando le ripetizioni non ti serve sapere che ore era
  assert.match(perSelettore.get('.etichetta-crono') || '', /display:\s*none/,
    'la scritta "Allenamento iniziato alle" deve sparire quando scendi');

  // idem la riga "Durata totale"
  const totale = [...perSelettore.entries()].find(([k]) => /totale-sedute/.test(k));
  assert.ok(totale, 'c\'e\' la regola che nasconde "Durata totale"');
  assert.match(totale[1], /display:\s*none/);

  // il cronometro scende sotto 1.4rem: Ste (07/10/2026) "fallo ancora piu'
  // piccolo" dopo la prima compressione, quindi il tetto e' piu' basso di quanto
  // avevo messo prima (1.7rem). Se si alza di nuovo, il test deve accorgersene.
  const compatto = remDa(perSelettore.get('.banda-cronometro .cronometro'), 'cronometro compatto');
  const normale = remDa(/\.cronometro\s*\{([^}]*)\}/.exec(CSS)[1], 'cronometro normale');
  assert.ok(compatto <= 1.4, `il cronometro compatto e\' ancora a ${compatto} rem: Ste l'ha chiesto piu\' piccolo`);
  assert.ok(compatto < normale,
    `compatto ${compatto} rem deve essere piu\' piccolo del normale ${normale} rem`);

  // e il bottone "Allenamento finito" resta comodo: e' quello che ti serve
  const bottone = perSelettore.get('.banda-cronometro .bot.grande');
  const minAltezza = Number(/min-height:\s*(\d+)px/.exec(bottone || '')[1]);
  assert.ok(minAltezza >= 40,
    `il bottone per finire l'allenamento scende a ${minAltezza} px: e\' quello che premi a fine seduta`);
});

test('7. anche sul telefono la banda compatta e\' piu\' piccola', () => {
  // sul telefono la banda e' gia\' una colonna (bottone sotto il cronometro): senza
  // questa regola, stringere sul telefono non cambierebbe niente e il test
  // passerebbe lo stesso dicendo che e\' fatto
  const blocchi = [...CSS.matchAll(/@media \(max-width: 430px\)\s*\{([\s\S]*?)\n\}/g)];
  let trovata = false;
  for (const [, dentro] of blocchi) {
    if (/body\.scorso\s+\.banda-cronometro\s+\.cronometro\s*\{[^}]*font-size/.test(dentro)) trovata = true;
  }
  assert.ok(trovata, 'manca la regola del cronometro compatto dentro i blocchi da telefono');
});