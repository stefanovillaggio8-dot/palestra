import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { sorgenteMiniatura, FOTO_VERIFICATE_TECNICAMENTE } from '../src/exercise-icons.js';

const txt=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v466: Incline Cable Curl usa il nuovo WebP approvato',()=>{
 const e=ESERCIZI.find(e=>e.id==='ex-incline-cable-curl'),icon=sorgenteMiniatura(e);
 assert.equal(icon.tipo,'originale');
 assert.equal(icon.src,'img/esercizi/incline-cable-curl-v466.webp');
 assert.equal(icon.zoom,1);
 assert.equal(FOTO_VERIFICATE_TECNICAMENTE[e.id],icon.src);
 const f=readFileSync(new URL('../'+icon.src,import.meta.url));
 assert.equal(f.toString('ascii',0,4),'RIFF');
 assert.equal(f.toString('ascii',8,12),'WEBP');
 assert.ok(f.length>60000,'qualita insufficiente');
 const gallery=txt('verifica-icone.html');
 assert.match(gallery,/data-name="incline cable curl ex-incline-cable-curl"[^]*?<img src="img\/esercizi\/incline-cable-curl-v466\.webp"/);
 assert.ok(txt('sw.js').includes('./'+icon.src));
});
test('v466: CAD, Wrist Curl, Reverse Fly e Pulldown restano invariati',()=>{
 const expected={
  'ex-scott-bench-curl':'img/esercizi/cad-curl-v467.webp',
  'ex-wrist-curl':'img/esercizi/wrist-curl-v467.webp',
  'ex-cable-reverse-fly':'img/esercizi/cable-reverse-fly-v465.webp',
  'ex-lying-cable-curl':'img/esercizi/incline-single-arm-pulldown-v465.webp',
  'ex-high-cable-wrist-curl-one-arm':'img/esercizi/high-pulley-wrist-one-arm-v468.webp',
  'ex-high-cable-wrist-curl-two-arm':'img/esercizi/high-pulley-wrist-two-arm-v468.webp'
 };
 for(const [id,path] of Object.entries(expected))
  assert.equal(sorgenteMiniatura(ESERCIZI.find(e=>e.id===id)).src,path,id);
});
test('v466: cache/versione coerenti e solo rendering senza scrittura dati',()=>{
 assert.ok(txt('sw.js').includes("const VERSIONE = 'palestra-v476'"));
 assert.ok(txt('index.html').includes("window.PALESTRA_VERSIONE = 'palestra-v476'"));
 assert.ok(txt('index.html').includes('app.js?v=475'));
 assert.match(txt('verifica-icone.html'),/Palestra v474/);
 const module=txt('src/exercise-icons.js');
 for(const v of ['localStorage.setItem','salvaSerie','eliminaSeduta','supabase.from'])
  assert.ok(!module.includes(v));
});
