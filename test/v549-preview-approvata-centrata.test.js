import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('stile-rpg.css');
const comp=read('src/rpg-reference-compositing-v539.js');
const exp=read('src/rpg-atelier.js');

test('v551: Shop displays the original class and current progression portrait',()=>{
 const app=read('src/app.js');
 assert.match(app,/const fotoProgressioneRpg = percorsoStato\(classeId, statoFotoConsentito\)/);
 assert.match(app,/src: fotoAuraDivinaRpg \|\| fotoCoronaRpg \|\| fotoArmaturaRpg \|\| fotoProgressioneRpg/);
 assert.match(comp,/soggetto\.src=alpha\|\|url/);
 assert.match(comp,/grafica\.appendChild\(soggetto\)/);
 assert.doesNotMatch(comp,/avatarMockupConsentito|approvatoShowcasePronto/);
});
test('v551: all five magical scenes remain but no generated second avatar',()=>{
 assert.match(css,/approved-environments-v548\.webp\?v=548/);
 assert.doesNotMatch(css,/approved-showcase-v550\.webp/);
 assert.match(css,/object-fit:contain!important/);
 assert.match(css,/width:min\(100%,350px\)!important/);
 const refs=Object.values(EFFETTI_REFERENCE_V532);
 assert.equal(refs.length,5);
 for(const r of refs)assert.ok(['ambra','ombra','fulmine','nebula','astrale'].includes(r.classe));
});
test('v551: export uses real cutout and same approved background',()=>{
 assert.match(exp,/const palcoDinamicoV548=Boolean\(ritaglioEsportabile&&/);
 assert.match(exp,/const foto=palcoAmbienteV548/);
 assert.match(exp,/ctx\.drawImage\(riferimentoCompleto\?ritaglioEsportabile:immagine,dx,dy,dw,dh\)/);
 assert.doesNotMatch(exp,/palcoEsattoV548|palcoApprovatoV550/);
});
test('v551: PWA versions align and real character assets remain',()=>{
 const idx=read('index.html'),sw=read('sw.js'),app=read('src/app.js'),ui=read('src/rpg-atelier-ui.js'),combined=read('src/anteprima-combinata-rpg.js');
 assert.ok(idx.includes("PALESTRA_VERSIONE = 'palestra-v554'"));
 assert.ok(sw.includes("const VERSIONE = 'palestra-v554'"));
 for(const sheet of ['stile.css','stile-rpg.css','stile-premium.css']){
  assert.ok(idx.includes('./'+sheet+'?v=554'),sheet);
  assert.ok(sw.includes("'./"+sheet+"?v=554'"),sheet);
 }
 assert.ok(sw.includes("'./img/effetti/approved-environments-v548.webp?v=548'"));
 assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=554'));
 assert.ok(app.includes('./rpg-atelier-ui.js?v=554'));
 assert.ok(ui.includes('./rpg-atelier.js?v=554'));
 assert.ok(combined.includes('./rpg-atelier.js?v=554'));
});
