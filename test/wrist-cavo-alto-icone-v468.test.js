import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { sorgenteMiniatura } from '../src/exercise-icons.js';

const read = p => readFileSync(new URL('../'+p,import.meta.url));
const txt = p => read(p).toString('utf8');
const variants = [
  ['ex-high-cable-wrist-curl-one-arm','high-pulley-wrist-one-arm-v468.webp'],
  ['ex-high-cable-wrist-curl-two-arm','high-pulley-wrist-two-arm-v468.webp'],
];

test('v468: immagini Wrist Curl alte #80 e #81 caricate in app galleria e cache offline',()=>{
 const gallery=txt('verifica-icone.html'),cache=txt('sw.js');
 for(const [id,name] of variants){
  const e=ESERCIZI.find(x=>x.id===id),path='img/esercizi/'+name;
  assert.ok(e,'ID originale mantenuto: '+id);
  assert.equal(e.foto,path);
  assert.equal(sorgenteMiniatura(e).src,path);
  assert.equal(sorgenteMiniatura(e).tipo,'originale');
  assert.equal(sorgenteMiniatura(e).zoom,1);
  const b=read(path);
  assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.ok(b.length>15000,'foto troppo piccola: '+name);
  assert.ok(gallery.includes('data-name="wrist curl cavo alto'));
  assert.ok(gallery.includes(name));
  assert.ok(cache.includes('./'+path),'foto non disponibile offline: '+name);
 }
 assert.equal((gallery.match(/<article class="tile /g)||[]).length,81);
});

test('v468: foto delle 2 varianti differenti, senza confondere monobraccio con due braccia',()=>{
 const digests=variants.map(([,p])=>createHash('sha256').update(read('img/esercizi/'+p)).digest('hex'));
 assert.notEqual(digests[0],digests[1]);
 const mono=ESERCIZI.find(e=>e.id===variants[0][0]),doppio=ESERCIZI.find(e=>e.id===variants[1][0]);
 assert.equal(mono.usoBraccia,'un_braccio');
 assert.equal(doppio.usoBraccia,'due_braccia');
 assert.match(mono.nota_permanente,/Gomito e avambraccio stabili/);
 assert.match(doppio.nota_permanente,/NON estendere il gomito/);
});

test('v468: CAD, Wrist Curl normale, Reverse Fly e Incline Curl identici alle versioni approvate',()=>{
 for(const [id,path] of [
  ['ex-scott-bench-curl','img/esercizi/cad-curl-v467.webp'],
  ['ex-wrist-curl','img/esercizi/wrist-curl-v467.webp'],
  ['ex-cable-reverse-fly','img/esercizi/cable-reverse-fly-v465.webp'],
  ['ex-incline-cable-curl','img/esercizi/incline-cable-curl-v466.webp'],
  ['ex-lying-cable-curl','img/esercizi/incline-single-arm-pulldown-v465.webp']
 ]) assert.equal(sorgenteMiniatura(ESERCIZI.find(e=>e.id===id)).src,path,id);
 assert.match(txt('sw.js'),/const VERSIONE = 'palestra-v468'/);
 assert.match(txt('index.html'),/PALESTRA_VERSIONE = 'palestra-v468'/);
 assert.match(txt('index.html'),/app\\.js\\?v=468/);
 const iconCode=txt('src/exercise-icons.js');
 for(const op of ['localStorage.setItem','supabase.from','salvaSerie','eliminaSeduta'])assert.ok(!iconCode.includes(op));
});
