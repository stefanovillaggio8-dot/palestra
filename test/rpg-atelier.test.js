import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 CLASSI_ATELIER,ARMATURE_ATELIER,STADI_ATELIER,NUMERO_COMBINAZIONI_ATELIER,
 TITOLI_ATELIER,combinazioniRpg,opzioniAtelier,nomeFileAtelier,renderFotoAtelier,
} from '../src/rpg-atelier.js';

test('Copertura completa delle 7560 combinazioni RPG senza duplicati',()=>{
 const keys=new Set();
 const perClasse={guerriero:0,assassino:0,berserker:0};
 for(const cfg of combinazioniRpg()) {
   const key=nomeFileAtelier(cfg);
   assert.ok(!keys.has(key),'nome foto duplicato: '+key);
   keys.add(key);
   assert.ok(ARMATURE_ATELIER[cfg.classe].includes(cfg.armatura));
   assert.ok(cfg.stadio>=0&&cfg.stadio<STADI_ATELIER);
   assert.ok(TITOLI_ATELIER.includes(cfg.titolo));
   perClasse[cfg.classe]++;
 }
 assert.equal(NUMERO_COMBINAZIONI_ATELIER,7560);
 assert.equal(keys.size,NUMERO_COMBINAZIONI_ATELIER);
 for(const classe of CLASSI_ATELIER)assert.equal(perClasse[classe],2520);
});

test('Le armature delle altre classi non possono sovrapporsi',()=>{
 assert.equal(opzioniAtelier({
   classe:'assassino',armatura:'armatura-berserker-rabbia',
   effetto:'effetto-fulmine',corona:true,
 }).armatura,'');
 assert.equal(opzioniAtelier({classe:'guerriero',stadio:77}).stadio,5);
 assert.equal(opzioniAtelier({classe:'berserker',stadio:-3}).stadio,0);
 assert.equal(opzioniAtelier({classe:'assassino',titolo:'titolo-panca'}).titolo,'titolo-panca');
});

test('Ritratto e volto base non vengono rigenerati: viene usata la foto canonica',async()=>{
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const source=await readFile(new URL('../src/rpg-atelier.js',import.meta.url),'utf8');
 assert.match(app,/percorsoStato\(classeId, viso\.indice\)/);
 assert.match(app,/__anteprimaStato/);
 assert.match(app,/viso\.indice=profilo\.__anteprimaStato/);
 assert.match(source,/grafica\?\.querySelector\?\.\('\.personaggio-ritratto'\)/);
 assert.match(source,/ctx\.drawImage\(immagine,dx,dy,dw,dh\)/);
 assert.doesNotMatch(source,/AI_IMAGE|generateImage|fetch\(/);
});

test('Esporta realmente la foto combinata con le texture separabili',async(t)=>{
 const saveDoc=globalThis.document,saveImage=globalThis.Image;
 t.after(()=>{
   if(saveDoc===undefined)delete globalThis.document;else globalThis.document=saveDoc;
   if(saveImage===undefined)delete globalThis.Image;else globalThis.Image=saveImage;
 });
 const draws=[],texts=[];
 const ctx={
   save(){},restore(){},fillRect(){},fillText(x){texts.push(x)},
   drawImage(...args){draws.push(args)},
   get globalCompositeOperation(){return this._mode;},set globalCompositeOperation(mode){this._mode=mode;},
 };
 globalThis.document={createElement(tag){
   assert.equal(tag,'canvas');
   return {width:0,height:0,getContext:()=>ctx};
 }};
 globalThis.Image=class {
   naturalWidth=900;naturalHeight=1200;
   set src(v){this._src=v;this.onload?.();}
 };
 const ritratto={naturalWidth:450,naturalHeight:675,complete:true};
 const grafica={querySelector(selector){
   return selector==='.personaggio-ritratto'?ritratto:null;
 }};
 const out=await renderFotoAtelier(grafica,{
   classe:'assassino',stadio:2,effetto:'effetto-fulmine',
   skin:'skin-mitica',divina:true,corona:true,titolo:'titolo-panca',
 });
 assert.equal(out.width,780);assert.equal(out.height,1170);
 assert.ok(draws.length>=4,'ritratto originale + mitica + fulmine + divina + corona');
 assert.equal(draws[0][0],ritratto,'ritratto originale e non generato');
 assert.ok(texts.length>=1,'titolo presente nella foto');
});

test('L Atelier e lo Shop sono componenti solo UI senza cambiare lo stato account',async()=>{
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const ui=await readFile(new URL('../src/rpg-atelier-ui.js',import.meta.url),'utf8');
 assert.match(app,/Atelier · combina e salva foto/);
 assert.match(app,/testo:o\.icona\|\|'✦'/);
 assert.match(ui,/renderPersonaggio\(profile,st\)/);
 assert.match(ui,/Salva questa foto PNG/);
 assert.doesNotMatch(ui,/db\.salva|sb\.|aura -|spesa_aura|ricompense\.push/);
});
