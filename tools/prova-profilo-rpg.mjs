// prova-profilo-rpg.mjs -- cosa si vede davvero nel Profilo, con le parole di Ste.
globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, pulsanti, perClasse } = await import('../test/dom-minimo.js');
const { app } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const errori = [];
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message)));
process.on('uncaughtException', (e) => errori.push('uncaught: ' + (e && e.message)));
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

await import('../src/app.js');
await attesa(1500);
globalThis.window.location.hash = '#/profilo';
await attesa(1600);

const t = app.textContent || '';
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));
console.log('');
console.log('=== LA CLASSE CONSIGLIATA');
const i = t.indexOf('Il tuo avatar');
console.log(t.slice(i, i + 210).replace(/\s+/g, ' '));
console.log('');
console.log('=== I BOTTONI DELLE CLASSI (con la spunta)');
const classi = pulsanti(app).map((b) => (b.textContent || '').trim()).filter((t2) => /Guerriero|Assassino|Berserker/.test(t2));
for (const c of classi) console.log('  ' + (c.includes('✓') ? '[spuntato] ' : '[       ] ') + c);
console.log('');
console.log('=== COSA DA\' OGNI CLASSE');
const iBonus = t.indexOf('Guerriero:');
if (iBonus > 0) console.log('  ' + t.slice(iBonus, iBonus + 110).replace(/\s+/g, ' '));
console.log('');
console.log('=== LE STATISTICHE CON LA SPIEGAZIONE');
const spiegate = perClasse(app, 'riga-stat-spiegata');
for (const s of spiegate) {
  const testo = (s.textContent || '').replace(/\s+/g, ' ').trim();
  console.log('  - ' + testo.slice(0, 150));
}
console.log('');
console.log('=== LA SPIEGAZIONE SUL CARDIO');
const iCardio = t.indexOf('Come si segna il cardio');
if (iCardio > 0) console.log('  ' + t.slice(iCardio, iCardio + 330).replace(/\s+/g, ' '));
else console.log('  (manca)');
console.log('');
console.log('=== ERRORI DI GRAMMATICA NEI TESTI (apostrofi al posto degli accenti)');
const catturati = [];
const testoDaLeggere = app.textContent || '';
for (const parola of ['perche\'', 'piu\'', 'cosi\'', 'gia\'', 'puo\'', 'e\' un', 'e\' il']) {
  if (testoDaLeggere.includes(parola)) catturati.push(parola);
}
console.log('  ' + (catturati.length ? 'TROVATI: ' + catturati.join(', ') : 'nessuno, tutti con gli accenti'));
console.log('');
console.log('=== IL CALENDARIO ANNUALE');
const celle = app.querySelectorAll ? app.querySelectorAll('.cella-calendario') : [];
console.log('  celle con un giorno dentro: ' + celle.filter((c) => c.textContent).length);
console.log('  mesi: ' + (t.match(/gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre/gi) || []).join(', '));
const frecce = pulsanti(app).map((b) => (b.textContent || '').trim()).filter((x) => x === '‹' || x === '›' || x === 'A oggi');
console.log('  frecce anno: ' + (frecce.length ? frecce.join(' ') : 'MANCANTI'));
console.log('');
console.log('errori finali: ' + (errori.length ? errori.join(' | ') : 'nessuno'));