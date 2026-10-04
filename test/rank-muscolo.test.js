import test from 'node:test';
import assert from 'node:assert/strict';

import { recordAccount } from '../src/rank.js';
import {
  rapportoDifficolta, riferimentoPerEsercizio, LIVELLI_DIFFICOLTA, MOLTIPLICATORI_SOGLIA,
} from '../src/rank-config.js';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';

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

test('R1. 35 kg per braccio sono 70 kg, e il Rank lo deve sapere', () => {
  // Ste (04/10/2026): "ma deve capire che sono 35kg per braccio per chest press
  // di petto, lo sa questo no?"
  //
  // No. E questo test era LA LEZIONE, perche' fino a un momento fa diceva
  // l'opposto: "35 kg x 8 -> SILVER III, il massimale non si tocca". Quel numero
  // era sbagliato, e non per un dettaglio: la macchina a dischi ha i dischi su
  // ENTRAMBI i bracci, quindi 35 kg per braccio sono 70 kg. L'app contava 35 e
  // dimezzava tutto.
  //
  // Quindi il test non puo' piu' dire "non si tocca": deve dire il numero vero.
  // Ste (04/10/2026), sul raddoppio: "no fallo restare 44.33. non voglio che
  // spunti un numero cosi' alto, voglio che rimanga il numero di peso che metto in
  // una sola parte per il massimale".
  //
  // Quindi il massimale NON si raddoppia. Il numero che si vede e' quello che lui
  // ha scritto, e si puo' confrontare a occhio con la serie.
  const a = rankDi(chest, 35, 8);
  assert.equal(a.punteggio, 44.33, '35 kg x 8 -> massimale 44.33: niente raddoppio');
  assert.match(a.testo, /^35 kg/, 'la riga parte dal numero che ha scritto lui');
  assert.doesNotMatch(a.testo, /88|70 kg/, 'e non deve comparire il doppio');
  assert.ok(rankDi(chest, 50, 8).rank.indice >= a.rank.indice,
    'con 50 kg per braccio non puo\' fare peggio che con 35');
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
  //
  // Nota la convenzione: il suo esercizio ora ha convenzione per_braccio e
  // attrezzatura macchina_dischi. Sono due campi apposta, perche' con uno solo
  // dei due si perdeva: o la macchina, o il "per braccio".
  const dischi = rapportoDifficolta(chest);
  const stack = rapportoDifficolta({ ...chest, attrezzatura: 'macchina_stack', convenzione: 'macchina' });
  const libero = rapportoDifficolta({ ...chest, convenzione: 'bilanciere', attrezzatura: null });

  assert.equal(chest.convenzione, 'per_braccio', 'i kg sono per braccio');
  assert.equal(chest.attrezzatura, 'macchina_dischi', 'e la macchina e\' a dischi');
  assert.ok(dischi.rapporto > libero.rapporto,
    'la macchina a dischi resta un filo piu\' facile del bilanciere, ma non di piu\'');
  assert.ok(stack.rapporto > dischi.rapporto,
    'lo stack deve avere la soglia piu\' alta della macchina a dischi');
  assert.ok(stack.modificatori < dischi.modificatori);
});

test('R1c. "per braccio" e "macchina a dischi" non si perdono a vicenda', () => {
  // Il buco vero di oggi: la convenzione poteva dire SOLO "macchina a dischi"
  // (e perdevi il totale) o SOLO "per braccio" (e perdevi il fatto che e' una
  // macchina a dischi). Se tornassero a essere un campo solo, questi due assert
  // fallirebbero: e devono fallire, perche' significa che la macchina si e'
  // persa.
  const prof = recordAccount([chest],
    [{ esercizio_id: chest.id, serie: [{ id: 's', peso: 35, ripetizioni: 8, stato: 'fatta' }] }],
    { pesoAttuale: PESO })[0].profilo;
  // Ste: il massimale resta sul numero scritto, quindi per_braccio NON raddoppia
  // piu'. Resta solo come etichetta, per dire che quei kg sono di un lato.
  assert.equal(prof.moltiplicatoreCarico, 1,
    "per braccio non raddoppia: il numero che si vede e' quello scritto");

  // Ste: "però quando muovo il braccio destro non muovo anche il sinistro".
  // Questa macchina ha i due bracci indipendenti, quindi e' iso-lateral di
  // fatto, anche se non si chiama cosi'. Percio' qui la spiegazione e' NULL:
  // la macchina a dischi da -2 e l'indipendenza dà +2, si azzerano.
  //
  // E' pero' proprio qui che si vede se l'informazione si e' persa: se la macchina
  // o i bracci indipendenti sparissero, il risultato sarebbe lo stesso 0.90 ma
  // per un motivo sbagliato. Quindi guardo i motivi uno per uno, non la somma.
  const riconosciuto = classificaEsercizio({
    nome: chest.nome,
    convenzione: chest.convenzione,
    attrezzatura: chest.attrezzatura,
    bracciaIndipendenti: !!chest.bracciaIndipendenti,
  });
  assert.ok(riconosciuto.motivi.some((m) => /dischi/.test(m)),
    'deve sapere che e\' una macchina a dischi');
  assert.ok(riconosciuto.motivi.some((m) => /indipendent/i.test(m)),
    'e deve sapere che i due bracci sono indipendenti');
  assert.equal(riconosciuto.pesoModificatori, 0, 'i due effetti si compensano a zero');
  assert.equal(rapportoDifficolta(chest).spiegazione, null,
    'quindi non c\'e\' niente da spiegare: e\' un compenso, non un errore');
});

