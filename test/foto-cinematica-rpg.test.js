import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  SCENE_ATLANTI_RPG,ARMATURE_EPICHE_SCENE,
  indiceScenaCinematograficaRpg,percorsoAtlanteScenaRpg,
  fotoCinematograficaRpg,montaScenaCinematograficaRpg
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
