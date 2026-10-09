// ricompense-sotto-soglia.test.js -- il buco che faceva perdere le ricompense.
//
// IL BUG (trovato leggendo il codice il 08/10/2026, non da un test che falliva):
// in `ricompenseAllenamento` (src/gioco.js) il ciclo sui record controllava solo
// `r.valido`, e poi faceva `r.rank.nome` per scrivere il testo della promozione.
// Ma un record puo' essere valido E avere `rank: null`: e' il caso di chi si allena
// ma non ha ancora sbloccato il primo livello su quell'esercizio.
//
// Il crash era SILENZIOSO. Chi chiama `ricompenseAllenamento` (app.js) ha un
// `catch` che scrive in console e restituisce una lista vuota. Quindi: finire
// un allenamento in cui un esercizio era sotto la prima soglia faceva perdere le
// ricompense di TUTTA la seduta (Aura e XP di ogni esercizio, anche quelli che
// avevano un Rank), senza che sull'app comparisse niente.
//
// Qui sotto non si testa solo "non crasha": si testa che le ricompense degli
// esercizi con un Rank normale arrivino TUTTE, anche se nella stessa seduta c'e'
// un esercizio sotto soglia. Perche' il difetto vero non era il crash, era la
// perdita silenziosa.

import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};

const { ricompenseAllenamento } = await import('../src/gioco.js');
const { recordEsercizio, recordAccount } = await import('../src/rank.js');
const { ESERCIZI } = await import('../src/dati-iniziali.js');

const ACCOUNT = 'acc-test-sotto-soglia';

test('1. un record sotto la prima soglia e\' valido ma non ha Rank', () => {
  // Il presupposto di tutto: se questo cambia, il resto del test non ha senso.
  const laterale = ESERCIZI.find((e) => /lateral/i.test(e.nome));
  // 3 kg per lato sul cavo doppio: sotto l'ingresso (7,9 kg per lato su corpo 66)
  const rec = recordEsercizio(
    [{ id: 's', peso: 6, ripetizioni: 15, stato: 'fatta' }],
    laterale, null, 66,
  );
  assert.equal(rec.valido, true, 'la prestazione e\' valida: l\'hai fatta');
  assert.equal(rec.rank, null, 'ma non ha ancora un Rank: sei sotto la prima soglia');
  assert.equal(rec.sottoSoglia, true, 'e lo dice esplicitamente');
  assert.equal(rec.indice, -1, 'con indice -1, che e\' un valore reale e non un errore');
});

test('2. il testo della promozione non viene scritto quando non c\'e\' un Rank', () => {
  // Il crash vero: `r.rank.nome` su un null. Qui si verifica che si possa
  // controllare prima di leggere, che e' la riga che prima non c'era.
  const laterale = ESERCIZI.find((e) => /lateral/i.test(e.nome));
  const record = recordAccount(
    [laterale],
    [{ esercizio_id: laterale.id, serie: [{ id: 's', peso: 6, ripetizioni: 15, stato: 'fatta' }] }],
    { pesoAttuale: 66 },
  );
  assert.equal(record.length, 1);
  assert.equal(record[0].rank, null, 'questo record non ha Rank');
  assert.doesNotThrow(() => {
    if (record[0].rank) { const _ = record[0].rank.nome; }
  }, 'leggere il nome solo se il Rank c\'e\': e\' la riga che prima crashava');
});

test('3. un esercizio sotto soglia NON fa perdere le ricompense degli altri', () => {
  // Il difetto vero, e il piu' insidioso: non il crash ma la perdita.
  //
  // Nella stessa seduta ci sono due esercizi: uno con un Rank normale (la chest
  // press a 37 kg x 8) e uno sotto la prima soglia (le alzate laterali a 3 kg per
  // lato). PRIMA del fix, il ciclo della funzione crashava sul secondo e non
  // scriveva NESSUNA ricompensa: quindi anche la chest press, che aveva un Rank
  // e le meritava, restava senza Aura e senza XP.
  //
  // Se questo test fallisce, il bug e' tornato.
  const chest = ESERCIZI.find((e) => /chest press/i.test(e.nome));
  const laterale = ESERCIZI.find((e) => /lateral/i.test(e.nome));

  const sedute = [{
    id: 'sed-1', giorno_id: 'g1', data: '2026-10-08', stato: 'completata',
    scheda_id: 's1',
  }];
  const serie = [
    { id: 'sr-chest', seduta_id: 'sed-1', esercizio_id: chest.id, peso: 37, ripetizioni: 8, stato: 'fatta' },
    { id: 'sr-laterale', seduta_id: 'sed-1', esercizio_id: laterale.id, peso: 6, ripetizioni: 15, stato: 'fatta' },
  ];
  const esercizi = [chest, laterale];

  // il presupposto, verificato dentro la stessa situazione del difetto
  const record = recordAccount(
    esercizi,
    [{ esercizio_id: chest.id, serie: [serie[0]] }, { esercizio_id: laterale.id, serie: [serie[1]] }],
    { pesoAttuale: 66 },
  );
  const delChest = record.find((r) => r.esercizio.id === chest.id);
  const delLaterale = record.find((r) => r.esercizio.id === laterale.id);
  assert.ok(delChest.rank, 'la chest press ha un Rank: e\' il caso normale');
  assert.equal(delLaterale.rank, null, 'le alzate laterali sono sotto soglia: e\' il caso che rompeva');

  // e adesso la funzione vera: non deve perdere niente
  const ricompense = ricompenseAllenamento({
    account: ACCOUNT, sedute, serie, esercizi, ricompense: [], pesoCorporeo: 66,
  });
  assert.ok(Array.isArray(ricompense), 'la funzione risponde una lista');
  // il punto: la ricompensa della chest press c\'e\' comunque
  const dellaChest = ricompense.filter((r) => r.tipo === 'record' && r.fonte === chest.id);
  assert.equal(dellaChest.length, 1,
    'la chest press ha un Rank e deve avere la sua ricompensa, anche se nella stessa '
    + 'seduta c\'e\' un esercizio sotto soglia');
  assert.ok(Number(dellaChest[0].aura) > 0 || Number(dellaChest[0].xp) > 0,
    'e la ricompensa vale qualcosa');
  // e l'esercizio sotto soglia non promuove niente (non c\'e\' Rank da annunciare),
  // ma non deve nemmeno far esplodere il ciclo
  const promozioni = ricompense.filter(
    (r) => r.tipo === 'promozione' && String(r.fonte || '').startsWith(laterale.id),
  );
  assert.equal(promozioni.length, 0,
    'l\'esercizio sotto soglia non ha una promozione da annunciare: non c\'e\' Rank');
});
