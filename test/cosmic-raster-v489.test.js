import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOTO_CONTORNI_COSMICI_RPG,mascheraCosmicaRasterRpg,mascheraCosmicaSvgRpg,
  montaScenaCosmicaRpg} from '../src/rpg-scena-cosmica.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v489 tre profili fotografici morbidi proteggono testa e armi, nessuna cima rettangolare',()=>{
 for(const classe of ['assassino','guerriero','berserker']){
   const punti=FOTO_CONTORNI_COSMICI_RPG[classe];
   assert.ok(punti.length>=13);
   assert.ok(punti[0][0]>.04 && punti[0][0]<.10,'testa reale non parte da y=0');
   for(const [y,l,r] of punti)assert.ok(y>=0&&y<=1&&l>=0&&l<=.5&&r>=.5&&r<=1);
   assert.equal(punti.at(-1)[0],1);
 }
});
test('v489 browser usa PNG con blur raster (non l SVG sfumato dal renderer)',()=>{
 let paintBlur='',draws=0;
 const ctx={filter:'none',save(){},restore(){this.filter='none';},beginPath(){},closePath(){},
   moveTo(){},lineTo(){},fill(){draws++;paintBlur=this.filter;},
   set fillStyle(v){},get fillStyle(){return '#fff';}};
 const documento={createElement:()=>({width:0,height:0,
   getContext:()=>ctx,toDataURL:()=> 'data:image/png;base64,abc'})};
 const mask=mascheraCosmicaRasterRpg('assassino',documento);
 assert.equal(mask,'url("data:image/png;base64,abc")');
 assert.equal(paintBlur,'blur(11px)');
 assert.equal(draws,1);
 assert.match(mascheraCosmicaSvgRpg('assassino'),/data:image\/svg\+xml/);
});
test('v489 sfondo continuo ricavato dal medesimo ritratto, anche quando src cambia',()=>{
 const foto={style:{},src:'/img/personaggi/stati/assassino-0.webp',
   addEventListener:(name,fn)=>{foto.reload=fn;},
   classList:{add(){}},parentNode:null};
 const fx={className:'rpg-nebulosa-presenza',parentNode:null};
 const grafica={children:[foto,fx],parentNode:null,
   querySelector(s){return s.includes('personaggio-ritratto')?foto:fx;}};
 const root={children:[],appendChild(x){this.children.push(x);}};
 const make=(_,attrs)=>({className:attrs.class,style:{},classList:{add(n){this[n]=true}},
   children:[],appendChild(c){this.children.push(c);c.parentNode=this;}});
 assert.equal(montaScenaCosmicaRpg(root,grafica,{classe:'assassino',effetto:'nebulosa',creaElemento:make}),true);
 const stage=root.children[0],back=stage.children[0];
 assert.ok(back.style.backgroundImage.includes('assassino-0.webp'));
 foto.currentSrc='/img/personaggi/stati/assassino-5.webp';
 foto.reload();
 assert.ok(back.style.backgroundImage.includes('assassino-5.webp'));
});
test('v506 PNG esportato sfuma il vero ritratto, senza sostituirlo con un cielo cosmico',()=>{
 const helper=read('src/rpg-scena-cosmica.js'),atelier=read('src/rpg-atelier.js');
 assert.match(helper,/blur\(28px\) brightness\(\.48\) saturate\(1\.35\)/);
 assert.match(helper,/ctx\.globalCompositeOperation='destination-in'/);
 assert.match(atelier,/disegnaFotografiaFusaRpg\(ctx,immagine,dx,dy,dw,dh\)/);
 assert.doesNotMatch(atelier,/else disegnaAtmosferaCosmicaRpg\(/);
 assert.match(read('sw.js'),/palestra-v\d+/);
 assert.match(read('index.html'),/palestra-v\d+/);
});
