import test from 'node:test';
import assert from 'node:assert/strict';

import { recordEsercizio } from '../src/rank.js';
import { moltiplicatoreSerie } from '../src/rank-v2/curve.js';
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

test('S1. il bonus cresce con le serie e si ferma', () => {
  // Il numero e\' cambiato il 08/10/2026 col motore nuovo: ora le serie danno un
  // MOLTIPLICATORE (1,10 alla seconda, 1,16 alla terza, 1,20 dalla quarta) e non
  // una percentuale. Il fondo e\' lo stesso: cresce e si ferma, e una serie sola
  // non dà niente.
  assert.equal(moltiplicatoreSerie(1), 1, 'una serie: niente premio');
  assert.equal(moltiplicatoreSerie(2), 1.10, 'due serie: +10%');
  assert.equal(moltiplicatoreSerie(3), 1.16, 'tre serie: +16%');
  assert.equal(moltiplicatoreSerie(4), 1.20, 'quattro serie: +20%, e il tetto');
  assert.equal(moltiplicatoreSerie(99), 1.20, 'non puo\' crescere all\'infinito');
  for (const n of [0, 1, -5, null, undefined]) {
    assert.equal(moltiplicatoreSerie(n), 1, 'una serie sola (o nessuna) non dà bonus');
  }
  // e il premio massimo non supera mai il 20%: Ste "sempre piccolo"
  assert.ok(moltiplicatoreSerie(10) - 1 <= 0.201, 'il volume non compra piu\' del 20%');
});

test('S2. il lavoro NON cambia, cambia solo il merito', () => {
  // Questo e' il punto che Ste ha fissato: la prestazione resta quella che hai
  // scritto tu. Tre serie non possono cambiare i 35 kg e le 8 ripetizioni, sennò il
  // numero che vedi non e' piu' quello che hai fatto.
  //
  // Il 08/10/2026 il numero nel testo e' cambiato: non c'e' piu' "massimale 44.33"
  // (quello era la stima 1RM, che Ste ha chiesto di togliere: "non voglio che
  // l'app trasformi quella prestazione in un ipotetico 1RM"). Ora il testo dice
  // quello che hai fatto davvero: i kg e le ripetizioni.
  const una = conSerie([s(1)]);
  const tre = conSerie([s(1), s(2), s(3)]);
  assert.match(una.testo, /35 kg x 8/);
  assert.match(tre.testo, /35 kg x 8/, 'la prestazione resta quella che hai fatto');
  assert.equal(una.punteggio, tre.punteggio,
    'e il punteggio resta quello della serie migliore: le serie non lo cambiano');
  assert.equal(una.caricoReale, tre.caricoReale, 'e nemmeno il carico reale');
});

test('S3. la riga dice quante serie hai fatto, altrimenti il numero sale e non si capisce', () => {
  // Ste: "non voglio che l'app assegni rank alti troppo facilmente". Un numero
  // che sale senza spiegazione e' un numero regalato. La riga sotto la serie deve
  // dire perche'.
  const una = conSerie([s(1)]);
  const tre = conSerie([s(1), s(2), s(3)]);
  assert.doesNotMatch(una.testo, /serie/, 'con una serie sola non si cita nessun bonus');
  assert.match(tre.testo, /3 serie/, 'con tre serie la riga lo dice');
  assert.equal(tre.serieFatte, 3, 'e il numero di serie e\' leggibile da parte');
  assert.equal(una.serieFatte, 1);
});

