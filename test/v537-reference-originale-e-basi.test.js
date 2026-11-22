import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ATLANTE_REFERENCE_V537,EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const gitBlobSha=buf=>createHash('sha1').update('blob '+buf.length+String.fromCharCode(0)).update(buf).digest('hex');

test('v537: sorgente originale approvata conservata senza alterazioni',()=>{
  const reference=readFileSync(new URL('../img/effetti/reference-approvata-v537.png',import.meta.url));
  assert.equal(gitBlobSha(reference),'258a2fd9f0c2e4d61246cd48a76ae8205f6226bb');
  assert.equal(reference.toString('hex',0,8),'89504e470d0a1a0a');
});
test('v537: i cinque VFX alpha sono preservati dal riferimento, stessa tavola, nessun personaggio sopra',()=>{
  const sprite=readFileSync(new URL('../img/effetti/effetti-reference-v537.webp',import.meta.url));
  assert.equal(gitBlobSha(sprite),'287de8fefd706c42aff149e98cf0c6c5a6a4e384');
  assert.equal(sprite.toString('ascii',0,4),'RIFF');
  assert.equal(sprite.toString('ascii',8,12),'WEBP');
  assert.ok(['VP8L','VP8X'].includes(sprite.toString('ascii',12,16)), 'lossless RGBA WebP support');
  if(sprite.toString('ascii',12,16)==='VP8X') assert.equal(sprite[20]&16,16,'richiesta alpha trasparente');
  if(sprite.toString('ascii',12,16)==='VP8X')
    assert.deepEqual([sprite.readUIntLE(24,3)+1,sprite.readUIntLE(27,3)+1],[1380,884]);
  else {
    const b=sprite.readUInt32LE(21);
    assert.deepEqual([(b&16383)+1,((b>>>14)&16383)+1],[1380,884]);
  }
  assert.ok(ATLANTE_REFERENCE_V537.includes('effetti-reference-v537.webp?v=537'));
  assert.equal(Object.keys(EFFETTI_REFERENCE_V532).length,5);
});
test('v537: tutti i punti di rendering usano la stessa nuova texture',()=>{
 const css=read('stile-rpg.css'),at=read('src/rpg-atelier.js'),sw=read('sw.js'),app=read('src/app.js');
 for(const source of [css,at,sw])
   assert.match(source,/effetti-reference-v539/);
 assert.match(css,/width:164%!important/);
 assert.match(css,/height:108%!important/);
 assert.match(css,/overflow:visible!important/);
 assert.match(css,/filter:none!important/);
 assert.match(css,/mix-blend-mode:normal!important/);
 assert.ok(at.includes('dx-dw*.32,dy-dh*.04,dw*1.64,dh*1.08'));
 assert.match(app,/rpg-reference-fx/);
 assert.ok(sw.includes("percorso.includes('effetti-reference-v539.webp')"));
 assert.match(sw,/const VERSIONE = 'palestra-v545'/);
 assert.match(read('index.html'),/PALESTRA_VERSIONE = 'palestra-v545'/);
});
test('v537: nessun cambio figura/armatura/casco nelle 3 classi e tutte le combinazioni',()=>{
 const armature={
  assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']
 };
 for(const [classe,ids] of Object.entries(armature))for(const armatura of ids)
  for(let stato=0;stato<6;stato++){
   const f=percorsoFotoArmaturaArmataV371({classe,armatura,stato,armaSbloccata:stato>=4});
   for(const effetto of Object.keys(EFFETTI_REFERENCE_V532))
    assert.equal(percorsoFotoArmaturaArmataV371({classe,armatura,stato,effetto,armaSbloccata:stato>=4}),f);
  }
});
