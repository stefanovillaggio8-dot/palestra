import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  applicaRemote, espandiEsercizioRemoto, espandiEsercizioGlobale,
  rigaEsercizioGlobale, rigaPerInvio,
} from '../src/sincronizzazione.js';

const leggi = (nome) => readFile(new URL('../' + nome, import.meta.url), 'utf8');

test('v522: esercizio personale conserva la meccanica su un telefono nuovo', () => {
  const originale = {
    id: 'personal-123', nome: 'Cable Nuovo', convenzione: 'cavo_totali',
    carrucola: 'carrucola_doppia', attrezzatura: 'macchina_stack',
    bracciaIndipendenti: true, usoBraccia: 'un_braccio', misura: 'kg_reps',
    cardio: false, riferimento: 42, soglie_rank: { bronze: 10 },
    sync: 'da_salvare', configurazioneCavoPersonalizzata: true,
  };
  const remoto = rigaPerInvio(originale, 'esercizi');
  assert.equal(remoto.sync, undefined);
  assert.equal(remoto.carrucola, undefined);
  assert.equal(remoto.configurazione.carrucola, 'carrucola_doppia');
  assert.equal(remoto.configurazione.bracciaIndipendenti, true);
  assert.equal(remoto.configurazione.usoBraccia, 'un_braccio');
  assert.equal(remoto.configurazione.misura, 'kg_reps');
  assert.equal(remoto.configurazione.cardio, false);
  assert.equal(remoto.configurazione.riferimento, 42);
  assert.equal(remoto.configurazioneCavoPersonalizzata, undefined);
  const riottenuto = espandiEsercizioRemoto({ ...remoto, rev: 2 });
  assert.equal(riottenuto.carrucola, originale.carrucola);
  assert.equal(riottenuto.attrezzatura, originale.attrezzatura);
  assert.equal(riottenuto.bracciaIndipendenti, true);
  assert.deepEqual(riottenuto.soglie_rank, originale.soglie_rank);
});

test('v522: una configurazione remota assente non cancella dati locali e null esplicito si applica', () => {
  const locale = { id: 'personal-9', nome: 'Cavo', carrucola: 'carrucola_doppia',
    rev: 1, sync: 'pulito', updated_at: '2026-11-18T10:00:00Z' };
  const vecchio = espandiEsercizioRemoto({ id: 'personal-9', nome: 'Cavo',
    configurazione: {}, rev: 2, updated_at: '2026-11-19T10:00:00Z' });
  assert.equal(applicaRemote(locale, vecchio).riga.carrucola, 'carrucola_doppia');
  const azzerato = espandiEsercizioRemoto({ ...vecchio, rev: 3,
    configurazione: { carrucola: null } });
  assert.equal(applicaRemote(locale, azzerato).riga.carrucola, null);
});

test('v522: esercizi globali separati, biomeccanica integra, proprietario verificato', () => {
  const creato = { id: 'gex-123', nome: 'Prova universale', convenzione: 'per_manubrio',
    bracciaIndipendenti: false, cardio: false, riferimento: 30,
    misura: 'kg_reps', soglie_rank: { diamond: 30 }, globale: true,
    amministratore: true, created_at: '2026-11-19', sync: 'pulito' };
  const inviato = rigaEsercizioGlobale(creato, 'uid-verificato');
  assert.equal(inviato.creato_da, 'uid-verificato');
  assert.equal(inviato.user_id, undefined);
  assert.equal(inviato.globale, undefined);
  assert.equal(inviato.amministratore, undefined);
  assert.equal(inviato.configurazione.bracciaIndipendenti, false);
  const ricevuto = espandiEsercizioGlobale({ ...inviato, rev: 1 });
  assert.equal(ricevuto.globale, true);
  assert.equal(ricevuto.sync, 'pulito');
  assert.equal(ricevuto.misura, 'kg_reps');
  assert.equal(ricevuto.riferimento, 30);
});

test('v522: sync non scarta gli esercizi globali; app aspetta conferma server', async () => {
  const [sync, app, schema] = await Promise.all([
    leggi('src/sync.js'), leggi('src/app.js'), leggi('supabase/schema.sql'),
  ]);
  assert.match(sync, /globale = tabella === 'esercizi' && riga\.globale === true/);
  assert.match(sync, /tabellaRemota = globale \? 'esercizi_globali' : tabella/);
  assert.match(sync, /prendiModificate\(\['esercizi_globali'\], null\)/);
  assert.match(sync, /daRecuperare\.length/);
  const primaRemoto = app.indexOf("await sb.scrivi('esercizi_globali', pubblicato);");
  const dopoLocale = app.indexOf("await db.salva('esercizi', { ...nuovoEsercizio", primaRemoto);
  assert.ok(primaRemoto > 0 && dopoLocale > primaRemoto,
    'prima il server conferma, poi si salva la copia locale');
  assert.match(schema, /create table if not exists public\.versioni/);
  assert.doesNotMatch(schema, /public\.versi\b/);
  assert.match(schema, /coalesce\(data, date '1900-01-01'\)/);
  assert.match(schema, /create policy "amministratori vedono solo se stessi"/);
});

test('v522: la cronologia indica il periodo senza cambiare la data del riscatto', async () => {
  const app = await leggi('src/app.js');
  assert.match(app, /periodo:interpretaPremioSfida\(r\)\.periodo/);
  assert.match(app, /sfida del \$\{dataLeggibile\(periodo\)\}/);
  assert.match(app, /Riscattata il /);
});
