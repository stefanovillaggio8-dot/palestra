import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FOTO_RPG_PREMIUM,fotoPremiumRpg,sostituisciFotoQuandoProntaRpg}
 from '../src/foto-rpg-premium.js';

test('Le tre fotografie approvate hanno percorsi distinti',()=>{
 assert.equal(Object.keys(FOTO_RPG_PREMIUM).length,3);
 assert.match(fotoPremiumRpg('armatura-assassino-notte',null),/assassino-notte\.webp$/);
 assert.match(fotoPremiumRpg('armatura-assassino-notte','effetto-ombra'),/assassino-notte-ombra\.webp$/);
 assert.match(fotoPremiumRpg('armatura-assassino-spettro','effetto-nebula'),/assassino-spettro\.webp$/);
 assert.equal(fotoPremiumRpg('armatura-guerriero-braci','effetto-ombra'),null);
 assert.equal(fotoPremiumRpg(null,'effetto-ombra'),null);
});
test('Foto assente: resta intatta la fotografia della vera armatura',t=>{
 const old=globalThis.Image;
 t.after(()=>{if(old===undefined)delete globalThis.Image;else globalThis.Image=old;});
 const all=[];
 globalThis.Image=class {set src(v){all.push(v);this.onerror?.();}};
 const displayed={src:'img/personaggi/armature/assassino-notte.webp',isConnected:true};
 sostituisciFotoQuandoProntaRpg(displayed,'armatura-assassino-notte','effetto-ombra','?v=342');
 assert.equal(displayed.src,'img/personaggi/armature/assassino-notte.webp');
 assert.equal(all.length,1);
 assert.match(all[0],/assassino-notte-ombra\.webp\?v=342/);
});
test('Foto disponibile: si mostra veramente la fotografia completa, senza ricolorare volto e corpo',t=>{
 const old=globalThis.Image;
 t.after(()=>{if(old===undefined)delete globalThis.Image;else globalThis.Image=old;});
 globalThis.Image=class {set src(v){this.onload?.();}};
 const foto={src:'base',isConnected:true};
 sostituisciFotoQuandoProntaRpg(foto,'armatura-assassino-spettro',null,'?v=342');
 assert.equal(foto.src,'img/personaggi/fotografici/assassino-spettro.webp?v=342');
 const eliminata={src:'base',isConnected:false};
 sostituisciFotoQuandoProntaRpg(eliminata,'armatura-assassino-spettro',null);
 assert.equal(eliminata.src,'base');
});
test('Integrazione PWA: nessuna modifica a soldi, streak o account',async()=>{
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(app,/sostituisciFotoQuandoProntaRpg\(fotoRpg,armaturaEquipaggiata\?\.id/);
 assert.match(app,/const fotoArmaturaRpg = armaturaEquipaggiata\?\.immagine/);
 assert.match(sw,/\.\/src\/foto-rpg-premium\.js/);
 const source=await readFile(new URL('../src/foto-rpg-premium.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/db\.salva|sb\.|localStorage|acquistaAura|ricompense/);
});
