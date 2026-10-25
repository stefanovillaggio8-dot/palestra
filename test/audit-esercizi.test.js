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
import { valoriPerEsercizio, tettoPerEsercizio, VALORI_MOVIMENTO } from '../src/rank-v2/valori.js';

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
  // I due punti precisi, scritti uno per uno, così il motivo non si perde.
  //
  // Il Wrist Curl è il caso che mi ha fatto sbagliare due volte: avevo tolto la
  // carrucola perché sembrava un dato falso accanto a `bilanciere`, ma la verità è
  // che è un CAVO (Ste: "lo faccio al cavo monocarrucola con la presa grigia").
  // Tolto il sintomo invece della causa. Ora è un cavo, e la carrucola mono è il
  // dato giusto: sulla corda c'è un cavo solo, quindi il numero non si dimezza.
  const wrist = perId('ex-wrist-curl');
  assert.equal(wrist.convenzione, CONVENZIONI.CAVO, 'il Wrist Curl è un cavo');
  assert.equal(wrist.carrucola, 'carrucola_mono', 'monocarrucola, con la presa grigia');
  assert.ok(/presa grigia/i.test(wrist.nota_permanente), 'e la nota lo dice');

  assert.equal(perId('ex-db-lateral-raise').convenzione, CONVENZIONI.PER_MANUBRIO,
    'il Dumbbell Lateral Raise è per manubrio');
});

test('il Wrist Curl da cavo non cambia di movimento né di tetto', () => {
  // Il controllo che mancava: se passare da bilanciere a cavo avesse spostato il
  // movimento, il tetto del polso cambierebbe e il Rank pure. Non deve.
  //
  // IL TETTO È 0,6x E NON PIÙ 0,5x (15/10/2026). Qui sotto era scritto 0,5, che
  // era un numero che non faceva niente: il tetto dichiarato era PIÙ LARGO del
  // multiplo (0,5 contro 0,4), quindi non tagliava niente. Il numero davvero
  // sbagliato era il multiplo, che lasciava i 30 kg di Ste al 113% del tetto e il
  // Rank al massimo assoluto con una prestazione che poteva solo scendere. Ora il
  // multiplo e il tetto sono entrambi 0,6x, e i suoi 30 kg stanno al 76%: un
  // livello alto con spazio davanti. Vedi la nota lunga in rank-v2/valori.js.
  const r = classificaEsercizio(perId('ex-wrist-curl'));
  assert.equal(r.movimento, 'polso', 'resta polso');
  assert.equal(r.livello, 'isolamento', 'e resta isolamento');
  assert.equal(tettoPerEsercizio(r.livello, r.movimento, perId('ex-wrist-curl')), 0.6,
    'il tetto del polso non cambia');
  // e il tetto non può essere più LARGO del multiplo, altrimenti è un numero che
  // non tronca niente ed è solo una parola
  assert.ok(VALORI_MOVIMENTO.polso.multiplo
    <= tettoPerEsercizio(r.livello, r.movimento, perId('ex-wrist-curl')),
  'un tetto più largo del multiplo non tronca niente: il numero è solo rumore');
});

test('le varianti a cavo e i macchinari personali hanno metadati coerenti', () => {
  const crunch = perId('ex-cable-crunch');
  assert.equal(crunch.carrucola, 'carrucola_mono',
    'il Cable Crunch indicato da Ste è monocarrucola');

  const faceMono = perId('ex-face-pull');
  const faceDoppia = perId('ex-face-pull-doppia');
  assert.ok(faceMono && faceDoppia, 'il Face Pull ha entrambe le varianti');
  assert.equal(faceMono.carrucola, 'carrucola_mono');
  assert.equal(faceDoppia.carrucola, 'carrucola_doppia');
  assert.equal(faceMono.foto, faceDoppia.foto,
    'le due varianti Face Pull condividono la stessa immagine');

  for (const id of [
    'ex-smith-incline-bench',
    'ex-smith-machine-bench-press',
    'ex-smith-machine-bent-over-row',
    'ex-smith-machine-shrug',
  ]) {
    const e = perId(id);
    assert.equal(e.attrezzatura, CONVENZIONI.MACCHINA_DISCHI,
      `${e.nome}: il multipower si carica con dischi, non con uno stack`);
    assert.equal(e.convenzione, CONVENZIONI.PER_BRACCIO,
      `${e.nome}: il numero inserito rappresenta i dischi per lato`);
  }

  assert.equal(perId('ex-lat-pulldown-lats').attrezzatura, CONVENZIONI.MACCHINA_STACK);
  assert.equal(perId('ex-seated-cable-row').attrezzatura, CONVENZIONI.MACCHINA_STACK);
  assert.equal(perId('ex-seated-cable-row').carrucola, CONVENZIONI.CARRUCOLA_MONO);
});
