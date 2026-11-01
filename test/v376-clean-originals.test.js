import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ARMATURE_DIVINE_V366,percorsoFotoAuraDivinaV366} from '../src/foto-aura-divina-v366.js';

const file=p=>new URL('../'+p,import.meta.url);
const bytes=p=>readFileSync(file(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(bytes('docs/aura-divina-v376-manifest.json').toString());
test('v376: all nine published portraits have exactly one same aura template and real original mapping',()=>{
 assert.equal(manifest.length,9);
 assert.equal(new Set(manifest.map(m=>m.classe+'/'+m.armatura)).size,9);
 assert.equal(new Set(manifest.map(m=>m.final_sha256)).size,9);
 assert.equal(new Set(manifest.map(m=>m.source_sha256)).size,9);
 assert.deepEqual([...new Set(manifest.map(m=>m.aura_template))],['v376-single-gold-376']);
 for(const [cls,armors] of Object.entries(ARMATURE_DIVINE_V366))
  for(const armor of armors){
   const m=manifest.find(m=>m.classe===cls&&m.armatura===armor);
   assert.ok(m,cls+'/'+armor);
   assert.ok(m.source.includes('/stati/')||m.source.includes('/armatura-con-arma-v371/')||m.source.includes('/armature/'),m.source);
   assert.ok(!m.source.includes('/aura-divina-v3'),m.source);
   assert.deepEqual(m.canvas,[720,1080]);
   assert.equal(m.head_y,78);assert.equal(m.feet_y,997);
   assert.ok(m.mask_coverage>.12&&m.mask_coverage<.70);
   assert.equal(hash(bytes(m.source)),m.source_sha256);
   const output='img/personaggi/aura-divina-v376/'+cls+'/'+armor+'.webp';
   assert.equal(hash(bytes(output)),m.final_sha256);
   assert.equal(bytes(output).toString('ascii',0,4),'RIFF');
   assert.ok(statSync(file(output)).size>40000);
   const live=percorsoFotoAuraDivinaV366({classe:cls,armatura:armor==='base'?null:armor,stato:5,divina:true,armaSbloccata:true});
   assert.equal(live,'./img/personaggi/aura-divina-v379/'+cls+'/'+armor+'.webp?v=380');
  }
 assert.ok(existsSync(file('docs/aura-divina-v376-preview.jpg')));
});
test('v376: original weapon corrections and no pre-baked imported photo glows',()=>{
 const python=bytes('tools/render_divine_v376.py').toString();
 assert.match(python,/def restore_correct_weapon\(/);
 assert.match(python,/isnet-general-use/);
 assert.match(python,/aura_background\(/);
 assert.match(python,/img\/personaggi\/armature\/guerriero-abisso/);
 assert.match(python,/img\/personaggi\/armature\/berserker-apocalisse/);
 const sw=bytes('sw.js').toString();
 const html=bytes('index.html').toString();
 assert.match(sw,/palestra-v380/);
 assert.match(html,/palestra-v380/);
 assert.match(sw,/aura-divina-v379/);
 assert.match(bytes('aura-divina-v366-anteprima.html').toString(),/aura-divina-v379/);
});
