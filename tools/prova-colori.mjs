// prova-colori.mjs -- i tre colori del calendario, con dati veri.
//
// Non finto niente: premo i bottoni della pagina come farebbe Ste. Scelgo i giorni
// dalle Impostazioni, poi creo una seduta, e guardo che il calendario diventi verde
// il giorno della seduta e rosso il giorno scelto che è passato senza farlo.

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, perTesto, pulsanti } = await import('../test/dom-minimo.js');
const { app } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const errori = [];
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message)));
process.on('uncaughtException', (e) => errori.push('uncaught: ' + (e && e.message)));

const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
await import('../src/app.js');
await attesa(1500);

// 1. LEO I GIORNI: Mar, Mer, Ven, Sab (quelli di Ste: [2,3,5,6]).
globalThis.window.location.hash = '#/impostazioni';
await attesa(1200);
for (const giorno of ['Martedì', 'Mercoledì', 'Venerdì', 'Sabato']) {
  const b = pulsanti(app).find((x) => (x.textContent || '').trim() === giorno);
  if (b) { b.click(); await attesa(350); } else console.log('  (non trovo il bottone ' + giorno + ')');
}
await attesa(700);
const testoImp = app.textContent || '';
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));
const iGiorni = testoImp.indexOf('I giorni in cui alleni');
console.log('Impostazioni, dopo aver premuto:');
console.log('  "' + testoImp.slice(iGiorni + 20, iGiorni + 430).replace(/\s+/g, ' ').slice(0, 330) + '"');

// 2. UNA SEDUTA: vado alla scheda e ne registro una, così un giorno diventa verde.
globalThis.window.location.hash = '#/scheda';
await attesa(1500);

// Scrivo direttamente nel database, perché la prova è sul CALENDARIO e non sul
// percorso che porta a salvare la seduta. Quello lo coprono già altri test.
//
// La catena è scheda -> versione -> seduta: `seduteDellaPersona()` prende le sedute
// la cui versione è di questa persona. Scrivere solo la seduta non basta: resterebbe
// invisibile e il calendario resterebbe senza verde.
const db = await import('../src/db.js');
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ieri = new Date(); ieri.setDate(ieri.getDate() - 1);
const treGiorniFa = new Date(); treGiorniFa.setDate(treGiorniFa.getDate() - 3);

// Trovo la scheda che l'app sta usando davvero. Le sedute appartengono a una
// persona tramite scheda -> versione -> seduta: se creo una scheda nuova, le sedute
// restano fuori dalla vista di questa persona e il calendario resta senza verde.
// Quindi uso la scheda del profilo attivo, non una nuova.
const profili = await db.tutti('profili');
const prof = profili[0] || {};
const schede = await db.tutti('schede');
const scheda = schede[0] || await db.salva('schede', { nome: 'Prova' }, { segna: false });
const versioni = await db.perIndice('versioni', 'scheda_id', scheda.id);
const versione = versioni[0] || await db.salva('versioni', { scheda_id: scheda.id }, { segna: false });
void prof;
console.log('sedute scritte sulla scheda ' + scheda.id.slice(0, 6) + ' versione ' + versione.id.slice(0, 6));
// ieri: COMPLETATA -> verde. tre giorni fa: in_corso -> non finita, e se era un
// giorno scelto deve diventare ROSSO (è il giorno perso che rompe la streak).
await db.salva('sedute', { versione_id: versione.id, data: iso(ieri), stato: 'completata' }, { segna: false });
await db.salva('sedute', { versione_id: versione.id, data: iso(treGiorniFa), stato: 'in_corso' }, { segna: false });

// Il DOM finto tiene i dati in memoria dentro l'app: scrivere sul db da fuori non
// basta, la vista era gia' disegnata con i dati di prima. Il routing ascolta
// `hashchange`, quindi cambio pagina e torno al Profilo per farla ridisegnare.
globalThis.window.location.hash = '#/schedario';
await attesa(400);
globalThis.window.location.hash = '#/profilo';
await attesa(1500);

globalThis.window.location.hash = '#/profilo';
await attesa(1500);

// 3. CONTO I COLORI.
const celle = app.querySelectorAll ? app.querySelectorAll('.cella-calendario') : [];
const conta = {};
for (const c of celle) {
  for (const k of ['fatto', 'saltato', 'recupero', 'atteso', 'oggi', 'futuro']) {
    if (c.className && c.className.includes(k)) conta[k] = (conta[k] || 0) + 1;
  }
}
console.log('');
console.log('--- i colori nel calendario (con una seduta ieri e una aperta tre giorni fa)');
console.log('  celle totali: ' + celle.length);
console.log('  VERDE (fatto):        ' + (conta.fatto || 0));
console.log('  ROSSO (saltato):      ' + (conta.saltato || 0));
console.log('  VIOLA (recupero):     ' + (conta.recupero || 0));
console.log('  atteso (ti tocca):    ' + (conta.atteso || 0));
console.log('  oggi (bordo oro):     ' + (conta.oggi || 0));
console.log('  futuro (sbiadito):    ' + (conta.futuro || 0));
const t2 = app.textContent || '';
const i2 = t2.indexOf('Il tuo calendario');
console.log('');
console.log('  la frase in cima: "' + t2.slice(i2 + 18, i2 + 150).replace(/\s+/g, ' ').split('ottobre')[0].split('gennaio')[0] + '"');