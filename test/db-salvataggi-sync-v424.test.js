import { test } from 'node:test';
import assert from 'node:assert/strict';

test('v424: modificare una riga pulita la rimette in coda con timestamp fresco', async () => {
  // In questo test non si deve toccare la IndexedDB del browser o i dati reali:
  // si usa solo il motore locale in memoria della singola esecuzione Node.
  const memoria = new Map();
  globalThis.localStorage = {
    getItem: k => memoria.has(k) ? memoria.get(k) : null,
    setItem: (k,v) => { memoria.set(k,String(v)); },
    removeItem: k => { memoria.delete(k); },
  };
  const db = await import('../src/db.js?audit-v424-sync-mem');
  const moltoVecchio = '2026-01-01T09:00:00.000Z';
  const scaricata = await db.salva('serie',{
    id:'regressione-sync-v424',peso:20,ripetizioni:8,
    sync:'pulito',rev:2,base_rev:2,updated_at:moltoVecchio,
  },{segna:false});
  assert.equal(scaricata.updated_at,moltoVecchio);
  assert.equal(scaricata.sync,'pulito');
  const dopo = await db.salva('serie',{...scaricata,peso:22});
  assert.equal(dopo.peso,22);
  assert.equal(dopo.rev,3);
  assert.equal(dopo.base_rev,2);
  assert.equal(dopo.sync,'da_salvare');
  assert.notEqual(dopo.updated_at,moltoVecchio);
  assert.ok(Date.parse(dopo.updated_at)>Date.parse(moltoVecchio));
  assert.equal((await db.codaDiInvio()).some(x=>x.tabella==='serie'&&x.riga.id===scaricata.id),true);

  const dalServer = await db.salva('serie',{
    ...dopo,rev:4,base_rev:4,updated_at:'2026-05-01T00:00:00.000Z',sync:'pulito'
  },{segna:false});
  assert.equal(dalServer.updated_at,'2026-05-01T00:00:00.000Z');
  assert.equal(dalServer.sync,'pulito');
  assert.equal((await db.codaDiInvio()).some(x=>x.riga.id===scaricata.id),false);
});

test('v424: anche la vecchia riga in_corso non resta invisibile dopo un nuovo edit', async () => {
  const db = await import('../src/db.js?audit-v424-sync-mem');
  const prima = await db.salva('note',{
    id:'nota-regressione-v424',testo:'prima',rev:10,base_rev:9,
    sync:'in_corso',updated_at:'2026-02-01T00:00:00.000Z',
  },{segna:false});
  const modificata = await db.salva('note',{...prima,testo:'dopo'});
  assert.equal(modificata.sync,'da_salvare');
  assert.equal(modificata.rev,11);
  assert.equal(modificata.base_rev,9);
  assert.ok(Date.parse(modificata.updated_at)>Date.parse(prima.updated_at));
});
