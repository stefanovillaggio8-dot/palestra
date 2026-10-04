// muscoli-parti.test.js -- quale pezzo di muscolo lavora l'esercizio.
//
// Ste (04/10/2026): "il petto come il bicipite e le altre parti sono formati da
// diverse fibre muscolari e ci sono esercizi che servono per la parte alta e
// altri esercizi che servono per la parte bassa del petto".
//
// Attenzione alla parola "fibre": non è quella la differenza, sono i CAPI del
// muscolo. Il test lo verifica: se l'app dicesse "fibre diverse" non sarebbe
// solo impreciso, sarebbe falso, e su un'app che decide il tuo Rank conta.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parteDiMuscolo, stessoLavoro, AVVERTIMENTO_PARTI, PARTI,
} from '../src/muscoli-parti.js';

const parte = (nome, descrizione = '') => parteDiMuscolo({ nome, descrizione });

test('M1. il petto ha una parte alta e una parte bassa, e le distingue', () => {
  // è il caso che ha citato Ste
  const alta = parte('Panca inclinata con bilanciere');
  const bassa = parte('Panca piana');
  assert.equal(alta.muscolo, 'petto');
  assert.equal(alta.nome, 'parte alta del petto');
  assert.equal(bassa.muscolo, 'petto');
  assert.equal(bassa.nome, 'parte bassa del petto');
  assert.notEqual(alta.parte, bassa.parte, 'devono essere due pezzi diversi');
});

test('M2. la descrizione conta, non solo il nome', () => {
  // l'esercizio si chiama "Panca" ma nella descrizione c'è scritto che è
  // inclinata: l'app deve leggere anche quella
  const r = parte('Panca', 'Panca inclinata con bilanciere, spalle alzate');
  assert.equal(r.nome, 'parte alta del petto', 'la descrizione decide');
});

test('M3. bicipite: braccio in alto e braccio in basso', () => {
  const alto = parte('Scott Bench Curl');
  const basso = parte('Cable Hammer Curl');
  assert.equal(alto.muscolo, 'braccio');
  assert.equal(basso.muscolo, 'braccio');
  assert.notEqual(alto.parte, basso.parte);
  assert.match(alto.nome, /alto/, 'il scott lavora il braccio in alto');
  assert.match(basso.nome, /basso/, 'l\'hammer lavora il braccio in basso');
});

test('M4. le spalle hanno tre parti diverse', () => {
  const laterale = parte('Dumbbell Lateral Raise');
  const posteriore = parte('Rear Delt al cavo');
  const frontale = parte('Shoulder Press');
  assert.equal(laterale.nome, 'spalle laterali (deltoide laterale)');
  assert.equal(posteriore.nome, 'spalle posteriori (deltoide posteriore)');
  assert.equal(frontale.nome, 'spalle davanti (deltoide anteriore)');
  assert.equal(new Set([laterale.parte, posteriore.parte, frontale.parte]).size, 3,
    'sono tre pezzi distinti');
});

test('M5. le gambe: davanti, dietro, polpaccio e glutei', () => {
  assert.equal(parte('Leg Press').muscolo, 'gambe');
  assert.match(parte('Leg Press').nome, /quadricipite/);
  assert.match(parte('Seated Leg Curl').nome, /femorale/);
  assert.match(parte('Calf Raise').nome, /polpaccio/);
  assert.match(parte('Hip Thrust').nome, /glutei/);
});

test('M6. non stampa mai "fibre diverse"', () => {
  // Ste ha detto "fibre muscolari diverse". Non è così: un muscolo ha un solo
  // tipo di fibre, cambia il CAPO che si attiva. L'app non deve ripetere la
  // parola sbagliata, e deve dire la cosa giusta.
  assert.doesNotMatch(AVVERTIMENTO_PARTI, /diverse fibre|fibre diverse/i,
    'l\'avvertimento non deve dire "fibre diverse"');
  assert.match(AVVERTIMENTO_PARTI, /capi/i, 'deve dire che cambiano i capi');
  assert.match(AVVERTIMENTO_PARTI, /Nessun esercizio lavora SOLO un pezzo di muscolo/i,
    'e che nessun esercizio isola una parte sola');

  for (const p of PARTI) {
    assert.doesNotMatch(p.nota || '', /fibre diverse/i, p.id + ': niente "fibre diverse"');
    assert.ok((p.nota || '').length > 20, p.id + ': la spiegazione deve essere vera, non vuota');
  }
});

