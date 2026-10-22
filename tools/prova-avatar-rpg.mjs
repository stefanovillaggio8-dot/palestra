// prova-avatar-rpg.mjs -- cosa dice l'RPG con i numeri veri di Ste.
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

await import('../src/app.js');
await new Promise((r) => setTimeout(r, 1500));

// registro un po' di allenamenti veri, con i kg di Ste
const db = await import('../src/db.js');
const d = await import('../src/dati-iniziali.js');
const ACCOUNT = d.accountId(d.PERSONE.find((p) => p.predefinita).id);
const chest = d.ESERCIZI.find((e) => /chest press/i.test(e.nome));
const lat = d.ESERCIZI.find((e) => /lat pulldown macchina/i.test(e.nome));
const sed = await db.salva('sedute', { id: 'sed-prova', giorno_id: 'g1', data: '2026-10-08', stato: 'completata', scheda_id: d.SCHEDA_ID, account_id: ACCOUNT });
await db.salva('serie', { id: 's1', seduta_id: sed.id, esercizio_id: chest.id, peso: 37, ripetizioni: 8, stato: 'fatta' });
await db.salva('serie', { id: 's2', seduta_id: sed.id, esercizio_id: lat.id, peso: 88, ripetizioni: 6, stato: 'fatta' });

await import('../src/app.js').then((m) => { if (m.ricaricaTutto) return m.ricaricaTutto(); }).catch(() => {});
globalThis.window.location.hash = '#/profilo';
await new Promise((r) => setTimeout(r, 1500));

const testo = app.textContent || '';
console.log('errori: ' + (errori.length ? errori.join(' | ') : 'nessuno'));
console.log('');
console.log('i numeri dell\'RPG con i dati veri:');
const rpg = await import('../src/avatar-rpg.js');
const r = rpg.calcolaAvatar(null, await db.tutti('serie'), await db.tutti('sedute'),
  (id) => d.ESERCIZI.find((e) => e.id === id), { profilo: { giorni_allenamento: [2, 3, 5, 6] } });
console.log('  volume totale:  ' + r.volTot);
console.log('  volume forza:   ' + r.volForza);
console.log('  cardio:         ' + r.cardio);
console.log('  giorni:         ' + r.giorniAllenati);
console.log('  streak:         ' + r.streak.giorni);
console.log('  XP:             ' + r.xp);
console.log('  LIVELLO:        ' + r.livello);
console.log('  forza:          ' + r.st.forza);
console.log('  agilita:        ' + r.st.agilita);
console.log('  stamina:        ' + r.stamina !== undefined ? '' : '');
console.log('  statistiche:    forza ' + r.st.forza + ' | agilita ' + r.st.agilita + ' | stamina ' + r.st.stamina);
console.log('  classe consigliata: ' + (rpg.classeConsigliata(r.base) || {}).nome);
console.log('');
console.log('la schermata mostra:');
console.log('  classe-rpg:       ' + perClasse(app, 'classe-rpg').length);
console.log('  righe-stat:       ' + perClasse(app, 'riga-stat').length);
console.log('  premi:            ' + perClasse(app, 'premio').length);
console.log('  premi sbloccati:  ' + perClasse(app, 'premio').filter ? 'n/a' : 'n/a');
console.log('  c\'e il blocco:    ' + (testo.includes('Armature e armi') ? 'SI' : 'no'));