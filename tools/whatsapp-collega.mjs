// whatsapp-collega.mjs -- collega WhatsApp Web col numero (senza QR).
//
// Uso: node tools/whatsapp-collega.mjs 3755519924
//
// 1. preme "collega con il numero di telefono"
// 2. scrive il numero e preme avanti
// 3. poi aspetta il codice: lo scrive quando lo dice Ste (telefono -> SMS)
//
// Non scrive MAI un messaggio in nessuna chat.

const numero = (process.argv[2] || '').replace(/\D/g, '');

const elenco = await (await fetch('http://127.0.0.1:9222/json')).json();
const wa = elenco.find((p) => p.type === 'page' && /web\.whatsapp\.com/.test(p.url));
if (!wa) { console.log('la pagina non c\'e\''); process.exit(1); }
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
  if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
  return r.result && r.result.result ? r.result.result.value : undefined;
};
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));

// 1) il link "collega con il numero di telefono"
const premuto = await valuta(`(() => {
  const testo = (document.body.innerText || '');
  if (!/numero di telefono/i.test(testo)) return 'il link non c\\'e\\'';
  const link = [...document.querySelectorAll('a, button, [role="button"], span, div')]
    .filter((e) => /numero di telefono/i.test(e.innerText || '') && (e.innerText || '').length < 90)
    // "Accedi con numero di telefono" e' quello giusto; "In alternativa, collega con
    // il numero di telefono" e' la riga piccola e non porta da nessuna parte
    .sort((a, b) => (/accedi con numero/i.test(a.innerText || '') ? -1 : 1)
      - (/accedi con numero/i.test(b.innerText || '') ? -1 : 1))[0];
  if (!link) return 'il link non c\\'e\\'';
  link.click();
  return 'premuto: ' + (link.innerText || '').trim().slice(0, 40);
})()`);
console.log('link numero: ' + premuto);
await aspetta(2500);

// 2) il numero
const scritto = await valuta(`(() => {
  const campi = [...document.querySelectorAll('input')];
  const campo = campi.find((c) => /telefono|phone/i.test(c.getAttribute('aria-label') || '') || /telefono/i.test(c.placeholder || '')) || campi[0];
  if (!campo) return 'nessun campo';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(campo, '${numero}');
  campo.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${numero}', inputType: 'insertText' }));
  return 'numero scritto';
})()`);
console.log('numero: ' + scritto);
await aspetta(1200);

// 3) preme "avanti"/"continua"
const avanti = await valuta(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /avanti|continua|next|prosegui/i.test(x.innerText || ''));
  if (!b) return 'nessun bottone avanti';
  if (b.disabled) return 'il bottone avanti e\' disabilitato';
  b.click();
  return 'avanti premuto';
})()`);
console.log('avanti: ' + avanti);
await aspetta(3000);

const stato = await valuta(`(() => ({
  testo: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 260),
  campi: [...document.querySelectorAll('input')].map((c) => c.getAttribute('aria-label') || c.placeholder || '?'),
}))()`);
console.log('stato: ' + stato.testo);
console.log('campi: ' + JSON.stringify(stato.campi));

const scatto = await manda('Page.captureScreenshot', { format: 'png' });
if (scatto.result && scatto.result.data) {
  const out = (process.env.TEMP || '.') + '/opencode/whatsapp-schermata.png';
  writeFileSync(out, Buffer.from(scatto.result.data, 'base64'));
  console.log('scatto: ' + out);
}
ws.close();
