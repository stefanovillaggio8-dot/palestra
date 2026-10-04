import test from 'node:test';
import assert from 'node:assert/strict';

import { recordAccount } from '../src/rank.js';
import {
  rapportoDifficolta, riferimentoPerEsercizio, LIVELLI_DIFFICOLTA, MOLTIPLICATORI_SOGLIA,
} from '../src/rank-config.js';

// Ste (04/10/2026): "deve capire cosa lavora quell'esercizio e quindi capire
// se e' difficile o facile", e poi "deve capire ancora meglio i rank e le
// difficolta'".
//
// Il muscolo e' entrato nella soglia del Rank. Qui sotto ci sono i numeri che
// Ste ha verificato a mano con 66 kg: se un giorno qualcuno li cambia senza
// dirlo, questi test falliscono. Serve a quello.

const PESO = 66;
const chest = { id: 'ex-chest-press', nome: 'Dumbbell Bench Press' };
const laterale = { id: 'ex-cable-lateral-raise', nome: 'Cable Lateral Raise' };
const legpress = { id: 'ex-leg-press', nome: 'Leg Press' };
const crunch = { id: 'ex-crunch', nome: 'Crunch' };

function rankDi(esercizio, peso, ripetizioni) {
  const rec = recordAccount([esercizio],
    [{ esercizio_id: esercizio.id, serie: [{ id: 's', peso, ripetizioni, stato: 'fatta' }] }],
    { pesoAttuale: PESO });
  const x = rec[0];
  return { punteggio: x.punteggio, riferimento: x.profilo.riferimento, rank: x.rank, testo: x.testo };
}

test('R1. i numeri verificati da Ste a 66 kg non cambiano', () => {
  // 35 kg x 8 in panca -> Silver III: questo l'ha controllato lui sul telefono
  const a = rankDi(chest, 35, 8);
  assert.equal(a.punteggio, 44.33, 'il massimale stimato non si tocca');
  assert.equal(a.riferimento, 59.4, 'la soglia resta 0.90 del peso');
  assert.match(a.rank.nome, /SILVER/);
  assert.ok(rankDi(chest, 50, 8).rank.indice >= rankDi(chest, 35, 8).rank.indice,
    'con 50 kg la panca non puo\' fare peggio che con 35');
});

test('R2. il muscolo piccolo abbassa la soglia, quello grande no', () => {
  // il laterale e' isolamento su un muscolo piccolo: la soglia scende
  const lateraleR = rapportoDifficolta(laterale);
  assert.equal(lateraleR.livello, 'isolamento');
  assert.ok(lateraleR.rapporto < LIVELLI_DIFFICOLTA.isolamento.rapporto,
    'il deltoide laterale deve avere una soglia piu\' bassa del livello generico');
  assert.ok(lateraleR.spiegazione, 'e deve spiegare perche\'');

  // il leg press e' un muscolo enorme: la soglia non si alza, non si abbassa
  const gambaR = rapportoDifficolta(legpress);
  assert.equal(gambaR.rapporto, LIVELLI_DIFFICOLTA.grande.rapporto,
    'il muscolo non deve MAI alzare la soglia: la macchina la sa gia\' il classificatore');
  assert.equal(gambaR.spiegazione, null);
});

test('R3. le alzate laterali pesanti contano piu\' del petto di prima', () => {
  // Questa e' la cosa che Ste voleva. Prima 15 kg x 12 alle laterali valevano
  // meno di 50 kg x 8 in panca, il che era assurdo: 15 kg su un muscolo che ti
  // tiene in equilibrio sono piu' duri di 50 kg di panca.
  const lateraleR = rankDi(laterale, 15, 12);
  const chestR = rankDi(chest, 50, 8);
  assert.ok(lateraleR.rank.indice > chestR.rank.indice,
    '15 kg x 12 alle laterali devono valere piu\' di 50 kg x 8 in panca');
});

test('R4. il petto non si e\' mosso di una virgola', () => {
  // Se il petto e' un muscolo grande, la soglia deve essere esattamente quella
  // di prima. E' la garanzia che le alzate laterali non abbiano "corretto"
  // anche la panca per sbaglio.
  assert.equal(rapportoDifficolta(chest).rapporto, LIVELLI_DIFFICOLTA.composto.rapporto);
  assert.equal(riferimentoPerEsercizio(chest, PESO), 59.4);
});

test('R5. i muscoli grandi non vengono penalizzati per errore', () => {
  // il pericolo di una regola che "abbassa tutto quello che e' piccolo" e' di
  // abbassare anche cose che non doveva. Qui la soglia resta quella base.
  //
  // Solo muscoli davvero grandi. Gli addomi NON stanno qui: sono piccoli e
  // difficili da allenare bene, e la regli ce li mette apposta (vedi R5b).
  for (const e of [legpress, chest]) {
    const r = rapportoDifficolta(e);
    assert.equal(r.spiegazione, null, e.nome + ' non deve avere spiegazioni');
    assert.equal(r.rapporto, LIVELLI_DIFFICOLTA[r.livello].rapporto, e.nome);
  }
});

test('R5b. gli addomi vengono trattati come muscolo piccolo, e va bene', () => {
  // non e' un caso dimenticato: l'addome e' piccolo, tiene la pancia in piedi e
  // e' il muscolo che tutti allenano male. La soglia scende un filino.
  const addome = rapportoDifficolta(crunch);
  assert.equal(addome.spiegazione !== null, true,
    'l\'addome deve essere trattato come muscolo piccolo');
  assert.ok(addome.rapporto < LIVELLI_DIFFICOLTA[addome.livello].rapporto);
});

test('R6. le soglie restano in ordine e non si incrociano mai', () => {
  // Una soglia sotto un'altra fa sparire un livello. Controllo che il tetto di
  // realismo continui a tenere dopo la correzione sul muscolo.
  for (const e of [chest, laterale, legpress]) {
    const profilo = recordAccount([e],
      [{ esercizio_id: e.id, serie: [{ id: 's', peso: 30, ripetizioni: 8, stato: 'fatta' }] }],
      { pesoAttuale: PESO })[0].profilo;
    for (let i = 1; i < profilo.soglie.length; i++) {
      assert.ok(profilo.soglie[i] >= profilo.soglie[i - 1],
        e.nome + ': le soglie vanno in ordine crescente');
    }
    assert.ok(profilo.soglie.length === MOLTIPLICATORI_SOGLIA.length,
      e.nome + ': i livelli sono sempre sette');
  }
});

test('R7. il peso del corpo resta obbligatorio per un giudizio giusto', () => {
  // senza peso la soglia usa il riferimento storico: funziona, ma e\' piu\' lax
  const conPeso = rankDi(laterale, 15, 12);
  const senza = recordAccount([laterale],
    [{ esercizio_id: laterale.id, serie: [{ id: 's', peso: 15, ripetizioni: 12, stato: 'fatta' }] }]);
  assert.ok(senza[0].profilo.riferimento !== conPeso.riferimento,
    'col peso giusto la soglia deve cambiare');
});