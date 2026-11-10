import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { sorgenteMiniatura, POSIZIONI_CORREZIONI_V456, ATLANTE_CORREZIONI_V456 } from '../src/exercise-icons.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url));
const txt = p => read(p).toString('utf8');
const expected = [
  ['ex-cable-overhead-tricep',0,0],
  ['ex-single-arm-tricep-pushdown',1,0],
  ['ex-one-arm-cable-reverse-fly',2,0],
  ['ex-lat-pulldown-lats',0,1],
  ['ex-dips',1,1],
  ['ex-iso-lateral-high-row',2,1],
  ['ex-strict-curl-ez-wall',0,2],
  ['ex-seated-dumbbell-lateral-raise',1,2],
];
test('v456: otto esercizi corretti con celle distinte e atlas 3x3 reale',()=>{
  assert.equal(ESERCIZI.length,81);
  assert.equal(ATLANTE_CORREZIONI_V456,'img/esercizi/icone-corrette-v456-atlas.webp');
  const bytes=read(ATLANTE_CORREZIONI_V456);
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.length>19000);
  const used=new Set();
  for (const [id,c,r] of expected){
    assert.deepEqual(POSIZIONI_CORREZIONI_V456[id],[c,r]);
    assert.ok(!used.has(c+','+r),id+' duplicato');
    used.add(c+','+r);
    const ex=ESERCIZI.find(x=>x.id===id);assert.ok(ex,id);
    assert.deepEqual(sorgenteMiniatura(ex),{
      tipo:'sprite',atlas:ATLANTE_CORREZIONI_V456,x:c*50,y:r*50,zoom:1
    });
  }
});
test('v456: app, cache PWA e galleria hanno le stesse otto immagini',()=>{
  const sw=txt('sw.js'),src=txt('src/exercise-icons.js'),html=txt('verifica-icone.html');
  assert.match(sw,/palestra-v462/);
  assert.match(txt('index.html'),/palestra-v462/);
  assert.ok(sw.includes("'./"+ATLANTE_CORREZIONI_V456+"'"));
  assert.match(src,/background-size:300% 300%/);
  assert.match(html,/\.art span\.v456/);
  assert.equal((html.match(/<article class="tile /g)||[]).length,81);
  for (const [id,c,r] of expected) {
    const re=new RegExp('<article[^>]+data-name="[^"]*'+id+'"[^>]*>([\\s\\S]*?)<\\/article>');
    const article=html.match(re)?.[1];
    assert.ok(article,'Scheda galleria mancante: '+id);
    assert.ok(article.includes('class="v456"'),'Icona della galleria non aggiornata: '+id);
    assert.ok(article.includes('background-position:'+c*50+'% '+r*50+'%'),id);
  }
});
test('v456: ripristino CAD Curl inverso e conservazione dei dati',()=>{
  const cad=ESERCIZI.find(x=>x.id==='ex-scott-bench-curl');
  assert.equal(sorgenteMiniatura(cad).src,'img/esercizi/cad-curl-app.jpg');
  assert.match(txt('verifica-icone.html'),/img\/esercizi\/cad-curl-app\.jpg/);
  const bench=ESERCIZI.find(x=>x.id==='ex-bench-pull');
  assert.equal(sorgenteMiniatura(bench).src,'img/esercizi/bench-pull-v453.webp');
  const incline=ESERCIZI.find(x=>x.id==='ex-lying-cable-curl');
  assert.equal(sorgenteMiniatura(incline).tipo,'dedicata');
  for (const forbidden of ['localStorage.setItem','supabase.from','salvaSerie','eliminaSeduta']) {
    assert.ok(!txt('src/exercise-icons.js').includes(forbidden));
  }
});
