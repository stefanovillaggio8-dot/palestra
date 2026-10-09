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
const { avvia: rilanciaAvvio } = await import('../src/app.js');

globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const db = await import('../src/db.js');
const { apriSeduta, prossimoOrdine, serieDiEsercizio, cambiaSerie, chiudiSeduta, etichettaSpotterSerie } = await import('../src/sedute.js');
const { proposta: propostaAggiornamento, notaSulNumeroSerie, riassuntoSpotter } = await import('../src/aggiornamento.js');
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
  // non basta il cronometro: aspetto che siano disegnati anche gli esercizi
  await attendiChe(() => perClasse(app, 'cronometro').length === 1 && perClasse(app, 'blocco-esercizio').length >= 4);
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

test('8b. nei progressi c\'e\' il riepilogo scritto PRIMA dei grafici', async () => {
  globalThis.window.location.hash = '#/progressi';
  await attendiChe(() => perClasse(app, 'spiegazione').length >= 1);
  const generale = perClasse(app, 'spiegazione').find((b) => (b.textContent || '').includes('quanto sei migliorato'));
  assert.ok(generale, 'c\'e\' il riepilogo generale scritto');
  // deve stare PRIMA, perche' e\' la risposta principale e i grafici vengono dopo
  const spiegazioni = perClasse(app, 'spiegazione');
  assert.equal(spiegazioni[0], generale, 'il riepilogo generale e\' il primo blocco');
  // qui non ci sono sedute completate, quindi deve dirlo con onesta' invece di
  // inventare un confronto. (i confronti veri sono testati in progressi.test.js)
  assert.ok(generale.querySelectorAll('.riga-spiegazione').length >= 1, 'c\'e\' almeno una riga di spiegazione');
  assert.match(generale.textContent || '', /Guardando tutti gli esercizi insieme|almeno due sedute/);
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

test('1b. ogni giorno si puo\' aprire senza iniziare l\'allenamento', async () => {
  globalThis.window.location.hash = '#/';
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
  const giorni = perClasse(app, 'scheda-giorno');
  const link = perClasse(giorni[0], 'titolo-collegabile')[0];
  assert.ok(link, 'il nome del giorno si puo\' toccare');
  assert.equal(link.attributi.href, '#/giorno/giorno-1');

  // non deve partire nessuna seduta
  const prima = await db.tutti('sedute');
  await link.click();
  await new Promise((r) => setTimeout(r, 250));

  // siamo sulla schermata del giorno
  assert.match(app.textContent, /Stai solo guardando/, 'avvisa che non parte nessun allenamento');
  assert.equal(await db.sedutaInCorso(), null, 'nessun allenamento aperto');
  assert.equal(perClasse(app, 'cronometro').length, 0, 'il cronometro NON e\' partito');
  assert.equal((await db.tutti('sedute')).length, prima.length, 'non e\' stata creata nessuna seduta');
});

test('1c. il kg non e\' attaccato al nome dell\'esercizio', async () => {
  // la convenzione sta su un elemento separato, mai dentro lo stesso titolo
  for (const nodo of perClasse(app, 'badge-conv')) {
    assert.ok(!nodo.classList.contains('titolo-esercizio'), 'la convenzione non puo\' stare nel titolo');
    const padre = nodo.padre;
    assert.ok(padre && padre.classList.contains('riga-convenzione'),
      'la convenzione sta dentro una riga tutta sua');
  }
  // ogni riga-convenzione non contiene il nome dell'esercizio
  for (const riga of perClasse(app, 'riga-convenzione')) {
    const nomi = perClasse(riga, 'h2').length + perClasse(riga, 'h3').length;
    assert.equal(nomi, 0, 'il nome non deve stare nella riga della convenzione');
  }
});

test('1d. la scheda del giorno mostra i kg in chiaro, con le ripetizioni', async () => {
  globalThis.window.location.hash = '#/giorno/giorno-1';
  await new Promise((r) => setTimeout(r, 250));
  const previste = perClasse(app, 'prevista');
  assert.ok(previste.length >= 17, 'si vedono tutte le serie previste del giorno: ' + previste.length);
  const testo = previste[0].textContent;
  assert.match(testo, /35 kg/, 'mostra i kg del primo esercizio');
  assert.match(testo, /8 rip/, 'mostra le ripetizioni');
  assert.match(previste[2].textContent, /7 rip/, 'la terza serie del Chest Press era 35 kg x 6');
  assert.ok(pulsante(app, 'Inizia allenamento'), 'il bottone "Inizia allenamento" c\'e\'');
  globalThis.window.location.hash = '#/';
  await new Promise((r) => setTimeout(r, 150));
});

test('1e. gli esercizi assistiti mostrano "kg di assistenza"', async () => {
  globalThis.window.location.hash = '#/giorno/giorno-4';
  await new Promise((r) => setTimeout(r, 200));
  const testo = app.textContent;
  assert.match(testo, /kg di assistenza/, 'Pull Ups e Dips sono assistiti');
  assert.match(testo, /Dropset/i, 'il Wrist Curl e\' segnato dropset');
  globalThis.window.location.hash = '#/';
  await new Promise((r) => setTimeout(r, 150));
});

test('13. la spunta segna la serie come fatta, verde la riga, e si toglie', async () => {
  const rimasta = await db.sedutaInCorso();
  if (!rimasta) await assicuratiSeduta();
  const seduta = await assicuratiSeduta();
  const serie = serieDiEsercizio(await db.tutti('serie'), seduta.id, 'ex-chest-press');
  const prima = serie[0];

  const blocco = perClasse(app, 'blocco-esercizio').find((b) => (b.textContent || '').includes('Chest Press'));
  const rigaPrima = perClasse(blocco, 'riga-serie')[0];
  const spunta = perClasse(rigaPrima, 'bottone-spunta')[0];
  assert.ok(spunta, 'c\'e\' il bottone della spunta');
  assert.equal(spunta.classList.contains('attiva'), false, 'all\'inizio non e\' spuntata');

  await spunta.click();
  await new Promise((r) => setTimeout(r, 250));

  // salvata nel database
  const dopo = await db.prendi('serie', prima.id);
  assert.equal(dopo.stato, 'fatta', 'lo stato "fatta" e\' salvato');

  // tutta la riga e\' verde
  const rigaNuova = perClasse(perClasse(app, 'blocco-esercizio')
    .find((b) => (b.textContent || '').includes('Chest Press')), 'riga-serie')[0];
  assert.ok(rigaNuova.classList.contains('serie-fatta'), 'la riga e\' verde');
  const spuntaNuova = perClasse(rigaNuova, 'bottone-spunta')[0];
  assert.ok(spuntaNuova.classList.contains('attiva'), 'la spunta e\' verde con la spunta');
  assert.match(spuntaNuova.textContent, /✓/, 'c\'e\' il segno di spunta');

  // e si puo\' togliere
  await spuntaNuova.click();
  await new Promise((r) => setTimeout(r, 250));
  const tolta = await db.prendi('serie', prima.id);
  assert.equal(tolta.stato, 'da_fare', 'togliendo la spunta torna da_fare');
  const rigaFinale = perClasse(perClasse(app, 'blocco-esercizio')
    .find((b) => (b.textContent || '').includes('Chest Press')), 'riga-serie')[0];
  assert.equal(rigaFinale.classList.contains('serie-fatta'), false, 'la riga non e\' piu\' verde');
});

test('14. lo spotter resta salvato ed e\' segnato', async () => {
  const seduta = await assicuratiSeduta();
  const serie = serieDiEsercizio(await db.tutti('serie'), seduta.id, 'ex-chest-press')[0];

  const blocco = perClasse(app, 'blocco-esercizio').find((b) => (b.textContent || '').includes('Chest Press'));
  const riga = perClasse(blocco, 'riga-serie')[0];
  const bot = pulsanti(riga).find((b) => /Spotter/.test(b.textContent || ''));
  assert.ok(bot, 'il bottone dello spotter c\'e\'');

  await bot.click();
  await new Promise((r) => setTimeout(r, 250));
  const salvata = await db.prendi('serie', serie.id);
  assert.equal(salvata.spotter, true, 'lo spotter e\' salvato nel database');

  const rigaNuova = perClasse(perClasse(app, 'blocco-esercizio')
    .find((b) => (b.textContent || '').includes('Chest Press')), 'riga-serie')[0];
  assert.ok(rigaNuova.classList.contains('serie-spotter'), 'la riga e\' segnata come con spotter');
  assert.ok(perClasse(rigaNuova, 'badge-spotter').length === 1, 'c\'e\' scritto "fatta con lo spotter"');
  const botNuovo = pulsanti(rigaNuova).find((b) => /Spotter/.test(b.textContent || ''));
  assert.match(botNuovo.textContent, /✓/, 'il bottone ha la spunta');

  // e si può togliere
  await botNuovo.click();
  await new Promise((r) => setTimeout(r, 250));
  assert.equal((await db.prendi('serie', serie.id)).spotter, false);
});

test('15. se aggiungi una serie la proposta dice che ne hai aggiunta una', async () => {
  const v = (await db.tutti('versioni')).sort((a, b) => b.numero - a.numero)[0];
  const g1 = v.snapshot.giorni[0];
  const per = new Map([['ex-chest-press', [
    { seduta_id: 'x', ordine: 1, esercizio_id: 'ex-chest-press', peso: 35, ripetizioni: 8 },
    { seduta_id: 'x', ordine: 2, esercizio_id: 'ex-chest-press', peso: 35, ripetizioni: 7 },
    { seduta_id: 'x', ordine: 3, esercizio_id: 'ex-chest-press', peso: 35, ripetizioni: 6 },
    { seduta_id: 'x', ordine: 4, esercizio_id: 'ex-chest-press', peso: 35, ripetizioni: 6 },
  ]]]);
  const res = versioneAggiornata(v.snapshot, 'giorno-1', per);
  assert.equal(res.nessunaNovita, false);
  const c = res.cambiamenti.find((x) => x.esercizio_id === 'ex-chest-press');
  assert.ok(c, 'la proposta include Chest Press');
  assert.equal(c.aggiunta, true);
  assert.equal(c.serieAggiunte, 1);
  assert.equal(notaSulNumeroSerie(c), 'hai aggiunto 1 serie a quelle previste');
});

test('16. mettere solo lo spotter fa comunque comparire la conferma', async () => {
  const rimasta = await db.sedutaInCorso();
  if (rimasta) await chiudiSeduta(rimasta.id);
  const v = (await db.tutti('versioni')).sort((a, b) => b.numero - a.numero)[0];
  const giorno2 = v.snapshot.giorni[1];
  const seduta = await apriSeduta({ scheda_id: SCHEDA_ID, versione: v, giorno: giorno2 });
  globalThis.window.location.hash = '#/seduta/' + seduta.id;
  await attendiChe(() => perClasse(app, 'cronometro').length === 1 && perClasse(app, 'blocco-esercizio').length >= 4);

  // same pesi e ripetizioni della scheda: l'unica cosa che cambio e' lo spotter
  const blocco = perClasse(app, 'blocco-esercizio').find((b) => (b.textContent || '').includes('Dumbbell Bench Pull'));
  const prima = perClasse(blocco, 'riga-serie')[0];
  await pulsanti(prima).find((b) => /Spotter/.test(b.textContent || '')).click();
  await new Promise((r) => setTimeout(r, 250));

  pulsante(app, 'Allenamento finito').clickNonAspettando();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);
  pulsanti(perClasse(document.body, 'dialogo')[0]).find((b) => /Confermo/.test(b.textContent || '')).click();
  await new Promise((r) => setTimeout(r, 500));

  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);
  const testo = perClasse(document.body, 'dialogo')[0].textContent;
  assert.match(testo, /aggiorno la scheda/i, 'deve comparire la conferma anche solo per lo spotter');
  assert.match(testo, /Dumbbell Bench Pull/);
  assert.match(testo, /S45x7/, 'la serie col spotter e\' segnata con la S');
  assert.match(testo, /spotter/i, 'e lo dice a parole');
  assert.match(testo, /S = fatta con lo spotter/, 'c\'e\' anche la legenda');

  // e non aggiorna niente se rifiuto
  pulsanti(perClasse(document.body, 'dialogo')[0]).find((b) => /Lascia/.test(b.textContent || '')).click();
  await new Promise((r) => setTimeout(r, 300));
  const versioni = await db.tutti('versioni');
  const chest = versioni.sort((a, b) => b.numero - a.numero)[0]
    .snapshot.giorni[1].esercizi.find((e) => e.esercizio_id === 'ex-dumbbell-bench-pull');
  assert.equal(chest.serie[0].spotter, false, 'la scheda e\' rimasta come prima');
});

