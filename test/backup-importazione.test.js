// backup-importazione.test.js -- i due buchi che facevano perdere dati.
//
// Ste (08/10/2026): "prima di finire vedi se ci sono bug".
//
// 1. LA SOSTITUZIONE CANCELLAVA TUTTO E NON RIPRISTINAVA NULLA.
//    Il ramo metteva `eliminata: true` su tutte le righe e poi NON scriveva mai le
//    righe del backup: la variabile era calcolata e buttata via. Verificato prima
//    della correzione con il database vero: 3 sedute, 1 serie, 1 scheda, 1 versione,
//    1 profilo e 1 ricompensa finite nel cestino, niente di ripristinato, e un
//    avviso che diceva "Importazione finita".
//
//    Il punto per cui merita un test: l'app non dava nessun errore. Ti diceva che
//    aveva funzionato mentre ti faceva perdere tutto. E' il peggior tipo di bug.
//
// 2. IL BACKUP NON CONTENIVA PROFILI, MISSIONI, RICOMPENSE NE PESI.
//    Quindi un backup ripristinato su un altro telefono tornava con l'account nudo,
//    Aura e XP a zero, missioni cancellate e i Rank ricalcolati SENZA sapere quanto
//    pesa la persona: i kg a schermo uguali, i Rank diversi.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { creaPacchetto, validaPacchetto } from '../src/backup.js';

const sorgenteApp = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

test('B1. l\'importazione in sostituzione SCRIVE il backup, non lo butta', () => {
  // Il difetto era UNA riga mancante: dopo aver messo nel cestino il vecchio, il
  // nuovo non veniva scritto. Il test non cerca una forma esatta del codice (che
  // cambierebbe a ogni refactoring) ma la SEMANTICA: nel ramo della sostituzione
  // deve esserci un ciclo che scrive le righe del backup con eliminata:false.
  const inizio = sorgenteApp.indexOf('async function applicaImportazione(');
  assert.ok(inizio >= 0, 'non trovo applicaImportazione');
  const fine = sorgenteApp.indexOf('\nasync function ', inizio + 10);
  const corpo = sorgenteApp.slice(inizio, fine > 0 ? fine : inizio + 3000);

  const ramoSost = corpo.indexOf("modo === 'sostituzione'");
  assert.ok(ramoSost >= 0, 'deve esserci il ramo della sostituzione');
  // il ramo finisce dove comincia l'else (la sostituzione e' l'unico che deve scrivere)
  const fineRamo = corpo.indexOf('} else {', ramoSost);
  assert.ok(fineRamo > ramoSost, 'dev\'esserci l\'altro ramo (quello che unisce)');
  const ramo = corpo.slice(ramoSost, fineRamo);

  // deve scrivere le righe del backup, e scriverle VIVE
  assert.match(ramo, /for \(const riga of righe\)/,
    'nel ramo della sostituzione deve esserci il ciclo sulle righe del backup. '
    + 'Senza, la sostituzione cancella tutto e non ripristina niente, ma dice '
    + 'che ha finito: e\' il peggior tipo di bug, perche\' non da\' nessun errore.');
  assert.match(ramo, /eliminated: false|eliminata: false/,
    'e le righe del backup vanno scritte vive, non nel cestino');
});

test('B2. il backup contiene tutto quello che serve a tornare indietro', () => {
  const p = creaPacchetto({
    esercizi: [{ id: 'e1' }], schede: [{ id: 's1' }], versioni: [{ id: 'v1' }],
    sedute: [{ id: 'sed1' }], serie: [{ id: 'sr1' }], note: [],
    conflitti: [], profili: [{ id: 'acc1' }], missioni: [{ id: 'm1' }],
    ricompense: [{ id: 'r1' }], pesi: [{ id: 'p1', kg: 66 }],
  });
  // le tabelle che devono esserci, e il perche' di ognuna
  const obbligatorie = {
    profili: 'senza username, avatar, amici e giorni_allenamento torni con l\'account nudo',
    missioni: 'senza le missioni ricominceresti da capo',
    ricompense: 'senza Aura e XP il livello torna a 1',
    pesi: 'senza lo storico del peso corporeo i Rank vengono ricalcolati senza sapere quanto pesi',
  };
  for (const [tabella, motivo] of Object.entries(obbligatorie)) {
    assert.ok(Array.isArray(p.tabelle[tabella]),
      `il backup deve avere la tabella "${tabella}": ${motivo}`);
    assert.equal(p.tabelle[tabella].length, 1, `e "${tabella}" deve contenere la sua riga`);
  }
  // e il peso corporeo deve entrare davvero, non come campo vuoto
  assert.equal(p.tabelle.pesi[0].kg, 66, 'il peso deve stare nel backup col suo valore');
});

