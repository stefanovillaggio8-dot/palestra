import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v485 le sagome nebulari sono sfumate su tutte e tre le classi',()=>{
 for(const classe of ['assassino','guerriero','berserker']){
   const svg=read('img/effetti/nebulosa-spirale-'+classe+'-v484.svg');
   assert.match(svg,/id="body-feather-v485"/);
   assert.match(svg,/<feGaussianBlur stdDeviation="11"\/>/);
   assert.match(svg,/fill="black" filter="url\(#body-feather-v485\)"\/>(?:<\/mask>)/);
   assert.match(svg,/viewBox="0 0 680 980"/);
 }
});
test('v485 atmosfera e bordo appartengono alla scena, non sostituiscono il ritratto',()=>{
 const css=read('stile-rpg.css');
 const tail=css.slice(css.lastIndexOf('/* v485'),css.indexOf('/* v486'));
 assert.match(tail,/\.personaggio-scena\.rpg-scena-nebulosa::before/);
 assert.match(tail,/filter:blur\(24px\)/);
 assert.match(tail,/nebula-v485-respiro/);
 assert.match(tail,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(tail,/personaggio-ritratto|shop-skin-mitica|object-fit/);
 assert.doesNotMatch(tail,/\.rpg-astrale-presenza/);
 assert.match(read('sw.js'),/palestra-v486/);
 assert.match(read('index.html'),/palestra-v486/);
});