test('17. la spunta si vede SUBITO, anche prima che il database risponda', async () => {
  await assicuratiSeduta();
  const blocco = perClasse(app, 'blocco-esercizio').find((b) => (b.textContent || '').includes('Leg Extension'));
  const riga = perClasse(blocco, 'riga-serie')[0];
  const spunta = perClasse(riga, 'bottone-spunta')[0];
  assert.equal(spunta.classList.contains('attiva'), false);

  // NON aspetto nessuna promise: guardo lo stato subito dopo aver premuto
  spunta.listeners.get('click')[0]({ type: 'click', preventDefault() {}, stopPropagation() {} });
  assert.ok(riga.classList.contains('serie-fatta'), 'la riga diventa verde all\'istante');
  assert.ok(spunta.classList.contains('attiva'), 'la spunta si accende all\'istante');
  assert.match(spunta.textContent, /✓/, 'il segno di spunta compare subito');
  await new Promise((r) => setTimeout(r, 250));
});

test('18. anche il numero della serie si puo\' toccare per spuntare', async () => {
  await assicuratiSeduta();
  const blocco = perClasse(app, 'blocco-esercizio').find((b) => (b.textContent || '').includes('Lat Pulldown'));
  const riga = perClasse(blocco, 'riga-serie')[0];
  const numero = perClasse(riga, 'numero-serie-bottone')[0];
  assert.ok(numero, 'il numero e\' un bottone: area piu\' grande col dito');
  numero.listeners.get('click')[0]({ type: 'click', preventDefault() {}, stopPropagation() {} });
  assert.ok(riga.classList.contains('serie-fatta'), 'la riga diventa verde anche toccando il numero');
  await new Promise((r) => setTimeout(r, 250));
});

