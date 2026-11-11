import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {montaEffettiRpg} from '../src/effetti-rpg-canvas.js';

test('v472: Astrale mitico e diverso dalla Nebulosa e mantiene la foto intatta',()=>{
  const file=readFileSync(new URL('../src/effetti-rpg-canvas.js',import.meta.url),'utf8');
  assert.match(file,/function astrale\(t\)/);
  const parte=file.slice(file.indexOf('function astrale(t)'),file.indexOf('function aura(t)'));
  for(const elemento of ['stelleAstrali','Comete','ctx\.ellipse','puntoLaterale','shadowBlur'])
    assert.match(parte,new RegExp(elemento,'i'));
  assert.match(file,/if\(mitica\) \{/);
  assert.match(file,/mitica \? Array\.from/,'le stelle extra si creano soltanto per il mitico');
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/effettoCosmicoAttivo \|\| \(!fotoCoronaRpg && !fotoArmaturaArmataRpg/,
    'Astrale animato anche con Corona e armatura');
  assert.match(file,/astrale\(t\)/);
  assert.match(file,/if\(tipo==='effetto-nebula'\)nebula\(t\)/);
  assert.doesNotMatch(parte,/acquistaAura|db\.salva|salvaSerie|recordStreak/);
});

test('v472: Astrale si disegna, libera il canvas e rispetta riduzione movimento',t=>{
  const saved={};for(const key of ['window','document','requestAnimationFrame','cancelAnimationFrame','matchMedia'])
    saved[key]=globalThis[key];
  t.after(()=>{for(const [key,v] of Object.entries(saved))
    if(v===undefined)delete globalThis[key];else globalThis[key]=v;});
  globalThis.window={devicePixelRatio:3};
  let drawn=0,removed=0;const pending=new Map();let id=0;
  const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}}),
    clearRect:()=>drawn++}, {get(target,key){return key in target?target[key]:()=>{};}});
  globalThis.document={visibilityState:'visible',createElement:()=>({
    setAttribute(){},getContext:()=>ctx,remove(){removed++;},
  }),addEventListener(){},removeEventListener(){}};
  globalThis.requestAnimationFrame=fn=>{pending.set(++id,fn);return id;};
  globalThis.cancelAnimationFrame=n=>pending.delete(n);
  globalThis.matchMedia=()=>({matches:true});
  const host={isConnected:true,appendChild(){},
    getBoundingClientRect(){return {width:240,height:330};}};
  const stop=montaEffettiRpg(host,null,{mitica:true,classe:'berserker'});
  assert.equal(pending.size,1);
  const [[next,fn]]=[...pending];pending.delete(next);
  assert.doesNotThrow(()=>fn(1000));
  assert.ok(drawn>0,'disegno astrale eseguito');
  assert.equal(pending.size,0,'prefers-reduced-motion non anima continuamente');
  stop();stop();assert.equal(removed,1);
});
