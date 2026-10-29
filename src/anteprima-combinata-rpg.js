// v335 — fotografie combinabili per ogni classe, livello e cosmetico.
// NON genera un nuovo volto o un nuovo corpo: parte sempre dalla fotografia
// originale dello stato Streak e ne conserva ogni pixel.
// Le texture degli effetti vengono applicate solo ATTORNO alla silhouette.
// Le combinazioni sono composte al momento: nessun limite prefissato di varianti.
import { AURA_FOTO_ATLAS } from './aura-foto-atlas.js';

export const CLASSI_FOTO_RPG = Object.freeze(['guerriero','assassino','berserker']);
export const EFFETTI_FOTO_RPG = Object.freeze([
  null,'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula',
]);
export const STATI_FOTO_RPG = 6;
const TESSERE = Object.freeze({
  'effetto-ambra':[0,0],
  'effetto-ombra':[1,0],
  'effetto-fulmine':[2,0],
  'effetto-nebula':[0,1],
  corona:[1,1],
  divina:[2,1],
});
const LOADED=new Map();
const MAX_CACHE=48;
let atlasPromise=null;

export function configurazioneFotoRpg({classe,stato,armatura=null,skin=null,effetto=null,divina=false,corona=false}={}) {
  const c=CLASSI_FOTO_RPG.includes(classe)?classe:'guerriero';
  const n=Math.max(0,Math.min(5,Math.trunc(Number(stato)||0)));
  const fx=EFFETTI_FOTO_RPG.includes(effetto)?effetto:null;
  return {classe:c,stato:n,armatura:armatura||null,skin:skin||null,effetto:fx,
    divina:Boolean(divina),corona:Boolean(corona)};
}
export function chiaveFotoRpg(config={}) {
  const v=configurazioneFotoRpg(config);
  return [v.classe,v.stato,v.armatura||'-',v.skin||'-',
    v.effetto||'-',Number(v.divina),Number(v.corona)].join('|');
}
export function contaCombinazioniFotoRpg({armaturePerClasse=3,skin=2,effetti=5}={}) {
  // Ogni stato originale mantiene la propria faccia, posa e arma sbloccata.
  return CLASSI_FOTO_RPG.length*STATI_FOTO_RPG*
    Math.max(1,Math.floor(armaturePerClasse))*Math.max(1,Math.floor(skin))*
    Math.max(1,Math.floor(effetti))*2*2;
}
export function immagineOriginalePreservata(config) {
  const {classe,stato}=configurazioneFotoRpg(config);
  return {classe,stato};
}

// Contorno conservativo del soggetto fotografato; prende anche mantello,
// braccia, armatura, scudo/ascia e NON modifica la fotografia originale.
// Il ritaglio sfuma per non produrre bordi seghettati.
const SAGOME={
  assassino:[[.00,.48,.52],[.12,.40,.59],[.19,.36,.64],
    [.28,.30,.71],[.43,.27,.75],[.60,.25,.77],[.78,.28,.73],[.94,.35,.66],[1,.40,.62]],
  guerriero:[[.00,.48,.52],[.09,.39,.61],[.19,.34,.65],
    [.28,.23,.79],[.45,.19,.87],[.61,.22,.84],[.78,.27,.77],[.96,.31,.73],[1,.37,.68]],
  berserker:[[.00,.48,.52],[.09,.37,.63],[.19,.30,.70],
    [.27,.19,.81],[.43,.14,.88],[.64,.16,.89],[.83,.23,.81],[.96,.29,.75],[1,.34,.70]],
};
export function fasciaSagoma(classe,y) {
  const points=SAGOME[classe]||SAGOME.guerriero;
  const v=Math.max(0,Math.min(1,y));
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i];
    if(v<=b[0]) {
      const t=(v-a[0])/(b[0]-a[0]);
      return [a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])];
    }
  }
  return points.at(-1).slice(1);
}

function getAtlas() {
  if(typeof Image!=='function')return Promise.resolve(null);
  if(!atlasPromise) {
    atlasPromise=new Promise(resolve=>{
      const image=new Image();
      image.onload=()=>resolve(image.naturalWidth?image:null);
      image.onerror=()=>resolve(null);
      image.src=AURA_FOTO_ATLAS;
    });
  }
  return atlasPromise;
}