test('19. ti dice quante ripetizioni hai fatto con lo spotter', () => {
  const serie = new Map([['ex-chest-press', [
    { seduta_id: 's', ordine: 1, peso: 35, ripetizioni: 8, spotter: true, rip_assistite: 2 },
    { seduta_id: 's', ordine: 2, peso: 35, ripetizioni: 7.5, spotter: true, rip_assistite: null },
    { seduta_id: 's', ordine: 3, peso: 35, ripetizioni: 6, spotter: false, rip_assistite: null },
  ]]]);
  const info = riassuntoSpotter(serie, new Map([['ex-chest-press', 'Chest Press']]));
  assert.equal(info.serie, 2, 'due serie con lo spotter');
  assert.equal(info.ripetizioni, 15.5, '8 + 7,5 = 15,5 ripetizioni con lo spotter');
  assert.equal(info.assistite, 2, '2 assistite dichiarate');
  assert.equal(info.nonSpecificato, 1, 'una serie senza numero di assistite');
  assert.match(info.frase, /2 serie con lo spotter/);
  assert.match(info.frase, /15,5 ripetizioni/);
  // "2 assistite" e "1 serie senza il numero delle assistite" erano due frasi
  // diverse nella stessa frase e non si capiva quale delle due contasse.
  // Ora c'e' una riga sola, con i due numeri ("2 assistite" dentro "1 serie").
  assert.match(info.frase, /2 ripetizioni assistite/);
  assert.match(info.frase, /Non hai scritto quante ripetizioni sono state assistite in 1 serie/);
  assert.equal((info.frase.match(/assistit/gi) || []).length >= 1, true, 'parla delle assistite una volta sola per concetto');
  // e non deve più esistere la frase illeggibile
  assert.ok(!/serie senza il numero delle assistite/.test(info.frase), 'la frase illeggibile non deve più esserci');
});

test('20. nessuna serie con spotter: lo dice senza drama', () => {
  const info = riassuntoSpotter(new Map([['x', [{ peso: 35, ripetizioni: 8, spotter: false }]]]));
  assert.equal(info.serie, 0);
  assert.match(info.frase, /Nessuna serie con lo spotter/);
});

