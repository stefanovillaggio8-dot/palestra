import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {percorsoRitaglioCosmicoRpg,montaRitaglioRealeRpg,verificaIntegritaRitaglioRpg,CUTOUT_VERIFICATI_RPG} from '../src/rpg-scena-cosmica.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v490 usa solo il PNG trasparente della STESSA foto originale',()=>{
 assert.deepEqual(CUTOUT_VERIFICATI_RPG,[
   'assassino-0','assassino-2','assassino-3','guerriero-0','berserker-0'
 ]);
 assert.equal(percorsoRitaglioCosmicoRpg('./img/personaggi/stati/assassino-3.webp?v=490'),
   './img/personaggi/cutout/stati/assassino-3.webp?v=490');
 assert.equal(percorsoRitaglioCosmicoRpg('https://example.com/palestra/img/personaggi/stati/guerriero-0.webp'),
   './img/personaggi/cutout/stati/guerriero-0.webp?v=490');
 assert.equal(percorsoRitaglioCosmicoRpg('./img/personaggi/stati/assassino-5.webp'),null);
 assert.equal(percorsoRitaglioCosmicoRpg('./img/personaggi/armatura-con-arma-v371/assassino/armatura-assassino-notte/base.webp'),null);
 assert.equal(percorsoRitaglioCosmicoRpg('./img/personaggi/stati/guerriero-3.webp'),null);
});

test('v491 il cutout resta invisibile finche alpha e geometria non sono verificati',()=>{
 const attached=[],states=new Set(),envStates=new Set();
 const envStyle={backgroundImage:'old',backgroundSize:'cover',backgroundPosition:'center'};
 const posizioni={};
 const grafica={appendChild:x=>attached.push(x),classList:{add:x=>states.add(x)},
   getBoundingClientRect:()=>({top:10,left:10,width:250,height:350})};
 const foto={getAttribute:()=> './img/personaggi/stati/assassino-3.webp?v=490',
   getBoundingClientRect:()=>({top:20,left:30,width:200,height:300})};
 const palco={classList:{add:x=>states.add(x)}};
 const ambiente={style:envStyle,classList:{remove:x=>envStates.add(x)}};
 const pixel=new Uint8ClampedArray(64*96*4);
 for(const [x,y] of [[.50,.18],[.50,.32],[.50,.48],[.43,.70],[.58,.70]]){
   pixel[(Math.round(y*95)*64+Math.round(x*63))*4+3]=255;
 }
 const prev=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({
   clearRect(){},drawImage(){},getImageData:()=>({data:pixel})
 })})};
 try {
   let probe;
   class FakeImage{
     constructor(){probe=this;this.naturalWidth=900;this.naturalHeight=1350;
       this.style={setProperty:(k,v)=>{posizioni[k]=v;}};}
     set src(s){this.actualSrc=s;}get src(){return this.actualSrc;}
   }
   assert.equal(montaRitaglioRealeRpg(grafica,foto,palco,ambiente,FakeImage),true);
   assert.equal(attached.length,0);
   probe.onload();
   assert.equal(attached[0],probe);
   assert.equal(posizioni.width,'200px');
   assert.equal(posizioni.height,'300px');
   assert.equal(posizioni.top,'10px');
   assert.equal(posizioni.left,'20px');
   assert.ok(states.has('rpg-cosmic-cutout-ready'));
   assert.equal(envStyle.backgroundImage,'');
   assert.ok(envStates.has('rpg-cosmic-photo-environment'));
   assert.equal(foto.getAttribute('src'),'./img/personaggi/stati/assassino-3.webp?v=490');
   pixel.fill(255); // fondale ancora opaco: deve essere rifiutato
   assert.equal(verificaIntegritaRitaglioRpg(probe),false);
 } finally {globalThis.document=prev;}
});

test('v490 nessuna variante sbagliata o fotografia che sparisce al caricamento fallito',()=>{
 const grafica={appendChild(){throw Error('non mostrare nulla prima del load');}};
 class FailedImage{constructor(){this.naturalWidth=0;this.naturalHeight=0;}set src(x){this.path=x;}}
 const hero={getAttribute:()=> './img/personaggi/stati/assassino-3.webp'};
 const palco={classList:{add(){throw Error('non attivare cutout quando fallisce');}}};
 const ambiente={style:{},classList:{remove(){}}};
 assert.equal(montaRitaglioRealeRpg(grafica,hero,palco,ambiente,FailedImage),true);
 assert.equal(montaRitaglioRealeRpg(grafica,{getAttribute:()=> './img/personaggi/stati/assassino-5.webp'},palco,ambiente,FailedImage),false);
});

test('v490 asset WEBP validi e separazione di chiaro/scuro senza foto originale',()=>{
 for(const name of CUTOUT_VERIFICATI_RPG){
   const bin=readFileSync(new URL('../img/personaggi/cutout/stati/'+name+'.webp',import.meta.url));
   assert.equal(bin.toString('ascii',0,4),'RIFF');
   assert.equal(bin.toString('ascii',8,12),'WEBP');
   assert.ok(bin.length>20_000);
 }
 const css=read('stile-rpg.css');
 const v490=css.slice(css.lastIndexOf('/* v490'));
 assert.match(v490,/rpg-cosmic-cutout-ready/);
 assert.match(v490,/rpg-cosmic-cutout-asset/);
 assert.match(v490,/opacity:0!important/);
 assert.match(v490,/mask-image:none!important/);
 assert.match(v490,/rpg-cosmic-ambiente/);
 assert.match(read('sw.js'),/palestra-v490/);
 assert.match(read('index.html'),/palestra-v490/);
 assert.match(read('src/app.js'),/ · v490/);
});

test('v490 esportazioni della stessa figura trasparente',()=>{
 const a=read('src/rpg-atelier.js'),e=read('src/anteprima-combinata-rpg.js');
 assert.match(a,/alphaAutentico/);
 assert.match(a,/ritaglioReale/);
 assert.match(a,/if\(alphaAutentico\)/);
 assert.match(e,/alphaPronto/);
 assert.match(e,/disegnaAtmosferaCosmicaRpg/);
 assert.match(e,/ctx\.drawImage\(cutout,0,0,out\.width,out\.height\)/);
 assert.match(e,/astrale-celestial-/);
 assert.match(e,/nebulosa-spirale-/);
});