function disegnaSprite(ctx,img,id,x,y,w,h) {
  if(!img?.naturalWidth)return;
  const cell=TESSERE[id];if(!cell)return;
  const iw=img.naturalWidth/3,ih=img.naturalHeight/2;
  ctx.drawImage(img,cell[0]*iw,cell[1]*ih,iw,ih,x,y,w,h);
}
function ritagliaPersona(ctx,classe,w,h) {
  const contour=SAGOME[classe]||SAGOME.guerriero;
  ctx.save();
  ctx.globalCompositeOperation='destination-out';
  // Sfumatura ampia, senza l'ovale netto che sembrava una foto ritagliata.
  // Se Safari non supporta filter, la scena resta comunque leggibile.
  ctx.filter='blur('+Math.max(18,Math.round(w*.05))+'px)';
  ctx.beginPath();
  contour.forEach(([y,left],i)=>{
    if(i===0)ctx.moveTo(w*left,y*h);
    else ctx.lineTo(w*left,y*h);
  });
  for(let i=contour.length-1;i>=0;i--) {
    const [y,,right]=contour[i];
    ctx.lineTo(w*right,y*h);
  }
  ctx.closePath();
  ctx.fillStyle='#000';ctx.fill();
  ctx.restore();
}
// Corona magica integrata: doppio anello, rune, scintille e bagliore riflesso.
// Non e' una texture singola incollata sulla testa.
export function disegnaCoronaEnergetica(ctx,w,h) {
 if(!ctx || typeof ctx.ellipse!=='function')return;
 const cx=w*.5,cy=h*.091,rx=w*.17,ry=h*.019;
 ctx.save();ctx.globalCompositeOperation='screen';
 ctx.shadowColor='#ffe29a';ctx.shadowBlur=w*.028;ctx.lineWidth=Math.max(1.2,w*.003);
 for(let k=0;k<2;k++){
   ctx.strokeStyle=k?'rgba(255,244,195,.72)':'rgba(255,184,77,.93)';
   ctx.beginPath();ctx.ellipse(cx,cy+k*h*.015,rx*(1+k*.16),ry*(1+k*.25),0,0,Math.PI*2);ctx.stroke();
 }
 // Le rune sospese orbitano visivamente sopra la fronte e non coprono il viso.
 ctx.lineWidth=Math.max(.8,w*.002);
 for(let i=0;i<11;i++){
   const theta=2*Math.PI*i/11,px=cx+Math.cos(theta)*w*.192;
   const py=cy+Math.sin(theta)*h*.024-h*.015;
   ctx.strokeStyle=i%2?'rgba(255,231,166,.90)':'rgba(255,180,86,.75)';
   ctx.beginPath();ctx.moveTo(px,py-h*.009);ctx.lineTo(px+w*.004,py);
   ctx.lineTo(px,py+h*.009);ctx.lineTo(px-w*.004,py);ctx.closePath();ctx.stroke();
 }
 // Scintille discendenti, meno luminose dei dettagli sulla testa.
 for(let i=0;i<9;i++){
  const angle=i*.87,px=cx+Math.sin(angle)*w*.25;
  const py=cy+h*(.028+(i%4)*.012);
  const r=Math.max(1,w*(.0015+(i%3)*.001));
  ctx.globalAlpha=.48+(i%3)*.14;
  ctx.fillStyle='#ffecc3';ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}

function generaLivello(c,atlas,width,height) {
  const layer=document.createElement('canvas');
  layer.width=width;layer.height=height;
  const ctx=layer.getContext('2d',{alpha:true});
  if(!ctx)return layer;
  // La foto dell'avatar resta sotto, intoccabile. Solo gli sfondi degli
  // effetti vengono disegnati su un canvas con centro ritagliato.
  const alpha=c.effetto==='effetto-nebula'?.78:.74;
  if(c.skin==='skin-mitica' && c.effetto!=='effetto-nebula') {
    ctx.save();ctx.globalAlpha=.32;
    disegnaSprite(ctx,atlas,'effetto-nebula',0,0,width,height);
    ctx.restore();
  }
  if(c.effetto) {
    ctx.save();ctx.globalAlpha=alpha;
    disegnaSprite(ctx,atlas,c.effetto,0,0,width,height);
    ctx.restore();
  }
  if(c.divina) {
    ctx.save();ctx.globalAlpha=.64;
    disegnaSprite(ctx,atlas,'divina',0,0,width,height);
    ctx.restore();
  }
  // Prima mascheriamo corpo e faccia: nessun fulmine, fumo o nebula
  // può attraversare il protagonista.
  ritagliaPersona(ctx,c.classe,width,height);
  if(c.corona) {
    // La Corona e' un dettaglio autonomo SOPRA la testa.
    // Non viene applicata a schermo intero sul petto.
    ctx.save();ctx.globalAlpha=.92;
    disegnaSprite(ctx,atlas,'corona',width*.31,height*.015,width*.38,height*.16);
    disegnaCoronaEnergetica(ctx,width,height);
    ctx.restore();
  }
  return layer;
}
function getCachedLayer(c,atlas,w,h) {
  const key=chiaveFotoRpg(c)+'@'+w+'x'+h;
  let image=LOADED.get(key);
  if(!image) {
    image=generaLivello(c,atlas,w,h);
    LOADED.set(key,image);
    if(LOADED.size>MAX_CACHE)LOADED.delete(LOADED.keys().next().value);
  }
  return image;
}

// Richiamabile per qualunque classe, livello, skin, armatura, effetto,
// Corona e Aura divina. Il canvas e' un livello fotografico, non un avatar.
export function montaFotoCombinataRpg(grafica,foto,options={}) {
  if(!grafica||!foto||typeof document==='undefined')return null;
  const c=configurazioneFotoRpg(options);
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext?.('2d',{alpha:true});
  if(!ctx)return null;
  canvas.className='rpg-foto-combinata';
  canvas.setAttribute('aria-hidden','true');
  canvas.dataset.combinazione=chiaveFotoRpg(c);
  grafica.appendChild(canvas);
  let disposed=false;
  const size=()=> {
    const w=Math.min(700,foto.naturalWidth||0);
    const h=w&&foto.naturalHeight?Math.round(w*foto.naturalHeight/foto.naturalWidth):0;
    if(w<2||h<2)return null;
    canvas.width=w;canvas.height=h;
    return [w,h];
  };
  const render=async()=>{
    const dims=size();
    if(!dims)return;
    const atlas=await getAtlas();
    if(disposed||!canvas.isConnected)return;
    // Se Safari non supporta l'AVIF o l'immagine e' danneggiata, non
    // nascondere gli effetti preesistenti: il fallback resta visibile.
    if(!atlas) { canvas.remove();return; }
    const layer=getCachedLayer(c,atlas,...dims);
    ctx.clearRect(0,0,...dims);
    ctx.drawImage(layer,0,0,...dims);
    // Nascondi i vecchi livelli solo dopo il primo frame fotografico pronto.
    grafica.classList.add('rpg-composite-active');
  };
  if(foto.complete&&foto.naturalWidth)void render();
  else foto.addEventListener('load',()=>{void render();},{once:true});
  canvas.addEventListener?.('DOMNodeRemoved',()=>{disposed=true;},{once:true});
  return canvas;
}

// Esporta una vera fotografia della combinazione corrente: avatar originale
// e skin fotografica + effetti. Non altera DB, progressione o equipaggiamento.
export async function scaricaFotoCombinataRpg(grafica,classe='rpg') {
  const original=grafica?.querySelector?.('.personaggio-ritratto');
  if(!original)return false;
  if(!original.complete||!original.naturalWidth) {
    await new Promise(resolve=>{original.addEventListener('load',resolve,{once:true});
      original.addEventListener('error',resolve,{once:true});});
  }
  if(!original.naturalWidth)return false;
  const out=document.createElement('canvas');
  out.width=Math.min(960,original.naturalWidth);
  out.height=Math.round(out.width*original.naturalHeight/original.naturalWidth);
  const ctx=out.getContext?.('2d');if(!ctx)return false;
  ctx.drawImage(original,0,0,out.width,out.height);
  const integrata=Boolean(original.dataset?.scenaCinematografica);
  const skin=grafica.querySelector('.rpg-skin-fedele');
  if(!integrata && skin?.width) {
    ctx.save();ctx.globalCompositeOperation='source-over';
    ctx.drawImage(skin,0,0,out.width,out.height);ctx.restore();
  }
  const effects=grafica.querySelector('.rpg-foto-combinata');
  if(!integrata && effects?.width)ctx.drawImage(effects,0,0,out.width,out.height);
  const data=out.toDataURL('image/png');
  const anchor=document.createElement('a');
  anchor.href=data;
  anchor.download='palestra-'+String(classe).replace(/[^a-z0-9-]/gi,'-')+'-'+
    (effects?.dataset?.combinazione||'base').replace(/[^a-z0-9-]/gi,'-')+'.png';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  return true;
}