test('M7. ogni parte spiega cosa fa, in parole semplici', () => {
  for (const p of PARTI) {
    assert.ok(p.parte && p.muscolo, p.id + ': ha un nome e un muscolo');
    assert.ok(p.nota && p.nota.length > 30, p.id + ': la nota deve spiegare');
    assert.ok(p.parole.length > 0, p.id + ': ha almeno una parola per riconoscerlo');
  }
});

test('M8. riconosce i pezzi dei 27 esercizi della scheda', () => {
  const casi = [
    ['Chest Press', 'petto'],
    ['Smith Machine Incline Bench Press', 'petto'],
    ['Cable Fly', 'petto'],
    ['Cable Lateral Raise', 'spalle'],
    ['Seated Cable Row', 'dorso'],
    ['Lat Pulldown macchina', 'dorso'],
    ['Pull Ups', 'dorso'],
    ['Cable Hammer Curl', 'braccio'],
    ['Scott Bench Curl', 'braccio'],
    ['Single Arm Tricep Pushdown', 'braccio'],
    ['Wrist Curl', 'avambraccio'],
    ['Leg Extension', 'gambe'],
    ['Seated Leg Curl', 'gambe'],
    ['Sled Press Calf Raise', 'gambe'],
    ['Single Leg Press', 'gambe'],
    ['Seated Dumbbell Shoulder Press', 'spalle'],
    ['One Arm Cable Reverse Fly', 'spalle'],
    ['Chest Supported Dumbbell Shrug', 'dorso'],
  ];
  for (const [nome, muscolo] of casi) {
    const r = parte(nome);
    assert.equal(r.trovata, true, nome + ': deve riconoscerlo');
    assert.equal(r.muscolo, muscolo, nome + ': muscolo riconosciuto');
  }
});

test('M9. due esercizi possono fare lo stesso lavoro', () => {
  // è la cosa che serve avvisare: due panche diverse non sono due allenamenti
  const a = parte('Panca inclinata con bilanciere');
  const b = parte('Smith Machine Incline Bench Press');
  assert.equal(stessoLavoro(a, b), true, 'due panche inclinate fanno lo stesso lavoro');

  const c = parte('Panca piana');
  assert.equal(stessoLavoro(a, c), false, 'inclusa e piana no: parti diverse');

  const x = parte('Pull Ups');
  const y = parte('Lat Pulldown macchina');
  assert.equal(stessoLavoro(x, y), true, 'trazioni e pulldown sono lo stesso lavoro');

  // se non sa, non deve inventare che sono uguali
  assert.equal(stessoLavoro(a, parte('Questa cosa che non so')), false);
});

test('M10. se non capisce, lo dice e non inventa', () => {
  const r = parte('Questa cosa che non so cosa sia');
  assert.equal(r.trovata, false);
  assert.equal(r.nome, null, 'non deve inventare un pezzo');
  assert.match(r.frase, /Non so/, 'e deve dirlo chiaramente');
});

test('M11. accenti e maiuscole non contano, e non si rompe', () => {
  assert.equal(parte('PANCA INCLINATA').parte, parte('panca inclinata').parte);
  assert.equal(parte('Dumbbell Lateral Raise').parte, parte('dumbbell lateral raise').parte);
  for (const vuoto of ['', null, undefined, '   ', 12345]) {
    const r = parte(vuoto);
    assert.ok(r, 'non deve esplodere con ' + JSON.stringify(vuoto));
    assert.ok(['boolean', 'undefined'].includes(typeof r.trovata));
  }
});