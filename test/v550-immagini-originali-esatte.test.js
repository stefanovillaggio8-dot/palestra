import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';

const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const blob=p=>readFileSync(new URL(p,root));
const originalSha256='abcd3add101dea066cd4ace77068a32bdf2a8ee3e4a0fe2f4e44f25d306b14f9';

test('v550: ORIGINAL uploaded file is byte-for-byte identical to approved WebP',()=>{
 const binary=blob('img/effetti/approved-showcase-v550.webp');
 assert.equal(binary.length,565436);
 assert.equal(binary.toString('ascii',0,4),'RIFF');
 assert.equal(binary.toString('ascii',8,12),'WEBP');
 assert.equal(binary.toString('ascii',12,16),'VP8X');
 assert.equal(createHash('sha256').update(binary).digest('hex'),originalSha256);
 const val=(i)=>binary[i]+(binary[i+1]<<8)+(binary[i+2]<<16);
 assert.equal(val(24)+1,1878);
 assert.equal(val(27)+1,1420);
});

test('v550: all five effects map to their exact approved panels, no reconstruction',()=>{
 const ids=Object.values(EFFETTI_REFERENCE_V532);
 assert.equal(ids.length,5);
 assert.deepEqual(ids.map(x=>[x.classe,x.colonna,x.riga]),[
  ['ambra',0,0],['ombra',1,0],['fulmine',2,0],
  ['nebula',0,1],['astrale',1,1]
 ]);
 const css=read('stile-rpg.css');
 assert.match(css,/approved-showcase-v550\.webp\?v=550/);
 assert.match(css,/background-size:300% 200%/);
 assert.match(css,/aspect-ratio:626 \/ 710/);
 for(const pct of ['0% 0%','50% 0%','100% 0%','0% 100%','50% 100%'])
  assert.ok(css.includes('background-position:'+pct+';'),pct);
});

test('v550: Shop preview and PNG exporter use the SAME original, without extra character',()=>{
 const comp=read('src/rpg-reference-compositing-v539.js');
 const exp=read('src/rpg-atelier.js');
 const css=read('stile-rpg.css');
 assert.match(comp,/preload\('approved-showcase-v550\.webp'/);
 assert.match(exp,/approved-showcase-v550\.webp\?v=550/);
 assert.match(exp,/palcoApprovatoV550\?\.naturalWidth===1878/);
 assert.match(exp,/const foto=palcoEsattoV548\?palcoApprovatoV550:palcoAmbienteV548/);
 assert.match(exp,/else if\(!palcoEsattoV548\) ctx\.drawImage/);
 assert.match(css,/\.personaggio-scena-grafica \{\s*display:none!important/);
 assert.match(comp,/grafica\.closest\?\.\('\.aura-preview-panel'\)/);
 assert.match(comp,/!grafica\.dataset\?\.referenceArmatura/);
 assert.match(comp,/!corona&&!arma/);
 assert.match(css,/approved-environments-v548\.webp\?v=548/);
});

test('v550: PWA version and cache request the newly uploaded asset',()=>{
 const index=read('index.html'),sw=read('sw.js'),app=read('src/app.js');
 const ui=read('src/rpg-atelier-ui.js'),mix=read('src/anteprima-combinata-rpg.js');
 assert.ok(index.includes("PALESTRA_VERSIONE = 'palestra-v550'"));
 assert.ok(sw.includes("const VERSIONE = 'palestra-v550'"));
 for(const file of ['stile.css','stile-rpg.css','stile-premium.css']){
  assert.ok(index.includes('./'+file+'?v=550'),file);
  assert.ok(sw.includes("'./"+file+"?v=550'"),file);
 }
 assert.ok(sw.includes("'./img/effetti/approved-showcase-v550.webp?v=550'"));
 assert.ok(sw.includes("percorso.includes('approved-showcase-v550.webp')"));
 assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=550'));
 assert.ok(app.includes('./rpg-atelier-ui.js?v=550'));
 assert.ok(ui.includes('./rpg-atelier.js?v=550'));
 assert.ok(mix.includes('./rpg-atelier.js?v=550'));
});
