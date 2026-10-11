// test/audit-esercizi.test.js
//
// Ste (10/10/2026): "verifica che anche tutti gli altri esercizi in generale dell'app
// siano assegnati bene".
//
// L'auditmanuale (tools/audit-esercizi.mjs) ha trovato due dati falsi:
//
//  1. il WRIST CURL aveva `carrucola: carrucola_mono` con convenzione `bilanciere`.
//     La carrucola sta solo sui CAVI: un bilanciere non ha un carrello da cui il
//     peso si dimezzi. Qui non cambiava il Rank (il bilanciere non dimezza), ma è
//     un dato falso che la logica della carrucola non deve trovare mai.
//
//  2. il DUMBBELL LATERAL RAISE era `bilanciere` mentre si fa coi manubri. Cinque
//     altri esercizi coi manubri erano già `per_manubrio`: era l'unico rimasto
//     indietro. `bilanciere` vuol dire "un peso con due mani", `per_manubrio` vuol
//     dire "il numero che scrivi è di un manubrio": sui lateral raise è un manubrio
//     per mano.
//
// Qui le stesse regole diventano un test, così i prossimi esercizi aggiunti non
// possono reintrodurle.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ESERCIZI } from '../src/dati-iniziali.js';
import { CONVENZIONI } from '../src/numeri.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { valoriPerEsercizio, tettoPerEsercizio } from '../src/rank-v2/valori.js';

const perId = (id) => ESERCIZI.find((e) => e.id === id);

test('nessun esercizio ha la carrucola se non è a cavo', () => {
  // Il bug del Wrist Curl. Vale per tutti, non solo per quello.
  for (const e of ESERCIZI) {
    if (e.carrucola) {
      assert.equal(e.convenzione, CONVENZIONI.CAVO,
        `"${e.nome}" ha la carrucola ma la convenzione è ${e.convenzione}: la carrucola `
        + 'sta solo sui cavi, perché è l\'unico posto dove il peso si dimezza');
    }
  }
});

test('ogni cavo dice se è mono o doppia carrucola', () => {
  // Il contrario del bug di prima: un cavo senza carrucola fa contare il numero
  // del carrello come se fosse tutto su un braccio, cioe' il doppio.
  for (const e of ESERCIZI) {
    if (e.convenzione === CONVENZIONI.CAVO) {
      assert.ok(e.carrucola,
        `"${e.nome}" è a cavo ma non dice mono o doppia: il peso sarebbe letto il doppio`);
    }
  }
});

test('i manubri non possono stare su un bilanciere', () => {
  // Il bug del Dumbbell Lateral Raise.
  for (const e of ESERCIZI) {
    if (/\bdumbbell\b/i.test(e.nome)) {
      assert.notEqual(e.convenzione, CONVENZIONI.BILANCIERE,
        `"${e.nome}" si fa coi manubri ma la convenzione è bilanciere: deve essere `
        + 'per_manubrio, perché il numero è per mano');
    }
  }
});

test('ogni macchina dice se è a dischi o a stack', () => {
  const macchine = [CONVENZIONI.MACCHINA, CONVENZIONI.MACCHINA_DISCHI, CONVENZIONI.MACCHINA_STACK];
  for (const e of ESERCIZI) {
    if (macchine.includes(e.convenzione)) {
      assert.ok(e.attrezzatura,
        `"${e.nome}" è una macchina ma non dice dischi o stack: il carico sarebbe letto al doppio`);
    }
  }
});

test('ogni esercizio ha una convenzione che esiste davvero', () => {
  const valide = new Set(Object.values(CONVENZIONI));
  for (const e of ESERCIZI) {
    assert.ok(e.convenzione, `"${e.nome}" non ha convenzione`);
    assert.ok(valide.has(e.convenzione),
      `"${e.nome}" ha una convenzione inesistente: ${e.convenzione}`);
  }
});

test('ogni esercizio in kg ha una scala con ingresso e tetto sensati', () => {
  // trazioni, dip e assistenza si contano in ripetizioni: per quelli non c'è una
  // scala, ed è giusto così.
  const inRipetizioni = [CONVENZIONI.CORPO_LIBERO, CONVENZIONI.ZAVORRI, CONVENZIONI.ASSISTENZA];
  for (const e of ESERCIZI) {
    if (inRipetizioni.includes(e.convenzione)) continue;
    const riconosciuto = classificaEsercizio(e);
    assert.ok(riconosciuto.movimento, `"${e.nome}" non è riconosciuto dal classificatore`);
    const v = valoriPerEsercizio(riconosciuto.movimento, e);
    assert.ok(v, `"${e.nome}" non ha scala per il movimento ${riconosciuto.movimento}`);
    assert.ok(v.ingressoMultiplo > 0,
      `"${e.nome}" ha un ingresso non valido: ${v.ingressoMultiplo}`);
    const tetto = tettoPerEsercizio(riconosciuto.livello, riconosciuto.movimento, e);
    assert.ok(tetto > 0, `"${e.nome}" ha un tetto non valido: ${tetto}`);
    // un ingresso sopra il tetto è una scala al contrario: non si arriva da nessuna parte
    assert.ok(v.ingressoMultiplo <= tetto,
      `"${e.nome}": l'ingresso (${v.ingressoMultiplo}) è sopra il tetto (${tetto})`);
  }
});

test('i due esercizi corretti sono corretti', () => {
  // I due puntiprecisi, scritti uno per uno, cosi' il motivo non si perde.
  assert.equal(perId('ex-wrist-curl').carrucola, undefined,
    'il Wrist Curl è un bilanciere: niente carrucola');
  assert.equal(perId('ex-wrist-curl').convenzione, CONVENZIONI.BILANCIERE,
    'e resta un bilanciere');
  assert.equal(perId('ex-db-lateral-raise').convenzione, CONVENZIONI.PER_MANUBRIO,
    'il Dumbbell Lateral Raise è per manubrio');
});