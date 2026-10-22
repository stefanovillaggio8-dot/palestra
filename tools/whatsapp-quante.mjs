// whatsapp-quante.mjs -- quante immagini e quanti messaggi ci sono in chat.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dest = process.argv[2] || (process.env.TEMP + '/opencode/foto-whatsapp2');
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

// scorro tutta la cronologia, piano piano
console.log('carico tutta la cronologia...');
for (let i = 0; i < 40; i++) {
  const h = await valuta(`(() => {
    const p = document.querySelector('#main') || document.body;
    const lista = p.querySelector('[role="log"]') || p;
    const su = lista.scrollTop;
    lista.scrollTop = 0;
    return { su, h: lista.scrollHeight, img: lista.querySelectorAll('img').length };
  })()`);
  if (i % 6 === 0) console.log('  giro ' + (i + 1) + ': scrollTop=' + h.su + ' altezza=' + h.h + ' immagini=' + h.img);
  await aspetta(900);
  if (h.su === 0 && i > 3) break;
}

const info = await valuta(`(() => {
  const p = document.querySelector('#main') || document.body;
  const lista = p.querySelector('[role="log"]') || p;
  const imgs = [...lista.querySelectorAll('img')].filter((i) => i.naturalWidth >= 150);
  const testo = (lista.innerText || '').replace(/\\s+/g, ' ');
  return { immagini: imgs.length, testo: testo.slice(0, 400), alt: (lista.innerText || '').length };
})()`);
console.log('immagini nella chat: ' + info.immagini);
console.log('testo: ' + info.testo);

// e scarico tutte, con un nome unico per distinguerle
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
