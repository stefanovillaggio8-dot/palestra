// prova-spunta.mjs -- scelgo il Guerriero e guardo se la spunta compare.
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
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

await import('../src/app.js');
await attesa(1500);
globalThis.window.location.hash = '#/profilo';
await attesa(1600);

const trova = (nome) => pulsanti(app).find((b) => new RegExp(nome).test(b.textContent || ''));

const stampa = (dove) => {
  console.log(dove);
  for (const n of ['Guerriero', 'Assassino', 'Berserker']) {
    const b = trova(n);
    if (!b) { console.log('  ' + n + ': non c\'è'); continue; }
    const attiva = String(b.className || '').includes('attiva');
    const spunta = String(b.textContent || '').includes('✓');
    console.log('  ' + (spunta ? '[✓]' : '[ ]') + ' ' + n + '   classe attiva: ' + (attiva ? 'SI' : 'no'));
  }
};

console.log('=== PRIMA DI SCEGLIERE');
stampa('');

const guerriero = trova('Guerriero');
if (guerriero) { guerriero.click(); await attesa(1200); }

console.log('');
console.log('=== DOPO AVER SCELTO IL GUERRIERO');
stampa('');

console.log('');
const t = app.textContent || '';
console.log('=== LA FRASE DELLA CLASSE CONSIGLIATA (non deve più comparire)');
console.log('  "Non hai ancora scelto una classe" presente: ' + (t.includes('Non hai ancora scelto una classe') ? 'SI (sbagliato)' : 'no (giusto)'));
const i = t.indexOf('Il tuo personaggio');
console.log('  il personaggio dice: ' + t.slice(i + 18, i + 60).replace(/\s+/g, ' '));
console.log('');
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));