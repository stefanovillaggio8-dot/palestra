// v487: il vecchio rettangolo era nella FOTOGRAFIA, non nell'effetto SVG.
// Una maschera morbida per la sagoma (per classe) rimuove quel fondale.
// Manteniamo i pixel originali del personaggio, l'arma, l'armatura e lo zoom.
// Niente servizi remoti, niente nuovi asset e nessuna modifica al salvataggio.
import { CONTORNI_RPG } from './effetti-rpg-canvas.js';

const CLASSI=Object.freeze(['assassino','guerriero','berserker']);
const MASK_CACHE=new Map();

export function contornoCosmicoRpg(classe='assassino',w=680,h=980) {
  const righe=CONTORNI_RPG[CLASSI.includes(classe)?classe:'assassino'];
  const xy=(v)=>Number(v).toFixed(2);
  const left=righe.map(([y,l],i)=>(i?'L':'M')+xy(l*w)+','+xy(y*h)).join(' ');
  const right=righe.slice().reverse().map(([y,,r])=>'L'+xy(r*w)+','+xy(y*h)).join(' ');
  return left+' '+right+' Z';
}
export function mascheraCosmicaSvgRpg(classe='assassino') {
  const c=CLASSI.includes(classe)?classe:'assassino';
  if(MASK_CACHE.has(c))return MASK_CACHE.get(c);
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="680" height="980" viewBox="0 0 680 980">'
    +'<defs><filter id="sfuma" x="-25%" y="-15%" width="150%" height="130%">'
    +'<feGaussianBlur stdDeviation="14"/></filter>'
    +'<linearGradient id="alfa" x1="0" y1="0" x2="0" y2="1">'
    +'<stop offset="0" stop-color="white" stop-opacity="0"/>'
    +'<stop offset=".04" stop-color="white"/>'
    +'<stop offset=".97" stop-color="white"/>'
    +'<stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs>'
    +'<path d="'+contornoCosmicoRpg(c)+'" fill="url(#alfa)" filter="url(#sfuma)"/></svg>';
  const url='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
  MASK_CACHE.set(c,url);
  return url;
}
export function applicaMascheraCosmicaRpg(foto,classe='assassino') {
  if(!foto?.style)return false;
  const src=mascheraCosmicaSvgRpg(classe);
  foto.style.webkitMaskImage=src;
  foto.style.maskImage=src;
  foto.style.webkitMaskSize='100% 100%';
  foto.style.maskSize='100% 100%';
  foto.style.webkitMaskPosition='center';
  foto.style.maskPosition='center';
  foto.style.webkitMaskRepeat='no-repeat';
  foto.style.maskRepeat='no-repeat';
  foto.classList?.add?.('rpg-cosmic-subject');
  return true;
}
// Stessa sagoma nell'esportazione PNG: non ricompare il rettangolo quando
// premi "Salva foto della combinazione". Usa una sola passata Canvas 2D.
export function applicaMascheraCanvasRpg(ctx,w,h,classe='assassino') {
  if(!ctx||w<=0||h<=0)return false;
  const righe=CONTORNI_RPG[CLASSI.includes(classe)?classe:'assassino'];
  ctx.save();
  ctx.globalCompositeOperation='destination-in';
  if('filter' in ctx)ctx.filter='blur('+Math.max(4,Math.round(w*.020))+'px)';
  const grad=ctx.createLinearGradient?.(0,0,0,h);
  if(grad){
    grad.addColorStop(0,'rgba(255,255,255,0)');
    grad.addColorStop(.04,'rgba(255,255,255,1)');
    grad.addColorStop(.97,'rgba(255,255,255,1)');
    grad.addColorStop(1,'rgba(255,255,255,0)');
  }
  ctx.fillStyle=grad||'#fff';
  ctx.beginPath();
  for(let i=0;i<righe.length;i++){
    const [y,l]=righe[i];
    if(i===0)ctx.moveTo(l*w,y*h);else ctx.lineTo(l*w,y*h);
  }
  for(let i=righe.length-1;i>=0;i--){
    const [y,,r]=righe[i];ctx.lineTo(r*w,y*h);
  }
  ctx.closePath();ctx.fill();ctx.restore();
  return true;
}
export function disegnaAtmosferaCosmicaRpg(ctx,w,h,effetto='nebulosa') {
  if(!ctx || w<2 || h<2)return;
  ctx.save();
  ctx.fillStyle='#070a1b';ctx.fillRect(0,0,w,h);
  const ambient=effetto==='astrale'
    ?[[.50,.26,.46,'96,53,179',.45],[.08,.63,.36,'154,84,243',.39],[.91,.60,.34,'81,174,255',.42],[.49,.91,.40,'230,162,95',.29]]
    :[[.15,.23,.39,'92,185,255',.48],[.91,.55,.42,'168,83,245',.47],[.47,.92,.45,'80,160,248',.32],[.71,.21,.31,'100,82,229',.26]];
  for(const [cx,cy,rad,col,alpha] of ambient){
    const g=ctx.createRadialGradient?.(cx*w,cy*h,0,cx*w,cy*h,rad*w);
    if(!g)continue;
    g.addColorStop(0,'rgba('+col+','+alpha+')');
    g.addColorStop(1,'rgba('+col+',0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  ctx.restore();
}
// Estrae il soggetto dal medesimo scatto, anche per Corona e armature.
// I file originali non vengono sostituiti o modificati.
export function disegnaSoggettoCosmicoRpg(ctx,foto,dx,dy,w,h,classe='assassino',documento=globalThis.document) {
  if(!ctx||!foto||!documento?.createElement)return false;
  const out=documento.createElement('canvas');
  out.width=Math.max(1,Math.round(w));out.height=Math.max(1,Math.round(h));
  const sub=out.getContext?.('2d',{alpha:true});
  if(!sub)return false;
  sub.drawImage(foto,0,0,out.width,out.height);
  applicaMascheraCanvasRpg(sub,out.width,out.height,classe);
  ctx.drawImage(out,dx,dy,w,h);
  return true;
}
export function montaScenaCosmicaRpg(scena,grafica,{classe='assassino',effetto=null,creaElemento}={}) {
  if(!scena || !grafica || typeof scena.appendChild!=='function')return false;
  const layerName=effetto==='astrale'?'rpg-astrale-presenza'
    :effetto==='nebulosa'?'rpg-nebulosa-presenza':null;
  const layer=layerName && grafica.querySelector?.(':scope > .'+layerName);
  if(!layer || typeof creaElemento!=='function'){
    scena.appendChild(grafica);
    return false;
  }
  const classeId=CLASSI.includes(classe)?classe:'assassino';
  const palco=creaElemento('div',{class:'rpg-cosmic-stage rpg-cosmic-'+effetto+' personaggio-'+classeId});
  const ambiente=creaElemento('div',{class:'rpg-cosmic-ambiente',aria:{hidden:'true'}});
  const foto=grafica.querySelector?.(':scope > .personaggio-ritratto');
  applicaMascheraCosmicaRpg(foto,classeId);
  // Ordine pittorico: spazio continuo DIETRO, stesso soggetto centrale,
  // polvere e stelle DAVANTI, senza duplicare la figura.
  palco.appendChild(ambiente);
  palco.appendChild(grafica);
  palco.appendChild(layer);
  scena.appendChild(palco);
  return true;
}
