// whatsapp-ricarica.mjs -- ricarica WhatsApp Web e conta le immagini (la sincronizzazione
// era "in pausa": ricaricando la pagina si riparte).
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dest = process.argv[2] || (process.env.TEMP + '/opencode/foto-whatsapp3');
if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

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

console.log('ricarico la pagina...');
await manda('Page.reload', { ignoreCache: false });
await aspetta(9000);

// aspetto che torni dentro
for (let i = 0; i < 20; i++) {
  const s = await valuta(`!!document.querySelector('#pane-side')`);
  if (s) { console.log('di nuovo dentro'); break; }
  await aspetta(3000);
}
await aspetta(5000);

// apro la chat col numero (la ricerca e' un input vero)
console.log('apro la chat: ' + await valuta(`(() => {
  const campo = document.querySelector('input[aria-label*="Cerca"], input[aria-label*="Search"]');
  if (!campo) return 'nessuna ricerca';
  campo.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(campo, '3755519924');
  campo.dispatchEvent(new InputEvent('input', { bubbles: true, data: '3755519924', inputType: 'insertText' }));
  return 'cerca scritta';
})()`));
await aspetta(4000);
await valuta(`(() => {
  const celle = [...document.querySelectorAll('div[role="listitem"], div[role="gridcell"], div[role="button"], div[role="option"]')];
  const buona = celle.find((c) => (c.innerText || '').includes('3755519924'));
  if (buona) buona.click();
  return 1;
})()`);
await aspetta(5000);

// scorro e conto
for (let i = 0; i < 25; i++) {
  await valuta(`(() => {
    const p = document.querySelector('#main') || document.body;
    const lista = p.querySelector('[role="log"]') || p;
    lista.scrollTop = 0;
    return 1;
  })()`);
  await aspetta(800);
}
const info = await valuta(`(() => {
  const p = document.querySelector('#main') || document.body;
  const lista = p.querySelector('[role="log"]') || p;
  const imgs = [...lista.querySelectorAll('img')].filter((i) => i.naturalWidth >= 150);
  return { n: imgs.length, testo: (lista.innerText || '').replace(/\\s+/g, ' ').slice(0, 200) };
})()`);
console.log('immagini: ' + info.n);
console.log('testo: ' + info.testo);

// scarico
const immagini = await valuta(`(async () => {
  const p = document.querySelector('#main') || document.body;
  const lista = p.querySelector('[role="log"]') || p;
  const imgs = [...lista.querySelectorAll('img')].filter((i) => i.naturalWidth >= 150);
  const fuori = [];
  for (const im of imgs) {
    try {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      c.getContext('2d').drawImage(im, 0, 0);
      fuori.push({ w: im.naturalWidth, h: im.naturalHeight, data: c.toDataURL('image/jpeg', 0.94) });
    } catch (e) { }
  }
  return fuori;
})()`) || [];
let n = 0;
for (const im of immagini) {
  const m = /^data:image\/(\w+);base64,(.*)$/.exec(im.data);
  if (!m) continue;
  writeFileSync(join(dest, 'img-' + String(n).padStart(2, '0') + '-' + im.w + 'x' + im.h + '.jpg'),
    Buffer.from(m[2], 'base64'));
  n++;
}
console.log('scritte ' + n + ' immagini in ' + dest);
ws.close();
