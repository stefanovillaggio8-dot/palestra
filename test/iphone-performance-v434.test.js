import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { montaEffettiRpg } from '../src/effetti-rpg-canvas.js';

const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('iPhone v434: pre-cache a blocchi solo risorse essenziali e foto esercizi', async () => {
  const handlers = {};
  const batches = [];
  const cache = {
    addAll: async (items) => { batches.push(items.map(x => x.url)); },
  };
  const self = {
    location: { href: 'https://app.example/palestra/sw.js', origin: 'https://app.example' },
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: async () => {},
  };
  class RequestFinta {
    constructor(url, options) { this.url = url; this.cache = options.cache; }
  }
  vm.runInNewContext(sw, {self, Request: RequestFinta, URL, caches: {open: async () => cache}});
  let complete;
  handlers.install({waitUntil: (p) => {complete = p;}});
  await complete;
  assert.ok(batches.length > 2, 'installazione divisa in piu blocchi');
  assert.ok(batches.every(b => b.length > 0 && b.length <= 16));
  const risorse = batches.flat();
  assert.ok(risorse.includes('./index.html'));
  assert.ok(risorse.includes('./src/app.js?v=472'));
  assert.ok(risorse.includes('./img/esercizi/dips.png'));
  assert.equal(risorse.filter(p => /img\/personaggi\/stati\/.+\.webp/.test(p)).length, 18);
  assert.ok(!risorse.some(p => /img\/personaggi\/(?:galleria-v352|corona-v360|scene|armature)\//.test(p)));
  assert.equal(new Set(risorse).size, risorse.length, 'niente download doppi');
});

test('iPhone v434: effetti visibili, fermi sullo sfondo e fuori schermo', () => {
  const names = ['window','document','navigator','IntersectionObserver',
    'requestAnimationFrame','cancelAnimationFrame'];
  const old = Object.fromEntries(names.map(n => [n,globalThis[n]]));
  const descriptorNavigator = Object.getOwnPropertyDescriptor(globalThis,'navigator');
  const callbacks = new Map();
  const listeners = {};
  let seq=0, observer, draws=0, rimosso=0;
  const ctx = new Proxy({
    clearRect(){draws++;},
    createRadialGradient(){return {addColorStop(){}};},
  },{get(target,prop){return target[prop] || (() => {});}});
  globalThis.window = {devicePixelRatio: 3};
  Object.defineProperty(globalThis,'navigator',{configurable:true,writable:true,
    value:{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'}});
  globalThis.document = {
    visibilityState: 'visible',
    addEventListener(name,fn){listeners[name]=fn;},
    removeEventListener(name,fn){if(listeners[name]===fn)delete listeners[name];},
    createElement(name){
      assert.equal(name,'canvas');
      return {className:'', width:0, height:0, setAttribute(){},
        getContext(){return ctx;}, remove(){rimosso++;}};
    },
  };
  globalThis.IntersectionObserver = class {
    constructor(callback){this.callback=callback;observer=this;}
    observe(){}
    disconnect(){}
  };
  globalThis.requestAnimationFrame=fn=>{const id=++seq;callbacks.set(id,fn);return id;};
  globalThis.cancelAnimationFrame=id=>callbacks.delete(id);
  function frame(t){
    assert.ok(callbacks.size > 0,'frame pianificato');
    const [id,fn]=callbacks.entries().next().value;
    callbacks.delete(id);fn(t);
  }
  const host = {isConnected:true,
    appendChild(node){this.canvas=node;},
    getBoundingClientRect(){return {width:200,height:200};},
    classList:{add(){},remove(){},contains(){return false;}}};
  try {
    const ferma=montaEffettiRpg(host,'effetto-ambra');
    frame(1000);
    assert.equal(host.canvas.width,250,'iPhone usa DPR massimo 1.25');
    assert.ok(draws>0);
    observer.callback([{isIntersecting:false}]);
    frame(1020);
    assert.equal(callbacks.size,0,'nessun nuovo frame quando fuori schermo');
    observer.callback([{isIntersecting:true}]);
    frame(1090);
    globalThis.document.visibilityState='hidden';
    frame(1120);
    assert.equal(callbacks.size,0,'nessun frame con app in background');
    globalThis.document.visibilityState='visible';
    listeners.visibilitychange();
    frame(1200);
    assert.ok(draws>=3,'render ripreso quando visibile');
    ferma();ferma();
    assert.equal(callbacks.size,0);
    assert.equal(rimosso,1);
    assert.equal(listeners.visibilitychange,undefined);
  } finally {
    for (const n of names.filter(n => n !== 'navigator')) {
      if(old[n]===undefined)delete globalThis[n];
      else globalThis[n]=old[n];
    }
    if(descriptorNavigator)Object.defineProperty(globalThis,'navigator',descriptorNavigator);
    else delete globalThis.navigator;
  }
});

test('iPhone v434: timer seduta non ricostruisce il contatore ogni secondo', () => {
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const sync=readFileSync(new URL('../src/sync.js',import.meta.url),'utf8');
  assert.match(app,/if \(document\.visibilityState === 'hidden'\) return;/);
  assert.match(app,/if \(nuovaMisura === ultimoAvanzamento\) return;/);
  assert.match(sync,/Date\.now\(\) - ultimoRisveglio < 3000/);
  assert.match(sync,/document\.visibilityState === 'hidden'/);
});
