import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as db from '../src/db.js';

test('cestinare una ricompensa sincronizzata crea un tombstone in coda', async () => {
  const id = 'test-revoca-' + Math.random().toString(36).slice(2);
  await db.salva('ricompense', {
    id, account_id:'test', tipo:'allenamento', fonte:'test-seduta',
    aura:5, xp:10, sync:'pulito', rev:3, base_rev:3,
    updated_at:'2026-10-01T00:00:00.000Z',
  }, {segna:false});
  const rimossa = await db.cestino('ricompense',id);
  assert.equal(rimossa.eliminata,true);
  assert.equal(rimossa.sync,'da_salvare','il cestino deve essere mandato online');
  assert.notEqual(rimossa.updated_at,'2026-10-01T00:00:00.000Z');
  assert.ok((await db.codaDiInvio()).some(x=>x.tabella==='ricompense' && x.riga.id===id));
  const recuperata = await db.recupera('ricompense',id);
  assert.equal(recuperata.eliminata,false);
  assert.equal(recuperata.sync,'da_salvare','anche il recupero deve essere mandato online');
});
