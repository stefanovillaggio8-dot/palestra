// muscoli-parti.test.js -- quale pezzo di muscolo lavora l'esercizio, e quanto e' duro.
//
// Ste (04/10/2026): 'il petto come il bicipite e le altre parti sono formati da
// diverse fibre muscolari e ci sono esercizi che servono per la parte alta e
// altri esercizi che servono per la parte bassa del petto'.
//
// Poi la stessa idea, un passo avanti: 'deve capire cosa lavora quell'esercizio e
// quindi capire se e' difficile o facile'. Per questo qui sotto c'e' anche il peso
// intrinseco di ogni muscolo e l'ordine dal facile al duro.
//
// Attenzione alla parola 'fibre': non e' quella la differenza, sono i CAPI del
// muscolo. Il test lo verifica: se l'app dicesse 'fibre diverse' non sarebbe
// solo impreciso, sarebbe falso, e su un'app che decide il tuo Rank conta.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parteDiMuscolo, stessoLavoro, AVVERTIMENTO_PARTI, PARTI,
  intrinsecoDi, livelloConMuscolo, ordinePerMuscolo, preposizioneMuscolo, PREP,
} from '../src/muscoli-parti.js';

const parte = (nome, descrizione = '') => parteDiMuscolo({ nome, descrizione });

test('M1. il petto ha una parte alta e una parte bassa, e le distingue', () => {
  // — il caso che ha citato Ste
  const alta = parte('Panca inclinata con bilanciere');
  const bassa = parte('Panca piana');
  assert.equal(alta.muscolo, 'petto');
  assert.equal(alta.nome, 'parte alta del petto');
  assert.equal(bassa.muscolo, 'petto');
  assert.equal(bassa.nome, 'parte bassa del petto');
  assert.notEqual(alta.parte, bassa.parte, 'devono essere due pezzi diversi');
});

test('M2. la descrizione conta, non solo il nome', () => {
  // l'esercizio si chiama "Panca" ma nella descrizione c'— scritto che —
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
  // Ste ha detto "fibre muscolari diverse". Non — così: un muscolo ha un solo
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
  // — la cosa che serve avvisare: due panche diverse non sono due allenamenti
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

test('M12. ogni pezzo di muscolo ha un peso intrinseco', () => {
  // Ste: "deve capire cosa lavora quell'esercizio e quindi capire se e'
  // difficile o facile". Se un pezzo non ha un peso, l'app non puo' giudicare.
  const senza = ['Dumbbell Lateral Raise', 'Leg Press', 'Scott Bench Curl', 'Cable Hammer Curl',
    'Calf Raise', 'Crunch', 'Bench Press', 'Pull Up', 'Lat Pulldown', 'Cable Fly', 'Crunch'];
  for (const n of senza) {
    const p = parteDiMuscolo({ nome: n });
    assert.equal(p.trovata, true, n + ' deve essere riconosciuto');
    assert.equal(typeof intrinsecoDi(p), 'number', n + ' deve avere un peso intrinseco');
  }
});

test('M13. il muscolo piccolo e instabile alza la difficolta', () => {
  // il deltoide laterale e' il punto debole di tutti: 4 kg li' sono duri
  const laterale = livelloConMuscolo({
    nome: 'Dumbbell Lateral Raise', livelloDalMovimento: 'isolamento',
  });
  assert.equal(laterale.intrinseco, 6);
  assert.equal(laterale.livello, 'composto',
    'un isolamento su un muscolo instabile va giudicato come piu\' difficile');
});

test('M14. il muscolo grande non abbassa la difficolta', () => {
  const gamba = livelloConMuscolo({ nome: 'Leg Press', livelloDalMovimento: 'grande' });
  assert.equal(gamba.intrinseco, 0);
  assert.equal(gamba.livello, 'grande',
    'la macchina la conosce gia\' il classificatore: qui il muscolo non deve toccare niente');
});

test('M15. il movimento decide quando il muscolo e\' normale', () => {
  const panca = livelloConMuscolo({ nome: 'Dumbbell Bench Press', livelloDalMovimento: 'composto' });
  assert.equal(panca.intrinseco, 0,
    'il petto e\' un muscolo grande: non aggiunge difficolta\' come le spalle laterali');
  assert.equal(panca.livello, 'composto', 'il petto non sposta il giudizio');
  assert.match(panca.frase, /difficolt[àa] normale/);
});

test('M16. il peso del corpo resta assistito', () => {
  const crunch = livelloConMuscolo({ nome: 'Crunch', livelloDalMovimento: 'assistito' });
  assert.equal(crunch.livello, 'assistito');
  assert.match(crunch.frase, /ripetizioni/);
});

test('M17. la posizione conta piu\' del peso nei bicipiti', () => {
  // stessa muscolo, stessa difficoltà dichiarata: cambia solo la posizione
  const alto = livelloConMuscolo({ nome: 'Scott Bench Curl', livelloDalMovimento: 'isolamento' });
  const basso = livelloConMuscolo({ nome: 'Cable Hammer Curl', livelloDalMovimento: 'isolamento' });
  assert.ok(alto.intrinseco > basso.intrinseco,
    'braccio in alto e\' posizione corta, in basso e\' posizione lunga');
  assert.match(alto.frase, /muscolo piccolo e instabile/);
});

test('M18. lo stesso muscolo si ordina dal facile al duro', () => {
  const out = ordinePerMuscolo([
    { nome: 'Cable Lateral Raise' },
    { nome: 'One Arm Cable Reverse Fly' },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].muscolo, 'spalle');
  assert.equal(out[0].esercizi[0].nome, 'One Arm Cable Reverse Fly',
    'il reverse fly e\' piu\' facile del lateral raise');
  assert.equal(out[0].esercizi[1].nome, 'Cable Lateral Raise');
});

test('M19. un muscolo solo non genera un ordine inutile', () => {
  const out = ordinePerMuscolo([{ nome: 'Leg Press' }, { nome: 'Bench Press' }]);
  assert.equal(out.length, 0, 'con un esercizio per muscolo non c\'e\' niente da ordinare');
});

test('M20. le frasi suonano bene: niente "Sul spalle"', () => {
  for (const [muscolo, atteso] of Object.entries(PREP)) {
    assert.equal(preposizioneMuscolo(muscolo), atteso);
    assert.doesNotMatch(preposizioneMuscolo(muscolo), /\b(spalle|gambe)\b(?!\b)/,
      '"Sul spalle" e "Sul gambe" sono sbagliati');
  }
  const out = ordinePerMuscolo([{ nome: 'Cable Lateral Raise' }, { nome: 'One Arm Cable Reverse Fly' }]);
  assert.match(out[0].frase, /^Sulle spalle:/);
});

test('M21. l\'avvertimento non parla mai di fibre diverse', () => {
  assert.doesNotMatch(AVVERTIMENTO_PARTI, /diverse fibre/i);
  assert.match(AVVERTIMENTO_PARTI, /un solo tipo di fibre/i);
  assert.doesNotMatch(AVVERTIMENTO_PARTI, /non lavora SOLO un pezzo\b(?! di muscolo)/i);
});

test('M22. stessoLavoro resta coerente col pezzo riconosciuto', () => {
  const a = parteDiMuscolo({ nome: 'Panca Inclinata con bilanciere' });
  const b = parteDiMuscolo({ nome: 'Smith Machine Incline Bench Press' });
  assert.equal(stessoLavoro(a, b), true, 'entrambe lavorano la parte alta del petto');
  const c = parteDiMuscolo({ nome: 'Dumbbell Lateral Raise' });
  assert.equal(stessoLavoro(a, c), false);
});
