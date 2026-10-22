// whatsapp-codice.mjs -- mette il codice che arriva via SMS.
//
// Uso: node tools/whatsapp-codice.mjs 123456
//
// Il codice lo prende Ste (arriva via SMS sul telefono). Poi questo script lo scrive,
// aspetta il collegamento, apre la chat col numero e scarica le immagini.

const codice = (process.argv[2] || '').replace(/\D/g, '');
const numeroChat = (process.argv[3] || '3755519924').replace(/\D/g, '');
const dest = process.argv[4] || (process.env.TEMP + '/opencode/foto-whatsapp');
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
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

// 1) il codice
console.log('scrivo il codice: ' + await valuta(`(() => {
  const campi = [...document.querySelectorAll('input')];
  if (!campi.length) return 'nessun campo';
  // un campo per cifra, o un campo solo: si prova il primo e si vede
  const primo = campi[0];
  primo.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(primo, '${codice}');
  primo.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${codice}', inputType: 'insertText' }));
  primo.dispatchEvent(new Event('change', { bubbles: true }));
  return 'codice in ' + campi.length + ' campi';
})()`));
await aspetta(1000);
// se sono caselle separate una per cifra, le riempio una a una
await valuta(`(() => {
  const campi = [...document.querySelectorAll('input')];
  if (campi.length < 3) return 'campo unico';
  const testo = '${codice}';
  campi.forEach((c, i) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(c, testo[i] || '');
    c.dispatchEvent(new InputEvent('input', { bubbles: true, data: testo[i] || '', inputType: 'insertText' }));
  });
  return 'caselle riempite';
})()`);
await aspetta(2500);

// 2) aspetto il collegamento
for (let i = 0; i < 30; i++) {
  const s = await valuta(`(() => ({
    dentro: !!document.querySelector('#pane-side'),
    codice: /inserisci il codice/i.test(document.body.innerText || ''),
  }))()`);
  if (s && s.dentro) { console.log('collegato!'); break; }
  if (i % 5 === 0) console.log('  aspetto... giro ' + (i + 1));
  await aspetta(4000);
}

// 3) apro la chat col numero
console.log('apre la chat: ' + await valuta(`(() => {
  const box = [...document.querySelectorAll('div[role="textbox"]')]
    .find((b) => /cerca|search|chat/i.test(b.getAttribute('aria-label') || ''));
  if (!box) return 'nessuna ricerca';
  box.focus();
  box.textContent = '${numeroChat}';
  box.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${numeroChat}', inputType: 'insertText' }));
  return 'cerca scritta';
})()`));
await aspetta(3500);
console.log('aperta: ' + await valuta(`(() => {
  const celle = [...document.querySelectorAll('div[role="listitem"], div[role="gridcell"], div[role="button"]')];
  const buona = celle.find((c) => (c.innerText || '').includes('${numeroChat}'));
  if (!buona) return 'nessuna chat col numero';
  buona.click();
  return 'click';
})()`));
await aspetta(4000);

// 4) scorro e scarico
for (let i = 0; i < 14; i++) {
  await valuta(`(() => {
    const p = document.querySelector('#main') || document.body;
    const lista = p.querySelector('[role="log"]') || p;
    lista.scrollTop = 0;
    return 1;
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
