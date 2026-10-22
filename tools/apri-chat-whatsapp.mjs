// apri-chat-whatsapp.mjs -- cerca un numero e apre quella chat.
//
// Uso: node tools/apri-chat-whatsapp.mjs 3755519924
//
// Apre la chat (aprire una chat non invia niente: il pericolo sarebbe scrivere nel
// riquadro del messaggio, e questo script non lo tocca mai).

const numero = (process.argv[2] || '').replace(/\D/g, '');

const elenco = await (await fetch('http://127.0.0.1:9222/json')).json();
const wa = elenco.find((p) => p.type === 'page' && /web\.whatsapp\.com/.test(p.url));
if (!wa) { console.log('la pagina di WhatsApp non c\'e\''); process.exit(1); }

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

const stato = await valuta(`(() => {
  const t = (document.body.innerText || '');
  return { qr: /Inquadra il codice QR/.test(t), caricato: !!document.querySelector('#pane-side') };
})()`);
if (stato.qr) {
  console.log('ANCORA DA SCANSIONARE: la pagina e\' quella del QR.');
  ws.close();
  process.exit(2);
}
if (!stato.caricato) {
  console.log('WhatsApp non e\' ancora collegato. Aspetta che finisca il collegamento.');
  ws.close();
  process.exit(3);
}
console.log('collegato. cerco il numero ' + numero);

// scrivo il numero nella ricerca
const scrive = `(() => {
  const box = [...document.querySelectorAll('div[role="textbox"]')]
    .find((b) => /cerca|search|chat/i.test(b.getAttribute('aria-label') || ''))
    || document.querySelector('div[role="textbox"]');
  if (!box) return 'nessuna barra di ricerca';
  box.focus();
  box.textContent = '${numero}';
  box.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${numero}', inputType: 'insertText' }));
  return 'scritto';
})()`;
console.log(await valuta(scrive));
await new Promise((s) => setTimeout(s, 2500));

// apro la prima chat che corrisponde
const apre = `(() => {
  const celle = [...document.querySelectorAll('div[role="listitem"], div[role="gridcell"], div[role="button"]')];
  const buona = celle.find((c) => (c.innerText || '').includes('${numero}'));
  if (!buona) return 'nessuna chat col numero';
  buona.click();
  return 'aperta: ' + (buona.innerText || '').replace(/\\s+/g, ' ').slice(0, 60);
})()`;
console.log(await valuta(apre));
await new Promise((s) => setTimeout(s, 3000));

const dove = await valuta(`(() => {
  const p = document.querySelector('#main');
  return { chat: (p ? (p.innerText || '').replace(/\\s+/g, ' ').slice(0, 120) : 'niente'),
           immagini: p ? p.querySelectorAll('img').length : 0 };
})()`);
console.log('chat aperta: ' + dove.chat);
console.log('immagini nella chat: ' + dove.immagini);
ws.close();
