// v487: il vecchio rettangolo era nella FOTOGRAFIA, non nell'effetto SVG.
// Una maschera morbida per la sagoma (per classe) rimuove quel fondale.
// Manteniamo i pixel originali del personaggio, l'arma, l'armatura e lo zoom.
// Niente servizi remoti, niente nuovi asset e nessuna modifica al salvataggio.
import { CONTORNI_RPG } from './effetti-rpg-canvas.js';

const CLASSI=Object.freeze(['assassino','guerriero','berserker']);
const MASK_CACHE=new Map();
const MASK_RASTER_CACHE=new Map();
// La foto dell'eroe NON comincia al bordo superiore dello scatto.
// La maschera v487 iniziava a y=0 e lasciava una piramide di fondale sopra
// il cappuccio. Questi contorni includono mantelli, braccia, armi e scudi,
// ma partono dalla vera testa del soggetto.
export const FOTO_CONTORNI_COSMICI_RPG=Object.freeze({
  assassino:[[.065,.50,.50],[.09,.46,.54],[.13,.41,.59],[.18,.385,.62],
    [.22,.33,.69],[.30,.29,.74],[.43,.25,.77],[.56,.21,.80],
    [.66,.19,.81],[.73,.20,.80],[.78,.22,.78],[.81,.31,.72],
    [.88,.33,.71],[.94,.33,.72],[.98,.38,.70],[1,.50,.50]],
  guerriero:[[.052,.50,.50],[.085,.45,.56],[.14,.41,.61],[.18,.35,.67],
    [.25,.28,.76],[.31,.23,.89],[.44,.22,.90],[.59,.21,.91],
    [.63,.25,.90],[.69,.32,.79],[.81,.30,.77],[.92,.28,.77],
    [.98,.31,.75],[1,.50,.50]],
  berserker:[[.054,.50,.50],[.10,.42,.60],[.17,.35,.67],[.22,.23,.78],
    [.31,.18,.88],[.44,.19,.93],[.56,.19,.95],[.64,.19,.93],
    [.73,.23,.86],[.82,.27,.79],[.92,.27,.80],[.97,.32,.76],[1,.50,.50]],
});
// PNG alpha con bordi morbidi REALI: nei browser WebKit la GaussianBlur
// nell'SVG usato come mask-image veniva ignorata, lasciando un poligono netto.
export function mascheraCosmicaRasterRpg(classe='assassino',documento=globalThis.document) {
  const c=CLASSI.includes(classe)?classe:'assassino';
  if(MASK_RASTER_CACHE.has(c))return MASK_RASTER_CACHE.get(c);
  if(!documento?.createElement)return null;
  try {
    const canvas=documento.createElement('canvas');
    canvas.width=340;canvas.height=490;
    const ctx=canvas.getContext?.('2d',{alpha:true});
    if(!ctx || !canvas.toDataURL || !('filter' in ctx))return null;
    const punti=FOTO_CONTORNI_COSMICI_RPG[c];
    ctx.save();ctx.filter='blur(11px)';ctx.fillStyle='#fff';
    ctx.beginPath();
    punti.forEach(([y,l],i)=>i?ctx.lineTo(l*340,y*490):ctx.moveTo(l*340,y*490));
    for(let i=punti.length-1;i>=0;i--){const [y,,r]=punti[i];ctx.lineTo(r*340,y*490);}
    ctx.closePath();ctx.fill();ctx.restore();
    const result='url('+JSON.stringify(canvas.toDataURL('image/png'))+')';
    MASK_RASTER_CACHE.set(c,result);
    return result;
  } catch {return null;}
}


