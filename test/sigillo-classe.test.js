// sigillo-classe.test.js -- la parola segreta che tiene chiusa la scelta della classe.
//
// Ste (12/10/2026): "fai in modo che SOLO io possa cambiare la mia classe quando
// voglio senza ovviamente perdere i progressi dell'altra classe. ma attenzione:
// devo essere solo io in grado di farlo".
//
// Qui si controllano le TRE cose che quella frase contiene, che sono tre problemi
// diversi travestiti da uno:
//
//   1. la parola giusta lascia cambiare, quella sbagliata no;
//   2. la parola NON viene salvata da nessuna parte (nel profilo c'e' l'impronta);
//   3. cambiando classe non si perde l'equipaggiamento.
//
// Il punto 3 e' l'unico che poteva sembrare una cosa e invece no, e il test che lo
// prova sta in fondo.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  haSigillo, creaSigillo, verificaSigillo, saleNuovo, impronta,
} from '../src/sigillo-classe.js';
import { calcolaAvatar, CLASSI } from '../src/avatar-rpg.js';

test('S1. un profilo nuovo non ha nessuna parola', () => {
  assert.equal(haSigillo(null), false);
  assert.equal(haSigillo({}), false);
  assert.equal(haSigillo({ sigillo_classe: {} }), false);
  // Una mezza impronta non vale come una intera: se il salvataggio si è tagliato a
  // metà, meglio che l'app lo tratti come "non c'è" e faccia rifare, invece di
  // accettare qualunque cosa.
  assert.equal(haSigillo({ sigillo_classe: { sale: 'a'.repeat(32), hash: 'b'.repeat(10) } }), false);
  assert.equal(haSigillo({ sigillo_classe: { sale: 'a'.repeat(32), hash: 'b'.repeat(64) } }), true);
});

test('S2. la parola giusta apre, quella sbagliata no', async () => {
  const sig = await creaSigillo('guerriero2026', '2026-10-12T00:00:00.000Z');
  const profilo = { sigillo_classe: sig };
  assert.equal(await verificaSigillo('guerriero2026', profilo), true, 'la parola giusta apre');
  assert.equal(await verificaSigillo('GUERRIERO2026', profilo), false, 'maiuscole diverse: sbagliata');
  assert.equal(await verificaSigillo('guerriero2025', profilo), false, 'un numero di meno: sbagliata');
  assert.equal(await verificaSigillo('', profilo), false, 'parola vuota: sbagliata');
  assert.equal(await verificaSigillo('  guerriero2026  ', profilo), true,
    'gli spazi ai lati vengono tolti prima di confrontare');
});

test('S3. un profilo SENZA parola non si apre con nessuna parola', async () => {
  // Il buco che si aprirebbe se `verificaSigillo` controllasse solo l\'impronta:
  // se l\'app non ha ancora una parola, "qualunque cosa scrivi" deve restare senza
  // effetto, non aprire il passaggio.
  assert.equal(await verificaSigillo('qualsiasi', {}), false);
  assert.equal(await verificaSigillo('qualsiasi', null), false);
});

test('S4. la parola NON viene salvata: nel profilo c\'e\' solo l\'impronta', async () => {
  // E' il punto che rende la cosa seria: se la parola fosse nel profilo, chiunque
  // apra i dati del telefono la leggerebbe, e l'app non avrebbe protetto niente.
  const PAROLA = 'la-mia-parola-segreta';
  const sig = await creaSigillo(PAROLA, '2026-10-12T00:00:00.000Z');
  const testo = JSON.stringify(sig);
  assert.ok(!testo.includes(PAROLA), 'la parola non deve comparire nel profilo');
  assert.ok(!testo.includes('la-mia-parola'), 'nemmeno un pezzo della parola');
  assert.match(sig.hash, /^[0-9a-f]{64}$/, 'l\'impronta e\' un SHA-256 in esadecimale');
  assert.match(sig.sale, /^[0-9a-f]{32}$/, 'il sale e\' casuale e ha 16 byte');
  assert.equal(sig.creato, '2026-10-12T00:00:00.000Z', 'la data la passa chi chiama');
});

test('S5. due parole diverse non danno la stessa impronta', async () => {
  // Se dessero lo stesso risultato, chiunque potrebbe provare una parola a caso e
  // aprire. E anche: due profili con la STESSA parola devono avere impronte
  // diverse, perché il sale e' diverso.
  const a = await creaSigillo('ciao1234');
  const b = await creaSigillo('ciao1234');
  assert.notEqual(a.sale, b.sale, 'il sale deve essere nuovo ogni volta');
  assert.notEqual(a.hash, b.hash, 'la stessa parola con sale diversi dà impronte diverse');
  const c = await creaSigillo('ciao1235');
  assert.notEqual(a.hash, c.hash, 'una parola diversa dà un\'impronta diversa');
});

