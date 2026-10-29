import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ORDINE_RARITA_AURA,ordinaPerRaritaAura} from '../src/aura-skin.js';

const items=[
 {id:'mitico',nome:'Astrale',rarita:'Mitico',prezzo:22000,tipo:'Skin'},
 {id:'raro2',nome:'Panca e basta',rarita:'Raro',prezzo:2400,tipo:'Titolo'},
 {id:'epico1',nome:'Scarica viola',rarita:'Epico',prezzo:7200,tipo:'Effetto'},
 {id:'comune1',nome:'Scintille ambra',rarita:'Comune',prezzo:4500,tipo:'Effetto'},
 {id:'leggendario',nome:'Nebulosa',rarita:'Leggendario',prezzo:8900,tipo:'Effetto'},
 {id:'comune0',nome:'Cardio',rarita:'Comune',prezzo:1600,tipo:'Titolo'},
 {id:'raro1',nome:'Panca',rarita:'Raro',prezzo:2200,tipo:'Titolo'},
 {id:'epico0',nome:'Ego',rarita:'Epico',prezzo:3400,tipo:'Titolo'},
];
test('Rarità in ordine crescente Comune > Raro > Epico > Leggendario > Mitico',()=>{
 assert.deepEqual(ORDINE_RARITA_AURA,['Comune','Raro','Epico','Leggendario','Mitico']);
 const sorted=ordinaPerRaritaAura(items);
 assert.deepEqual(sorted.map(x=>x.id),['comune0','comune1','raro1','raro2','epico0','epico1','leggendario','mitico']);
 assert.equal(items[0].id,'mitico','l elenco originale non viene mutato');
});
test('Filtri e inventario seguono lo stesso ordine senza modificare gli oggetti',()=>{
 for(const filtro of ['Titolo','Effetto','Skin']){
   const filtered=ordinaPerRaritaAura(items.filter(x=>x.tipo===filtro));
   const indices=filtered.map(x=>ORDINE_RARITA_AURA.indexOf(x.rarita));
   assert.deepEqual(indices,[...indices].sort((a,b)=>a-b));
 }
 const acquistati=ordinaPerRaritaAura(items.filter(x=>['epico1','comune0','mitico'].includes(x.id)));
 assert.deepEqual(acquistati.map(x=>x.id),['comune0','epico1','mitico']);
 const prezzi=Object.fromEntries(items.map(x=>[x.id,x.prezzo]));
 for(const item of ordinaPerRaritaAura(items))assert.equal(item.prezzo,prezzi[item.id]);
});
test('Il codice del negozio usa il criterio nuovo, non il vecchio raggruppamento per tipo',async()=>{
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const shop=app.slice(app.indexOf('function vistaAuraShop('),app.indexOf('function disegnaDentro('));
 assert.match(shop,/const elenco=ordinaPerRaritaAura\(OGGETTI_AURA\.filter/);
 assert.match(shop,/const oggettiPosseduti=ordinaPerRaritaAura\(/);
 assert.doesNotMatch(shop,/ordineTipi=/);
 assert.match(shop,/for\(const f of \['Tutti','Armatura','Effetto','Skin','Titolo'\]\)/);
 assert.match(shop,/await sb\.acquistaAura\(account, o\.id\)/);
});
