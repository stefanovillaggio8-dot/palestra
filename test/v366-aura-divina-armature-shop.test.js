import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {PREMI,statoVisivo} from '../src/avatar-rpg.js';
import {ARMATURE_DIVINE_V366,percorsoFotoAuraDivinaV366} from '../src/foto-aura-divina-v366.js';
import {ARMATURE_ATELIER} from '../src/rpg-atelier.js';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v366: 75 giorni significa armatura completa e armi già sbloccate',()=>{
 assert.equal(PREMI.find(x=>x.id==='elmo').giorni,30);
 assert.equal(PREMI.find(x=>x.id==='leggendaria').giorni,50);
 assert.equal(PREMI.find(x=>x.id==='divina').giorni,75);
 const viso=statoVisivo(PREMI.map(p=>({...p,sbloccato:true})));
 assert.equal(viso.indice,5);
 assert.equal(viso.aura,true);
});
test('v366: exactly 9 valid photographs, three full outfits per class, two purchasable Shop armors',()=>{
 const urls=new Set();
 for(const [classe,armors] of Object.entries(ARMATURE_DIVINE_V366)){
   assert.equal(armors.length,3);
   assert.equal(armors[0],'base');
   assert.deepEqual(armors.slice(1),ARMATURE_ATELIER[classe].slice(1));
   for(const armatura of armors){
     const path=percorsoFotoAuraDivinaV366({classe,stato:5,divina:true,
       armatura:armatura==='base'?null:armatura,armaSbloccata:true});
     assert.ok(path?.includes('/aura-divina-v367/'),String(path));
     assert.ok(!urls.has(path),path);urls.add(path);
     const full=new URL('../'+path.replace(/^\.\//,'').split('?')[0],import.meta.url);
     assert.ok(existsSync(full),path);
     assert.ok(statSync(full).size>35000,path);
   }
 }
 assert.equal(urls.size,9);
 assert.ok(existsSync(new URL('../docs/aura-divina-v366-shop-completo.jpg',import.meta.url)));
});
test('v366: no naked/reduced stage, unearned weapon, wrong-class armor, second effect or other crown',()=>{
 const b={classe:'assassino',stato:5,divina:true,armaSbloccata:true};
 for(const stato of [0,1,2,3,4])assert.equal(percorsoFotoAuraDivinaV366({...b,stato}),null);
 assert.equal(percorsoFotoAuraDivinaV366({...b,armaSbloccata:false}),null);
 assert.equal(percorsoFotoAuraDivinaV366({...b,corona:true}),null);
 assert.equal(percorsoFotoAuraDivinaV366({...b,effetto:'effetto-fulmine'}),null);
 assert.equal(percorsoFotoAuraDivinaV366({...b,armatura:'armatura-guerriero-braci'}),null);
 assert.equal(percorsoFotoAuraDivinaV366({...b,armatura:'skin-mitica'}),null);
 assert.equal(percorsoFotoAuraDivinaV366({...b,anteprima:true,armaSbloccata:false,armatura:'armatura-assassino-notte'})?.includes('armatura-assassino-notte'),true);
});
test('v366: real profile renders owned Shop armor, correct 75-day preview and one aura',()=>{
 const app=source('src/app.js'),exporter=source('src/anteprima-combinata-rpg.js');
 assert.match(app,/import \{ percorsoFotoAuraDivinaV366 \}/);
 assert.match(app,/const fotoAuraDivinaRpg=percorsoFotoAuraDivinaV366\(/);
 assert.match(app,/armatura:armaturaEquipaggiata\?\.id \|\| null/);
 assert.match(app,/stato:auraDivinaAnteprima \? 5 : statoFotoConsentito/);
 assert.match(app,/__anteprimaDivina:true,__anteprimaStato:5/);
 assert.match(app,/divina: auraDivinaAttiva && !fotoAuraDivinaRpg/);
 assert.match(exporter,/aura-divina-v\(\?:365\|366\)/);
 assert.doesNotMatch(app,/db\.salva\([^)]*fotoAuraDivinaRpg/);
});
test('v366: Shop gallery, offline images and iPhone PWA version agree',()=>{
 const sw=source('sw.js'),html=source('index.html');
 assert.match(sw,/palestra-v\d+/);assert.match(html,/palestra-v\d+/);
 assert.match(sw,/foto-aura-divina-v366\.js/);
 assert.match(sw,/aura-divina-v366/);
 assert.match(sw,/aura-divina-v366-anteprima\.html/);
 const gallery=source('aura-divina-v366-anteprima.html');
 assert.equal((gallery.match(/<figure>/g)||[]).length,9);
 assert.match(source('galleria-aura.html'),/aura-divina-v366-anteprima/);
});
