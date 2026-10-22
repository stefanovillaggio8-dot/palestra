// whatsapp-leggi-codice.mjs -- legge il codice di collegamento dalla pagina.
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

const codice = await valuta(`(() => {
  // le caselle del codice: ognuna ha un carattere. Le prendo in ordine di documento.
  const tutti = [...document.querySelectorAll('div, span, input, td')];
  const caret = tutti.filter((e) => {
    const t = (e.innerText || '').trim();
    return /^[A-Z0-9-]$/.test(t) && e.children.length === 0;
  });
  // la sequenza piu' lunga di caratteri consecutivi
  const seq = caret.map((e) => (e.innerText || '').trim());
  const testo = (document.body.innerText || '').replace(/\\s+/g, '');
  const m = testo.match(/([A-Z0-9]{4}-[A-Z0-9]{4})/);
  if (m) return m[1];
  return seq.length ? seq.join('') : 'non trovato';
})()`);
console.log('CODICE: ' + codice);
console.log('stato: ' + await valuta(`(() => ({
  numero: (document.body.innerText || '').match(/\\+\\d[\\d ]{6,}/)?.[0] || '?',
  dentro: !!document.querySelector('#pane-side'),
}))()`));
ws.close();
