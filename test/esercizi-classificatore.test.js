// esercizi-classificatore.test.js -- l'app riconosce l'esercizio dal nome.
//
// Ste (04/10/2026): "deve riconoscere si, per questo ti ho detto se puoi
// metterci un ia, e' possibile?"

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { standardPerMovimento } from '../src/rank-v3/modello.js';
import { movimentoDi } from '../src/rank-v3/valutazione.js';
import { valoriPerEsercizio } from '../src/rank-v2/valori.js';
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
  assert.equal(liv('Lat Pulldown presa stretta'), 'composto');
  assert.equal(liv('Seated Cable Row'), 'composto');
  assert.equal(liv('Shoulder Press'), 'composto');
});

test('C3. i carichi alti sono "grandi"', () => {
  assert.equal(liv('Sled Press'), 'grande');
  assert.equal(liv('Leg Press'), 'grande');
  assert.equal(liv('Squat'), 'grande');
  assert.equal(liv('Stacco'), 'grande');
});

test('C4. "assistito" vuol dire che la MACCHINA ti aiuta, non che usi il corpo', () => {
  // Ste (13/10/2026): "se vado nei rank e vedo dips c'è scritto ASSISTITO ma non
  // è assistito, stessa cosa nei pull ups".
  //
  // Prima questi quattro erano "assistito" perché finivano in un secchio che si
  // beveva le parole "dip", "dips", "pull up" e "trazioni". Ma "assistito" è
  // una parola sola per due cose opposte: l'assistenza è la macchina che ti
  // REGGE e più ne metti e più è facile, i zavorri sono il contrario. Sui Rank
  // compariva scritto il nome dell'opposto di quello che stavi facendo.
  //
  // Quindi il corpo libero VERAMENTE assistito resta "assistito", e quello col
  // peso del corpo più zavorri è un composto come tutti gli altri.
  // Ste (13/10/2026): "nelle trazioni non vengo manco assistito, mi appendo e
  // basta". Quindi nemmeno "trazioni assistite" è assistito: in palestra le
  // trazioni non si fanno assistite. L'unico assistito vero della scheda è
  // l'esercizio al cavo, che arriva qui dalla parola "bodyweight" (e dalla parola
  // nuova "one arm overhead tricep extension", perche' Ste lo ha rinominato il
  // 21/10/2026 e il nome nuovo non ha piu' la parola "bodyweight").
  assert.equal(liv('Trazioni assistite'), 'composto',
    'le trazioni non si fanno assistite: ci si appendo e basta');
  // Ste (21/10/2026): "dice che i kg sono assistiti, sistema il rank e sistema
  // il classificamento". I kg ASSISTITI sono quelli che la MACCHINA ti regge: e'
  // quello che decide, non il nome. Quindi l'esercizio al cavo resta assistito, e
  // quello fatto col braccio e col corpo no: e' un isolamento del tricipite.
  assert.equal(liv('One Arm Overhead Tricep Extension', { convenzione: 'assistenza' }), 'assistito',
    'al cavo il numero è il peso che ti viene tolto: quello è assistito vero');
  assert.equal(liv('One Arm Overhead Tricep Extension'), 'isolamento',
    'fatto col braccio e col corpo non è assistito: è un isolamento del tricipite');
  assert.equal(liv('One Arm Overhead Tricep Extension', { convenzione: 'corpo_libero' }), 'isolamento',
    'e con la convenzione del corpo libero lo stesso');
  assert.equal(liv('Trazioni zavorrate'), 'composto',
    'le trazioni col peso del corpo non sono assistite: più kg è più difficile');
  assert.equal(liv('Dips zavorrati'), 'composto',
    'i dips nemmeno: sono una spinta, e la spinta è un composto');
  assert.equal(liv('Push Up'), 'composto', 'il push up pure');
});

