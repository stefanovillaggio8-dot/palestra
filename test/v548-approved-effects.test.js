import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bytes=p=>readFileSync(new URL('../'+p,import.meta.url));
test('v548: exactly the five approved image sources and intact signed-off atlas',()=>{
 const map=JSON.parse(read('img/effetti/approved-v548-manifest.json'));
 assert.deepEqual(Object.keys(map),['ambra','ombra','fulmine','nebula','astrale']);
 const expected={
   ambra:'17aa844444d1840d1f7f5f604ffb82829ac4e1531f54a429fa6cc294e3e19ec3',
   ombra:'5ad38afa68b32f9fa8271cae77897ab86c3b8945cd32c5be5bcf93a702bfda21',
   fulmine:'047a51c7fd54626d79d2fd21f966b0e71c9af4e6a1c5ec990e9a9da72495ad86',
   nebula:'c30337f317ddc58d91c76931fa9e6927e62c02b65087a686c7d53a1476b2b12e',
   astrale:'b1b39b1e044c47bfebcde3e5146b8fecfdde6596aa25e168e907fa8ce4caba5a'
 };
 for(const ref of Object.values(EFFETTI_REFERENCE_V532)){
   assert.deepEqual(map[ref.classe].cell,[ref.colonna,ref.riga],ref.classe);
   assert.equal(map[ref.classe].source_sha256,expected[ref.classe]);
   assert.deepEqual(map[ref.classe].crop,[140,660,766,1370]);
   assert.equal(map[ref.classe].static_pixels_preserved,626*710);
 }
 for(const file of ['approved-showcase-v548.webp','approved-environments-v548.webp']){
   const bin=bytes('img/effetti/'+file);
   assert.equal(bin.toString('ascii',0,4),'RIFF');
   assert.equal(bin.toString('ascii',8,12),'WEBP');
   assert.ok(bin.length>200000,file);
 }
});
test('v548: static approved figure only for default assassin and only in preview',()=>{
 const js=read('src/rpg-reference-compositing-v539.js');
 const css=read('stile-rpg.css');
 assert.match(js,/avatarMockupConsentito=classe==='assassino'&&/);
 assert.match(js,/Number\(grafica\.dataset\?\.referenceStadio\|\|0\)===0/);
 assert.match(js,/!grafica\.dataset\?\.referenceArmatura/);
 assert.match(js,/grafica\.dataset\?\.referenceDivina!=='true'/);
 assert.match(js,/rpg-reference-stage-v548-static/);
 assert.match(css,/:is\(\.aura-preview-panel,\.rpg-atelier-panel\)/);
 assert.match(css,/\.rpg-reference-stage-v548\.rpg-reference-stage-v548-static[\s\S]*?> \.rpg-reference-subject-v539 \{\s*display:none!important/);
 assert.match(css,/approved-showcase-v548\.webp\?v=548/);
 assert.match(css,/approved-environments-v548\.webp\?v=548/);
});
test('v548: dynamic photos keep genuine class and original armor',()=>{
 const js=read('src/rpg-reference-compositing-v539.js');
 const css=read('stile-rpg.css');
 assert.ok(js.includes("grafica.appendChild(soggetto)"));
 assert.ok(js.includes("idContornoArmaturaCosmicaRpg(url)"));
 assert.match(css,/\.rpg-reference-stage-v548 > \.rpg-reference-subject-v539\{\s*display:block!important/);
 assert.match(css,/aspect-ratio:626 \/ 710!important/);
 assert.match(css,/width:112%!important/);
 assert.match(css,/\.rpg-reference-stage-v548 > \.rpg-reference-complete-v539\{\s*display:none!important/);
});
test('v548: preview and PNG export share exactly approved crop and scale',()=>{
 const js=read('src/rpg-atelier.js');
 const shop=read('src/anteprima-combinata-rpg.js');
 assert.match(js,/const palcoApprovatoV548=riferimentoV532/);
 assert.match(js,/const palcoAmbienteV548=riferimentoV532/);
 assert.match(js,/const palcoEsattoV548=Boolean\(ritaglioEsportabile&&/);
 assert.match(js,/const palcoDinamicoV548=Boolean\(ritaglioEsportabile&&/);
 assert.match(js,/const fxW=dw\*1\.12,fxH=fxW\*\(710\/626\)/);
 assert.match(js,/else if\(!palcoEsattoV548\) ctx\.drawImage/);
 assert.match(shop,/rpg-atelier\.js\?v=548/);
});
test('v548: versioned PWA precaches approved binaries, still has offline fallback',()=>{
 const index=read('index.html'),sw=read('sw.js'),app=read('src/app.js');
 assert.ok(index.includes("PALESTRA_VERSIONE = 'palestra-v548'"));
 assert.ok(sw.includes("const VERSIONE = 'palestra-v548'"));
 for(const path of ['stile.css','stile-rpg.css','stile-premium.css']){
   assert.ok(index.includes('./'+path+'?v=548'),path);
   assert.ok(sw.includes("'./"+path+"?v=548'"),path);
 }
 assert.ok(sw.includes("'./img/effetti/approved-showcase-v548.webp?v=548'"));
 assert.ok(sw.includes("'./img/effetti/approved-environments-v548.webp?v=548'"));
 assert.ok(sw.includes("'./img/effetti/reference-scene-v547.webp?v=547'"));
 assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=548'));
 assert.ok(app.includes('./rpg-atelier-ui.js?v=548'));
});
