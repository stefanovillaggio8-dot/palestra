import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {percorsoCombinazioneFotoRpg,percorsoScenaSpecialeRpg,
  FOTO_EFFETTI_PREMIUM_RPG} from '../src/foto-cinematica-rpg.js';

const armature={
 assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
 guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
 berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']
};
test('216 combinazioni fotografiche uniche: tre classi, 8 stati/armature, 9 effetti',()=>{
 const chiavi=new Set();
 for(const [classe,armors] of Object.entries(armature)){
   for(const base of [0,1,2,3,4,5,...armors]){
     for(const effetto of [null,'effetto-ambra','effetto-fulmine','effetto-ombra','effetto-nebula']){
       for(const astrale of [false,true]){
         if(!effetto&&!astrale)continue;
         const config={
           classe,stato:typeof base==='number'?base:2,
           armatura:typeof base==='string'?base:null,
           effetto,skin:astrale?'skin-mitica':null,
         };
         const url=percorsoCombinazioneFotoRpg(config);
         assert.ok(url && url.startsWith('img/personaggi/combinazioni/'+classe+'/'));
         assert.ok(!chiavi.has(url),'duplicato '+url);
         chiavi.add(url);
       }
     }
   }
 }
 assert.equal(chiavi.size,216);
});
test('Le foto premium più definite restano prioritarie; la skin dello shop usa la corazza giusta',()=>{
 for(const classe of Object.keys(armature)){
   const premium=percorsoScenaSpecialeRpg({classe,stato:2,effetto:'effetto-ambra'});
   assert.equal(premium,FOTO_EFFETTI_PREMIUM_RPG[classe]['effetto-ambra']);
   const armor=armature[classe][1];
   assert.match(percorsoScenaSpecialeRpg({classe,armatura:armor,stato:2,effetto:'effetto-fulmine'}),
     new RegExp(armor+'/fulmine\\.webp'));
   assert.match(percorsoScenaSpecialeRpg({classe,armatura:armor,stato:2,effetto:'effetto-ombra',skin:'skin-mitica'}),
     new RegExp(armor+'/ombra-astrale\\.webp'));
 }
});
test('Un pugnale, una spada o un ascia già sbloccati non vengono mai cancellati',()=>{
 for(const classe of Object.keys(armature)){
   for(const stato of [4,5]){
     const url=percorsoCombinazioneFotoRpg({
       classe,stato,armatura:armature[classe][0],armaSbloccata:true,effetto:'effetto-fulmine'
     });
     assert.match(url,new RegExp('stato-'+stato+'/fulmine\\.webp'));
     assert.doesNotMatch(url,/armatura-/);
   }
   assert.equal(percorsoCombinazioneFotoRpg({
     classe,stato:2,armaSbloccata:true,effetto:'effetto-ambra'
   }),null);
   assert.equal(percorsoCombinazioneFotoRpg({
     classe,stato:4,armatura:'armatura-inesistente',effetto:'effetto-ambra'
   }),null);
 }
});
test('Corona e Aura divina non vengono inventate in una foto senza quella ricompensa',()=>{
 for(const classe of Object.keys(armature)){
   for(const opts of [{corona:true},{divina:true},{corona:true,divina:true}]){
     assert.equal(percorsoCombinazioneFotoRpg({...opts,classe,stato:5,effetto:'effetto-fulmine'}),null);
   }
 }
});
test('Il generatore offline preserva la foto originale e non salva dati privati',async()=>{
 const s=await readFile(new URL('../tools/render_rpg_effect_photos.py',import.meta.url),'utf8');
 const workflow=await readFile(new URL('../.github/workflows/install-rpg-combinations-v351.yml',import.meta.url),'utf8');
 assert.match(s,/assert written==216/);
 assert.match(s,/Image\.open\(path\)/);
 assert.match(s,/\(source,fx,astral,salt\)/);
 assert.doesNotMatch(s,/profili|sedute|ricompense|supabase|indexeddb/i);
 assert.match(workflow,/git rm -f rpg-render-v351\.trigger/);
 assert.match(workflow,/Rebuild GitHub Pages/);
});