test('C4b. le trazioni e i dips non sono la stessa cosa', () => {
  // Lo stesso difetto faceva cadere i due nella stessa risposta. Una tirata e
  // una spinta sono due movimenti diversi, su muscoli diversi.
  const tirata = classificaEsercizio({ nome: 'Trazioni zavorrate' });
  const spinta = classificaEsercizio({ nome: 'Dips zavorrati' });
  assert.notEqual(tirata.movimento, spinta.movimento,
    'trazioni e dips devono essere due movimenti diversi');
  assert.equal(tirata.gruppo, 'dorso', 'le trazioni tirano: dorso');
  assert.equal(spinta.gruppo, 'petto', 'i dips spingono: petto');
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
    ['Lat Pulldown presa stretta', 'dorso'],
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
  for (const nome of ['Chest Press', 'Dumbbell Lateral Raise', 'Leg Press', 'Trazioni zavorrate', 'xyz']) {
    const r = classificaEsercizio({ nome });
    assert.ok(Array.isArray(r.motivi) && r.motivi.length > 0, nome + ': deve dire il perche\'');
    assert.ok(['alta', 'media', 'bassa'].includes(r.confidenza), nome + ': e quanto e\' sicuro');
  }
});

test('C9. la macchina non cambia che movimento è', () => {
  // Bug mio: "Lat Pulldown presa stretta" prendeva -2 due volte (parola + convenzione)
  // e finiva per scendere a isolamento. Adesso non si scende MAI di livello:
  // la macchina rende l'esercizio più facile, non è un altro movimento.
  assert.equal(liv('Lat Pulldown presa stretta', { convenzione: 'macchina' }), 'composto');
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

test('C15. leg curl, hip thrust e pec deck usano il movimento corretto', () => {
  const legCurl = classificaEsercizio({ nome: 'Seated Leg Curl' });
  assert.equal(legCurl.movimento, 'gambe_curl',
    'la leg curl deve raggiungere la sua scala dedicata, non gambe_isolamento');

  const hipThrust = classificaEsercizio({ nome: 'Barbell Hip Thrust' });
  assert.equal(hipThrust.movimento, 'gambe_stabilizzatore',
    'hip thrust deve usare lo standard d estensione d anca dedicato');

  const gluteBridge = classificaEsercizio({ nome: 'Glute Bridge' });
  assert.equal(gluteBridge.movimento, 'gambe_stabilizzatore');

  const pecDeck = classificaEsercizio({ nome: 'Pec Deck' });
  assert.equal(pecDeck.movimento, 'petto_isolamento',
    'pec deck senza indicazione reverse non deve ereditare la scala del deltoide posteriore');

  const reversePecDeck = classificaEsercizio({ nome: 'Reverse Pec Deck Rear Delt' });
  assert.equal(reversePecDeck.movimento, 'spalle_posteriori');
});

test('C16. squat, stacco e leg press hanno classificazione e standard indipendenti', () => {
  const squat = classificaEsercizio({ nome: 'Back Squat' });
  const hackSquat = classificaEsercizio({ nome: 'Hack Squat Machine' });
  const deadlift = classificaEsercizio({ nome: 'Conventional Deadlift' });
  const romanianDeadlift = classificaEsercizio({ nome: 'Romanian Deadlift' });
  const legPress = classificaEsercizio({ nome: '45 Degree Leg Press' });

  assert.equal(squat.movimento, 'gambe_squat');
  assert.equal(hackSquat.movimento, 'gambe_squat_macchina');
  assert.equal(deadlift.movimento, 'gambe_stacco');
  assert.equal(romanianDeadlift.movimento, 'gambe_stacco_rumeno');
  assert.equal(legPress.movimento, 'gambe_pressa');

  const standardSquat = standardPerMovimento(squat.movimento, { nome: 'Back Squat' });
  const standardDeadlift = standardPerMovimento(deadlift.movimento, { nome: 'Conventional Deadlift' });
  const standardPressa = standardPerMovimento(legPress.movimento, { nome: '45 Degree Leg Press' });
  assert.equal(standardSquat.vertice, 2.75);
  assert.equal(standardDeadlift.vertice, 3.25);
  assert.equal(standardPressa.vertice, 3.10);
  assert.ok(standardDeadlift.vertice > standardSquat.vertice);
  assert.notEqual(standardSquat.vertice, standardPressa.vertice);

  // Anche il motore legacy deve riconoscere le nuove famiglie: altrimenti un
  // fallback v2 perderebbe il riferimento appena il classificatore cambia ID.
  assert.equal(valoriPerEsercizio('gambe_squat').multiplo, 2.75);
  assert.equal(valoriPerEsercizio('gambe_stacco').multiplo, 3.25);
  assert.equal(valoriPerEsercizio('gambe_pressa', { convenzione: 'per_gamba' }).multiplo, 1.1);
  assert.equal(valoriPerEsercizio('gambe_stabilizzatore').multiplo, 3.75);
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
  ['Push up', 'composto'],
  ['Piegarimenti', 'composto'],
  ['Shoulder Press in piedi', 'composto'],
  ['Spinte in alto con bilanciere', 'composto'],
  ['Military Press', 'composto'],
  ['Lat Pulldown presa stretta', 'composto'],
  ['Trazioni', 'composto'],
  ['Trazioni assistite', 'composto'], // le trazioni non si fanno assistite
  ['Dips zavorrati', 'composto'],
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
  // anche qui il test fissava il bug: "Sled Press Calf Raise" stava come
  // "grande" perche' conteneva "sled press", quindi gli dava il tetto del leg
  // press (165 kg) per un esercizio sui polpacci. Ora vince "calf".
  ['Sled Press Calf Raise', 'isolamento'],
  ['Squat', 'grande'],
  ['Stacco', 'grande'],
  ['Hip Thrust', 'composto'],
  ['Leg Extension', 'isolamento'],
  ['Seated Leg Curl', 'isolamento'],
  ['Single Leg Press', 'grande'],
  ['Leg Curl', 'isolamento'],
  ['Calf Raise', 'isolamento'],
  ['Crunch', 'isolamento'],
  ['Plank', 'isolamento'],
  ['Iso-Lateral Row', 'composto'],
  ['Trazioni zavorrate', 'composto'],
  // Ste (06/10/2026): "e' una tirata del trapezio con pesi sui due bracci". Prima
  // questo nome era atteso come isolamento sulle spalle, e il test era la prova
  // che il classificatore sbagliava: 45 kg per braccio non sono un isolamento.
  ['Chest Supported Dumbbell Shrug', 'composto'],
  ['Shrug con manubri', 'composto'],
  ['Shrug sulla macchina', 'composto'],
  ['Scrollate con bilanciere', 'composto'],
  ['Seated Dumbbell Shoulder Press', 'composto'],
  ['One Arm Overhead Tricep Extension', 'isolamento'],
  ['Spinte in basso', 'composto'],
  ];
  for (const [nome, atteso] of casi) {
    const r = classificaEsercizio({ nome });
    assert.equal(r.livello, atteso, nome + ' -> preso ' + r.livello + ' invece di ' + atteso);
  }
});

test('C14b. nel nome, il MUSCOLO vince sulla MACCHINA', async () => {
  // La regola nuova, e il motivo per cui esiste.
  //
  // Un nome puo' contenere due cose vere: la MACCHINA (dove lo fai) e il
  // MOVIMENTO (che muscolo lavori). "Sled Press Calf Raise" e' fatto di entrambe.
  // Prima vinceva la macchina, perche' "sled press" e' una frase (2 punti) e
  // "calf" una parola sola (1 punto), e il classificatore dava ai polpacci il tetto
  // del leg press: 165 kg su corpo 75. Il risultato era che chi faceva 60 kg di
  // calf raise restava sotto il primo livello per sempre, con la scala che gli
  // chiedeva numeri fuori portata umana.
  //
  // Quindi: se nel nome c'e' una parola che identifica il muscolo, quella vince
  // sulla macchina. La macchina dice solo DOVE, il muscolo dice COSA.
  const casi = [
    // macchina pesante + muscolo specifico = il muscolo
    ['Sled Press Calf Raise', 'isolamento'],
    ['Leg Press Calf Raise', 'isolamento'],
    ['Hack Squat Calf Raise', 'isolamento'],
    // la macchina da sola resta "grande": non c'e' nessun muscolo che vince
    ['Leg Press', 'grande'],
    ['Sled Press', 'grande'],
    ['Hack Squat', 'grande'],
    ['Squat', 'grande'],
    // e un isolamento col nome giusto resta un isolamento
    ['Calf Raise', 'isolamento'],
    ['Seated Leg Curl', 'isolamento'],
    ['Wrist Curl', 'isolamento'],
  ];
  for (const [nome, atteso] of casi) {
    const r = classificaEsercizio({ nome });
    assert.equal(r.livello, atteso, nome + ' -> preso ' + r.livello + ' invece di ' + atteso);
  }
  // il caso che ha fatto scattare tutto: il tetto dei polpacci non puo' essere
  // quello del leg press. 165 kg su corpo 75 per un calf raise non esiste.
  const v2 = await import('../src/rank-v2/index.js');
  // Due macchine diverse, due tetti diversi. Ste (10/10/2026): "110 kg monogamba
  // sulla macchina orizzontale", e con un tetto unico era OLYMPIAN a tutti i costi.
  // Il carrello resta sotto il tetto della pressa; la pressa orizzontale puo' stare
  // vicino alla leg press perche' le gambe spingono una pila di dischi come li',
  // ma non lo supera.
  const carrello = { id: 'x', nome: 'Standing Calf Raise', convenzione: 'macchina' };
  const pressaCalf = { id: 'x', nome: 'Sled Press Calf Raise', convenzione: 'macchina' };
  const pressa = { id: 'y', nome: 'Single Leg Press', convenzione: 'macchina' };
  const rCarrello = v2.valutaEsercizio({ esercizio: carrello, serie: [{ id: 's', peso: 20, ripetizioni: 8 }], pesoCorporeo: 75 });
  const rCalf = v2.valutaEsercizio({ esercizio: pressaCalf, serie: [{ id: 's', peso: 20, ripetizioni: 8 }], pesoCorporeo: 75 });
  const rPressa = v2.valutaEsercizio({ esercizio: pressa, serie: [{ id: 's', peso: 20, ripetizioni: 8 }], pesoCorporeo: 75 });
  assert.ok(rCarrello.vertice < rCalf.vertice,
    `il carrello e la pressa orizzontale non possono avere lo stesso tetto: ${rCarrello.vertice} contro ${rCalf.vertice}`);
  assert.ok(rCalf.vertice < rPressa.vertice,
    `i polpacci non possono avere il tetto della pressa: ${rCalf.vertice} contro ${rPressa.vertice}`);
  // il numero esatto dei due tetti non e' fissato qui: quello che conta e' che il
  // carrello resti sotto il tetto della pressa orizzontale, che a sua volta resti
  // sotto la leg press, e che i numeri siano umani. 165 kg su corpo 75 per un calf
  // raise col carrello non esistono, e il test deve dirlo senza fissare il multiplo.
  assert.ok(rCarrello.vertice <= 75,
    `un calf raise col carrello non chiede piu' di 1x il corpo (75 kg), e chiede ${rCarrello.vertice}`);
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
    'ex-chest-supported-shrug': 'composto',
    // IL SLED PRESS CALF RAISE E' "isolamento", e fino al 08/10/2026 questo test
    // diceva "grande". Fissava il BUG: il classificatore leggeva "sled press"
    // (una macchina per gambe, che pesa tanto) e ignorava "calf raise" (i
    // polpacci), quindi il tetto di quell'esercizio era 165 kg su corpo 75.
    // Nessuno al mondo fa 165 kg di sollevamento sul pino: la scala li stava
    // chiedendo una cosa fuori portata, e chi lo faceva restava sotto il primo
    // livello per sempre. Ora vince il muscolo, non la sala in cui lo fai.
    'ex-sled-press-calf-raise': 'isolamento',
    'ex-single-leg-press': 'grande', 'ex-one-arm-preacher-curl': 'isolamento',
    'ex-one-arm-cable-reverse-fly': 'isolamento', 'ex-wrist-curl': 'isolamento',
    'ex-iso-lateral-row': 'composto', 'ex-lat-pulldown-lats': 'composto',
    'ex-db-lateral-raise': 'isolamento', 'ex-lying-cable-curl': 'composto',
    // Il Bodyweight Overhead Tricep Extension al cavo E' assistenza vera. Trazioni
    // e dips no: sono composti col peso del corpo, non esercizi assistiti.
'ex-bodyweight-overhead-tricep': 'assistito', 'ex-pull-ups': 'composto',
  'ex-dips': 'composto',
  // Il fratello a presa larga (Ste, 18/10/2026): stesso attrezzo della stretta, ma il
  // classificatore deve dargli il movimento con il tetto piu' basso, altrimenti chi fa il
  // largo viene giudicato come chi fa lo stretto.
  'ex-wide-grip-lat-pulldown': 'composto',
  
  // ESERCIZI AGGIUNTI (Ste, 21/10/2026): sono arrivati da WhatsApp, e
  // ogni esercizio ha il suo livello come tutti gli altri.
  'ex-incline-side-lying-lateral-raise': 'isolamento',
  'ex-iso-lateral-low-row': 'composto',
  'ex-hammer-curl-dumbbell': 'isolamento',
  'ex-high-to-low-cable-fly': 'isolamento',
  'ex-dumbbell-reverse-fly': 'isolamento',
  'ex-dumbbell-row': 'composto',
  'ex-dumbbell-spider-curl': 'isolamento',
  'ex-iso-lateral-high-row': 'composto',
  'ex-double-kettlebell-row': 'composto',
  'ex-dumbbell-bench-press': 'composto',
  'ex-dumbbell-concentration-curl': 'isolamento',
  'ex-dumbbell-curl': 'isolamento',
  'ex-dumbbell-deadlift': 'grande',
  'ex-dumbbell-face-pull': 'isolamento',
  'ex-incline-bench-press': 'composto',
  'ex-incline-cable-curl': 'isolamento',
  'ex-incline-dumbbell-bench-press': 'composto',
  'ex-incline-dumbbell-curl': 'isolamento',
  'ex-incline-hammer-curl': 'isolamento',
  'ex-ez-bar-curl': 'isolamento',
  'ex-ez-bar-lying-tricep-extension': 'isolamento',
  'ex-ez-bar-preacher-curl': 'isolamento',
  'ex-ez-bar-spider-curl': 'isolamento',
  'ex-seated-dumbbell-curl': 'isolamento',
  'ex-seated-dumbbell-lateral-raise': 'isolamento',
  'ex-seated-dumbbell-tricep-extension': 'isolamento',
  'ex-seated-hammer-curl': 'isolamento',
  'ex-shoulder-pin-press': 'composto',

  // ESERCIZI AGGIUNTI (Ste, 21/10/2026): sono arrivati da WhatsApp, e
  // ogni esercizio ha il suo livello come tutti gli altri.
  'ex-bench-pin-press': 'composto',
  'ex-bench-press': 'composto',
  'ex-bench-pull': 'isolamento',
  'ex-bent-arm-barbell-pullover': 'composto',
  'ex-bent-over-dumbbell-row': 'composto',
  'ex-bent-over-row': 'composto',
  'ex-cable-bicep-curl': 'isolamento',
  'ex-cable-chest-press': 'composto',
  'ex-cable-crunch': 'isolamento',
  'ex-cable-reverse-fly': 'isolamento',
  'ex-deadlift': 'grande',
  'ex-decline-bench-press': 'composto',
  'ex-decline-dumbbell-bench-press': 'composto',

  // ESERCIZI AGGIUNTI (Ste, 21/10/2026): vengono dalla lista.
  'ex-face-pull': 'isolamento',
  'ex-back-extension': 'isolamento',
  'ex-smith-machine-bench-press': 'composto',
  'ex-smith-machine-bent-over-row': 'composto',
  'ex-smith-machine-shrug': 'composto',
  'ex-jm-press': 'isolamento',

  // ESERCIZI AGGIUNTI (Ste, 21/10/2026): dalla lista e i due a corpo libero.
  'ex-trazioni-corpo-libero': 'composto',
  'ex-dips-corpo-libero': 'composto',

  // ESERCIZI AGGIUNTI (Ste, 21/10/2026): dalla lista e i due a corpo libero.
  'ex-one-arm-overhead-tricep-extension': 'isolamento',
};
  for (const e of ESERCIZI) {
    const r = classificaEsercizio({ nome: e.nome, convenzione: e.convenzione });
    assert.equal(r.livello, attesi[e.id], e.nome + ': preso ' + r.livello + ' invece di ' + attesi[e.id]);
  }
});

