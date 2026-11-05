import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261105110305_friend_invites_idempotent_v429.sql', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('v429: link invitato senza accesso online non eredita il profilo Stefano', () => {
  const risolvi = app.slice(app.indexOf('async function risolviPersona('), app.indexOf('async function chiediNome('));
  assert.match(risolvi, /invito && !sb\.collegato\(\)/);
  assert.match(risolvi, /memoria\.p === 1/);
  assert.match(risolvi, /nuovoAccountSenzaProfilo = true/);
  assert.match(risolvi, /qs\.delete\('p'\)/);
  assert.match(risolvi, /schede = nuovoAccountSenzaProfilo \? \[\]/);
});

test('v429: il token da email viene recuperato anche al login successivo', () => {
  const risolvi = app.slice(app.indexOf('async function risolviPersona('), app.indexOf('async function chiediNome('));
  assert.match(risolvi, /daConfermaEmail \|\| !invito/);
  assert.match(risolvi, /ripristinaRegistrazioneInvitata\(utente\)/);
  assert.match(risolvi, /palestra-invito-completato:/);
  assert.match(risolvi, /!invitoDallaUrl\(\) \|\| invitoDallaUrl\(\) === ripresa\.invito/);
});

test('v429: all access methods auto-accept valid invite after authentication', () => {
  assert.match(app, /async function completaInvitoPendente\(\)/);
  assert.match(app, /await sb\.accettaInvitoAmico\(token, idProfilo\)/);
  const signins = app.match(/await sb\.accedi\(/g) || [];
  const handlers = app.match(/\? await completaInvitoPendente\(\)/g) || [];
  assert.ok(signins.length >= 2);
  assert.ok(handlers.length >= 4);
  assert.doesNotMatch(app, /bottone\('Accetta invito in sospeso'/);
});

test('v429: retries while app remains open, on network recovery, focus and visibility', () => {
  const autolink = app.slice(app.indexOf('function attivaInvitiAutomatici()'), app.indexOf('function urlInvito('));
  assert.match(autolink, /sb\.collegato\(\) \|\| !invitoPendente\(\)/);
  assert.match(autolink, /completaInvitoPendente\(\)\.catch/);
  assert.match(autolink, /window\.addEventListener\('focus', prova\)/);
  assert.match(autolink, /window\.addEventListener\('online', prova\)/);
  assert.match(autolink, /visibilitychange/);
  assert.match(autolink, /setInterval\(prova, 45000\)/);
  assert.match(app, /sync\.avvia\(\);\s*attivaInvitiAutomatici\(\);/);
});

test('v429: double clicks and network retries do not redeem an invite twice', () => {
  assert.match(app, /let completamentoInvitoInCorso = null/);
  assert.match(app, /if \(completamentoInvitoInCorso\) return completamentoInvitoInCorso/);
  assert.match(app, /const lavoro = \(async \(\) =>/);
  assert.match(migration, /v_inv\.accepted_by = v_uid/);
  assert.match(migration, /v_inv\.accepted_profile_id = p_profilo_id/);
  assert.match(migration, /a\.friend_user_id = v_inv\.created_by/);
  assert.match(migration, /raise exception 'Questo invito è già stato utilizzato\.'/);
  assert.match(migration, /if v_uid is null then raise exception/);
  assert.match(migration, /if v_inv\.created_by = v_uid then raise exception/);
});

test('v429: the existing invite is consumed only after the server confirms friendship', () => {
  const start = app.indexOf('async function completaInvitoPendente()');
  const end = app.indexOf('function attivaInvitiAutomatici()',start);
  const accept = app.indexOf('await sb.accettaInvitoAmico(token, idProfilo)',start);
  const consume = app.indexOf('consumaInvitoPendente()',start);
  assert.ok(accept > start && consume > accept && consume < end);
  assert.match(app, /palestra-invito-completato:/);
  assert.match(app, /const syncDopoInvito = await sync\.sincronizza\(\{ attendiSeInCorso: true \}\)/);
  assert.match(app, /Amicizia attivata: lo storico si aggiornerà/);
});

test('v429: PWA uses fresh cache and contains no external music link', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../stile-rpg.css', import.meta.url), 'utf8');
  assert.match(html, /palestra-v431/);
  assert.match(sw, /palestra-v431/);
  assert.doesNotMatch(app, /collegamentoMusicBox|https:\/\/stefanovillaggio8-dot\.github\.io\/music-box/);
  assert.doesNotMatch(css, /musicbox-palestra-link/);
});
