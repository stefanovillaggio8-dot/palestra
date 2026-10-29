import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FOTO_RPG_SPECIALI,percorsoScenaSpecialeRpg,
  indiceScenaCinematograficaRpg,ARMATURE_EPICHE_SCENE}
  from '../src/foto-cinematica-rpg.js';
const foto=(c={})=>percorsoScenaSpecialeRpg({classe:'assassino',stato:2,...c});
test('Quattro nuove fotografie integrali approvate: fumo, nebulosa, aura, corona',()=>{
 assert.equal(Object.keys(FOTO_RPG_SPECIALI).length,4);
 assert.match(foto({effetto:'effetto-ombra'}),/assassino-fumo\.webp/);
 assert.match(foto({effetto:'effetto-nebula'}),/assassino-nebulosa\.webp/);
 assert.match(foto({divina:true}),/assassino-divina\.webp/);
 assert.match(foto({corona:true}),/assassino-corona\.webp/);
 assert.match(foto({divina:true,corona:true}),/assassino-corona\.webp/);
});
test('Nessuna fotografia anticipa il pugnale o un oggetto e nessun effetto inventato',()=>{
 for(const stato of [4,5]){
   assert.match(foto({stato,effetto:'effetto-ombra'}),new RegExp('stato-'+stato+'/ombra\\.webp'));
   assert.equal(foto({stato,corona:true}),null);
 }
 for(const c of [{armaSbloccata:true,corona:true},
   {effetto:'effetto-ambra',divina:true},
   {effetto:'effetto-ombra',corona:true},{effetto:'effetto-nebula',divina:true}]){
   assert.equal(foto(c),null,JSON.stringify(c));
 }
 for(const classe of ['guerriero','berserker']){
   assert.match(percorsoScenaSpecialeRpg({classe,effetto:'effetto-nebula'}),/stato-0\/nebula\.webp/);
   assert.equal(indiceScenaCinematograficaRpg({classe,stato:2,
     armatura:ARMATURE_EPICHE_SCENE[classe],corona:true,effetto:'effetto-ombra'}),7);
 }
});
test('Cinema v346 sostituisce vecchi strati, export Atelier usa la stessa immagine',async()=>{
 const [s,css,atelier,app]=await Promise.all([
 'src/foto-cinematica-rpg.js','stile-rpg.css','src/rpg-atelier.js','src/app.js'
 ].map(f=>readFile(new URL('../'+f,import.meta.url),'utf8')));
 assert.match(s,/rpg-scena-foto-speciale/);
 assert.match(s,/caricaScenaSpeciale/);
 assert.match(css,/rpg-scena-cinematografica\.rpg-scena-foto-speciale/);
 assert.match(css,/aspect-ratio:auto/);
 assert.match(atelier,/fotoCinematograficaRpg\(c\)/);
 assert.match(app,/montaScenaCinematograficaRpg\(grafica,fotoRpg/);
});
test('I link temporanei sono usati solo dal workflow di importazione',async()=>{
 const flow=await readFile(new URL('../.github/workflows/install-rpg-v346.yml',import.meta.url),'utf8');
 assert.match(flow,/git rm -r rpg-sources-v346/);
 assert.match(flow,/public/i.test(flow)?/public/:/RPG-Publisher|RPG-Publisher|Palestra-RPG-Publisher/);
 assert.match(flow,/original/i);
 assert.match(flow,/node --test test\/\*\.test\.js/);
});

test('Le nuove foto premium sono dedicate a tutte le classi e non anticipano le armi',async()=>{
 const {FOTO_EFFETTI_PREMIUM_RPG}=await import('../src/foto-cinematica-rpg.js');
 for(const classe of ['assassino','guerriero','berserker']){
   const base={classe,stato:2};
   for(const id of ['effetto-ambra','effetto-fulmine']){
     assert.match(percorsoScenaSpecialeRpg({...base,effetto:id}),new RegExp(classe+'-'+(id==='effetto-ambra'?'ambra':'fulmine')+'\\.webp'));
     assert.equal(percorsoScenaSpecialeRpg({...base,effetto:id,armaSbloccata:true}),null);
     const armored=percorsoScenaSpecialeRpg({...base,effetto:id,armatura:'armatura-guerriero-braci'});
     if(classe==='guerriero')
       assert.match(armored,/armatura-guerriero-braci\/(ambra|fulmine)\.webp/);
     else assert.equal(armored,null);
     assert.equal(percorsoScenaSpecialeRpg({...base,effetto:id,corona:true}),null);
     assert.equal(percorsoScenaSpecialeRpg({...base,effetto:id,divina:true}),null);
   }
   assert.match(percorsoScenaSpecialeRpg({...base,skin:'skin-mitica'}),new RegExp(classe+'-astrale\\.webp'));
   assert.match(percorsoScenaSpecialeRpg({...base,skin:'skin-mitica',effetto:'effetto-fulmine'}),/stato-2\/fulmine-astrale\.webp/);
   assert.match(percorsoScenaSpecialeRpg({...base,skin:'skin-mitica',stato:4}),/stato-4\/astrale\.webp/);
   assert.equal(Object.keys(FOTO_EFFETTI_PREMIUM_RPG[classe]).length,3);
 }
});
