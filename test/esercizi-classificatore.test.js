// esercizi-classificatore.test.js -- l'app riconosce l'esercizio dal nome.
//
// Ste (04/10/2026): "deve riconoscere si, per questo ti ho detto se puoi
// metterci un ia, e' possibile?"

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { livelloEsercizio } from '../src/rank-config.js';

const liv = (nome, extra = {}) => classificaEsercizio({ nome, ...extra }).livello;

test('C1. le alzate laterali sono un isolamento (carico basso ma tanto)', () => {
  // Ste: "tipo alzate laterali e' difficile quindi anche un carico basso puo'
  // essere tanto"
  assert.equal(liv('Dumbbell Lateral Raise'), 'isolamento');
  assert.equal(liv('Cable Lateral Raise'), 'isolamento');
  assert.equal(liv('Alzate laterali ai cavi'), 'isolamento');
  assert.equal(liv('Lateral raise con manubri'), 'isolamento');
});

test('C2. i movimenti di forza veri sono composti', () => {
  assert.equal(liv('Chest Press'), 'composto');
  assert.equal(liv('Panca inclinata Smith'), 'composto');
  assert.equal(liv('Lat Pulldown macchina'), 'composto');
  assert.equal(liv('Seated Cable Row'), 'composto');
  assert.equal(liv('Shoulder Press'), 'composto');
});

test('C3. i carichi alti sono "grandi"', () => {
  assert.equal(liv('Sled Press'), 'grande');
  assert.equal(liv('Leg Press'), 'grande');
  assert.equal(liv('Squat'), 'grande');
  assert.equal(liv('Stacco'), 'grande');
});

test('C4. il corpo libero si misura in ripetizioni', () => {
  assert.equal(liv('Pull Ups'), 'assistito');
  assert.equal(liv('Dips'), 'assistito');
  assert.equal(liv('Trazioni assistite'), 'assistito');
  assert.equal(liv('Bodyweight Overhead Tricep Extension'), 'assistito');
});

test('C5. gli isolamenti di braccio e gambe', () => {
  assert.equal(liv('Scott Bench Curl'), 'isolamento');
  assert.equal(liv('Bicipiti con bilanciere'), 'isolamento');
  assert.equal(liv('Single Arm Tricep Pushdown'), 'isolamento');
  assert.equal(liv('Cable Fly'), 'isolamento');
  assert.equal(liv('Leg Extension'), 'isolamento');
});

test('C6. capisce anche il gruppo muscolare', () => {
  const casi = [
    ['Chest Press', 'petto'],
    ['Lat Pulldown macchina', 'dorso'],
    ['Dumbbell Lateral Raise', 'spalle'],
    ['Scott Bench Curl', 'bicipiti'],
    ['Single Arm Tricep Pushdown', 'tricipiti'],
    ['Leg Extension', 'gambe'],
  ];
  for (const [nome, gruppo] of casi) {
    assert.equal(classificaEsercizio({ nome }).gruppo, gruppo, nome);
  }
});

test('C7. se non capisce, lo dice e non inventa', () => {
  const r = classificaEsercizio({ nome: 'Questa cosa che non so cosa sia' });
  assert.equal(r.confidenza, 'bassa');
  assert.equal(r.riconosciutoDa, 'nessuna parola nota');
  assert.ok(r.motivi.length > 0, 'deve spiegare perche\' non sa');
  assert.ok(r.motivi[0].includes('non capisco'), 'e dirlo chiaramente');
});

test('C8. spiega SEMPRE perche\' ha deciso cosi\'', () => {
  // se non dice il perche', quando sbaglia non si puo' correggere
  for (const nome of ['Chest Press', 'Dumbbell Lateral Raise', 'Leg Press', 'Pull Ups', 'xyz']) {
    const r = classificaEsercizio({ nome });
    assert.ok(Array.isArray(r.motivi) && r.motivi.length > 0, nome + ': deve dire il perche\'');
    assert.ok(['alta', 'media', 'bassa'].includes(r.confidenza), nome + ': e quanto e\' sicuro');
  }
});

test('C9. la macchina non trasforma un composto in isolamento', () => {
  // Bug mio: "Lat Pulldown macchina" prendeva -2 due volte (parola + convenzione)
  // e finiva per scendere a isolamento. Un movimento di forza resta di forza.
  assert.equal(liv('Lat Pulldown macchina', { convenzione: 'macchina' }), 'composto');
  assert.equal(liv('Chest Press', { convenzione: 'macchina' }), 'composto');
  // e una presa singola con panca inclinata e' davvero piu' difficile
  assert.equal(liv('Incline Single Arm Pulldown'), 'grande');
});

test('C10. una frase batte una parola sola', () => {
  // "Seated Leg Curl" contiene "curl" (bicipiti) ma e' gambe: vince la frase
  assert.equal(classificaEsercizio({ nome: 'Seated Leg Curl' }).gruppo, 'gambe');
});

test('C11. il rank usa il classificatore per gli esercizi nuovi', () => {
  // un esercizio che non e' nella lista scritta a mano
  const nuovo = { id: 'ex-inventato', nome: 'Dumbbell Lateral Raise', convenzione: 'per_manubrio' };
  assert.equal(livelloEsercizio(nuovo), 'isolamento');
  const nuovo2 = { id: 'ex-inventato2', nome: 'Sled Press', convenzione: 'dischi' };
  assert.equal(livelloEsercizio(nuovo2), 'grande');
});

test('C12. accenti e maiuscole non contano', () => {
  assert.equal(liv('PANCA INCLINATA'), liv('panca inclinata'));
  assert.equal(liv('Lat Pulldown'), liv('lat pulldown'));
  assert.equal(liv('Trazioni Aiutate'), liv('trazioni aiutate'));
});

test('C13. non si rompe con un nome strano o vuoto', () => {
  for (const nome of ['', null, undefined, '   ', '%%%', 'a', 12345]) {
    const r = classificaEsercizio({ nome });
    assert.ok(['grande', 'composto', 'isolamento', 'assistito'].includes(r.livello),
      'deve dare sempre un livello valido per ' + JSON.stringify(nome));
  }
});