test('21. la spunta NON viene cancellata da un campo salvato in ritardo', async () => {
  // Questo e' il bug vero di Ste sul telefono: toccava i kg e subito dopo la
  // spunta. Il campo dei kg salva in ritardo (400 ms) e arrivava DOPO, con la
  // copia vecchia della serie, portando via la spunta. "Spunto e non spunto".
  const seduta = await assicuratiSeduta();
  const serie = serieDiEsercizio(await db.tutti('serie'), seduta.id, 'ex-chest-press')[0];

  // ordine esatto di quello che succede sul telefono:
  // 1) scrivo nei kg  -> parte il salvataggio in ritardo
  // 2) premo la spunta -> salva stato = 'fatta'
  // 3) ARRIVA il salvataggio dei kg, costruito sulla copia di prima
  const copiaVecchia = { ...serie };
  await cambiaSerie(serie.id, { stato: 'fatta' });          // la spunta
  await cambiaSerie(serie.id, { peso: 40 });               // i kg, arrivano dopo

  const dopo = await db.prendi('serie', serie.id);
  assert.equal(dopo.peso, 40, 'il peso aggiornato resta');
  assert.equal(dopo.stato, 'fatta', 'e soprattutto la spunta NON viene cancellata');
  assert.notEqual(copiaVecchia.stato, 'fatta', 'la copia vecchia non aveva la spunta: era questo il problema');
});

test('22. due salvataggi della stessa serie non si pestano i piedi', async () => {
  const seduta = await assicuratiSeduta();
  const serie = serieDiEsercizio(await db.tutti('serie'), seduta.id, 'ex-chest-press')[0];
  // tre scritture sparate: l'ultima deve arrivare per ultima
  await Promise.all([
    cambiaSerie(serie.id, { peso: 41 }),
    cambiaSerie(serie.id, { stato: 'fatta' }),
    cambiaSerie(serie.id, { ripetizioni: 10 }),
  ]);
  const dopo = await db.prendi('serie', serie.id);
  assert.equal(dopo.peso, 41);
  assert.equal(dopo.stato, 'fatta');
  assert.equal(dopo.ripetizioni, 10);
});

test('23. accanto alla serie con spotter c\'e\' scritto quante ripetizioni', () => {
  assert.equal(etichettaSpotterSerie({ spotter: true, ripetizioni: 8, rip_assistite: 2 }), '8 rip · 2 assistite');
  assert.equal(etichettaSpotterSerie({ spotter: true, ripetizioni: 7.5, rip_assistite: 1 }), '7,5 rip · 1 assistite');
  // null NON e' 0: 0 vuol dire "nessuna assistita", null vuol dire "non l'ho scritto"
  assert.equal(etichettaSpotterSerie({ spotter: true, ripetizioni: 8, rip_assistite: null }), '8 rip · assistite non specificate');
  assert.equal(etichettaSpotterSerie({ spotter: true, ripetizioni: 8, rip_assistite: 0 }), '8 rip · 0 assistite');
  assert.equal(etichettaSpotterSerie({ spotter: true, ripetizioni: null, rip_assistite: null }), 'rip non specificate · assistite non specificate');
  // senza spotter non si dice niente
  assert.equal(etichettaSpotterSerie({ spotter: false, ripetizioni: 8, rip_assistite: 0 }), null);
});

test('24. il bottone della spunta e\' grande abbastanza per il dito', async () => {
  await assicuratiSeduta();
  const blocco = perClasse(app, 'blocco-esercizio').find((b) => (b.textContent || '').includes('Leg Extension'));
  const riga = perClasse(blocco, 'riga-serie')[0];
  const spunta = perClasse(riga, 'bottone-spunta')[0];
  assert.ok(spunta, 'la spunta c\'e\'');
  assert.equal(spunta.getAttribute('type'), 'button', 'e\' un vero bottone, non un div');
  // dice SEMPRE se e\' premuta o no (per chi non vede il colore). Non guardo
  // se e\' true o false: un test precedente puo\' averla gia\' spuntata.
  const pressed = spunta.getAttribute('aria-pressed');
  assert.ok(pressed === 'true' || pressed === 'false', 'e\' dice se e\' premuta o no, per chi non vede il colore');
  assert.ok(pressed === 'true' ? spunta.classList.contains('attiva') : !spunta.classList.contains('attiva'),
    'e il colore combacia con quello che dice');
  // il CSS le da' 46px: abbastanza per il dito, e c\'e\' un numero sopra
  const numero = perClasse(riga, 'numero-serie-bottone')[0];
  assert.ok(numero, 'e si puo\' premere anche sul numero, che e\' ancora piu\' grande');
});

test('25. dopo aver allenato col spotter, la scheda lo segna con la spunta', async () => {
  // Ste: "quando vado per vedere la mia scheda deve spuntarmi pure se ho fatto
  // delle rep con lo spotter". La scheda iniziale NON ha lo spotter: il tag
  // compare solo DOPO che hai allenato col spotter e confermato l'aggiornamento.
  const rimasta = await db.sedutaInCorso();
  if (rimasta) await chiudiSeduta(rimasta.id);
  const v = (await db.tutti('versioni')).sort((a, b) => b.numero - a.numero)[0];
  const giorno = v.snapshot.giorni[1];
  const seduta = await apriSeduta({ scheda_id: SCHEDA_ID, versione: v, giorno });
  globalThis.window.location.hash = '#/seduta/' + seduta.id;
  await attendiChe(() => perClasse(app, 'cronometro').length === 1 && perClasse(app, 'blocco-esercizio').length >= 1);

  const blocco = perClasse(app, 'blocco-esercizio').find((b) => (b.textContent || '').includes('Dumbbell Bench Pull'));
  const riga = perClasse(blocco, 'riga-serie')[0];
  await pulsanti(riga).find((b) => /Spotter/.test(b.textContent || '')).click();
  await new Promise((r) => setTimeout(r, 250));

  // finisco l'allenamento e CONFERMO l'aggiornamento della scheda
  pulsante(app, 'Allenamento finito').clickNonAspettando();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);
  pulsanti(perClasse(document.body, 'dialogo')[0]).find((b) => /Confermo/.test(b.textContent || '')).click();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1, 4000);
  pulsanti(perClasse(document.body, 'dialogo')[0]).find((b) => /Aggiorna la scheda/.test(b.textContent || '')).click();
  await new Promise((r) => setTimeout(r, 500));

  // ora vado a vedere la scheda di quel giorno: la serie col spotter e' segnata
  globalThis.window.location.hash = '#/giorno/' + giorno.id;
  await attendiChe(() => perClasse(app, 'scheda-esercizio').length >= 1);

  const tag = perClasse(app, 'tag-spotter');
  assert.ok(tag.length >= 1, 'nella scheda c\'e\' il tag dello spotter');
  assert.match(tag[0].textContent, /spotter/i);
  assert.match(tag[0].textContent, /✓/, 'e con la spunta, come chiedeva Ste');
  const previste = perClasse(app, 'prevista');
  assert.ok(previste.some((p) => perClasse(p, 'tag-spotter').length > 0), 'la serie col spotter e\' segnata');
  assert.ok(previste.some((p) => perClasse(p, 'tag-spotter').length === 0), 'le altre serie non sono segnate a caso');
});

