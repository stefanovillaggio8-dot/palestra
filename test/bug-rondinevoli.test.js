// bug-rondinevoli.test.js -- i difetti trovati leggendo il codice, il 09/10/2026.
//
// Tutti e 575 i test erano verdi mentre l'app aveva questi problemi: sono bug che i
// test non guardavano, trovati leggendo e verificando uno per uno. Qui sono chiusi con
// un test ciascuno.
//
// 1. I TOOLTIP NON ESISTEVANO. `el()` scriveva `titolo` come attributo HTML, che nessun
//    browser conosce. Quindici pulsanti avevano la spiegazione solo lì: i `x` per
//    togliere una serie o una misurazione di peso, la selezione delle sedute da
//    eliminare, il teschio della streak.
// 2. L'IMPORTAZIONE DEL BACKUP NON RIPRISTINAVA I PESI. La lista delle tabelle era
//    scritta a mano e non aveva i pesi, che invece il backup esportava.
// 3. IL BONUS DELLA CLASSE FACEVA PERDERE LE ARMATURE. Il controllo usava i numeri col
//    bonus invece di quelli base, quindi cambiando classe perdevi i premi già presi.
// 4. LE MEDAGLIE DELLA STREAK SPARIVANO. Usavano la streak di adesso, non il record.
// 5. GLI STATI DELLA SINCRONIZZAZIONE NON VENIVANO SCRITTI. `db.salva` metteva sempre
//    `da_salvare` e azzerava `tentativi`, quindi la sync non poteva dire "in corso".
// 6. IL CARDIO SOMMAVA SECONDI, METRI E MINUTI. Sul'app stanno tutti nello stesso
//    campo, quindi 1800 secondi davano agilità 1361 e livello 37 da una seduta sola.
// 7. LE DATE IMPOSSIBILI PASSAVANO. "2026-13-45" finiva a schermo come se fosse
//    una data vera.
// 8. SENZA SEDUTE L'OGGETTO STREAK AVEVA MENO CAMPI. Due forme per lo stesso oggetto.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { minutiDiCardio, calcolaAvatar } from '../src/avatar-rpg.js';
import { calcolaStreak, dataPossibile } from '../src/streak.js';

const srcApp = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const srcUi = await readFile(new URL('../src/ui.js', import.meta.url), 'utf8');
const srcDb = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');
const srcGio = await readFile(new URL('../src/gioco.js', import.meta.url), 'utf8');
const srcStreak = await readFile(new URL('../src/streak.js', import.meta.url), 'utf8');

test('T1. "titolo" diventa l\'attributo title, e i tooltip esistono', () => {
  // Il punto: quindici pulsanti hanno `titolo` come unica spiegazione. Scritto
  // `titolo` diventava un attributo HTML inesistente, quindi il tooltip non compariva
  // MAI e il pulsante `x` non spiegava cosa facesse.
  assert.match(srcUi, /k === 'titolo'\) nodo\.setAttribute\('title'/,
    'el() deve tradurre "titolo" in "title"');
  // e i `x` che NON hanno altra etichetta devono averlo davvero.
// Si cerca il testo del titolo, non la forma della chiamata: il pulsante e' su una
// riga e l'opzione `titolo` su un'altra, quindi cercare `bottone('x', { titolo:`
// non trova niente nemmeno quando c'e'.
  assert.match(srcApp, /Togli questa serie dalla scheda/,
    'il bottone che toglie una serie deve dire cosa fa');
  assert.match(srcApp, /Togli questa misurazione/,
    'e quello che toglie una misurazione di peso: senza tooltip, la lettera "x" '
    + 'non spiega niente');
});

