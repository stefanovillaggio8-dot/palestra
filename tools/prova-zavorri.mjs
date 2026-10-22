// prova-zavorri.mjs -- trazioni con i zavorri, viste sulla scheda.
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

await import('../src/app.js');
await attesa(1500);

// I DATI.
// L'app tiene tutto in memoria e `disegna()` non rilegge il database: se scrivo i
// dati dopo che ha caricato, la schermata continua a vedere la versione di prima e
// dice "non trovo il giorno". Quindi si prepara prima e l'app si avvia dopo.
const db = await import('../src/db.js');
const { SCHEDA_ID } = await import('../src/dati-iniziali.js');
const schede = await db.tutti('schede');
const scheda = schede.find((s) => s.id === SCHEDA_ID) || schede[0]
  || await db.salva('schede', { id: SCHEDA_ID, nome: 'Palestra' }, { segna: false });

await db.salva('esercizi', {
  id: 'ex-traz-zav', nome: 'Trazioni con zavorri', gruppo: 'Trazioni',
  convenzione: 'zavorri', misura: 'solo_reps',
}, { segna: false });
await db.salva('esercizi', {
  id: 'ex-dips-zav', nome: 'Dip alle parallele con zavorri', gruppo: 'Dip',
  convenzione: 'zavorri', misura: 'solo_reps',
}, { segna: false });
await db.salva('esercizi', {
  id: 'ex-traz-ass', nome: 'Trazioni assistite', gruppo: 'Trazioni',
  convenzione: 'assistenza', misura: 'solo_reps',
}, { segna: false });

const esercizi = [
  { id: 'e1', ordine: 1, esercizio_id: 'ex-traz-zav', opzionale: false, nota: '', serie: [{ peso: 20, ripetizioni: 5 }] },
  { id: 'e2', ordine: 2, esercizio_id: 'ex-dips-zav', opzionale: false, nota: '', serie: [{ peso: 25, ripetizioni: 6 }] },
  { id: 'e3', ordine: 3, esercizio_id: 'ex-traz-ass', opzionale: false, nota: '', serie: [{ peso_assistenza: 20, ripetizioni: 5 }] },
];
const snapshot = { scheda_id: scheda.id, nome: 'Palestra', giorni: [{ id: 'g-zav', ordine: 1, nome: 'Trazioni', esercizi }] };
const versione = await db.salva('versioni', { scheda_id: scheda.id, numero: 1, snapshot }, { segna: false });
await db.salva('schede', { id: scheda.id, nome: scheda.nome, versione_corrente: versione.id }, { segna: false });

const g = snapshot.giorni[0];
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
      ripetizioni: es.serie[i].ripetizioni, stato: 'fatta',
      peso_corpo: 80,
    }, { segna: false });
  }
}
console.log('peso corporeo salvato nelle serie: 80 kg');

globalThis.window.location.hash = '#/';
await attesa(500);
globalThis.window.location.hash = '#/seduta/' + aperta.id;
await attesa(1600);

console.log('  schermata: ' + ((app.textContent||'').replace(/\s+/g,' ').slice(0,220)));
console.log('  classi presenti: riga-serie=' + perClasse(app,'riga-serie').length + ' campo-peso=' + perClasse(app,'campo-peso').length + ' nota-zavorri=' + perClasse(app,'nota-zavorri').length);
const righe = perClasse(app, 'riga-serie');
console.log('');
console.log('=== LE TRE SERIE SULLA SCHEDA (peso corporeo salvato: 80)');
for (const r of righe) {
  const testo = (r.textContent || '').replace(/\s+/g, ' ').trim();
  console.log('');
  console.log('  ' + testo.slice(0, 120));
  const sotto = perClasse(r, 'sotto-campo').map((s) => (s.textContent || '').trim());
  console.log('    lettere sotto i campi: ' + sotto.join(', '));
}

console.log('');
console.log('=== IL RANK DEGLI ESERCIZI (la parte che conta)');
const { recordEsercizio } = await import('../src/rank.js');
const tutte = await db.tutti('serie');
const eserciziTutti = await db.tutti('esercizi');
for (const id of ['ex-traz-zav', 'ex-dips-zav', 'ex-traz-ass']) {
  const e = eserciziTutti.find((x) => x.id === id);
  // la firma è (serie, esercizio, profilo, pesoAttuale)
  const r = recordEsercizio(tutte.filter((s) => s.esercizio_id === id), e, null, 80);
  console.log('  ' + (e ? e.nome : id));
  console.log('    ' + (r && r.testo ? r.testo : (r && r.motivo ? 'non valutabile: ' + r.motivo : '—')));
  console.log('    fascia: ' + (r && r.rank ? r.rank + ' · ' + (r.lp || 0) + ' LP' : '—'));
}
console.log('');
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));