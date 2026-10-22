// whatsapp-collega3.mjs -- scrive il numero internazionale per intero.
//
// WhatsApp accetta il numero con il + e il prefisso: "+393755519924". Niente tendina
// dei paesi, niente codice locale: lui ricava il prefisso da solo.

const numero = (process.argv[2] || '+393755519924');

const elenco = await (await fetch('http://127.0.0.1:9222/json')).json();
const wa = elenco.find((p) => p.type === 'page' && /web\.whatsapp\.com/.test(p.url));
const ws = new WebSocket(wa.webSocketDebuggerUrl);
await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
let seq = 0;
const attesa = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && attesa.has(m.id)) { attesa.get(m.id)(m); attesa.delete(m.id); }
};
const manda = (method, params = {}) => new Promise((r) => {
  const id = ++seq;
  attesa.set(id, r);
  ws.send(JSON.stringify({ id, method, params }));
});
const valuta = async (es) => {
  const r = await manda('Runtime.evaluate', { expression: es, awaitPromise: true, returnByValue: true });
  const d = r.result && r.result.exceptionDetails;
  if (d) return 'ERRORE: ' + d.text;
  return r.result && r.result.result ? r.result.result.value : undefined;
};
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));

// chiudo l'eventuale tendina dei paesi (premo Escape)
await valuta(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 1; })()`);
await aspetta(800);

console.log('scrivo: ' + await valuta(`(() => {
  const campo = [...document.querySelectorAll('input')].find((c) => /telefono|phone/i.test(c.getAttribute('aria-label') || ''));
  if (!campo) return 'nessun campo numero';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(campo, '${numero}');
  campo.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${numero}', inputType: 'insertText' }));
  campo.dispatchEvent(new Event('change', { bubbles: true }));
  return campo.value;
})()`));
await aspetta(1500);
console.log('dopo la scrittura: ' + await valuta(`(() => {
  const c = [...document.querySelectorAll('input')].find((x) => /telefono|phone/i.test(x.getAttribute('aria-label') || ''));
  return c ? c.value : '?';
})()`));

console.log('avanti: ' + await valuta(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /avanti/i.test(x.innerText || ''));
  if (!b) return 'nessun bottone';
  if (b.disabled) return 'disabilitato';
  b.click();
  return 'premo';
})()`));
await aspetta(7000);

console.log('stato: ' + await valuta(`(document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 220)`));
console.log('campi: ' + await valuta(`JSON.stringify([...document.querySelectorAll('input')].map(c => ({ aria: (c.getAttribute('aria-label') || '').slice(0, 45), val: c.value })))`));
ws.close();
