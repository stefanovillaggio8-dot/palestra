import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mascheraCosmicaSvgRpg,contornoCosmicoRpg,
  applicaMascheraCosmicaRpg,applicaMascheraCanvasRpg,
  disegnaSoggettoCosmicoRpg,disegnaAtmosferaCosmicaRpg
} from '../src/rpg-scena-cosmica.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v487 tre sagome distinte, SVG morbido e nessun crop rettangolare',()=>{
 const results=[];
 for(const classe of ['assassino','guerriero','berserker']){
   const url=mascheraCosmicaSvgRpg(classe);
   const svg=decodeURIComponent(url.slice(url.indexOf(',')+1,-2));
   assert.match(svg,/<svg/);
   assert.match(svg,/feGaussianBlur stdDeviation="14"/);
   assert.match(svg,/linearGradient id="alfa"/);
   assert.match(svg,/path d="M[0-9.]+,[0-9.]+/);
   assert.match(svg,/width="680" height="980"/);
   const d=contornoCosmicoRpg(classe);
   assert.ok(d.length>150);
   results.push(d);
 }
 assert.equal(new Set(results).size,3);
});
test('v487 i pixel originali del ritratto restano, cambiata solo trasparenza dello sfondo',()=>{
 for(const classe of ['assassino','guerriero','berserker']){
   const names=[];
   const image={style:{},classList:{add:n=>names.push(n)}};
   assert.equal(applicaMascheraCosmicaRpg(image,classe),true);
   assert.match(image.style.maskImage,/^radial-gradient\(|^url\("data:image\/png/,
     'le foto Shop devono avere margini sfumati senza sagome rigide');
   assert.equal(image.style.maskImage,image.style.webkitMaskImage);
   assert.equal(image.style.maskSize,'100% 100%');
   assert.equal(image.style.webkitMaskSize,'100% 100%');
   assert.equal(image.style.maskRepeat,'no-repeat');
   assert.ok(names.includes('rpg-cosmic-subject'));
 }
 assert.equal(applicaMascheraCosmicaRpg(null),false);
});
test('v487 PNG: matte con alpha e stessa sagoma in tutte e tre le classi',()=>{
 for(const classe of ['assassino','guerriero','berserker']){
   const stats={mask:0,path:0,gradient:0};
   const ctx=new Proxy({
     save(){},restore(){},beginPath(){},closePath(){},fill(){},
     moveTo(){stats.path++},lineTo(){stats.path++},
     createLinearGradient(){stats.gradient++;return {addColorStop(){}};}
   },{set(o,k,v){if(k==='globalCompositeOperation'&&v==='destination-in')stats.mask++;o[k]=v;return true;},
      get(o,k){return k in o?o[k]:()=>{};}});
   assert.equal(applicaMascheraCanvasRpg(ctx,300,450,classe),true);
   assert.equal(stats.mask,1);assert.ok(stats.path>=20);assert.equal(stats.gradient,1);
 }
});
test('v487 PNG export conserva arma, skin e lo stesso scatto senza nuovo WebP',()=>{
 const a=read('src/rpg-atelier.js');
 assert.doesNotMatch(a,/disegnaAtmosferaCosmicaRpg\(ctx,larghezza,altezza/,
   'la foto non deve avere un fondale cosmico aggiunto');
 assert.ok(!a.includes('disegnaSoggettoCosmicoRpg(ctx,immagine,dx,dy,dw,dh,c.classe)'));
 assert.ok(a.includes('ctx.drawImage(immagine,dx,dy,dw,dh)'));
 assert.match(a,/disegnaFotografiaFusaRpg\(ctx,immagine,dx,dy,dw,dh\)/);
 assert.match(a,/disegnaSoggettoCosmicoRpg\(ctx,pelle,dx,dy,dw,dh,c.classe\)/);
 const styles=read('stile-rpg.css').slice(read('stile-rpg.css').lastIndexOf('/* v487'));
 assert.match(styles,/rpg-cosmic-subject/);
 assert.match(styles,/mask-size:100% 100%!important/);
 assert.doesNotMatch(styles,/\.rpg-astrale-presenza\s*\{[^}]*object-fit/);
 assert.match(read('sw.js'),/palestra-v\d+/);
 assert.match(read('index.html'),/palestra-v\d+/);
});
