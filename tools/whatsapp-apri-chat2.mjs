// whatsapp-apri-chat2.mjs -- svuota il riquadro del messaggio e cerca la chat GIUSTA.
//
// ATTENZIONE: la ricerca di WhatsApp e' un INPUT (non un div come il riquadro del
// messaggio). Prima questo script aveva scritto il numero nel riquadro del messaggio:
// non e' stato inviato niente (mancava il INVIO), ma il riquadro va svuotato.

const numero = (process.argv[2] || '3755519924').replace(/\D/g, '');

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

// 1) il riquadro del messaggio: svuotato
console.log('svuoto il riquadro: ' + await valuta(`(() => {
  const finestre = [...document.querySelectorAll('div[contenteditable="true"][role="textbox"], div[role="textbox"]')]
    .filter((b) => /message|messaggio|scrivi|write/i.test((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('data-tab'] || '')));
  const fuori = [];
  for (const b of finestre) {
    if ((b.innerText || '').trim()) { b.textContent = ''; b.dispatchEvent(new InputEvent('input', { bubbles: true })); fuori.push('svuotato: ' + (b.getAttribute('aria-label') || 'senza nome')); }
  }
  return fuori.join(' | ') || 'niente da svuotare';
})()`));
await aspetta(600);

// 2) la ricerca
console.log('cerco: ' + await valuta(`(() => {
  const campo = document.querySelector('input[aria-label*="Cerca"], input[aria-label*="Search"], input[placeholder*="Cerca"], input[placeholder*="Search"]');
  if (!campo) return 'nessuna barra di ricerca';
  campo.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(campo, '${numero}');
  campo.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${numero}', inputType: 'insertText' }));
  return 'scritto nella ricerca';
})()`));
await aspetta(4000);

console.log('risultati: ' + await valuta(`(() => {
  const celle = [...document.querySelectorAll('div[role="listitem"], div[role="gridcell"], div[role="button"], div[role="option"]')];
  const fuori = [];
  for (const c of celle) {
    const t = (c.innerText || '').replace(/\\s+/g, ' ').trim();
    if (t && t.length < 90) fuori.push(t);
  }
  return JSON.stringify(fuori.slice(0, 12));
})()`));

// 3) premo il risultato che contiene il numero
console.log('premo: ' + await valuta(`(() => {
  const celle = [...document.querySelectorAll('div[role="listitem"], div[role="gridcell"], div[role="button"], div[role="option"]')];
  const buona = celle.find((c) => (c.innerText || '').includes('${numero}'));
  if (!buona) return 'nessun risultato col numero';
  buona.click();
  return 'premuto';
})()`));
await aspetta(5000);

console.log('chat aperta: ' + await valuta(`(() => {
  const p = document.querySelector('#main');
  if (!p) return 'niente';
  const t = (p.innerText || '').replace(/\\s+/g, ' ').slice(0, 140);
  const img = p.querySelectorAll('img').length;
  return t + ' || immagini: ' + img;
})()`));
ws.close();