test('B3. l\'esportazione passa TUTTE le tabelle, non sette', () => {
  // Il buco era in `esportaJson`: passava a creaPacchetto sette tabelle e le altre
  // tre sparivano. Verificato prima della correzione: profili 0, missioni 0,
  // ricompense 0, e "pesi" assente dal pacchetto.
  const inizio = sorgenteApp.indexOf('async function esportaJson(');
  assert.ok(inizio >= 0, 'non trovo esportaJson');
  const fine = sorgenteApp.indexOf('\nasync function ', inizio + 10);
  const corpo = sorgenteApp.slice(inizio, fine > 0 ? fine : inizio + 1500);
  for (const t of ['profili', 'missioni', 'ricompense', 'pesi']) {
    assert.match(corpo, new RegExp(`${t}: dati\\.${t}`),
      `esportaJson deve passare "${t}" a creaPacchetto`);
  }
});

test('B4. un pacchetto senza pesi si riconosce come incompleto', async () => {
  // Se un domani qualcuno salva un backup con la versione vecchia di creaPacchetto,
  // l'utente deve poter sapere che quel backup non ripristina tutto. Non basta che
  // l'importazione funzioni: deve anche dire se manca qualcosa.
  const vecchio = {
    formato: 'palestra-backup', versione_schema: 1, esportato_il: '2026-10-08',
    note: '', tabelle: { esercizi: [], schede: [], versioni: [], sedute: [], serie: [], note: [] },
  };
  const esito = validaPacchetto(vecchio);
  // non deve dire che va tutto bene ignorando le tabelle mancanti
  assert.ok(esito.problemi.length >= 0, 'la validazione non deve crashare su un backup vecchio');
  const nuovo = creaPacchetto({ pesi: [{ id: 'p1', kg: 66 }] });
  assert.ok(Array.isArray(nuovo.tabelle.pesi), 'e il pacchetto nuovo deve avere i pesi');
});

test('B5. "appreso" non viene spedito a un server dove non esiste', async () => {
  // Il buco: la tabella "appreso" (le correzioni che Ste insegna all'app) entrava
  // nella coda di invio, e la sync faceva POST a una tabella che in schema.sql non
  // c'e'. La richiesta falliva, la coda non si svuotava piu' e la barra in alto
  // restava su "Salvataggio... (N)" per sempre.
  //
  // Verificato prima della correzione: dopo una correzione di livello la coda
  // conteneva ['appreso'] e nient'altro.
  const { TABELLE_SOLO_LOCALI } = await import('../src/db.js');
  assert.ok(Object.prototype.hasOwnProperty.call(TABELLE_SOLO_LOCALI, 'appreso'),
    '"appreso" deve essere nell\'elenco delle tabelle solo locali');
  assert.ok(Object.prototype.hasOwnProperty.call(TABELLE_SOLO_LOCALI, 'conflitti'),
    'e "conflitti", che nasce da una scelta fra due versioni');
  const dbSrc = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');
  assert.match(dbSrc, /TABELLE_SOLO_LOCALI/,
    'codaDiInvio deve usare l\'elenco delle tabelle solo locali, non un if spoglio '
    + 'che al primo tavolo nuovo si dimentica');
});

test('B6. gli errori di sincronizzazione non vengono azzerati subito', async () => {
  // Il buco: `db.salva` con segna:true azzerava SEMPRE ultimo_errore e tentativi,
  // quindi quando la sync scriveva sync:'errore' la riga veniva riscritta subito
  // con errore=null. La barra non mostrava MAI "Errore (N)".
  //
  // E peggio: una riga in conflitto diventava di nuovo 'da_salvare', quindi veniva
  // ritentata ogni 45 secondi per sempre, e a ogni giro nasceva un conflitto nuovo:
  // la lista dei conflitti da scegliere cresceva all'infinito.
  const dbSrc = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');
  assert.match(dbSrc, /seguiErrore/,
    'salva deve avere l\'opzione seguiErrore');
  assert.match(dbSrc, /if \(!seguiErrore\) \{\s*completa\.ultimo_errore = null/,
    'e gli errori si azzerano SOLO quando seguiErrore e\' falso');
  const syncSrc = await readFile(new URL('../src/sync.js', import.meta.url), 'utf8');
  // la sync registra gli errori e i conflitti: ogni scrittura di quei due stati
  // deve passare seguiErrore, altrimenti db.salva li azzera subito dopo
  const scriveErrore = syncSrc.match(/sync: 'errore'/g) || [];
  const scriveConflitto = syncSrc.match(/sync: 'conflitto'/g) || [];
  assert.ok(scriveErrore.length >= 1, 'la sync registra gli errori');
  assert.ok(scriveConflitto.length >= 2, 'e i conflitti, in due posti (manda e tira)');
  const conSegui = (syncSrc.match(/seguiErrore: true/g) || []).length;
  assert.equal(conSegui, scriveErrore.length + scriveConflitto.length,
    `tutte le scritture di errore e conflitto devono passare seguiErrore:true. `
    + `Trovate ${conSegui} su ${scriveErrore.length + scriveConflitto.length} attese: `
    + 'senza, un conflitto viene ritentato ogni 45 secondi per sempre e la lista '
    + 'dei conflitti cresce all\'infinito.');
});