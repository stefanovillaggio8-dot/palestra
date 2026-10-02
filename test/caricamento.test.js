import { test } from 'node:test';
import assert from 'node:assert/strict';

// I moduli del browser non possono essere eseguiti davvero in node (servono
// IndexedDB e il DOM), ma il loro codice di avvio si puo' caricare: se ci fosse
// un errore in cima al file o un import rotto, qui lo scopriamo.

const STUB = (tag = 'DIV') => {
  const nodo = {
    tagName: String(tag).toUpperCase(),
    figli: [],
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { nodo.figli.push(c); return c; },
    removeChild() {}, setAttribute() {}, removeAttribute() {},
    querySelector() { return nodo; }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {}, style: {}, firstChild: null, innerHTML: '', value: '',
  };
  // il testo concatenato dei figli, come fa il DOM vero
  Object.defineProperty(nodo, 'textContent', {
    get() {
      if (!nodo.figli.length) return nodo._testo || '';
      return nodo.figli.map((f) => (typeof f === 'string' ? f : (f && f.textContent) || '')).join('');
    },
    set(v) { nodo._testo = String(v); nodo.figli = []; },
  });
  return nodo;
};

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
globalThis.document = {
  getElementById: () => STUB('DIV'),
  createElement: (tag) => STUB(tag),
  createElementNS: (_ns, tag) => STUB(tag),
  createTextNode: (t) => ({ textContent: String(t) }),
  body: STUB('BODY'),
  addEventListener() {}, removeEventListener() {},
};
globalThis.indexedDB = { open() { throw new Error(' IndexedDB non c\'e\' in node: previsto'); } };

test('il modulo del database si carica', async () => {
  const m = await import('../src/db.js');
  assert.equal(typeof m.apriDb, 'function');
  assert.ok(Array.isArray(m.TABELLE));
  assert.ok(m.TABELLE.includes('serie'));
  assert.ok(m.TABELLE.includes('conflitti'));
});

test('il client del database online si carica e non ha richiesto la chiave', async () => {
  const m = await import('../src/supabase.js');
  assert.equal(typeof m.accedi, 'function');
  assert.equal(typeof m.scrivi, 'function');
  assert.equal(m.leggiConfig().attivo, false, 'senza configurazione non si fa nessuna chiamata');
  assert.equal(m.collegato(), false);
});

test('il motore di sincronizzazione si carica', async () => {
  const m = await import('../src/sync.js');
  assert.equal(typeof m.sincronizza, 'function');
  const s = await m.stato();
  assert.match(s.testo, /Solo su questo dispositivo/);
  assert.equal(typeof m.iscriviti, 'function');
});

test('i mattoni dell\'interfaccia si caricano', async () => {
  const m = await import('../src/ui.js');
  assert.equal(typeof m.el, 'function');
  assert.equal(typeof m.campoNumero, 'function');
  assert.equal(typeof m.bottone, 'function');
  const b = m.bottone('ciao', { classe: 'principale' });
  assert.equal(b.tagName, 'BUTTON');
  assert.equal(b.textContent, 'ciao');
  const b2 = m.bottone('', { figli: [m.el('span', { testo: 'figlio' })] });
  assert.equal(b2.textContent, 'figlio', 'i figli passati dentro un bottone vengono aggiunti');
});

test('i grafici si caricano', async () => {
  const m = await import('../src/grafici.js');
  assert.equal(typeof m.graficoLinea, 'function');
  assert.equal(typeof m.graficoBarre, 'function');
});

test('un grafico con un solo punto non si rompe', async () => {
  const m = await import('../src/grafici.js');
  const g = m.graficoLinea([{ etichetta: '01/10', v: 35 }], { chiaveY: 'v', titoloY: 'kg' });
  assert.ok(g.className.includes('grafico'));
});

test('un grafico senza dati dice "dati non disponibili"', async () => {
  const m = await import('../src/grafici.js');
  const g = m.graficoLinea([{ etichetta: '01/10', v: null }], { chiaveY: 'v', titoloY: 'kg' });
  assert.match(g.textContent, /non disponibili/);
});
