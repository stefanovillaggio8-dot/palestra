// dom-minimo.js -- un DOM piccolo ma vero, per provare l'interfaccia nei test.
// Non e' un browser: e' abbastanza per far partire l'app, costruire le schermate
// e cliccare i pulsanti. Serve a NON dichiarare "funziona" cose che non ho
// mai fatto funzionare.

function creaNodo(tag, ns) {
  const nodo = {
    nodeType: 1,
    tagName: String(tag || 'div').toUpperCase(),
    namespaceURI: ns || null,
    attributi: {},
    figli: [],
    padre: null,
    _testo: '',
    valore: '',
    stile: {},
    listeners: new Map(),
    _id: null,
  };

  nodo.classList = {
    add(...c) {
      const attuale = (nodo.attributi.class || '').split(/\s+/).filter(Boolean);
      for (const x of c) if (!attuale.includes(x)) attuale.push(x);
      nodo.attributi.class = attuale.join(' ');
    },
    remove(...c) {
      const attuale = (nodo.attributi.class || '').split(/\s+/).filter(Boolean);
      nodo.attributi.class = attuale.filter((x) => !c.includes(x)).join(' ');
    },
    contains(x) {
      return (nodo.attributi.class || '').split(/\s+/).includes(x);
    },
    toggle(x, forza) {
      if (forza === undefined ? !nodo.classList.contains(x) : forza) nodo.classList.add(x);
      else nodo.classList.remove(x);
    },
  };

  nodo.dataset = new Proxy({}, {
    get: (t, k) => t[k],
    set: (t, k, v) => { t[k] = v; return true; },
  });

  Object.defineProperty(nodo, 'id', {
    get() { return nodo._id || ''; },
    set(v) { nodo._id = v; nodo.attributi.id = v; if (registro[v]) registro[v] = nodo; },
    configurable: true,
  });

  Object.defineProperty(nodo, 'className', {
    get() { return nodo.attributi.class || ''; },
    set(v) { nodo.attributi.class = v; },
    configurable: true,
  });

  Object.defineProperty(nodo, 'textContent', {
    get() {
      if (!nodo.figli.length) return nodo._testo;
      return nodo.figli.map((f) => (f.nodeType === 3 ? f._testo : f.textContent)).join('');
    },
    set(v) { nodo._testo = String(v); nodo.figli = []; },
    configurable: true,
  });

  Object.defineProperty(nodo, 'firstChild', {
    get() { return nodo.figli.length ? nodo.figli[0] : null; },
    configurable: true,
  });

  Object.defineProperty(nodo, 'lastChild', {
    get() { return nodo.figli.length ? nodo.figli[nodo.figli.length - 1] : null; },
    configurable: true,
  });

  Object.defineProperty(nodo, 'children', {
    get() { return nodo.figli.filter((f) => f.nodeType === 1); },
    configurable: true,
  });

  nodo.setAttribute = (k, v) => {
    nodo.attributi[k] = String(v);
    if (k === 'id') { nodo._id = String(v); registro[String(v)] = nodo; }
  };
  nodo.getAttribute = (k) => (k in nodo.attributi ? nodo.attributi[k] : null);
  nodo.removeAttribute = (k) => {
    delete nodo.attributi[k];
    if (k === 'id') delete registro[nodo._id];
  };

  nodo.appendChild = (figlio) => {
    if (figlio && figlio.nodeType === 11) {
      for (const g of [...figlio.figli]) nodo.appendChild(g);
      return figlio;
    }
    if (figlio && figlio.padre) figlio.padre.removeChild(figlio);
    nodo.figli.push(figlio);
    if (figlio) figlio.padre = nodo;
    return figlio;
  };
  nodo.removeChild = (figlio) => {
    const i = nodo.figli.indexOf(figlio);
    if (i >= 0) { nodo.figli.splice(i, 1); if (figlio) figlio.padre = null; }
    return figlio;
  };
  nodo.remove = () => { if (nodo.padre) nodo.padre.removeChild(nodo); };

  nodo.addEventListener = (tipo, fn) => {
    if (!nodo.listeners.has(tipo)) nodo.listeners.set(tipo, []);
    nodo.listeners.get(tipo).push(fn);
  };
  nodo.removeEventListener = (tipo, fn) => {
    const a = nodo.listeners.get(tipo) || [];
    const i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  };
  /** clic finto: chiama i gestori e restituisce quello che hanno rimesso indietro */
  nodo.click = () => nodo.dispatch('click', { type: 'click', target: nodo, currentTarget: nodo });
  /**
   * Clic "fire and forget": serve quando il pulsante apre una finestra di
   * conferma, perche' il suo gestore aspetta che tu prema "Confermo" e quindi
   * aspettare il click non finirebbe mai.
   */
  nodo.clickNonAspettando = (fn) => {
    const evt = { type: 'click', target: nodo, currentTarget: nodo, preventDefault() {}, stopPropagation() {} };
    for (const f of [...(nodo.listeners.get('click') || [])]) {
      Promise.resolve(f(evt)).catch((e) => {
        // non lo nascondo: se un gestore fallisce devo saperlo
        if (globalThis.__erroriClick) globalThis.__erroriClick.push(String((e && e.message) || e));
      });
    }
    return evt;
  };
  nodo.scrollIntoView = function () { scroller.scrollIntoViewChiamate++; scroller.y += 40; };
  nodo.querySelectorAll = (selettore) => {
    const classe = String(selettore || '').replace(/^\./, '');
    return trova(nodo, (x) => (typeof x.className === 'string') && x.className.split(/\s+/).includes(classe));
  };
  nodo.querySelector = (selettore) => nodo.querySelectorAll(selettore)[0] || null;
  nodo.dispatch = async (tipo, evento = {}) => {
    const evt = {
      type: tipo, target: nodo, currentTarget: nodo,
      preventDefault() {}, stopPropagation() {},
      ...evento,
    };
    evt.currentTarget = nodo;
    evt.target = evento.target || nodo;
    for (const fn of [...(nodo.listeners.get(tipo) || [])]) await fn(evt);
    return evt;
  };

  return nodo;
}

