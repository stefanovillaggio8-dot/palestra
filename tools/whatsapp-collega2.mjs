// whatsapp-collega2.mjs -- collega WhatsApp Web col numero GIUSTO.
//
// Il numero di Ste e' italiano: 3755519924 = +39 375 5519924. WhatsApp leggeva il 375
// come prefisso della Bielorussia, quindi il numero era sbagliato: qui si mette il paese
// (Italia) e poi il numero per intero.
//
// Uso: node tools/whatsapp-collega2.mjs 3755519924 Italia

const numero = (process.argv[2] || '').replace(/\D/g, '');
const paese = process.argv[3] || 'Italia';

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
const clicca = async (es, attesa = 1500) => {
  const v = await valuta(es);
  await aspetta(attesa);
  return v;
};

// 1) il bottone del paese
console.log('paese: ' + await clicca(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /Bielorussia|Italy|Italia|Paese/i.test(x.innerText || ''));
  if (!b) return 'nessun bottone paese';
  b.click();
  return 'aperto: ' + (b.innerText || '').trim();
})()`, 1800));

// 2) nella ricerca dei paesi scrivo il nome
console.log('ricerca paese: ' + await clicca(`(() => {
  const campi = [...document.querySelectorAll('input')];
  const campo = campi.find((c) => /cerca|search|paese|country/i.test((c.getAttribute('aria-label') || '') + ' ' + (c.placeholder || '')));
  if (!campo) return 'nessun campo di ricerca (' + campi.length + ' campi)';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(campo, '${paese}');
  campo.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${paese}', inputType: 'insertText' }));
  return 'scrivo ${paese}';
})()`, 2000));

// 3) scelgo l'Italia
console.log('scelgo: ' + await clicca(`(() => {
  const celle = [...document.querySelectorAll('div[role="listitem"], div[role="option"], div[role="button"], li, span')];
  const it = celle.filter((c) => /^Italia/i.test((c.innerText || '').trim()) && (c.innerText || '').length < 30);
  if (!it.length) return 'Italia non trovata';
  it[it.length - 1].click();
  return 'Italia scelta';
})()`, 2000));

// 4) il numero per intero
console.log('numero: ' + await clicca(`(() => {
  const campo = [...document.querySelectorAll('input')].find((c) => /telefono|phone/i.test(c.getAttribute('aria-label') || ''));
  if (!campo) return 'nessun campo numero';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(campo, '${numero}');
  campo.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${numero}', inputType: 'insertText' }));
  return 'numero scritto: ' + campo.value;
})()`, 1500));

// 5) avanti
console.log('avanti: ' + await clicca(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /avanti/i.test(x.innerText || ''));
  if (!b) return 'nessun bottone avanti';
  b.click();
  return 'premo avanti';
})()`, 6000));

console.log('stato: ' + await valuta(`(document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 240)`));
console.log('campi: ' + await valuta(`JSON.stringify([...document.querySelectorAll('input')].map(c => ({ aria: (c.getAttribute('aria-label') || '').slice(0, 45), val: c.value })))`));

const scatto = await manda('Page.captureScreenshot', { format: 'png' });
if (scatto.result && scatto.result.data) {
  const out = (process.env.TEMP || '.') + '/opencode/whatsapp-schermata.png';
  writeFileSync(out, Buffer.from(scatto.result.data, 'base64'));
  console.log('scatto: ' + out);
}
ws.close();
