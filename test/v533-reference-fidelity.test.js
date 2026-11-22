import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ATLANTE_REFERENCE_V533,EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const atlas=readFileSync(new URL('../img/effetti/effetti-reference-v533.webp',import.meta.url));
test('v533: atlas HD autentico dall ULTIMA foto approvata, alpha puro',()=>{
 const hash=createHash('sha1').update(Buffer.from('blob '+atlas.length)).update(Buffer.from([0])).update(atlas).digest('hex');
 assert.equal(hash,'b407dd7e95dadf8447195951b64639e68c7f4423');
 assert.equal(atlas.length,295010);
 assert.equal(atlas.toString('ascii',0,4),'RIFF');
 assert.equal(atlas.toString('ascii',8,12),'WEBP');
 assert.equal(atlas.toString('ascii',12,16),'VP8X');
 assert.equal(atlas[20]&16,16,'Alpha WebP: nessun avatar nello sprite');
 assert.deepEqual([atlas.readUIntLE(24,3)+1,atlas.readUIntLE(27,3)+1],[1152,638]);
 assert.equal(ATLANTE_REFERENCE_V533,'./img/effetti/effetti-reference-v533.webp?v=533');
 assert.deepEqual(Object.keys(EFFETTI_REFERENCE_V532),[
  'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica'
 ]);
});
test('v534: lo sprite v533 rimane come archivio, il nuovo RGBA è attivo in Shop e PNG',()=>{
 const css=read('stile-rpg.css'),app=read('src/app.js');
 const atelier=read('src/rpg-atelier.js'),sw=read('sw.js');
 const index=read('index.html');
 assert.ok(css.includes("background-image:url('./img/effetti/effetti-reference-v539.webp?v=539')!important"));
 assert.ok(css.includes('mix-blend-mode:normal!important'));
 for(const effect of ['ambra','ombra','fulmine','nebula','astrale'])
   assert.ok(css.includes('.rpg-reference-fx.rpg-reference-'+effect+'{background-position:'));
 assert.ok(app.includes('effettoReferenceV532(effettoEquipaggiato?.id)'));
 assert.ok(atelier.includes('effetti-reference-v539.webp?v=539'));
 assert.ok(sw.includes('effetti-reference-v533.webp?v=533'));
 assert.ok(sw.includes("percorso.includes('effetti-reference-v534.webp')"));
 assert.ok(index.includes("PALESTRA_VERSIONE = 'palestra-v539'"));
 assert.ok(sw.includes("const VERSIONE = 'palestra-v539'"));
});
test('v533: tutte le classi, gli stadi, le sei armature e i cinque FX usano la stessa foto',()=>{
 const sets={
  assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']
 };
 for(const [classe,armature] of Object.entries(sets))
   for(const armatura of armature)
     for(let stato=0;stato<6;stato++){
       const original=percorsoFotoArmaturaArmataV371({classe,armatura,stato,armaSbloccata:stato>=4});
       for(const effetto of Object.keys(EFFETTI_REFERENCE_V532)) {
         const combinata=percorsoFotoArmaturaArmataV371({classe,armatura,stato,effetto,armaSbloccata:stato>=4});
         assert.equal(combinata,original,classe+' '+armatura+' '+stato+' '+effetto);
       }
     }
});