test('R2. il muscolo piccolo abbassa la soglia, quello grande no', () => {
  // il laterale e' isolamento su un muscolo piccolo: la soglia scende
  const lateraleR = rapportoDifficolta(laterale);
  assert.equal(lateraleR.livello, 'isolamento');
  assert.ok(lateraleR.spiegazione, 'e deve spiegare perche\'');
  assert.ok(lateraleR.rapporto < LIVELLI_DIFFICOLTA.isolamento.rapporto,
    'il deltoide laterale deve avere una soglia piu\' bassa del livello generico');
});

test('R3. il laterale pesante conta piu\' di un petto leggero', () => {
  // Prima questo test confrontava 15 kg x 12 alle laterali con 50 kg x 8 in
  // panca. Ora non e' piu' confrontabile: la panca e' per braccio, quindi 50 kg
  // per braccio sono 100 kg. Il confronto che volevo verificare era pero' un
  // altro, e regge: il laterale e' un muscolo instabile, quindi a parita' di
  // percentuale sul proprio riferimento va piu' in alto del petto, che e' un
  // muscolo grande.
  const lateraleR = rankDi(laterale, 25, 7); // i suoi kg veri dalla scheda
  const pettoR = rankDi(chest, 35, 8);
  const percLaterale = lateraleR.punteggio / lateraleR.riferimento;
  const percPetto = pettoR.punteggio / pettoR.riferimento;
  assert.ok(percLaterale > percPetto,
    'sul laterale arriva piu\' in alto della soglia che sul petto: il muscolo conta');
  // Numeri verificati con la scala ricalibrata: laterale 15.42 su un
  // riferimento di 12.26 = 126% -> TITAN. Petto 44.33 su 47.14 = 94% -> GOLD.
  // Quindi il muscolo piccolo arriva piu' in alto, ed e' quello che volevo
  // provare: non e' che ogni esercizio sia uguale.
  assert.equal(lateraleR.rank.nome, 'TITAN');
  assert.equal(pettoR.rank.nome, 'GOLD');
});

test('R4. la soglia della chest press e\' quella giusta', () => {
  // Il correttivo dell'attrezzatura non deve spostare la soglia piu' del dovuto:
  // la macchina a dischi vale -2, e il petto non aggiunge niente perche' e' un
  // muscolo grande. Se un giorno questo test fallisce, o l'attrezzatura sta
  // contando due volte, o il muscolo ha iniziato a penalizzare il petto.
  const r = rapportoDifficolta(chest);
  assert.ok(r.rapporto >= LIVELLI_DIFFICOLTA.composto.rapporto,
    'la macchina a dischi alza un filino la soglia rispetto al composto');
  assert.ok(r.rapporto < LIVELLI_DIFFICOLTA.composto.rapporto * 1.02,
    'ma non di tanto');
  assert.equal(r.spintaMuscolo, 0, 'il petto non e\' un muscolo piccolo: zero spinta');
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

  // Qui c'e' una cancellazione, ed e' voluta. La leg press obliqua e' un
  // movimento piu' difficile (+6 perche' una gamba sola), pero' e' su una
  // macchina a stack (-6 perche' il cavo e' gia' bilanciato). +6 e -6 si
  // annullano, quindi la soglia resta quella di base e non c'e' niente da
  // spiegare. Non e' un bug: e' la stessa cosa che hai visto con la chest press
  // a dischi, dove il percorso guidato (+ comodo) e l'equilibrio da fare si
  // compensavano a meta'.
  assert.equal(obliqua.modificatori, 0, 'obliqua e stack si compensano esattamente');
  assert.equal(obliqua.spiegazione, null, 'quindi non c\'e\' niente da spiegare');

  // il confronto con la leg press normale resta comunque utile: la differenza
  // la fa l'obliqua piu' il carico, non il muscolo
  const normale = rapportoDifficolta({ nome: 'Leg Press', attrezzatura: 'macchina_stack', convenzione: 'macchina' });
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