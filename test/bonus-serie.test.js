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

test('S5. le serie NON spostano mai il rank: il bonus sta DENTRO il rank', () => {
  // Ste (06/10/2026): "la regola secca. Il bonus non cambia mai il Rank, sposta
  // solo i LP dentro il Rank... perche' un Rank deve dire quanto sei forte. Se il
  // numero di serie decide meta' dei Rank, il Rank non sta misurando quello che
  // dice di misurare".
  //
  // Prima questo test diceva il contrario ("le serie possono spostare il rank, ma
  // di un livello solo") e il suo commento era un ragionamento sul quadruplo di
  // lavoro: giusto sul merito, sbagliato sul posto. Il suo 35x8 sta al 94% del
  // riferimento, quindi +8% lo portava oltre il PLATINUM: GOLD con 1-3 serie,
  // PLATINUM con 4. E cosi' per 10 esercizi su 20 il rank dipendeva dal numero di
  // serie, non dalla forza.
  const indice = (n) => {
    const serie = Array.from({ length: n }, (_, i) => s(i));
    return conSerie(serie).rank.indice;
  };
  const da1 = indice(1);
  for (const n of [2, 3, 4, 5, 6, 8]) {
    assert.equal(indice(n), da1,
      'con ' + n + ' serie il rank NON si muove: il bonus non compra un rank');
  }
});

test('S8. gli LP e la divisione non si contraddicono mai', () => {
  // Ste ha letto sul telefono "99 LP" e ha scritto "platinum 2": due numeri che
  // non possono stare insieme. La divisione (III, II, I) e' la stessa scala degli
  // LP, quindi se uno si muove l'altro deve seguire.
  //
  // Qui si prova su TUTTI i 20 esercizi della scheda e su 1-8 serie, perche' il
  // caso che morde e' quando il bonus spinge gli LP oltre il confine di una
  // divisione mentre il nome del rank resta quello vero: e' li' che i due
  // numeri si separavano.
  const { ESERCIZI: TUTTI } = ESERCIZI.length ? { ESERCIZI } : { ESERCIZI: [] };
  const conQueste = (e, n) => recordEsercizio(
    Array.from({ length: n }, (_, i) => ({ id: 's' + i, peso: 45, ripetizioni: 8, stato: 'fatta' })),
    e, null, PESO,
  );
  for (const e of TUTTI) {
    for (const n of [1, 2, 3, 4, 8]) {
      const r = conQueste(e, n);
      if (!r.divisione) continue;
      const attesa = r.lp >= 67 ? 'I' : (r.lp >= 34 ? 'II' : 'III');
      assert.equal(r.divisione.nome, attesa,
        e.nome + ' con ' + n + ' serie: dice ' + r.divisione.nome
        + ' ma gli LP sono ' + r.lp);
      assert.ok(r.lp >= 0 && r.lp <= 99,
        e.nome + ': gli LP devono stare fra 0 e 99, trovati ' + r.lp);
    }
  }
});

test('S6. il bonus spinge comunque gli LP dentro il rank', () => {
  // Non e' un premio che sparisce: resta, e si legge dentro il rank. 3x8 e' piu'
  // lavoro di 1x8 e l'app lo dice.
  const una = conSerie([s(1)]);
  const tre = conSerie([s(1), s(2), s(3)]);
  assert.ok(tre.lp > una.lp,
    `3 serie devono spingere gli LP: ${una.lp} -> ${tre.lp}`);
  assert.equal(una.bonusBloccato, false, 'con una serie il bonus non c\'e\'');
  assert.ok(tre.bonusLp > 0, 'e il bonus dice quanto LP ha aggiunto');
  // ma la barra resta quella del LAVORO VERO: e' il numero che non si puo' comprare
  assert.ok(tre.progresso <= una.progresso + 0.001 || tre.rank.indice !== una.rank.indice,
    'la barra non viene gonfiata dal bonus');
});

test('S7. quando il bonus non basta, resta nel rank e lo dice', () => {
  // Il suo caso vero: Cable Lateral Raise e' al 126% del riferimento, il tetto sta
  // al 135%, e con 4 serie (+8%) il bonus da solo ci arrivava. Sotto la regola
  // secca non ci arriva piu', e l'app deve POTER DIRE che il bonus c'era.
  const rankOnesto = (n) => conSerie(Array.from({ length: n }, (_, i) => s(i)));
  const quattro = rankOnesto(4);
  const tre = rankOnesto(3);

  // il suo caso e' sul chest press: 35x8 al 94% del riferimento, il +8% lo passava
  const pct = 44.33 / 47.14;
  assert.ok(pct < 1, 'la serie sta sotto il platino');
  const conQuattro = conSerie(Array.from({ length: 4 }, (_, i) => s(i)));
  assert.equal(conQuattro.rank.nome, 'GOLD', 'quattro serie non cambiano il rank');
  assert.equal(conQuattro.bonusBloccato, true, 'e il bonus viene fermato');
  assert.ok(conQuattro.bonusLp > 0,
    'ma si sa quanti LP valeva: il merito delle serie non sparisce');
  assert.equal(conQuattro.lp, conSerie([s(1)]).lp,
    'e gli LP restano quelli del lavoro vero: il bonus non entra nel tuo posto nella fascia');
  assert.match(conQuattro.testo, /non abbastanza per il rank/,
    'la riga dice che il bonus c\'era ma non ha bastato');
  assert.match(conQuattro.spiegaBonus, /non sono bastate a cambiare rank/,
    'la spiegazione accanto alla barra dice la stessa cosa');

  // e quando il bonus NON viene fermato, non c\'e\' nessuna spiegazione strana
  assert.equal(tre.bonusBloccato, false);
  assert.equal(tre.spiegaBonus, null, 'senza bonus fermato non si spiega niente');
});