export function contornoCosmicoRpg(classe='assassino',w=680,h=980) {
  const righe=FOTO_CONTORNI_COSMICI_RPG[CLASSI.includes(classe)?classe:'assassino'];
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
  const src=mascheraCosmicaRasterRpg(classe)||mascheraCosmicaSvgRpg(classe);
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
// Esportazione coerente con l'anteprima: usa lo STESSO scatto
// sfocato per raccordare la luce al nuovo fondale, mai il ritratto rettangolare.
export function disegnaSfondoFotograficoCosmicoRpg(ctx,foto,w,h) {
  if(!ctx || !foto || !('filter' in ctx))return false;
  ctx.save();
  try {
    ctx.filter='blur(28px) brightness(.48) saturate(1.35)';
    ctx.globalAlpha=.72;
    ctx.drawImage(foto,-22,-22,w+44,h+44);
  }catch {ctx.restore();return false;}
  ctx.restore();
  return true;
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
  // Un raccordo fotografico reale: il fondale cosmico deriva dalla STESSA
  // immagine che viene mascherata, quindi illuminazione e toni coincidono.
  // La foto e l'equipaggiamento restano intatti.
  if(foto?.addEventListener && ambiente?.style){
    const aggiornaSfondo=()=>{
      const src=foto.currentSrc||foto.src;
      if(!src)return;
      ambiente.style.backgroundImage=
        'linear-gradient(150deg,rgba(13,12,50,.42),rgba(13,13,46,.52)),'
        +'radial-gradient(ellipse at 50% 40%,rgba(90,89,180,.25),transparent 90%),'
        +'url('+JSON.stringify(src)+')';
      ambiente.style.backgroundSize='cover,cover,cover';
      ambiente.style.backgroundPosition='center,center,center';
      ambiente.classList?.add?.('rpg-cosmic-photo-environment');
    };
    aggiornaSfondo();
    foto.addEventListener('load',aggiornaSfondo);
  }
  // Ordine pittorico: spazio continuo DIETRO, stesso soggetto centrale,
  // polvere e stelle DAVANTI, senza duplicare la figura.
  palco.appendChild(ambiente);
  palco.appendChild(grafica);
  palco.appendChild(layer);
  scena.appendChild(palco);
  montaRitaglioRealeRpg(grafica,foto,palco,ambiente);
  return true;
}

/**
 * v490: SOLO ritagli alpha realmente presenti sul repository.
 * Non inventare una foto di stato/armatura differente per una combinazione.
 * Le altre foto mantengono il fallback esistente finché non avranno
 * anch'esse il proprio ritaglio approvato.
 */
export const CUTOUT_VERIFICATI_RPG=Object.freeze([
  'assassino-0','assassino-2','assassino-3','guerriero-0','berserker-0'
]);
const CUTOUT_PRESENTI_RPG=new Set(CUTOUT_VERIFICATI_RPG);
export function percorsoRitaglioCosmicoRpg(source) {
  const src=String(source||'').split(/[?#]/)[0].replaceAll('\\','/');
  const match=src.match(/(?:^|\/)img\/personaggi\/stati\/(assassino|guerriero|berserker)-([0-5])\.webp$/);
  if(!match)return null;
  const key=match[1]+'-'+match[2];
  return CUTOUT_PRESENTI_RPG.has(key)?'./img/personaggi/cutout/stati/'+key+'.webp?v=490':null;
}
/** Fotografia intatta nel DOM, vero soggetto alpha inserito SOPRA di essa.
  * Solo quando il ritaglio e' stato caricato si nasconde la foto col fondale.
  * Non serve una vecchia maschera per la sagoma: il WebP ha pixel trasparenti.
  */
export function montaRitaglioRealeRpg(grafica,foto,palco,ambiente,ImageClass=typeof Image==='function'?Image:null) {
  if(!grafica||!foto||!palco||!ambiente||!ImageClass)return false;
  const path=percorsoRitaglioCosmicoRpg(foto.getAttribute?.('src')||foto.currentSrc||foto.src);
  if(!path)return false;
  const ritaglio=new ImageClass();
  ritaglio.className='rpg-cosmic-cutout-asset';
  ritaglio.alt='';
  ritaglio.decoding='async';
  ritaglio.onload=()=>{
    if(!ritaglio.naturalWidth||!ritaglio.naturalHeight)return;
    grafica.appendChild(ritaglio);
    palco.classList?.add?.('rpg-cosmic-cutout-ready');
    grafica.classList?.add?.('rpg-cosmic-cutout-inserted');
    ambiente.classList?.remove?.('rpg-cosmic-photo-environment');
    if(ambiente.style){
      ambiente.style.backgroundImage='';
      ambiente.style.backgroundSize='';
      ambiente.style.backgroundPosition='';
    }
  };
  ritaglio.onerror=()=>{ /* Nessun placeholder nero: la foto originale resta visibile. */ };
  ritaglio.src=path;
  return true;
}
