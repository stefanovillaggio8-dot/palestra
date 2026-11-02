// Controlli statici senza dipendenze, senza rete e senza accedere ai dati utenti.
// Eseguire dalla radice del progetto: node tests/sicurezza-release.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const html = read('index.html');
const sw = read('sw.js');
const update = read('src/update-via-sw.js');
const indexVersion = html.match(/window\.PALESTRA_VERSIONE\s*=\s*['"]palestra-v(\d+)['"]/);
const swVersion = sw.match(/const VERSIONE\s*=\s*['"]palestra-v(\d+)['"]/);
assert.ok(indexVersion, 'Versione dell’app mancante in index.html');
assert.ok(swVersion, 'Versione del service worker mancante');
assert.equal(indexVersion[1], swVersion[1], 'Versioni HTML e service worker differenti');

for (const href of [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/g)].map(m => m[1])) {
  assert.equal(new URL(href, 'https://test.invalid/').searchParams.get('v'), indexVersion[1],
    'CSS senza cache-busting della versione: ' + href);
}
for (const src of [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/g)].map(m => m[1])) {
  if (!src.startsWith('./')) continue;
  assert.equal(new URL(src, 'https://test.invalid/').searchParams.get('v'), indexVersion[1],
    'Script senza cache-busting della versione: ' + src);
}
assert.match(sw, /\.\.\.new Set\(\[\.\.\.FILE,\s*\.\.\.FOTO\]\)/,
  'Il pre-cache deve deduplicare le risorse');
assert.match(sw, /new Request\(percorso,\s*\{\s*cache:\s*['"]reload['"]\s*\}\)/,
  'Pre-cache senza bypass della cache HTTP');
assert.match(sw, /\.then\(\(\) => self\.skipWaiting\(\)\)/,
  'Attivazione del nuovo worker non collegata al completamento pre-cache');
assert.match(sw, /richiesta\.method\s*!==\s*['"]GET['"]/,
  'Il service worker non deve intercettare scritture');
assert.match(sw, /url\.origin\s*!==\s*self\.location\.origin/,
  'Il service worker non deve intercettare risorse di altre origini');
assert.match(update, /sessionStorage\.setItem\(['"]palestra:versione-provata['"]/,
  'Manca la protezione dai tentativi ripetuti di aggiornamento');
console.log('OK: versioni, cache-busting, pre-cache e protezioni aggiornamenti.');
