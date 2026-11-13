// v487: il vecchio rettangolo era nella FOTOGRAFIA, non nell'effetto SVG.
// Una maschera morbida per la sagoma (per classe) rimuove quel fondale.
// Manteniamo i pixel originali del personaggio, l'arma, l'armatura e lo zoom.
// Niente servizi remoti, niente nuovi asset e nessuna modifica al salvataggio.
import { CONTORNI_RPG } from './effetti-rpg-canvas.js';
import { montaEnergiaIncarnataRpg } from './rpg-energia-incarnata.js';

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
  // v492: stelle a profondità variabile, con posizioni DETERMINISTICHE per
  // esportazioni coerenti. Le sorgenti luminose appartengono al fondale.
  const fract=n=>n-Math.floor(n);
  const random=n=>fract(Math.sin(n*127.1+19.37)*43758.5453);
  for(let i=0;i<84;i++){
    const x=random(i*3+1)*w,y=random(i*3+2)*h;
    const radius=(.45+random(i*7+4)*1.5)*Math.min(w/780,1.8);
    const opacity=.18+random(i*11+5)*.65;
    ctx.fillStyle=effetto==='astrale'
      ?'rgba(250,221,255,'+opacity+')'
      :'rgba(205,237,255,'+opacity+')';
    ctx.fillRect(x,y,Math.max(.65,radius),Math.max(.65,radius));
  }
  if(effetto==='astrale'&&typeof ctx.ellipse==='function'){
    // L'eclisse d'oro è DIETRO al personaggio e non sopra viso/armatura.
    ctx.save();
    ctx.globalAlpha=.29;
    ctx.strokeStyle='#f4c78e';
    ctx.lineWidth=Math.max(1,w*.008);
    ctx.shadowColor='#d38bff';
    ctx.shadowBlur=Math.min(36,w*.038);
    ctx.beginPath();
    ctx.ellipse(w*.50,h*.41,w*.32,h*.30,-.11,Math.PI*.94,Math.PI*1.96);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
/** v492: l'ultimo livello disegna soltanto gas e scintille PERIFERICHE.
 * Non sovrascrive la foto, non disegna nessun personaggio o arma e
 * mantiene la palette distinta fra Mitico e Leggendario.
 */
export function disegnaAccentiCosmiciRpg(ctx,w,h,effetto='nebulosa') {
  if(!ctx||w<16||h<20||typeof ctx.createRadialGradient!=='function')return false;
  const astrale=effetto==='astrale';
  const luci=astrale
    ?[[.09,.22,.13,'244,198,139',.43],[.94,.48,.17,'187,100,253',.42],
      [.07,.73,.12,'203,124,246',.30],[.88,.81,.14,'98,187,255',.25]]
    :[[.06,.27,.22,'69,204,240',.30],[.94,.56,.24,'194,91,235',.32],
      [.13,.79,.19,'97,132,246',.25],[.91,.19,.16,'82,177,230',.21]];
  ctx.save();
  ctx.globalCompositeOperation='screen';
  for(const [x,y,rad,rgb,alpha] of luci){
    const R=rad*w;
    const g=ctx.createRadialGradient(x*w,y*h,0,x*w,y*h,R);
    g.addColorStop(0,'rgba('+rgb+','+alpha+')');
    g.addColorStop(.42,'rgba('+rgb+','+(alpha*.40)+')');
    g.addColorStop(1,'rgba('+rgb+',0)');
    ctx.fillStyle=g;
    ctx.fillRect(Math.max(0,x*w-R),Math.max(0,y*h-R),
      Math.min(w,R*2),Math.min(h,R*2));
  }
  // Stelle soltanto ai bordi esterni della sagoma (niente punti sulla faccia).
  const fract=n=>n-Math.floor(n);
  const rand=n=>fract(Math.sin(n*92.71+48.19)*43578.6);
  for(let i=0;i<(astrale?36:23);i++){
    const left=i%2===0;
    const x=(left?.03+.23*rand(i*3+1):.74+.23*rand(i*3+1))*w;
    const y=(.07+.87*rand(i*7+4))*h;
    const radius=(i%6===0?1.8:.75)*Math.min(w/680,1.6);
    ctx.fillStyle=astrale?'rgba(255,228,242,.66)':'rgba(215,242,255,.59)';
    ctx.fillRect(x,y,radius,radius);
  }
  ctx.restore();
  return true;
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
  // Astrale e Nebulosa sono ora una corrente di luce CONNESSA al corpo:
  // l'energia segue la foto, con un piano dietro e uno davanti, e usa
  // il ritaglio alpha reale quando disponibile. Nessuna skin sostitutiva.
  montaEnergiaIncarnataRpg(palco,grafica,foto,{
    classe:classeId,effetto,documento:scena.ownerDocument||globalThis.document,
  });
  return true;
}

/**
 * v490: SOLO ritagli alpha realmente presenti sul repository.
 * Non inventare una foto di stato/armatura differente per una combinazione.
 * Le altre foto mantengono il fallback esistente finché non avranno
 * anch'esse il proprio ritaglio approvato.
 */
export const CUTOUT_VERIFICATI_RPG=Object.freeze([
  'assassino-0', 'assassino-1', 'assassino-2', 'assassino-3', 'assassino-4', 'assassino-5', 'guerriero-0', 'guerriero-1', 'guerriero-2', 'guerriero-3', 'guerriero-4', 'guerriero-5', 'berserker-0', 'berserker-1', 'berserker-2', 'berserker-3', 'berserker-4', 'berserker-5'
]);
const CUTOUT_PRESENTI_RPG=new Set(CUTOUT_VERIFICATI_RPG);

/** v491: il fatto che un WebP contenga ALPH non garantisce uno scontorno:
 * alcuni ritagli v490 avevano ancora il vecchio fondale opaco.
 * Verifica che gli angoli siano realmente trasparenti e che testa, busto
 * e gambe rimangano presenti. Se il controllo fallisce NON oscurare la foto.
 */
export function verificaIntegritaRitaglioRpg(immagine,documento=globalThis.document) {
  if(!immagine?.naturalWidth||!immagine?.naturalHeight||!documento?.createElement)return false;
  try {
    const canvas=documento.createElement('canvas');
    canvas.width=64;canvas.height=96;
    const ctx=canvas.getContext?.('2d',{willReadFrequently:true});
    if(!ctx)return false;
    ctx.clearRect(0,0,64,96);
    ctx.drawImage(immagine,0,0,64,96);
    const pixels=ctx.getImageData(0,0,64,96).data;
    const a=(x,y)=>pixels[(Math.round(y*95)*64+Math.round(x*63))*4+3];
    const bordo=[[.02,.02],[.50,.02],[.98,.02],[.02,.50],[.98,.50],
      [.02,.98],[.50,.98],[.98,.98]];
    const centro=[[.50,.18],[.50,.32],[.50,.48],[.43,.70],[.58,.70]];
    const trasparenti=bordo.filter(([x,y])=>a(x,y)<65).length;
    const pieni=centro.filter(([x,y])=>a(x,y)>160).length;
    return trasparenti>=5 && pieni>=4;
  } catch {
    return false; // alpha/canvas non leggibile: mai nascondere il personaggio
  }
}
export function percorsoRitaglioCosmicoRpg(source) {
  const src=String(source||'').split(/[?#]/)[0].replaceAll('\\','/');
  const match=src.match(/(?:^|\/)img\/personaggi\/stati\/(assassino|guerriero|berserker)-([0-5])\.webp$/);
  if(!match)return null;
  const key=match[1]+'-'+match[2];
  return CUTOUT_PRESENTI_RPG.has(key)?'./img/personaggi/cutout/stati/'+key+'.webp?v=493':null;
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
    if(!verificaIntegritaRitaglioRpg(ritaglio))return;
    grafica.appendChild(ritaglio);
    let pronto=false;
    const sincronizza=()=>{
      // Misure del RITRATTO reale: niente zoom inventato né max-height
      // indipendenti per il livello trasparente (errore v490 su mobile).
      const f=foto.getBoundingClientRect?.();
      const g=grafica.getBoundingClientRect?.();
      if(!f||!g||f.width<1||f.height<1)return;
      const valori={
        top:(f.top-g.top)+'px',
        left:(f.left-g.left)+'px',
        width:f.width+'px',
        height:f.height+'px'
      };
      for(const [proprieta,valore] of Object.entries(valori)){
        ritaglio.style.setProperty(proprieta,valore,'important');
      }
      if(pronto)return;
      pronto=true;
      palco.classList?.add?.('rpg-cosmic-cutout-ready');
      grafica.classList?.add?.('rpg-cosmic-cutout-inserted');
      ambiente.classList?.remove?.('rpg-cosmic-photo-environment');
      if(ambiente.style){
        ambiente.style.backgroundImage='';
        ambiente.style.backgroundSize='';
        ambiente.style.backgroundPosition='';
      }
    };
    sincronizza();
    // iPhone: il viewport puo cambiare al cambio orientamento o anteprima.
    // Osservare foto e contenitore mantiene ESATTAMENTE lo stesso zoom.
    if(typeof ResizeObserver==='function'){
      const osservatore=new ResizeObserver(sincronizza);
      osservatore.observe(foto);
      osservatore.observe(grafica);
    }
  };
  ritaglio.onerror=()=>{ /* Nessun placeholder nero: la foto originale resta visibile. */ };
  ritaglio.src=path;
  return true;
}
