// prova-scheda-cardio.mjs -- sulla scheda, un esercizio cardio ha solo i minuti.
//
// I dati si scrivono DOPO che l'app ha caricato ma PRIMA che disegni: si importa il
// database, si scrivono i dati, e poi si cambia rotta. Il motore di memoria usa
// localStorage, quindi la stessa istanza del modulo `db.js` li vede: funziona.

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
globalThis.__erroriClick = [];
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

// L'APP PRIMA: creo il motore e carico tutto
await import('../src/app.js');
await attesa(1600);

// ORA I DATI, sullo stesso motore
const db = await import('../src/db.js');
const { SCHEDA_ID } = await import('../src/dati-iniziali.js');

const schede = await db.tutti('schede');
const scheda = schede.find((s) => s.id === SCHEDA_ID)
  || await db.salva('schede', { id: SCHEDA_ID, nome: 'Palestra' }, { segna: false });

const tapis = await db.salva('esercizi', {
  id: 'ex-tapis-prova', nome: 'Tapis', gruppo: 'Tapis',
  cardio: true, convenzione: '', misura: 'ripetizioni',
}, { segna: false });

const panca = (await db.tutti('esercizi')).find((e) => /panca|chest press/i.test(e.nome));

const esercizi = [{
  id: 'e1', ordine: 1, esercizio_id: tapis.id, opzionale: false, nota: '',
  serie: [{ peso: null, peso_assistenza: null, ripetizioni: null }],
}];
if (panca) {
  esercizi.push({
    id: 'e2', ordine: 2, esercizio_id: panca.id, opzionale: false, nota: '',
    serie: [{ peso: 40, ripetizioni: 8 }],
  });
}

const snapshot = {
  scheda_id: scheda.id, nome: 'Palestra',
  giorni: [{ id: 'g-tapis', ordine: 1, nome: 'Cardio', esercizi }],
};
const versione = await db.salva('versioni', {
  scheda_id: scheda.id, numero: 1, snapshot,
}, { segna: false });
await db.salva('schede', {
  id: scheda.id, nome: scheda.nome, versione_corrente: versione.id,
}, { segna: false });
console.log('dati scritti (tapis cardio + ' + (panca ? panca.nome : 'panca') + ')');

// e adesso la schermata li rilegge. `disegna()` non rilegge il db, ma il modulo
// dell'app lo fa all'avvio: quindi simulo quello che fa la pagina quando ricarica.
globalThis.window.location.hash = '#/profilo';
await attesa(500);
globalThis.window.location.hash = '#/';
await attesa(500);

const testo = (app.textContent || '').replace(/\s+/g, ' ');
console.log('schermata iniziale: ' + testo.slice(0, 130));
const trovaInizia = perClasse(app, 'bot').find((b) => /inizia allenamento/i.test(b.textContent || ''));
console.log('trovato "Inizia allenamento" in home: ' + (trovaInizia ? 'SI' : 'NO'));

// PREMO "Inizia allenamento": da qui l'app crea le serie e mostra la scheda del giorno.
if (trovaInizia) {
  trovaInizia.click();
  await attesa(1800);
  // può comparire una conferma: se c'è, la accetto
  const corpo = globalThis.document.body;
  const dialogo = corpo.querySelector('.dialogo');
  if (dialogo) {
    const ok = perClasse(dialogo, 'bot').find((b) => /inizia|confermo|comincia|via/i.test(b.textContent || ''));
    console.log('c\'era una conferma: "' + ((dialogo.textContent || '').slice(0, 80)) + '"');
    if (ok) { ok.click(); await attesa(1800); }
  }
}

// "Non trovo il giorno" viene dalla schermata della SEDUTA, che cerca il giorno
// nella versione SALVATA quando l'hai aperta. Io avevo scritto la versione dopo
// che l'app aveva già la sua in memoria, quindi la cerca nella copia di prima.
// Il percorso vero è: apro il giorno PRIMA di iniziare l'allenamento.
console.log('cambio rotta per aggiornare la versione in memoria');
globalThis.window.location.hash = '#/';
await attesa(600);
globalThis.window.location.hash = '#/giorno/g-tapis';
await attesa(1200);
console.log('schermata giorno: ' + (app.textContent || '').replace(/\s+/g, ' ').slice(0, 140));

// Serviva UNA SEDUTA APERTA per questo giorno: è da lì che nascono le serie.
const g = (await db.prendi('versioni', versione.id)).snapshot.giorni[0];
const aperta = await db.salva('sedute', {
  versione_id: versione.id, giorno_id: g.id, nome_giorno: g.nome,
  data: new Date().toISOString().slice(0, 10),
  ora_inizio: new Date().toISOString(), stato: 'in_corso',
}, { segna: false });
for (const es of g.esercizi) {
  for (let i = 0; i < es.serie.length; i++) {
    await db.salva('serie', {
      seduta_id: aperta.id, esercizio_id: es.esercizio_id, ordine: i + 1,
      peso: es.serie[i].peso, peso_assistenza: es.serie[i].peso_assistenza,
      ripetizioni: es.serie[i].ripetizioni, stato: 'da_fare',
    }, { segna: false });
  }
}
console.log('seduta aperta con ' + g.esercizi.reduce((a, e) => a + e.serie.length, 0) + ' serie');

globalThis.window.location.hash = '#/';
await attesa(600);
globalThis.window.location.hash = '#/seduta/' + aperta.id;
await attesa(1500);

const righe = perClasse(app, 'riga-serie');
console.log('');
console.log('righe di serie: ' + righe.length);

for (const r of righe) {
  const e = (r.textContent || '').replace(/\s+/g, ' ').trim();
  const cardio = String(r.className || '').includes('riga-serie-cardio');
  const ha = (sel) => perClasse(r, sel).length > 0;
  console.log('');
  console.log('--- ' + (cardio ? 'SERIE CARDIO' : 'SERIE NORMALE'));
  console.log('  testo: ' + e.slice(0, 80));
  console.log('  campo KG: ' + (ha('campo-peso') ? 'SI' : 'no'));
  console.log('  campo minuti/ripetizioni: ' + (ha('campo-rip') ? 'SI' : 'no'));
  console.log('  pulsante Spotter: ' + (e.includes('Spotter') ? 'SI' : 'no'));
  console.log('  pulsante Dropset: ' + (/dropset/i.test(e) ? 'SI' : 'no'));
  console.log('  lettere sotto i campi: ' + perClasse(r, 'sotto-campo').map((s) => (s.textContent || '').trim()).join(', '));
}
console.log('');
console.log('errori click: ' + (globalThis.__erroriClick.length ? globalThis.__erroriClick.join(' | ') : 'nessuno'));
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));