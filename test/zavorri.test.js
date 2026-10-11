// zavorri.test.js -- trazioni e dips con i zavorri, non kg assistiti.
//
// Ste (10/10/2026): "nelle trazioni e dips non sono kg assistiti quelli che metto ma
// sono zavorrati. quindi quelli più anche quello mio corporeo di peso".
//
// LA DIFFERENZA NON È UNA SFUMATURA, È IL SEGNO.
//
// I kg ASSISTITI sono quello che la macchina ti REGGE: più ne metti e meno fatica
// fai, quindi il conto va al contrario e il punteggio SCENDE. I ZAVORRI sono il
// contrario esatto: sono un peso che ti schiaccia per terra, più ne metti e più
// fatica fai.
//
// Sull'app i due casi finivano nello stesso campo e nello stesso conto, quindi chi
// scriveva i zavorri si trovava contata l'assistenza: 20 kg di zavorri davano un
// punteggio come se la macchina ti avesse aiutato di 20 kg. Il Rank era il contrario
// del vero, e su due esercizi su cui Ste è Olympian.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { punteggioSerie, profiloEsercizio } from '../src/rank.js';
import { profiloPerPesoCorporeo, RIFERIMENTO_ZAVORRI_DEFAULT } from '../src/rank-config.js';
import { CONVENZIONI, ETICHETTE_CONVENZIONE, convenzioneConCorpo } from '../src/numeri.js';

const srcApp = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');

const zavorri = { id: 'ex-traz-zav', nome: 'Trazioni con zavorri', convenzione: 'zavorri', misura: 'solo_reps' };
const assistito = { id: 'ex-traz-ass', nome: 'Trazioni assistite', convenzione: 'assistenza', misura: 'solo_reps' };

test('Z1. i zavorri sono una convenzione tutta loro', () => {
  assert.equal(CONVENZIONI.ZAVORRI, 'zavorri', 'la convenzione esiste');
  assert.equal(convenzioneConCorpo('zavorri'), true, 'e si riconosce');
  assert.equal(convenzioneConCorpo('assistenza'), false,
    'l\'assistenza NON è la stessa cosa: è il contrario');
  assert.equal(convenzioneConCorpo('per_manubrio'), false);
  // e l'etichetta dice le due cose che servono: cosa scrivi e che c'è anche il corpo
  assert.match(ETICHETTE_CONVENZIONE.zavorri, /zavorri/i);
  assert.match(ETICHETTE_CONVENZIONE.zavorri, /corpo/i,
    'l\'etichetta deve dire che il tuo corpo conta, altrimenti 20 kg sembrano tutto');
  // e non è assistito: è il punto di tutto
  const prof = profiloEsercizio(zavorri);
  assert.equal(prof.assistito, false,
    'i zavorri NON sono un esercizio assistito: l\'assistenza va contata al contrario');
  assert.equal(prof.convenzione, 'zavorri');
});

test('Z2. il corpo si SOMMA ai zavorri, non si sottrae', () => {
  const prof = profiloPerPesoCorporeo(profiloEsercizio(zavorri), 85);
  const serie = { peso: 20, ripetizioni: 5, stato: 'fatta', peso_corpo: 85 };
  const r = punteggioSerie(serie, prof);
  assert.equal(r.valido, true, 'la serie deve essere valutabile');
  // 20 kg di zavorri + 85 kg di corpo = 105 kg
  assert.match(r.testo, /20 kg di zavorri \+ 85 kg del tuo corpo/,
    'il testo deve dire la somma: è la cosa che ti manca');
  assert.match(r.testo, /105 kg/, 'e il totale');
  assert.ok(r.punteggio > 0, 'e il punteggio deve essere positivo');

  // il confronto che rende chiaro il punto: con l'assistenza lo stesso numero
  // DIMEZZA la prestazione invece di aumentarla.
  const profAss = profiloPerPesoCorporeo(profiloEsercizio(assistito), 85);
  const rAss = punteggioSerie({ peso_assistenza: 20, ripetizioni: 5, stato: 'fatta' }, profAss);
  assert.ok(rAss.punteggio < r.punteggio,
    `20 kg di zavorri (${r.punteggio}) devono valere PIÙ di 20 kg di assistenza (${rAss.punteggio}): `
    + 'sono il contrario');
});

