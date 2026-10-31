import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {usaEffettiViviRpg,montaEffettiRpg} from '../src/effetti-rpg-canvas.js';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('Senza Canvas animato rimane disponibile il precedente fallback fotografico',()=>{
  const oldDoc=globalThis.document,oldRaf=globalThis.requestAnimationFrame;
  try {
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
    for(const tipo of ['effetto-ambra','effetto-fulmine'])
      assert.equal(usaEffettiViviRpg(tipo),false);
    assert.equal(usaEffettiViviRpg(null,{mitica:true}),false);
  } finally {
    if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
    if(oldRaf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=oldRaf;
  }
});
test('Ambra, Scarica viola ed Astrale scelgono il renderer visibile su iPhone moderno',()=>{
 const doc=globalThis.document,raf=globalThis.requestAnimationFrame;
 try {
   globalThis.document={createElement(){}};
   globalThis.requestAnimationFrame=()=>1;
   assert.equal(usaEffettiViviRpg('effetto-ambra'),true);
   assert.equal(usaEffettiViviRpg('effetto-fulmine'),true);
   assert.equal(usaEffettiViviRpg(null,{mitica:true}),true);
   assert.equal(usaEffettiViviRpg('effetto-ombra',{mitica:true}),true);
   assert.equal(usaEffettiViviRpg('effetto-nebula',{mitica:true}),true);
   assert.equal(usaEffettiViviRpg('effetto-ombra'),false);
   assert.equal(usaEffettiViviRpg('effetto-nebula'),false);
   assert.equal(usaEffettiViviRpg(null),false);
 } finally {
   if(doc===undefined)delete globalThis.document;else globalThis.document=doc;
   if(raf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=raf;
 }
});
test('Il compositore statico non copre il rendering live, anche con corona e armatura',async()=>{
 const app=await read('src/app.js'),css=await read('stile-rpg.css');
 const start=app.indexOf('const effettoVivo=!auraDivinaAttiva && !fotoCoronaRpg && usaEffettiViviRpg(');
 const end=app.indexOf('// LA FILMSTRIP:',start);
 assert.ok(start>0&&end>start);
 const b=app.slice(start,end);
 assert.match(b,/\(!effettoVivo \|\| auraDivinaAttiva\) && montaFotoRpg/);
 assert.match(b,/!fotoCoronaRpg && !effettoVivo && !auraDivinaAttiva && montaFotoCombinataRpg/);
 assert.match(b,/scenaRichiesta && !fotoCoronaRpg && !effettoVivo/);
 assert.match(b,/montaEffettiRpg\(grafica, effettoVivo \? \(astraleAttiva \? null : effettoEquipaggiato\?\.id \|\| null\) : null/);
 assert.match(b,/rpg-render-live/);
 assert.match(css,/\.rpg-render-live\.rpg-fx-attiva \.rpg-effetti-canvas/);
 assert.match(css,/display:block!important/);
 assert.match(css,/z-index:11/);
 assert.match(css,/shop-effetto-fulmine/);
});
test('Nessun diamante o triangolo finto della skin Astrale sul petto',async()=>{
 const skin=await read('src/skin-rpg-fedele.js');
 const m=await read('src/materiali-armature-rpg.js');
 assert.match(skin,/if\(skin\.simbolo!=='astrale'\)/);
 assert.doesNotMatch(m,/decoraAstrale\(ctx/);
 assert.match(m,/if\(materiale\)/);
});
test('I fulmini rimangono visibili per una porzione significativa di ogni ciclo',async()=>{
 const c=await read('src/effetti-rpg-canvas.js');
 assert.match(c,/length:8\},\(_,i\)=>\(\{/);
 assert.match(c,/durata:casuale\(\.32,\.52\)/);
 assert.match(c,/length:tipo==='effetto-ombra'\?22:66/);
 assert.match(c,/if\(tipo==='effetto-ombra'\|\|tipo==='effetto-nebula'/);
 assert.match(c,/cancellaCorpo\(\);/);
 assert.match(c,/function amber\(/);
 assert.match(c,/function arc\(/);
 assert.match(c,/function nebula\(/);
 assert.doesNotMatch(c,/acquistaAura|scriviRicompense|salvaProfilo/);
});
