// Test delle regole PURE di sync: non apre database e non usa la rete.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/sincronizzazione.js', import.meta.url), 'utf8');
const sync = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const local = {id:'a', rev:2, base_rev:1, sync:'da_salvare', updated_at:'2026-11-01', carrucola:'doppia'};
const remote = {id:'a', rev:3, updated_at:'2026-11-02'};
assert.equal(sync.decidiPush(local, remote), 'conflitto');
assert.equal(sync.applicaRemote(local, remote).azione, 'conflitto');
assert.equal(sync.decidiPush(local, null), 'crea');
assert.equal(sync.applicaRemote(local, { ...remote, rev:1 }).azione, 'ignora');

const clean = { ...local, sync:'pulito', rev:1 };
const merged = sync.applicaRemote(clean, remote);
assert.equal(merged.azione, 'applica');
assert.equal(merged.riga.carrucola, 'doppia', 'Il server non deve cancellare campi assenti');
assert.equal(merged.riga.base_rev, 3);
const pushed = sync.rigaPerInvio(local, 'esercizi');
for (const key of ['sync','base_rev','carrucola']) {
  assert.ok(!(key in pushed), 'Campo locale inviato al database: ' + key);
}
const done = sync.dopoInvioRiuscito(local, 4);
assert.equal(done.sync, 'pulito');
assert.equal(done.base_rev, 4);
assert.equal(done.in_flight, false);
console.log('OK: conflitti, merge conservativo, campi locali e conferma sync');
