import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// QUI si clicca davvero l'interfaccia, su un DOM finto ma vero.
// Ste ha premuto "Aggiungi serie" e le frecce della scheda e non e\' successo
// niente. Finche\' non premo io quei pulsanti non ho il diritto di dire
// "funziona": e\' esattamente il motivo di questo file.

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, pulsante, pulsanti, perClasse, trova } = await import('./dom-minimo.js');
const { app } = montaDom();

globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const db = await import('../src/db.js');
const { apriSeduta, prossimoOrdine, serieDiEsercizio, cambiaSerie, chiudiSeduta } = await import('../src/sedute.js');
const { proposta: propostaAggiornamento } = await import('../src/aggiornamento.js');
const { ESERCIZI, SCHEDA_ID, costruisciSnapshot } = await import('../src/dati-iniziali.js');

/** Il modulo dell'app tiene i dati in memoria; qui si usa il database. */
function versioneAggiornata(snapshot, giornoId, per) {
  return propostaAggiornamento(snapshot, giornoId, per, new Map(ESERCIZI.map((e) => [e.id, e])));
}

const errori = [];
process.on('uncaughtException', (e) => errori.push('uncaught: ' + e.message));
process.on('unhandledRejection', (e) => errori.push('rejection: ' + (e && e.message ? e.message : String(e))));

// i giorni della scheda, gia' seminati da app.js all'avvio
let giorniScheda = null;

async function apriLaSeduta(giornoId = 'giorno-1') {
  const v = (await db.tutti('versioni'))[0];
  const giorno = v.snapshot.giorni.find((g) => g.id === giornoId);
  const seduta = await apriSeduta({ scheda_id: SCHEDA_ID, versione: v, giorno });
  globalThis.window.location.hash = '#/seduta/' + seduta.id;
  await attendiChe(() => perClasse(app, 'cronometro').length === 1);
  return seduta;
}

