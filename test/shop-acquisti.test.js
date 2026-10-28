import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acquistaOggettoAura, totaliDaRicompense } from '../src/aura.js';

function negozio(saldo = 100) {
  const righe = [{ account_id: 'io', aura: saldo }];
  return { righe, acquista: (id = 'armatura', prezzo = 60) => acquistaOggettoAura({ account: 'io',
    oggetto: { id, prezzo, nome: id }, leggi: async () => structuredClone(righe),
    salva: async r => { await new Promise(resolve => setTimeout(resolve, 2)); righe.push(r); return r; } }) };
}
test('doppia conferma addebita una volta e inventario sopravvive alla rilettura', async () => {
  const n = negozio();
  const risultati = await Promise.all([n.acquista(), n.acquista()]);
  assert.equal(risultati.filter(r => r.acquistato).length, 1);
  assert.equal(totaliDaRicompense(n.righe).aura, 40);
  assert.equal((await n.acquista()).acquistato, false);
});
test('due oggetti diversi non possono spendere lo stesso saldo locale', async () => {
  const n = negozio();
  const risultati = await Promise.allSettled([n.acquista('a'), n.acquista('b')]);
  assert.equal(risultati.filter(r => r.status === 'rejected').length, 1);
  assert.equal(totaliDaRicompense(n.righe).aura, 40);
});
test('acquisti legacy restano posseduti senza alterare saldi o righe', async () => {
  const n = negozio();
  n.righe.push({ account_id: 'io', tipo: 'spesa_aura', fonte: 'shop:armatura:123456', aura: -60 });
  const prima = structuredClone(n.righe);
  assert.equal((await n.acquista()).acquistato, false);
  assert.deepEqual(n.righe, prima);
});
test('un errore di scrittura non blocca i successivi acquisti', async () => {
  await assert.rejects(acquistaOggettoAura({ account: 'io', oggetto: { id: 'a', prezzo: 1 },
    leggi: async () => [{ account_id: 'io', aura: 100 }], salva: async () => { throw new Error('disco'); } }), /disco/);
  assert.equal((await negozio().acquista()).acquistato, true);
});
