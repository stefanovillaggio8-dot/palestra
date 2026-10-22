// whatsapp-paese2.mjs -- trova la tendina giusta, sceglie l'Italia, scrive il numero.
const paese = process.argv[2] || 'Italia';
const numero = (process.argv[3] || '').replace(/\D/g, '');

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

// 1) i contenitori che scorrono, e quale contiene la tendina dei paesi
const contenitori = await valuta(`(() => {
  const fuori = [];
  for (const d of document.querySelectorAll('div')) {
    if (d.scrollHeight > d.clientHeight + 20 && d.clientHeight > 80) {
      fuori.push({ h: d.clientHeight, s: d.scrollHeight, t: (d.innerText || '').slice(0, 40).replace(/\\s+/g, ' ') });
    }
  }
  return JSON.stringify(fuori.slice(0, 8));
})()`);
console.log('contenitori che scorrono: ' + contenitori);

// 2) scorro quello che contiene i paesi
for (let i = 0; i < 50; i++) {
  const esito = await valuta(`(() => {
    const celle = [...document.querySelectorAll('div[role="option"], div[role="listitem"], span, div')];
    const it = celle.filter((c) => (c.innerText || '').trim() === '${paese}' && c.children.length === 0);
    if (it.length) { it[0].click(); return 'TROVATO'; }
    // scorro il contenitore che ha dentro i paesi
    let migliore = null;
    for (const d of document.querySelectorAll('div')) {
      if (d.scrollHeight > d.clientHeight + 20 && d.clientHeight > 80) {
        const t = d.innerText || '';
        if (/Bielorussia|Belgio|Belize/i.test(t)) { migliore = d; break; }
      }
    }
    if (migliore) migliore.scrollTop += 120;
    return 'scroll ' + (migliore ? migliore.scrollTop : '-');
  })()`);
  if (esito === 'TROVATO') { console.log('paese scelto: ' + paese); break; }
  if (i % 10 === 0) console.log('  ' + esito);
  await aspetta(250);
}
await aspetta(1500);

// 3) il numero per intero
console.log('numero: ' + await valuta(`(() => {
  const campo = [...document.querySelectorAll('input')].find((c) => /telefono|phone/i.test(c.getAttribute('aria-label') || ''));
  if (!campo) return 'nessun campo';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(campo, '${numero}');
  campo.dispatchEvent(new InputEvent('input', { bubbles: true, data: '${numero}', inputType: 'insertText' }));
  campo.dispatchEvent(new Event('change', { bubbles: true }));
  return campo.value;
})()`));
await aspetta(1200);

// 4) avanti
console.log('avanti: ' + await valuta(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /avanti/i.test(x.innerText || ''));
  if (!b) return 'nessun bottone';
  b.click();
  return 'premo';
})()`));
await aspetta(6000);

console.log('stato: ' + await valuta(`(document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 200)`));
console.log('campi: ' + await valuta(`JSON.stringify([...document.querySelectorAll('input')].map(c => ({ aria: (c.getAttribute('aria-label') || '').slice(0, 40), val: c.value })))`));
ws.close();
