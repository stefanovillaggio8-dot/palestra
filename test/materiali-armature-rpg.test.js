import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MATERIALI_ARMATURA_RPG,dettagliArmaturaRpg,disegnaMaterialiArmaturaRpg}
  from '../src/materiali-armature-rpg.js';
import {configurazioneFotoRpg,chiaveFotoRpg} from '../src/anteprima-combinata-rpg.js';

const ARMATURE={
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse'],
};
test('Tutte le sei armature sono diverse e non hanno solo un filtro di colore',()=>{
  const schemi=new Set();
  assert.equal(Object.keys(MATERIALI_ARMATURA_RPG).length,7);
  for(const [classe,armature] of Object.entries(ARMATURE)){
    for(const id of armature){
      const m=dettagliArmaturaRpg(classe,id);
      assert.ok(m,'materiale '+id);
      assert.ok(m.schema);
      assert.ok(!schemi.has(m.schema),'costruzione ripetuta: '+m.schema);
      schemi.add(m.schema);
      for(const altra of Object.keys(ARMATURE).filter(x=>x!==classe))
        assert.equal(dettagliArmaturaRpg(altra,id),null);
    }
  }
  assert.equal(schemi.size,6);
  assert.ok(dettagliArmaturaRpg('assassino','skin-mitica'));
});
test('Velo della Notte aggiunge piastre e cinturoni al ritratto originale',()=>{
  let fills=0,strokes=0,scales=0;
  const ctx={
    save(){},restore(){},scale(){scales++},
    createLinearGradient(){return {addColorStop(){}}},
    beginPath(){},closePath(){},moveTo(){},lineTo(){},
    fill(){fills++},stroke(){strokes++},arc(){},setLineDash(){},
  };
  assert.equal(disegnaMaterialiArmaturaRpg(ctx,480,720,'assassino',
    'armatura-assassino-notte'),true);
  assert.ok(fills>15,'lamelle, cinghie, bracciali e cintura effettive');
  assert.ok(strokes>15);
  assert.equal(scales,1,'coordinate relative alla foto originale');
  assert.equal(disegnaMaterialiArmaturaRpg(ctx,480,720,'berserker',
    'armatura-assassino-notte'),false);
});
test('Corona, aura e tutti gli effetti rimangono indipendenti da qualsiasi armatura e dalla skin mitica',()=>{
 const effetti=[null,'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula'];
 const chiavi=new Set();
 for(const [classe,armature] of Object.entries(ARMATURE)){
   for(const armatura of armature)
     for(const skin of [null,'skin-mitica'])
       for(const effetto of effetti)
         for(const corona of [false,true])
           for(const divina of [false,true]){
             const c=configurazioneFotoRpg({classe,stato:4,armatura,skin,effetto,corona,divina});
             assert.equal(c.armatura,armatura);
             assert.equal(c.skin,skin);
             assert.equal(c.effetto,effetto);
             assert.equal(c.corona,corona);
             assert.equal(c.divina,divina);
             chiavi.add(chiaveFotoRpg(c));
           }
 }
 assert.equal(chiavi.size,240);
});
test('Vista e foto PNG mantengono gli strati della corazza e sfumano gli effetti',async()=>{
 const css=await readFile(new URL('../stile-rpg.css',import.meta.url),'utf8');
 const shop=await readFile(new URL('../src/skin-rpg-fedele.js',import.meta.url),'utf8');
 const photo=await readFile(new URL('../src/anteprima-combinata-rpg.js',import.meta.url),'utf8');
 const exportPng=await readFile(new URL('../src/rpg-atelier.js',import.meta.url),'utf8');
 assert.match(shop,/disegnaMaterialiArmaturaRpg\(ctx,w,h,classe,armaturaId,skinId\)/);
 assert.match(shop,/\.20\*maschera\*morbido/);
 assert.match(css,/mix-blend-mode:normal;\s*border-radius:inherit/);
 assert.match(photo,/ctx\.filter='blur\('/);
 assert.match(exportPng,/fx\.filter='blur\('/);
 assert.match(exportPng,/globalCompositeOperation='source-over'/);
 assert.doesNotMatch(photo,/disegnaSprite\(ctx,atlas,'corona'/);
 assert.match(photo,/querySelector\('\.rpg-corona-premium'\)/);
 const svg=await readFile(new URL('../img/effetti/corona-infinito-v345.svg',import.meta.url),'utf8');
 assert.match(svg,/viewBox="0 0 640 890"/);
 assert.match(svg,/id="rune"/);
 assert.match(svg,/id="star"/);
});
