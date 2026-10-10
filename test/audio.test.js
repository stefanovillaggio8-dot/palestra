// audio.test.js -- i suoni dell'app devono esistere, essere brevi e poter essere spenti.
//
// Ste (10/10/2026): "per l'app palestra non è vero che valgono, non l'avevo detto che
// valeva per questa app". Prima la regola diceva "niente audio mai" e io l'avevo
// applicata anche qui per sbaglio: quella regola valeva per un altro programma.
//
// L'app adesso suona. I test qui sotto verificano tre cose che non si vedono a
// schermo e che sono quelle che si rompono: che i suoni siano generati e non
// scaricati (se no, offline l'app è muta), che siano brevi (un suono lungo in
// palestra diventa una cosa da spegnere) e che si possano spegnere.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const srcAudio = await readFile(new URL('../src/audio.js', import.meta.url), 'utf8');
const srcApp = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

const { audioSpento, impostaAudioSpento, suona, statoAudio } = await import('../src/audio.js');

test('A1. i suoni sono GENERATI, non scaricati da un file', () => {
  // Il motivo della scelta, in tre righe: un suono scaricato dal server la prima
  // volta e poi tenuto in cache è fragile — se la cache si pulisce, l'app è muta e
  // non c'è nessun errore che lo dica. Un'onda generata al momento non può mancare.
  assert.equal(/fetch\(/.test(srcAudio), false,
    'non si scarica niente: se la cache si pulisce l\'app deve continuare a suonare');
  assert.equal(/new Audio\(/.test(srcAudio), false, 'niente elementi audio');
  assert.match(srcAudio, /createOscillator\(\)/, 'i suoni si generano con un oscillatore');
  assert.match(srcAudio, /createGain\(\)/, 'e il volume si controlla');
});

test('A2. l\'audio si sblocca con un TOCCO, non all\'avvio', () => {
  // Safari e Chrome sui telefoni non fanno suonare niente se il contesto audio non
  // è stato aperto da un gesto dell'utente. Sbloccarlo all'avvio non avrebbe
  // effetto, perché all'avvio non è ancora successo nessun gesto.
  assert.match(srcApp, /window\.addEventListener\('pointerdown', sbloccaAlPrimoTocco\)/,
    'si sblocca al primo tocco');
  assert.match(srcApp, /window\.addEventListener\('keydown', sbloccaAlPrimoTocco\)/,
    'e anche con la tastiera: chi usa l\'app dal computer deve sentire qualcosa');
  assert.match(srcApp, /window\.removeEventListener\('pointerdown', sbloccaAlPrimoTocco\)/,
    'e l\'ascolto si toglie dopo il primo tocco: non deve restare un costo per sempre');
  // e non deve mai far cadere l'app: senza Web Audio l'app funziona lo stesso, muta
  assert.match(srcAudio, /if \(!AC\) return;/, 'se il browser non ha l\'audio, si torna');
});

test('A3. nessun suono dura più di mezzo secondo', () => {
  // In palestra il telefono è in tasca e le mani sono occupate. Un suono lungo
  // diventa una cosa da spegnere, e una cosa da spegnere è un rumone che spegni
  // anche quando arriva qualcosa che conta.
  const durate = [...srcAudio.matchAll(/nota\([^,]+,\s*[\d.]+,\s*([\d.]+),/g)].map((m) => Number(m[1]));
  assert.ok(durate.length >= 4, 'ci sono dei suoni da controllare');
  const lunga = durate.filter((d) => d > 0.5);
  assert.deepEqual(lunga, [], `nessun suono può durare più di mezzo secondo: trovati ${lunga}`);
});

test('A4. i suoni sono dove devono stare: serie e fine allenamento', () => {
  // Il suono della serie è il più importante: le mani sono occupate e gli occhi
  // guardano il bilanciere, non lo schermo.
  assert.match(srcApp, /suona\(fatta \? 'serie' : 'togli'\);/,
    'spuntare la serie suona, toglierla suona diverso');
  assert.match(srcApp, /suona\('sessione'\);/,
    'e finire l\'allenamento suona');
  // e il suono sta DOPO l'annuncio scritto: se suonasse prima, il suono coprirebbe
  // la parola e l'annuncio non si leggerebbe
  const iAnnuncio = srcApp.indexOf('annunciaFineSeduta(rankPrima');
  const iSuono = srcApp.indexOf("suona('sessione');");
  assert.ok(iAnnuncio > 0 && iSuono > iAnnuncio,
    'il suono viene dopo l\'annuncio scritto, non prima');
});

test('A5. i suoni si possono spegnere, e la scelta si ricorda', () => {
  // Non è per far contenta nessuna regola: sei in una palestra e ogni tanto
  // qualcuno ha la musica alta. Se non lo puoi spegnere, la prima cosa che fai è
  // togliere l'app dalla home.
  assert.match(srcApp, /function bloccoSuoni\(\)/, 'c\'è il blocco dei suoni');
  assert.match(srcApp, /zona\.appendChild\(bloccoSuoni\(\)\);/, 'chiamato nelle impostazioni');
  assert.match(srcApp, /Spegni i suoni/, 'con l\'interruttore');
  assert.match(srcApp, /db\.scriviMeta\('audio_spento'/, 'e la scelta viene ricordata');
  assert.match(srcApp, /db\.leggiMeta\('audio_spento'/, 'e riletta all\'apertura');
});

test('A6. spento, non si sente niente', async () => {
  // Il comportamento vero, non quello scritto: senza contesto audio non esce
  // niente comunque, e la funzione non deve fare eccezioni né rompersi.
  const prima = statoAudio();
  assert.equal(prima.haContesto, false, 'nel test non c\'è un contesto audio, e va bene');
  // senza contesto non deve succedere niente
  suona('serie');
  suona('sessione');
  suona('record');
  // e l'interruttore funziona
  impostaAudioSpento(true);
  assert.equal(audioSpento(), true, 'l\'interruttore mette a spento');
  suona('serie');
  assert.equal(audioSpento(), true, 'e resta spento');
  impostaAudioSpento(false);
  assert.equal(audioSpento(), false, 'e si riaccende');
});

test('A7. il file dei suoni è nella cache, o offline l\'app è muta', () => {
  // Il test di integrità l'ha già segnalato una volta: senza questa riga nella
  // lista del service worker, l'app suona solo con la rete accesa. E non è un
  // errore: è una cosa che semplicemente non parte, ed è il modo peggiore in cui
  // può rompersi.
  assert.match(sw, /'\.\/src\/audio\.js'/, 'audio.js deve essere precaricato');
});