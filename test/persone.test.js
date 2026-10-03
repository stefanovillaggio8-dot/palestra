import { test } from 'node:test';
import assert from 'node:assert/strict';

// Due persone nella stessa app, con link diversi (?p=1 e ?p=2).
// Il pericolo grosso e' che i dati di una finiscano nei progressi dell'altra:
// questi test premono esattamente quel tasto.

import { personaDallaUrl, PERSONE } from '../src/dati-iniziali.js';

test('la persona si sceglie dalla URL', () => {
  assert.equal(personaDallaUrl('').id, 1, 'senza ?p= si parte dalla prima');
  assert.equal(personaDallaUrl('?p=1').id, 1);
  assert.equal(personaDallaUrl('?p=2').id, 2);
  assert.equal(personaDallaUrl('?p=2' + String.fromCharCode(35) + '/').id, 2, 'anche con il pezzo di scheda dopo');
  assert.equal(personaDallaUrl('?p=99').id, 1, 'un numero inesistente non deve rompere: torno alla prima');
  assert.equal(personaDallaUrl('?altro=2').id, 1);
});

test('ogni persona ha la sua scheda e un id diverso', () => {
  const idSchede = PERSONE.map((p) => p.schedaId);
  assert.equal(new Set(idSchede).size, PERSONE.length, 'nessuna scheda condivisa');
  for (const p of PERSONE) assert.ok(p.nomeScheda, `${p.id}: ha un titolo`);
});

test('la seconda persona si chiama Palestra A, non "gym 3"', () => {
  const seconda = PERSONE.find((p) => p.id === 2);
  assert.equal(seconda.nomeScheda, 'Palestra A');
  assert.doesNotMatch(seconda.nomeScheda, /gym/i);
});