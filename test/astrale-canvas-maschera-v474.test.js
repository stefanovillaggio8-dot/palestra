import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {montaEffettiRpg} from '../src/effetti-rpg-canvas.js';

const leggi=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v474: la maschera cancella i vapori ma non le aurore astrali appena disegnate', t=>{
  const names=['window','document','requestAnimationFrame','cancelAnimationFrame','matchMedia',
    'IntersectionObserver','ResizeObserver'];
  const prev=Object.fromEntries(names.map(k=>[k,globalThis[k]]));
  t.after(()=>{for(const [k,v] of Object.entries(prev)){
    if(v===undefined)delete globalThis[k];else globalThis[k]=v;
  }});
  globalThis.window={devicePixelRatio:2};
  let currentId=0;const pending=new Map(),canvases=[];
  globalThis.requestAnimationFrame=cb=>{pending.set(++currentId,cb);return currentId;};
  globalThis.cancelAnimationFrame=id=>pending.delete(id);
  globalThis.document={visibilityState:'visible',addEventListener(){},removeEventListener(){},
    createElement(tag){
      assert.equal(tag,'canvas');
      let clears=0,strokes=0,destinationOut=0;
      const ctx=new Proxy({
        createRadialGradient:()=>({addColorStop(){}}),
        clearRect:()=>{clears++;},
        stroke:()=>{strokes++;},
      },{
        get(obj,key){return key in obj?obj[key]:()=>{};},
        set(obj,key,val){if(key==='globalCompositeOperation'&&val==='destination-out')destinationOut++;
          obj[key]=val;return true;}
      });
      const canvas={className:'',setAttribute(){},getContext:()=>ctx,remove(){},
        counters:()=>({clears,strokes,destinationOut})};
      canvases.push(canvas);return canvas;
    }};
  delete globalThis.matchMedia;
  delete globalThis.IntersectionObserver;
  delete globalThis.ResizeObserver;
  const createHost=()=>({
    isConnected:true,
    classList:{add(){},remove(){},contains(){return false;}},
    appendChild(){},
    getBoundingClientRect(){return {width:340,height:500};}
  });
  const first=createHost();
  const stop=montaEffettiRpg(first,null,{mitica:true,classe:'assassino'});
  const [[id,cb]]=[...pending];pending.delete(id);
  assert.doesNotThrow(()=>cb(1000));
  const c=canvases[0].counters();
  assert.ok(c.clears>0,"Il motore deve renderizzare un vero frame");
  assert.ok(c.strokes>=10,'le aurore e le costellazioni devono essere disegnate');
  assert.equal(c.destinationOut,0,'non cancellare il portale astrale dopo averlo disegnato');
  stop();
  const second=createHost();
  const stopNebula=montaEffettiRpg(second,'effetto-nebula',{classe:'guerriero'});
  const [[id2,cb2]]=[...pending];pending.delete(id2);
  assert.doesNotThrow(()=>cb2(1020));
  assert.ok(canvases[1].counters().destinationOut>0,
    'le altre sfumature continuano a proteggere il volto con la propria maschera');
  stopNebula();
});

test('v474: il portale premium e precaricato offline, non copre il personaggio e non tocca i dati',()=>{
  const svg=leggi('img/effetti/astrale-sovrano-v474.svg');
  const css=leggi('stile-rpg.css');
  const sw=leggi('sw.js');
  const app=leggi('src/app.js');
  assert.match(svg,/viewBox="0 0 680 980"/);
  assert.match(svg,/<mask id="clearBody">/);
  assert.match(svg,/<ellipse cx="340" cy="510" rx="135" ry="345" fill="black"/);
  assert.ok((svg.match(/<path /g)||[]).length>=25,'costellazioni, scie e aure non solo due archi');
  assert.match(css,/url\('img\/effetti\/astrale-sovrano-v474\.svg'\)/);
  assert.match(css,/rpg-astrale-portale/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(sw,/\.\/img\/effetti\/astrale-sovrano-v474\.svg/);
  assert.match(app,/shop-skin-mitica/);
  assert.match(app,/rpg-astrale-presenza/);
  assert.doesNotMatch(svg,/script|onload\s*=|foreignObject/i);
  assert.doesNotMatch(css,/localStorage\.clear\(|indexedDB\.deleteDatabase/);
});