test('S4. le serie non contate non contano', () => {
  // Una serie non fatta, o col solo spotter, non e' lavoro: il conto delle serie
  // si fa su quelle che valgono davvero, non su quante ne hai scritte.
  const treSerie = [s(1), s(2), s(3)];
  const conRifiutata = [s(1), s(2), s(3), { id: 's4', peso: 35, ripetizioni: 8, stato: 'fallita' }];
  const conSpotter = [s(1), s(2), s(3), { id: 's5', peso: 35, ripetizioni: 8, stato: 'fatta', spotter: true }];
  assert.equal(conSerie(conRifiutata).serieFatte, 3, 'una serie non fatta non conta');
  assert.equal(conSerie(conSpotter).serieFatte, 3, 'una serie col solo spotter non conta');
  assert.equal(conSerie(treSerie).serieFatte, 3);
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
  // non possono stare insieme. La divisione e' la stessa scala degli LP, quindi
  // se uno si muove l'altro deve seguire.
  //
  // L'ORDINE delle divisioni e' quello che Ste ha deciso il 07/10/2026: "il
  // numero sale con la prestazione", quindi I e' la piu' bassa e III la piu' alta.
  // Prima era al contrario (la convenzione dei videogiochi) e si leggeva storto.
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
      const attesa = r.lp >= 67 ? 'III' : (r.lp >= 34 ? 'II' : 'I');
      assert.equal(r.divisione.nome, attesa,
        e.nome + ' con ' + n + ' serie: dice ' + r.divisione.nome
        + ' ma gli LP sono ' + r.lp);
      assert.ok(r.lp >= 0 && r.lp <= 99,
        e.nome + ': gli LP devono stare fra 0 e 99, trovati ' + r.lp);
    }
  }
});

test('S6. le serie spingono comunque gli LP dentro il rank', () => {
  // Non e' un premio che sparisce: resta, e si legge dentro il Rank. 3x8 e' piu'
  // lavoro di 1x8 e l'app lo dice.
  const una = conSerie([s(1)]);
  const tre = conSerie([s(1), s(2), s(3)]);
  assert.ok(tre.lp > una.lp,
    `3 serie devono spingere gli LP: ${una.lp} -> ${tre.lp}`);
  assert.equal(una.bonusBloccato, false, 'con una serie il bonus non c\'e\'');
  // e il numero del premio e\' leggibile: se il motore nuovo dicesse solo "qualcosa
  // e\' successo" non si potrebbe capire quanto vale il volume
  assert.ok(tre.scoreConSerie > una.scoreConSerie,
    `il punteggio col volume deve salire: ${una.scoreConSerie} -> ${tre.scoreConSerie}`);
  // ma la barra resta quella del LAVORO VERO: e' il numero che non si puo' comprare
  assert.ok(tre.progresso <= una.progresso + 0.001 || tre.rank.indice !== una.rank.indice,
    'la barra non viene gonfiata dal bonus');
});

test('S7. quando il volume non basta, resta nel rank e lo dice', () => {
  // Il suo caso vero: la serie migliore e' vicina alla soglia dopo ma non abbastanza,
  // e il volume da solo la spingerebbe oltre. Sotto la regola secca non ci arriva,
  // e l'app deve POTER DIRE che il volume c'era.
  //
  // Il 08/10/2026 i numeri sono diversi dal motore vecchio: il fermo sta al 92% della
  // soglia (SOGLIA_PER_CROSSARE in scalata.js) e il fermo vale per il RANK, non per
  // gli LP, quindi gli LP restano quelli del lavoro vero piu' il merito delle serie.
  const rankOnesto = (n) => conSerie(Array.from({ length: n }, (_, i) => s(i)));
  const quattro = rankOnesto(4);
  const uno = conSerie([s(1)]);

  // con quattro serie il Rank NON deve cambiare rispetto a una serie sola
  assert.equal(quattro.rank.indice, uno.rank.indice,
    `quattro serie non cambiano il Rank: ${uno.rank.nome} -> ${quattro.rank.nome}`);
  // e quando il volume viene fermato, l'app deve saperlo dire
  if (quattro.bonusBloccato) {
    assert.ok(quattro.spiegaBonus, 'quando il volume viene fermato, la spiegazione c\'e\'');
    assert.match(quattro.spiegaBonus, /soglia|vicina|rank/i,
      'e dice che la serie migliore non era vicina alla soglia');
  }
  // e se il volume NON viene fermato, non deve comparire nessuna spiegazione strana
  const tre = rankOnesto(3);
  if (!tre.bonusBloccato) {
    assert.equal(tre.spiegaBonus, null, 'senza fermo non c\'e\' spiegazione da mostrare');
  }
  // il merito delle serie non sparisce in ogni caso: gli LP con quattro serie
  // devono essere piu' alti che con una sola
  assert.ok(quattro.lp >= uno.lp, 'le serie non ti lasciano indietro');
});
