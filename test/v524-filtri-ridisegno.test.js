import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { montaDom, perClasse, pulsante } from './dom-minimo.js';
import { vistaRecapPalestra } from '../src/recap-ui.js';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
function montaRecap() {
  const scena = montaDom();
  // Nel browser lo stile inline esiste; il DOM minimale lo chiama `stile`.
  const crea = document.createElement;
  document.createElement = (tag) => {
    const nodo = crea(tag);
    nodo.style = nodo.stile;
    return nodo;
  };
  return scena;
}
const selezionato = (root, value) => perClasse(root, 'recap-select')
  .flatMap(select => select.children)
  .find(option => option.attributi.value === String(value) && 'selected' in option.attributi);

test('v524: il Recap ricorda mensile, anno e mese quando il cloud ridisegna la pagina', async () => {
  const { body } = montaRecap();
  const memoria = { account: 'ste', vista: 'mese', anno: null, mese: null };
  const dati = {
    oggi: '2026-11-19', memoria, sedute: [
      { id: 's1', data: '2025-06-03', stato: 'completata' },
      { id: 's2', data: '2026-10-13', stato: 'completata' },
    ],
  };
  const primo = vistaRecapPalestra(dati);
  body.appendChild(primo);
  assert.ok(selezionato(primo, 2026));
  assert.ok(selezionato(primo, 10));
  await pulsante(primo, 'Annuale').click();
  assert.equal(memoria.vista, 'anno');
  const anno = perClasse(primo, 'recap-select')[0];
  anno.value = '2025';
  await anno.dispatch('change', { target: anno });
  assert.equal(memoria.anno, 2025);

  const ridisegnato = vistaRecapPalestra(dati);
  body.appendChild(ridisegnato);
  assert.equal(pulsante(ridisegnato, 'Annuale').attributi['aria-pressed'], 'true');
  assert.ok(selezionato(ridisegnato, 2025));
  await pulsante(ridisegnato, 'Mensile').click();
  const mese = perClasse(ridisegnato, 'recap-select')[1];
  mese.value = '6';
  await mese.dispatch('change', { target: mese });
  assert.equal(memoria.mese, 6);

  const ancora = vistaRecapPalestra(dati);
  assert.equal(pulsante(ancora, 'Mensile').attributi['aria-pressed'], 'true');
  assert.ok(selezionato(ancora, 2025));
  assert.ok(selezionato(ancora, 6));
});

test('v524: Recap corregge memoria di un anno/mese non piu disponibile', () => {
  montaRecap();
  const memoria = { vista: 'anno', anno: 1800, mese: 18 };
  const root = vistaRecapPalestra({ oggi: '2026-11-19', memoria });
  assert.equal(memoria.vista, 'anno');
  assert.equal(memoria.anno, 2026);
  assert.equal(memoria.mese, 10);
  assert.ok(selezionato(root, 2026));
});

test('v524: Shop ricorda il filtro per account e mostra il conteggio filtrato', () => {
  assert.match(app, /if \(memoriaVistaAuraShop\.account !== idAccountShop\)/);
  assert.match(app, /memoriaVistaAuraShop\.filtro=f/);
  assert.match(app, /let filtro=memoriaVistaAuraShop\.filtro/);
  assert.match(app, /conteggioCatalogo\.textContent=elenco\.length/);
  assert.match(app, /if \(memoriaVistaRecap\.account !== account\)/);
  assert.match(app, /pesi, memoria: memoriaVistaRecap/);
});

test('v524: Shop reale nel DOM mostra 5 effetti e li ricorda al nuovo disegno', async () => {
  globalThis.localStorage = {
    dati: new Map(),
    getItem(k) { return this.dati.get(k) || null; },
    setItem(k, v) { this.dati.set(k, String(v)); },
    removeItem(k) { this.dati.delete(k); },
    clear() { this.dati.clear(); },
  };
  delete globalThis.indexedDB;
  const { app: root } = montaDom();
  globalThis.setInterval = () => 0;
  globalThis.clearInterval = () => {};
  const { avvia } = await import('../src/app.js');
  await avvia();
  window.location.hash = '#/aura-shop';
  const conta = () => perClasse(root, 'aura-shop-count')[0]?.textContent;
  assert.match(conta(), /^\d+ oggetti$/);
  await pulsante(root, 'Effetto').click();
  assert.equal(conta(), '5 oggetti');
  assert.equal(pulsante(root, 'Effetto').getAttribute('aria-pressed'), 'true');
  assert.equal(perClasse(root, 'aura-shop-card').length, 5);
  window.location.hash = '#/profilo';
  window.location.hash = '#/aura-shop';
  assert.equal(conta(), '5 oggetti');
  assert.equal(pulsante(root, 'Effetto').getAttribute('aria-pressed'), 'true');
  await pulsante(root, 'Tutti').click();
  assert.equal(pulsante(root, 'Tutti').getAttribute('aria-pressed'), 'true');
  assert.equal(Number(conta().split(' ')[0]), perClasse(root, 'aura-shop-card').length);
});
