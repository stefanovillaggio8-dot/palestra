import { test } from 'node:test';
import assert from 'node:assert/strict';

// Gli LP si vedono in CONTO ALLA ROVESCIA.
//
// Ste (04/10/2026): "deve scendere da 100, a 99, 98, ecc.". Prima si
// vedeva 0, 1, 2... e cresceva, quindi non si capiva quanto mancava alla
// promozione. Il numero che gira dentro l'app resta quello che cresce: qui
// si controlla solo come lo mostriamo.

import { RANK, profiloEsercizio, soglieDaRiferimento } from '../src/rank-config.js';
import { calcolaRank } from '../src/rank.js';

const CP = { id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'macchina' };

// stessa funzione di app.js, replicata qui per non dipendere dal DOM
function lpDaMostrare(lp, inTop = false) {
  const n = Number(lp) || 0;
  if (inTop) return Math.max(0, Math.round(n));
  return 100 - Math.max(0, Math.min(99, n));
}

test('A1. gli LP mostrati scendono da 100 a 99, 98...', () => {
  assert.equal(lpDaMostrare(0), 100, 'entri in un rank e parti da 100');
  assert.equal(lpDaMostrare(1), 99, 'poi scende a 99');
  assert.equal(lpDaMostrare(2), 98);
  assert.equal(lpDaMostrare(50), 50);
  assert.equal(lpDaMostrare(99), 1, 'a un gradino dalla promozione resta 1');
});

test('A2. la serie e\' davvero 100, 99, 98... senza salti', () => {
  const serie = [];
  for (let lp = 0; lp <= 99; lp++) serie.push(lpDaMostrare(lp));
  assert.deepEqual(serie.slice(0, 5), [100, 99, 98, 97, 96], 'i primi cinque');
  // scende sempre di esattamente uno
  for (let i = 1; i < serie.length; i++) {
    assert.equal(serie[i], serie[i - 1] - 1, 'al passo ' + i + ' deve scendere di 1');
  }
  assert.equal(serie[serie.length - 1], 1, 'l\'ultimo prima della promozione e\' 1');
});

test('A3. la promozione azzera tutto e riparte da 100', () => {
  const p = profiloEsercizio(CP);
  const s = p.soglie;
  // poco sopra la soglia di bronzo: sei appena salito, devi vedere 100
  const appenaSalito = calcolaRank(s[1], p);
  assert.equal(appenaSalito.lp, 0, 'appena promosso gli LP interni sono 0');
  assert.equal(lpDaMostrare(appenaSalito.lp), 100, 'e in mostra parte da 100');

  // a pochissimo dalla promozione deve restare 1
  const quasi = calcolaRank(s[1] - (s[1] - s[0]) / 200, p);
  assert.equal(lpDaMostrare(quasi.lp), 1, 'manca un gradino solo');
});

test('A4. i valori strani non rompono la barra', () => {
  assert.equal(lpDaMostrare(null), 100);
  assert.equal(lpDaMostrare(undefined), 100);
  assert.equal(lpDaMostrare('abc'), 100);
  assert.equal(lpDaMostrare(-5), 100, 'un numero negativo torna a 100');
  assert.equal(lpDaMostrare(500), 1, 'un numero assurdo non esce dal range');
});

test('A5. sul rank piu\' alto gli LP crescono e non c\'e\' conto alla rovescia', () => {
  // sull'ultimo rank non c'e' nessuna promozione da aspettare: gli LP
  // continuano a salire e si mostrano come sono
  const p = profiloEsercizio(CP);
  const tanto = calcolaRank(p.soglie[RANK.length - 1] * 3, p);
  assert.equal(tanto.inTop, true);
  assert.ok(tanto.lp > 100, 'sul rank alto si superano i 100');
  assert.equal(lpDaMostrare(tanto.lp, true), tanto.lp, 'lì il numero non viene ribaltato');
});

test('A6. ogni rank ha la sua scala e il conto riparte', () => {
  const s = soglieDaRiferimento(100);
  // per ogni rank: entra con 100 e arriva a 1
  for (let i = 0; i < s.length - 1; i++) {
    const dentro = calcolaRank(s[i] + (s[i + 1] - s[i]) * 0.001, pprof());
    assert.equal(lpDaMostrare(dentro.lp), 100, 'rank ' + i + ': appena entri fa 100');
    const vicino = calcolaRank(s[i + 1] - (s[i + 1] - s[i]) * 0.001, pprof());
    assert.equal(lpDaMostrare(vicino.lp), 1, 'rank ' + i + ': manca 1');
  }
  function pprof() { return profiloEsercizio(CP, { soglie: s }); }
});