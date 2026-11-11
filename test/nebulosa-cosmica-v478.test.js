import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dipingiNebulosaCosmica,usaEffettiViviRpg} from '../src/effetti-rpg-canvas.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v478: Nebulosa Leggendaria ha nubi, filamenti, orbite e polvere per ogni classe',()=>{
  for(const classe of ['assassino','guerriero','berserker']){
    const counts={gradient:0,stroke:0,ellipse:0,arc:0,line:0,mask:0};
    const ctx=new Proxy({
      createRadialGradient(){counts.gradient++;return {addColorStop(){}};},
      stroke(){counts.stroke++;},ellipse(){counts.ellipse++;},
      arc(){counts.arc++;},lineTo(){counts.line++;}
    },{get(obj,k){return k in obj?obj[k]:()=>{};},
       set(obj,k,val){if(k==='globalCompositeOperation' && val==='destination-out')counts.mask++;obj[k]=val;return true;}});
    assert.equal(dipingiNebulosaCosmica(ctx,300,435,classe,2.1,46),true);
    assert.ok(counts.gradient>=12,'nubi cosmiche volumetriche');
    assert.ok(counts.stroke>=30,'bracci di galassia ed orbite');
    assert.ok(counts.line>=400,'filamenti non rettilinei');
    assert.ok(counts.arc>=55,'stelle vive e gas');
    assert.ok(counts.ellipse>=6,'galassie orbitanti e riflesso');
    assert.equal(counts.mask,1,'sagoma originale protetta');
  }
});
test('v478: Nebulosa ha esattamente il medesimo ritratto e zoom di Astrale',()=>{
 const app=read('src/app.js'),atelier=read('src/rpg-atelier.js');
 const css=read('stile-rpg.css'),sw=read('sw.js');
 assert.match(app,/const effettoCosmicoAttivo = astraleAttiva \|\| nebulosaAttiva/);
 assert.match(app,/const combinata = !effettoCosmicoAttivo/);
 assert.match(app,/if\(scenaRichiesta && !effettoCosmicoAttivo/);
 assert.match(app,/shop-effetto-nebula/);
 assert.match(app,/rpg-nebulosa-presenza/);
 assert.match(app,/if \(\(effettoCosmicoAttivo && effettoVivo\)/);
 assert.match(atelier,/dipingiNebulosaCosmica\(ctx,dw,dh,c.classe/);
 assert.match(atelier,/fxSenzaFoto = c.effetto==='skin-mitica' \|\| c.effetto==='effetto-nebula'/);
 assert.match(css,/nebulosa-cosmica-v478\.svg/);
 assert.match(css,/\.personaggio-scena-grafica\.shop-effetto-nebula/);
 assert.match(sw,/\.\/img\/effetti\/nebulosa-cosmica-v478\.svg/);
 assert.match(sw,/palestra-v478/);
 assert.match(read('index.html'),/palestra-v478/);
});
test('v478: animazione su iPhone possibile ma rispetta device senza API',t=>{
 const before={doc:globalThis.document,raf:globalThis.requestAnimationFrame};
 t.after(()=>{if(before.doc===undefined)delete globalThis.document;else globalThis.document=before.doc;
 if(before.raf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=before.raf;});
 delete globalThis.document;delete globalThis.requestAnimationFrame;
 assert.equal(usaEffettiViviRpg('effetto-nebula'),false);
 globalThis.document={createElement(){}};globalThis.requestAnimationFrame=()=>1;
 assert.equal(usaEffettiViviRpg('effetto-nebula'),true);
 assert.equal(usaEffettiViviRpg('effetto-ombra'),false);
});
