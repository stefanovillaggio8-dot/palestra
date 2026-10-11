// test/polpacci-monogamba.test.js
//
// Ste (10/10/2026): "comunque polpacci lo faccio monogamba e non li metto io i
// pesi e one arm cable fly è doppia carrucola".
//
// Sono due cose diverse:
//
// 1. I POLPACCI. "Monogamba" era scritto solo nella nota, nei dati erano ancora
//    `macchina`. E la nota da sola non conta niente: l'app legge i campi, non i
//    commenti. Il peso non cambia (PER_GAMBA vale 1 come tutto il resto), cambia
//    l'etichetta sopra il campo e il fatto che l'app sappia che è una gamba.
//
// 2. IL BUG PIU' SERIO DI TUTTI. La correzione c'era nel catalogo, i test
//    passavano, e però NON ARRIVAVA a Ste: la tabella `esercizi` del database non ha
//    la colonna `convenzione` nella lista dei campi che si rileggono dal catalogo.
//    Sul suo telefono l'esercizio restava `macchina` per sempre, e nessun test di
//    questo file l'avrebbe notato, perché i test guardano il catalogo e non il
//    database. È il tipo di buco che solo si vede dall'esterno, da come lo usa
//    una persona vera.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ESERCIZI } from '../src/dati-iniziali.js';
import { CONVENZIONI, etichettaUnita } from '../src/numeri.js';
import { pesoReale } from '../src/rank-config.js';
import { recordEsercizio } from '../src/rank.js';
import { CAMPI_CARICO, riallineaEsercizi } from '../src/sincronizzazione.js';

const perId = (id) => ESERCIZI.find((e) => e.id === id);

test('i polpacci sono per gamba, non macchina', () => {
  const polpacci = perId('ex-sled-press-calf-raise');
  assert.equal(polpacci.convenzione, CONVENZIONI.PER_GAMBA);
});

test('i polpacci restano una macchina a stack: i dischi non li mette lui', () => {
  const polpacci = perId('ex-sled-press-calf-raise');
  assert.equal(polpacci.attrezzatura, CONVENZIONI.MACCHINA_STACK);
});

test('sopra il campo dei polpacci ora dice KG PER GAMBA', () => {
  assert.equal(etichettaUnita(CONVENZIONI.PER_GAMBA), 'KG PER GAMBA');
});

test('PER_GAMBA non cambia il numero che gli scrivi', () => {
  // I suoi numeri veri: "i polpacci è 110kg monogamba sulla macchina orizzontale".
  //
  // È la parte che sembra un bug ma non lo è. Se per_gamba raddoppiasse, i suoi 110
  // diventerebbero 220 e il Rank dei polpacci esploderebbe di colpo: da GOLD a
  // qualcosa che non esiste più. Vale 1 come tutto il resto, serve solo come
  // etichetta.
  assert.equal(pesoReale(110, { carrucola: null, perBraccio: false }), 110);
  assert.equal(pesoReale(110, { carrucola: 'carrucola_doppia' }), 55,
    'sulla doppia carrucola invece si dimezza davvero: è un fatto meccanico');
});

test('i suoi 110 kg monogamba stanno al loro posto nella scala', () => {
  // Il numero non si è spostato, ma il controllo serve a far notare se un giorno
  // cambiano le soglie: i 110 kg sono al livello GOLD, non al tetto.
  const polpacci = perId('ex-sled-press-calf-raise');
  const record = recordEsercizio([{ peso: 110, ripetizioni: 6 }], polpacci, null, null);
  assert.ok(record.rank, 'deve avere un Rank');
  assert.equal(record.rank.nome, 'GOLD');
});

test('la macchina a dischi resta solo dove i dischi li metti davvero', () => {
  // Ste: "il macchinario con i pesi che devo mettere io i dischi è solo la chest
  // press invece ne segna anche altri".
  //
  // Il colpevole vero era il Seated Cable Row, che è un cavo con la linguetta e non
  // dischi sciolti: con la macchina a dischi il suo carico veniva contato il doppio.
  //
  // Il Smith Machine invece CI STA, e non per caso: anche lì i dischi li carichi tu
  // sulle maniglie del bilanciere. La sua nota lo dice: "Conto solo i dischi, il
  // bilanciere no". Se lo si togliesse, i suoi kg su quella panca smetterebbero di
  // valere come per lato, che è proprio il modo in cui si registrano.
  const aDischi = ESERCIZI.filter((e) => e.attrezzatura === CONVENZIONI.MACCHINA_DISCHI);
  assert.deepEqual(
    aDischi.map((e) => e.nome),
    ['Chest Press', 'Smith Machine Incline Bench Press', 'Iso-Lateral Row'],
  );
});

test('il Cable Row è a stack, quindi il suo carico non è dimezzato', () => {
  // Sulla doppia carrucola il numero si dimezza, sullo stack no. Con la macchina a
  // dischi il Cable Row veniva letto al doppio: il Rank era fuori di un fattore due.
  const row = perId('ex-seated-cable-row');
  assert.equal(row.attrezzatura, CONVENZIONI.MACCHINA_STACK);
});

test('il One Arm Cable Reverse Fly è doppia carrucola', () => {
  // Ste: "one arm cable fly è doppia carrucola".
  const fly = perId('ex-one-arm-cable-reverse-fly');
  assert.equal(fly.carrucola, 'carrucola_doppia');
});

test('la convenzione è fra i campi che il database rillegge dal catalogo', () => {
  // IL TEST CHE MANCAVA. Senza questo, il catalogo è giusto e i test verdi, ma il
  // fix non arriva a nessuno: il database non ha la colonna e sul telefono
  // l'esercizio resta com'era.
  assert.ok(CAMPI_CARICO.includes('convenzione'));
});

test('un esercizio già salvato col valore sbagliato viene corretto all\'avvio', () => {
  // Simula il telefono di Ste: l'esercizio c'è già, ma con la convenzione di prima.
  const sulTelefono = [{
    id: 'ex-sled-press-calf-raise',
    nome: 'Sled Press Calf Raise',
    convenzione: CONVENZIONI.MACCHINA,
    attrezzatura: CONVENZIONI.MACCHINA_STACK,
  }];
  const daScrivere = riallineaEsercizi(ESERCIZI, sulTelefono);
  assert.equal(daScrivere.length, 1, 'il polpaccio va corretto');
  assert.equal(daScrivere[0].convenzione, CONVENZIONI.PER_GAMBA);
  // e non deve toccare nient'altro della riga
  assert.equal(daScrivere[0].attrezzatura, CONVENZIONI.MACCHINA_STACK);
});

test('una riga già giusta non viene riscritta', () => {
  // Se riscrivessimo tutto a ogni avvio, una correzione fatta a mano sul telefono
  // verrebbe persa. È il motivo per cui la funzione restituisce solo le righe che
  // cambiano davvero.
  const gia = [{
    id: 'ex-sled-press-calf-raise',
    nome: 'Sled Press Calf Raise',
    convenzione: CONVENZIONI.PER_GAMBA,
    attrezzatura: CONVENZIONI.MACCHINA_STACK,
    carrucola: undefined,
    bracciaIndipendenti: undefined,
  }];
  assert.deepEqual(riallineaEsercizi(ESERCIZI, gia), []);
});