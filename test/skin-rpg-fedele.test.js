import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {configurazioneSkinRpg,coperturaArmaturaRpg,SKIN_RPG,applicaSkinRpg} from '../src/skin-rpg-fedele.js';

test('Le sei armature e la skin Astrale hanno classi definite',()=>{
 assert.equal(Object.keys(SKIN_RPG).length,7);
 for(const [id,classe] of [
  ['armatura-guerriero-braci','guerriero'],['armatura-guerriero-abisso','guerriero'],
  ['armatura-assassino-notte','assassino'],['armatura-assassino-spettro','assassino'],
  ['armatura-berserker-rabbia','berserker'],['armatura-berserker-apocalisse','berserker'],
 ]) {
   assert.equal(configurazioneSkinRpg(classe,id)?.id,id);
   for(const altra of ['guerriero','assassino','berserker'].filter(x=>x!==classe)) {
     assert.equal(configurazioneSkinRpg(altra,id),null);
   }
 }
 for(const classe of ['guerriero','assassino','berserker'])
   assert.equal(configurazioneSkinRpg(classe,null,'skin-mitica')?.id,'skin-mitica');
});

test('La testa e il volto originali non vengono modificati',()=>{
 for(const classe of ['guerriero','assassino','berserker']) {
   assert.equal(coperturaArmaturaRpg(classe,.5,.16),0);
   assert.equal(coperturaArmaturaRpg(classe,.48,.22),0);
   assert.equal(coperturaArmaturaRpg(classe,.5,.96),0);
   assert.ok(coperturaArmaturaRpg(classe,.5,.44)>.75);
 }
});

test('Le armature originali rimangono le immagini di progressione Streak',async()=>{
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/applicaSkinRpg\(grafica, fotoRpg, classeId/);
 assert.match(app,/percorsoStato\(classeId, statoFotoConsentito\)/);
 assert.doesNotMatch(app,/const overlayCosmetici = svgCosmeticiRpg\(/);
 assert.match(app,/corona-v361-original/); // anteprima finale illustrativa, separata dalle foto Streak
 assert.match(app,/classeAnteprima = oggetto\.classe/);
 assert.match(app,/id === 'skin-mitica'/);
});

test('Le maschere non cambiano la progressione e non introducono armi',()=>{
 const s=String(applicaSkinRpg);
 assert.doesNotMatch(s,/spada|pugnale|ascia/i);
 assert.match(s,/foto\.naturalWidth/);
 assert.match(s,/bctx\.drawImage\(foto/);
});

test('Fallback sicuro quando il browser non ha canvas o non ci sono skin',()=>{
 assert.equal(configurazioneSkinRpg('guerriero','armatura-assassino-notte'),null);
 assert.equal(applicaSkinRpg(null,null,'guerriero','armatura-guerriero-braci'),null);
 assert.equal(applicaSkinRpg({}, {},'guerriero','invalida'),null);
});

test('Il rivestimento e\' ancorato alla foto e prepara un overlay trasparente',t=>{
 const restore={document:globalThis.document};
 t.after(()=>{ if(restore.document===undefined)delete globalThis.document;else globalThis.document=restore.document; });
 let pixels=0,draws=0;
 const ctx={
   drawImage(){draws++},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4).fill(130)}},
   createImageData(w,h){pixels=w*h;return {data:new Uint8ClampedArray(w*h*4)}},
   putImageData(){},
   save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},arc(){},
 };
 let creations=0;
 globalThis.document={createElement(tag){
   assert.equal(tag,'canvas');
   creations++;
   return {width:0,height:0,className:'',
     setAttribute(){},getContext(){return ctx},remove(){}};
 }};
 const children=[];
 const host={appendChild(c){children.push(c)},classList:{add(){}},style:{setProperty(){}}};
 const foto={complete:true,naturalWidth:900,naturalHeight:1350,addEventListener(){}};
 const canvas=applicaSkinRpg(host,foto,'guerriero','armatura-guerriero-braci');
 assert.equal(canvas,children[0]);
 assert.equal(canvas.width,480);
 assert.equal(canvas.height,720);
 assert.equal(creations,2);
 assert.equal(draws,1);
 assert.equal(pixels,480*720);
});
