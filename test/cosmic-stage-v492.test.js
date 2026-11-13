import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {disegnaAtmosferaCosmicaRpg,disegnaAccentiCosmiciRpg,CUTOUT_VERIFICATI_RPG} from '../src/rpg-scena-cosmica.js';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

function canvasSpy(){
 const operations={fill:0,stops:[],ellipse:0,stroke:0};
 const ctx={
  save(){},restore(){},beginPath(){},fillRect(){operations.fill++;},
  ellipse(){operations.ellipse++;},stroke(){operations.stroke++;},
  createRadialGradient(){
    return {addColorStop(_p,color){operations.stops.push(color);}};
  }
 };
 return {ctx,operations};
}

test('v492: Astrale e Nebulosa hanno cieli procedurali diversi, non fotografie sostitutive',()=>{
 for(const effetto of ['astrale','nebulosa']){
   const {ctx,operations}=canvasSpy();
   assert.doesNotThrow(()=>disegnaAtmosferaCosmicaRpg(ctx,780,1170,effetto));
   assert.ok(operations.fill>=84,'mancano stelle o nubi '+effetto);
   assert.ok(operations.stops.length>=8,'manca profondita colore '+effetto);
   assert.equal(operations.ellipse,effetto==='astrale'?1:0);
 }
});

test('v492: export con accenti periferici senza cambiare il soggetto originale',()=>{
 for(const effetto of ['astrale','nebulosa']){
   const {ctx,operations}=canvasSpy();
   assert.equal(disegnaAccentiCosmiciRpg(ctx,780,1170,effetto),true);
   assert.ok(operations.fill>=20,'mancano glint e sorgenti luce '+effetto);
 }
 assert.equal(disegnaAccentiCosmiciRpg(null,780,1170,'astrale'),false);
 assert.equal(CUTOUT_VERIFICATI_RPG.length,18);
 const atelier=read('src/rpg-atelier.js');
 const exportShop=read('src/anteprima-combinata-rpg.js');
 assert.match(atelier,/disegnaAccentiCosmiciRpg/);
 assert.match(exportShop,/disegnaAccentiCosmiciRpg/);
 assert.match(exportShop,/ctx\.drawImage\(cutout,0,0,out\.width,out\.height\)/);
 assert.doesNotMatch(exportShop,/astrale-celestial-/);
 assert.doesNotMatch(exportShop,/nebulosa-spirale-/);
});

test('v492: scena animata senza SVG poster sul ritratto, zoom e riduzione movimento intatti',()=>{
 const css=read('stile-rpg.css');
 const patch=css.slice(css.indexOf('/* v492 · COSMO DIEGETICO'));
 assert.ok(patch.length>3000);
 assert.doesNotMatch(patch,/url\(['"]?img\/effetti\//,'nessun poster SVG residuo nella v492');
 assert.match(patch,/rpg-cosmic-astrale/);
 assert.match(patch,/rpg-cosmic-nebulosa/);
 assert.match(patch,/background-image:none!important/);
 assert.match(patch,/rpg-cosmic-cutout-asset/);
 assert.match(patch,/prefers-reduced-motion:reduce/);
 assert.match(patch,/rpg-v492-deriva/);
 const scena=read('src/rpg-scena-cosmica.js');
 assert.match(scena,/palco\.appendChild\(grafica\)/);
 assert.match(scena,/sincronizza\(\)/);
 // Il nuovo rendering non modifica salvataggi, Rank, Streak o database.
 assert.doesNotMatch(patch,/localStorage|IndexedDB|\\.setItem\(/);
});

test('v492: cache e anteprima condividono davvero il numero di release',()=>{
 const sw=read('sw.js'),html=read('index.html'),preview=read('anteprima-aura.html');
 assert.match(sw,/const VERSIONE = 'palestra-v493'/);
 assert.match(html,/window\.PALESTRA_VERSIONE = 'palestra-v493'/);
 assert.match(html,/stile-rpg\.css\?v=493/);
 assert.match(preview,/stile\.css\?v=493/);
 assert.match(read('src/rpg-scena-cosmica.js'),/cutout\/stati\/.*webp\?v=493/);
});