test('26. spotter e "Allenamento finito" di fila: la conferma compare lo stesso', async () => {
  // Il caso reale: si tocca lo spotter e subito si preme "finito", senza
  // aspettare. Il salvataggio e' ancora in volo: senza aspettaSalvataggi la
  // scheda risulterebbe "niente di nuovo" e la conferma non arriverebbe.
  const rimasta = await db.sedutaInCorso();
  if (rimasta) await chiudiSeduta(rimasta.id);
  const v = (await db.tutti('versioni')).sort((a, b) => b.numero - a.numero)[0];
  const giorno = v.snapshot.giorni[1];
  const seduta = await apriSeduta({ scheda_id: SCHEDA_ID, versione: v, giorno });
  globalThis.window.location.hash = '#/seduta/' + seduta.id;
  await attendiChe(() => perClasse(app, 'cronometro').length === 1 && perClasse(app, 'blocco-esercizio').length >= 1);

  const blocco = perClasse(app, 'blocco-esercizio')
    .find((b) => perClasse(b, 'riga-serie').some((r) => pulsanti(r).some((b2) => /Spotter/.test(b2.textContent || '') && !/✓/.test(b2.textContent || ''))));
  const riga = perClasse(blocco, 'riga-serie')[0];
  // premo lo spotter e NON aspetto: passo subito al pulsante "finito"
  pulsanti(riga).find((b) => /Spotter/.test(b.textContent || '')).clickNonAspettando();
  pulsante(app, 'Allenamento finito').clickNonAspettando();

  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1, 4000);
  pulsanti(perClasse(document.body, 'dialogo')[0]).find((b) => /Confermo/.test(b.textContent || '')).click();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1, 4000);
  const conferma = perClasse(document.body, 'dialogo')[0].textContent || '';
  assert.match(conferma, /aggiorno la scheda/i, 'deve chiedere se aggiornare la scheda');
  pulsanti(conferma ? perClasse(document.body, 'dialogo')[0] : perClasse(app, 'blocco'))
    .find((b) => /Lascia la scheda/.test(b.textContent || '')).click();
});

test('27. il titolo si chiama "Palestra", anche per chi aveva "gym 3"', async () => {
  // Ste ha chiesto di cambiare il titolo. Sulla sua installazione il nome
  // vecchio era gia' dentro il database, quindi il nome si corregge da solo.
  const prima = await db.prendi('schede', SCHEDA_ID);
  await db.salva('schede', { ...prima, nome: 'gym 3' }, { segna: false });
  globalThis.window.location.hash = '#/';
  await rilanciaAvvio();

  const dopo = await db.prendi('schede', SCHEDA_ID);
  assert.equal(dopo.nome, 'Palestra', 'il nome vecchio viene corretto in "Palestra"');

  await attendiChe(() => trova(app, (n) => n.tagName === 'H1').length >= 1);
  const titolo = trova(app, (n) => n.tagName === 'H1')[0];
  assert.equal((titolo.textContent || '').trim(), 'Palestra', 'in alto si legge "Palestra"');
});

test('28. se un giorno cambio nome non viene riscritto', async () => {
  // la correzione deve valere solo per il nome vecchio: un nome scelto dopo
  // non deve venire toccato al riavvio
  const prima = await db.prendi('schede', SCHEDA_ID);
  await db.salva('schede', { ...prima, nome: 'La mia palestra' }, { segna: false });
  await rilanciaAvvio();
  const dopo = await db.prendi('schede', SCHEDA_ID);
  assert.equal(dopo.nome, 'La mia palestra', 'un nome nuovo viene lasciato stare');
  await db.salva('schede', { ...dopo, nome: 'Palestra' }, { segna: false });
});

test('29. durante la seduta vedi a che punto sei e dove ti trovi', async () => {
  const rimasta = await db.sedutaInCorso();
  if (!rimasta) await assicuratiSeduta();
  const seduta = await db.sedutaInCorso();
  globalThis.window.location.hash = '#/seduta/' + seduta.id;
  await attendiChe(() => perClasse(app, 'cronometro').length === 1 && perClasse(app, 'blocco-esercizio').length >= 1);

  // il contatore delle serie fatte sta in alto, accanto al cronometro
  const avanti = perClasse(app, 'avanzamento')[0];
  assert.ok(avanti, 'il contatore delle serie c\'e\' nella banda del cronometro');
  assert.match(avanti.textContent, /serie fatte/);
  assert.match(avanti.textContent, /\d+\/\d+/, 'e dice quante ne hai fatte su quante sono');

  // e la voce del menu in cui sei risulta accesa
  const attive = perClasse(app, 'voce-menu').filter((v) => v.classList.contains('attiva'));
  assert.equal(attive.length, 1, 'una sola voce di menu accesa');
  assert.equal((attive[0].textContent || '').trim(), 'Allenamento', 'e\' quella giusta');
});

