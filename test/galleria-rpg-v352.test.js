import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import {CLASSI_GALLERIA,EFFETTI_GALLERIA,NOMI_GALLERIA,fotoGalleriaRpg,nomeGalleriaRpg,notaGalleriaRpg}
  from '../src/galleria-foto-rpg.js';
const leggi=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('Nove soggetti nello stesso ordine per Assassino, Guerriero, Berserker',()=>{
 assert.deepEqual(CLASSI_GALLERIA,['guerriero','assassino','berserker']);
 assert.equal(EFFETTI_GALLERIA.length,9);
 assert.equal(new Set(EFFETTI_GALLERIA.map(e=>e.id)).size,9);
 for(const c of CLASSI_GALLERIA){
  assert.ok(NOMI_GALLERIA[c]);
  for(const e of EFFETTI_GALLERIA){
   const src=fotoGalleriaRpg(c,e.id);
   assert.ok(src?.startsWith('img/personaggi/'),c+' '+e.id);
   assert.ok(src.endsWith('.webp'));
   assert.ok(nomeGalleriaRpg(c,e.id));
   assert.ok(notaGalleriaRpg(c,e.id));
  }
 }
 assert.equal(fotoGalleriaRpg('altra','ambra'),null);
});
test('Le 27 fotografie scelte esistono tutte nel repository',async()=>{
 for(const c of CLASSI_GALLERIA)
  for(const e of EFFETTI_GALLERIA)
    await access(new URL('../'+fotoGalleriaRpg(c,e.id),import.meta.url));
});
test('Cornice identica, navigazione accessibile, colori selezionati verdi',async()=>{
 const css=await leggi('stile-galleria-rpg.css');
 const js=await leggi('src/galleria-foto-rpg.js');
 const html=await leggi('galleria-aura.html');
 assert.match(css,/aspect-ratio:3\/4/);
 assert.match(css,/object-fit:cover/);
 assert.match(css,/object-position:50% 50%/);
 assert.match(css,/aria-pressed=true/);
 assert.match(css,/#65e5b8/);
 assert.match(js,/button\.setAttribute\('aria-pressed'/);
 assert.match(js,/modal\.showModal\(\)/);
 assert.match(html,/id="foto"/);
 assert.match(html,/id="classi"/);
 assert.match(html,/aria-live="polite"/);
});
test('Lo Shop apre la galleria vera della classe; Streak, inventario e acquisti intatti',async()=>{
 const app=await leggi('src/app.js');
 const sw=await leggi('sw.js');
 const index=await leggi('index.html');
 assert.match(app,/href:'\.\/galleria-aura\.html\?classe='\+classe/);
 assert.match(app,/await sb\.acquistaAura\(account, o\.id\)/);
 assert.match(app,/await db\.salva\('profili'/);
 const version=sw.match(/palestra-v(\d+)/)?.[1];
 assert.ok(version);
 for(const path of ["'./galleria-aura.html'",`'./stile-galleria-rpg.css?v=${version}'`,
   `'./src/galleria-foto-rpg.js?v=${version}'`])
  assert.ok(sw.includes(path),path);
 assert.match(index,new RegExp('palestra-v'+version));
});
