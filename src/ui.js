// ui.js -- mattoni piccoli per costruire l'interfaccia senza librerie.

export function el(tag, attributi = {}, figli = []) {
  const nodo = document.createElement(tag);
  for (const [k, v] of Object.entries(attributi)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') nodo.className = v;
    else if (k === 'testo') nodo.textContent = v;
    else if (k === 'html') nodo.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') nodo.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dati') for (const [dk, dv] of Object.entries(v)) nodo.dataset[dk] = dv;
    else nodo.setAttribute(k, v === true ? '' : String(v));
  }
  const lista = Array.isArray(figli) ? figli : [figli];
  for (const f of lista) {
    if (f === null || f === undefined || f === false) continue;
    nodo.appendChild(typeof f === 'string' || typeof f === 'number' ? document.createTextNode(String(f)) : f);
  }
  return nodo;
}

export function svuota(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  return nodo;
}

/**
 * Campo numerico: accetta sia la virgola sia il punto, sia sui numeri interi
 * sia sui decimali. Non trasforma mai in intero. Digitando spazio non succede
 * niente, cosi' si puo' usare comodamente con le spalle appoggiate.
 */
export function campoNumero(valore, { onCambio, onInvalido, id, etichetta, extra = {} } = {}) {
  const input = el('input', {
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    class: 'campo-num',
    'data-etichetta': etichetta || '',
    value: valore === null || valore === undefined ? '' : String(valore).replace('.', ','),
    ...extra,
  });
  if (id) input.id = id;
  input.addEventListener('input', () => {
    const grezzo = input.value;
    if (grezzo === '') { if (onCambio) onCambio(null, input); return; }
    if (/^[+-]?[0-9]*([.,][0-9]*)?$/.test(grezzo.replace(/\s/g, ''))) {
      if (onCambio) onCambio(grezzo, input);
    } else {
      input.classList.add('errore');
      if (onInvalido) onInvalido(grezzo, input);
    }
  });
  input.addEventListener('blur', () => {
    input.classList.remove('errore');
    if (input.value === '') return;
    const n = Number(input.value.replace(',', '.'));
    if (Number.isFinite(n)) input.value = String(Math.round(n * 100) / 100).replace('.', ',');
  });
  return input;
}

export function campoTesto(valore, { onCambio, segnaposto, righe = 1, classe = '' } = {}) {
  const t = el(righe > 1 ? 'textarea' : 'input', {
    class: 'campo-testo ' + classe,
    placeholder: segnaposto || '',
    rows: righe > 1 ? righe : null,
  });
  t.value = valore || '';
  t.addEventListener('input', () => { if (onCambio) onCambio(t.value); });
  return t;
}

export function bottone(testo, { onClick, classe = '', tipo = 'button', disabilitato = false, figli = [] } = {}) {
  return el('button', {
    type: tipo,
    class: ('bot ' + classe).trim(),
    onclick: onClick,
    disabled: disabilitato || false,
  }, testo ? [testo, ...(Array.isArray(figli) ? figli : [figli])] : (Array.isArray(figli) ? figli : [figli]));
}

/** Chiede conferma con un dialogo fatto in casa (niente popup di sistema). */
export function chiediConferma(titolo, messaggio, { testoOk = 'Confermo', testoAnnulla = 'Annulla', pericolo = false } = {}) {
  return new Promise((risolvi) => {
    const fine = (v) => { sfondo.remove(); document.removeEventListener('keydown', esc); risolvi(v); };
    const esc = (e) => { if (e.key === 'Escape') fine(false); };
    const sfondo = el('div', { class: 'sfondo-dialogo' }, [
      el('div', { class: 'dialogo' }, [
        el('h3', { testo: titolo }),
        el('p', { testo: messaggio, class: 'testo-dialogo' }),
        el('div', { class: 'dialogo-azioni' }, [
          bottone(testoAnnulla, { onClick: () => fine(false), classe: 'fantasma' }),
          bottone(testoOk, { onClick: () => fine(true), classe: pericolo ? 'pericolo' : 'principale' }),
        ]),
      ]),
    ]);
    sfondo.addEventListener('click', (e) => { if (e.target === sfondo) fine(false); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(sfondo);
  });
}

export function avviso(testo, { tipo = 'info', durata = 4200 } = {}) {
  const n = el('div', { class: 'avviso avviso-' + tipo, testo });
  document.body.appendChild(n);
  setTimeout(() => { n.classList.add('via'); setTimeout(() => n.remove(), 300); }, durata);
  return n;
}

export function schedaEvento() {
  const oggi = new Date();
  const mese = String(oggi.getMonth() + 1).padStart(2, '0');
  const giorno = String(oggi.getDate()).padStart(2, '0');
  return `${oggi.getFullYear()}-${mese}-${giorno}`;
}

export function oraLocale(d) {
  const x = d instanceof Date ? d : new Date(d);
  const h = String(x.getHours()).padStart(2, '0');
  const m = String(x.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function dataLeggibile(d) {
  if (!d) return '';
  const x = new Date(d.length === 10 ? d + 'T12:00:00' : d);
  if (Number.isNaN(x.getTime())) return d;
  return x.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Salva con ritardo: scrive mentre scrivi, non a ogni lettera. */
export function conRitardo(funzione, ms = 400) {
  let t = null;
  const coinvolto = (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => { t = null; funzione(...args); }, ms);
  };
  coinvolto.senzaRitardo = (...args) => { if (t) { clearTimeout(t); t = null; } funzione(...args); };
  coinvolto.annulla = () => { if (t) { clearTimeout(t); t = null; } };
  return coinvolto;
}
