import { disegnaMaterialiArmaturaRpg } from './materiali-armature-rpg.js';

// Skin RPG v339: la fotografia sbloccata dalla Streak e' sempre la sorgente.
// Il rivestimento ritocca SOLO le zone degli abiti/protezioni: volto, postura,
// anatomia, equipaggiamento e sfondo rimangono quelli dello stato originale.
// Nessuna sagoma inventata, nessuna arma aggiunta prima dei giorni richiesti.
export const SKIN_RPG = Object.freeze({
  'armatura-guerriero-braci': { classe:'guerriero', colore:[238,100,40], luce:'#ffb164', intensita:.55, simbolo:'braci' },
  'armatura-guerriero-abisso': { classe:'guerriero', colore:[130,83,224], luce:'#b89cff', intensita:.63, simbolo:'abisso' },
  'armatura-assassino-notte': { classe:'assassino', colore:[68,123,176], luce:'#91c0ea', intensita:.5, simbolo:'notte' },
  'armatura-assassino-spettro': { classe:'assassino', colore:[195,55,91], luce:'#ff799e', intensita:.63, simbolo:'spettro' },
  'armatura-berserker-rabbia': { classe:'berserker', colore:[190,119,55], luce:'#ffbb67', intensita:.52, simbolo:'rabbia' },
  'armatura-berserker-apocalisse': { classe:'berserker', colore:[226,76,37], luce:'#ff9a5a', intensita:.64, simbolo:'apocalisse' },
  'skin-mitica': { classe:null, colore:[91,158,237], luce:'#c8e9ff', intensita:.64, simbolo:'astrale' },
});
const clamp = (a,min=0,max=1)=>Math.max(min,Math.min(max,a));
const liscio = (a,b,t)=>{const z=clamp((t-a)/(b-a));return z*z*(3-2*z);};
const ellisse = (x,y,cx,cy,rx,ry)=>{
  const d=Math.hypot((x-cx)/rx,(y-cy)/ry);
  return 1-liscio(.83,1.17,d);
};

/** La maschera esclude esplicitamente volto, capelli, cappuccio e mani. */
export function coperturaArmaturaRpg(classe,x,y) {
  if(y < .235 || y > .94) return 0;
  let aree=[];
  if(classe==='guerriero') {
    aree=[[.49,.405,.225,.20],[.315,.31,.105,.14],[.658,.32,.105,.14],
      [.49,.59,.195,.115],[.385,.747,.092,.16],[.595,.747,.093,.16],[.71,.46,.14,.16]];
  } else if(classe==='assassino') {
    aree=[[.5,.415,.19,.205],[.325,.375,.092,.145],[.675,.375,.092,.145],
      [.5,.58,.16,.13],[.401,.751,.071,.18],[.594,.751,.071,.18]];
  } else if(classe==='berserker') {
    aree=[[.49,.42,.245,.205],[.27,.36,.13,.15],[.72,.37,.13,.15],
      [.5,.59,.20,.14],[.39,.75,.09,.15],[.605,.75,.09,.15]];
  } else return 0;
  let maschera=0;
  for(const [cx,cy,rx,ry] of aree) maschera=Math.max(maschera,ellisse(x,y,cx,cy,rx,ry));
  // L'arma e il volto non vengono disegnati o ricostruiti dall'overlay.
  // La minima copertura sul collo preserva la silhouette e l'identita'.
  if(y<.31)maschera*=liscio(.235,.31,y);
  return clamp(maschera);
}

export function configurazioneSkinRpg(classe,armaturaId,skinId) {
  const id=skinId==='skin-mitica'?'skin-mitica':armaturaId;
  const valore=SKIN_RPG[id];
  if(!valore || (valore.classe && valore.classe!==classe)) return null;
  return { id, ...valore };
}

/**
 * Colora la tessitura della foto originale mediante un canvas trasparente.
 * mix-blend-mode:color preserva luci, ombre, dettagli e materiali dell'immagine.
 * Si ricalcola solo quando cambia foto o skin, mai a ogni frame.
 */
