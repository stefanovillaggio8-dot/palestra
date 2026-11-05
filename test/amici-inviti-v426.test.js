import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { richiediPullCompleto } from '../src/sync.js';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const supabase = readFileSync(new URL('../src/supabase.js', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261105030541_inviti_amici_stato_v426.sql', import.meta.url), 'utf8');

test('v426: un refresh locale non cancella i profili online degli amici', () => {
  assert.match(app, /V\.amiciOnline = \(ricevuti \|\| \[\]\)/);
  assert.match(app, /for \(const p of V\.amiciOnline \|\| \[\]\)/);
  assert.match(app, /V\.profili\.push\(p\)/);
  assert.match(app, /V\.chiaveAmiciOnline/);
  assert.match(app, /V\.amiciOnline = \[\]/);
});

test('v426: gli amici ufficiali sono uniti agli ID salvati nel profilo locale', () => {
  assert.match(app, /\.\.\.\(V\.amiciOnline \|\| \[\]\)\.map\(\(amico\) => amico\.id\)/);
  assert.match(app, /new Set\(\[/);
  assert.match(app, /const amici = amiciDi\(profilo, voci\.map/);
});

test('v426: pagina amici mostra inviti pendenti e stato senza dichiararli amici', () => {
  assert.match(app, /function vistaAmici\(zona\)/);
  assert.match(app, /Stato degli inviti/);
  assert.match(app, /inviti\.filter\(\(i\) => !i\.accettato && !i\.scaduto\)/);
  assert.match(app, /invito\.accettato \? 'Accettato'/);
  assert.match(app, /destinatario non registrato/);
  assert.match(app, /aggiornaStatoAmici\(\{ forza: true \}\)/);
  assert.match(app, /urlInvito\(invito\.token, speciale\)/);
});

test('v426: rete interrogata con autenticazione e richiesta di proprieta', () => {
  assert.match(supabase, /export async function invitiAmiciStato\(profiloId\)/);
  assert.match(supabase, /rpc\('inviti_amici_stato', \{ p_profilo_id: profiloId \}\)/);
  assert.match(migration, /where p\.id = p_profilo_id and p\.user_id = v_uid/);
  assert.match(migration, /where created_by = v_uid and creator_profile_id = p_profilo_id/);
  assert.match(migration, /revoke all on function public\.inviti_amici_stato\(text\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.inviti_amici_stato\(text\) to authenticated/);
});

test('v426: nuovo amico forza recupero storico senza cancellare il cursore incrementale', () => {
  const old = globalThis.localStorage;
  const deleted = [];
  try {
    globalThis.localStorage = { removeItem(k) { deleted.push(k); } };
    richiediPullCompleto();
    assert.deepEqual(deleted, ['palestra-ultimo-pull-completo-v1']);
  } finally {
    if (old === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = old;
  }
  assert.match(app, /sync\.richiediPullCompleto\(\)/);
  assert.match(app, /const syncDopoInvito = await sync\.sincronizza\(\)/);
});

test('v426: gli inviti non vengono scritti in IndexedDB o copiati negli account altrui', () => {
  const start = app.indexOf('async function aggiornaStatoAmici(');
  const end = app.indexOf('function vistaAmici(', start);
  assert.ok(start >= 0 && end > start);
  const functionBody = app.slice(start, end);
  assert.doesNotMatch(functionBody, /db\.salva\(/);
  assert.doesNotMatch(functionBody, /sb\.scrivi\(/);
  assert.match(functionBody, /sb\.profiliAmici\(\)/);
  assert.match(functionBody, /sb\.invitiAmiciStato\(profiloId\)/);
});
