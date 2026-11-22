import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bytes=p=>readFileSync(new URL('../'+p,import.meta.url));

test('v547: five true-alpha panels, no vertical/horizontal clipping',()=>{
 const bin=bytes('img/effetti/reference-scene-v547.webp');
 const report=JSON.parse(read('img/effetti/reference-scene-v547.json'));
 assert.equal(bin.toString('ascii',0,4),'RIFF');
 assert.equal(bin.toString('ascii',8,12),'WEBP');
 assert.ok(bin.length>450000);
 assert.deepEqual(Object.keys(report),['ambra','ombra','fulmine','nebula','astrale']);
 for(const ref of Object.values(EFFETTI_REFERENCE_V532)){
  const scene=report[ref.classe];
  assert.ok(scene,ref.classe);
  assert.deepEqual(scene.cell,[ref.colonna,ref.riga],ref.classe);
  assert.equal(scene.left_max_alpha,0,ref.classe+' has a square left edge');
  assert.equal(scene.right_max_alpha,0,ref.classe+' has a square right edge');
  assert.ok(scene.floor_center_alpha>=100,ref.classe+' has no floor under the feet');
 }
});
test('v547: rebuild only missing old-armour pixels, not the real avatar',()=>{
 const src=read('tools/build-reference-scene-v547.py');
 assert.match(src,/reference-scene-v546\.webp/);
 assert.match(src,/Image\.alpha_composite\(frame,glyph\)/);
 assert.match(src,/trailpaths=/);
 assert.match(src,/edgeX=smooth\(/);
 assert.match(src,/edgeY=smooth\(/);
 assert.doesNotMatch(src,/reference-approvata-v537\.png.*save/);
});
test('v547: Shop VFX behind the character and wider than original portrait',()=>{
 const css=read('stile-rpg.css'),compositor=read('src/rpg-reference-compositing-v539.js');
 assert.match(css,/\.rpg-reference-stage-v547\s*> \.rpg-reference-environment-v541\s*\{[\s\S]*?reference-scene-v547\.webp\?v=547/);
 assert.match(css,/\.rpg-reference-stage-v547\s*> \.rpg-reference-environment-v541\s*\{[\s\S]*?width:160%!important/);
 assert.match(css,/\.rpg-reference-stage-v547\s*> \.rpg-reference-environment-v541\s*\{[\s\S]*?aspect-ratio:461 \/ 440!important/);
 assert.match(compositor,/fotografiaSenzaTagli\.naturalWidth===1383&&/);
 assert.match(compositor,/grafica\.classList\?\.add\?\.\('rpg-reference-stage-v547'\)/);
 assert.ok(compositor.indexOf('grafica.appendChild(ambiente)')<compositor.indexOf('grafica.appendChild(soggetto)'));
 assert.match(css,/\.rpg-reference-stage-v547 > \.rpg-reference-complete-v539 \{\s*display:none!important/);
});
test('v547: PNG export maps exactly the live 3x2 cell and zoom',()=>{
 const exp=read('src/rpg-atelier.js');
 const shop=read('src/anteprima-combinata-rpg.js');
 assert.match(exp,/const palcoV547=riferimentoV532/);
 assert.match(exp,/const palcoFotoV547=Boolean\(ritaglioEsportabile&&/);
 assert.match(exp,/palcoV547\.naturalWidth\/3,cellH=palcoV547\.naturalHeight\/2/);
 assert.match(exp,/const fxW=dw\*1\.60,fxH=fxW\*\(440\/461\)/);
 assert.match(shop,/rpg-atelier\.js\?v=553/);
});
test('v547: PWA fresh cache includes new photo and historical fallback',()=>{
 const idx=read('index.html'),sw=read('sw.js'),app=read('src/app.js');
 assert.ok(idx.includes("PALESTRA_VERSIONE = 'palestra-v553'"));
 assert.ok(sw.includes("const VERSIONE = 'palestra-v553'"));
 for(const css of ['stile.css','stile-rpg.css','stile-premium.css']){
  assert.ok(idx.includes('./'+css+'?v=553'),css);
  assert.ok(sw.includes("'./"+css+"?v=553'"),css);
 }
 assert.ok(sw.includes("'./img/effetti/reference-scene-v547.webp?v=547'"));
 assert.ok(sw.includes("'./img/effetti/reference-scene-v546.webp?v=546'"));
 assert.ok(sw.includes("percorso.includes('reference-scene-v547.webp')"));
 assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=553'));
 assert.ok(app.includes('./rpg-atelier-ui.js?v=553'));
});
