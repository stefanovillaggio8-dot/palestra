import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  SCENE_ATLANTI_RPG,ARMATURE_EPICHE_SCENE,
  indiceScenaCinematograficaRpg,percorsoAtlanteScenaRpg,
  fotoCinematograficaRpg,montaScenaCinematograficaRpg,armaSbloccataRpg
} from '../src/foto-cinematica-rpg.js';

test('Le tre griglie originali prevedono nove foto ciascuna, senza inventarne altre',()=>{
  assert.equal(Object.keys(SCENE_ATLANTI_RPG).length,3);
  for(const classe of ['assassino','guerriero','berserker']){
    assert.match(percorsoAtlanteScenaRpg(classe),new RegExp(classe+'-nove-scene\\.webp\\?v='));
    const armatura=ARMATURE_EPICHE_SCENE[classe];
    for(const [index,combo] of [
      [0,{}],[1,{corona:true}],
      [2,{effetto:'effetto-ombra'}],[3,{effetto:'effetto-ombra',corona:true}],
      [4,{armatura}],[5,{armatura,corona:true}],
      [6,{armatura,effetto:'effetto-ombra'}],
      [7,{armatura,effetto:'effetto-ombra',corona:true}],
      [8,{armatura,effetto:'effetto-ombra',corona:true,divina:true}]
    ]) assert.equal(indiceScenaCinematograficaRpg({classe,...combo}),index);
  }
});
test('Fumo, corona, diva e skin non sono applicati come fotografie sbagliate',()=>{
  for(const classe of ['assassino','guerriero','berserker']){
    assert.equal(indiceScenaCinematograficaRpg({classe,effetto:'effetto-fulmine'}),null);
    assert.equal(indiceScenaCinematograficaRpg({classe,effetto:'effetto-ambra'}),null);
    assert.equal(indiceScenaCinematograficaRpg({classe,effetto:'effetto-nebula'}),null);
    assert.equal(indiceScenaCinematograficaRpg({classe,skin:'skin-mitica'}),null);
    assert.equal(indiceScenaCinematograficaRpg({classe,divina:true}),null);
    assert.equal(indiceScenaCinematograficaRpg({classe,armatura:'armatura-sbagliata'}),null);
  }
  assert.equal(indiceScenaCinematograficaRpg({classe:'maghetto'}),null);
  assert.equal(percorsoAtlanteScenaRpg('maghetto'),null);
});
test('Senza foto caricate l app mantiene l anteprima v341 e non si blocca',async()=>{
  assert.equal(await fotoCinematograficaRpg({classe:'assassino'}),null);
  assert.equal(montaScenaCinematograficaRpg(null,null,{classe:'guerriero'}),false);
  assert.equal(montaScenaCinematograficaRpg(null,null,{classe:'guerriero',effetto:'effetto-fulmine'}),false);
});
test('Anteprima, Atelier e download usano le foto reali evitando sovrapposizioni',async()=>{
  const a=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../stile-rpg.css',import.meta.url),'utf8');
  const atelier=await readFile(new URL('../src/rpg-atelier.js',import.meta.url),'utf8');
  const comp=await readFile(new URL('../src/anteprima-combinata-rpg.js',import.meta.url),'utf8');
  assert.match(a,/montaScenaCinematograficaRpg\(grafica,fotoRpg/);
  assert.match(atelier,/fotoCinematograficaRpg\(c\)/);
  assert.match(atelier,/!giaFotografica&&livelli.length/);
  assert.match(comp,/!integrata && effects\?\.width/);
  assert.match(css,/rpg-scena-cinematografica/);
  assert.match(css,/\.rpg-foto-combinata/);
  assert.match(css,/content:none!important/);
});

test('Le armi sono sbloccate solo dal premio elmo, non dal livello o dalla streak odierna',async()=>{
  const {PREMI,nomePremio}=await import('../src/avatar-rpg.js');
  const premio=PREMI.find(p=>p.id==='elmo');
  assert.ok(premio);
  assert.equal(premio.giorni,30);
  assert.equal(nomePremio('elmo','assassino'),'Pugnale');
  assert.equal(nomePremio('elmo','guerriero'),'Spada');
  assert.equal(nomePremio('elmo','berserker'),'Ascia da guerra');
  assert.equal(armaSbloccataRpg([]),false);
  assert.equal(armaSbloccataRpg([{id:'elmo',sbloccato:false}]),false);
  assert.equal(armaSbloccataRpg([{id:'runica',sbloccato:true}]),false);
  assert.equal(armaSbloccataRpg([{id:'elmo',sbloccato:true}]),true);
  // Se la streak attuale si interrompe, il record mantiene il premio.
  assert.equal(armaSbloccataRpg([{id:'elmo',sbloccato:true,streakAttuale:0}]),true);
});
test('Le foto a 9 pannelli non nascondono il pugnale, la spada o la ascia a 30 giorni',()=>{
 for(const classe of ['assassino','guerriero','berserker']){
   const armatura=ARMATURE_EPICHE_SCENE[classe];
   for(const stato of [0,1,2,3]){
     assert.equal(indiceScenaCinematograficaRpg({
       classe,stato,armatura,corona:true,effetto:'effetto-ombra',armaSbloccata:false
     }),7);
   }
   for(const stato of [4,5]){
     for(const armaturaVal of [null,armatura])
       assert.equal(indiceScenaCinematograficaRpg({
         classe,stato,armatura:armaturaVal,corona:true,effetto:'effetto-ombra'
       }),null,'foto di livello '+stato+' senza arma: '+classe);
   }
   assert.equal(indiceScenaCinematograficaRpg({
     classe,stato:2,armaSbloccata:true,armatura
   }),null);
   assert.equal(indiceScenaCinematograficaRpg({
     classe,stadio:4,armaSbloccata:false,armatura
   }),null);
 }
});
test('La scheda usa il premio vero e le fotografie canoniche se lo sblocco richiede arma',async()=>{
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/armaSbloccataRpg\(rpg\.premi\)/);
 assert.match(app,/armaSbloccata \? viso\.indice : Math\.min\(viso\.indice,3\)/);
 assert.match(app,/mostraFotoConArma \? null : armaturaEquipaggiata\?\.immagine/);
 assert.match(app,/fotoProgressioneRpg = percorsoStato\(classeId, statoFotoConsentito\)/);
 assert.match(app,/armaSbloccata:armaSbloccata/);
});
