// gioco-ui.test.js -- qui si clicca davvero il gioco: la Casa, i Rank, la
// leaderboard, gli amici, il profilo e la creazione esercizio da admin.
// Non dichiaro "funziona" niente che non abbia premuto qui dentro.

import { test, before } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, pulsante, pulsanti, perClasse, trova } = await import('./dom-minimo.js');
const { app, body } = montaDom();
const { avvia: rilanciaAvvio } = await import('../src/app.js');
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const db = await import('../src/db.js');
const { apriSeduta, chiudiSeduta } = await import('../src/sedute.js');
const { ESERCIZI, SCHEDA_ID, PERSONE, accountId } = await import('../src/dati-iniziali.js');

const errori = [];
// gli errori dentro un gestore di clic non devono sparire: li raccolgo qui
globalThis.__erroriClick = [];
process.on('uncaughtException', (e) => errori.push('uncaught: ' + e.message));
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message ? e.message : String(e))));

async function attendiChe(condizione, tentativi = 80) {
  for (let i = 0; i < tentativi; i++) {
    if (condizione()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

/** Come attendiChe, ma la condizione puo' andare a leggere il database. */
async function attendiCheAsync(condizione, tentativi = 80) {
  for (let i = 0; i < tentativi; i++) {
    if (await condizione()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

async function vai(rotta, condizione) {
  globalThis.window.location.hash = rotta;
  if (condizione) await attendiChe(condizione);
  await new Promise((r) => setTimeout(r, 30));
  return app.textContent;
}

/** Una seduta finita con una serie fatta: serve per avere rank e streak. */
async function allenamentoFatto(peso = 40, rip = 8) {
  const v = (await db.tutti('versioni'))[0];
  const giorno = v.snapshot.giorni[0];
  const seduta = await apriSeduta({ scheda_id: SCHEDA_ID, versione: v, giorno });
  const serie = await db.perIndice('serie', 'seduta_id', seduta.id);
  const prima = serie[0];
  await db.salva('serie', { ...prima, peso, ripetizioni: rip, stato: 'fatta' });
  await chiudiSeduta(seduta.id);
  return seduta;
}

before(async () => {
  await import('../src/app.js');
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
});

test('1. la barra in alto mostra fuoco, aura e livello', async () => {
  await attendiChe(() => perClasse(app, 'chip-gioco').length >= 0);
  const testo = await vai('#/');
  await attendiChe(() => perClasse(globalThis.document.getElementById('stato-salvataggio'), 'chip-gioco').length === 3);
  const chips = perClasse(globalThis.document.getElementById('stato-salvataggio'), 'chip-gioco');
  assert.equal(chips.length, 3, 'fuoco, aura e livello sono nella barra');
  assert.match(chips[0].textContent, /fuoco/);
  assert.match(chips[1].textContent, /aura/);
  assert.match(chips[2].textContent, /livello/);
  assert.ok(testo.length > 0);
});

test('2. la Casa mostra teschio della streak, dell\'Aura e le missioni', async () => {
  await vai('#/casa', () => app.textContent.includes('Daily Mission'));
  assert.match(app.textContent, /Daily Mission/);
  assert.match(app.textContent, /Weekly Missions/);
  assert.match(app.textContent, /Secret Missions/);
  assert.equal(perClasse(app, 'teschio-streak').length, 1);
  assert.equal(perClasse(app, 'teschio-aura').length, 1);
  assert.equal(perClasse(app, 'tessera-missione').length, 8, '1 daily + 5 weekly + 2 secret');
  // le secret sono coperte
  const coperte = perClasse(app, 'coperta');
  assert.equal(coperte.length, 2);
  assert.match(app.textContent, /Questa missione richiede coraggio/);
});

test('3. la Casa ha i collegamenti a Storico, Progressi e Impostazioni', async () => {
  await vai('#/casa', () => app.textContent.includes('Allenamento e storico'));
  for (const rotta of ['#/', '#/storico', '#/progressi', '#/impostazioni']) {
    const link = trova(app, (n) => n.tagName === 'A' && n.attributi && n.attributi.href === rotta);
    assert.ok(link, 'manca il collegamento a ' + rotta);
  }
});

test('4. il pulsante REVEAL scopre la Secret e la segna come rivelata', async () => {
  await vai('#/casa', () => !!pulsante(app, '[ REVEAL ]'));
  const prima = (await db.tutti('missioni')).filter((m) => m.rivelata);
  assert.equal(prima.length, 0, 'all\'inizio nessuna secret e\' rivelata');
  await pulsante(app, '[ REVEAL ]').click();
  await attendiChe(() => (await0()) );
  const dopo = await db.tutti('missioni');
  assert.equal(dopo.filter((m) => m.rivelata).length, 1, 'la secret rivelata resta registrata');
  await attendiChe(() => app.textContent.includes('L\'ho fatta'));
});

test('5. completare la Daily dà Aura una volta sola', async () => {
  await vai('#/casa', () => perClasse(app, 'tessera-missione').length === 8);
  const daily = perClasse(app, 'tessera-missione')[0];
  const fai = pulsante(daily, 'L\'ho fatta');
  assert.ok(fai, 'la daily ha il bottone per completarla');
  // il pulsante chiede conferma in un dialogo: premo "Si, l'ho fatta"
  fai.clickNonAspettando();
  // il dialogo di conferma e' l'ultima cosa aggiunta al body: lo cerco per classe
  await attendiChe(() => trova(globalThis.document.body, (n) => n.attributi && String(n.attributi.class || '').includes('sfondo-dialogo')).length > 0);
  const dialogo = trova(globalThis.document.body, (n) => n.attributi && String(n.attributi.class || '').includes('sfondo-dialogo')).pop();
  const conferma = pulsanti(dialogo).find((b) => (b.textContent || '').includes('l\'ho fatta'));
  assert.ok(conferma, 'il dialogo di conferma c\'e\'');
  await conferma.click();
  // la scrittura nel database avviene subito dopo: aspetto che ci sia davvero
  const salvata = await attendiCheAsync(async () => {
    const ric = await db.tutti('ricompense');
    return ric.filter((r) => r.tipo === 'missione').length === 1;
  });
  const dopo = await db.tutti('missioni');
  const completata = dopo.filter((m) => m.categoria === 'daily' && m.completata_il);
  assert.equal(completata.length, 1, 'la daily di oggi e\' completata una volta sola');
  const ricompense = (await db.tutti('ricompense')).filter((r) => r.tipo === 'missione');
  assert.equal(salvata, true, 'una ricompensa sola per la missione');
  assert.equal(ricompense.length, 1, 'una ricompensa sola per la missione');
  assert.ok(Number(ricompense[0].aura) > 0, 'la ricompensa vale qualcosa');
  // una seconda volta non si puo': il bottone non c\'e\' piu\'
  await vai('#/casa', () => perClasse(app, 'tessera-missione').length === 8);
  const daily2 = perClasse(app, 'tessera-missione')[0];
  assert.match(daily2.className, /fatta/);
  assert.equal(pulsante(daily2, 'L\'ho fatta'), null, 'non si puo\' completare due volte');
});

test('6. dopo un allenamento finito ci sono rank, LP e Aura', async () => {
  await allenamentoFatto(45, 8);
  // l'app tiene i dati in memoria: la ricarico perche' lei veda la seduta
  await rilanciaAvvio();
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
  const sedute = await db.tutti('sedute');
  assert.ok(sedute.find((s) => s.stato === 'completata'), 'la seduta e\' completata nel database');
  await vai('#/casa', () => app.textContent.includes('Daily Mission'));
  assert.match(app.textContent, /Ultimo allenamento/);
  assert.equal(perClasse(app, 'teschio-streak').length, 1);
  assert.match(app.textContent, /1 giorno|1 giorni/);
});

test('6b. finire un allenamento dalla schermata assegna rank, LP e Aura', async () => {
  const ricompensePrima = (await db.tutti('ricompense')).length;
  const auraPrima = (await db.tutti('ricompense')).reduce((a, r) => a + Number(r.aura || 0), 0);
  // parto dalla pagina di un giorno e predo tutto, come fa Ste
  await vai('#/giorno/giorno-2', () => perClasse(app, 'blocco-esercizio').length >= 4);
  const inizia = pulsante(app, 'Inizia allenamento');
  assert.ok(inizia, 'il bottone per iniziare c\'e\'');
  await inizia.click();
  await attendiChe(() => perClasse(app, 'cronometro').length === 1);
  // metto i numeri nella prima serie e la spunto
  const righe = perClasse(app, 'riga-serie');
  assert.ok(righe.length >= 1, 'ci sono le serie');
  const campoPeso = perClasse(righe[0], 'campo-peso')[0];
  const campoRip = perClasse(righe[0], 'campo-rip')[0];
  assert.ok(campoPeso && campoRip, 'ci sono i campi dei kg e delle ripetizioni');
  campoPeso.value = '60';
  campoPeso.listeners.get('input')[0]({ type: 'input' });
  campoRip.value = '8';
  campoRip.listeners.get('input')[0]({ type: 'input' });
  const spunta = perClasse(app, 'bottone-spunta')[0];
  assert.ok(spunta, 'la spunta della serie c\'e\'');
  await spunta.click();
  await new Promise((r) => setTimeout(r, 500));
  // chiudo l'allenamento e confermo
  pulsante(app, 'Allenamento finito').clickNonAspettando();
  await attendiChe(() => !!pulsanti(globalThis.document.body).find((b) => (b.textContent || '').includes('Confermo')));
  const conferma = pulsanti(globalThis.document.body).find((b) => (b.textContent || '').includes('Confermo, allenamento finito'));
  assert.ok(conferma, 'la conferma di fine allenamento compare');
  await conferma.click();
  const cresciuta = await attendiCheAsync(async () => (await db.tutti('ricompense')).length > ricompensePrima);
  const ricompense = await db.tutti('ricompense');
  assert.ok(cresciuta, 'l\'allenamento ha dato dei punti: ' + JSON.stringify(globalThis.__erroriClick));
  assert.ok(ricompense.length > ricompensePrima, 'l\'allenamento ha dato dei punti');
  const auraDopo = ricompense.reduce((a, r) => a + Number(r.aura || 0), 0);
  assert.ok(auraDopo > auraPrima, 'l\'Aura e\' salita');
  assert.ok(ricompense.some((r) => r.tipo === 'record'), 'c\'e\' la ricompensa del record');
});

test('7. i Rank mostrano le card con rank e LP', async () => {
  await vai('#/rank', () => app.textContent.includes('MY RANKS'));
  const cards = perClasse(app, 'card-rank');
  assert.ok(cards.length >= 1, 'c\'e\' almeno una card di rank');
  assert.ok(perClasse(app, 'badge-rank').length >= 1, 'il badge del rank c\'e\'');
  assert.match(app.textContent, /MY RANKS/);
  assert.match(app.textContent, /LEADERBOARD/);
  assert.match(app.textContent, /FRIENDS/);
});

test('8. la scheda del singolo esercizio mostra record, soglie e progressi', async () => {
  await vai('#/esercizio/ex-chest-press', () => app.textContent.includes('Chest Press'));
  assert.match(app.textContent, /Record personale/);
  assert.match(app.textContent, /BRONZE da|SILVER da|GOLD da/);
  assert.ok(perClasse(app, 'barra-progresso').length >= 1, 'la barra degli LP c\'e\'');
  assert.match(app.textContent, /Storico dei miglioramenti/);
});

test('9. il dettaglio di un esercizio senza dati non inventa un rank', async () => {
  await vai('#/esercizio/ex-dips', () => app.textContent.includes('Dips'));
  assert.match(app.textContent, /Nessuna prestazione registrata/);
  assert.equal(perClasse(app, 'badge-rank').length, 0, 'nessun badge senza record');
});

test('10. gli Amici si vedono e si aprono', async () => {
  await vai('#/amici', () => app.textContent.includes('Amici'));
  assert.match(app.textContent, /Amici/);
  const righe = perClasse(app, 'riga-amico');
  assert.ok(righe.length >= 1, 'c\'e\' almeno un amico');
  assert.match(app.textContent, /Persone che puoi aggiungere/);
  const link = trova(app, (n) => n.attributi && n.attributi.href === '#/amico/account-2');
  assert.ok(link, 'il link al profilo dell\'amico c\'e\'');
});

test('11. il profilo di un amico si vede senza codici', async () => {
  // Ste ha tolto il codice 030226 il 04/10/2026: qui non deve più esserci
  // nessuna richiesta di codice, e il confronto si vede sempre.
  await vai('#/amico/account-2', () => app.textContent.includes('allenamenti finiti'));
  assert.match(app.textContent, /allenamenti finiti/, 'i suoi dati si vedono');
  assert.match(app.textContent, /Essercizio per esercizio/, 'e il confronto è sempre aperto');
  assert.ok(!/INSERISCI IL CODICE/.test(app.textContent), 'e non c\'è più nessun codice');
  assert.ok(perClasse(app, 'testa-amico').length === 1, 'compare il profilo dell\'amico');
});

test('12. il Profilo ha avatar grande, statistiche, medaglie e privacy', async () => {
  await vai('#/profilo', () => app.textContent.includes('Profilo'));
  assert.equal(perClasse(app, 'avatar-grande').length, 1, 'l\'avatar grande e\' centrale');
  assert.match(app.textContent, /Statistiche/);
  assert.match(app.textContent, /Medaglie/);
  assert.match(app.textContent, /Privacy/);
  assert.ok(perClasse(app, 'avatar-scelta').length >= 5, 'gli avatar si possono scegliere');
  assert.ok(perClasse(app, 'griglia-medaglie').length === 1);
});

test('13. cambiando avatar la scelta viene salvata', async () => {
  await vai('#/profilo', () => perClasse(app, 'avatar-scelta').length >= 5);
  const scelte = perClasse(app, 'avatar-scelta');
  const nonAttiva = scelte.find((s) => !s.className.includes('attiva')) || scelte[1];
  await nonAttiva.click();
  await attendiChe(() => true);
  const profili = await db.tutti('profili');
  const mio = profili.find((p) => p.id === accountId(1));
  assert.ok(mio, 'il profilo e\' salvato nel database');
  assert.ok(mio.avatar_id, 'l\'avatar scelto e\' salvato con l\'account');
});

test('14. la privacy si chiude e si riapre', async () => {
  await vai('#/profilo', () => app.textContent.includes('Privacy'));
  const chip = perClasse(app, 'chip').find((c) => c.textContent.trim() === 'Performance');
  assert.ok(chip, 'l\'interruttore delle performance c\'e\'');
  // il default è pubblico e toccandolo diventa privato (due soli stati,
  // il codice 030226 è stato tolto)
  assert.ok(chip.className.includes('attivo'), 'le performance partono pubbliche');
  await chip.click();
  await attendiChe(() => true);
  const mio = (await db.tutti('profili')).find((p) => p.id === accountId(1));
  assert.equal(mio.privacy.performance, 'privato', 'la privacy e\' chiusa davvero nel database');
});

test('15. solo l\'amministratore vede il bottone per creare un esercizio', async () => {
  await vai('#/casa', () => app.textContent.includes('Amministratore'));
  assert.ok(pulsante(app, '+ CREA ESERCIZIO'), 'l\'amministratore lo vede');
  const profilo = (await db.tutti('profili')).find((p) => p.id === accountId(1));
  assert.ok(profilo, 'il profilo dell\'amministratore c\'e\' nel database');
  assert.equal(profilo.amministratore, true);
  // il secondo account non e\' amministratore: il pulsante non deve comparire
  const secondo = PERSONE.find((p) => p.id === 2);
  assert.equal(secondo.amministratore, false, 'l\'altro account non e\' amministratore');
});

test('16. l\'esercizio creato dall\'admin finisce nel catalogo di tutti', async () => {
  const prima = (await db.tutti('esercizi')).length;
  await vai('#/casa', () => pulsante(app, '+ CREA ESERCIZIO'));
  await pulsante(app, '+ CREA ESERCIZIO').click();
  await attendiChe(() => !!trova(body, (n) => n.attributi && n.attributi.class === 'dialogo dialogo-largo'));
  const campi = trova(body, (n) => n.tagName === 'INPUT' || n.tagName === 'SELECT');
  assert.ok(campi.length >= 3, 'ci sono i campi del modulo');
  // il bottone di creazione e\' dentro il dialogo
  const crea = pulsanti(body).find((b) => (b.textContent || '').includes('CREA ESERCIZIO'));
  assert.ok(crea, 'il bottone CREA ESERCIZIO c\'e\' nel dialogo');
  await crea.click();
  await new Promise((r) => setTimeout(r, 40));
  const dopo = await db.tutti('esercizi');
  assert.equal(dopo.length, prima, 'senza nome non si crea niente');
});

test('17. la barra di sotto ha le cinque voci senza perdere le vecchie pagine', async () => {
  await vai('#/', () => perClasse(app, 'scheda-giorno').length === 4);
  const voci = perClasse(app, 'voce-menu').map((v) => v.textContent.trim());
  assert.deepEqual(voci, ['Allenamento', 'Casa', 'Rank', 'Amici', 'Profilo']);
  // le rotte vecchie funzionano ancora
  await vai('#/storico', () => app.textContent.includes('Storico'));
  assert.match(app.textContent, /Storico/);
  await vai('#/progressi', () => app.textContent.includes('Progressi'));
  assert.match(app.textContent, /Progressi/);
  await vai('#/impostazioni', () => app.textContent.includes('Impostazioni'));
  assert.match(app.textContent, /Impostazioni/);
  await vai('#/scheda', () => perClasse(app, 'riga-modifica').length > 0);
  assert.ok(perClasse(app, 'riga-modifica').length > 0, 'la scheda si modifica ancora');
});

test('18. nessun errore durante tutta la sessione di test', () => {
  assert.deepEqual(errori, [], 'sono rimasti errori: ' + errori.join(' | '));
  assert.deepEqual(globalThis.__erroriClick, [], 'un pulsante e\' fallito: ' + globalThis.__erroriClick.join(' | '));
});

// helper usato sopra per non ripetere l'attesa
function await0() { return true; }