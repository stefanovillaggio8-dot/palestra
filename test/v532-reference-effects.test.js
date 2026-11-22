import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {ATLANTE_REFERENCE_V532,EFFETTI_REFERENCE_V532,effettoReferenceV532,scenaReferenceClassV532} from '../src/rpg-reference-v532.js';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v532: asset WebP e veramente la texture estratta dal collage approvato',()=>{
 const data=readFileSync(new URL('../img/effetti/effetti-reference-v532.webp',import.meta.url));
 const actual=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
 assert.equal(actual,'6c2aa5e3b321ee8328b78f78b01d7dbe3919df47');
 assert.equal(data.toString('ascii',0,4),'RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP');
 assert.ok(data.length>6000&&data.length<15000,'atlas leggero anche per iPhone');
 assert.match(ATLANTE_REFERENCE_V532,/effetti-reference-v532\.webp\?v=532/);
});
test('v532: 5 effetto/riga/colonna distinti, senza altro scenario',()=>{
 assert.deepEqual(Object.keys(EFFETTI_REFERENCE_V532),
  ['effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica']);
 assert.deepEqual(Object.entries(EFFETTI_REFERENCE_V532).map(([id,fx])=>[id,fx.colonna,fx.riga]),[
  ['effetto-ambra',0,0],['effetto-ombra',1,0],['effetto-fulmine',2,0],
  ['effetto-nebula',0,1],['skin-mitica',1,1]]);
 assert.equal(effettoReferenceV532('non-esiste'),null);
 assert.equal(effettoReferenceV532(null),null);
 assert.equal(scenaReferenceClassV532('non-esiste'),'');
 for(const id of Object.keys(EFFETTI_REFERENCE_V532))
  assert.match(scenaReferenceClassV532(id),/rpg-reference-v532 rpg-reference-/);
});
test('v532: Shop e personaggio usano i frame originali, senza renderer v531 duplicati',()=>{
 const app=read('src/app.js');
 assert.match(app,/const effettoRiferimento=effettoReferenceV532\(effettoEquipaggiato\?\.id\)/);
 assert.match(app,/grafica\.appendChild\(el\('div',\{[\s\S]*?rpg-reference-fx/);
 assert.match(app,/const effettoVivo=!effettoRiferimento && usaEffettiViviRpg/);
 assert.match(app,/if \(!effettoRiferimento && !effettoCosmicoAttivo/);
 assert.match(app,/effetto:effettoRiferimento\?null:astraleAttiva/);
 assert.match(app,/if\(cosmicoAnteprima&&!referenceAnteprima\)pannello\.classList\.add/);
 assert.match(app,/const scenario = \(cosmicoAnteprima \|\| referenceAnteprima\) \? null/);
 assert.match(app,/const fotoEffettoPremium=effettoRiferimento \|\|/);
 assert.match(app,/const scenaFotografica = !effettoRiferimento &&/);
});
test('v535: livelli RGBA non dipingono personaggio, casco, sfondo o foto',()=>{
 const css=read('stile-rpg.css');
 assert.match(css,/rpg-reference-v532 > \.rpg-reference-fx/);
 assert.match(css,/mix-blend-mode:normal!important/);
 assert.match(css,/background-size:300% 200%!important/);
 assert.match(css,/rpg-reference-ambra\{background-position:0% 0%/);
 assert.match(css,/rpg-reference-ombra\{background-position:50% 0%/);
 assert.match(css,/rpg-reference-fulmine\{background-position:100% 0%/);
 assert.match(css,/rpg-reference-nebula\{background-position:0% 100%/);
 assert.match(css,/rpg-reference-astrale\{background-position:50% 100%/);
 assert.match(css,/\.rpg-reference-v532 > \.personaggio-ritratto\{[\s\S]*?opacity:1!important/);
});
test('v532: 3 classi x 2 armature x ogni effetto usano stessa foto con armi sbloccate',()=>{
 const armi={
  assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']};
 for(const [classe,armature] of Object.entries(armi))for(const armatura of armature) {
  const foto=percorsoFotoArmaturaArmataV371({classe,armatura,stato:5,armaSbloccata:true});
  for(const effetto of Object.keys(EFFETTI_REFERENCE_V532))
   assert.equal(percorsoFotoArmaturaArmataV371({classe,armatura,stato:5,effetto,armaSbloccata:true}),foto);
 }
});
test('v532: Atelier export PNG ha esattamente la stessa texture e cache offline',()=>{
 const atelier=read('src/rpg-atelier.js'),sw=read('sw.js');
 assert.match(atelier,/new URL\('\.\.\/img\/effetti\/effetti-reference-v539\.webp\?v=539'/);
 assert.match(atelier,/if\(riferimentoV532\)\{/);
 assert.match(atelier,/ctx\.globalCompositeOperation='source-over'/);
 assert.match(atelier,/riferimentoV532\.colonna\*cellW,riferimentoV532\.riga\*cellH/);
 assert.match(sw,/effetti-reference-v532\.webp\?v=532/);
 assert.match(sw,/FOTO_DECORATIVE\.test\(percorso\) \|\| percorso\.includes\('effetti-reference-v532\.webp'\)/);
 assert.match(sw,/src\/rpg-reference-v532\.js/);
 assert.match(sw,/const VERSIONE = 'palestra-v554'/);
 assert.match(read('index.html'),/PALESTRA_VERSIONE = 'palestra-v554'/);
});
