import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
const js = match?.[1].replace(/^import .+$/gm, '');

test('la dashboard carica uno script JavaScript sintatticamente valido', () => {
  assert.ok(match, 'deve essere presente lo script principale');
  assert.doesNotThrow(() => new Script(js, { filename: 'dashboard.html' }));
});

test('le sei viste e i due backup sono presenti', () => {
  for (const page of ['overview', 'exercises', 'plans', 'rank', 'diagnostics', 'history']) {
    assert.match(html, new RegExp('data-page="' + page + '"'));
  }
  assert.match(html, /data-import="pc"/);
  assert.match(html, /data-import="iphone"/);
  assert.match(html, /id="source"/);
});

test('riutilizza i motori veri senza duplicare formule rank o streak', () => {
  for (const token of [
    'recordEsercizio(', 'valutaPrestazione(', 'calcolaStreak(',
    'confrontaStreakDispositivi(', 'corrispondeRicercaEsercizi(',
    'valutaNumeroInsolito(', 'storicoCronologia('
  ]) {
    assert.ok(js.includes(token), token);
  }
});

test('non modifica allenamenti, streak, rank o sincronizzazione', () => {
  assert.doesNotMatch(js, /\bdb\.(?:salva|cestino|recupera|svuotaTutto|scriviMeta|aggiornaSe)\s*\(/);
  assert.doesNotMatch(js, /\b(?:sync|sb)\.(?:sincronizza|scrivi|rimuovi|rpc)\s*\(/);
  assert.doesNotMatch(js, /localStorage\.setItem\s*\(/);
  assert.match(js, /db\.esportaTutto\s*\(/);
});

test('non scambia conflitti risolti per conflitti aperti e separa gli account', () => {
  assert.match(js, /c\.stato!=='da_scegliere'/);
  assert.match(js, /ownIds\[c\.tabella\]\?\.has\(c\.riga_id\)/);
  assert.match(js, /a\.account!==b\.account/);
  assert.match(js, /!model\(d\)\?\.schemes\.length/);
});

test('anteprima Rank usa valori temporanei e backup non scrivono nel DB', () => {
  assert.match(js, /id:'anteprima-1'/);
  assert.match(js, /S\.preview/);
  assert.match(js, /S\.data\[target\]=d/);
  assert.match(html, /non vengono salvati/i);
});
