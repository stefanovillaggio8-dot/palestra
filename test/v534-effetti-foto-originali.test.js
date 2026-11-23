import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ATLANTE_REFERENCE_V534,EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v534: tutti e cinque gli effetti sono dalla tavola finale e usano alpha WebP',()=>{
 const bytes=readFileSync(new URL('../img/effetti/effetti-reference-v534.webp',import.meta.url));
 const sha=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 assert.equal(sha,'8c50d0b1cc1468468d505051571eedf50c343222');
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.equal(bytes.toString('ascii',12,16),'VP8X');
 assert.equal(bytes[20]&16,16,'sprite con vera trasparenza');
 assert.deepEqual([bytes.readUIntLE(24,3)+1,bytes.readUIntLE(27,3)+1],[1536,892]);
 assert.ok(bytes.length>300000&&bytes.length<850000,'risoluzione effettiva senza download enormi');
 assert.match(ATLANTE_REFERENCE_V534,/effetti-reference-v534\.webp\?v=534/);
 assert.deepEqual(Object.keys(EFFETTI_REFERENCE_V532),
 ['effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica']);
});

test('v534: niente fusione screen che produceva verde sulle scintille dorate',()=>{
 const css=read('stile-rpg.css'),atelier=read('src/rpg-atelier.js');
 const block=css.slice(css.indexOf('.personaggio-scena-grafica.rpg-reference-v532 > .rpg-reference-fx{'),
                     css.indexOf('.rpg-reference-v532 > .rpg-reference-fx.rpg-reference-ambra'));
 assert.match(block,/effetti-reference-v539\.webp\?v=539/);
 assert.match(block,/mix-blend-mode:normal!important/);
 assert.doesNotMatch(block,/mix-blend-mode:screen!important/);
 assert.match(block,/width:164%!important/);
 assert.match(block,/height:108%!important/);
 assert.match(css,/\.rpg-reference-v532 > \.personaggio-ritratto\{[\s\S]*?opacity:1!important/);
 assert.match(atelier,/effetti-reference-v539\.webp\?v=539/);
 assert.match(atelier,/riferimentoV532\.colonna\*cellW,riferimentoV532\.riga\*cellH/);
 assert.match(atelier,/ctx\.globalCompositeOperation='source-over'/);
});

test('v534: schermata Shop, personaggio e Atelier usano stessi cinque layer senza nuove foto',()=>{
 const app=read('src/app.js');
 const sw=read('sw.js'),idx=read('index.html');
 assert.match(app,/effettoReferenceV532\(oggetto\.id\)/);
 assert.match(app,/const effettoRiferimento=effettoReferenceV532\(effettoEquipaggiato\?\.id\)/);
 assert.match(app,/grafica\.appendChild\(el\('div',\{[\s\S]*?rpg-reference-fx/);
 assert.match(sw,/effetti-reference-v534\.webp\?v=534/);
 assert.match(sw,/percorso\.includes\('effetti-reference-v534\.webp'\)/);
 assert.match(sw,/const VERSIONE = 'palestra-v559'/);
 assert.match(idx,/PALESTRA_VERSIONE = 'palestra-v559'/);
});
test('v534: classi, caschi, armature e armi mantengono esattamente i loro ritratti',()=>{
 const classi={
  assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']
 };
 for(const [classe,armature] of Object.entries(classi)){
  for(const armatura of armature){
   for(let stadio=0;stadio<=5;stadio++){
    const original=percorsoFotoArmaturaArmataV371({classe,armatura,stato:stadio,armaSbloccata:stadio>=4});
    for(const effetto of Object.keys(EFFETTI_REFERENCE_V532)){
     assert.equal(percorsoFotoArmaturaArmataV371({classe,armatura,stato:stadio,
       effetto,armaSbloccata:stadio>=4}),original,classe+':'+armatura+':'+effetto);
    }
   }
  }
 }
});
