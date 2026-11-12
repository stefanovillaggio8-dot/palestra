import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dipingiNebulosaCosmica} from '../src/effetti-rpg-canvas.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v481 corregge il rettangolo ritagliato della Nebulosa senza toccare Astrale',()=>{
 const app=read('src/app.js');
 const css=read('stile-rpg.css');
 const patch=css.slice(css.lastIndexOf('/* v481 — Nebulosa LEGGENDARIA'),css.indexOf('/* v482 · NEBULOSA COSMICA'));
 assert.match(app,/if \(nebulosaAttiva\) scena\.classList\.add\('rpg-scena-nebulosa'\)/);
 assert.match(patch,/\.personaggio-scena\.rpg-scena-nebulosa::before/);
 assert.match(patch,/\.personaggio-scena\.rpg-scena-nebulosa::after/);
 assert.match(patch,/overflow:visible!important/);
 assert.match(patch,/nebulosa-tempesta-assassino-v481\.svg/);
 assert.match(patch,/nebulosa-tempesta-guerriero-v481\.svg/);
 assert.match(patch,/nebulosa-tempesta-berserker-v481\.svg/);
 assert.match(patch,/\.shop-effetto-nebula/);
 assert.doesNotMatch(patch,/shop-skin-mitica/);
 assert.doesNotMatch(patch,/astrale-rift-v477/);
 assert.match(css,/astrale-rift-v477\.svg/); // v477 intentionally unchanged
 assert.match(read('sw.js'),/palestra-v485/);
 assert.match(read('index.html'),/palestra-v485/);
 assert.doesNotMatch(read('sw.js'),/^\s*'\.\/img\/effetti\/nebulosa-nuclei-.*-v480\.svg'/m);
});

test('v481 nuvole continue, nessuna linea neon o rombo nella Nebulosa dinamica',()=>{
 const f=read('src/effetti-rpg-canvas.js');
 const body=f.slice(f.indexOf('export function dipingiNebulosaCosmica'), f.indexOf('export function dipingiApoteosiAstrale'));
 assert.match(body,/v481: gas in ricircolo/);
 assert.doesNotMatch(body,/quadraticCurveTo/);
 assert.doesNotMatch(body,/ctx\.stroke\(/);
 for(const classe of ['assassino','guerriero','berserker']){
  const ct={gas:0,draw:0,stroke:0,mask:0};
  const ctx=new Proxy({
   createRadialGradient(){ct.gas++;return {addColorStop(){}};},
   arc(){ct.draw++;},stroke(){ct.stroke++;}
  },{get(o,k){return k in o?o[k]:()=>{};},
    set(o,k,v){if(k==='globalCompositeOperation' && v==='destination-out')ct.mask++;o[k]=v;return true;}});
  assert.equal(dipingiNebulosaCosmica(ctx,300,435,classe,4,36),true);
  assert.ok(ct.gas>=80);
  assert.equal(ct.stroke,0);
  assert.equal(ct.mask,1);
 }
});
