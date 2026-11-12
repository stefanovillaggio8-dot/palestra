import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dipingiNebulosaCosmica} from '../src/effetti-rpg-canvas.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function canvas(){
 const values={dots:[],gradient:0,stroke:0,ellipse:0,mask:0};
 const ctx=new Proxy({
  createRadialGradient(){values.gradient++;return {addColorStop(){}};},
  arc(x,y,r){if(values.dots.length<2000)values.dots.push([x,y,r]);},
  stroke(){values.stroke++;},ellipse(){values.ellipse++;}
 },{get(o,k){return k in o?o[k]:()=>{};},
    set(o,k,v){if(k==='globalCompositeOperation'&&v==='destination-out')values.mask++;o[k]=v;return true;}});
 return {ctx,values};
}
test('v484 Galassia Leggendaria: 4 bracci di stelle realmente animati su tre classi',()=>{
 const fx=read('src/effetti-rpg-canvas.js');
 const segment=fx.slice(fx.indexOf('export function dipingiNebulosaCosmica'),fx.indexOf('export function dipingiApoteosiAstrale'));
 assert.match(segment,/v484: una GALASSIA A SPIRALE viva/);
 assert.match(segment,/const arms=4/);
 assert.doesNotMatch(segment,/ctx\.stroke\(/,'nessuna striscia fluorescente Nebulosa');
 assert.doesNotMatch(segment,/ctx\.ellipse\(/,'nessun portale runico copiato dal Mitico');
 for(const classe of ['assassino','guerriero','berserker']){
  const a=canvas(),b=canvas();
  assert.equal(dipingiNebulosaCosmica(a.ctx,330,470,classe,0,36),true);
  assert.equal(dipingiNebulosaCosmica(b.ctx,330,470,classe,6,36),true);
  assert.ok(a.values.dots.length>170,'galassia e polvere visibili');
  assert.ok(a.values.gradient>80,'molti strati di gas, non solo tre luci');
  assert.equal(a.values.stroke,0);
  assert.equal(a.values.mask,1,'il ritratto resta intatto');
  assert.notDeepEqual(a.values.dots.slice(-160),b.values.dots.slice(-160),'movimento effettivo');
 }
});
test('v484 fallback non rettangolare, tre silhouette e nessuna regressione Astrale v483',()=>{
 const css=read('stile-rpg.css'),sw=read('sw.js'),app=read('src/app.js');
 const news=css.slice(css.lastIndexOf('/* v484'),css.indexOf('/* v485'));
 assert.match(news,/mask-image:radial-gradient/);
 assert.match(news,/inset:-4% -6%!important/);
 assert.match(news,/overflow:visible!important/);
 assert.match(news,/nebula-v484-immersione/);
 assert.doesNotMatch(news,/\.shop-skin-mitica/,'non modificare Astrale');
 for(const classe of ['assassino','guerriero','berserker']){
  const p='img/effetti/nebulosa-spirale-'+classe+'-v484.svg';
  const svg=read(p);
  assert.match(svg,/id="protect"/);
  assert.match(svg,/id="spiral-core"/);
  assert.match(svg,/id="spiral-gas"/);
  assert.ok((svg.match(/<circle /g)||[]).length>700,'bracci galattici con stelle');
  assert.match(sw,new RegExp('nebulosa-spirale-'+classe+'-v484\\.svg'));
  assert.match(news,new RegExp('nebulosa-spirale-'+classe+'-v484\\.svg'));
  assert.match(sw,new RegExp('astrale-celestial-'+classe+'-v483\\.svg'),'Astrale intatto e offline');
 }
 assert.match(sw,/palestra-v487/);
 assert.match(read('index.html'),/palestra-v487/);
 assert.match(app,/const effettoCosmicoAttivo = astraleAttiva \|\| nebulosaAttiva/);
});
