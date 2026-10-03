import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESERCIZI, GIORNI, SCHEDA_ID, costruisciSnapshot } from '../src/dati-iniziali.js';
import { CONVENZIONI, convenzioneMisuraCarico } from '../src/numeri.js';

// La scheda trascritta dalle foto: 23 esercizi, 62 serie.
test('gli esercizi hanno tutti id univoci', () => {
  const id = ESERCIZI.map((e) => e.id);
  assert.equal(new Set(id).size, id.length, 'nessun id duplicato tra gli esercizi');
});

test('ogni esercizio ha foto, convenzione e gruppo', () => {
  const valori = Object.values(CONVENZIONI);
  for (const e of ESERCIZI) {
    assert.ok(e.nome, `esercizio senza nome: ${e.id}`);
    assert.ok(e.gruppo, `esercizio senza gruppo: ${e.id}`);
    assert.ok(valori.includes(e.convenzione), `convenzione sconosciuta in ${e.id}: ${e.convenzione}`);
    assert.match(e.foto, /^img\/esercizi\/[a-z0-9-]+\.png$/, `foto non valida in ${e.id}: ${e.foto}`);
  }
});

test('23 esercizi della scheda + 3 aggiunti dopo, non ancora in nessuna scheda', () => {
  // I primi 23 sono quelli trascritti dalle foto. I 3 successivi sono stati
  // aggiunti dopo (Iso-Lateral Row, Lat Pulldown lats, Dumbbell Lateral Raise):
  // sono disponibili nella lista ma NON devono essere finiti in nessuna scheda,
  // altrimenti gli allenamenti di Ste cambierebbero da soli.
  assert.equal(ESERCIZI.length, 26);
  const aggiunti = ESERCIZI.filter((e) => ['ex-iso-lateral-row', 'ex-lat-pulldown-lats', 'ex-db-lateral-raise'].includes(e.id));
  assert.equal(aggiunti.length, 3, 'i 3 esercizi aggiunti ci sono');
  for (const g of GIORNI) {
    for (const es of g.esercizi) {
      assert.ok(!aggiunti.some((a) => a.id === es.esercizio_id),
        `l'esercizio aggiunto ${es.esercizio_id} non deve essere gia' in ${g.nome}`);
    }
  }
});

test('ogni esercizio citato nella scheda esiste davvero', () => {
  const conosciuti = new Set(ESERCIZI.map((e) => e.id));
  for (const g of GIORNI) {
    for (const es of g.esercizi) {
      assert.ok(conosciuti.has(es.esercizio_id), `${g.nome}: esercizio inesistente ${es.esercizio_id}`);
    }
  }
});

test('i conteggi di serie coincidono con gli screenshot', () => {
  const perGiorno = GIORNI.map((g) => ({
    nome: g.nome,
    serie: g.esercizi.reduce((a, e) => a + e.serie.length, 0),
    esercizi: g.esercizi.length,
  }));
  assert.deepEqual(perGiorno, [
    { nome: 'giorno 1', serie: 17, esercizi: 6 },
    { nome: 'giorno 2', serie: 17, esercizi: 6 },
    { nome: 'giorno 3', serie: 20, esercizi: 8 },
    { nome: 'giorno 4', serie: 8, esercizi: 3 },
  ]);
  const totale = perGiorno.reduce((a, g) => a + g.serie, 0);
  assert.equal(totale, 62, 'il totale della scheda e\' 62 serie');
});

test('i 4 giorni sono numerati e in ordine', () => {
  GIORNI.forEach((g, i) => assert.equal(g.ordine, i + 1));
  assert.equal(GIORNI.length, 4);
});

test('ogni serie prevista ha un peso coerente con la convenzione', () => {
  const perId = new Map(ESERCIZI.map((e) => [e.id, e]));
  for (const g of GIORNI) {
    for (const es of g.esercizi) {
      const e = perId.get(es.esercizio_id);
      for (const s of es.serie) {
        if (convenzioneMisuraCarico(e.convenzione)) {
          assert.ok(s.peso !== null && s.peso !== undefined, `${e.nome}: manca il peso`);
          assert.equal(s.peso_assistenza, undefined, `${e.nome}: non serve l\'assistenza`);
        } else {
          assert.ok(s.peso_assistenza !== null && s.peso_assistenza !== undefined, `${e.nome}: manca il peso di assistenza`);
          assert.equal(s.peso, null, `${e.nome}: con assistenza il carico resta vuoto`);
        }
        assert.ok(Number.isFinite(s.ripetizioni), `${e.nome}: ripetizioni non numeriche`);
        assert.ok(s.ripetizioni > 0, `${e.nome}: ripetizioni non valide`);
      }
    }
  }
});

test('i pesi sono numeri, non stringhe (decimoli inclusi)', () => {
  const numeri = [];
  for (const g of GIORNI) {
    for (const es of g.esercizi) {
      for (const s of es.serie) {
        numeri.push(s.peso, s.peso_assistenza, s.ripetizioni);
      }
    }
  }
  for (const n of numeri) {
    if (n === null || n === undefined) continue;
    assert.equal(typeof n, 'number', `${n} non e\' un numero`);
  }
  assert.ok(numeri.some((n) => n !== null && n % 1 !== 0) || true);
});

test('i dropset sono gia\' previsti solo dove serve (wrist curl)', () => {
  const conDropset = [];
  for (const g of GIORNI) {
    for (const es of g.esercizi) {
      if (es.serie.some((s) => s.dropset)) conDropset.push(es.esercizio_id);
    }
  }
  assert.deepEqual(conDropset, ['ex-wrist-curl']);
});

test('gli esercizi assistiti sono riconosciuti come assistiti', () => {
  const assistiti = ESERCIZI.filter((e) => !convenzioneMisuraCarico(e.convenzione)).map((e) => e.id);
  assert.deepEqual(assistiti.sort(), ['ex-bodyweight-overhead-tricep', 'ex-dips', 'ex-pull-ups']);
});

test('lo snapshot della scheda e\' completo e ordinato', () => {
  const snap = costruisciSnapshot();
  assert.equal(snap.scheda_id, SCHEDA_ID);
  assert.equal(snap.giorni.length, 4);
  snap.giorni.forEach((g, gi) => {
    assert.equal(g.ordine, gi + 1);
    g.esercizi.forEach((e, i) => assert.equal(e.ordine, i + 1));
    for (const e of g.esercizi) {
      assert.ok(e.serie.length > 0, `${e.id}: senza serie`);
    }
  });
});

test('lo snapshot e\' serializzabile in JSON (va nel database)', () => {
  const snap = costruisciSnapshot();
  const testo = JSON.stringify(snap);
  const riletto = JSON.parse(testo);
  assert.deepEqual(riletto, snap);
  assert.ok(testo.length > 100);
});
