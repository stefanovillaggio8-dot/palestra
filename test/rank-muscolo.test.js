import test from 'node:test';
import assert from 'node:assert/strict';

import { recordAccount } from '../src/rank.js';
import {
  rapportoDifficolta, riferimentoPerEsercizio, LIVELLI_DIFFICOLTA, MOLTIPLICATORI_SOGLIA,
} from '../src/rank-config.js';
import { ESERCIZI } from '../src/dati-iniziali.js';

// Ste (04/10/2026): "deve capire cosa lavora quell'esercizio e quindi capire
// se e' difficile o facile", e poi "deve capire ancora meglio i rank e le
// difficolta'".
//
// Il muscolo e' entrato nella soglia del Rank. Qui sotto ci sono i numeri che
// Ste ha verificato a mano con 66 kg: se un giorno qualcuno li cambia senza
// dirlo, questi test falliscono. Serve a quello.
//
// UNA LEZIONE, messa qui perche' me la sono dimenticata due volte.
// Prima scrivevo i test con oggetti fatti a mano: { nome: 'Dumbbell Bench
// Press' }. Ste ha poi mostrato la foto del SUO esercizio e scritto "ma non
// e' una panca, la chest press e' tipo questa". Aveva ragione: lui fa la chest
// press a MACCHINA, io facevo i conti su una panca con il bilanciere libero.
// Sono due esercizi diversi e la soglia deve essere diversa.
// Per questo adesso i test leggono ESERCIZI: i dati veri della sua scheda.
// Un test con un oggetto inventato non collauda niente, e un test che non
// collauda niente e' peggio di un test che non c'e'.

const PESO = 66;
const perId = (id) => {
  const e = ESERCIZI.find((x) => x.id === id);
  assert.ok(e, 'l\'esercizio ' + id + ' deve esistere nella scheda');
  return e;
};

const chest = perId('ex-chest-press'); // "Chest Press", macchina
const laterale = perId('ex-cable-lateral-raise');
const legpress = perId('ex-single-leg-press');
const curl = perId('ex-cable-hammer-curl');

function rankDi(esercizio, peso, ripetizioni) {
  const rec = recordAccount([esercizio],
    [{ esercizio_id: esercizio.id, serie: [{ id: 's', peso, ripetizioni, stato: 'fatta' }] }],
    { pesoAttuale: PESO });
  const x = rec[0];
  return { punteggio: x.punteggio, riferimento: x.profilo.riferimento, rank: x.rank, testo: x.testo };
}

test('R1. i numeri verificati da Ste a 66 kg non cambiano', () => {
  // 35 kg x 8 alla chest press a macchina -> Silver III: questo e' l'esercizio
  // SUO, quello della foto, e sono i kg della sua scheda (s(35, 8)).
  const a = rankDi(chest, 35, 8);
  assert.equal(a.punteggio, 44.33, 'il massimale stimato non si tocca');
  assert.match(a.rank.nome, /SILVER/);
  assert.ok(rankDi(chest, 50, 8).rank.indice >= rankDi(chest, 35, 8).rank.indice,
    'con 50 kg la chest press non puo\' fare peggio che con 35');
});

test('R1b. una macchina a DISCHI non e\' la macchina facile', () => {
  // Ste, con due foto (04/10/2026): "il macchinario e' piu' facile solo se c'e'
  // questo, nella mia chest press si mettono i pesi reali quindi in teoria e' di
  // piu' o no?". Ha ragione: la sua macchina ha dischi veri sui perni, quindi
  // c'e' equilibrio da fare come sul bilanciere. La macchina davvero facile e'
  // lo STACK, il pacco con la linguetta, perche' la resistenza e' un cavo gia'
  // bilanciato.
  //
  // Nella v38 avevo dato -6 a TUTTE le macchine: quello gonfiava il suo Rank.
  const dischi = rapportoDifficolta(chest);
  const stack = rapportoDifficolta({ ...chest, convenzione: 'macchina_stack' });
  const libero = rapportoDifficolta({ ...chest, convenzione: 'bilanciere' });

  assert.equal(chest.convenzione, 'macchina_dischi', 'il suo esercizio e\' a dischi');
  assert.ok(dischi.rapporto > libero.rapporto,
    'la macchina a dischi resta un filo piu\' facile del bilanciere, ma non di piu\'');
  assert.ok(stack.rapporto > dischi.rapporto,
    'lo stack deve avere la soglia piu\' alta della macchina a dischi');
  assert.ok(stack.modificatori < dischi.modificatori);
});

test('R2. il muscolo piccolo abbassa la soglia, quello grande no', () => {
  // il laterale e' isolamento su un muscolo piccolo: la soglia scende
  const lateraleR = rapportoDifficolta(laterale);
  assert.equal(lateraleR.livello, 'isolamento');
  assert.ok(lateraleR.spiegazione, 'e deve spiegare perche\'');
  assert.ok(lateraleR.rapporto < LIVELLI_DIFFICOLTA.isolamento.rapporto,
    'il deltoide laterale deve avere una soglia piu\' bassa del livello generico');
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

test('R4. la chest press non si e\' mossa di una virgola', () => {
  // Se il correttivo dell'attrezzo avesse toccato il petto per sbaglio, il
  // suo Silver III a 35 kg x 8 andrebbe a pezzi. Qui si blocca.
  assert.equal(rankDi(chest, 35, 8).rank.nome, 'SILVER');
  const r = rapportoDifficolta(chest);
  assert.ok(r.rapporto >= LIVELLI_DIFFICOLTA.composto.rapporto,
    'la macchina a dischi alza un filino la soglia rispetto al composto');
  assert.ok(r.rapporto < LIVELLI_DIFFICOLTA.composto.rapporto * 1.02,
    'ma non di tanto: non voglio spostare i numeri che Ste ha verificato');
});

test('R5. i muscoli grandi non vengono penalizzati per errore', () => {
  // il pericolo di una regola che "abbassa tutto quello che e' piccolo" e' di
  // abbassare anche cose che non doveva.
  //
  // Il suo leg press e' OBLIQUA (monogamba, 17 kg per gamba invece di 100 kg per
  // lato): quindi la soglia scende, ed e' giusto cosi'. Ma per via dell'obliqua,
  // non del muscolo. La prova e' che spintaMuscolo vale zero.
  const obliqua = rapportoDifficolta(legpress);
  assert.equal(obliqua.livello, 'grande');
  assert.equal(obliqua.spintaMuscolo, 0, 'le gambe non hanno spinta muscolare');
  assert.match(obliqua.spiegazione, /rende più duro/);

  // e il confronto con la leg press normale mostra che la differenza viene
  // dall'obliqua: 1.806 contro 1.909
  const normale = rapportoDifficolta({ nome: 'Leg Press', convenzione: 'macchina' });
  assert.ok(normale.rapporto > obliqua.rapporto,
    'la leg press normale deve avere la soglia piu\' alta dell\'obliqua');
});

test('R5b. il cavo rende piu\' facile, e anche questo si vede', () => {
  // il cavo e' l'estremo opposto della macchina: ti tira in una linea sola e il
  // percorso e' pulito, quindi impressionare e' piu' difficile e la soglia sale.
  const r = rapportoDifficolta(curl);
  assert.ok(r.modificatori < 0, 'il cavo deve essere riconosciuto come piu\' facile');
  assert.ok(r.rapporto > LIVELLI_DIFFICOLTA[r.livello].rapporto,
    'la soglia al cavo deve salire');
  assert.match(r.spiegazione, /soglia sale/);
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