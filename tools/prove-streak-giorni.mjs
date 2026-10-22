// prove-streak-giorni.mjs -- i giorni scelti devono spuntare, e la streak ha tre stati.
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
globalThis.__erroriClick = [];
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

await import('../src/app.js');
await attesa(1500);

console.log('=== I GIORNI SELEZIONATI NELLE IMPOSTAZIONI');
globalThis.window.location.hash = '#/impostazioni';
await attesa(1400);

const giorni = pulsanti(app).filter((b) => /^(Luned|Marted|Mercoled|Gioved|Venerd|Sabato|Domenic)/.test((b.textContent || '').trim()));
console.log('bottoni dei giorni trovati: ' + giorni.length);

const statoPrima = giorni.map((b) => ({ n: (b.textContent || '').trim(), attivo: String(b.className || '').includes('attivo') }));
for (const g of statoPrima) console.log('  ' + (g.attivo ? '[X] ' : '[ ] ') + g.n);

// ne scelgo due
for (const nome of ['Martedì', 'Venerdì']) {
  const b = giorni.find((x) => (x.textContent || '').trim() === nome);
  if (b) { b.click(); await attesa(400); }
}

console.log('');
console.log('DOPO AVER SCELTO DUE GIORNI');
const giorni2 = pulsanti(app).filter((b) => /^(Luned|Marted|Mercoled|Gioved|Venerd|Sabato|Domenic)/.test((b.textContent || '').trim()));
for (const b of giorni2) {
  const attivo = String(b.className || '').includes('attivo');
  const haClasse = String(b.className || '').includes('giorno-settimana');
  console.log('  ' + (attivo ? '[X] ' : '[ ] ') + (b.textContent || '').trim()
    + '   (classe: ' + (haClasse ? 'giorno-settimana' : 'MANCA') + ')');
}

console.log('');
console.log('=== LA STREAK: TRE STATI, NON DUE');
const { aspettoStreak } = await import('../src/streak.js');
const dow = new Date().getDay();
const casi = [
  ['allenato oggi', { giorni: 5, attiva: true, interrotta: false, fattoOggi: true, giorniPrevisti: [dow], ultimoGiorno: '2026-10-10' }],
  ['oggi ti tocca, non fatto', { giorni: 3, attiva: false, interrotta: false, fattoOggi: false, giorniPrevisti: [dow], ultimoGiorno: '2026-10-08' }],
  ['saltato un giorno', { giorni: 0, attiva: false, interrotta: true, fattoOggi: false, giorniPrevisti: [(dow + 1) % 7], ultimoGiorno: '2026-10-08' }],
];
for (const [nome, s] of casi) {
  const a = aspettoStreak(s);
  console.log('  ' + nome.padEnd(24) + ' -> stato: ' + a.stato.padEnd(13) + ' etichetta: ' + a.etichetta);
}

console.log('');
console.log('=== LA CARD DELLA STREAK A SCHERMO');
globalThis.window.location.hash = '#/';
await attesa(1400);
const teschio = perClasse(app, 'teschio-streak')[0];
if (teschio) {
  console.log('  classi: ' + String(teschio.className || ''));
  console.log('  testo: ' + (teschio.textContent || '').replace(/\s+/g, ' ').trim());
} else { console.log('  non trovo la card della streak'); }

console.log('');
console.log('=== IL DIALOGO: I PULSANTI NON SONO COPERTI');
const css = await (await import('node:fs/promises')).readFile(new URL('../stile.css', import.meta.url), 'utf8');
const iAvviso = css.indexOf('.avviso {');
const bloccoAvviso = css.slice(iAvviso, iAvviso + 700);
const zAvviso = /z-index:\s*(\d+)/.exec(bloccoAvviso);
const zDialogo = /\.sfondo-dialogo \{[\s\S]{0,160}?z-index:\s*(\d+)/.exec(css);
console.log('  z-index avviso: ' + (zAvviso ? zAvviso[1] : '?'));
console.log('  z-index dialogo: ' + (zDialogo ? zDialogo[1] : '?'));
console.log('  l\'avviso sta SOTTO il dialogo: ' + (zAvviso && zDialogo && Number(zAvviso[1]) < Number(zDialogo[1]) ? 'SI (giusto)' : 'NO (sbagliato)'));

console.log('');
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));