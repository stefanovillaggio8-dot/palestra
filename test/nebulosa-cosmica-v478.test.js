import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dipingiNebulosaCosmica,usaEffettiViviRpg} from '../src/effetti-rpg-canvas.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v481: nubi, stelle e profondità, ZERO neon e anelli per tutte le classi',()=>{
  for(const classe of ['assassino','guerriero','berserker']){
    const counts={gradient:0,stroke:0,ellipse:0,arc:0,line:0,mask:0};
    const ctx=new Proxy({
      createRadialGradient(){counts.gradient++;return {addColorStop(){}};},
      stroke(){counts.stroke++;},ellipse(){counts.ellipse++;},
      arc(){counts.arc++;},lineTo(){counts.line++;}
    },{get(obj,k){return k in obj?obj[k]:()=>{};},
       set(obj,k,val){if(k==='globalCompositeOperation' && val==='destination-out')counts.mask++;obj[k]=val;return true;}});
    assert.equal(dipingiNebulosaCosmica(ctx,300,435,classe,2.1,46),true);
    assert.ok(counts.gradient>=55,'volumi di gas reali, non quattro macchie');
    assert.ok(counts.arc>=80,'gas e stelle a molte profondità');
    assert.equal(counts.stroke,0,'nessuna striscia neon o curva incollata');
    assert.equal(counts.ellipse,0,'nessun anello copiato da Astrale');
    assert.ok(counts.line>=160,'maschera fotografica dedicata alla classe');
    assert.equal(counts.mask,1,'la vera skin rimane intatta');
  }
});

test('v481: identico zoom di Astrale, maschera originale per tre personaggi',()=>{
 const app=read('src/app.js'),atelier=read('src/rpg-atelier.js');
 const css=read('stile-rpg.css'),sw=read('sw.js');
 assert.match(app,/const effettoCosmicoAttivo = astraleAttiva \|\| nebulosaAttiva/);
 assert.match(app,/const combinata = !effettoCosmicoAttivo/);
 assert.match(app,/if\(scenaRichiesta && !effettoCosmicoAttivo/);
 assert.match(app,/if \(effettoEquipaggiato\) grafica\.classList\.add\('shop-' \+ effettoEquipaggiato\.id\)/);
 assert.match(app,/rpg-nebulosa-presenza/);
 assert.match(app,/if \(\(effettoCosmicoAttivo && effettoVivo\)/);
 assert.match(atelier,/dipingiNebulosaCosmica\(ctx,dw,dh,c.classe/);
 assert.match(atelier,/fxSenzaFoto = c.effetto==='skin-mitica' \|\| c.effetto==='effetto-nebula'/);
 const v481=css.slice(css.indexOf('/* v481 — Nebulosa LEGGENDARIA'));
 assert.match(v481,/nebulosa-tempesta-assassino-v481\.svg/);
 assert.match(v481,/nebulosa-tempesta-guerriero-v481\.svg/);
 assert.match(v481,/nebulosa-tempesta-berserker-v481\.svg/);
 for(const cls of ['assassino','guerriero','berserker']){
   assert.match(sw,new RegExp('nebulosa-tempesta-'+cls+'-v481\\.svg'));
 }
 assert.doesNotMatch(sw,/\.\/img\/effetti\/nebulosa-cosmica-v478\.svg/);
 assert.match(sw,/palestra-v\d+/);
 assert.match(read('index.html'),/palestra-v\d+/);
 const f=read('src/effetti-rpg-canvas.js');
 const body=f.slice(f.indexOf('export function dipingiNebulosaCosmica'), f.indexOf('export function dipingiApoteosiAstrale'));
 assert.doesNotMatch(body,/ctx\.stroke\(/,'nessun neon né cerchio sul personaggio');
 assert.doesNotMatch(body,/ctx\.ellipse\(/,'nessuna copia del portale Astrale');
});

test('v481: animazione iPhone, fallback funzionante senza API',t=>{
 const before={doc:globalThis.document,raf:globalThis.requestAnimationFrame};
 t.after(()=>{
   if(before.doc===undefined)delete globalThis.document;else globalThis.document=before.doc;
   if(before.raf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=before.raf;
 });
 delete globalThis.document;delete globalThis.requestAnimationFrame;
 assert.equal(usaEffettiViviRpg('effetto-nebula'),false);
 globalThis.document={createElement(){}};globalThis.requestAnimationFrame=()=>1;
 assert.equal(usaEffettiViviRpg('effetto-nebula'),true);
 assert.equal(usaEffettiViviRpg('effetto-ombra'),false);
});
