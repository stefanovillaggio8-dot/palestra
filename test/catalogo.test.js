// catalogo.test.js -- perché sparivano gli esercizi dal Rank.
//
// Ste (07/10/2026): "vedi perché mi spariscono alcuni esercizi dal rank".
//
// IL BUCO, in breve: il catalogo esercizi del dispositivo veniva riempito SOLO
// alla prima installazione. Ogni esercizio che ho aggiunto dopo andava nella scheda
// ma non nella tabella `esercizi`, e la lista dei Rank gira sul CATALOGO: quindi
// quegli esercizi non avevano una card. Sparivano in silenzio.
//
// Qui lo riproduco con i numeri, poi verifico che il rimedio metta a posto i
// mancanti SENZA toccare quelli che ci sono già.

import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const { montaDom, perClasse } = await import('./dom-minimo.js');
const { app } = montaDom();
const { avvia } = await import('../src/app.js');
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const db = await import('../src/db.js');
const { ESERCIZI, SCHEDA_ID, eserciziMancanti, costruisciSnapshot } = await import('../src/dati-iniziali.js');
const { recordAccount, recordEsercizio } = await import('../src/rank.js');

async function attendiChe(condizione, tentativi = 80) {
  for (let i = 0; i < tentativi; i++) {
    if (condizione()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

/** tutti gli esercizi della scheda di default, con una serie fatta 40x8 */
function gruppiConSerie() {
  const snap = costruisciSnapshot();
  const out = [];
  for (const g of snap.giorni) {
    for (const se of g.esercizi) {
      out.push({
        esercizio_id: se.esercizio_id,
        seduta_id: 's1',
        serie: [{ id: 'x', esercizio_id: se.esercizio_id, stato: 'fatta', peso: 40, ripetizioni: 8, spotter: false, carrucola: null }],
      });
    }
  }
  return out;
}

const idInScheda = () => new Set(gruppiConSerie().map((g) => g.esercizio_id));

test('C1. il buco: col catalogo parziale, gli esercizi spariscono SENZA avviso', () => {
  // il caso reale del dispositivo: catalogo fermo a quando l'ho installata la prima
  // volta, scheda con tutti gli esercizi di oggi
  const catalogoParziale = ESERCIZI.slice(0, 12);
  const gruppi = gruppiConSerie();
  const record = recordAccount(catalogoParziale, gruppi, { pesoAttuale: 66 });
  const idScheda = new Set(gruppi.map((g) => g.esercizio_id));
  assert.ok(idScheda.size > record.length,
    `con ${catalogoParziale.length} esercizi in catalogo ne devono sparire ${idScheda.size - record.length} (riproduco il bug)`);
  // e la parte peggiore: non c'è nessun record "mancante", sono proprio assenti
  for (const g of gruppi) {
    if (!catalogoParziale.some((e) => e.id === g.esercizio_id)) {
      assert.equal(
        record.some((r) => r.esercizio && r.esercizio.id === g.esercizio_id),
        false,
        `${g.esercizio_id} sparisce e nessuno lo dice`,
      );
    }
  }
});

test('C2. col catalogo completo, tutti gli esercizi hanno il loro Rank', () => {
  const gruppi = gruppiConSerie();
  const record = recordAccount(ESERCIZI, gruppi, { pesoAttuale: 66 });
  assert.equal(record.length, new Set(gruppi.map((g) => g.esercizio_id)).size,
    'ogni esercizio della scheda deve avere un record, anche se non ha ancora un Rank');
});

test('C3. eserciziMancanti trova solo quelli che non ci sono, e non tocca gli altri', () => {
  const parziale = ESERCIZI.slice(0, 12);
  const mancanti = eserciziMancanti(parziale);
  assert.equal(mancanti.length, ESERCIZI.length - 12);
  for (const m of mancanti) assert.equal(parziale.some((e) => e.id === m.id), false);
  assert.deepEqual(eserciziMancanti(ESERCIZI), [], 'catalogo già completo: niente da aggiungere');
  assert.deepEqual(eserciziMancanti([]), ESERCIZI, 'dispositivo vuoto: tutto il catalogo');
});

// app.js si avvia da solo quando viene importato: quindi qui aspetto che il primo
// avvio abbia finito, sennò continua a lavorare in mezzo ai test e aggiunge righe
// mentre sto contando (e' successo: il dispositivo risultava con 23 esercizi
// invece di 12, perche' l'avvio automatico aveva rimesso il catalogo).
before(async () => {
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);
});

test('C4. avviando l\'app, i mancanti vengono aggiunti al catalogo', async () => {
  // simulo il dispositivo vecchio: svuoto tutto e metto solo 12 esercizi, come se
  // l'app fosse stata installata quando in catalogo ce n'erano dodici
  await db.svuotaTutto();
  for (const e of ESERCIZI.slice(0, 12)) await db.salva('esercizi', e, { segna: false });
  assert.equal((await db.tutti('esercizi')).length, 12, 'il dispositivo parte con 12 esercizi');

  await avvia();
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);

  const dopo = await db.tutti('esercizi');
  assert.equal(dopo.length, ESERCIZI.length,
    `dopo l'avvio il catalogo deve avere tutti gli esercizi, ne ha ${dopo.length} invece di ${ESERCIZI.length}`);
  const idDopo = new Set(dopo.map((e) => e.id));
  for (const id of idInScheda()) {
    assert.ok(idDopo.has(id), `l'esercizio ${id} della scheda deve essere nel catalogo, altrimenti il suo Rank sparisce`);
  }
  // e i Rank adesso sono davvero tutti, uno per esercizio
  const record = recordAccount(dopo, gruppiConSerie(), { pesoAttuale: 66 });
  assert.equal(record.length, idInScheda().size, 'il Rank deve avere una card per ogni esercizio');
});

test('C5. NON sovrascrive gli esercizi già presenti (lì ci sono dati e correzioni)', async () => {
  // un esercizio "corretto" sul dispositivo: nome diverso e nota personale
  const daSovrascrivere = ESERCIZI[0];
  await db.salva('esercizi', { ...daSovrascrivere, nome: 'Chest Press (mia macchina)', nota_permanente: 'nota mia' }, { segna: false });

  await avvia();
  await attendiChe(() => perClasse(app, 'scheda-giorno').length === 4);

  const dopo = (await db.tutti('esercizi')).find((e) => e.id === daSovrascrivere.id);
  assert.ok(dopo, `l'esercizio ${daSovrascrivere.id} deve restare nel catalogo`);
  assert.equal(dopo.nome, 'Chest Press (mia macchina)', 'il nome non deve essere riscritto');
  assert.equal(dopo.nota_permanente, 'nota mia', 'la nota non deve essere riscritta');
  // e i campi del carico vengono comunque rimessi dal catalogo, perche' quelli
  // non sono tue correzioni ma dettagli tecnici che il server non riporta
  const fresh = ESERCIZI.find((e) => e.id === daSovrascrivere.id);
  assert.equal(dopo.attrezzatura, fresh.attrezzatura, 'l\'attrezzatura viene rimessa dal catalogo');
  assert.equal(dopo.carrucola || null, fresh.carrucola || null, 'la carrucola viene rimessa dal catalogo');
});

test('C6. un esercizio nuovo senza scheda può comunque avere il suo Rank', () => {
  // gli esercizi che non sono in nessuna scheda di default (Iso-Lateral Row ecc.)
  // devono funzionare lo stesso appena se ne fa una serie
  const fuori = ESERCIZI.find((e) => !idInScheda().has(e.id));
  assert.ok(fuori, 'c\'e\' almeno un esercizio fuori dalle schede di default');
  const rec = recordEsercizio([
    { id: 'x', esercizio_id: fuori.id, stato: 'fatta', peso: 30, ripetizioni: 10, spotter: false, carrucola: null },
  ], fuori, null, 66);
  assert.equal(rec.valido, true, `${fuori.nome}: una serie fatta deve dare un record`);
  assert.ok(rec.rank || rec.sottoSoglia === false || rec.punteggio !== null,
    'e il record deve portare a un Rank o almeno a un numero');
});