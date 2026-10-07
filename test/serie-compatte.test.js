// serie-compatte.test.js -- due richieste di Ste del 07/10/2026.
//
//  1) "rendilo piu' piccolo e meno ingombrante, tipo di quelle dimensioni"
//     (con la foto di un'altra app come riferimento)
//  2) "non c'e' spotter, e comunque non esiste ancora il pulsante dropset che ti
//     avevo detto tempo fa"
//
// Qui non guardo se la riga "c'e'": guardo due cose diverse.
// La prima e' verificabile solo dal CSS (l'altezza la decide il foglio di stile),
// quindi il test lo LEGGE e pretende dei numeri. La seconda la premio davvero.

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

const { montaDom, pulsante, perClasse, perTesto, trova } = await import('./dom-minimo.js');
const { app } = montaDom();
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

/** il numero in px di una regola CSS, se c'è: `width: 40px` dentro `.bottone-spunta` */
function pxDi(selettore, proprieta) {
  const regola = new RegExp(selettore.replace(/\./g, '\\.') + '\\s*\\{([^}]*)\\}').exec(CSS);
  assert.ok(regola, `il CSS non ha la regola ${selettore}`);
  const m = new RegExp(proprieta + '\\s*:\\s*(\\d+(?:\\.\\d+)?)px').exec(regola[1]);
  assert.ok(m, `${selettore} non ha ${proprieta} in px`);
  return Number(m[1]);
}

/**
 * Il bottone che CONTIENE un testo, dentro uno scope.
 *
 * Serve `Dropset` e non `✓ Dropset`: il pulsante cambia faccia quando lo premi, e
 * un test che cerca la parola esatta troverebbe il pulsante spento e direbbe che
 * quello acceso non c'è. Sarebbe un test che passa mentre la cosa e' sbagliata.
 */
function bottoneCon(scope, testo) {
  return trova(scope, (n) => n.tagName === 'BUTTON' && (n.textContent || '').includes(testo))[0] || null;
}

/** la riga serie col dropset acceso, se c'è */
function rigaConDropsetAcceso() {
  return righeSerie().find((r) => {
    const b = bottoneCon(r, 'Dropset');
    return b && b.classList.contains('attivo');
  }) || null;
}

let sedutaId = null;

before(async () => {
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
  const v = (await db.tutti('versioni'))[0];
  const giorno = v.snapshot.giorni[0];
  const seduta = await apriSeduta({ scheda_id: SCHEDA_ID, versione: v, giorno });
  sedutaId = seduta.id;
  globalThis.window.location.hash = '#/seduta/' + seduta.id;
  await attendiChe(() => perClasse(app, 'riga-serie').length > 0);
});

// ---------------------------------------------------------------------------
// 1) LE RIGHE COMPATTE
// ---------------------------------------------------------------------------

test('1. la spunta e\' piu\' piccola di com\'era (era 46 px)', () => {
  const lato = pxDi('.bottone-spunta', 'width');
  assert.ok(lato <= 40, `la spunta e\' ancora ingombrante: ${lato} px`);
  assert.ok(lato >= 40, `ma non puo\' scendere sotto i 40 px, altrimenti il dito la sbaglia: ${lato} px`);
});

test('2. i campi dei numeri sono compatti (erano larghi 78 px e alti 46)', () => {
  const larghezza = pxDi('.campo-num', 'width');
  const altezza = pxDi('.campo-num, .campo-testo', 'min-height');
  assert.ok(larghezza <= 70, `il campo dei kg e\' ancora largo: ${larghezza} px`);
  assert.ok(altezza <= 40, `il campo e\' ancora alto: ${altezza} px`);
});

test('3. il numero della serie e\' un badge piccolo, non un mattone (era 30x46)', () => {
  const larghezza = pxDi('.numero-serie', 'width');
  const altezza = pxDi('.numero-serie', 'height');
  assert.ok(altezza <= 36, `il numero e\' ancora un mattone: ${altezza} px`);
  assert.ok(larghezza <= 28, `e largo ${larghezza} px`);
});

test('4. il confronto "prima: 40 kg x 8" NON occupa piu\' una riga tutta sua', () => {
  // nella riga serie deve stare in coda ai numeri. La stessa classe altrove
  // (classifica fra amici) invece ha bisogno della scatoletta: quindi la regola
  // compatta deve essere valida SOLO dentro .riga-serie, e questo test lo impedisce
  assert.ok(/\.riga-serie \.riga-confronto\s*\{[^}]*width:\s*auto/.test(CSS),
    'il confronto dentro la riga serie deve poter stare in coda ai numeri');
  assert.ok(/\.riga-confronto\s*\{[^}]*width:\s*100%/.test(CSS),
    'la regola generale deve restare per gli altri posti che usano la classe');
});