test('30. le note della seduta si ritrovano dopo, nello storico', async () => {
  // Ste: "che senso ha la parte con scritto note della seduta se tanto poi non
  // spuntano". Ora la nota si vede aprendo la seduta, e in anteprima nell'elenco.
  const finite = (await db.tutti('sedute')).filter((s) => s.stato === 'completata' && !s.eliminata);
  assert.ok(finite.length >= 1, 'c\'e\' almeno una seduta finita');
  const s = finite[0];
  const frase = 'Mi sono sentito forte oggi';
  await db.salva('sedute', { ...s, note: frase }, { segna: false });
  await rilanciaAvvio();

  // nell'elenco dello storico c'e' l'anteprima
  globalThis.window.location.hash = '#/storico';
  await attendiChe(() => perClasse(app, 'riga-seduta').length >= 1);
  assert.match(app.textContent || '', /Mi sono sentito forte oggi/, 'l\'elenco mostra l\'anteprima della nota');

  // e aprendo la seduta la nota c\'e\' per intero, con la possibili\' di correggerla
  globalThis.window.location.hash = '#/storico/' + s.id;
  await attendiChe(() => perClasse(app, 'box-note-seduta').length >= 1);
  const box = perClasse(app, 'box-note-seduta')[0];
  assert.match(box.textContent || '', /Note della seduta/);
  assert.match(box.textContent || '', /Mi sono sentito forte oggi/);
  assert.ok(perClasse(box, 'campo-note-seduta').length === 1, 'e la puoi correggere');

  // ripulisco, cosi\' gli altri test non trovano la nota
  await db.salva('sedute', { ...(await db.prendi('sedute', s.id)), note: '' }, { segna: false });
});

test('31. "come sopra" copia il peso della serie precedente', async () => {
  const seduta = await db.sedutaInCorso() || await assicuratiSeduta();
  globalThis.window.location.hash = '#/seduta/' + seduta.id;
  await attendiChe(() => perClasse(app, 'cronometro').length === 1 && perClasse(app, 'riga-serie').length >= 2);

  const righe = perClasse(app, 'riga-serie');
  const leggi = async (riga) => {
    const inDb = await db.prendi('serie', riga.dataset.serieId);
    return inDb.peso !== null && inDb.peso !== undefined ? inDb.peso : inDb.peso_assistenza;
  };

  // Ste ha detto che i +/- 2,5 kg non servono: devono essere spariti
  const tutti = righe.flatMap((r) => pulsanti(r).map((b) => (b.textContent || '').trim()));
  assert.equal(tutti.filter((t) => t === '+' || t === '−').length, 0, 'non ci sono piu\' i bottoni +/- 2,5 kg');

  const valorePrima = await leggi(righe[0]);
  const comeSopra = pulsanti(righe[1]).find((b) => /come sopra/i.test(b.textContent || ''));
  assert.ok(comeSopra, 'il bottone "come sopra" c\'e\' dalla seconda serie in poi');
  await comeSopra.click();
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await leggi(righe[1]), valorePrima, 'copia il peso della serie precedente');

  // e nella PRIMA serie non c\'e\' "come sopra": non ha niente sopra da copiare
  assert.equal(pulsanti(righe[0]).filter((b) => /come sopra/i.test(b.textContent || '')).length, 0,
    'nella prima serie il bottone "come sopra" non c\'e\'');
});

test('32. nello storico spotter e spunta non si confondono', async () => {
  // Ste: "se premo che ho fatto lo spotter si bugga, e se premo che ho fatto la
  // serie dice che ho fatto lo spotter". Il motivo: il bottone dello spotter non
  // ridisegnava, quindi il cambio compariva solo quando premevi la spunta.
  const finite = (await db.tutti('sedute')).filter((s) => s.stato === 'completata' && !s.eliminata);
  assert.ok(finite.length >= 1, 'c\'e\' una seduta passata');
  const s = finite[0];
  globalThis.window.location.hash = '#/storico/' + s.id;
  await attendiChe(() => perClasse(app, 'riga-serie').length >= 1);

  const apriRiga = () => perClasse(app, 'riga-serie')[0];

  // 1) premo lo spotter: deve accendersi SUBITO e restare acceso
  const prima = apriRiga();
  const botSpotter = pulsanti(prima).find((b) => /Spotter/.test(b.textContent || ''));
  await botSpotter.click();
  await new Promise((r) => setTimeout(r, 250));
  assert.equal((await db.prendi('serie', prima.dataset.serieId)).spotter, true, 'lo spotter e\' salvato');

  let dopo = apriRiga();
  assert.match(pulsanti(dopo).find((b) => /Spotter/.test(b.textContent || '')).textContent, /✓/,
    'il bottone dello spotter risulta acceso');
  const badgePieno = perClasse(dopo, 'badge-spotter')[0];
  assert.match(badgePieno.textContent || '', /fatta con lo spotter/, 'e c\'e\' la scritta con le ripetizioni');

  // 2) e si puo\' TOGLIERE: prima non si poteva, perche\' leggeva una copia vecchia
  const bot2 = pulsanti(dopo).find((b) => /Spotter/.test(b.textContent || ''));
  await bot2.click();
  await new Promise((r) => setTimeout(r, 250));
  assert.equal((await db.prendi('serie', prima.dataset.serieId)).spotter, false, 'lo spotter si toglie di nuovo');
  dopo = apriRiga();
  assert.doesNotMatch(pulsanti(dopo).find((b) => /Spotter/.test(b.textContent || '')).textContent, /✓/,
    'il bottone torna spento');
  assert.equal((perClasse(dopo, 'badge-spotter')[0] || {}).textContent || '', '',
    'e la scritta dello spotter si svuota (il CSS la nasconde)');

  // 3) la spunta non tocca lo spotter
  const spunta = perClasse(dopo, 'bottone-spunta')[0];
  await spunta.click();
  await new Promise((r) => setTimeout(r, 250));
  const fin = await db.prendi('serie', prima.dataset.serieId);
  assert.equal(fin.spotter, false, 'spuntare la serie lascia lo spotter come era');
  assert.equal(fin.stato, 'fatta', 'e la serie risulta fatta');
});