test('Z3. senza i kg di zavorri la serie non vale niente', () => {
  const prof = profiloPerPesoCorporeo(profiloEsercizio(zavorri), 85);
  // senza i kg non c'è niente da valutare: il solo numero di ripetizioni non dice
  // quanto hai tirato, perché sulle trazioni conta il peso
  const senzaKg = punteggioSerie({ ripetizioni: 5, stato: 'fatta', peso_corpo: 85 }, prof);
  assert.equal(senzaKg.valido, false, 'senza i kg di zavorri non si valuta');
  assert.match(senzaKg.motivo, /zavorri/, 'e si sa perché');
  // zero zavorri è trazione a corpo libero: non è la stessa prestazione, ma non è
  // nemmeno un numero da inventare
  const conZero = punteggioSerie({ peso: 0, ripetizioni: 5, stato: 'fatta', peso_corpo: 85 }, prof);
  assert.equal(conZero.valido, false, 'zero zavorri non è una prestazione pesata');
});

test('Z4. si usa il peso del GIORNO, non quello di adesso', () => {
  // Il peso è salvato nella serie al momento in cui l'hai fatta. Se ti sei pesato
  // dopo, la prestazione di tre mesi fa deve restare com'era, altrimenti i record
  // del passato cambierebbero da soli quando ti pesi.
  const prof = profiloPerPesoCorporeo(profiloEsercizio(zavorri), 95);
  const serie = { peso: 20, ripetizioni: 5, stato: 'fatta', peso_corpo: 85 };
  const r = punteggioSerie(serie, prof);
  // il profilo ha il peso di ADESSO (95), ma la serie ha il SUO (85): vince la serie
  assert.match(r.testo, /85 kg del tuo corpo/,
    'deve contare il peso del giorno della serie, non quello di adesso');
  assert.equal(/95 kg/.test(r.testo), false, 'e NON il peso di adesso');
});

test('Z5. la scala non cambia quando ti pesi', () => {
  // Se il riferimento dipendesse dal peso di adesso, il Rank cambierebbe da solo a
  // ogni pesata e non ci sarebbe più nessun primato da battere.
  const a = profiloPerPesoCorporeo(profiloEsercizio(zavorri), 70);
  const b = profiloPerPesoCorporeo(profiloEsercizio(zavorri), 95);
  assert.deepEqual(a.soglie, b.soglie,
    'le soglie devono essere le stesse: altrimenti il Rank si muove da solo');
  assert.ok(RIFERIMENTO_ZAVORRI_DEFAULT > 0,
    'e il riferimento di partenza deve esistere, altrimenti la scala è tutta a zero');
});

test('Z6. nella scheda si vede che sono ZAVORRI, non KG', () => {
  // Sotto il campo, "KG" dice che 20 kg è tutto. Ma 20 kg di zavorri più il tuo
  // corpo sono 105: e il Rank conta quello.
  assert.match(srcApp, /conZavorri \? 'ZAVORRI' :/, 'la lettera sotto il campo');
  assert.match(srcApp, /convenzioneConCorpo\(e\.convenzione\)/, 'la scelta dipende dalla convenzione');
  assert.match(srcApp, /nota-zavorri/, 'e sotto la riga c\'è la nota con la somma');
  assert.match(srcApp, /\+ i tuoi \$\{formattaNumero\(corpoOggi\)\} kg = /,
    'che scrive: zavorri più il tuo corpo, quanto fa in tutto');
  assert.match(css, /\.nota-zavorri \{[\s\S]{0,200}?font-weight: 600/,
    'e la nota si vede');
});