export function applicaSkinRpg(grafica,foto,classe,armaturaId,skinId) {
  const skin=configurazioneSkinRpg(classe,armaturaId,skinId);
  if(!grafica || !foto || !skin || typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.className='rpg-skin-fedele';
  canvas.setAttribute('aria-hidden','true');
  const ctx=typeof canvas.getContext==='function' ? canvas.getContext('2d',{willReadFrequently:true,alpha:true}) : null;
  if(!ctx)return null;
  grafica.appendChild(canvas);
  grafica.classList.add('rpg-skin-attiva');
  grafica.style.setProperty('--rpg-skin-glow',skin.luce);
  let disegnato=false;

  const dipingi=()=>{
    if(disegnato || !foto.naturalWidth || !foto.naturalHeight)return;
    // Massimo 480 px: texture fine per iPhone senza lavorare su 1,2M pixel.
    const w=Math.min(480,foto.naturalWidth);
    const h=Math.round(w*foto.naturalHeight/foto.naturalWidth);
    if(w<2||h<2)return;
    canvas.width=w;canvas.height=h;
    try{
      const base=document.createElement('canvas');
      base.width=w;base.height=h;
      const bctx=base.getContext('2d',{willReadFrequently:true});
      if(!bctx)return;
      bctx.drawImage(foto,0,0,w,h);
      const pixels=bctx.getImageData(0,0,w,h).data;
      const overlay=ctx.createImageData(w,h);
      const out=overlay.data;
      const col=skin.colore;
      for(let yy=0;yy<h;yy++){
        const y=yy/h;
        if(y<.235||y>.94)continue;
        for(let xx=0;xx<w;xx++){
          const x=xx/w,maschera=coperturaArmaturaRpg(classe,x,y);
          if(maschera<.025)continue;
          const i=4*(yy*w+xx);
          const lum=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
          // Sfondi molto scuri quasi invisibili. La tinta segue la luce del metallo.
          const dettaglio=liscio(18,103,lum);
          const morbido=(.55+.45*dettaglio);
          // Lievi iridescenze, mai pannelli piatti o geometrie sovrapposte.
          const trama=.88+.12*Math.sin(x*61+y*17)*Math.cos(y*43-x*11);
          out[i]=Math.round(clamp(col[0]*trama,0,255));
          out[i+1]=Math.round(clamp(col[1]*trama,0,255));
          out[i+2]=Math.round(clamp(col[2]*trama,0,255));
          // La tinta e' una velatura, non l'intera armatura: niente evidenziatore.
          // Le superfici, i cinturoni e le piastre vengono costruiti separatamente.
          out[i+3]=Math.round(255*skin.intensita*.20*maschera*morbido);
        }
      }
      ctx.putImageData(overlay,0,0);
      // Armature riconoscibili come capi differenti, sulle stesse fotografie.
      // Astrale si aggiunge alla corazza, invece di rimpiazzarla.
      disegnaMaterialiArmaturaRpg(ctx,w,h,classe,armaturaId,skinId);
      // Un piccolo sigillo nel petto differenzia le rarita' senza coprire il volto.
      const cx=w*.5,cy=h*(classe==='assassino'?.41:.405),radius=w*.023;
      ctx.save();
      ctx.globalAlpha=skin.simbolo==='astrale'?.68:.5;
      ctx.strokeStyle=skin.luce;
      ctx.shadowColor=skin.luce;ctx.shadowBlur=Math.max(1,w*.013);
      ctx.lineWidth=Math.max(1,w*.003);
      ctx.beginPath();
      if(skin.simbolo==='braci'||skin.simbolo==='apocalisse'){
        ctx.moveTo(cx,cy-radius);ctx.lineTo(cx+radius*.7,cy+radius*.5);
        ctx.lineTo(cx-radius*.7,cy+radius*.5);ctx.closePath();
      } else if(skin.simbolo==='abisso'||skin.simbolo==='spettro'){
        ctx.moveTo(cx,cy-radius);ctx.lineTo(cx+radius*.7,cy);
        ctx.lineTo(cx,cy+radius);ctx.lineTo(cx-radius*.7,cy);ctx.closePath();
      } else {
        ctx.arc(cx,cy,radius,0,Math.PI*2);
      }
      ctx.stroke();ctx.restore();
      disegnato=true;
    }catch{
      // Vecchi Safari/browser non abilitati alla lettura dei pixel: la foto resta
      // invariata anziche' mostrare un overlay rotto o bloccare il profilo.
      canvas.remove();
    }
  };
  if(foto.complete && foto.naturalWidth)dipingi();
  else foto.addEventListener('load',dipingi,{once:true});
  return canvas;
}
