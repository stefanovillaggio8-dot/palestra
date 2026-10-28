import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
test('service worker usa la release completa in cache e non interroga il database', async () => {
  const eventi = {};
  let rete = 0;
  const cache = { match: async r => String(r.url || r).includes('src/app.js') ? new Response('release stabile') : String(r) === './index.html' ? new Response('app offline') : null };
  const contesto = { self: { location: {origin:'https://esempio.test',href:'https://esempio.test/palestra/sw.js'}, addEventListener: (n,fn)=>eventi[n]=fn },
    caches:{open:async()=>cache}, fetch:async()=>{rete++;throw Error('offline');}, Response, URL, Request };
  vm.runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),contesto);
  let risposta;
  eventi.fetch({request:{url:'https://esempio.test/palestra/src/app.js?v=328',method:'GET'},respondWith:r=>risposta=r});
  assert.equal(await (await risposta).text(),'release stabile');
  assert.equal(rete,0);
  eventi.fetch({request:{url:'https://esempio.test/palestra/?p=1',method:'GET',mode:'navigate'},respondWith:r=>risposta=r});
  assert.equal(await (await risposta).text(),'app offline');
  risposta=null;
  eventi.fetch({request:{url:'https://progetto.supabase.co/rest/v1/serie',method:'GET'},respondWith:r=>risposta=r});
  assert.equal(risposta,null);
});
