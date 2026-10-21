// lista-esercizi.test.js -- la ricerca e i due filtri della lista esercizi.
//
// Ste (21/10/2026): "aggiungi una barra di ricerca nella lista degli esercizi da
// aggiungere alla scheda perche' sono tanti, aggiungi anche un filtro per parte
// muscolare specifico (tricipiti, petto, dorsali, centro schiena, lombari, trapezi,
// bicipiti, quadricipiti, femorali ecc) e un altro in generale (gambe, braccia, schiena,
// petto)".
//
// Qui si clicca davvero, sul DOM finto: la barra di ricerca, il filtro generale e quello
// per muscolo. Se la lista non si restringe, il test fallisce.

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

const { montaDom, pulsante, perClasse, trova } = await import('./dom-minimo.js');
const { app } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

async function attendiChe(condizione, tentativi = 60) {
  for (let i = 0; i < tentativi; i++) {
    if (condizione()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

before(async () => {
  await import('../src/app.js');
  await attendiChe(() => perClasse(app, 'blocco-giorno-modifica').length === 4);
});

/** Apre il picker degli esercizi di un giorno e ti dice com'e' fatto. */
async function apriPicker(indiceGiorno = 0) {
  globalThis.window.location.hash = '#/scheda';
  await attendiChe(() => perClasse(app, 'blocco-giorno-modifica').length === 4);
  const giorni = perClasse(app, 'blocco-giorno-modifica');
  await pulsante(giorni[indiceGiorno], 'Aggiungi esercizio').click();
  const dialogo = perClasse(globalThis.document.body, 'dialogo-largo')[0];
  assert.ok(dialogo, 'il dialogo degli esercizi si e\' aperto');
  return {
    dialogo,
    campo: trova(dialogo, (n) => n.tagName === 'INPUT')[0],
    filtri: () => perClasse(dialogo, 'filtro'),
    scelte: () => perClasse(dialogo, 'voce-scelta'),
    chiudi: () => {
      const annulla = perClasse(dialogo, 'fantasma').find((b) => /annulla/i.test(b.textContent || ''));
      if (annulla) annulla.click();
    },
  };
}

test('L1. la lista esercizi ha la ricerca, il filtro per argomento e quello per muscolo', async () => {
  const p = await apriPicker(0);

  // LA BARRA DI RICERCA
  assert.ok(p.campo, 'c\'e\' la barra di ricerca');
  assert.match(p.campo.attributi.placeholder || '', /Cerca/i, 'la barra dice cosa cerca');

  // I DUE FILTRI
  const nomi = p.filtri().map((f) => f.textContent.trim());
  assert.ok(nomi.includes('tutti'), 'c\'e\' il "tutti"');
  assert.ok(nomi.includes('petto'), 'c\'e\' il filtro per argomento');
  assert.ok(nomi.includes('tricipiti'), 'c\'e\' il filtro per muscolo');
  assert.ok(nomi.includes('gambe'), 'c\'e\' il filtro per le gambe');
  assert.ok(nomi.includes('schiena'), 'c\'e\' il filtro per la schiena');
  assert.ok(nomi.includes('braccia'), 'c\'e\' il filtro per le braccia');

  // LA LISTA
  assert.ok(p.scelte().length > 3, 'la lista ha gli esercizi (' + p.scelte().length + ')');
  p.chiudi();
});

test('L2. la ricerca restringe la lista', async () => {
  const p = await apriPicker(0);
  const prima = p.scelte().length;

  p.campo.value = 'tricep';
  await p.campo.dispatch('input', { type: 'input', target: p.campo });

  const dopo = p.scelte();
  assert.ok(dopo.length < prima, 'la ricerca restringe la lista (' + dopo.length + ' su ' + prima + ')');
  assert.ok(dopo.length > 0, 'e resta almeno un esercizio');
  for (const s of dopo) {
    assert.match(s.textContent, /tricep/i, 'la ricerca tiene solo quello che cercavi');
  }
  p.chiudi();
});

test('L3. il filtro per muscolo tiene solo i muscoli giusti', async () => {
  const p = await apriPicker(0);
  const chip = (nome) => p.filtri().find((f) => f.textContent.trim() === nome);
  const tricipiti = chip('tricipiti');
  assert.ok(tricipiti, 'il chip dei tricipiti c\'e\'');
  await tricipiti.click();

  const scelte = p.scelte();
  assert.ok(scelte.length > 0, 'il filtro dei tricipiti lascia qualcosa');
  for (const s of scelte) {
    assert.match(s.textContent, /tricipiti/i, 'il filtro tiene solo i tricipiti: ' + s.textContent);
  }
  p.chiudi();
});

test('L4. il filtro per argomento tiene solo quell argomento', async () => {
  // il giorno giusto e' quello che ha ancora esercizi alle gambe liberi: in un giorno
  // dove le gambe sono gia' tutte in scheda, il filtro le esclude tutte e la lista
  // svuota. Non e' un difetto: e' quello che hai chiesto.
  let controllato = false;
  for (let i = 0; i < 4 && !controllato; i++) {
    const p = await apriPicker(i);
    const gambe = p.filtri().find((f) => f.textContent.trim() === 'gambe');
    if (!gambe) { p.chiudi(); continue; }
    await gambe.click();
    const rimaste = p.scelte();
    if (rimaste.length) {
      controllato = true;
      for (const s of rimaste) {
        assert.ok(
          /quadricipiti|femorali|polpacci|glutei|gambe/i.test(s.textContent),
          'il filtro delle gambe tiene solo le gambe: ' + s.textContent);
      }
    }
    p.chiudi();
  }
  assert.ok(controllato, 'in almeno un giorno il filtro delle gambe lascia degli esercizi');
});
