import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compositor=read('src/rpg-reference-compositing-v539.js');
const renderer=read('src/app.js');
const css=read('stile-rpg.css');
const atelier=read('src/rpg-atelier.js');

test('v551: no generated face can replace any original class/stage/armor',()=>{
 assert.match(renderer,/const fotoProgressioneRpg = percorsoStato\(classeId, statoFotoConsentito\)/);
 assert.match(renderer,/src: fotoAuraDivinaRpg \|\| fotoCoronaRpg \|\| fotoArmaturaRpg \|\| fotoProgressioneRpg/);
 assert.match(compositor,/soggetto\.src=alpha\|\|url/);
 assert.match(compositor,/grafica\.appendChild\(soggetto\)/);
 assert.match(compositor,/classList\?\.remove\?\.\('rpg-reference-stage-v548-static'\)/);
 for(const source of [compositor,css,atelier]){
  assert.doesNotMatch(source,/approved-showcase-v550\.webp/,'Generated face remains in active rendering');
 }
 assert.doesNotMatch(compositor,/avatarMockupConsentito/);
 assert.doesNotMatch(compositor,/approvatoShowcasePronto/);
 assert.doesNotMatch(atelier,/palcoEsattoV548|palcoApprovatoV550/);
});

test('v551: original bodies, helmets and face proportions are never stretched',()=>{
 assert.match(css,/> \.rpg-reference-subject-v539 \{\s*display:block!important;\s*object-fit:contain!important/);
 assert.match(css,/width:min\(100%,350px\)!important/);
 assert.match(css,/\.rpg-reference-environment-v541 \{[\s\S]*?approved-environments-v548\.webp\?v=548/);
 assert.match(compositor,/idContornoArmaturaCosmicaRpg\(url\)/);
 assert.match(compositor,/soggetto\._rpgReferenceMask=maschera/);
});

test('v551: preserve all five approved colors and platform cells',()=>{
 const list=Object.values(EFFETTI_REFERENCE_V532);
 assert.equal(list.length,5);
 assert.deepEqual(list.map(r=>[r.classe,r.colonna,r.riga]),[
  ['ambra',0,0],['ombra',1,0],['fulmine',2,0],
  ['nebula',0,1],['astrale',1,1],
 ]);
 assert.match(css,/background-size:300% 200%!important/);
 for(const val of ['0% 0%','50% 0%','100% 0%','0% 100%','50% 100%']){
  assert.ok(css.includes('background-position:'+val+'!important'),val);
 }
 assert.match(compositor,/preload\('approved-environments-v548\.webp'/);
});

test('v551: PNG exports genuine cutout with no pre-rendered AI face',()=>{
 assert.match(atelier,/const palcoDinamicoV548=Boolean\(ritaglioEsportabile&&/);
 assert.match(atelier,/const riferimentoCompleto=Boolean\(ritaglioEsportabile&&/);
 assert.match(atelier,/const foto=palcoAmbienteV548/);
 assert.match(atelier,/ctx\.drawImage\(riferimentoCompleto\?ritaglioEsportabile:immagine,dx,dy,dw,dh\)/);
 assert.match(atelier,/ritaglioEsportabile\._rpgReferenceMask|ritaglioEsportabile\?\._rpgReferenceMask/);
});

test('v551: PWA refreshes modules while original full-scene assets remain archived',()=>{
 const index=read('index.html'),sw=read('sw.js');
 const ui=read('src/rpg-atelier-ui.js'),combined=read('src/anteprima-combinata-rpg.js');
 assert.ok(index.includes("PALESTRA_VERSIONE = 'palestra-v559'"));
 assert.ok(sw.includes("const VERSIONE = 'palestra-v559'"));
 for(const path of ['stile.css','stile-rpg.css','stile-premium.css']){
  assert.ok(index.includes('./'+path+'?v=559'),path);
  assert.ok(sw.includes("'./"+path+"?v=559'"),path);
 }
 assert.match(renderer,/rpg-reference-compositing-v539\.js\?v=559/);
 assert.match(renderer,/rpg-atelier-ui\.js\?v=559/);
 assert.match(ui,/rpg-atelier\.js\?v=559/);
 assert.match(combined,/rpg-atelier\.js\?v=559/);
 assert.ok(!sw.includes("'./img/effetti/approved-showcase-v550.webp?v=550'"));
 assert.ok(sw.includes("'./img/effetti/approved-environments-v548.webp?v=548'"));
});
