// whatsapp-scarica.mjs -- scarica le immagini della chat aperta.
//
// Non tocca nient'altro: scorre la lista (per far caricare le vecchie) e legge le
// immagini. Nessun click, nessun messaggio.

import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dest = process.argv[2] || (process.env.TEMP + '/opencode/foto-whatsapp');
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

// la chat aperta
const chat = await valuta(`(() => {
  const p = document.querySelector('#main');
  return p ? (p.innerText || '').replace(/\\s+/g, ' ').slice(0, 80) : 'nessuna';
})()`);
console.log('chat aperta: ' + chat);

// scorro in su e in giu, per far caricare tutta la cronologia
console.log('carico la cronologia...');
for (let i = 0; i < 20; i++) {
  const h = await valuta(`(() => {
    const p = document.querySelector('#main') || document.body;
    const lista = p.querySelector('[role="log"]') || p;
    lista.scrollTop = 0;
    return lista.scrollHeight;
  })()`);
  if (i % 5 === 0) console.log('  giro ' + (i + 1) + ' (altezza ' + h + ')');
  await aspetta(800);
  // e un po' in basso, per il fondo
  await valuta(`(() => {
    const p = document.querySelector('#main') || document.body;
    const lista = p.querySelector('[role="log"]') || p;
    lista.scrollTop = lista.scrollHeight;
    return 1;
  })()`);
  await aspetta(500);
}

// leggo le immagini
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

console.log('immagini lette: ' + immagini.length);

// le metto in una cartella nuova, con un nome unico
let n = 0;
const nomi = [];
for (const im of immagini) {
  const m = /^data:image\/(\w+);base64,(.*)$/.exec(im.data);
  if (!m) continue;
  const est = m[1] === 'jpeg' ? 'jpg' : m[1];
  const nome = 'ex-' + String(n).padStart(2, '0') + '-' + im.w + 'x' + im.h + '.' + est;
  writeFileSync(join(dest, nome), Buffer.from(m[2], 'base64'));
  nomi.push(nome);
  n++;
}
console.log('scritte ' + n + ' immagini in ' + dest);

// le stesse immagini scaricate due volte? (la miniatura e l'originale)
const uniche = new Map();
for (const [i, nome] of nomi.entries()) {
  const chiave = nome.replace(/^ex-\\d+-/, '');
  if (!uniche.has(chiave)) uniche.set(chiave, nome);
}
console.log('dimensioni diverse: ' + uniche.size);
ws.close();
