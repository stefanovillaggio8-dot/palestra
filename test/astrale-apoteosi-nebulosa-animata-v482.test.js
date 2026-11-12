import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 dipingiRiftAstrale,dipingiApoteosiAstrale,dipingiNebulosaCosmica
} from '../src/effetti-rpg-canvas.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function mock(){
 const arcs=[],stats={gradients:0,fill:0,stroke:0,bezier:0,mask:0};
 const raw={
  createRadialGradient(){stats.gradients++;return {addColorStop(){}};},
  arc(x,y,r){if(arcs.length<2000)arcs.push([x,y,r]);},
  fill(){stats.fill++;},stroke(){stats.stroke++;},
  bezierCurveTo(){stats.bezier++;},
 };
 const ctx=new Proxy(raw,{
  get(o,k){return k in o?o[k]:()=>{};},
  set(o,k,v){if(k==='globalCompositeOperation'&&v==='destination-out')stats.mask++;o[k]=v;return true;}
 });
 return {ctx,arcs,stats};
}
test('v482 Apoteosi Mitica: superfici luminose, fratture e portali per tutte le classi',()=>{
 const fx=read('src/effetti-rpg-canvas.js');
 assert.match(fx,/dipingiApoteosiAstrale\(ctx,w,h,classe,t,numeroStelle\)/);
 for(const cls of ['assassino','guerriero','berserker']){
  const one=mock(),two=mock();
  assert.equal(dipingiRiftAstrale(one.ctx,340,490,cls,0,40),true);
  assert.equal(dipingiRiftAstrale(two.ctx,340,490,cls,4,40),true);
  assert.ok(one.stats.bezier>=12,'ali piene di materia, non solo fili');
  assert.ok(one.stats.gradients>=20,'molti livelli di luce');
  assert.ok(one.stats.stroke>=35,'eclissi, rune e onde dimensionali');
  assert.ok(one.arcs.length>=70,'polvere e particelle mitiche');
  assert.notDeepEqual(one.arcs.slice(-35),two.arcs.slice(-35),'animazione effettiva nel Canvas');
  assert.equal(one.stats.mask,0,'non modificare l immagine del personaggio');
 }
});
test('v482 Nebulosa: galassia in movimento e fallback CSS animato su Safari',()=>{
 for(const cls of ['assassino','guerriero','berserker']){
  const a=mock(),b=mock();
  assert.equal(dipingiNebulosaCosmica(a.ctx,320,460,cls,0,36),true);
  assert.equal(dipingiNebulosaCosmica(b.ctx,320,460,cls,5,36),true);
  assert.ok(a.stats.gradients>80,'gas volumetrico');
  assert.equal(a.stats.mask,1,'maschera silhouette invariata');
  assert.notDeepEqual(a.arcs.slice(-85),b.arcs.slice(-85),'stelle orbitano davvero');
 }
 const css=read('stile-rpg.css');
 assert.match(css,/nebula-v482-polvere/);
 assert.match(css,/nebula-v482-gas/);
 assert.match(css,/@keyframes nebula-v482-chiarore/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 const shop=read('src/app.js');
 assert.match(shop,/scena\.classList\.add\('rpg-scena-astrale'\)/);
 assert.match(shop,/scena\.classList\.add\('rpg-scena-nebulosa'\)/);
});
test('v482 non cambia skin, scala o rarità: tre asset astrali ben separati da Nebulosa',()=>{
 const sw=read('sw.js'),css=read('stile-rpg.css');
 for(const cls of ['assassino','guerriero','berserker']){
  const p='img/effetti/astrale-apoteosi-'+cls+'-v482.svg';
  const svg=read(p);
  assert.match(svg,/<svg/);
  assert.match(svg,/id="body"/);
  assert.match(svg,/id="portal"/);
  assert.ok((svg.match(/<radialGradient/g)||[]).length>=4);
  assert.ok((svg.match(/<path /g)||[]).length>=30);
  assert.match(css,new RegExp('astrale-apoteosi-'+cls+'-v482\\.svg'));
  assert.match(sw,new RegExp('astrale-apoteosi-'+cls+'-v482\\.svg'));
 }
 assert.match(css,/rpg-scena-astrale/);
 assert.match(css,/rpg-scena-nebulosa/);
 assert.match(sw,/palestra-v\d+/);
 assert.match(read('index.html'),/palestra-v\d+/);
 assert.match(read('src/rpg-atelier.js'),/disegnaAstraleExport/);
 assert.match(read('src/rpg-atelier.js'),/dipingiNebulosaCosmica/);
});