const registro = {};

const scroller = { y: 0, scrollIntoViewChiamate: 0 };
globalThis.__scrollY = () => scroller.y;

function testo(t) {
  return { nodeType: 3, _testo: String(t), textContent: String(t), figli: [], padre: null };
}

/** Percorre tutta la scena e restituisce i nodi che soddisfano il filtro. */
export function trova(radice, filtro) {
  const trovati = [];
  const gira = (n) => {
    if (!n) return;
    if (n.nodeType === 1 && filtro(n)) trovati.push(n);
    for (const f of (n.figli || [])) gira(f);
  };
  gira(radice);
  return trovati;
}

export function perTesto(radice, testoCercato) {
  return trova(radice, (n) => (n.textContent || '').trim() === testoCercato);
}

export function perClasse(radice, classe) {
  return trova(radice, (n) => (typeof n.className === 'string') && n.className.split(/\s+/).includes(classe));
}

export function pulsanti(radice) {
  return trova(radice, (n) => n.tagName === 'BUTTON');
}

/** Il pulsante con quel testo esatto (trim). */
export function pulsante(radice, testoCercato) {
  return pulsanti(radice).find((b) => (b.textContent || '').trim().includes(testoCercato)) || null;
}

/** Installa un DOM finto nelle variabili globali. Restituisce la radice #app. */
export function montaDom() {
  const app = creaNodo('div'); app._id = 'app'; registro.app = app;
  const stato = creaNodo('div'); stato._id = 'stato-salvataggio'; registro['stato-salvataggio'] = stato;
  const conflitti = creaNodo('span'); conflitti._id = 'avviso-conflitti'; registro['avviso-conflitti'] = conflitti;
  const body = creaNodo('body');
  body.appendChild(stato);
  body.appendChild(conflitti);
  body.appendChild(app);

  const ascoltatoriFinestra = new Map();
  const posizione = {
    _hash: '',
    get href() { return 'http://prova/palestra/' + posizione._hash; },
    get hash() { return posizione._hash; },
    set hash(v) {
      const vecchio = posizione._hash;
      posizione._hash = String(v);
      if (vecchio !== posizione._hash) {
        for (const fn of (ascoltatoriFinestra.get('hashchange') || [])) fn({ type: 'hashchange' });
      }
    },
  };

  globalThis.document = {
    body,
    visibilityState: 'visible',
    createElement: (tag) => creaNodo(tag),
    createElementNS: (ns, tag) => creaNodo(tag, ns),
    createTextNode: testo,
    getElementById: (id) => registro[id] || null,
    addEventListener() {}, removeEventListener() {},
  };

  globalThis.window = {
    PALESTRA_VERSIONE: 'test',
    get scrollY() { return scroller.y; },
    scrollTo: (x, y) => { scroller.y = Number(y) || 0; },
    addEventListener(tipo, fn) {
      if (!ascoltatoriFinestra.has(tipo)) ascoltatoriFinestra.set(tipo, []);
      ascoltatoriFinestra.get(tipo).push(fn);
    },
    removeEventListener() {},
    location: posizione,
    dispatch(tipo) { for (const fn of (ascoltatoriFinestra.get(tipo) || [])) fn({ type: tipo }); },
  };

  // in node navigator e' gia' presente e non si puo' riassegnare:
  // si cambia solo la proprieta' che serve
  if (!globalThis.navigator) globalThis.navigator = {};
  try { globalThis.navigator.onLine = false; } catch { /* niente rete nei test */ }
  globalThis.prompt = () => null;
  globalThis.confirm = () => true;
  globalThis.alert = () => {};

  return { app, body, stato, conflitti };
}