// whatsapp-estrai.mjs -- scarica le immagini da una chat di WhatsApp Web.
//
// Uso:
//   1) apri Chrome con la porta di debug (lo fa lo script avvia-whatsapp.ps1)
//   2) scansiona il QR col telefono e APRI la chat che ti interessa
//   3) node tools/whatsapp-estrai.mjs <cartella-di-destinazione>
//
// COSA FA: si connette al browser (Chrome DevTools Protocol) e LEGGE le immagini
// della chat aperta, portandole in una cartella come file. Non clicca niente, non
// scrive niente nella chat: solo scorre la lista per far caricare le immagini vecchie
// e poi le legge.

import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const dest = process.argv[2] || (process.env.TEMP + '/opencode/foto-whatsapp');
if (!existsSync(dest)) mkdirSync(dest, { recursive: true });

// 1) la pagina aperta nel browser
const elenco = await (await fetch('http://127.0.0.1:9222/json')).json();
const pagine = elenco.filter((p) => p.type === 'page' && p.webSocketDebuggerUrl);
if (!pagine.length) {
  console.log('Nessuna pagina: il browser non e\' aperto con la porta di debug.');
  process.exit(1);
}
const wa = pagine.find((p) => /web\.whatsapp\.com/.test(p.url)) || pagine[0];
console.log('pagina: ' + wa.url.slice(0, 90));

// 2) la connessione al browser
const ws = new WebSocket(wa.webSocketDebuggerUrl);
await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
let idSeq = 0;
const attesa = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && attesa.has(m.id)) { attesa.get(m.id)(m); attesa.delete(m.id); }
};
const manda = (method, params = {}) => new Promise((r) => {
  const id = ++idSeq;
  attesa.set(id, r);
  ws.send(JSON.stringify({ id, method, params }));
});

const valuta = async (espressione) => {
  const r = await manda('Runtime.evaluate', {
    expression: espressione,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.result && r.result.exceptionDetails) {
    throw new Error(r.result.exceptionDetails.text + ' ' + JSON.stringify(r.result.exceptionDetails.exception || {}));
  }
  return r.result && r.result.result ? r.result.result.value : undefined;
};

// 3) la chat: si scorre in su per far caricare le immagini vecchie
console.log('scorro la chat per far caricare le immagini...');
const scorre = `(() => {
  const p = document.querySelector('#main') || document.body;
  const lista = p.querySelector('[role="log"]') || p;
  let su = 0;
  const passo = () => { lista.scrollTop = 0; su++; };
  passo();
  return { su, alto: lista.scrollTop, h: lista.scrollHeight };
})()`;
for (let i = 0; i < 12; i++) {
  const r = await valuta(scorre);
  if (i % 3 === 0) console.log('  giro ' + (i + 1) + ' (scorribile ' + (r ? r.h : '?') + ')');
  await new Promise((s) => setTimeout(s, 700));
}

// 4) le immagini
console.log('leggo le immagini...');
const LEGGI = `(async () => {
  const p = document.querySelector('#main') || document.body;
  const lista = p.querySelector('[role="log"]') || p;
  const imgs = [...lista.querySelectorAll('img')].filter((i) => i.naturalWidth >= 120);
  const fuori = [];
  for (const im of imgs) {
    try {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      c.getContext('2d').drawImage(im, 0, 0);
      const data = c.toDataURL('image/jpeg', 0.92);
      fuori.push({ w: im.naturalWidth, h: im.naturalHeight, data });
    } catch (e) { /* una non si lascia disegnare: la salta */ }
  }
  return fuori;
})()`;
const immagini = await valuta(LEGGI) || [];
console.log('immagini trovate: ' + immagini.length);

let n = 0;
for (const im of immagini) {
  const m = /^data:image\/(\w+);base64,(.*)$/.exec(im.data);
  if (!m) continue;
  const est = m[1] === 'jpeg' ? 'jpg' : m[1];
  const nome = 'wa-' + String(n).padStart(3, '0') + '-' + im.w + 'x' + im.h + '.' + est;
  writeFileSync(join(dest, nome), Buffer.from(m[2], 'base64'));
  n++;
}
console.log('scritte ' + n + ' immagini in ' + dest);
ws.close();
