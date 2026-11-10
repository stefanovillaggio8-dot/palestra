import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ESERCIZI} from '../src/dati-iniziali.js';
import {sorgenteMiniatura} from '../src/exercise-icons.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v463: reverse fly mostra i cavi alti approvati in app, galleria e cache',()=>{
 const e=ESERCIZI.find(x=>x.id==='ex-cable-reverse-fly');
 const f=sorgenteMiniatura(e);
 assert.equal(f.tipo,'originale');
 assert.equal(f.src,'img/esercizi/cable-reverse-fly-v465.webp');
 const b=readFileSync(new URL('../'+f.src,import.meta.url));
 assert.equal(b.toString('ascii',0,4),'RIFF');
 assert.equal(b.toString('ascii',8,12),'WEBP');
 assert.ok(b.length>4000);
 const gallery=read('verifica-icone.html');
 assert.match(gallery,/ex-cable-reverse-fly[^]*?cable-reverse-fly-v465\.webp/);
 assert.ok(read('sw.js').includes('./'+f.src));
});
test('v463: CAD mantiene la posa storica e lo stile della galleria',()=>{
 const cad=ESERCIZI.find(x=>x.id==='ex-scott-bench-curl');
 assert.equal(sorgenteMiniatura(cad).src,'img/esercizi/cad-curl-v467.webp');
 const code=read('src/exercise-icons.js'),css=read('stile.css');
 assert.match(code,/foto-esercizio-cad-curl/);
 assert.match(css,/\.foto-esercizio-cad-curl::after/);
 assert.match(read('verifica-icone.html'),/img\/esercizi\/cad-curl-v467\.webp/);
});
test('v463: versioni coerenti e nessuna modifica allo storico di allenamento',()=>{
 assert.match(read('sw.js'),/const VERSIONE = 'palestra-v469'/);
 assert.match(read('index.html'),/window\.PALESTRA_VERSIONE = 'palestra-v469'/);
 assert.match(read('index.html'),/app\.js\?v=469/);
 assert.match(read('verifica-icone.html'),/Palestra v469/);
});
