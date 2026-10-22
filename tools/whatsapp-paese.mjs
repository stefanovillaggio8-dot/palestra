// whatsapp-paese.mjs -- sceglie il paese nella tendina dei paesi.
//
// La lista dei paesi e' VIRTUALIZZATA: nel DOM ci sono solo i paesi vicini a quello
// scelto. Quindi si scorre la tendina finche' non compare quello che si cerca.

const paese = process.argv[2] || 'Italia';

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

// la tendina: il contenitore che scorre
const TROVA_LISTA = `(() => {
  const tutte = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 20 && d.clientHeight > 100);
  if (!tutte.length) return null;
  return tutte.sort((a, b) => (b.clientHeight) - (a.clientHeight))[0];
})()`;

for (let i = 0; i < 40; i++) {
  const trovato = await valuta(`(() => {
    const celle = [...document.querySelectorAll('div[role="option"], div[role="listitem"], span, div')];
    const it = celle.filter((c) => (c.innerText || '').trim() === '${paese}' && c.children.length === 0);
    if (it.length) { it[0].click(); return 'trovato e premuto'; }
    return '';
  })()`);
  if (trovato) { console.log(trovato); break; }
  // scorro la tendina un pezzettino
  await valuta(`(() => {
    const l = ${TROVA_LISTA};
    if (l) l.scrollTop += l.clientHeight * 0.5;
    return l ? l.scrollTop : -1;
  })()`);
  await aspetta(400);
  if (i % 8 === 0) console.log('  scorro... giro ' + (i + 1));
}

await aspetta(1500);
console.log('stato: ' + await valuta(`(document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 200)`));
console.log('campo numero: ' + await valuta(`(() => {
  const c = [...document.querySelectorAll('input')].find((x) => /telefono|phone/i.test(x.getAttribute('aria-label') || ''));
  return c ? c.value : 'nessuno';
})()`));
ws.close();