test('C14c. i bicipiti sulla PANCA hanno una scala loro, non quella del cavo', async () => {
  // Ste (08/10/2026): "il preacher curl non sarebbe bicipiti sulla panca scott?".
  // Ha ragione: il preacher curl e il Scott bench curl sono lo STESSO esercizio (un
  // manubrio singolo, un braccio alla volta, panca inclinata col cuscino). E prima
  // finivano dentro "bicipiti", insieme al curl al CAVO, prendendone la scala:
  // tetto 46,2 kg per braccio, che chi ci arrivava prendeva TITAN.
  //
  // Quel numero col manubrio in panca non e' realistico: sul cavo la doppia
  // carrucola dimezza, quindi 46 kg per braccio sono 92 kg sul carrello e si vedono
  // in palestra; col manubrio non si dimezza niente e il limite e' il bilanciere e
  // l'equilibrio, non il bicipite.
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const { classificaEsercizio } = await import('../src/esercizi-classificatore.js');
  const { recordEsercizio } = await import('../src/rank.js');
  const perId = (id) => ESERCIZI.find((e) => e.id === id);

  const casi = [
    ['One Arm Dumbbell Preacher Curl', 'bicipiti_panca'],
    ['Preacher Curl', 'bicipiti_panca'],
    ['Scott Bench Curl seduto al contrario', 'bicipiti_panca'],
    // e il cavo resta coi bicipiti normali, con la sua scala (tetto 0,7x)
    ['Cable Hammer Curl', 'bicipiti'],
    ['Bicipiti con bilanciere', 'bicipiti'],
  ];
  for (const [nome, atteso] of casi) {
    assert.equal(classificaEsercizio({ nome }).movimento, atteso,
      nome + ' -> presa ' + classificaEsercizio({ nome }).movimento + ' invece di ' + atteso);
  }

  const pre = perId('ex-one-arm-preacher-curl');
  const cavo = perId('ex-cable-hammer-curl');

  // la scala e' DIVERSA, e piu' bassa di quella del cavo
  const aPanca = recordEsercizio([{ id: 's', peso: 18, ripetizioni: 8, stato: 'fatta' }], pre, null, 66);
  const aCavo = recordEsercizio([{ id: 's', peso: 50, ripetizioni: 6, stato: 'fatta' }], cavo, null, 66);
  // Il preacher curl È PIÙ DURO del curl al cavo (niente slancio, braccio bloccato):
  // il suo tetto È PIÙ BASSO (più difficile raggiungere l'elite).
  assert.ok(aPanca.vertice < aCavo.vertice,
    `il tetto col manubrio in panca È PIÙ BASSO di quello del cavo (più difficile): `
    + `${aPanca.vertice} contro ${aCavo.vertice}`);
  // 46 kg per braccio con manubrio in panca SONO un risultato ELITE (TITAN)
  const assurdo = recordEsercizio([{ id: 's', peso: 46, ripetizioni: 8, stato: 'fatta' }], pre, null, 66);
  assert.ok(assurdo.rank && assurdo.rank.id === 'titan',
    `46 kg per braccio col manubrio in panca SONO TITAN: è un risultato d'élite ` 
    + `(tetto ${assurdo.vertice}, score ${assurdo.score})`);

  // IL PEZZO CHE CONTA, e che non si vede guardando un solo corpo.
  //
  // I due tentativi sbagliati (tetto 0,40x con ingresso 0,15x e poi 0,26x)
  // sembravano giusti guardando il corpo di Ste, ma al variare del corpo compariva
  // un BUCO: chi pesava 75 kg con gli stessi 18 kg per braccio non aveva nessun
  // livello, mentre chi pesava 55 kg era a PLATINUM. Sei Rank di scarto fra due
  // persone che fanno lo stesso esercizio con lo stesso carico.
  //
  // Quindi qui si verifica la regola vera: con gli stessi kg per braccio, la
  // posizione SCENDE REGOLARMENTE col peso corporeo, senza salti e senza buchi.
  const posizione = (P) => {
    const r = recordEsercizio([{ id: 's', peso: 18, ripetizioni: 8, stato: 'fatta' }], pre, null, P);
    return r.rank ? r.rank.id : 'nessuno';
  };
// Il buco da evitare NON e' "nessun livello": e' il SALTO. Con 18 kg per braccio
  // chi pesa 85 kg puo' stare sotto l'ingresso, e va bene: il suo bicipite non e'
  // forte per il suo corpo. Il difetto vero era un corpo da 55 kg a PLATINUM e uno
  // da 75 kg a NESSUN livello: sei Rank di scarto, e il salto dipendeva dal fatto che
  // l'ingresso saliva piu' in fretta del tetto.
  //
  // Quindi qui si controlla la CONTINUITA': ogni corpo deve trovarsi nella fascia
  // subito sotto quella del corpo precedente, non sei fasce piu' in basso. E se un
  // corpo e' sotto l'ingresso, il successivo deve esserlo anch'esso.
  const corpi = [55, 66, 75, 85, 100];
  const posizioni = corpi.map(posizione);
  const scala = ['nessuno', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'titan', 'olympian'];
  for (let i = 0; i < corpi.length; i++) {
    if (i === 0) continue;
    const a = scala.indexOf(posizioni[i - 1]);
    const b = scala.indexOf(posizioni[i]);
    // non sale mai col peso, e non scende di piu' di una fascia per corpo
    assert.ok(b <= a,
      `chi pesa di piu' non puo' fare meglio: corpo ${corpi[i - 1]}=${posizioni[i - 1]} `
      + `ma corpo ${corpi[i]}=${posizioni[i]}`);
    assert.ok(a - b <= 1,
      `la posizione non puo' saltare piu' di una fascia fra due corpi vicini: `
      + `corpo ${corpi[i - 1]}=${posizioni[i - 1]} -> corpo ${corpi[i]}=${posizioni[i]}`);
  }
});