test('T2. l\'importazione prende le tabelle dal pacchetto, non da una lista scritta', () => {
  // Il difetto: la lista dentro `applicaImportazione` aveva nove tabelle scritte a
  // mano e i pesi non c'erano, anche se il backup li esportava. In sostituzione i
  // tuoi pesi non finivano nel cestino e quelli del backup non arrivavano, e
  // l'app diceva "sostituzione completa".
  const i = srcApp.indexOf('async function applicaImportazione(');
  assert.ok(i >= 0, 'non trovo applicaImportazione');
  const corpo = srcApp.slice(i, i + 1200);
  assert.match(corpo, /Object\.keys\(t\)/,
    'la lista delle tabelle deve venire dal pacchetto: se è scritta a mano, '
    + 'la prossima tabella aggiunta al backup non viene importata');
  // e le tabelle nuove non ci sono piu' scritte a mano da nessuna parte
  assert.doesNotMatch(corpo, /\['esercizi', 'schede', 'versioni'/,
    'la lista scritta a mano non deve esserci piu\': è quella che si era scordata dei pesi');
});

test('T3. cambiare classe NON fa perdere le armature', () => {
  // Il difetto: `sbloccato` guardava i numeri COL bonus invece di quelli base. Tutti i
  // premi chiedono solo la forza, quindi Guerriero (forza 4 -> 5) sblocca l'armatura di
  // ferro e Assassino (resta a 4) non la sblocca piu': cambiando classe perdevi
  // quello che avevi gia' preso.
  const ESERCIZI = { chest: { id: 'c', nome: 'Chest Press', convenzione: 'per_braccio' } };
  const perId = (id) => (id === 'c' ? ESERCIZI.chest : null);
  // volume per far salire la forza base a 4 (1500 kg) e streak lunga
  const serie = [];
  for (let i = 0; i < 30; i++) serie.push({ id: 'v' + i, esercizio_id: 'c', peso: 50, ripetizioni: 10, stato: 'fatta' });
  const base = new Date(2026, 7, 31);
  const giorni = [];
  for (let sett = 0; sett < 10; sett++) {
    for (const dow of [2, 3, 5, 6]) {
      const d = new Date(base);
      d.setDate(d.getDate() + sett * 7 + (dow - 1));
      giorni.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  }
  const sedute = giorni.map((g, i) => ({ id: 's' + i, data: g, stato: 'completata' }));
  const profilo = { giorni_allenamento: [2, 3, 5, 6] };
  const oggi = giorni[giorni.length - 1];

  const guerriero = calcolaAvatar('guerriero', serie, sedute, perId, { profilo, oggi });
  const assassino = calcolaAvatar('assassino', serie, sedute, perId, { profilo, oggi });
  const berserker = calcolaAvatar('berserker', serie, sedute, perId, { profilo, oggi });

  const sbloccati = (r) => r.premi.filter((p) => p.sbloccato).map((p) => p.id).sort();
  const listaG = sbloccati(guerriero);
  assert.ok(listaG.length > 0, 'con quella forza e quella streak qualche armatura si sblocca');
  assert.deepEqual(sbloccati(assassino), listaG,
    'ASSASSINO DEVE AVERE LE STESSE ARMATURE del Guerriero: i premi non dipendono dalla classe');
  assert.deepEqual(sbloccati(berserker), listaG,
    'e anche il Berserker: cambiare classe non toglie un premio già preso');
  // il bonus resta visibile sulle statistiche, quindi la classe serve comunque
  assert.ok(guerriero.st.forza > assassino.st.forza,
    'il +20% del Guerriero sulla forza deve restare, quello è il punto della classe');
});

test('T4. le medaglie della streak usano il RECORD, non quella di adesso', () => {
  // Il difetto: `medaglie({... streak: Math.max(streak.giorni, 1)})`. Quindi 20 giorni di
  // fila, una settimana saltata, 4 giorni: la medaglia "Dieci di fila" spariva
  // (`ottenuta: false, mancano 6`), mentre nello stesso momento l'avatar RPG diceva
  // che il record era 20 e ti teneva le armature. Due numeri che si contraddicono.
  assert.match(srcGio, /streak\.record|streakPerMedaglie/,
    'statoAccount deve passare il record della streak alle medaglie');
  assert.doesNotMatch(srcGio, /streak: Math\.max\(streak\.giorni, 1\)/,
    'non deve passare la streak di adesso: un premio vinto non si toglie');
  // e il numero passato deve includere sia il record sia la streak corrente.
// Non si cerca la forma esatta della riga (che cambia a ogni refactoring) ma il
// fatto che il record entri nel massimo.
  const riga = srcGio.split('\n').find((l) => l.includes('streakPerMedaglie ='));
  assert.ok(riga, 'deve esserci una riga che calcola streakPerMedaglie');
  assert.match(riga, /streak\.record/, 'che includa il record della streak');
  assert.match(riga, /streak\.giorni/, 'e la streak di adesso');
  assert.match(riga, /Math\.max/, 'prendendo il massimo fra i due');
});

test('T5. db.salva rispetta lo stato di sincronizzazione che gli danno', () => {
  // Il difetto: finiva sempre `sync = 'da_salvare'` e `tentativi = 0`, quindi la sync
  // non poteva scrivere `in_corso` col contatore dei tentativi: il ritentativo non
  // poteva mai decidere di aspettare. Verificato prima: `sync: 'in_corso', tentativi: 3`
  // diventava `da_salvare`, `0`.
  assert.match(srcDb, /hoStato/,
    'salva deve distinguere "il chiamante ha scritto uno stato" da "mettimi in coda"');
  assert.match(srcDb, /completa\.sync = hoStato \? statoEsplicito : 'da_salvare'/,
    'e lo stato esplicito deve vincere');
  assert.doesNotMatch(srcDb, /completa\.sync = 'da_salvare';\s*\n\s*completa\.base_rev/,
    'non deve più forzare `da_salvare` cancellando quello che il chiamante ha scritto');
});

test('T6. il cardio non somma secondi con metri', () => {
  // Il difetto: sull'app minuti, secondi e metri stanno tutti nel campo delle
  // ripetizioni, e il codice li sommava. 1800 secondi di tapis davano agilità 1361 e
  // livello 37 da una seduta sola: una seduta sola che ti porta al livello 37 è il
  // segnale che il numero non è un numero.
  assert.equal(minutiDiCardio(30), 30, 'sotto 60 il numero sono minuti');
  assert.equal(minutiDiCardio(60), 1, 'da 60 in su sono secondi: 60 secondi = 1 minuto');
  assert.equal(minutiDiCardio(1800), 30, '1800 secondi = 30 minuti, non 1800');
  assert.equal(minutiDiCardio(5000), 0, 'sopra 3600 non è tempo: sono metri, e non è agilità');
  assert.equal(minutiDiCardio(0), 0, 'e zero resta zero');

  // e il caso vero sull'app: una seduta di cardio non deve mandarti al livello 37
  const ESERCIZI = { cardio: { id: 'c', nome: 'Tapis roulant', convenzione: 'tempo' } };
  const perId = (id) => (id === 'c' ? ESERCIZI.cardio : null);
  const r = calcolaAvatar(null, [{ id: 'a', esercizio_id: 'c', peso: 0, ripetizioni: 1800, stato: 'fatta' }],
    [], perId, { profilo: {} });
  assert.ok(r.livello <= 3,
    `1800 secondi di cardio non possono dare il livello ${r.livello}: è mezz'ora, non un mese`);
});

test('T7. le date IMPOSSIBILI vengono scartate', () => {
  // Il difetto: bastava che la data assomigliasse a una data, quindi "2026-13-45"
  // passava, finiva a schermo ("l'ultimo allenamento è stato il 2026-13-45") e
  // spostava la testa della lista dei giorni. E `backup.js` non valida le date delle
  // sedute, quindi un backup corrotto te le infila dentro.
  assert.equal(dataPossibile('2026-10-08'), true, 'una data vera passa');
  assert.equal(dataPossibile('2026-13-45'), false, 'mese 13 non esiste');
  assert.equal(dataPossibile('2026-02-30'), false, 'il 30 di febbraio non esiste');
  assert.equal(dataPossibile('2026-2-8'), false, 'il mese deve avere due cifre');
  assert.equal(dataPossibile(''), false, 'e la data vuota no');
  assert.equal(dataPossibile(null), false);
  // e una seduta con data impossibile non deve contare come allenamento
  const r = calcolaStreak([{ data: '2026-13-45', stato: 'completata' }], '2026-10-08', null);
  assert.equal(r.giorniAllenati.length, 0,
    `una data impossibile non è un allenamento: ${JSON.stringify(r.giorniAllenati)}`);
});

test('T8. l\'oggetto streak ha gli stessi campi con e senza sedute', () => {
  // Il difetto: senza sedute l'oggetto aveva otto chiavi invece di tredici (mancavano
  // record, fattoOggi, prossimoGiorno) e `prossimoObiettivo` era null invece di un
  // numero. Non rompeva niente perche' ogni consumatore faceva `Number(record) || 0`,
  // ma è la forma peggiore di difetto: due oggetti con lo stesso nome e forme diverse.
  // Il prossimo che scrive `record + 1` riceve NaN.
  const vuota = calcolaStreak([], '2026-10-08', null);
  const piena = calcolaStreak(
    [{ id: 's', data: '2026-10-08', stato: 'completata' }], '2026-10-08', null,
  );
  for (const campo of ['giorni', 'attiva', 'interrotta', 'fattoOggi', 'giorniAllenati',
    'ultimoGiorno', 'giorniPrevisti', 'prossimoGiorno', 'record', 'prossimoObiettivo', 'testo']) {
    assert.ok(campo in vuota, `senza sedute manca "${campo}"`);
    assert.ok(campo in piena, `con sedute manca "${campo}"`);
  }
  assert.equal(vuota.record, 0, 'e il record senza sedute è 0, non undefined');
  assert.equal(typeof vuota.prossimoObiettivo, 'number',
    'il prossimo obiettivo è un numero anche senza sedute: `null` a schermo stampa "null"');
  assert.equal(vuota.fattoOggi, false);
});

test('T9. la frase della streak usa la data che le viene passata', () => {
  // Il difetto: dentro la frase c'era un `new Date()`, quindi guardava il giorno
  // vero mentre `calcolaStreak` riceveva un altro "oggi". Verificato: con oggi =
  // giovedì 04/06 e giorni scelti lun/ven, diceva "ti torna lunedì" quando il giorno
  // giusto era venerdì. Nell'app non si vedeva (le schermate passano sempre la data
  // vera), ma il test passava per caso, non perché la frase fosse giusta.
  assert.match(srcStreak, /prossimoGiornoPrevistoTesto\(previsti, oggiISO\)/,
    'la frase deve ricevere la data della schermata, non costruirne una');
  assert.doesNotMatch(srcStreak, /function prossimoGiornoPrevistoTesto\(previsti\) \{[\s\S]{0,120}new Date\(\)/,
    'e dentro non ci deve essere un new Date(): è il difetto');
  // il caso vero: oggi = giovedì 2026-06-04, giorni scelti lunedì e venerdì
  const base = new Date(2026, 5, 1); // lunedì 1 giugno 2026
  const giorni = [];
  for (let sett = 0; sett < 3; sett++) {
    for (const dow of [1, 5]) {
      const d = new Date(base);
      d.setDate(d.getDate() + sett * 7 + (dow - 1));
      giorni.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  }
  const sedute = giorni.map((g, i) => ({ id: 's' + i, data: g, estado: 'completata', stato: 'completata' }));
  const r = calcolaStreak(sedute, '2026-06-04', { giorni_allenamento: [1, 5] });
  assert.match(r.testo, /venerd/i,
    `detto "oggi" = giovedì 4 giugno, il prossimo giorno scelto è venerdì. La frase dice: "${r.testo}"`);
});