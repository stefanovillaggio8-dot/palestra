import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { sorgenteMiniatura, FOTO_INCLINE_PULLDOWN_CORRETTA } from '../src/exercise-icons.js';

const text = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
function webpValido(path) {
 const b=readFileSync(new URL('../'+path,import.meta.url));
 assert.equal(b.toString('ascii',0,4),'RIFF',path);
 assert.equal(b.toString('ascii',8,12),'WEBP',path);
 assert.ok(b.length>10000,'foto compressa eccessivamente: '+path);
}
test('v465: Cable Reverse Fly corretto e caricato da app, galleria e offline',()=>{
 const path='img/esercizi/cable-reverse-fly-v465.webp';
 const e=ESERCIZI.find(x=>x.id==='ex-cable-reverse-fly');
 assert.equal(sorgenteMiniatura(e).src,path);
 webpValido(path);
 assert.ok(text('verifica-icone.html').includes(path));
 assert.ok(text('sw.js').includes('./'+path));
 assert.ok(text('stile.css').includes('src$="cable-reverse-fly-v465.webp"'));
});
test('v465: Incline Single Arm Pulldown approvato, ID storico mantenuto',()=>{
 const path='img/esercizi/incline-single-arm-pulldown-v465.webp';
 const e=ESERCIZI.find(x=>x.id==='ex-lying-cable-curl');
 assert.equal(e.nome,'Incline Single Arm Pulldown');
 assert.equal(FOTO_INCLINE_PULLDOWN_CORRETTA,path);
 assert.equal(sorgenteMiniatura(e).src,path);
 webpValido(path);
 assert.ok(text('verifica-icone.html').includes(path));
 assert.ok(text('sw.js').includes('./'+path));
 assert.ok(text('stile.css').includes('src$="incline-single-arm-pulldown-v465.webp"'));
});
test('v465: CAD Curl e Wrist Curl non vengono sostituiti',()=>{
 assert.equal(sorgenteMiniatura(ESERCIZI.find(x=>x.id==='ex-scott-bench-curl')).src,'img/esercizi/cad-curl-v467.webp');
 for(const [id,path] of [
  ['ex-high-cable-wrist-curl-one-arm','high-pulley-wrist-one-arm-v468.webp'],
  ['ex-high-cable-wrist-curl-two-arm','high-pulley-wrist-two-arm-v468.webp']
 ]) assert.equal(sorgenteMiniatura(ESERCIZI.find(x=>x.id===id)).src,'img/esercizi/'+path);
});
test('v465: versione coerente, 81 icone, nessuna alterazione dei dati',()=>{
 assert.ok(text('sw.js').includes("const VERSIONE = 'palestra-v472'"));
 assert.ok(text('index.html').includes("window.PALESTRA_VERSIONE = 'palestra-v472'"));
 assert.equal((text('verifica-icone.html').match(/<article class="tile /g)||[]).length,81);
 const code=text('src/exercise-icons.js');
 for(const s of ['localStorage.setItem','db.salva','sb.scrivi','salvaSerie','eliminaSeduta'])assert.ok(!code.includes(s));
});