test('C17. la cache distingue gli esercizi con carrucola diversa', () => {
  // Stesso nome, ma la doppia carrucola cambia la meccanica: non si può
  // riutilizzare la classificazione calcolata senza quel dato.
  const nome = 'Cable Hammer Curl cache carrucola';
  const normale = classificaEsercizio({ nome, carrucola: null });
  const doppia = classificaEsercizio({ nome, carrucola: 'carrucola_doppia' });
  assert.equal(normale.movimento, doppia.movimento);
  assert.notEqual(normale.pesoModificatori, doppia.pesoModificatori);
  assert.ok(doppia.motivi.some((m) => m.includes('doppia carrucola')));
});


test('C18. il motore usa anche la descrizione per riconoscere il movimento', () => {
  const r = movimentoDi({ nome: 'Esercizio personalizzato', descrizione: 'Leg press a 45 gradi' });
  assert.equal(r.movimento, 'gambe_pressa');
});


test('C19. hack squat, front squat e RDL non ereditano lo standard del back squat/stacco', () => {
  const casi = [
    ['Hack Squat', 'gambe_squat_macchina', 3.75],
    ['Power Squat Machine', 'gambe_squat_macchina', 3.75],
    ['Front Squat', 'gambe_squat_front', 2.25],
    ['Back Squat', 'gambe_squat', 2.75],
    ['Romanian Deadlift', 'gambe_stacco_rumeno', 2.75],
    ['Stacco rumeno', 'gambe_stacco_rumeno', 2.75],
    ['Conventional Deadlift', 'gambe_stacco', 3.25],
  ];
  for (const [nome, movimento, vertice] of casi) {
    const classificazione = classificaEsercizio({ nome });
    assert.equal(classificazione.movimento, movimento, nome + ' classificazione');
    assert.equal(standardPerMovimento(movimento, { nome }).vertice, vertice, nome + ' standard v3');
    assert.equal(valoriPerEsercizio(movimento).multiplo, vertice, nome + ' standard v2');
  }
});


test('C20. deadlift con manubri usa una scala per manubrio, non quella del bilanciere', () => {
  const nome = 'Dumbbell Deadlift';
  const classificazione = classificaEsercizio({ nome });
  assert.equal(classificazione.movimento, 'gambe_stacco_manubri');
  assert.equal(standardPerMovimento(classificazione.movimento, { nome }).vertice, 1.15);
  assert.equal(valoriPerEsercizio(classificazione.movimento).multiplo, 1.15);
  assert.ok(standardPerMovimento(classificazione.movimento, { nome }).vertice
    < standardPerMovimento('gambe_stacco', { nome: 'Deadlift' }).vertice);
});
