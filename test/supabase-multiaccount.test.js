import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const client = await readFile(new URL('../src/supabase.js', import.meta.url), 'utf8');
const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261025_user_scoped_ids.sql', import.meta.url), 'utf8');

test('gli ID sincronizzati sono unici per utente, non globalmente', () => {
  assert.match(client, /on_conflict=user_id,id/,
    'l’UPSERT deve usare la chiave composta prevista dalla migrazione');
  for (const tabella of ['esercizi', 'schede', 'versi', 'sedute', 'serie', 'note', 'profili', 'missioni', 'ricompense', 'pesi']) {
    assert.ok(migration.includes("'" + tabella + "'"), 'migrazione mancante per ' + tabella);
  }
  assert.match(migration, /UNIQUE \(user_id, id\)/,
    'la migrazione deve consentire lo stesso id a utenti diversi');
  assert.match(migration, /ricompense.*user_id, account_id, tipo/s,
    'anche le ricompense devono essere uniche per utente Supabase');
  assert.match(migration, /missioni.*user_id, account_id, missione_id/s,
    'anche le missioni devono essere uniche per utente Supabase');
  assert.match(schema, /UNIQUE \(user_id, id\)/,
    'anche lo schema completo deve configurare le chiavi per utente');
});
