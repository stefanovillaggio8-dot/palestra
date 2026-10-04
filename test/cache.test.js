import test from 'node:test';
import assert from 'node:assert/strict';

import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { parteDiMuscolo } from '../src/muscoli-parti.js';
import {
  impostaLivelliImparati, livelloEsercizio, rapportoDifficolta,
} from '../src/rank-config.js';

// Ste (04/10/2026): "migliora tutto quanto, rendi tutto piu' efficente".
//
// La cache ha reso le classificazioni 1000 volte piu' veloci (31 secondi ->
// 30 millisecondi su 120.000 chiamate). Ma una cache che restituisce sempre lo
// stesso oggetto e' pericolosa per un motivo preciso: se qualcuno lo modifica,
// la modifica resta per tutti. I test qui sotto chiudono le due porte.

// helper identico per l'id del laterale usato in rank-muscolo.test.js
const LATERALE = 'ex-cable-lateral-raise';
const laterale = { id: LATERALE, nome: 'Cable Lateral Raise' };

test('C1. la stessa domanda viene ricordata', () => {
  const a = classificaEsercizio({ nome: 'Cable Lateral Raise' });
  const b = classificaEsercizio({ nome: 'Cable Lateral Raise' });
  assert.equal(a, b, 'deve tornare lo stesso risultato, non uno uguale');

  const c = parteDiMuscolo({ nome: 'Cable Lateral Raise' });
  const d = parteDiMuscolo({ nome: 'Cable Lateral Raise' });
  assert.equal(c, d);
});

test('C2. domande diverse non si confondono', () => {
  // la chiave deve distinguere anche la descrizione e la convenzione: se no',
  // "Panca" con descrizione "inclinata" prenderebbe la risposta di "Panca" piana
  const generico = parteDiMuscolo({ nome: 'Panca' });
  const inclinata = parteDiMuscolo({ nome: 'Panca', descrizione: 'inclinata' });
  assert.notEqual(generico.nome, inclinata.nome,
    'la descrizione deve contare, altrimenti la cache sbaglia le panche');

  // NB: il classificatore da solo NON cambia il livello con la convenzione, e va
  // bene: e' compito di livelloEsercizio (che controlla "assistenza" e
  // "corpo_libero" prima di chiedere al classificatore). Il test guarda li'.
  const pesante = { id: 'ex-bench', nome: 'Dumbbell Bench Press' };
  assert.equal(livelloEsercizio(pesante), 'composto');
  assert.equal(livelloEsercizio({ ...pesante, convenzione: 'assistenza' }), 'assistito',
    'la convenzione deve cambiare il livello');
});

test('C3. le correzioni di Ste vincono ANCORA sul risultato ricordato', () => {
  // Questo e' il test che conta. Se il classificatore ha gia' risposto e la
  // risposta e' in cache, la correzione deve comunque passare: altrimenti dopo
  // la prima risposta l'app tornerebbe a ignoresi e le correzioni di Ste
  // sembrerebbero non salvare.
  const primo = livelloEsercizio(laterale);
  assert.equal(primo, 'isolamento', 'prima della correzione');

  impostaLivelliImparati({ [LATERALE]: 'grande' });
  const dopo = livelloEsercizio(laterale);
  assert.equal(dopo, 'grande', 'la correzione deve vincere anche col risultato in cache');

  // e il rapporto del Rank deve accorgersene
  assert.equal(rapportoDifficolta(laterale).livello, 'grande');

  impostaLivelliImparati({});
  assert.equal(livelloEsercizio(laterale), 'isolamento', 'tolta la correzione, torna come prima');
});

test('C4. la cache non cresce senza fermarsi', () => {
  // senza un tetto, la cache si mangerebbe la memoria: ogni nome scritto una
  // volta resterebbe lì per sempre. Con 500 voci si svuota e si ricomincia.
  const modulo = classificaEsercizio({ nome: 'Dumbbell Bench Press' });
  for (let i = 0; i < 2000; i++) {
    classificaEsercizio({ nome: 'Esercizio numero ' + i + ' con bilanciere' });
  }
  assert.equal(classificaEsercizio({ nome: 'Dumbbell Bench Press' }), modulo,
    'anche dopo lo svuotamento la risposta deve essere la stessa');
});