test('5. i pulsanti secondari restano ma sono stretti (40 px, non spariti)', () => {
  const minAltezza = pxDi('.riga-serie .bot.piccolo-b', 'min-height');
  assert.equal(minAltezza, 40, 'nota ed elimina devono restare 40 px: si premono col dito');
});

// ---------------------------------------------------------------------------
// 2) IL PULSANTE DROPSET (quello che mancava proprio)
// ---------------------------------------------------------------------------

function righeSerie() {
  return perClasse(app, 'riga-serie');
}

test('6. ogni riga serie ha il pulsante dello spotter e quello del dropset', () => {
  const righe = righeSerie();
  assert.ok(righe.length > 0, 'ci sono righe serie da guardare');
  for (const riga of righe) {
    assert.ok(bottoneCon(riga, 'Spotter'),
      'manca il pulsante dello spotter nella riga: ' + (riga.attributi['data-serie-id'] || '?'));
    assert.ok(bottoneCon(riga, 'Dropset'),
      'manca il pulsante del dropset nella riga: ' + (riga.attributi['data-serie-id'] || '?'));
  }
});

test('7. il dropset parte SPENTO e non occupa spazio (i tre giri sono dietro)', () => {
  const righe = righeSerie();
  assert.equal(perClasse(app, 'dropset').length, 0,
    'prima di accenderlo non deve comparire nessun campo giri');
  for (const riga of righe) {
    const b = bottoneCon(riga, 'Dropset');
    assert.ok(!b.classList.contains('attivo'),
      'il pulsante non deve partire gia\' acceso: il dropset e\' una tecnica, non un dato');
  }
});

test('8. PREMENDO il dropset si accende e compaiono i tre giri', async () => {
  const riga = righeSerie()[0];
  const idSerie = riga.attributi['data-serie-id'];
  bottoneCon(riga, 'Dropset').clickNonAspettando();
  await attendiChe(() => perClasse(app, 'dropset').length > 0);

  const blocco = perClasse(app, 'dropset')[0];
  const giri = perClasse(blocco, 'riga-dropset');
  assert.equal(giri.length, 3, 'i giri sono tre: la serie e\' piu\' 3, come aveva chiesto Ste');
  const numeri = giri.map((g) => {
    const etichetta = perTesto(g, 'giro 2')[0] || perTesto(g, 'giro 3')[0] || perTesto(g, 'giro 4')[0];
    return etichetta ? etichetta.textContent.trim() : '?';
  });
  assert.deepEqual(numeri, ['giro 2', 'giro 3', 'giro 4'], 'i giri si chiamano giro 2, 3 e 4');
  assert.equal(perClasse(giri[0], 'campo-num').length, 2, 'e ognuno ha i suoi due campi');

  // ed e' SALVATO, non solo disegnato: se il pulsante accende la luce e basta,
  // chiudendo l'app il dropset sparisce
  const salvata = await db.prendi('serie', idSerie);
  assert.equal(salvata.dropset, true, 'il dropset deve restare salvato sul serio');
});

test('9. i giri del dropset si possono riempire e il giro si salva', async () => {
  const rigaConDropset = rigaConDropsetAcceso();
  assert.ok(rigaConDropset, 'la riga col dropset acceso dev\'essere ancora li');
  const idSerie = rigaConDropset.attributi['data-serie-id'];
  const giri = perClasse(perClasse(rigaConDropset, 'dropset')[0], 'riga-dropset');
  assert.ok(giri.length === 3, 'il blocco dropset ci deve essere gia\' su questa riga');

  const primoGiro = giri[0];
  const campi = perClasse(primoGiro, 'campo-num');
  assert.equal(campi.length, 2, 'ogni giro ha due campi: kg e ripetizioni');
  campi[0].value = '38';
  campi[0].listeners.get('input')[0]({ type: 'input' });
  await new Promise((r) => setTimeout(r, 450)); // conRitardo aspetta prima di salvare

  const salvata = await db.prendi('serie', idSerie);
  const giriSalvati = salvata.giri_extra || [];
  assert.equal(giriSalvati.length, 3, 'nel database restano tre giri');
  assert.equal(Number(giriSalvati[0].peso), 38, 'e il primo giro ha il peso che ho scritto');
});

test('10. spegnendo il dropset i tre campi spariscono e il flag torna a false', async () => {
  const riga = rigaConDropsetAcceso();
  assert.ok(riga, 'c\'e\' una riga col dropset acceso');
  const idSerie = riga.attributi['data-serie-id'];
  bottoneCon(riga, 'Dropset').clickNonAspettando();
  await attendiChe(() => !rigaConDropsetAcceso());
  const salvata = await db.prendi('serie', idSerie);
  assert.equal(salvata.dropset, false, 'sprecgendo il pulsante il flag torna a false');
});