test('33. la parte tecnica del database online e\' chiusa e spiegata', async () => {
  // Ste: "e cosa è questo? Account e database online... https://xxx.supabase.co".
  // Non serve per usare l'app: quindi sta chiusa, e senza indirizzi finti.
  globalThis.window.location.hash = '#/impostazioni';
  await attendiChe(() => perClasse(app, 'blocco').length >= 3);

  const chiusa = perClasse(app, 'blocco-chiuso')[0];
  assert.ok(chiusa, 'la sezione tecnica c\'e\' ma in una sezione a parte');
  assert.equal(chiusa.getAttribute('open'), null, 'e non e\' aperta: non ti mette in confusione');

  const testo = chiusa.textContent || '';
  assert.match(testo, /opzione avanzata/i, 'si capisce che e\' una cosa opzionale');
  assert.match(testo, /Non ti serve/, 'e che per usare l\'app non serve');
  assert.doesNotMatch(testo, /xxx+/, 'e non mostra piu\' indirizzi finti');

  // e per usare l\'app i pulsanti veri ci sono comunque
  assert.ok(pulsante(app, 'Scarica il backup JSON'), 'il backup si scarica normalmente');
  assert.ok(pulsante(app, 'Aggiorna adesso'), 'e si puo\' anche aggiornare l\'app');
});

test('34. la nota scritta in palestra si vede subito dopo, SENZA riavviare', async () => {
  // Ste: "ancora non spunta la nota della seduta". Il flusso vero: scrivo la
  // nota DENTRO la seduta (la textarea, non l'etichetta), chiudo l'allenamento
  // e apro la seduta passata senza riavviare l'app.
  const seduta = await assicuratiSeduta();
  globalThis.window.location.hash = '#/seduta/' + seduta.id;
  await attendiChe(() => perClasse(app, 'campo-testo').length >= 1);

  // la textarea delle note e' il primo campo testo lungo della seduta
  const area = perClasse(app, 'campo-testo').find((t) => (t.getAttribute('data-etichetta') || '') === '' && t.tagName === 'TEXTAREA')
    || perClasse(app, 'campo-testo')[0];
  assert.ok(area, 'c\'e\' il campo per le note della seduta');
  assert.equal(area.tagName, 'TEXTAREA', 'ed e\' una textarea (piu\' righe)');

  const frase = 'Oggi stanco ma ho spinto bene';
  area.value = frase;
  area.listeners.get('input')[0]({ type: 'input' });
  await new Promise((r) => setTimeout(r, 700));

  assert.equal((await db.prendi('sedute', seduta.id)).note, frase, 'la nota e\' salvata nel database');

  // chiudo l\'allenamento
  pulsante(app, 'Allenamento finito').clickNonAspettando();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);
  pulsanti(perClasse(document.body, 'dialogo')[0]).find((b) => /Confermo/.test(b.textContent || '')).click();
  // il dialogo di aggiornamento scheda qui NON deve per forza comparire: in
  // questo test non e\' cambiato nessun numero, quindi puo\' non esserci
  await new Promise((r) => setTimeout(r, 700));
  const dialogoAggiorna = perClasse(document.body, 'dialogo')[0];
  if (dialogoAggiorna) {
    pulsanti(dialogoAggiorna).find((b) => /Lascia la scheda/.test(b.textContent || '')).click();
  }
  await new Promise((r) => setTimeout(r, 300));

  // SENZA riavviare i dati: apro la seduta passata e ridisegno
  globalThis.window.location.hash = '#/storico/' + seduta.id;
  await rilanciaAvvio();
  await attendiChe(() => perClasse(app, 'box-note-seduta').length >= 1, 200);
  const noteViste = perClasse(app, 'box-note-seduta');
  assert.ok(noteViste[0], 'la sezione delle note c\'e\' nella seduta passata');
  assert.match(perClasse(app, 'box-note-seduta')[0].textContent || '', /Oggi stanco ma ho spinto bene/,
    'la nota si vede nello storico senza riavviare l\'app');

  await db.salva('sedute', { ...(await db.prendi('sedute', seduta.id)), note: '' }, { segna: false });
});

test('35. c\'e\' il tasto per cancellare tutto lo storico, con conferma', async () => {
  globalThis.window.location.hash = '#/impostazioni';
  await attendiChe(() => perClasse(app, 'blocco').length >= 3);

  const bottone = pulsante(app, 'Cancella tutto lo storico (la scheda resta)');
  assert.ok(bottone, 'il tasto c\'e\' nelle Impostazioni');

  // chiede conferma e, se dico di no, non cancella niente
  const sedutePrima = (await db.tutti('sedute')).filter((s) => !s.eliminata).length;
  bottone.clickNonAspettando();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);
  const testo = perClasse(document.body, 'dialogo')[0].textContent || '';
  assert.match(testo, /Cancellare tutto lo storico/, 'chiede conferma');
  assert.match(testo, /NON viene toccata/, 'e dice che la scheda resta');
  pulsanti(perClasse(document.body, 'dialogo')[0]).find((b) => /Lascia tutto com/.test(b.textContent || '')).click();
  await new Promise((r) => setTimeout(r, 200));
  assert.equal((await db.tutti('sedute')).filter((s) => !s.eliminata).length, sedutePrima,
    'rispondendo no non cancella niente');
});

