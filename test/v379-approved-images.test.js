import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ARMATURE_DIVINE_V366,percorsoFotoAuraDivinaV366} from '../src/foto-aura-divina-v366.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const rows=JSON.parse(read('docs/aura-divina-v379-manifest.json').toString());
const sha=p=>createHash('sha256').update(read(p)).digest('hex');
test('v379: all nine image files match the approved final binary manifest',()=>{
 assert.equal(rows.length,9);
 assert.equal(new Set(rows.map(m=>m.file)).size,9);
 assert.equal(new Set(rows.map(m=>m.sha256)).size,9);
 for(const [classe,armors] of Object.entries(ARMATURE_DIVINE_V366)){
  for(const armatura of armors){
   const path='img/personaggi/aura-divina-v379/'+classe+'/'+armatura+'.webp';
   const m=rows.find(x=>x.file===path);
   assert.ok(m,path);
   assert.deepEqual(m.dimensions,[720,1080]);
   const bin=read(path);
   assert.ok(bin.length>40000);
   assert.equal(bin.toString('ascii',0,4),'RIFF');
   assert.equal(bin.toString('ascii',8,12),'WEBP');
   assert.equal(sha(path),m.sha256);
   assert.equal(percorsoFotoAuraDivinaV366({classe,stato:5,divina:true,armatura:armatura==='base'?null:armatura,armaSbloccata:true}),'./'+path+'?v=379');
  }
 }
});
test('v379: correct nine gallery positions, PWA cache, Berserker one-head source',()=>{
 const berserker=rows.filter(x=>x.classe==='berserker');
 assert.equal(berserker.length,3);
 assert.ok(berserker.every(m=>/no double head overlay/.test(m.correction)));
 const gallery=read('aura-divina-v366-anteprima.html').toString();
 assert.equal((gallery.match(/<figure>/g)||[]).length,9);
 assert.equal((gallery.match(/aura-divina-v379/g)||[]).length,18);
 assert.match(read('index.html').toString(),/palestra-v379/);
 assert.match(read('sw.js').toString(),/palestra-v379/);
 assert.match(read('sw.js').toString(),/aura-divina-v379/);
});
