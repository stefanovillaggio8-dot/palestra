import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prendiModificate, acquistaAura, salvaSessione } from '../src/supabase.js';
const dati = new Map();
globalThis.localStorage = { getItem: k => dati.get(k) || null, setItem: (k,v) => dati.set(k,v), removeItem: k => dati.delete(k) };

test('sincronizzazione legge oltre 500 righe e distingue timestamp uguali', async () => {
  const righe = Array.from({length: 1003}, (_,i) => ({id: String(i).padStart(5,'0'), updated_at:'2026-10-28T10:00:00+00:00'}));
  const richieste = [];
  const fetchPrima = globalThis.fetch;
  try {
    globalThis.fetch = async url => {
      const q = new URL(url).searchParams;
      richieste.push(q);
      const ultimo = q.get('or')?.match(/id\.gt\."(\d+)"/)?.[1];
      const pagina = righe.filter(r => !ultimo || r.id > ultimo).slice(0,Number(q.get('limit')));
      return new Response(JSON.stringify(pagina));
    };
    const result = await prendiModificate(['serie'], '2026-10-27T00:00:00Z');
    assert.deepEqual(result.serie, righe);
    assert.equal(richieste.length, 3);
    assert.equal(richieste[0].get('updated_at'),'gte.2026-10-27T00:00:00Z');
    assert.equal(richieste[1].get('order'),'updated_at.asc,id.asc');
  } finally { globalThis.fetch = fetchPrima; }
});

test('acquisto richiede sessione e usa il prezzo del server, non un prezzo inviato dal client', async () => {
  salvaSessione(null);
  await assert.rejects(acquistaAura('io','titolo-cardio'),/Accedi/);
  salvaSessione({access_token:'fixture-non-reale'});
  const fetchPrima = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(url.endsWith('/rpc/acquista_oggetto_aura'));
      assert.deepEqual(JSON.parse(options.body),{p_account:'io',p_oggetto:'titolo-cardio'});
      return new Response(JSON.stringify({acquistato:true,spesa:{id:'s',account_id:'io',aura:-1600}}));
    };
    assert.equal((await acquistaAura('io','titolo-cardio')).spesa.aura,-1600);
  } finally { globalThis.fetch = fetchPrima; salvaSessione(null); }
});
