import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dipingiNebulosaCosmica, bordoSagomaRpg} from '../src/effetti-rpg-canvas.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v481: tre supernove leggendario, stelle in orbita e nessun effetto neon',()=>{
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
   assert.equal(counts.bezier,0,'nuclei diffusi senza rombi adesivi');
   assert.equal(counts.stroke,0,'vietate le strisce luminose');
   assert.equal(counts.ellipse,0,'vietati i portali che appartengono al Mitico');
   assert.equal(counts.mask,1,'la silhouette della skin rimane intatta');
   for(const y of [.1,.3,.5,.8]){
     const [sx,dx]=bordoSagomaRpg(classe,y);
     assert.ok(sx<dx && sx>=0 && dx<=1);
   }
 }
});

test('v481: fallback offline realmente distinto per tutti i personaggi e armature',()=>{
 const sw=read('sw.js'),css=read('stile-rpg.css'),app=read('src/app.js');
 const atelier=read('src/rpg-atelier.js');
 for(const classe of ['assassino','guerriero','berserker']){
   const path='img/effetti/nebulosa-tempesta-'+classe+'-v481.svg';
   const svg=read(path);
   assert.match(sw,new RegExp('nebulosa-tempesta-'+classe+'-v481\\.svg'));
   assert.match(css,new RegExp('nebulosa-tempesta-'+classe+'-v481\\.svg'));
   assert.match(svg,/id="protect"/);
   assert.match(svg,/id="cyan"/);
   assert.match(svg,/id="magenta"/);
   assert.match(svg,/id="softGas"/);
   assert.ok((svg.match(/<radialGradient/g)||[]).length>=5);
   assert.ok((svg.match(/<circle /g)||[]).length>=240);
 }
 const i=css.lastIndexOf('/* v481 — Nebulosa LEGGENDARIA');
 assert.ok(i>0,'regole finali v480');
 const rules=css.slice(i);
 assert.match(rules,/opacity:\.61!important/);
 assert.match(app,/effettoCosmicoAttivo = astraleAttiva \|\| nebulosaAttiva/);
 assert.match(atelier,/dipingiNebulosaCosmica\(ctx,dw,dh,c.classe/);
 assert.match(sw,/palestra-v489/);
 assert.match(read('index.html'),/palestra-v489/);
});
