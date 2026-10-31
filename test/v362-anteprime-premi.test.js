import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v362: anteprima 80 mostra artwork originale e non la vecchia corona incollata',()=>{
  const app=file('src/app.js');
  const start=app.indexOf('function apriAnteprimaCoronaRpg(');
  const end=app.indexOf('function vistaAuraShop(',start);
  assert.ok(start>0&&end>start);
  const preview=app.slice(start,end);
  assert.match(preview,/corona-v361-original/);
  assert.match(preview,/corona-v361-art-img/);
  for(const cls of ['assassino-5-base','guerriero-5-ambra','berserker-5-base'])
    assert.match(preview,new RegExp(cls));
  assert.doesNotMatch(preview,/bloccoPersonaggio\(/);
  assert.match(preview,/non vengono modificati/);
  assert.match(preview,/record>=80/);
  assert.doesNotMatch(preview,/cambiaCoronaInfinito|db\.salva/);
});

test('v362: le nove illustrazioni originali esistono e le varianti sono conservate',()=>{
 const names=['assassino-5-base','assassino-5-fulmine','assassino-1-ombra',
 'guerriero-5-ambra','guerriero-2-astrale','guerriero-4-fulmine',
 'berserker-5-base','berserker-3-nebula','berserker-4-ambra'];
 for(const name of names)
  for(const ext of ['png','webp'])assert.ok(existsSync(new URL('../img/personaggi/corona-v361-original/'+name+'.'+ext,import.meta.url)),name+'.'+ext);
});

test('v362: aura divina illumina i bordi senza nascondere il personaggio',()=>{
 const css=file('stile-rpg.css');
 const rule=css.slice(css.lastIndexOf('/* v362: solo illustrazioni'));
 assert.match(rule,/opacity:\.56!important/);
 assert.match(rule,/mix-blend-mode:normal!important/);
 assert.match(rule,/-webkit-mask-image:radial-gradient/);
 assert.match(rule,/mask-image:radial-gradient/);
 assert.match(file('src/anteprima-combinata-rpg.js'),/fx\.globalAlpha=\.56/);
});

test('v362: app, cache e preview sincronizzate',()=>{
 const sw=file('sw.js'),html=file('index.html');
 assert.match(sw,/palestra-v366/);
 assert.match(html,/palestra-v366/);
 assert.match(sw,/corona-v361-anteprima\.html/);
 assert.match(html,/stile-rpg\.css\?v=365/);
});