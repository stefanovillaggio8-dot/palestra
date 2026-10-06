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
  assert.ok(/non riconosco/.test(r.motivi[0]), 'e dirlo chiaramente: ' + r.motivi[0]);
  assert.equal(r.movimento, 'sconosciuto');
});

test('C8. spiega SEMPRE perche\' ha deciso cosi\'', () => {
  // se non dice il perche', quando sbaglia non si puo' correggere
  for (const nome of ['Chest Press', 'Dumbbell Lateral Raise', 'Leg Press', 'Pull Ups', 'xyz']) {
    const r = classificaEsercizio({ nome });
    assert.ok(Array.isArray(r.motivi) && r.motivi.length > 0, nome + ': deve dire il perche\'');
    assert.ok(['alta', 'media', 'bassa'].includes(r.confidenza), nome + ': e quanto e\' sicuro');
  }
});

test('C9. la macchina non cambia che movimento è', () => {
  // Bug mio: "Lat Pulldown macchina" prendeva -2 due volte (parola + convenzione)
  // e finiva per scendere a isolamento. Adesso non si scende MAI di livello:
  // la macchina rende l'esercizio più facile, non è un altro movimento.
  assert.equal(liv('Lat Pulldown macchina', { convenzione: 'macchina' }), 'composto');
  assert.equal(liv('Chest Press', { convenzione: 'macchina' }), 'composto');
  assert.equal(liv('Seated Cable Row'), 'composto');
  assert.equal(liv('Leg Press', { convenzione: 'macchina' }), 'grande', 'e i pesanti restano pesanti');

  // una presa singola con panca inclinata è faticosissima, ma non spinge 150 kg:
  // resta composto, altrimenti il rank chiederebbe numeri da olimpiade
  assert.equal(liv('Incline Single Arm Pulldown'), 'composto');

  // e un movimento piccolo resta piccolo, per quanto sia scomodo
  assert.equal(liv('Single Arm Tricep Pushdown'), 'isolamento');
  assert.equal(liv('One Arm Dumbbell Preacher Curl'), 'isolamento');
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
test('C14. riconosce 59 nomi veri di palestra, italiano e inglese', () => {
  // Il classificatore non deve sbagliare sui nomi che si dicono davvero in palestra.
  // Ogni riga qui e' un nome vero con il livello giusto: se uno sbaglia, si vede subito.
  const casi = [
  ['Chest Press', 'composto'],
  ['Panca piana con bilanciere', 'composto'],
  ['Panca inclinata Smith', 'composto'],
  ['Panca declinata bilanciere', 'composto'],
  ['Push up', 'assistito'],
  ['Piegarimenti', 'assistito'],
  ['Shoulder Press in piedi', 'composto'],
  ['Spinte in alto con bilanciere', 'composto'],
  ['Military Press', 'composto'],
  ['Lat Pulldown macchina', 'composto'],
  ['Trazioni', 'assistito'],
  ['Trazioni assistite', 'assistito'],
  ['Dips', 'assistito'],
  ['Seated Cable Row', 'composto'],
  ['Tirate in basso al cavo', 'composto'],
  ['Rematore con bilanciere', 'composto'],
  ['Dumbbell Bench Pull', 'isolamento'],
  ['Cable Fly', 'isolamento'],
  ['Cross over ai cavi', 'isolamento'],
  ['Dumbbell Lateral Raise', 'isolamento'],
  ['Alzate laterali ai cavi', 'isolamento'],
  ['Lateral raise', 'isolamento'],
  ['Rear delt al cavo', 'isolamento'],
  ['Front raise', 'isolamento'],
  ['Cable Hammer Curl', 'isolamento'],
  ['Bicipiti con bilanciere', 'isolamento'],
  ['Scott Bench Curl', 'isolamento'],
  ['Preacher Curl manubri', 'isolamento'],
  ['Single Arm Tricep Pushdown', 'isolamento'],
  ['Triceps pushdown al cavo', 'isolamento'],
  ['French press', 'isolamento'],
  ['Curl bilanciere presa neutra', 'isolamento'],
  ['Wrist Curl', 'isolamento'],
  ['Cable Lateral Raise', 'isolamento'],
  ['One Arm Cable Reverse Fly', 'isolamento'],
  ['Incline Single Arm Pulldown', 'composto'],
  ['Leg Press', 'grande'],
  ['Sled Press Calf Raise', 'grande'],
  ['Squat', 'grande'],
  ['Stacco', 'grande'],
  ['Hip Thrust', 'grande'],
  ['Leg Extension', 'isolamento'],
  ['Seated Leg Curl', 'isolamento'],
  ['Single Leg Press', 'grande'],
  ['Leg Curl', 'isolamento'],
  ['Calf Raise', 'isolamento'],
  ['Crunch', 'isolamento'],
  ['Plank', 'isolamento'],
  ['Iso-Lateral Row', 'composto'],
  ['Pull Ups', 'assistito'],
  // Ste (06/10/2026): "e' una tirata del trapezio con pesi sui due bracci". Prima
  // questo nome era atteso come isolamento sulle spalle, e il test era la prova
  // che il classificatore sbagliava: 45 kg per braccio non sono un isolamento.
  ['Chest Supported Dumbbell Shrug', 'composto'],
  ['Shrug con manubri', 'composto'],
  ['Shrug sulla macchina', 'composto'],
  ['Scrollate con bilanciere', 'composto'],
  ['Seated Dumbbell Shoulder Press', 'composto'],
  ['Bodyweight Overhead Tricep Extension', 'assistito'],
  ['Spinte in basso', 'composto'],
  ];
  for (const [nome, atteso] of casi) {
    const r = classificaEsercizio({ nome });
    assert.equal(r.livello, atteso, nome + ' -> preso ' + r.livello + ' invece di ' + atteso);
  }
});


test('C15. i 27 esercizi della scheda di Ste hanno il livello giusto', async () => {
  // Non basta indovinare in generale: se sbaglia su quelli che usa davvero,
  // tutto il Rank torna sbagliato. Qui sono fissati tutti e 27.
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const attesi = {
    'ex-chest-press': 'composto', 'ex-cable-hammer-curl': 'isolamento',
    'ex-cable-lateral-raise': 'isolamento', 'ex-cable-overhead-tricep': 'isolamento',
    'ex-leg-extension': 'isolamento', 'ex-neutral-grip-lat-pulldown': 'composto',
    'ex-dumbbell-bench-pull': 'isolamento', 'ex-seated-db-shoulder-press': 'composto',
    'ex-cable-fly': 'isolamento', 'ex-scott-bench-curl': 'isolamento',
    'ex-single-arm-tricep-pushdown': 'isolamento', 'ex-seated-leg-curl': 'isolamento',
    'ex-smith-incline-bench': 'composto', 'ex-seated-cable-row': 'composto',
    'ex-chest-supported-shrug': 'composto', 'ex-sled-press-calf-raise': 'grande',
    'ex-single-leg-press': 'grande', 'ex-one-arm-preacher-curl': 'isolamento',
    'ex-one-arm-cable-reverse-fly': 'isolamento', 'ex-wrist-curl': 'isolamento',
    'ex-iso-lateral-row': 'composto', 'ex-lat-pulldown-lats': 'composto',
    'ex-db-lateral-raise': 'isolamento', 'ex-lying-cable-curl': 'composto',
    'ex-bodyweight-overhead-tricep': 'assistito', 'ex-pull-ups': 'assistito',
    'ex-dips': 'assistito',
  };
  for (const e of ESERCIZI) {
    const r = classificaEsercizio({ nome: e.nome, convenzione: e.convenzione });
    assert.equal(r.livello, attesi[e.id], e.nome + ': preso ' + r.livello + ' invece di ' + attesi[e.id]);
  }
});
