import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,statSync } from 'node:fs';
import { slotPerOggettoRpg,equipaggiamentoRpgUnico,aggiornaEquipaggiamentoRpg } from '../src/equipaggiamento-rpg.js';
import { percorsoFotoCoronaV359 } from '../src/foto-corona-v359.js';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Un effetto per volta, Astrale sostituisce Fulmine senza toccare armatura/skin',()=>{
 const base={Armatura:'armatura-guerriero-braci',Skin:'skin-speciale',Effetto:'effetto-fulmine',Titolo:'titolo-panca'};
 const astrale={id:'skin-mitica',tipo:'Effetto'};
 const equip=aggiornaEquipaggiamentoRpg(base,astrale,true);
 assert.equal(slotPerOggettoRpg(astrale),'Effetto');
 assert.deepEqual(equip,{Armatura:base.Armatura,Skin:base.Skin,Effetto:'skin-mitica',Titolo:base.Titolo});
 const fire=aggiornaEquipaggiamentoRpg(equip,{id:'effetto-ambra',tipo:'Effetto'},true);
 assert.equal(fire.Effetto,'effetto-ambra');
 assert.equal(fire.Armatura,base.Armatura);
 assert.equal(fire.Skin,base.Skin);
 assert.deepEqual(aggiornaEquipaggiamentoRpg(fire,{id:'effetto-ombra',tipo:'Effetto'},false),fire);
 const blank=aggiornaEquipaggiamentoRpg(fire,{id:'effetto-ambra',tipo:'Effetto'},false);
 assert.equal(blank.Effetto,undefined);
});

test('Vecchi account con Astrale o Skin legacy migrano senza perdere inventario',()=>{
 assert.deepEqual(equipaggiamentoRpgUnico({Astrale:'skin-mitica'}),{Effetto:'skin-mitica'});
 assert.deepEqual(equipaggiamentoRpgUnico({Skin:'skin-mitica'}),{Effetto:'skin-mitica'});
 assert.deepEqual(equipaggiamentoRpgUnico({Effetto:'effetto-ombra',Astrale:'skin-mitica'}),{Effetto:'effetto-ombra'});
 assert.deepEqual(equipaggiamentoRpgUnico({Skin:'skin-normale',Armatura:'armatura-assassino-notte'}),{Skin:'skin-normale',Armatura:'armatura-assassino-notte'});
});

test('Tutte le 144 fotografie realmente presenti e decodificabili WebP',()=>{
 let count=0;
 const arm={
  assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']
 };
 for(const cls of Object.keys(arm))
  for(const b of [0,1,2,3,4,5,...arm[cls]])
   for(const id of [null,'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica']){
    const url=percorsoFotoCoronaV359({classe:cls,stato:typeof b==='number'?b:2,
      armatura:typeof b==='number'?null:b,effetto:id});
    assert.ok(url);
    const path=url.replace(/^\.\//,'').split('?')[0];
    const file=new URL('../'+path,import.meta.url);
    const bytes=readFileSync(file);
    assert.ok(bytes.length>12000,path);
    assert.equal(bytes.toString('ascii',0,4),'RIFF',path);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',path);
    count++;
   }
 assert.equal(count,144);
});

test('Corona fotografica, Aura divina classica e PNG privi di doppie spirali',()=>{
 const app=src('src/app.js'),compositor=src('src/anteprima-combinata-rpg.js');
 assert.match(app,/if \(fotoCoronaRpg\) grafica\.classList\.add\('aura-foto-fx-attiva'\)/);
 assert.match(app,/!fotoCoronaRpg && !fotoArmaturaArmataRpg && !effettoVivo && !auraDivinaAttiva/);
 assert.match(compositor,/grafica\.classList\?\.contains\('personaggio-aura-divina'\)/);
 assert.match(compositor,/disegnaSprite\(fx,atlas,'divina'/);
 assert.doesNotMatch(app,/src:'\.\/img\/effetti\/corona-infinito-v358\.svg'/);
});
