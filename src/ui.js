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
    // "titolo" vuol dire l'attributo HTML `title`, quello che fa comparire la
    // spiegazione quando tieni premuto. Scritto così diventava un attributo
    // `titolo` che nessun browser conosce, quindi il tooltip non compariva MAI.
    //
    // Il motivo per cui faceva danno: quindici pulsanti hanno `titolo` come unica
    // spiegazione. I `x` per togliere una serie dalla scheda e per togliere una
    // misurazione di peso hanno la lettera `x` come unico testo: senza tooltip
    // nessuno sa cosa facciano. E nel file stesso ci sono anche sette `title`
    // scritti bene: quindi era un refuso, non una scelta.
    else if (k === 'titolo') nodo.setAttribute('title', v === true ? '' : String(v));
    else if (k === 'aria') for (const [ak, av] of Object.entries(v)) nodo.setAttribute('aria-' + ak, av === true ? '' : String(av));
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
 * niente, così si può usare comodamente con le spalle appoggiate.
 */
export function campoNumero(valore, { onCambio, onInvalido, id, etichetta, extra = {} } = {}) {
  const input = el('input', {
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    class: 'campo-num',
    'data-etichetta': etichetta || '',
    ...extra,
  });
  // il valore va impostato come PROPRIETA' del campo, non come attributo:
  // È il modo giusto, e così il bottone "+" o "come sopra" parte sempre dal
  // numero giusto invece di trovare il campo vuoto.
  const iniziale = (extra && extra.value !== undefined)
    ? extra.value
    : (valore === null || valore === undefined ? '' : String(valore).replace('.', ','));
  input.value = iniziale === null || iniziale === undefined ? '' : String(iniziale);
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

/**
 * Chiede una parola con un dialogo fatto in casa. Serve alla prima apertura di chi
 * si registra col link: senza un campo dove scrivere il nome, l'amico si troverebbe
 * dentro la scheda di Ste.
 *
 * Restituisce il testo scritto (stringa vuota se annulla), quindi il chiamante
 * decide cosa fare: un nome vuoto non È un nome, e non lo si trasforma in uno.
 */
export function chiediTesto(titolo, messaggio, { segnaposto = '', testoOk = 'Va bene' } = {}) {
  return new Promise((risolvi) => {
    const fine = (v) => { sfondo.remove(); document.removeEventListener('keydown', esc); risolvi(v); };
    const esc = (e) => { if (e.key === 'Escape') fine(''); };
    const campo = campoTesto('', { segnaposto, righe: 1 });
    const invia = () => fine(String(campo.value || '').trim());
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') invia(); });
    const sfondo = el('div', { class: 'sfondo-dialogo' }, [
      el('div', { class: 'dialogo' }, [
        el('h3', { testo: titolo }),
        el('p', { testo: messaggio, class: 'testo-dialogo' }),
        campo,
        el('div', { class: 'dialogo-azioni' }, [
          bottone('Annulla', { onClick: () => fine(''), classe: 'fantasma' }),
          bottone(testoOk, { onClick: invia, classe: 'principale' }),
        ]),
      ]),
    ]);
    sfondo.addEventListener('click', (e) => { if (e.target === sfondo) fine(''); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(sfondo);
    try { if (campo.focus) campo.focus(); } catch { /* pazienza */ }
  });
}

export function avviso(testo, { tipo = 'info', durata = 4200 } = {}) {
  // L'AVVISO ENTRA E SI RITIRA.
  //
  // Ste (10/10/2026): "metti più animazioni, sembra non essere cambiato nulla".
  // Un avviso che compare di colpo e sparisce di colpo si legge come un errore che
  // non e' più li'. Entra dal basso (sale di dieci pixel in 260 ms) e quando
  // sparisce sale di qualche pixel e sbiadisce: così sai che era un messaggio e
  // che se ne sta andando, non che e' comparso un altro numero.
  const n = el('div', { class: 'avviso avviso-' + tipo, testo });
  document.body.appendChild(n);
  setTimeout(() => { n.classList.add('via'); setTimeout(() => n.remove(), 300); }, durata);
  return n;
}

/**
 * Fa lampeggiare un numero che è appena cambiato.
 *
 * Serve per una cosa sola: quando guardi un numero dopo aver allenato, vuoi sapere
 * se è quello nuovo o quello di prima. Il colore da solo non basta a chi non nota
 * le sfumature, e un movimento piccolo lo dice a tutti. Non ruota e non scala da
 * solo: aspetta che sia lui a cambiare.
 */
export function numeroCambiato(nodo) {
  if (!nodo) return;
  nodo.classList.remove('numero-cambiato');
  // forza il ricalcolo: senza, togliere e rimettere la classe nello stesso momento
  // non riparte e la seconda volta non si vede
  if (typeof globalThis.getComputedStyle === 'function') {
    try { globalThis.getComputedStyle(nodo); } catch { /* il DOM finito non lo sa fare */ }
  }
  nodo.classList.add('numero-cambiato');
}

/**
 * Bottone "torna su": in palestra si scorre con una mano sola, e le pagine sono
 * lunghe. Appare solo quando sei sceso giu', e sparisce quando torni in cima.
 */
export function bottoneSu() {
  if (typeof document === 'undefined') return null;
  const b = el('button', {
    type: 'button', class: 'bottone-su', titolo: 'Torna in cima', 'aria-label': 'Torna in cima',
    onClick: () => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* pazienza */ } },
  }, [el('span', { testo: '↑' })]);
  document.body.appendChild(b);

  const aggiorna = () => {
    const y = typeof window.scrollY === 'number' ? window.scrollY : 0;
    b.classList.toggle('visibile', y > 500);
  };
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('scroll', aggiorna, { passive: true });
  }
  aggiorna();
  return b;
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
