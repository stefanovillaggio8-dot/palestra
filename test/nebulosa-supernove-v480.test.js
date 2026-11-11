import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dipingiNebulosaCosmica, bordoSagomaRpg} from '../src/effetti-rpg-canvas.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v480: tre supernove leggendario, stelle in orbita e nessun effetto neon',()=>{
 for(const classe of ['assassino','guerriero','berserker']){
   const counts={grad:0,stroke:0,ellipse:0,arc:0,bezier:0,mask:0};
   const ctx=new Proxy({
     createRadialGradient(){counts.grad++;return {addColorStop(){}};},
     stroke(){counts.stroke++;},ellipse(){counts.ellipse++;},
     arc(){counts.arc++;},quadraticCurveTo(){counts.bezier++;}
   },{get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){
     if(k==='globalCompositeOperation'&&v==='destination-out')counts.mask++;
     o[k]=v;return true;
   }});
   assert.equal(dipingiNebulosaCosmica(ctx,300,435,classe,2.5,36),true);
   assert.ok(counts.grad>=65,'nebulosa volumetrica con 3 nuclei luminosi');
   assert.ok(counts.arc>=85,'polvere stellare e tre vortici di stelle');
   assert.equal(counts.bezier,12,'4 curvature piene per ogni nucleo di supernova');
   assert.equal(counts.stroke,0,'vietate le strisce luminose');
   assert.equal(counts.ellipse,0,'vietati i portali che appartengono al Mitico');
   assert.equal(counts.mask,1,'la silhouette della skin rimane intatta');
   for(const y of [.1,.3,.5,.8]){
     const [sx,dx]=bordoSagomaRpg(classe,y);
     assert.ok(sx<dx && sx>=0 && dx<=1);
   }
 }
});

test('v480: fallback offline realmente distinto per tutti i personaggi e armature',()=>{
 const sw=read('sw.js'),css=read('stile-rpg.css'),app=read('src/app.js');
 const atelier=read('src/rpg-atelier.js');
 for(const classe of ['assassino','guerriero','berserker']){
   const path='img/effetti/nebulosa-nuclei-'+classe+'-v480.svg';
   const svg=read(path);
   assert.match(sw,new RegExp('nebulosa-nuclei-'+classe+'-v480\\.svg'));
   assert.match(css,new RegExp('nebulosa-nuclei-'+classe+'-v480\\.svg'));
   assert.match(svg,/id="protect"/);
   assert.match(svg,/id="n480cyan"/);
   assert.match(svg,/id="n480pink"/);
   assert.match(svg,/id="n480soft"/);
   assert.ok((svg.match(/<radialGradient/g)||[]).length>=8);
   assert.ok((svg.match(/<circle /g)||[]).length>=240);
 }
 const i=css.lastIndexOf('/* v480 · SUPERNOVA LEGGENDARIA');
 assert.ok(i>0,'regole finali v480');
 const rules=css.slice(i);
 assert.match(rules,/opacity:\.53!important/);
 assert.match(app,/effettoCosmicoAttivo = astraleAttiva \|\| nebulosaAttiva/);
 assert.match(atelier,/dipingiNebulosaCosmica\(ctx,dw,dh,c.classe/);
 assert.match(sw,/palestra-v480/);
 assert.match(read('index.html'),/palestra-v480/);
});