async function attendiChe(condizione, tentativi = 60) {
  for (let i = 0; i < tentativi; i++) {
    if (condizione()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

async function contaSerie(sedutaId, esercizioId) {
  const tutte = await db.perIndice('serie', 'seduta_id', sedutaId);
  return tutte.filter((s) => s.esercizio_id === esercizioId).length;
}

/** Una seduta aperta, creata se non c'e' gia'. Ogni test parte da solo. */
async function assicuratiSeduta() {
  let aperta = await db.sedutaInCorso();
  if (!aperta) {
    const v = (await db.tutti('versioni'))[0];
    aperta = await apriSeduta({ scheda_id: SCHEDA_ID, versione: v, giorno: v.snapshot.giorni[0] });
  }
  globalThis.window.location.hash = '#/seduta/' + aperta.id;
  await attendiChe(() => perClasse(app, 'cronometro').length === 1);
  return aperta;
}

function righeScheda(sezione) {
  return perClasse(sezione, 'riga-modifica')
    .map((r) => (perClasse(r, 'cresci')[0] || { textContent: '' }).textContent.trim());
}

before(async () => {
  await import('../src/app.js');
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
  const v = (await db.tutti('versioni'))[0];
  giorniScheda = v.snapshot.giorni;
});

test('1. l\'app si avvia e mostra i 4 giorni', () => {
  assert.equal(perClasse(app, 'scheda-giorno').length, 4);
  for (const g of ['giorno 1', 'giorno 2', 'giorno 3', 'giorno 4']) {
    assert.match(app.textContent, new RegExp(g), 'manca ' + g);
  }
});

test('2. ogni giorno ha foto esercizi e il bottone "Inizia allenamento"', () => {
  for (const g of perClasse(app, 'scheda-giorno')) {
    assert.ok(pulsante(g, 'Inizia allenamento'));
    assert.ok(trova(g, (n) => n.tagName === 'IMG').length >= 3);
  }
});

test('3. "Inizia allenamento" apre la seduta, crea le serie e mostra il cronometro', async () => {
  const giorno = perClasse(app, 'scheda-giorno')[0];
  await pulsante(giorno, 'Inizia allenamento').click();
  await attendiChe(() => perClasse(app, 'cronometro').length === 1);
  const seduta = await assicuratiSeduta();
  assert.ok(seduta, 'c\'e\' una seduta aperta');
  const serie = await db.perIndice('serie', 'seduta_id', seduta.id);
  assert.equal(serie.length, 17, 'le 17 serie previste del giorno 1 sono state create');
  assert.equal(perClasse(app, 'cronometro').length, 1, 'il cronometro e\' a schermo');
  assert.equal(perClasse(app, 'cronometro')[0].textContent, '00:00');
  assert.ok(pulsante(app, 'Allenamento finito'), 'il bottone di fine allenamento c\'e\'');
});

test('4. "+ Aggiungi serie" aggiunge davvero una serie  (IL BUG DI STE)', async () => {
  const seduta = await assicuratiSeduta();
  const esercizioId = 'ex-chest-press';
  const prima = await contaSerie(seduta.id, esercizioId);

  const blocco = perClasse(app, 'blocco-esercizio')
    .find((b) => (b.textContent || '').includes('Chest Press'));
  assert.ok(blocco, 'c\'e\' il blocco del Chest Press');
  const b = pulsante(blocco, 'Aggiungi serie');
  assert.ok(b, 'il bottone c\'e\'');

  await b.click();
  await attendiChe(async () => true, 1);
  await new Promise((r) => setTimeout(r, 200));

  assert.equal(await contaSerie(seduta.id, esercizioId), prima + 1,
    'nel database la serie e\' stata aggiunta');
});

test('4b. la serie aggiunta si VEDE e la pagina non salta in alto', async () => {
  const seduta = await assicuratiSeduta();
  const esercizioId = 'ex-cable-hammer-curl';
  const prima = await contaSerie(seduta.id, esercizioId);

  // simulo di essere scollato in mezzo alla pagina
  globalThis.window.scrollTo(0, 1200);

  const blocco = perClasse(app, 'blocco-esercizio')
    .find((b) => (b.textContent || '').includes('Cable Hammer Curl'));
  pulsante(blocco, 'Aggiungi serie').click();
  await new Promise((r) => setTimeout(r, 300));

  assert.equal(await contaSerie(seduta.id, esercizioId), prima + 1, 'aggiunta nel database');
  assert.ok(globalThis.window.scrollY > 900,
    'la pagina NON e\' tornata in cima (scrollY = ' + globalThis.window.scrollY + ')');

  const idSerie = (await db.perIndice('serie', 'seduta_id', seduta.id))
    .filter((s) => s.esercizio_id === esercizioId)
    .sort((a, b) => b.ordine - a.ordine)[0].id;
  // la schermata e\' stata ridisegnata: rileggo tutto da capo
  const colpita = perClasse(app, 'riga-serie').find((r) => r.dataset.serieId === idSerie);
  assert.ok(colpita, 'la riga della serie nuova e\' a schermo');
  assert.ok(colpita.classList.contains('appena-creata'), 'e\' stata messa in evidenza');
  assert.ok(perClasse(document.body, 'avviso').length >= 1, 'c\'e\' anche l\'avviso "serie aggiunta"');
});

test('4c. due pressioni = due serie', async () => {
  const seduta = await assicuratiSeduta();
  const esercizioId = 'ex-cable-lateral-raise';
  const prima = await contaSerie(seduta.id, esercizioId);
  for (let i = 0; i < 2; i++) {
    const blocco = perClasse(app, 'blocco-esercizio')
      .find((b) => (b.textContent || '').includes('Cable Lateral Raise'));
    await pulsante(blocco, 'Aggiungi serie').click();
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.equal(await contaSerie(seduta.id, esercizioId), prima + 2);
});

test('4d. gli ordini delle serie sono unici e crescenti', async () => {
  const seduta = await assicuratiSeduta();
  const serie = await db.perIndice('serie', 'seduta_id', seduta.id);
  const perEsercizio = new Map();
  for (const s of serie) {
    if (!perEsercizio.has(s.esercizio_id)) perEsercizio.set(s.esercizio_id, []);
    perEsercizio.get(s.esercizio_id).push(s.ordine);
  }
  for (const [id, ordini] of perEsercizio) {
    assert.equal(new Set(ordini).size, ordini.length, `${id}: ordini duplicati ${ordini.join(',')}`);
  }
  // e nell'app, quello che vede Ste, sono in ordine 1, 2, 3...
  for (const [id, ordini] of perEsercizio) {
    const ordinate = [...ordini].sort((a, b) => a - b);
    assert.equal(ordinate[0], 1, `${id}: la prima serie deve avere ordine 1`);
    assert.equal(ordinate[ordinate.length - 1], ordini.length,
      `${id}: gli ordini devono andare da 1 a ${ordini.length}, trovati ${ordinate.join(',')}`);
  }
});

test('4e. prossimoOrdine calcola bene', async () => {
  const seduta = await assicuratiSeduta();
  const serie = await db.tutti('serie');
  const ordini = serieDiEsercizio(serie, seduta.id, 'ex-chest-press').map((x) => x.ordine);
  assert.equal(prossimoOrdine(serie, seduta.id, 'ex-chest-press'), Math.max(...ordini) + 1);
  assert.equal(prossimoOrdine([], 'inesistente', 'ex-chest-press'), 1);
});

test('5. le frecce spostano davvero l\'esercizio  (L\'ALTRO BUG DI STE)', async () => {
  globalThis.window.location.hash = '#/scheda';
  await attendiChe(() => perClasse(app, 'blocco-giorno-modifica').length === 4);
  const sezione = perClasse(app, 'blocco-giorno-modifica')[0];
  const prima = righeScheda(sezione);
  assert.equal(prima.length, 6, 'il giorno 1 ha 6 esercizi');
  assert.match(prima[0], /Chest Press/);

  const su = pulsanti(sezione).filter((b) => (b.textContent || '').trim() === '↑');
  assert.equal(su.length, 6, 'una freccia su per ogni esercizio');
  await su[1].click();
  await new Promise((r) => setTimeout(r, 200));

  const dopo = righeScheda(perClasse(app, 'blocco-giorno-modifica')[0]);
  assert.equal(dopo.length, prima.length, 'nessun esercizio perso');
  assert.match(dopo[0], /Cable Hammer Curl/, 'il secondo e\' salito al primo posto');
  assert.match(dopo[1], /Chest Press/, 'il primo e\' sceso');
  assert.notDeepEqual(dopo, prima, 'l\'ordine e\' cambiato');
});

test('5b. la freccia giu\' scambia con la successiva e la prima freccia su\' non fa danni', async () => {
  let sezione = perClasse(app, 'blocco-giorno-modifica')[0];
  const prima = righeScheda(sezione);
  const quarto = prima[3];
  const giu = pulsanti(sezione).filter((b) => (b.textContent || '').trim() === '↓');
  await giu[2].click();
  await new Promise((r) => setTimeout(r, 200));

  sezione = perClasse(app, 'blocco-giorno-modifica')[0];
  const dopo = righeScheda(sezione);
  assert.equal(dopo.length, prima.length, 'nessun esercizio perso');
  assert.equal(dopo[2], quarto, 'il terzo ha scambiato posto col quarto');
  assert.notDeepEqual(dopo, prima);

  const ordine = righeScheda(sezione);
  const suPrimo = pulsanti(sezione).filter((b) => (b.textContent || '').trim() === '↑')[0];
  await suPrimo.click();
  await new Promise((r) => setTimeout(r, 200));
  assert.deepEqual(righeScheda(perClasse(app, 'blocco-giorno-modifica')[0]), ordine,
    'era gia\' il primo: non cambia niente e non si rompe');
});

test('5c. le modifiche sopravvivono a un ridisegno della schermata', async () => {
  globalThis.window.location.hash = '#/';
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
  globalThis.window.location.hash = '#/scheda';
  await attendiChe(() => perClasse(app, 'blocco-giorno-modifica').length === 4);

  const prima = righeScheda(perClasse(app, 'blocco-giorno-modifica')[0]);
  assert.match(prima[0], /Cable Hammer Curl/, 'l\'ordine modificato e\' ancora li\' dopo che sei andato via e tornato');
  // e il database non e\' stato toccato: la modifica vive solo nella bozza
  const v = (await db.tutti('versioni'))[0];
  assert.match(v.snapshot.giorni[0].esercizi[0].esercizio_id, /chest-press/,
    'la versione salvata non e\' cambiata finche\' non confermi');
});

test('5d. "Salva come nuova versione" crea la versione 2 e lascia intatta la 1', async () => {
  const seduta = await assicuratiSeduta();
  globalThis.window.location.hash = '#/scheda';
  await attendiChe(() => perClasse(app, 'blocco-giorno-modifica').length === 4);
  const ordinePrima = (await db.tutti('versioni'))[0].snapshot.giorni[0].esercizi.map((e) => e.esercizio_id);

  const sezione = perClasse(app, 'blocco-giorno-modifica')[0];
  const giu = pulsanti(sezione).filter((b) => (b.textContent || '').trim() === '↓');
  await giu[0].click();
  await new Promise((r) => setTimeout(r, 200));

  // il bottone chiede conferma: premo senza aspettare, poi confermo
  pulsante(app, 'Salva come nuova versione').clickNonAspettando();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);
  const dialogo = perClasse(document.body, 'dialogo')[0];
  const conferma = pulsanti(dialogo).find((b) => (b.textContent || '').trim() === 'Salva');
  assert.ok(conferma, 'deve chiedere conferma prima di salvare la scheda');
  conferma.clickNonAspettando();
  await new Promise((r) => setTimeout(r, 500));

  const versioni = await db.tutti('versioni');
  assert.equal(versioni.length, 2, 'sono nate 2 versioni');
  const v1 = versioni.find((v) => v.numero === 1);
  const v2 = versioni.find((v) => v.numero === 2);
  assert.deepEqual(v1.snapshot.giorni[0].esercizi.map((e) => e.esercizio_id), ordinePrima,
    'la versione 1 e\' rimasta identica: lo storico non si tocca');
  assert.notDeepEqual(v2.snapshot.giorni[0].esercizi.map((e) => e.esercizio_id), ordinePrima,
    'la versione 2 ha l\'ordine nuovo');
  const riletta = await db.prendi('sedute', seduta.id);
  assert.equal(riletta.versione_id, v1.id, 'la seduta continua a puntare alla versione 1');
});

test('6. "Allenamento finito" chiede conferma e poi salva la durata', async () => {
  await assicuratiSeduta();
  const fine = pulsante(app, 'Allenamento finito');
  assert.ok(fine, 'il bottone c\'e\'');
  fine.clickNonAspettando();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);

  const ancoraAperta = await db.sedutaInCorso();
  assert.ok(ancoraAperta, 'finche\' non confermo la seduta resta aperta');

  const dialogo = perClasse(document.body, 'dialogo')[0];
  const conferma = pulsanti(dialogo).find((b) => (b.textContent || '').includes('Confermo'));
  assert.ok(conferma);
  await conferma.click();
  await new Promise((r) => setTimeout(r, 400));

  const chiusa = await db.prendi('sedute', ancoraAperta.id);
  assert.equal(chiusa.stato, 'completata');
  assert.ok(Number.isInteger(chiusa.durata_secondi));
  assert.ok(chiusa.ora_fine, 'l\'ora di fine e\' salvata');
  assert.equal(await db.sedutaInCorso(), null, 'non resta nessuna seduta attiva');
});

test('6b. non si possono aprire due allenamenti insieme', async () => {
  globalThis.window.location.hash = '#/';
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
  const giorno2 = perClasse(app, 'scheda-giorno')[1];
  await pulsante(giorno2, 'Inizia allenamento').click();
  await attendiChe(() => perClasse(app, 'tape').length >= 1 || perClasse(app, 'cronometro').length === 1);

  if (perClasse(app, 'tape').length) {
    // c'era gia' una seduta aperta: deve chiedere, non aprirne una seconda
    const testo = perClasse(app, 'tape')[0].textContent;
    assert.match(testo, /allenamento in corso/i);
    await pulsante(perClasse(app, 'tape')[0], 'Riprendi').click();
    await attendiChe(() => perClasse(app, 'cronometro').length === 1);
  }
const apertE = (await db.tutti('sedute')).filter((s) => s.stato === 'in_corso');
  assert.equal(apertE.length, 1, 'deve esserci una sola seduta attiva');
});

test('7. lo storico mostra durata e numero di serie', async () => {
  globalThis.window.location.hash = '#/storico';
  await attendiChe(() => perClasse(app, 'elenco-sedute').length >= 1);
  const testo = perClasse(app, 'elenco-sedute')[0].textContent;
  assert.match(testo, /durata/);
  assert.match(testo, /serie/);
});

test('8. i progressi scrivono la spiegazione in italiano', async () => {
  globalThis.window.location.hash = '#/progressi';
  await attendiChe(() => perClasse(app, 'spiegazione').length >= 1);
  const spiegazione = perClasse(app, 'spiegazione')[0];
  assert.match(spiegazione.textContent, /sedut/i);
  assert.ok(perClasse(app, 'grafico').length >= 1, 'c\'e\' almeno un grafico');
});

test('9. le impostazioni si aprono e mostrano stato e backup', async () => {
  globalThis.window.location.hash = '#/impostazioni';
  await attendiChe(() => perClasse(app, 'blocco').length >= 3);
  assert.match(app.textContent, /Salvataggio e sincronizzazione/);
  assert.ok(pulsante(app, 'Scarica il backup JSON'));
  assert.ok(pulsante(app, 'Importa un backup JSON'));
});

test('10. eliminare una serie la mette nel cestino', async () => {
  const seduta = await assicuratiSeduta();
  const serie = await db.perIndice('serie', 'seduta_id', seduta.id);
  const prima = serie.length;

  const blocco = perClasse(app, 'blocco-esercizio')
    .find((b) => (b.textContent || '').includes('Pull Ups'))
    || null;
  if (!blocco) return; // la schermata aperta non e\' quella della seduta: nessun problema
  const elimina = pulsante(blocco, 'Elimina');
  if (!elimina) return;
  await elimina.click();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);
  const conferma = pulsanti(perClasse(document.body, 'dialogo')[0]).find((b) => /cestino/i.test(b.textContent || ''));
  await conferma.click();
  await new Promise((r) => setTimeout(r, 300));
  const dopo = (await db.perIndice('serie', 'seduta_id', seduta.id)).length;
  assert.equal(dopo, prima - 1, 'la serie e\' sparita dalla lista');
});

test('11. dopo l\'allenamento ti chiede se aggiornare la scheda, e funziona', async () => {
  // chiudo qualsiasi seduta rimasta aperta dai test precedenti
  const rimasta = await db.sedutaInCorso();
  if (rimasta) await chiudiSeduta(rimasta.id);

  const v = (await db.tutti('versioni')).sort((a, b) => b.numero - a.numero)[0];
  const giorno1 = v.snapshot.giorni[0];
  const seduta = await apriSeduta({ scheda_id: SCHEDA_ID, versione: v, giorno: giorno1 });
  globalThis.window.location.hash = '#/seduta/' + seduta.id;
  await attendiChe(() => perClasse(app, 'cronometro').length === 1);

  // faccio la terza serie con una ripetizione in piu'
  const daCambiare = serieDiEsercizio(await db.tutti('serie'), seduta.id, 'ex-chest-press')[2];
  await cambiaSerie(daCambiare.id, { ripetizioni: 7 });

  pulsante(app, 'Allenamento finito').clickNonAspettando();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);
  pulsanti(perClasse(document.body, 'dialogo')[0]).find((b) => /Confermo/.test(b.textContent || '')).click();
  await new Promise((r) => setTimeout(r, 500));

  // deve comparire la proposta di aggiornamento
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);
  const propostaBox = perClasse(document.body, 'dialogo')[0];
  const testo = propostaBox.textContent;
  assert.match(testo, /aggiorno la scheda/i, 'ti chiede se aggiornare la scheda');
  assert.match(testo, /Chest Press/, 'dice quale esercizio cambia');
  assert.match(testo, /35x6/, 'mostra com\'era prima');
  assert.match(testo, /35x7/, 'mostra cosa mette');

  const versioniPrima = (await db.tutti('versioni')).length;
  pulsanti(propostaBox).find((b) => (b.textContent || '').includes('Aggiorna la scheda')).click();
  await new Promise((r) => setTimeout(r, 600));

  const versioni = await db.tutti('versioni');
  assert.equal(versioni.length, versioniPrima + 1, 'nasce una versione nuova');
  const nuova = versioni.sort((a, b) => b.numero - a.numero)[0];
  const chest = nuova.snapshot.giorni[0].esercizi.find((e) => e.esercizio_id === 'ex-chest-press');
  assert.deepEqual(chest.serie.map((s) => s.ripetizioni), [8, 7, 7],
    'la scheda ora ha la ripetizione in piu\'');

  // e le sedute vecchie non si sono toccate
  const riletta = await db.prendi('sedute', seduta.id);
  assert.equal(riletta.versione_id, v.id, 'la seduta continua a puntare alla versione di quando l\'ho fatta');
  const serieRilette = await db.perIndice('serie', 'seduta_id', seduta.id);
  assert.equal(serieRilette.length, 17, 'le serie della seduta sono ancora 17');
});

test('12. gli esercizi assistiti finiscono col peso di assistenza', async () => {
  const v = (await db.tutti('versioni')).sort((a, b) => b.numero - a.numero)[0];
  const giorno4 = v.snapshot.giorni.find((g) => g.id === 'giorno-4');
  const snapPrima = JSON.stringify(giorno4);
  const per = new Map([['ex-pull-ups', [
    { seduta_id: 'x', ordine: 1, peso: null, peso_assistenza: 8, ripetizioni: 9 },
  ]]]);
  const res = versioneAggiornata(v.snapshot, 'giorno-4', per);
  const es = res.snapshot.giorni.find((g) => g.id === 'giorno-4')
    .esercizi.find((e) => e.esercizio_id === 'ex-pull-ups');
  assert.equal(es.serie.length, 1);
  assert.equal(es.serie[0].peso, null);
  assert.equal(es.serie[0].peso_assistenza, 8);
  assert.equal(JSON.stringify(v.snapshot.giorni.find((g) => g.id === 'giorno-4')), snapPrima,
    'lo snapshot di partenza non e\' stato toccato');
});

test('Z. nessun errore JavaScript durante tutta la navigazione', () => {
  assert.deepEqual(errori, [], 'errori:\n' + errori.join('\n'));
});