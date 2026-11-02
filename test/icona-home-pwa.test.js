import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file=(p)=>readFileSync(new URL('../'+p,import.meta.url));
const html=file('index.html').toString('utf8');
const worker=file('sw.js').toString('utf8');
const paths=['manifest.webmanifest','manifest-p1.webmanifest',
  'manifest-p2.webmanifest','manifest-nuovo.webmanifest'];

test('l icona Apple di iPhone e nuova e presente come PNG reale',()=>{
  const p=file('img/icon-palestra-v407-192.png');
  assert.deepEqual([...p.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(p.readUInt32BE(16),192);
  assert.equal(p.readUInt32BE(20),192);
  assert.match(html,/rel="apple-touch-icon"[^>]*icon-palestra-v407-192\.png\?v=\d+/);
  assert.match(html,/rel="icon"[^>]*icon-palestra-v407-192\.png\?v=\d+/);
});

test('tutti i manifest usano la nuova identita senza cambiare ID e avvio',()=>{
  for(const path of paths) {
    const m=JSON.parse(file(path).toString('utf8'));
    assert.ok(m.id.startsWith('app-palestra'));
    assert.ok(m.start_url.startsWith('./index.html'));
    assert.ok(m.icons.some(i=>i.src==='./img/icon-palestra-v407-192.png' && i.sizes==='192x192'));
    assert.ok(m.icons.some(i=>i.src==='./img/icon-palestra-v407.svg' && i.sizes==='any'));
    assert.ok(m.icons.some(i=>i.src==='./img/icon-palestra-v407-maskable.svg' && i.purpose==='maskable'));
  }
});

test('le icone e i manifest versionati sono disponibili offline',()=>{
  const vers=html.match(/PALESTRA_VERSIONE = '(palestra-v\d+)'/)?.[1];
  assert.match(vers,/^palestra-v\d+$/);
  assert.ok(worker.includes("const VERSIONE = '"+vers+"'"));
  assert.match(html,/manifest-.*webmanifest\?v=\d+/);
  for(const f of [
    './img/icon-palestra-v407-192.png',
    './img/icon-palestra-v407.svg',
    './img/icon-palestra-v407-maskable.svg'
  ]) assert.ok(worker.includes(f),f);
  assert.ok(worker.includes('css|js|webmanifest'));
  assert.ok(worker.includes('icon-palestra-v407-192'));
});
