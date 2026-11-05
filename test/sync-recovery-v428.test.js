import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const memoria = new Map();
globalThis.localStorage = {
  getItem: key => memoria.get(key) || null,
  setItem: (key, value) => memoria.set(key, String(value)),
  removeItem: key => memoria.delete(key),
};

const db = await import('../src/db.js');
const sb = await import('../src/supabase.js');
const sync = await import('../src/sync.js');

const normale = globalThis.fetch;
let bloccoPull = false;
let errorePush = 0;
let chiamatePush = 0;
let richiestePull = 0;

function risposta(dati, status = 200) {
  return new Response(JSON.stringify(dati), { status, headers: { 'content-type': 'application/json' } });
}

globalThis.fetch = async (link, opzioni = {}) => {
  const url = new URL(link);
  if (url.pathname === '/auth/v1/user') return risposta({ id: 'utente-test-v428' });
  if (url.pathname.startsWith('/rest/v1/')) {
    const tabella = url.pathname.slice('/rest/v1/'.length);
    if (opzioni.method === 'POST') {
      chiamatePush++;
      if (errorePush) return risposta({ message: 'Errore finto del server' }, errorePush);
      return risposta([{ id: 'confermato' }]);
    }
    if (url.searchParams.has('id')) return risposta([]);
    richiestePull++;
    if (bloccoPull && tabella === 'esercizi') return risposta({ message: 'Download temporaneamente non disponibile' }, 503);
    return risposta([]);
  }
  throw new Error('URL inatteso nel test: ' + url.pathname);
};
sb.salvaSessione({
  access_token: 'token-test-v428',
  refresh_token: 'refresh-test-v428',
  user: { id: 'utente-test-v428' },
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});

test('v428: download non disponibile non impedisce upload sicuro della serie locale', async () => {
  const nota = await db.salva('note', { id: 'nota-sync-v428-a', testo: 'serie confermata' });
  assert.equal(nota.sync, 'da_salvare');
  bloccoPull = true;
  const risultato = await sync.sincronizza();
  assert.ok(risultato.errori >= 1);
  assert.equal(risultato.inviati, 1, 'l\'upload deve procedere dopo il download fallito');
  assert.equal((await db.prendi('note', nota.id)).sync, 'pulito');
  assert.match(risultato.messaggio, /Download/);
  bloccoPull = false;
  const ripresa = await sync.sincronizza();
  assert.equal(ripresa.errori, 0);
  assert.equal(ripresa.fatto, true);
  assert.ok(richiestePull > 0);
});

test('v428: errore HTTP temporaneo conserva la coda e si risolve senza riavvio', async () => {
  const nota = await db.salva('note', { id: 'nota-sync-v428-b', testo: 'da inviare' });
  errorePush = 503;
  const prima = await sync.sincronizza();
  assert.equal(prima.errori, 1);
  assert.match(prima.messaggio, /note \[nota-sync-v428-b\]/);
  const pendente = await db.prendi('note', nota.id);
  assert.equal(pendente.sync, 'da_salvare', 'non deve diventare errore definitivo dopo un 503');
  assert.ok((await db.codaDiInvio()).some(r => r.riga.id === nota.id));
  errorePush = 0;
  const seconda = await sync.sincronizza();
  assert.equal(seconda.errori, 0);
  assert.equal((await db.prendi('note', nota.id)).sync, 'pulito');
});

test('v428: errori permanenti sono visibili e i record rimangono ritentabili', async () => {
  const nota = await db.salva('note', { id: 'nota-sync-v428-c', testo: 'non cancellare' });
  errorePush = 409;
  const prima = await sync.sincronizza();
  assert.equal(prima.errori, 1);
  assert.equal((await db.prendi('note', nota.id)).sync, 'errore');
  assert.ok((await db.prendi('note', nota.id)).ultimo_errore);
  errorePush = 0;
  const seconda = await sync.sincronizza();
  assert.equal(seconda.errori, 0);
  assert.equal((await db.prendi('note', nota.id)).sync, 'pulito');
});

test('v428: database permette una seduta aperta per giorno senza cancellare storico', () => {
  const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  const migrazione = readFileSync(new URL('../supabase/migrations/20261105075833_sedute_attive_per_giorno_v428.sql', import.meta.url), 'utf8');
  assert.match(schema, /una_seduta_in_corso_per_giorno/);
  assert.match(schema, /on public\.sedute \(user_id, scheda_id, data\)/);
  assert.match(migrazione, /drop index if exists public\.una_seduta_in_corso;/);
  assert.doesNotMatch(migrazione, /delete from public\.sedute|update public\.sedute|truncate/i);
});

test('v428: bottone di retry visibile e aggiornamento automatico al focus iPhone', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const motore = readFileSync(new URL('../src/sync.js', import.meta.url), 'utf8');
  assert.match(app, /Riprova salvataggio online/);
  assert.match(app, /sync\.sincronizza\(\{ attendiSeInCorso: true \}\)/);
  assert.match(motore, /window\.addEventListener\('focus', online\)/);
  assert.match(motore, /programmaRiprovo\(\)/);
  assert.match(motore, /setTimeout\(\(\) => \{/);
  assert.match(motore, /sync: erroreTransitorio\(e\) \? 'da_salvare' : 'errore'/);
});

test.after(() => {
  globalThis.fetch = normale;
  sb.salvaSessione(null);
});
