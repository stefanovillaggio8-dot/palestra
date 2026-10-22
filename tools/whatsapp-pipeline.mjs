// whatsapp-pipeline.mjs -- aspetta il collegamento, apre la chat, scarica le foto.
//
// Uso: node tools/whatsapp-pipeline.mjs <numero> <cartella> [minuti-da-aspettare]
//
// 1. aspetta che WhatsApp Web sia collegato (lui scansiona il QR col telefono)
// 2. apre da sola la chat col numero
// 3. porta le immagini della chat in una cartella come file
//
// Non scrive MAI nella chat: apre una conversazione e legge. Scrivere qualcosa
// senza che lui lo chieda sarebbe una cosa seria.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const numero = (process.argv[2] || '').replace(/\D/g, '');
const dest = process.argv[3] || (process.env.TEMP + '/opencode/foto-whatsapp');
const minuti = Number(process.argv[4] || 12);
if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));

async function connetti() {
  const elenco = await (await fetch('http://127.0.0.1:9222/json')).json();
  const wa = elenco.find((p) => p.type === 'page' && /web\.whatsapp\.com/.test(p.url));
  if (!wa) return null;
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
  return { ws, valuta };
}

// --- 1) il collegamento ---
let collegato = false;
const fine = Date.now() + minuti * 60000;
while (Date.now() < fine) {
  try {
    const c = await connetti();
    if (c) {
      const s = await c.valuta(`(() => ({
        qr: /Inquadra il codice QR/.test(document.body.innerText || ''),
        dentro: !!document.querySelector('#pane-side'),
      }))()`);
      if (s && s.dentro && !s.qr) { collegato = true; globalThis.__c = c; break; }
      c.ws.close();
    }
  } catch (e) { /* il browser non e' ancora pronto */ }
  await aspetta(8000);
}
if (!collegato) {
  console.log('Non mi ha collegato entro ' + minuti + ' minuti: nessuna foto scaricata.');
  process.exit(1);
}
console.log('collegato!');

const { ws, valuta } = globalThis.__c;

// --- 2) apro la chat ---
await valuta(`(() => {
  const box = [...document.querySelectorAll('div[role="textbox"]')]
    .find((b) => /cerca|search|chat/i.test(b.getAttribute('aria-label') || ''))
    || document.querySelector('div[role="textbox"]');
  if (!box) return false;
  box.focus();
  box.textContent = '${numero}';
  box.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${numero}', inputType: 'insertText' }));
  return true;
})()`);
await aspetta(3000);
const aperta = await valuta(`(() => {
  const celle = [...document.querySelectorAll('div[role="listitem"], div[role="gridcell"], div[role="button"]')];
  const buona = celle.find((c) => (c.innerText || '').includes('${numero}'));
  if (!buona) return 'nessuna chat col numero';
  buona.click();
  return 'aperta';
})()`);
console.log('chat: ' + aperta);
await aspetta(4000);

// --- 3) scrollo in su e leggo ---
for (let i = 0; i < 14; i++) {
  await valuta(`(() => {
    const p = document.querySelector('#main') || document.body;
    const lista = p.querySelector('[role="log"]') || p;
    lista.scrollTop = 0;
    return lista.scrollHeight;
  })()`);
  await aspetta(700);
}
const immagini = await valuta(`(async () => {
  const p = document.querySelector('#main') || document.body;
  const lista = p.querySelector('[role="log"]') || p;
  const imgs = [...lista.querySelectorAll('img')].filter((i) => i.naturalWidth >= 120);
  const fuori = [];
  for (const im of imgs) {
    try {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      c.getContext('2d').drawImage(im, 0, 0);
      fuori.push({ w: im.naturalWidth, h: im.naturalHeight, data: c.toDataURL('image/jpeg', 0.92) });
    } catch (e) { }
  }
  return fuori;
})()`) || [];

let n = 0;
for (const im of immagini) {
  const m = /^data:image\/(\w+);base64,(.*)$/.exec(im.data);
  if (!m) continue;
  const est = m[1] === 'jpeg' ? 'jpg' : m[1];
  writeFileSync(join(dest, 'wa-' + String(n).padStart(3, '0') + '-' + im.w + 'x' + im.h + '.' + est),
    Buffer.from(m[2], 'base64'));
  n++;
}
console.log('scaricate ' + n + ' immagini in ' + dest);
ws.close();
