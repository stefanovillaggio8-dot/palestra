import test from 'node:test';
import assert from 'node:assert/strict';

import { recordEsercizio, bonusSerie } from '../src/rank.js';
import { ESERCIZI } from '../src/dati-iniziali.js';

// Ste (04/10/2026): "se fai piu' serie, l'app ti da' un po' di merito in piu'.
// Sempre piccolo, al massimo l'8%". Poi: "vabene fallosi".
//
// Prima contava solo la serie piu' pesante: 1x8 e 3x8 erano la stessa cosa
// identica, anche se 3x8 e' il doppio del lavoro. E' la cosa che mancava quando ha
// elencato cosa doveva contare nel rank: "il numero di ripetizioni e serie".

const chest = ESERCIZI.find((e) => e.id === 'ex-chest-press');
const PESO = 66;

function conSerie(serie) {
  return recordEsercizio(serie, chest, null, PESO);
}

const s = (i, peso = 35, rip = 8) => ({ id: 's' + i, peso, ripetizioni: rip, stato: 'fatta' });

test('S1. il bonus cresce con le serie e si ferma all\'8%', () => {
  assert.equal(bonusSerie(1).bonus, 0);
  assert.equal(bonusSerie(2).bonus, 3);
  assert.equal(bonusSerie(3).bonus, 6);
  assert.equal(bonusSerie(4).bonus, 8);
  assert.equal(bonusSerie(99).bonus, 8, 'non puo\' crescere all\'infinito');
  for (const n of [0, 1, -5, null, undefined]) {
    assert.equal(bonusSerie(n).bonus, 0, 'una serie sola (o nessuna) non dà bonus');
  }
});

test('S2. il massimale NON cambia, cambia solo il merito', () => {
  // Questo e' il punto che Ste ha fissato: "il massimale deve restare il numero
  // di peso che metto in una sola parte". Quindi tre serie non possono cambiare
  // il 44.33, sennò il numero che vede non e' piu' quello che ha scritto lui.
  const una = conSerie([s(1)]);
  const tre = conSerie([s(1), s(2), s(3)]);
  assert.match(una.testo, /massimale 44\.33/);
  assert.match(tre.testo, /massimale 44\.33/, 'il massimale resta 44.33 anche con 3 serie');
  assert.equal(una.punteggio, tre.punteggio, 'e il punteggio resta quello della serie migliore');
});

test('S3. la riga dice il bonus, altrimenti il numero sale e non si capisce', () => {
  // Ste: "non voglio che l'app assegni rank alti troppo facilmente". Un numero
  // che sale senza spiegazione e' un numero regalato. La riga sotto la serie
  // deve direperche'.
  const una = conSerie([s(1)]);
  const tre = conSerie([s(1), s(2), s(3)]);
  assert.doesNotMatch(una.testo, /serie\)/, 'con una serie sola non si cita nessun bonus');
  assert.match(tre.testo, /\+6% per 3 serie/);
  assert.equal(tre.bonusSerie, 6);
  assert.equal(una.bonusSerie, 0);
});

test('S4. le serie non contate non contano', () => {
  // Una serie non fatta, o col solo spotter, non e' lavoro: il bonus si calcola
  // sulle serie che valgono davvero, non su quante ne hai scritte.
  const treSerie = [s(1), s(2), s(3)];
  const conRifiutata = [s(1), s(2), s(3), { id: 's4', peso: 35, ripetizioni: 8, stato: 'fallita' }];
  const conSpotter = [s(1), s(2), s(3), { id: 's5', peso: 35, ripetizioni: 8, stato: 'fatta', spotter: true }];
  assert.equal(conSerie(conRifiutata).bonusSerie, 6, 'una serie non fatta non conta');
  assert.equal(conSerie(conSpotter).bonusSerie, 6, 'una serie col solo spotter non conta');
  assert.equal(conSerie(treSerie).bonusSerie, 6);
});

test('S5. le serie possono spostare il rank, ma di UN livello solo', () => {
  // Qui il test aveva detto una cosa sbagliata, e me ne sono accorto guardando
  // cosa succedeva davvero: avevo scritto che il rank doveva restare identico
  // da 1 a 4 serie. Ma allora il bonus non servirebbe a niente.
  //
  // Il suo 35 x 8 sta al 94% del riferimento, quindi +8% lo porta oltre il
  // PLATINUM: GOLD con 1-3 serie, PLATINUM con 4. E va bene, perche' 4x8 e' il
  // quadruplo del lavoro di 1x8.
  //
  // La cosa che invece deve essere vera, e che il bonus PICCOLO garantisce, e' che
  // le serie possano spostare il rank di UN livello solo: mai di piu'. Altrimenti
  // un piccolo bonus diventa un passaggio di porta nascosto.
  const indice = (n) => {
    const serie = Array.from({ length: n }, (_, i) => s(i));
    return conSerie(serie).rank.indice;
  };
  const da1 = indice(1);
  for (const n of [2, 3, 4, 5, 6]) {
    const salto = indice(n) - da1;
    assert.ok(salto >= 0, 'piu\' serie non può peggiorare il rank');
    assert.ok(salto <= 1, 'con ' + n + ' serie il rank può salire di un livello, non di più');
  }
});
