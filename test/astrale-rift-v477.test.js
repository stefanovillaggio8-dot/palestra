import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dipingiRiftAstrale} from '../src/effetti-rpg-canvas.js';
import {percorsoScenaSpecialeRpg} from '../src/foto-cinematica-rpg.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('v477: eclissi, ali di plasma, cristalli e sigillo disegnati per le tre classi',()=>{
  for(const classe of ['assassino','guerriero','berserker']){
    const counts={gradient:0,stroke:0,ellipse:0,arc:0,line:0,mask:0};
    const ctx=new Proxy({
      createRadialGradient(){counts.gradient++;return {addColorStop(){}};},
      stroke(){counts.stroke++;},ellipse(){counts.ellipse++;},
      arc(){counts.arc++;},lineTo(){counts.line++;}
    },{get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){
      if(k==='globalCompositeOperation'&&v==='destination-out')counts.mask++;
      o[k]=v;return true;
    }});
    assert.equal(dipingiRiftAstrale(ctx,300,435,classe,3,55),true);
    assert.ok(counts.gradient>=9,'Rift volumetrico, non solo linee');
    assert.ok(counts.ellipse>=6,'Eclissi e sigillo con orbite');
    assert.ok(counts.stroke>=35,'Filamenti multipli e rune');
    assert.ok(counts.line>=500,'Scie di plasma realmente curve');
    assert.ok(counts.arc>=55,'Stelle presenti anche nel frame fermo');
    assert.equal(counts.mask,0,'Non cancellare le scie dopo averle disegnate');
  }
});

test('v477: l immagine esistente resta il personaggio, Astrale occupa solo lo slot Effetto',()=>{
 const app=read('src/app.js');
 const img=read('src/foto-cinematica-rpg.js');
 const css=read('stile-rpg.css');
 const sw=read('sw.js');
 const x=css.slice(css.lastIndexOf('/* v477 · RIFT ASTRALE MITICO'));
 for(const classe of ['assassino','guerriero','berserker']){
   assert.equal(percorsoScenaSpecialeRpg({classe,stato:2,skin:'skin-mitica'}),null);
   assert.equal(percorsoScenaSpecialeRpg({classe,stato:5,skin:'skin-mitica',armaSbloccata:true}),null);
 }
 assert.match(app,/equipaggiamentoRpg\.Effetto === 'skin-mitica'/);
 assert.match(app,/if \(\(effettoCosmicoAttivo && effettoVivo\)/);
 assert.match(img,/if\(opzioni\.skin==='skin-mitica'\)return false/);
 assert.match(x,/astrale-rift-v477\.svg/);
 assert.match(x,/content:none!important/);
 assert.match(sw,/\.\/img\/effetti\/astrale-rift-v477\.svg/);
 assert.match(sw,/palestra-v482/);
 assert.match(read('index.html'),/palestra-v482/);
});
