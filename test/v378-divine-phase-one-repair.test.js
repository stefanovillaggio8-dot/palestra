import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ARMATURE_DIVINE_V366,percorsoFotoAuraDivinaV366} from '../src/foto-aura-divina-v366.js';
const file=p=>new URL('../'+p,import.meta.url);
const bytes=p=>readFileSync(file(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(bytes('docs/aura-divina-v378-manifest.json').toString());
test('v378: all 3 broken free Phase-1 Divine portraits corrected, 6 Shop assets untouched',()=>{
 assert.equal(manifest.length,9);
 assert.equal(new Set(manifest.map(x=>x.classe+'/'+x.armatura)).size,9);
 assert.equal(new Set(manifest.map(x=>x.final_sha256)).size,9);
 assert.equal(manifest.filter(x=>x.mode==='repaired-free-original').length,3);
 assert.equal(manifest.filter(x=>x.mode==='approved-shop-unchanged').length,6);
 for(const [cls,armors] of Object.entries(ARMATURE_DIVINE_V366)){
  for(const armor of armors){
   const m=manifest.find(x=>x.classe===cls&&x.armatura===armor);
   assert.ok(m,cls+' '+armor);
   assert.deepEqual(m.canvas,[720,1080]);
   assert.equal(m.head_y,78);
   assert.equal(m.feet_y,997);
   const output='img/personaggi/aura-divina-v378/'+cls+'/'+armor+'.webp';
   const original=bytes(m.source);
   const final=bytes(output);
   assert.equal(hash(original),m.source_sha256);
   assert.equal(hash(final),m.final_sha256);
   assert.ok(statSync(file(output)).size>42000);
   assert.equal(final.toString('ascii',0,4),'RIFF');
   assert.equal(final.toString('ascii',8,12),'WEBP');
   if(armor==='base'){
    assert.equal(m.mode,'repaired-free-original');
    assert.equal(m.source,'img/personaggi/stati/'+cls+'-5.webp');
    assert.equal(m.aura_template,'v378-photographic-gold');
    assert.notEqual(hash(final),hash(bytes('img/personaggi/aura-divina-v375/'+cls+'/base.webp')));
   } else{
    assert.equal(m.mode,'approved-shop-unchanged');
    assert.equal(m.source,'img/personaggi/aura-divina-v375/'+cls+'/'+armor+'.webp');
    assert.deepEqual(final,original);
   }
   const path=percorsoFotoAuraDivinaV366({classe:cls,armatura:armor==='base'?null:armor,stato:5,divina:true,armaSbloccata:true});
   assert.equal(path,'./img/personaggi/aura-divina-v379/'+cls+'/'+armor+'.webp?v=380');
  }
 }
 assert.ok(existsSync(file('docs/aura-divina-v378-preview.jpg')));
});
test('v378: app version, PWA cache and gallery use only corrected three images',()=>{
 const html=bytes('index.html').toString();
 const sw=bytes('sw.js').toString();
 const page=bytes('aura-divina-v366-anteprima.html').toString();
 const renderer=bytes('tools/render_divine_v378.py').toString();
 assert.match(html,/palestra-v383/);
 assert.match(sw,/palestra-v383/);
 assert.match(sw,/aura-divina-v379/);
 assert.match(page,/aura-divina-v379/);
 assert.equal((page.match(/<figure>/g)||[]).length,9);
 assert.match(renderer,/extract_approved_photographic_fx/);
 assert.match(renderer,/aura-divina-v366\/assassino\/armatura-assassino-notte.webp/);
 assert.ok(!renderer.includes('add_earned_weapon('));
 assert.ok(!renderer.includes('d.ellipse((65,60,655,974)'));
});
