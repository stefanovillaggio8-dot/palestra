// v487: il vecchio rettangolo era nella FOTOGRAFIA, non nell'effetto SVG.
// Una maschera morbida per la sagoma (per classe) rimuove quel fondale.
// Manteniamo i pixel originali del personaggio, l'arma, l'armatura e lo zoom.
// Niente servizi remoti, niente nuovi asset e nessuna modifica al salvataggio.
import { CONTORNI_RPG } from './effetti-rpg-canvas.js';
import { montaEnergiaIncarnataRpg } from './rpg-energia-incarnata.js';

const CLASSI=Object.freeze(['assassino','guerriero','berserker']);
const MASK_CACHE=new Map();
const MASK_RASTER_CACHE=new Map();
let mascheraBordiFoto=null;
// v509: le armature Shop sono fotografie opache 2:3 con il paesaggio
// incorporato. Una sfumatura del rettangolo NON separa il personaggio.
// Questi contorni seguono invece i sei costumi REALI (mantelli, scudi,
// corna e piedi compresi). L'immagine non viene rigenerata o ridimensionata:
// cambia soltanto l'alpha, su browser e nell'esportazione PNG.
// Coordinate normalizzate [altezza, bordo sinistro, bordo destro].
export const CONTORNI_ARMATURE_COSMICHE_RPG=Object.freeze({
  'assassino-notte':[
    [.061,.50,.50],[.070,.465,.535],[.095,.441,.560],[.13,.408,.594],
    [.185,.394,.612],[.21,.363,.650],[.24,.334,.678],[.29,.310,.703],
    [.36,.297,.717],[.44,.292,.732],[.54,.269,.744],[.64,.246,.771],
    [.72,.230,.797],[.775,.206,.821],[.795,.210,.817],[.815,.253,.765],
    [.835,.287,.722],[.86,.324,.691],[.915,.322,.684],[.944,.305,.716],
    [.951,.329,.701],[.957,.402,.623]],
  'assassino-spettro':[
    // La precedente sagoma includeva quasi l'intero fumo rosso e i ruderi
    // fotografati ai lati del mantello (x=.06..94 fra y=.69 e .77).
    // Spettro Cremisi ha invece il mantello/armatura centrati: conserviamo
    // busto, braccia, pugnali e scarpe, ma NON il paesaggio infuocato.
    [.052,.50,.50],[.065,.466,.540],[.090,.436,.563],[.13,.402,.600],
    [.17,.397,.603],[.20,.349,.663],[.25,.303,.704],[.31,.290,.718],
    [.39,.282,.733],[.47,.266,.750],[.55,.271,.751],[.62,.313,.717],
    [.69,.351,.676],[.735,.350,.671],[.766,.352,.664],[.79,.357,.666],
    [.815,.358,.663],[.845,.355,.663],[.875,.354,.660],[.922,.352,.663],
    [.938,.354,.671],[.950,.373,.655]],
  'guerriero-braci':[
    [.036,.50,.50],[.052,.457,.550],[.075,.429,.576],[.115,.422,.576],
    [.160,.426,.578],[.18,.371,.639],[.205,.306,.695],[.25,.269,.739],
    [.32,.249,.781],[.355,.220,.841],[.43,.218,.857],[.55,.217,.863],
    [.645,.209,.859],[.70,.174,.849],[.785,.151,.863],[.835,.167,.837],
    [.87,.240,.777],[.915,.260,.755],[.95,.276,.741],[.975,.291,.714],
    [.985,.336,.686]],
  'guerriero-abisso':[
    [.029,.50,.50],[.043,.461,.542],[.072,.428,.570],[.11,.420,.578],
    [.16,.419,.580],[.19,.331,.675],[.24,.274,.739],[.30,.245,.762],
    [.36,.213,.849],[.46,.170,.866],[.56,.132,.885],[.65,.084,.922],
    [.72,.052,.958],[.79,.032,.973],[.835,.039,.965],[.88,.090,.922],
    [.915,.246,.779],[.945,.263,.774],[.975,.286,.754],[.985,.328,.721]],
  'berserker-rabbia':[
    [.012,.50,.50],[.019,.387,.650],[.045,.359,.670],[.085,.352,.663],
    [.13,.388,.624],[.16,.306,.706],[.20,.230,.764],[.265,.189,.804],
    [.33,.190,.866],[.38,.171,.914],[.47,.161,.931],[.59,.166,.935],
    [.64,.183,.938],[.72,.186,.895],[.81,.203,.859],[.865,.233,.823],
    [.90,.285,.751],[.935,.291,.752],[.955,.310,.748],[.964,.345,.720]],
  'berserker-apocalisse':[
    [.037,.50,.50],[.048,.446,.552],[.075,.414,.586],[.115,.414,.585],
    [.135,.345,.659],[.16,.274,.726],[.19,.201,.791],[.24,.157,.821],
    [.32,.143,.863],[.37,.126,.908],[.45,.136,.930],[.58,.140,.930],
    [.68,.147,.917],[.77,.181,.893],[.835,.208,.868],[.885,.244,.818],
    [.935,.286,.751],[.95,.303,.744],[.965,.320,.744],[.972,.354,.724]],
});
// La silhouette del mantello termina prima delle scarpe: senza questi vuoti
// rimarrebbe una striscia di pavimento fotografico tra le due gambe.
export const INCAVI_GAMBE_ARMATURE_RPG=Object.freeze({
  'assassino-notte':[[.80,.478,.531],[.84,.469,.548],[.90,.449,.553],[.957,.425,.565],[1,.40,.60]],
  // Il terreno arancione originale resta visibile fra gli stivali se si
  // apre il vuoto solo all'85% dell'altezza: separiamo le due gambe appena
  // termina il grembiule, senza intaccare i bordi esterni degli stivali.
  'assassino-spettro':[[.775,.493,.532],[.815,.469,.549],[.85,.461,.558],
    [.875,.449,.568],[.92,.437,.583],[.961,.430,.601],[1,.412,.625]],
  'guerriero-braci':[[.866,.461,.546],[.89,.429,.567],[.94,.412,.582],[.985,.390,.605],[1,.39,.61]],
  'guerriero-abisso':[[.905,.462,.546],[.928,.432,.576],[.96,.414,.603],[.985,.402,.604],[1,.40,.61]],
  'berserker-rabbia':[[.786,.476,.537],[.845,.444,.575],[.925,.419,.590],[.968,.410,.610],[1,.40,.62]],
  'berserker-apocalisse':[[.814,.478,.534],[.87,.455,.559],[.927,.421,.589],[.975,.418,.596],[1,.41,.61]],
});
const MASCHERE_ARMATURE_CACHE=new Map();
/** L'identita' dell'armatura resta la stessa anche con spada/ascia/pugnali:
 * i file armatura-con-arma-v371 hanno la medesima posa e inquadratura. */
