import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CUTOUT_VERIFICATI_RPG,percorsoRitaglioCosmicoRpg} from '../src/rpg-scena-cosmica.js';

const text = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const file = path => readFileSync(new URL('../'+path,import.meta.url));

test('v491: tutti i 18 stati conservano un WebP realmente trasparente',()=>{
 assert.equal(CUTOUT_VERIFICATI_RPG.length,18);
 assert.equal(new Set(CUTOUT_VERIFICATI_RPG).size,18);
 for(const classe of ['assassino','guerriero','berserker']){
  for(let stadio=0;stadio<6;stadio++){
   const key=classe+'-'+stadio;
   assert.ok(CUTOUT_VERIFICATI_RPG.includes(key),'manca '+key);
   const bin=file('img/personaggi/cutout/stati/'+key+'.webp');
   assert.equal(bin.toString('ascii',0,4),'RIFF',key);
   assert.equal(bin.toString('ascii',8,12),'WEBP',key);
   const pos=bin.indexOf(Buffer.from('VP8X'));
   assert.ok(pos>0,'formato WEBP esteso obbligatorio '+key);
   assert.ok(bin[pos+8]&16,'alpha non dichiarato '+key);
   assert.ok(bin.indexOf(Buffer.from('ALPH'))>0,'chunk alpha mancante '+key);
   assert.ok(bin.length>20_000,'asset insolitamente piccolo '+key);
   assert.match(percorsoRitaglioCosmicoRpg('./img/personaggi/stati/'+key+'.webp'),/webp\?v=493$/);
  }
 }
});

test('versione PWA coerente fra SW, pagina, JS e CSS anche dopo gli aggiornamenti',()=>{
 const sw=text('sw.js'),html=text('index.html');
 const version=sw.match(/const VERSIONE = 'palestra-v(\d+)'/)?.[1];
 assert.ok(version && Number(version)>=490,'versione software leggibile');
 for(const path of ['stile.css','stile-rpg.css','stile-premium.css','src/app.js']){
   assert.ok(html.includes(path+'?v='+version),'HTML disallineato: '+path);
   assert.ok(sw.includes(path+'?v='+version),'SW disallineato: '+path);
 }
 assert.ok(html.includes("window.PALESTRA_VERSIONE = 'palestra-v"+version+"'"),'HTML versione diversa');
});
