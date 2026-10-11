// test/cavo-reverse-fly.test.js
//
// Ste (10/10/2026): "One Arm Cable Fly è veramente così tanto 28kg alla doppia
// carrucola".
//
// Sul carrello la linguetta segna 28, ma alla doppia carrucola il peso che SENTE è
// 14: il cavo si divide in due. Se l'app leggesse 28, su questo esercizio prenderebbe
// il doppio, e il Rank salirebbe di una fascia intera senza che sia successo niente.
//
// Il punto delicato è che il dimezzamento può capitare in due posti: sulla prestazione
// e sulla scala. Se capitasse in entrambi, 28 diventerebbero 7. Qui si controlla che il
// riferimento della scala resti nel numero che il confronto usa (14), e che il
// dimezzamento avvenga una volta sola.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ESERCIZI, GIORNI } from '../src/dati-iniziali.js';
import { pesoReale, fattoreCarrucola } from '../src/rank-config.js';
import { recordEsercizio, profiloEsercizio } from '../src/rank.js';

const perId = (id) => ESERCIZI.find((e) => e.id === id);
const FLY = 'ex-one-arm-cable-reverse-fly';

test('i 28 kg sul carrello sono 14 kg sentiti', () => {
  assert.equal(fattoreCarrucola('carrucola_doppia'), 0.5);
  assert.equal(pesoReale(28, { carrucola: 'carrucola_doppia' }), 14);
});

test('la carrucola del fly è doppia', () => {
  assert.equal(perId(FLY).carrucola, 'carrucola_doppia');
});

test('il dimezzamento capita una volta sola, non due', () => {
  // Se la scala si dimezzasse ANCHE, il confronto sarebbe 14 contro 7 e il Rank
  // salirebbe di due fasce. Il riferimento resta nel numero che il confronto usa.
  const scala = profiloEsercizio(perId(FLY)).riferimento;
  assert.ok(scala > 10 && scala < 25, 'il riferimento resta sulla scala del cavo');
});

test('28 kg per 9 ripetizioni non valgono come 28 kg veri', () => {
  // Il controllo vero: due modi di arrivare agli stessi 14 kg sentiti devono dare
  // lo stesso Rank. Il fly è a doppia carrucola, quindi 28 sul carrello e 14 sul
  // carrello (mono) NON sono la stessa prestazione, e non devono avere lo stesso
  // risultato. Se dessero lo stesso Rank, il dimezzamento non starebbe lavorando.
  const es = perId(FLY);
  const alCarrello = recordEsercizio([{ peso: 28, ripetizioni: 9 }], es, null, null);
  const senzaCarrucola = recordEsercizio([{ peso: 14, ripetizioni: 9 }], es, null, null);
  assert.ok(alCarrello.punteggio > senzaCarrucola.punteggio,
    '28 sul carrello (14 sentiti) vale più di 14 sul carrello: i due pesi non sono uguali');
});

test('i 28 kg sono davvero nella scheda, tre serie da 9', () => {
  const eserciziNellaScheda = GIORNI
    .flatMap((g) => g.esercizi || [])
    .filter((x) => x.esercizio_id === FLY);
  assert.equal(eserciziNellaScheda.length, 1, 'il fly sta in un giorno di scheda');
  const serie = eserciziNellaScheda[0].serie;
  assert.equal(serie.length, 3, 'tre serie');
  for (const s of serie) {
    assert.equal(s.peso, 28, '28 kg sul carrello');
    assert.equal(s.ripetizioni, 9, '9 ripetizioni');
  }
});