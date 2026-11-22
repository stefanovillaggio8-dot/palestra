import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ATLANTE_REFERENCE_V535,EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v535: il nuovo atlante conserva le luci e l alpha della reference',()=>{
 const b=readFileSync(new URL('../img/effetti/effetti-reference-v535.webp',import.meta.url));
 const sha=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
 assert.equal(sha,'475d43ab831869d0cdbdb0cea6d412565c769acc');
 assert.equal(b.toString('ascii',0,4),'RIFF');
 assert.equal(b.toString('ascii',8,12),'WEBP');
 assert.equal(b.toString('ascii',12,16),'VP8X');
 assert.ok((b[20]&16)>0,'5 effetti realmente trasparenti (no sfondo/armatura)');
 assert.deepEqual([b.readUIntLE(24,3)+1,b.readUIntLE(27,3)+1],[1260,732]);
 assert.ok(b.length>300000 && b.length<650000,'bilancio visuale/rete Safari');
 assert.match(ATLANTE_REFERENCE_V535,/effetti-reference-v535\.webp\?v=535/);
 assert.deepEqual(Object.keys(EFFETTI_REFERENCE_V532),[
  'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica']);
});

test('v535: nessun ritaglio di fumo, saette, nebulosa, scie o sigillo nella preview',()=>{
 const css=read('stile-rpg.css');
 const start=css.indexOf('.personaggio-scena-grafica.rpg-reference-v532{');
 const end=css.indexOf('@media(prefers-reduced-motion:reduce)',start);
 const fx=css.slice(start,end);
 assert.ok(start>0 && end>start);
 assert.match(fx,/overflow:visible!important/);
 assert.doesNotMatch(fx,/overflow:hidden!important/);
 assert.match(fx,/inset:-4% auto auto -32%!important/);
 assert.match(fx,/width:164%!important/);
 assert.match(fx,/height:108%!important/);
 assert.match(fx,/background-image:url\('\.\/img\/effetti\/effetti-reference-v539\.webp\?v=539'\)!important/);
 assert.match(fx,/mix-blend-mode:normal!important/);
 assert.match(css,/\.aura-preview-avatar-container:has\(\.rpg-reference-v532\)/);
 assert.match(css,/@media\(max-width:430px\)/);
 assert.match(css,/width:164%!important/);
 assert.match(css,/rpg-reference-ombra\{background-position:50% 0%/);
 assert.match(css,/rpg-reference-fulmine\{background-position:100% 0%/);
 assert.match(css,/rpg-reference-nebula\{background-position:0% 100%/);
 assert.match(css,/rpg-reference-astrale\{background-position:50% 100%/);
});

test('v535: PNG Atelier conserva tutte le luci anche oltre i bordi della foto',()=>{
 const at=read('src/rpg-atelier.js'),sw=read('sw.js'),idx=read('index.html');
 assert.match(at,/effetti-reference-v539\.webp\?v=539/);
 assert.match(at,/riferimentoV532\.colonna\*cellW,riferimentoV532\.riga\*cellH/);
 assert.match(at,/dx-dw\*\.32,dy-dh\*\.04,dw\*1\.64,dh\*1\.08/);
 assert.match(sw,/effetti-reference-v539\.webp\?v=539/);
 assert.match(sw,/percorso\.includes\('effetti-reference-v536\.webp'\)/);
 assert.match(sw,/palestra-v543/);
 assert.match(idx,/PALESTRA_VERSIONE = 'palestra-v543'/);
});

test('v535: 3 classi x 2 armature x 6 stadi x 5 VFX: stesse foto/caschi/armi',()=>{
 const classi={assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']};
 for(const [classe,armature] of Object.entries(classi))
  for(const armatura of armature)for(let stadio=0;stadio<6;stadio++){
   const base=percorsoFotoArmaturaArmataV371({
    classe,armatura,stato:stadio,armaSbloccata:stadio>=4});
   for(const effetto of Object.keys(EFFETTI_REFERENCE_V532)){
    const foto=percorsoFotoArmaturaArmataV371({
     classe,armatura,stato:stadio,armaSbloccata:stadio>=4,effetto});
    assert.equal(foto,base,classe+':'+armatura+':'+stadio+':'+effetto);
   }
  }
});
