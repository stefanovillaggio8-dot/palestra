import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile,readdir} from 'node:fs/promises';
import {CLASSI_GALLERIA,EFFETTI_GALLERIA,
 fotoGalleriaApprovataRpg,fotoGalleriaRpg} from '../src/galleria-foto-rpg.js';
const file=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('27 foto approvate mappate esattamente alle tre classi e ai nove temi',()=>{
 const paths=new Set();
 for(const classe of CLASSI_GALLERIA)
  for(let i=0;i<EFFETTI_GALLERIA.length;i++){
   const id=EFFETTI_GALLERIA[i].id;
   const path=fotoGalleriaApprovataRpg(classe,id);
   assert.equal(path,'img/personaggi/galleria-v352/'+classe+'-'+String(i+1).padStart(2,'0')+'.webp');
   assert.ok(!paths.has(path));paths.add(path);
   assert.ok(fotoGalleriaRpg(classe,id)?.endsWith('.webp'));
  }
 assert.equal(paths.size,27);
 assert.equal(fotoGalleriaApprovataRpg('nessuno','base'),null);
 assert.equal(fotoGalleriaApprovataRpg('assassino','non-esistente'),null);
});
test('Le immagini approvate devono essere tutte presenti o tutte ancora in caricamento',async()=>{
 let files=[];
 try {files=await readdir(new URL('../img/personaggi/galleria-v352/',import.meta.url));}
 catch(err){if(err.code!=='ENOENT')throw err;}
 const photos=files.filter(name=>name.endsWith('.webp'));
 assert.ok(photos.length===0||photos.length===27,
  'Installazione incompleta: '+photos.length+' di 27 immagini');
 if(photos.length===27)
  for(const classe of CLASSI_GALLERIA)
   for(const e of EFFETTI_GALLERIA)
    await access(new URL('../'+fotoGalleriaApprovataRpg(classe,e.id),import.meta.url));
});
test('Fallback usa le foto gia pubblicate fino alla fine della pubblicazione degli asset',async()=>{
 const src=await file('src/galleria-foto-rpg.js');
 assert.match(src,/const esatta=fotoGalleriaApprovataRpg\(classe,eff.id\)/);
 assert.match(src,/img.src='\.\/'\+\(esatta\|\|precedente\)/);
 assert.match(src,/if\(fallbacks\+\+===0 && esatta\)/);
 assert.doesNotMatch(src,/localStorage\.|indexedDB\.|acquistaAura\(/);
});
test('Workflow installa le 27 foto, rimuove lo ZIP e aggiorna precache',async()=>{
 const workflow=await file('.github/workflows/installa-galleria-approvata.yml');
 assert.match(workflow,/aura-gallery-approved-v352.zip/);
 assert.match(workflow,/len\(files\)==27/);
 assert.match(workflow,/git rm aura-gallery-approved-v352.zip/);
 assert.match(workflow,/palestra-v354/);
 assert.match(workflow,/git push origin HEAD:main/);
});