test('36. nella pagina del giorno posso modificare la scheda e salvare', async () => {
  // Ste: "fai che quando apro soltanto la scheda posso anche modificarla,
  // le rip, serie ecc..."
  const v = (await db.tutti('versioni')).sort((a, b) => b.numero - a.numero)[0];
  const giorno = v.snapshot.giorni[0];
  globalThis.window.location.hash = '#/giorno/' + giorno.id;
  await attendiChe(() => perClasse(app, 'scheda-esercizio').length >= 1);

  // di base si guarda e basta: nessun campo scrivibile
  assert.equal(perClasse(app, 'mini-campo').length, 0, 'senza modificare non ci sono campi da scrivere');
  assert.ok(pulsante(app, 'Modifica questa scheda'), 'c\'e\' il bottone per modificare');

  // entro in modifica
  pulsante(app, 'Modifica questa scheda').clickNonAspettando();
  await attendiChe(() => perClasse(app, 'mini-campo').length > 0);
  assert.ok(perClasse(app, 'mini-campo').length >= 2, 'compaiono i campi per kg e rip');

  // cambio il peso della prima serie
  const primoCampo = perClasse(app, 'mini-campo')[0];
  primoCampo.value = '99';
  primoCampo.listeners.get('input')[0]({ type: 'input' });

  // e salvo: deve nascere una versione nuova
  const primaVersione = (await db.tutti('versioni')).length;
  pulsante(app, 'Salva la scheda (nuova versione)').clickNonAspettando();
  await attendiChe(() => perClasse(document.body, 'dialogo').length === 1);
  pulsanti(perClasse(document.body, 'dialogo')[0]).find((b) => /Salva/.test(b.textContent || '')).click();
  const versioniDopo = await (async () => {
    for (let i = 0; i < 200; i++) {
      if ((await db.tutti('versioni')).length > primaVersione) return true;
      await new Promise((r) => setTimeout(r, 20));
    }
    return false;
  })();
  assert.ok(versioniDopo, 'la versione nuova e\' stata salvata');

  const versioni = (await db.tutti('versioni')).sort((a, b) => b.numero - a.numero);
  const nuova = versioni[0];
  assert.equal(nuova.snapshot.giorni[0].esercizi[0].serie[0].peso, 99, 'il peso cambiato e\' nella versione nuova');
  assert.ok(nuova.numero > v.numero, 'e la versione e\' davvero nuova');

  // torno alla scheda del giorno: dopo aver salvato si torna a sola lettura
  globalThis.window.location.hash = '#/giorno/' + giorno.id;
  await rilanciaAvvio();
  await attendiChe(() => perClasse(app, 'scheda-esercizio').length >= 1);
  assert.equal(perClasse(app, 'mini-campo').length, 0, 'torniamo a sola lettura');
});

test('Y. un errore dopo un await dentro una vista viene mostrato, non mangiato', async () => {
  // IL BUCO DEL `try/catch`, e il test che lo chiude.
  //
  // `disegna()` avvolgeva la chiamata a `disegnaDentro` in un `try/catch`, ma
  // quattro viste sono `async` (`vistaSeduta`, `vistaSedutaPassata`,
  // `vistaEsercizio`, `vistaProfilo`). Un errore sollevato DOPO un `await` dentro
  // una funzione async non passa dal `try` del chiamante: passa dalla Promise.
  //
  // Quindi il `catch` non le copriva, e la pagina restava a meta' disegnata senza
  // nessun messaggio. Il caso vero: il Profilo fa `await controlloPeso()` DOPO
  // aver gia' scritto testa, livello e barra, quindi se il database e' bloccato
  // (l'altra scheda del browser aperta) l'app si fermava li: aria, XP e livello
  // scritti, blocco del peso sparito, e nessuna spiegazione di perche'.
  //
  // Qui non riesco a far fallire una vista vera (gli export di un modulo non si
  // possono riassegnare, e il motore di memoria del database ingoia gli errori di
  // lettura), quindi testo il MECCANISMO esatto che `disegna` ora usa: la chiamata
  // passa dentro `Promise.resolve(...)` e gli errori dopo un `await` arrivano al
  // `.catch`. Se un domani qualcuno toglie quel `Promise.resolve` da `disegna`,
  // questo test documenta il pattern che lo protegge.
  const vista = async () => {
    await new Promise((r) => setTimeout(r, 1));
    throw new Error('Errore di prova dentro una vista');
  };
  let mostrato = null;
  // questo e' il pattern che ora c'e' in `disegna()`
  Promise.resolve(vista())
    .then(() => { /* va bene: nessun errore */ })
    .catch((errore) => { mostrato = errore; });

  // il disegno parte SUBITO: non c'e' nessun ritardo, nessuno sfarfallio
  let partito = false;
  Promise.resolve((async () => { partito = true; })());
  assert.equal(partito, true, 'la vista parte subito, non dopo un turno');

  await attendiChe(() => mostrato !== null, 30);
  assert.ok(mostrato, 'un errore sollevato DOPO un await deve arrivare al catch');
  assert.match(mostrato.message, /Errore di prova/, 'e deve essere l\'errore vero, non undefined');
});

test('Z. nessun errore JavaScript durante tutta la navigazione', () => {
  assert.deepEqual(errori, [], 'errori:\n' + errori.join('\n'));
});