export function idContornoArmaturaCosmicaRpg(foto) {
  const url=typeof foto==='string'?foto:(foto?.currentSrc||foto?.getAttribute?.('src')||foto?.src||'');
  const src=String(url).split(/[?#]/)[0].replaceAll('\\','/');
  if(!/(?:^|\/)img\/personaggi\/(?:armature\/|armatura-con-arma-v371\/|corona-v360\/)/.test(src))return null;
  const match=src.match(/(?:^|\/)(assassino|guerriero|berserker)-(notte|spettro|braci|abisso|rabbia|apocalisse)(?:-mini)?\.webp$/)
    ||src.match(/(?:^|\/)(assassino|guerriero|berserker)-(notte|spettro|braci|abisso|rabbia|apocalisse)-corna\.svg$/)
    ||src.match(/(?:^|\/)armatura-(assassino|guerriero|berserker)-(notte|spettro|braci|abisso|rabbia|apocalisse)\//);
  const id=match?match[1]+'-'+match[2]:null;
  return Object.hasOwn(CONTORNI_ARMATURE_COSMICHE_RPG,id)?id:null;
}
function fotoConCoronaCosmicaRpg(foto){
  const url=typeof foto==='string'?foto:(foto?.currentSrc||foto?.getAttribute?.('src')||foto?.src||'');
  return /(?:^|\/)img\/personaggi\/corona-v360\//.test(String(url));
}
function fotoConArmaCosmicaRpg(foto){
  const url=typeof foto==='string'?foto:(foto?.currentSrc||foto?.getAttribute?.('src')||foto?.src||'');
  return /(?:^|\/)img\/personaggi\/(?:armatura-con-arma-v371\/|corona-v360\/[^/]+\/stato-[45]\/)/.test(String(url));
}
function dipingiSagomaArmaturaRpg(ctx,w,h,id,conCorona=false,conArma=false){
  const punti=CONTORNI_ARMATURE_COSMICHE_RPG[id];
  if(!punti||!ctx?.beginPath)return false;
  ctx.beginPath();
  punti.forEach(([y,l],i)=>i?ctx.lineTo(l*w,y*h):ctx.moveTo(l*w,y*h));
  for(let i=punti.length-1;i>=0;i--){const [y,,r]=punti[i];ctx.lineTo(r*w,y*h);}
  ctx.closePath();ctx.fill();
  if(id==='berserker-apocalisse'&&typeof ctx.quadraticCurveTo==='function'){
    // La foto SVG pre-arma include le due corna del vero Berserker; i
    // punti superano il contorno dell'elmo. Non tagliarle nel ritaglio.
    for(const specchio of [false,true]){
      const x=v=>(specchio?1-v:v)*w;
      ctx.beginPath();ctx.moveTo(x(.425),h*.159);
      ctx.quadraticCurveTo(x(.333),h*.129,x(.335),h*.019);
      ctx.quadraticCurveTo(x(.303),h*.073,x(.353),h*.139);
      ctx.lineTo(x(.412),h*.172);ctx.closePath();ctx.fill();
    }
  }
  if(conCorona && typeof ctx.ellipse==='function'){
    // La Corona dell'Infinito e' un oggetto staccato dalla testa: il
    // ritaglio dell'armatura non deve far scomparire il premio da 80 giorni.
    ctx.beginPath();ctx.ellipse(w*.50,h*.057,w*.207,h*.053,0,0,Math.PI*2);ctx.fill();
  }
  if(conArma&&id.startsWith('berserker-')){
    // Il Berserker impugna un'ascia verticale FUORI dal mantello. La testa
    // a mezzaluna e l'asta sono parti distinte: non ritagliare mai l'arma
    // guadagnata soltanto per eliminare il paesaggio fotografico.
    ctx.beginPath();
    ctx.moveTo(w*.195,h*.193);ctx.lineTo(w*.233,h*.193);
    ctx.lineTo(w*.230,h*.979);ctx.lineTo(w*.192,h*.979);ctx.closePath();ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w*.215,h*.182);ctx.quadraticCurveTo(w*.155,h*.175,w*.111,h*.183);
    ctx.quadraticCurveTo(w*.078,h*.232,w*.090,h*.282);
    ctx.quadraticCurveTo(w*.107,h*.332,w*.150,h*.325);
    ctx.lineTo(w*.208,h*.295);ctx.closePath();ctx.fill();
  }
  if(conArma&&id==='assassino-spettro'){
    // I due pugnali argentati sporgono ai lati delle gambe. Il contorno
    // stretto elimina le fiamme del vecchio scenario: reinseriamo SOLO le
    // lame senza riaprire tutto il paesaggio fotografico attorno.
    ctx.beginPath();ctx.moveTo(w*.306,h*.536);ctx.lineTo(w*.337,h*.532);
    ctx.lineTo(w*.376,h*.756);ctx.lineTo(w*.357,h*.774);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(w*.694,h*.530);ctx.lineTo(w*.719,h*.535);
    ctx.lineTo(w*.662,h*.776);ctx.lineTo(w*.646,h*.762);ctx.closePath();ctx.fill();
  }
  const incavo=INCAVI_GAMBE_ARMATURE_RPG[id];
  if(incavo){
    ctx.save();ctx.globalCompositeOperation='destination-out';
    if('filter' in ctx)ctx.filter='blur('+Math.max(1.5,w*.009)+'px)';
    ctx.beginPath();
    incavo.forEach(([y,l],i)=>i?ctx.lineTo(l*w,y*h):ctx.moveTo(l*w,y*h));
    for(let i=incavo.length-1;i>=0;i--){const [y,,r]=incavo[i];ctx.lineTo(r*w,y*h);}
    ctx.closePath();ctx.fill();ctx.restore();
  }
  return true;
}
export function mascheraArmaturaCosmicaRpg(id,documento=globalThis.document,conCorona=false,conArma=false){
  if(!Object.hasOwn(CONTORNI_ARMATURE_COSMICHE_RPG,id))return null;
  const chiave=id+(conCorona?':corona':'')+(conArma?':arma':'');
  if(MASCHERE_ARMATURE_CACHE.has(chiave))return MASCHERE_ARMATURE_CACHE.get(chiave);
  if(!documento?.createElement)return null;
  try{
    const c=documento.createElement('canvas');c.width=360;c.height=540;
    const ctx=c.getContext?.('2d',{alpha:true});
    if(!ctx||!c.toDataURL)return null;
    ctx.fillStyle='#fff';
    if('filter' in ctx)ctx.filter='blur(5px)';
    if(!dipingiSagomaArmaturaRpg(ctx,c.width,c.height,id,conCorona,conArma))return null;
    const result='url('+JSON.stringify(c.toDataURL('image/png'))+')';
    MASCHERE_ARMATURE_CACHE.set(chiave,result);return result;
  }catch{return null;}
}
// Le armature acquistabili, le armi e le fotografie con Corona non hanno
// sempre un ritaglio alpha dedicato. Una sagoma poligonale cancella pezzi
// reali di scudo, mantello, pugnali e corna; una foto opaca, invece, lascia
// il vecchio poster rettangolare. Sfuma SOLO i bordi esterni della foto.
// La zona interna (compresa l'intera silhouette) resta pixel-per-pixel fedele.
function dipingiMascheraBordiRpg(ctx,w,h) {
  if(!ctx?.createLinearGradient || !ctx?.fillRect)return false;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation='destination-in';
  const x=ctx.createLinearGradient(0,0,w,0);
  x.addColorStop(0,'rgba(0,0,0,0)');
  x.addColorStop(.095,'rgba(0,0,0,1)');
  x.addColorStop(.905,'rgba(0,0,0,1)');
  x.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=x;ctx.fillRect(0,0,w,h);
  const y=ctx.createLinearGradient(0,0,0,h);
  y.addColorStop(0,'rgba(0,0,0,0)');
  y.addColorStop(.075,'rgba(0,0,0,1)');
  y.addColorStop(.925,'rgba(0,0,0,1)');
  y.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=y;ctx.fillRect(0,0,w,h);
  return true;
}
export function mascheraBordiFotografiaRpg(documento=globalThis.document) {
  if(mascheraBordiFoto)return mascheraBordiFoto;
  if(!documento?.createElement)return null;
  try{
    const c=documento.createElement('canvas');
    c.width=180;c.height=270;
    const ctx=c.getContext?.('2d',{alpha:true});
    if(!ctx||!dipingiMascheraBordiRpg(ctx,c.width,c.height)||!c.toDataURL)return null;
    mascheraBordiFoto='url('+JSON.stringify(c.toDataURL('image/png'))+')';
    return mascheraBordiFoto;
  }catch{return null;}
}
// La foto scaricata dall'Atelier usa la STESSA dissolvenza della scena.
// Non cambia il file sorgente e non ritocca volto/corpo/armatura.
export function disegnaFotografiaFusaRpg(ctx,foto,x,y,w,h,documento=globalThis.document) {
  if(!ctx?.drawImage||!foto||!documento?.createElement||w<2||h<2)return false;
  try{
    const c=documento.createElement('canvas');
    c.width=Math.max(2,Math.round(w));c.height=Math.max(2,Math.round(h));
    const t=c.getContext?.('2d',{alpha:true});
    if(!t)return false;
    t.drawImage(foto,0,0,c.width,c.height);
    t.globalCompositeOperation='destination-in';
    const idArmatura=idContornoArmaturaCosmicaRpg(foto);
    if(idArmatura){
      const m=documento.createElement('canvas');
      m.width=c.width;m.height=c.height;
      const mc=m.getContext?.('2d',{alpha:true});
      if(!mc)return false;
      mc.fillStyle='#fff';
      if('filter' in mc)mc.filter='blur('+Math.max(3,Math.round(c.width*.014))+'px)';
      dipingiSagomaArmaturaRpg(mc,c.width,c.height,idArmatura,fotoConCoronaCosmicaRpg(foto),fotoConArmaCosmicaRpg(foto));
      // drawImage copre TUTTO il rettangolo con il mask alpha, inclusi
      // i pixel realmente trasparenti. Un fill(path) lascerebbe intatto
      // il vecchio fondale fuori dalla silhouette.
      t.drawImage(m,0,0,c.width,c.height);
      ctx.drawImage(c,x,y,w,h);
      return true;
    }
    // Il riempimento bianco del livello maschera non deve cancellare la foto:
    // dopo drawImage applichiamo soltanto i due gradienti di alpha.
    const gx=t.createLinearGradient(0,0,c.width,0);
    gx.addColorStop(0,'transparent');gx.addColorStop(.095,'#000');
    gx.addColorStop(.905,'#000');gx.addColorStop(1,'transparent');
    t.fillStyle=gx;t.fillRect(0,0,c.width,c.height);
    const gy=t.createLinearGradient(0,0,0,c.height);
    gy.addColorStop(0,'transparent');gy.addColorStop(.075,'#000');
    gy.addColorStop(.925,'#000');gy.addColorStop(1,'transparent');
    t.fillStyle=gy;t.fillRect(0,0,c.width,c.height);
    ctx.drawImage(c,x,y,w,h);
    return true;
  }catch{return false;}
}
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
  // v507: per una foto Shop opaca usiamo il contorno della sua vera armatura.
  // Il vecchio feather rettangolare sopravvive solo per sorgenti sconosciute.
  const idArmatura=idContornoArmaturaCosmicaRpg(foto);
  const src=(idArmatura&&mascheraArmaturaCosmicaRpg(idArmatura,globalThis.document,
    fotoConCoronaCosmicaRpg(foto),fotoConArmaCosmicaRpg(foto)))||mascheraBordiFotografiaRpg()||
    'radial-gradient(ellipse 53% 56% at 50% 50%,#000 65%,transparent 100%)';
  if(typeof foto.style.setProperty==='function'){
    foto.style.setProperty('-webkit-mask-image',src,'important');
    foto.style.setProperty('mask-image',src,'important');
  }else { // DOM finto / browser legacy: non lanciare eccezioni
    foto.style.webkitMaskImage=src;
    foto.style.maskImage=src;
  }
  foto.style.webkitMaskSize='100% 100%';
  foto.style.maskSize='100% 100%';
  foto.style.webkitMaskPosition='center';
  foto.style.maskPosition='center';
  foto.style.webkitMaskRepeat='no-repeat';
  foto.style.maskRepeat='no-repeat';
  foto.classList?.add?.('rpg-cosmic-subject');
  if(idArmatura)foto.classList?.add?.('rpg-cosmic-armor-subject');
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
  const contornoArmatura=idContornoArmaturaCosmicaRpg(foto);
  if(contornoArmatura){
    palco.classList?.add?.('rpg-cosmic-armor-contoured');
    ambiente.classList?.add?.('rpg-cosmic-armor-environment');
  }
  // Un raccordo fotografico reale: il fondale cosmico deriva dalla STESSA
  // immagine che viene mascherata, quindi illuminazione e toni coincidono.
  // La foto e l'equipaggiamento restano intatti.
  if(!contornoArmatura && foto?.addEventListener && ambiente?.style){
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
    let pronto=false,frameMisura=0;
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
        if(ritaglio.style.getPropertyValue?.(proprieta)!==valore){
          ritaglio.style.setProperty(proprieta,valore,'important');
        }
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
      const osservatore=new ResizeObserver(()=>{
        if(frameMisura)return;
        if(typeof requestAnimationFrame==='function'){
          frameMisura=requestAnimationFrame(()=>{frameMisura=0;sincronizza();});
        }else sincronizza();
      });
      osservatore.observe(foto);
      osservatore.observe(grafica);
    }
  };
  ritaglio.onerror=()=>{ /* Nessun placeholder nero: la foto originale resta visibile. */ };
  ritaglio.src=path;
  return true;
}
