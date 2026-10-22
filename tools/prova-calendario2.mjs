// prova-calendario2.mjs -- il calendario con i giorni scelti e una seduta fatta.
globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, perClasse } = await import('../test/dom-minimo.js');
const { app } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const errori = [];
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message)));
process.on('uncaughtException', (e) => errori.push('uncaught: ' + (e && e.message)));

const db = await import('../src/db.js');
const d = await import('../src/dati-iniziali.js');
const ACCOUNT = d.accountId(d.PERSONE.find((p) => p.predefinita).id);
const oggi = new Date();
const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
// una seduta oggi e una quattro giorni fa
const quattro = new Date(); quattro.setDate(quattro.getDate() - 4);
const sed = await db.salva('sedute', { id: 's1', data: iso(oggi), stato: 'completata', scheda_id: d.SCHEDA_ID, account_id: ACCOUNT });
await db.salva('sedute', { id: 's2', data: iso(quattro), stato: 'completata', scheda_id: d.SCHEDA_ID, account_id: ACCOUNT });
await db.salva('serie', { id: 'r1', seduta_id: sed.id, esercizio_id: 'ex-chest-press', peso: 37, ripetizioni: 8, stato: 'fatta' });
// giorni scelti: lunedi, mercoledi, venerdi
await db.salva('profili', { id: ACCOUNT, username: 'Stefano', avatar_id: 'fiamma', giorni_allenamento: [1, 3, 5] });

const appMod = await import('../src/app.js');
// il profilo deve essere ricaricato dopo che l'ho scritto
if (appMod.__ricaricaPerTest) await appMod.__ricaricaPerTest();
else { globalThis.window.location.hash = '#/'; await new Promise(r=>setTimeout(r,400)); }
await new Promise((r) => setTimeout(r, 1800));
globalThis.window.location.hash = '#/profilo';
await new Promise((r) => setTimeout(r, 1400));

const testo = app.textContent || '';
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));
const caselle = perClasse(app, 'casella-calendario');
const conta = (c) => caselle.filter((n) => (n.className || '').includes(c)).length;
console.log('caselle: ' + caselle.length);
console.log('previsti (lun,mer,ven): ' + conta('previsto'));
console.log('fatti: ' + conta('fatto'));
console.log('saltati: ' + conta('saltato'));
console.log('oggi evidenziato: ' + conta('oggi'));
console.log('');
console.log('ogni casella, col suo stato:');
for (const c of caselle) {
  const cls = (c.className || '').replace('casella-calendario', '').trim();
  console.log('  ' + (c.textContent || '').trim().padEnd(8) + ' ' + (cls || 'solo'));
}
console.log('');
const i = testo.indexOf('Il tuo calendario');
console.log('la frase: ' + testo.slice(i + 18, i + 150).replace(/\s+/g, ' '));