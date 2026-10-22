// prova-crea-cardio.mjs -- creo l'esercizio cardio e guardo cosa succede.
globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, pulsanti } = await import('../test/dom-minimo.js');
const { app } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const errori = [];
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message)));
process.on('uncaughtException', (e) => errori.push('uncaught: ' + (e && e.message)));
globalThis.__erroriClick = [];
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

await import('../src/app.js');
await attesa(1500);
globalThis.window.location.hash = '#/profilo';
await attesa(1200);

const corpo = globalThis.document.body;
const apri = pulsanti(app).find((b) => /CREA ESERCIZIO/i.test(b.textContent || ''));
apri.click();
await attesa(700);

const dialogo = () => corpo.querySelector('.dialogo');
if (!dialogo()) { console.log('il dialogo non si apre'); process.exit(0); }

/** Tutti i select del dialogo, con l'etichetta che li precede. */
function selettori() {
  const d = dialogo();
  const out = [];
  const figli = Array.from(d.children || []);
  for (let i = 0; i < figli.length; i++) {
    if (figli[i].tagName === 'SELECT') {
      const lab = figli[i - 1];
      out.push({
        etichetta: lab && lab.tagName === 'LABEL' ? String(lab.textContent || '') : '(senza etichetta)',
        nodo: figli[i],
      });
    }
  }
  return out;
}

console.log('=== I SELECT DEL DIALOGO (prima di scegliere)');
for (const s of selettori()) console.log('  "' + s.etichetta + '" = "' + s.nodo.value + '"');

console.log('');
console.log('=== METTO "È CARDIO"');
const cardioSel = selettori().find((s) => s.etichetta.indexOf('È cardio') === 0);
if (!cardioSel) { console.log('  non trovo la select "È cardio?"'); process.exit(0); }
cardioSel.nodo.value = 'si';
cardioSel.nodo.dispatch('change', { type: 'change', target: cardioSel.nodo, currentTarget: cardioSel.nodo });
await attesa(300);

const blocco = corpo.querySelector('.blocco-carico');
console.log('  blocco carico nascosto: ' + (blocco && blocco.hidden ? 'SI (giusto)' : 'NO (sbagliato)'));
console.log('');
console.log('=== I SELECT DOPO (i valori del carico devono essere vuoti)');
for (const s of selettori()) {
  console.log('  "' + s.etichetta + '" = "' + s.nodo.value + '"');
}

console.log('');
console.log('=== METTO IL NOME E PREMO "CREA ESERCIZIO"');
const d = dialogo();
// Il DOM finito accetta solo nomi di CLASSE in querySelectorAll (non tag come
// `input`), quindi prendo il campo per classe.
const nome = d.querySelector('.campo-testo');
if (!nome) { console.log('  non trovo nessun campo testo nel dialogo'); }
else {
  nome.value = 'Tapis';
  nome.dispatch('input', { type: 'input', target: nome, currentTarget: nome });
  console.log('  nome impostato: "' + nome.value + '"');
}
const crea = pulsanti(d).find((b) => /CREA ESERCIZIO/i.test(b.textContent || ''));
if (!crea) { console.log('  non trovo il bottante CREA: ' + pulsanti(d).map((b) => (b.textContent || '').trim()).join(' | ')); }
else { crea.click(); await attesa(1500); }

const db = await import('../src/db.js');
const esercizi = await db.tutti('esercizi');
const tapis = esercizi.find((e) => String(e.nome || '').toLowerCase().indexOf('tapis') >= 0);
console.log('');
console.log('=== COSA E\' SALVATO');
if (!tapis) {
  console.log('  esercizi nel catalogo: ' + esercizi.length);
  console.log('  nomi: ' + esercizi.slice(0, 5).map((e) => e.nome).join(', '));
} else {
  console.log('  cardio salvato: ' + (tapis.cardio === true ? 'SI (giusto)' : 'NO (sbagliato)'));
  console.log('  convenzione: "' + tapis.convenzione + '"' + (tapis.convenzione === '' ? ' (vuota, giusto)' : ' (HA UN VALORE)'));
  console.log('  misura: "' + tapis.misura + '"');
  console.log('  attrezzatura: ' + (tapis.attrezzatura === undefined ? 'assente (giusto)' : JSON.stringify(tapis.attrezzatura)));
  console.log('  bracciaIndipendenti: ' + (tapis.bracciaIndipendenti === undefined ? 'assente (giusto)' : tapis.bracciaIndipendenti));
}
console.log('');
console.log('errori click: ' + (globalThis.__erroriClick.length ? globalThis.__erroriClick.join(' | ') : 'nessuno'));
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));