test('S6. una parola troppo corta viene rifiutata', async () => {
  // Con una parola di due lettere ci sono poche centinaia di combinazioni: chiunque
  // potrebbe provarle tutte. Meglio chiedere qualcosa di un po' più lungo.
  await assert.rejects(() => creaSigillo('ab'), /almeno 4 caratteri/);
  await assert.rejects(() => creaSigillo(''), /almeno 4 caratteri/);
  await assert.rejects(() => creaSigillo('   '), /almeno 4 caratteri/);
});

test('S7. il sale nuovo e\' diverso ogni volta', () => {
  const sali = new Set(Array.from({ length: 30 }, () => saleNuovo()));
  assert.equal(sali.size, 30, 'trenta salti devono essere tutti diversi');
});

test('S8. l\'impronta e\' quella giusta di SHA-256', async () => {
  // Il motivo per cui si usa `crypto.subtle` e non una funzione scritta a mano: il
  // valore deve essere quello standard, e non importa come venga calcolato in
  // un secondo momento (per esempio se un giorno si volesse verificare la parola
  // anche da un server).
  // Sale e parola sono attaccati con un separatore visibile (`|`), non con una
  // stringa vuota: attaccarli a vuoto sembra più semplice, ma se un domani il sale
  // cambiasse lunghezza due coppie diverse potrebbero diventare la stessa stringa
  // ("ab"+"cdef" e "abc"+"def"). Con il `|` non può capitare.
  const atteso = await globalThis.crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode('abcd|ciao1234'),
  );
  const mio = await impronta('ciao1234', 'abcd');
  const hex = Array.from(new Uint8Array(atteso), (b) => b.toString(16).padStart(2, '0')).join('');
  assert.equal(mio, hex, 'deve coincidere con SHA-256(sale + parola)');
});

// ---------------------------------------------------------------------------
// IL PUNTO 3: CAMBIARE CLASSE NON DEVE COSTARCI NULLA
// ---------------------------------------------------------------------------

/** Sedute in `giorni` giorni consecutivi finiti a ieri, così la streak e' lunga. */
function sedutePer(giorni) {
  const out = [];
  const base = new Date('2026-10-12T09:00:00Z');
  for (let i = 1; i <= giorni; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({ data: d.toISOString().slice(0, 10), stato: 'completata' });
  }
  return out;
}

test('S9. l\'armatura dipende dai giorni, NON dalla classe', () => {
  // Questo e' il motivo per cui cambiare classe non costa niente, e va verificato
  // perché e' una proprieta' non ovvia: basterebbe una riga cambiata in
  // `calcolaAvatar` per far perdere a Ste tutta l'armatura senza accorgersene.
  const sedute = sedutePer(40); // armatura arrivata a "arma"
  const profilo = { giorni_allenamento: [1, 2, 3, 4, 5, 6, 0] };
  const perId = () => null;

  const sblocchi = {};
  for (const c of Object.values(CLASSI)) {
    const r = calcolaAvatar(c.id, [], sedute, perId, { profilo, oggi: '2026-10-12' });
    sblocchi[c.id] = r.premi.map((p) => p.sbloccato);
  }

  const primo = Object.values(sblocchi)[0];
  assert.deepEqual(Object.keys(sblocchi), ['guerriero', 'assassino', 'berserker']);
  for (const [id, lista] of Object.entries(sblocchi)) {
    assert.deepEqual(lista, primo,
      `${id} ha un equipaggiamento diverso: cambiando classe si perderebbe qualcosa`);
  }
  assert.equal(primo.filter(Boolean).length, 4,
    'con 40 giorni di fila devono essere sbloccate quattro armature');
});

test('S10. il record di streak non dipende dalla classe scelta', () => {
  // Il secondo pezzo della stessa cosa: se il record cambiasse con la classe,
  // tornare indietro farebbe sparire l'armatura al ricalcolo.
  const sedute = sedutePer(20);
  const profilo = { giorni_allenamento: [1, 2, 3, 4, 5, 6, 0] };
  const valori = Object.values(CLASSI).map(
    (c) => calcolaAvatar(c.id, [], sedute, () => null, { profilo, oggi: '2026-10-12' }).recordStreak,
  );
  assert.equal(new Set(valori).size, 1, 'il record di streak deve essere lo stesso per tutte le classi');
  assert.equal(valori[0], 20);
});
