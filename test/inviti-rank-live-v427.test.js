import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { preparaRegistrazioneInvitata, ripristinaRegistrazioneInvitata } from '../src/inviti-registrazione.js';
import { gruppiRankInTempoReale, haSerieRankProvvisorie } from '../src/rank-live.js';
import { recordAccount } from '../src/rank.js';
import { statoAccount } from '../src/gioco.js';
import { personaDaNome, ESERCIZI } from '../src/dati-iniziali.js';
import * as supabase from '../src/supabase.js';

const TOKEN = '00000000-0000-4000-8000-123456789012';
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('v427: un invito normale conserva nome, chiave e token nella conferma email', () => {
  const persona = personaDaNome('Max', 'abcda123');
  const contesto = preparaRegistrazioneInvitata({ invito: TOKEN, persona });
  const url = new URL(contesto.redirectTo);
  assert.equal(url.searchParams.get('inv'), TOKEN);
  assert.equal(url.searchParams.get('n'), 'Max');
  assert.equal(url.searchParams.get('k'), 'abcda123');
  assert.equal(url.searchParams.get('p'), null);
  assert.equal(contesto.data.palestra_invito, TOKEN);
  const recupero = ripristinaRegistrazioneInvitata({ user_metadata: contesto.data });
  assert.deepEqual(recupero, { invito: TOKEN, memoria: { n: 'Max', k: 'abcda123' } });
});

test('v427: invito speciale trasferimento Andrea non inventa un nuovo profilo', () => {
  const r = preparaRegistrazioneInvitata({ invito: TOKEN, persona: { id: 2, creata: false } });
  const q = new URL(r.redirectTo).searchParams;
  assert.equal(q.get('p'), '2');
  assert.equal(q.get('inv'), TOKEN);
  assert.deepEqual(ripristinaRegistrazioneInvitata({ user_metadata: r.data }).memoria, { p: 2 });
});

test('v427: senza invito non crea autorizzazioni e ignora token invalidi', () => {
  const s = preparaRegistrazioneInvitata({ invito: 'non-un-uuid', persona: personaDaNome('Max', 'abcdefgh') });
  assert.deepEqual(s.data, {});
  assert.equal(new URL(s.redirectTo).searchParams.has('inv'), false);
  assert.equal(ripristinaRegistrazioneInvitata({ user_metadata: { palestra_invito: 'false' } }), null);
  assert.equal(ripristinaRegistrazioneInvitata({ user_metadata: {} }), null);
});

test('v427: REST signup invia redirect_to nella query e metadata nel body', async () => {
  const originaleFetch = globalThis.fetch, originaleStorage = globalThis.localStorage;
  let vista = null;
  try {
    globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
    globalThis.fetch = async (url, opts) => {
      vista = { url, opts };
      return new Response(JSON.stringify({ user: { id: 'nuovo-utente' } }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    };
    await supabase.registrati('finto@example.invalid', 'test-password-123', {
      invito: TOKEN, persona: personaDaNome('Max', 'abcda123'),
    });
    assert.ok(vista);
    const endpoint = new URL(vista.url);
    assert.equal(endpoint.pathname, '/auth/v1/signup');
    const ritorno = new URL(endpoint.searchParams.get('redirect_to'));
    assert.equal(ritorno.searchParams.get('inv'), TOKEN);
    const body = JSON.parse(vista.opts.body);
    assert.equal(body.data.palestra_invito, TOKEN);
    assert.equal(body.options, undefined, 'GoTrue ignora body.options.emailRedirectTo');
  } finally {
    globalThis.fetch = originaleFetch;
    if (originaleStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originaleStorage;
  }
});

const esercizio = ESERCIZI.find(e => e.id === 'ex-one-arm-preacher-curl');
const sedute = [
  { id: 'vecchia', stato: 'completata', data: '2026-11-01' },
  { id: 'aperta', stato: 'in_corso', data: '2026-11-05' },
];
const seriePrecedente = {
  id: 's1', seduta_id: 'vecchia', esercizio_id: esercizio.id,
  peso: 14, ripetizioni: 8, stato: 'fatta', peso_corpo: 66,
};
const serieAttuale = {
  id: 's2', seduta_id: 'aperta', esercizio_id: esercizio.id,
  peso: 22, ripetizioni: 8, stato: 'fatta', peso_corpo: 66,
};
const recordDaGruppi = (righe) =>
  recordAccount([esercizio], gruppiRankInTempoReale(sedute, righe, [esercizio]),
    { soloConDati: true, pesoAttuale: 66 });

test('v427: aggiornare i kg di una serie fatta cambia subito il Rank provvisorio', () => {
  const prima = recordDaGruppi([seriePrecedente, { ...serieAttuale, peso: 18 }])[0];
  const dopo = recordDaGruppi([seriePrecedente, serieAttuale])[0];
  assert.ok(prima && dopo);
  assert.ok(dopo.punteggio > prima.punteggio);
  assert.equal(haSerieRankProvvisorie(sedute, [serieAttuale]), true);
  assert.equal(gruppiRankInTempoReale(sedute, [serieAttuale], [esercizio])
    .find(g => g.esercizio_id === esercizio.id).serie[0]._giorno, '2026-11-05');
});

test('v427: bozze, serie non spuntate e cancellate non possono alzare il Rank', () => {
  const inAttesa = { ...serieAttuale, stato: 'da_fare', peso: 300 };
  const eliminata = { ...serieAttuale, id: 'cestino', peso: 300, eliminata: true };
  const r = recordDaGruppi([seriePrecedente, inAttesa, eliminata])[0];
  const baseline = recordDaGruppi([seriePrecedente])[0];
  assert.equal(r.punteggio, baseline.punteggio);
  assert.equal(haSerieRankProvvisorie(sedute, [inAttesa, eliminata]), false);
});

test('v427: XP, streak e Rank definitivo del motore base ignorano seduta aperta', () => {
  const st = statoAccount({
    account: 'account-test', sedute, serie: [serieAttuale],
    esercizi: [esercizio], pesoCorporeo: 66,
  });
  assert.equal(st.record.length, 0);
  assert.equal(st.rankPrincipale, null);
  assert.match(app, /rankProvvisorio: true/);
  assert.match(app, /gruppiRankInTempoReale\(sedute, serie, V\.esercizi\)/);
  assert.match(app, /Rank provvisorio aggiornato/);
  assert.match(app, /const rankPrima = mappaRank\(V\.esercizi, serieMie\(\), seduteMie\(\)\)/);
});

test('v427: accesso da Impostazioni completa gli inviti come accesso da Amici', () => {
  const daImpostazioni = app.slice(app.indexOf("const accountBox = el('section'"),app.indexOf('const accountDettagli = el('));
  assert.match(daImpostazioni, /await sb\.accedi\(/);
  assert.match(daImpostazioni, /const pronto = invitoPendente\(\)/);
  assert.match(daImpostazioni, /await completaInvitoPendente\(\)/);
  assert.match(daImpostazioni, /await preparaAccountOnline\(\)/);
  assert.match(app, /risolviPersona\(\{ daConfermaEmail \}\)/);
  assert.match(app, /ripristinaRegistrazioneInvitata\(utente\)/);
  assert.match(sw, /'\.\/src\/inviti-registrazione\.js'/);
  assert.match(sw, /'\.\/src\/rank-live\.js'/);
});
