import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EFFETTI_REFERENCE_V532 } from '../src/rpg-reference-v532.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const raw=p=>readFileSync(new URL('../'+p,import.meta.url));

test('v546: cinque immagini originali senza cavaliere opaco e con pavimento',()=>{
 const bin=raw('img/effetti/reference-scene-v546.webp');
 const manifest=JSON.parse(read('img/effetti/reference-scene-v546.json'));
 assert.equal(bin.toString('ascii',0,4),'RIFF');
 assert.equal(bin.toString('ascii',8,12),'WEBP');
 assert.ok(bin.length>650000);
 assert.deepEqual(Object.keys(manifest),['ambra','ombra','fulmine','nebula','astrale']);
 for(const ref of Object.values(EFFETTI_REFERENCE_V532)){
   const item=manifest[ref.classe];
   assert.ok(item,'Missing '+ref.classe);
   assert.deepEqual(item.cell,[ref.colonna,ref.riga],ref.classe);
   assert.ok(item.floor_center_alpha>=100,ref.classe+' lacks floor under shoes');
   assert.ok(item.edge_alpha_means.some(a=>a<15),
      ref.classe+' has an opaque rectangular photo border');
 }
});
test('v546: body pixels excluded, magic comes directly from original collage',()=>{
 const builder=read('tools/build-reference-scene-v546.py');
 assert.match(builder,/reference-approvata-v537\.png/);
 assert.match(builder,/reference-ambiente-v541\.webp/);
 assert.match(builder,/energy\*= \(1-sil\)\*\*1\.35/);
 assert.match(builder,/MaxFilter\(23\)/);
 assert.match(builder,/effectA\*=1-smooth\(\.945,\.971,y\)/);
 assert.match(builder,/Image\.alpha_composite\(scene,Image\.fromarray\(ring,'RGBA'\)\)/);
});
test('v546: shop shows transparency, not v545 square, avatar always foremost',()=>{
 const css=read('stile-rpg.css'),js=read('src/rpg-reference-compositing-v539.js');
 assert.match(css,/\.rpg-reference-stage-v546\s*> \.rpg-reference-environment-v541\s*\{[\s\S]*?reference-scene-v546\.webp\?v=546/);
 assert.match(css,/\.rpg-reference-stage-v546\s*> \.rpg-reference-environment-v541\s*\{[\s\S]*?width:160%!important/);
 assert.match(css,/\.rpg-reference-stage-v546\s*> \.rpg-reference-environment-v541\s*\{[\s\S]*?aspect-ratio:461 \/ 440!important/);
 assert.match(js,/fotoV546Pronta=effettiPuliti\.naturalWidth===1383&&effettiPuliti\.naturalHeight===880/);
 assert.match(js,/grafica\.classList\?\.add\?\.\('rpg-reference-stage-v546'\)/);
 assert.ok(js.indexOf('grafica.appendChild(ambiente)')<js.indexOf('grafica.appendChild(soggetto)'));
 assert.ok(css.includes('> .rpg-reference-complete-v539 {\n  display:none!important'));
});
test('v546: export PNG uses same cell/zoom and never renders second old knight',()=>{
 const at=read('src/rpg-atelier.js'),shop=read('src/anteprima-combinata-rpg.js');
 assert.match(at,/const palcoV546=riferimentoV532/);
 assert.match(at,/const palcoFotoV546=Boolean\(ritaglioEsportabile&&/);
 assert.match(at,/palcoV546\.naturalWidth\/3,cellH=palcoV546\.naturalHeight\/2/);
 assert.match(at,/const fxW=dw\*1\.60,fxH=fxW\*\(440\/461\)/);
 assert.match(shop,/rpg-atelier\.js\?v=559/);
});
test('v546: app, precache, alternate photos and CSS all use fresh version',()=>{
 const index=read('index.html'),sw=read('sw.js'),app=read('src/app.js');
 assert.ok(index.includes("PALESTRA_VERSIONE = 'palestra-v559'"));
 assert.ok(sw.includes("const VERSIONE = 'palestra-v559'"));
 for(const sheet of ['stile.css','stile-rpg.css','stile-premium.css']){
   assert.ok(index.includes('./'+sheet+'?v=559'),sheet);
   assert.ok(sw.includes("'./"+sheet+"?v=559'"),sheet);
 }
 assert.ok(sw.includes("'./img/effetti/reference-scene-v546.webp?v=546'"));
 assert.ok(sw.includes("percorso.includes('reference-scene-v546.webp')"));
 assert.ok(sw.includes("'./img/effetti/reference-scene-v545.webp?v=545'"));
 assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=559'));
 assert.ok(app.includes('./rpg-atelier-ui.js?v=559'));
});
