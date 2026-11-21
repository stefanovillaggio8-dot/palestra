import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ATLANTE_REFERENCE_V533,EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const atlas=readFileSync(new URL('../img/effetti/effetti-reference-v533.webp',import.meta.url));
test('v533: atlas HD dell ULTIMA foto approvata, 5 VFX con alpha, mai nuova armatura',()=>{
  const sha=createHash('sha1').update('blob '+atlas.length+'\\0').update(atlas).digest('hex');
  assert.equal(sha,'b407dd7e95dadf8447195951b64639e68c7f4423');
  assert.equal(atlas.length,295010);
  assert.equal(atlas.toString('ascii',0,4),'RIFF');
  assert.equal(atlas.toString('ascii',8,12),'WEBP');
  assert.equal(atlas.toString('ascii',12,16),'VP8X');
  assert.equal(atlas[20]&16,16,'WebP ha realmente alpha');
  // Atlas 3 colonne × 2 righe, ogni cella 384 × 319:
  const width=1+atlas.readUIntLE(24,3),height=1+atlas.readUIntLE(27,3);
  assert.deepEqual([width,height],[1152,638]);
  assert.match(ATLANTE_REFERENCE_V533,/effetti-reference-v533\\.webp\\?v=533/);
  assert.deepEqual(Object.keys(EFFETTI_REFERENCE_V532),[
    'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica'
  ]);
});
test('v533: stessi effetti approvati in Shop, profilo e PNG; PWA esce con asset nuovo',()=>{
 const css=read('stile-rpg.css'),app=read('src/app.js');
 const atelier=read('src/rpg-atelier.js'),sw=read('sw.js');
 const index=read('index.html');
 assert.match(css,/background-image:url\\('\.\/img\/effetti\/effetti-reference-v533\\.webp\\?v=533'\\)!important/);
 assert.match(css,/mix-blend-mode:screen!important/);
 for(const effect of ['ambra','ombra','fulmine','nebula','astrale'])
    assert.match(css,new RegExp('rpg-reference-'+effect+'\\\\{background-position:'));
 assert.match(app,/effettoReferenceV532\\(effettoEquipaggiato\\?\\.id\\)/);
 assert.match(atelier,/effetti-reference-v533\\.webp\\?v=533/);
 assert.match(sw,/effetti-reference-v533\\.webp\\?v=533/);
 assert.match(sw,/effetti-reference-v533\\.webp'\\)/);
 assert.match(index,/PALESTRA_VERSIONE = 'palestra-v533'/);
 assert.match(sw,/const VERSIONE = 'palestra-v533'/);
});
test('v533: ciascuna delle 3 classi, 6 armature e 5 effetti ha la FOTO IDENTICA',()=>{
const sets={
assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']
};
for(const [classe,armature] of Object.entries(sets))
 for(const armatura of armature)
  for(const stato of [0,1,2,3,4,5]){
   const base=percorsoFotoArmaturaArmataV371({classe,armatura,stato,effetto:null,armaSbloccata:stato>=4});
   for(const effetto of Object.keys(EFFETTI_REFERENCE_V532)){
    const p=percorsoFotoArmaturaArmataV371({classe,armatura,stato,effetto,armaSbloccata:stato>=4});
    assert.equal(p,base,classe+' '+armatura+' '+stato+' '+effetto);
   }
  }
});
