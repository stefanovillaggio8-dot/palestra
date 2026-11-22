import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const bytes=path=>readFileSync(new URL('../'+path,import.meta.url));
const gitSha=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');

test('v543: cinque scene originali complete con basi e pavimento verificati',()=>{
 const original=bytes('img/effetti/reference-approvata-v537.png');
 const scene=bytes('img/effetti/reference-scene-v543.webp');
 const oldFx=bytes('img/effetti/effetti-reference-v539.webp');
 const manifest=JSON.parse(read('img/effetti/reference-scene-v543.json'));
 assert.equal(gitSha(original),'258a2fd9f0c2e4d61246cd48a76ae8205f6226bb');
 assert.equal(gitSha(oldFx),'d3e6e78596b391ffbcbfb94659d97234c82cee7e');
 assert.equal(gitSha(scene),'aefa751fda534fa07c68cc771d8f824d536b00cc');
 assert.equal(scene.toString('ascii',0,4),'RIFF');
 assert.equal(scene.toString('ascii',8,12),'WEBP');
 assert.ok(scene.length>1000000);
 assert.deepEqual(Object.keys(manifest),['ambra','ombra','fulmine','nebula','astrale']);
 for(const [name,meta] of Object.entries(manifest)){
   assert.equal(meta.middle_floor_alpha.length,4,name);
   assert.ok(meta.middle_floor_alpha.every(a=>a>=180),name+' ha un buco nel pavimento');
   assert.equal(meta.source_panel[2]-meta.source_panel[0],461,name);
   assert.equal(meta.source_panel[3]-meta.source_panel[1],440,name);
 }
});
test('v543: rimuove il buco dalla foto approvata, non riscrive il personaggio',()=>{
 const gen=read('tools/build-reference-scene-v543.py');
 assert.match(gen,/reference-approvata-v537\.png/);
 assert.match(gen,/cv2\.seamlessClone\(donor,target,mask_pixels/);
 assert.match(gen,/illumination\*=1-\.93\*silhouette\*head_and_torso/);
 assert.match(gen,/floor=\.94\*floor_x\*floor_y/);
 const layer=read('src/rpg-reference-compositing-v539.js');
 assert.match(layer,/reference-scene-v543\.webp\?v=543/);
 assert.match(layer,/palcoPronto=palcoImg\.naturalWidth===1383&&palcoImg\.naturalHeight===880/);
 assert.match(layer,/grafica\.classList\?\.add\?\.\('rpg-reference-stage-v543'\)/);
 assert.ok(layer.indexOf('grafica.appendChild(ambiente)')<
           layer.indexOf('grafica.appendChild(soggetto)'));
});
test('v543: non sovrappone più lo sprite che cancellava il pavimento',()=>{
 const css=read('stile-rpg.css');
 assert.match(css,/\.rpg-reference-stage-v543\s*> \.rpg-reference-environment-v541\s*\{[\s\S]*?reference-scene-v543\.webp\?v=543/);
 assert.match(css,/\.rpg-reference-stage-v543\s*> \.rpg-reference-complete-v539\s*\{[\s\S]*?display:none!important/);
 assert.match(css,/\.rpg-reference-stage-v543\s*> \.rpg-reference-subject-v539\s*\{[\s\S]*?z-index:3!important/);
 assert.ok(css.includes('background-size:300% 200%!important'));
});
test('v543: Shop ed esportazione PNG usano la stessa cella della scena',()=>{
 const atelier=read('src/rpg-atelier.js'),shop=read('src/anteprima-combinata-rpg.js');
 assert.match(atelier,/reference-scene-v543\.webp\?v=543/);
 assert.match(atelier,/const palcoCompleto=Boolean\(ritaglioEsportabile&&/);
 assert.match(atelier,/palcoV543\.naturalWidth\/3,cellH=palcoV543\.naturalHeight\/2/);
 assert.match(atelier,/ctx\.drawImage\(palcoV543,[\s\S]*?riferimentoV532\.colonna\*cellW,riferimentoV532\.riga\*cellH/);
 assert.match(atelier,/if\(palcoCompleto\)[\s\S]*?else \{/);
 assert.match(shop,/rpg-atelier\.js\?v=554/);
});
test('v543: aggiornamento offline preciso e fallback della v542',()=>{
 const sw=read('sw.js'),idx=read('index.html'),app=read('src/app.js');
 assert.match(sw,/const VERSIONE = 'palestra-v554'/);
 assert.match(idx,/PALESTRA_VERSIONE = 'palestra-v554'/);
 assert.ok(sw.includes("'./img/effetti/reference-scene-v543.webp?v=543'"));
 assert.ok(sw.includes("percorso.includes('reference-scene-v543.webp')"));
 assert.ok(sw.includes("'./img/effetti/reference-ambienti-v542.webp?v=542'"));
 assert.ok(app.includes("./rpg-reference-compositing-v539.js?v=554"));
});
