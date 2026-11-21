import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {montaScenaCosmicaRpg} from '../src/rpg-scena-cosmica.js';
import {usaEffettiViviRpg} from '../src/effetti-rpg-canvas.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v530: nessun effetto cosmico puo sostituire lo scenario o la foto canonica',()=>{
  const app=read('src/app.js');
  const css=read('stile-rpg.css');
  const atelier=read('src/rpg-atelier.js');
  assert.match(app,/soloEffetti:true/);
  assert.match(css,/\.rpg-effetti-solo-stage > \.rpg-cosmic-ambiente/);
  assert.match(css,/\.rpg-effetti-solo-stage > \.rpg-foto-fondale/);
  assert.match(css,/\.rpg-effetti-solo-stage > \.rpg-energia-fronte/);
  assert.match(css,/\.rpg-effetti-solo-stage[\s\S]*?\.personaggio-ritratto \{[\s\S]*?opacity:1!important/);
  assert.doesNotMatch(atelier,/astrale-ambiente-v503\.webp|nebulosa-ambiente-v503\.webp/);
  assert.match(atelier,/const immagine=fxSenzaFoto \? fotoBase/);
  assert.match(atelier,/ctx\.drawImage\(immagine,dx,dy,dw,dh\);[\s\S]*?fase:'fronte',texture:texturaCosmica/);
});

test('v530: la scena FX non maschera il volto, il corpo o gli stivali',()=>{
  const calls=[];
  const cls=()=>({set:new Set(),add(x){this.set.add(x)},contains(x){return this.set.has(x)}});
  const make=(_tag,attrs)=>({
    className:attrs.class,classList:cls(),style:{},children:[],
    appendChild(el){this.children.push(el);el.parentNode=this},
  });
  const portrait={classList:cls(),addEventListener(){calls.push('portrait-load')}};
  const layer={};
  const grafica=make('div',{class:'grafica'});
  grafica.querySelector=selector=>selector.includes('rpg-astrale-presenza')?layer:
    selector.includes('personaggio-ritratto')?portrait:null;
  const scena=make('div',{class:'scena'});
  const result=montaScenaCosmicaRpg(scena,grafica,{
    classe:'assassino',effetto:'astrale',creaElemento:make,soloEffetti:true,
  });
  assert.equal(result,true);
  assert.equal(scena.children.length,1);
  assert.equal(scena.classList.contains('rpg-effetti-solo-scena'),true);
  assert.equal(scena.children[0].className.includes('rpg-effetti-solo-stage'),true);
  assert.deepEqual([...portrait.classList.set],[],'non alterare la foto originale');
  assert.deepEqual(calls,[],'non creare il vecchio panorama dal ritratto');
});

test('v530: Fumo usa vapori dal Canvas, Scarica tocca il corpo',t=>{
  const oldDoc=globalThis.document,oldRaf=globalThis.requestAnimationFrame;
  t.after(()=>{
    if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
    if(oldRaf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=oldRaf;
  });
  globalThis.document={createElement(){}};
  globalThis.requestAnimationFrame=()=>1;
  assert.equal(usaEffettiViviRpg('effetto-ombra'),true);
  const canvas=read('src/effetti-rpg-canvas.js');
  assert.match(canvas,/tipo==='effetto-ombra'\)smoke\(t\)/);
  assert.match(canvas,/\.006 \+ rnd\(ray.seed/);
  assert.match(canvas,/\*\.023\)/);
  const atelier=read('src/rpg-atelier.js');
  assert.match(atelier,/ctx\.drawImage\(canvasEffetto,0,0,dw,dh\)/);
});
