import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
import {percorsoFotoCoronaV360} from '../src/foto-corona-v360.js';
import {percorsoFotoAuraDivinaV366} from '../src/foto-aura-divina-v366.js';
const CLASSI={
  assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']
};
const EFFETTI=[null,'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica'];
test('v371: weapons never appear before day-30 unlocked state',()=>{
 for(const [classe,armature] of Object.entries(CLASSI))
  for(const armatura of armature)
   for(let stato=0;stato<=5;stato++){
     const url=percorsoFotoArmaturaArmataV371({classe,armatura,stato,armaSbloccata:false});
     assert.equal(url,null);
   }
});
test('v371: 36 unique armed Shop armor+effect variants',()=>{
 const paths=new Set();
 for(const [classe,armature] of Object.entries(CLASSI))
  for(const armatura of armature)
   for(const effetto of EFFETTI) {
     const args={classe,armatura,stato:5,effetto,armaSbloccata:true};
     const url=percorsoFotoArmaturaArmataV371(args);
     assert.ok(url?.includes('/armatura-con-arma-v371/'),JSON.stringify(args));
     assert.ok(!paths.has(url),url);paths.add(url);
     assert.equal(percorsoFotoArmaturaArmataV371({...args,stato:3}),null);
     assert.equal(percorsoFotoArmaturaArmataV371({...args,stato:4}),url);
     const file=new URL('../'+url.replace(/^\\.\\//,'').split('?')[0],import.meta.url);
     assert.ok(existsSync(file),'Missing armed Shop portrait: '+url);
     assert.ok(statSync(file).size>10000,url);
     const magic=readFileSync(file);
     assert.equal(magic.toString('ascii',0,4),'RIFF');
     assert.equal(magic.toString('ascii',8,12),'WEBP');
   }
 assert.equal(paths.size,36);
});
test('v371: wrong-class armor and unknown effects are refused',()=>{
 assert.equal(percorsoFotoArmaturaArmataV371({classe:'assassino',armatura:'armatura-guerriero-abisso',stato:5,armaSbloccata:true}),null);
 assert.equal(percorsoFotoArmaturaArmataV371({classe:'berserker',armatura:'armatura-berserker-apocalisse',stato:5,armaSbloccata:true,effetto:'effetto-not-real'}),null);
});
test('v371: the crown can combine with the Divine Aura without deleting a chosen armor or the weapon',()=>{
 for(const [classe,armature] of Object.entries(CLASSI))
  for(const armatura of armature) {
   const photo=percorsoFotoCoronaV360({classe,armatura,stato:5,divina:true,armaSbloccata:true});
   assert.ok(photo?.includes('/'+classe+'/stato-5/'+armatura+'/base-divina.webp'),photo);
  }
});
test('v371: independent Divine aura preserves each of 9 outfits without an extra shop effect',()=>{
 for(const [classe,armature] of Object.entries(CLASSI)) {
   for(const armatura of [null,...armature]) {
     const photo=percorsoFotoAuraDivinaV366({classe,armatura,stato:5,divina:true,armaSbloccata:true});
     assert.ok(photo?.includes('/'+classe+'/'+(armatura||'base')),photo);
     assert.equal(percorsoFotoAuraDivinaV366({classe,armatura,stato:5,divina:true,armaSbloccata:true,effetto:'effetto-ombra'}),null);
   }
 }
});
