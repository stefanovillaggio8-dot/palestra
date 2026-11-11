import {test} from 'node:test';
import assert from 'node:assert/strict';
import {disegnaAstraleExport,bordoSagomaRpg} from '../src/effetti-rpg-canvas.js';

test('v476: Astrale disegna l aura per tutte le classi senza inventare un nuovo personaggio',()=>{
 for(const classe of ['assassino','guerriero','berserker']){
   let stroke=0,arc=0,gradient=0;
   const context=new Proxy({
     createRadialGradient(){gradient++;return {addColorStop(){}};},
     stroke(){stroke++;},arc(){arc++;}
   },{get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){o[k]=v;return true;}});
   assert.equal(disegnaAstraleExport(context,{classe,x:2,y:3,width:320,height:480}),true);
   assert.ok(gradient>=2 && stroke>=6 && arc>=30);
   for(const height of [0,.2,.45,.7,1]){
     const [left,right]=bordoSagomaRpg(classe,height);
     assert.ok(left<right && left>=0 && right<=1);
   }
 }
});
