import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {percorsoFotoAuraDivinaV366,ARMATURE_DIVINE_V366} from '../src/foto-aura-divina-v366.js';

const load=(p)=>readFileSync(new URL('../'+p,import.meta.url));
const sum=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(load('docs/aura-divina-v374-manifest.json').toString('utf8'));
test('v374 keeps all nine unique photographed characters and class armors intact',()=>{
 assert.equal(manifest.length,9);
 assert.equal(new Set(manifest.map(x=>x.classe+'/'+x.armatura)).size,9);
 assert.equal(new Set(manifest.map(x=>x.final_sha256)).size,9);
 for(const [classe,armors] of Object.entries(ARMATURE_DIVINE_V366)){
  for(const armatura of armors){
   const m=manifest.find(x=>x.classe===classe&&x.armatura===armatura);
   assert.ok(m,classe+' '+armatura);
   assert.deepEqual(m.canvas,[720,1080]);
   assert.equal(m.head_y,78);
   assert.equal(m.feet_y,997);
   const base=load('img/personaggi/aura-divina-v373/'+classe+'/'+armatura+'.webp');
   const output=load('img/personaggi/aura-divina-v374/'+classe+'/'+armatura+'.webp');
   assert.equal(sum(base),m.original_sha256);
   assert.equal(sum(output),m.final_sha256);
   assert.equal(output.toString('ascii',0,4),'RIFF');
   assert.equal(output.toString('ascii',8,12),'WEBP');
   assert.ok(output.length>40000);
   const url=percorsoFotoAuraDivinaV366({
    classe,armatura:armatura==='base'?null:armatura,stato:5,divina:true,armaSbloccata:true
   });
   assert.ok(url.includes('/aura-divina-v375/'+classe+'/'+armatura+'.webp?v=375'),url);
  }
 }
});
test('v374 preserves existing weapons and corrects visual faults only',()=>{
 const script=load('tools/render_divine_v374.py').toString('utf8');
 assert.match(script,/warm_rabbia_aura/);
 assert.match(script,/align_abisso_sword_grip/);
 assert.match(script,/shared_berserker_sparks/);
 assert.doesNotMatch(script,/add_earned_weapon\(/);
 assert.ok(existsSync(new URL('../docs/aura-divina-v374-preview.jpg',import.meta.url)));
});
test('v374 versions and website assets agree',()=>{
 const html=load('index.html').toString('utf8');
 const sw=load('sw.js').toString('utf8');
 const preview=load('aura-divina-v366-anteprima.html').toString('utf8');
 assert.match(html,/palestra-v375/);
 assert.match(sw,/palestra-v375/);
 assert.match(sw,/aura-divina-v375/);
 assert.match(preview,/aura-divina-v375/);
});
