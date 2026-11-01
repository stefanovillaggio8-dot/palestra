import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ARMATURE_DIVINE_V366,percorsoFotoAuraDivinaV366} from '../src/foto-aura-divina-v366.js';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url));
const sum=(buf)=>createHash('sha256').update(buf).digest('hex');
const manifest=JSON.parse(read('docs/aura-divina-v375-manifest.json'));
test('v375: same golden aura geometry on all nine truly different avatars',()=>{
 assert.equal(manifest.length,9);
 assert.equal(new Set(manifest.map(x=>x.classe+'/'+x.armatura)).size,9);
 assert.equal(new Set(manifest.map(x=>x.original_sha256)).size,9);
 assert.equal(new Set(manifest.map(x=>x.final_sha256)).size,9);
 assert.deepEqual([...new Set(manifest.map(x=>x.aura_template))],['v375-uniform-gold-750375']);
 for(const [classe,armature] of Object.entries(ARMATURE_DIVINE_V366)){
  for(const armatura of armature){
   const row=manifest.find(x=>x.classe===classe&&x.armatura===armatura);
   assert.ok(row,classe+' '+armatura);
   const original=read('img/personaggi/aura-divina-v374/'+classe+'/'+armatura+'.webp');
   const final=read('img/personaggi/aura-divina-v375/'+classe+'/'+armatura+'.webp');
   assert.equal(sum(original),row.original_sha256);
   assert.equal(sum(final),row.final_sha256);
   assert.deepEqual(row.canvas,[720,1080]);
   assert.equal(row.head_y,78);assert.equal(row.feet_y,997);
   assert.equal(final.toString('ascii',0,4),'RIFF');
   assert.ok(final.length>40000);
   const url=percorsoFotoAuraDivinaV366({classe,stato:5,divina:true,armatura:armatura==='base'?null:armatura,armaSbloccata:true});
   assert.equal(url,'./img/personaggi/aura-divina-v379/'+classe+'/'+armatura+'.webp?v=380');
  }
 }
 assert.ok(existsSync(new URL('../docs/aura-divina-v375-preview.jpg',import.meta.url)));
});
test('v375: uniform ring geometry and protected character regions',()=>{
 const script=read('tools/render_divine_v375.py').toString('utf8');
 assert.match(script,/GOLD = \(255, 204, 104\)/);
 assert.match(script,/def uniform_aura\(/);
 assert.match(script,/def protection_mask\(/);
 assert.match(script,/ImageChops.multiply\(/);
 assert.doesNotMatch(script,/add_earned_weapon\(/);
 const index=read('index.html').toString('utf8');
 const sw=read('sw.js').toString('utf8');
 assert.match(index,/palestra-v384/);
 assert.match(sw,/palestra-v384/);
 assert.match(sw,/aura-divina-v379/);
});
