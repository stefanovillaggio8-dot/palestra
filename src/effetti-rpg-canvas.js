// Aura Shop v331 — effetti particellari con occlusione reale davanti all'avatar.
// Le particelle vengono renderizzate nell'ambiente fotografico e poi cancellate
// dove si trova la sagoma del personaggio: non attraversano faccia o armatura.
// Nessun file immagine esterno, nessuna modifica alla progressione Streak.
const MASSIMO_DPR = 1.5;
const EFFETTI_ATTIVI = new WeakMap();
const TIPI = new Set(['effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula']);
const TAU = Math.PI * 2;
const casuale = (a,b) => a + Math.random() * (b-a);
const limita = (v,a,b) => Math.max(a,Math.min(b,v));
const smooth = (a,b,v) => { const t=limita((v-a)/(b-a),0,1);return t*t*(3-2*t); };

// Contorni volutamente conservativi: includono armi, scudi e mantelli dei sei
// stati. Si preferisce nascondere una scintilla in più piuttosto che farla
// passare ATTRAVERSO il personaggio. Coordinate normalizzate [0,1].
// I contorni rimangono inalterati al cambio di skin, come gli avatar originali.
export const CONTORNI_RPG = Object.freeze({
  guerriero: [
    [0.00,.47,.53],[.025,.43,.57],[.075,.39,.61],[.15,.36,.64],
    [.205,.29,.73],[.29,.23,.82],[.40,.21,.89],[.54,.20,.90],
    [.63,.22,.85],[.74,.23,.75],[.85,.26,.74],[.965,.28,.73],[1,.34,.68],
  ],
  assassino: [
    [0,.46,.54],[.035,.40,.59],[.12,.365,.635],[.205,.32,.685],
    [.29,.27,.73],[.42,.25,.76],[.59,.23,.77],[.72,.26,.74],
    [.84,.285,.705],[.96,.32,.69],[1,.35,.65],
  ],
  berserker: [
    [0,.08,.61],[.055,.025,.64],[.14,.02,.68],[.225,.07,.77],
    [.33,.085,.87],[.48,.09,.93],[.62,.10,.94],[.75,.135,.87],
    [.87,.18,.79],[.98,.22,.74],[1,.24,.73],
  ],
});
export function bordoSagomaRpg(classe,y) {
  const righe=CONTORNI_RPG[classe] || CONTORNI_RPG.guerriero;
  const h=limita(y,0,1);
  for(let i=1;i<righe.length;i++){
    const r=righe[i],p=righe[i-1];
    if(h<=r[0]){
      const t=(h-p[0])/(r[0]-p[0]);
      return [p[1]+t*(r[1]-p[1]),p[2]+t*(r[2]-p[2])];
    }
  }
  return righe[righe.length-1].slice(1);
}
/** I filtri statici coprivano completamente questi tre effetti in Safari.
 * Quando sono equipaggiati, il renderer live è la fonte visiva principale. */
export function usaEffettiViviRpg(tipo,{mitica=false}={}) {
  // Su browser legacy e nei test DOM minimali lasciamo il vecchio renderer.
  // Il canvas visibile viene selezionato solo dove l'animazione e' supportata.
  return Boolean((mitica || tipo==='effetto-ambra' || tipo==='effetto-fulmine' || tipo==='effetto-nebula') &&
    typeof document!=='undefined' &&
    typeof requestAnimationFrame==='function' &&
    typeof document.createElement==='function');
}
export function smontaEffettiRpg(elemento) {
  EFFETTI_ATTIVI.get(elemento)?.();
}
function coloriEffetto(tipo) {
  return ({
    'effetto-ambra':['#ffb24b','#ffc66d','#ffeac4'],
    'effetto-ombra':['#67517d','#a78bc4','#292139'],
    'effetto-fulmine':['#9869ff','#bfaaff','#f6ebff'],
    'effetto-nebula':['#57c3e7','#b28ae6','#f0dcff'],
  })[tipo] || ['#bca7ff','#f6e7ff','#fff'];
}

// Due fasce laterali e una linea di suolo, per riflettersi sul paesaggio.
// La coordinata e' sempre esterna al corpo, anche per armi e mantelli.
function puntoLaterale(classe,y,lato,distanza) {
  const [sx,dx]=bordoSagomaRpg(classe,y);
  return limita((lato<0?sx:dx)+lato*distanza,.012,.988);
}

export function montaEffettiRpg(elemento,tipo,{corona=false,divina=false,mitica=false,classe=null}={}) {
  if(!elemento || (!TIPI.has(tipo)&&!corona&&!divina&&!mitica))return ()=>{};
  if(typeof document==='undefined'||typeof requestAnimationFrame!=='function')return ()=>{};
  smontaEffettiRpg(elemento);
  const canvas=document.createElement('canvas');
  if(typeof canvas.getContext!=='function')return ()=>{};
  const ctx=canvas.getContext('2d',{alpha:true});
  if(!ctx)return ()=>{};
  canvas.className='rpg-effetti-canvas';
  canvas.setAttribute('aria-hidden','true');
  canvas.setAttribute('role','presentation');
  elemento.appendChild(canvas);
  const riduci=typeof matchMedia==='function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const personaggio=classe||(['guerriero','assassino','berserker'].find(c=>
    elemento.classList?.contains?.('personaggio-'+c)) ||'guerriero');
  const palette=coloriEffetto(tipo);
  const scintille=Array.from({length:tipo==='effetto-ombra'?22:66},(_,i)=>({
    y:casuale(0,1),lato:i%2?1:-1,dist:casuale(.025,.145),fase:casuale(0,TAU),
    r:casuale(1.1,2.9),vel:casuale(.055,.20),giro:casuale(.4,1.6),
    bagliore:casuale(.4,1),colore:i%palette.length,
  }));
  const vapori=Array.from({length:tipo==='effetto-ombra'?22:14},(_,i)=>({
    y:casuale(0,1),lato:i%2?1:-1,dist:casuale(.015,.13),
    fase:casuale(0,TAU),vel:casuale(.017,.056),scala:casuale(.052,.14),
    tonalita:i%3,
  }));
  // Impulsi elettrici discreti, non una sola sinusoide che fa pulsare tutto.
  const fulmini=Array.from({length:8},(_,i)=>({
    lato:i%2?1:-1,fase:i*.41+.2,
    velocita:casuale(.65,1.18),durata:casuale(.32,.52),
    y:casuale(.14,.61),lunghezza:casuale(.20,.40),
    seed:casuale(12,500),
  }));
  const ios = typeof navigator !== 'undefined'
    && /iPhone|iPad|iPod/.test(navigator.userAgent || '');
  const intervalloFrame = ios ? 50 : 33; // iPhone: 20 fps invece di 30, effetti sempre visibili
  let w=0,h=0,dpr=1,frameId=0,last=0,visible=true,ended=false;
  let wasAttached=false,tries=0,observer=null,resizeObs=null;
  let ultimaMisura=0;
  let motionFirstFrame=true;

  function size(){
    const rect=elemento.getBoundingClientRect();
    const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
    const ratio=Math.min(ios ? 1.25 : MASSIMO_DPR,window.devicePixelRatio||1);
    if(width===w&&height===h&&ratio===dpr)return;
    w=width;h=height;dpr=ratio;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function haze(x,y,rx,ry,color,opacity=1){
    ctx.save();
    ctx.globalAlpha=opacity;
    ctx.translate(x,y);ctx.scale(1,Math.max(.1,ry/rx));
    const grad=ctx.createRadialGradient(0,0,0,0,0,rx);
    grad.addColorStop(0,color);
    grad.addColorStop(.38,color);
    grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(0,0,rx,0,TAU);ctx.fill();
    ctx.restore();
  }
  function dot(x,y,r,c,glow=.3){
    ctx.save();
    ctx.fillStyle=c;ctx.shadowColor=c;
    ctx.shadowBlur=Math.max(2,r*5);
    ctx.globalAlpha=glow;
    ctx.beginPath();ctx.arc(x,y,Math.max(.4,r),0,TAU);ctx.fill();
    ctx.restore();
  }
  function trail(x,y,dx,dy,r,c,alpha){
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.strokeStyle=c;ctx.lineWidth=Math.max(.55,r*.8);
    ctx.lineCap='round';ctx.shadowColor=c;ctx.shadowBlur=Math.max(2,r*4);
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y+dy);ctx.stroke();
    dot(x,y,r,c,.8);
    ctx.restore();
  }
  function ambient(t){
    // Luce diegetica dall'ambiente, non un overlay colorato sul torso.
    const tone=tipo==='effetto-ombra'?'rgba(71,55,98,.40)':
      tipo==='effetto-fulmine'?'rgba(101,68,180,.40)':
      tipo==='effetto-ambra'?'rgba(221,109,31,.30)':'rgba(70,126,188,.34)';
    const breathe=.93+.07*Math.sin(t*.8);
    haze(w*.06,h*.52,w*.27,h*.46,tone,.40*breathe);
    haze(w*.94,h*.51,w*.27,h*.46,tone,.40*breathe);
    // Riflesso sul suolo, fuori dal corpo e sotto i piedi.
    haze(w*.5,h*.965,w*.43,h*.10,tone,.36);
  }
  function amber(t){
    ambient(t);
    for(const p of scintille){
      const yy=((p.y-t*p.vel)%1+1)%1;
      const x=puntoLaterale(personaggio,yy,p.lato,p.dist+Math.sin(t*p.giro+p.fase)*.018)*w;
      const y=yy*h;
      const fading=smooth(.015,.13,yy)*(1-smooth(.82,.995,yy));
      if(fading<=.01)continue;
      const c=palette[p.colore];
      const flicker=.79+.21*Math.sin(t*6+p.fase);
      trail(x,y,Math.cos(p.fase+t)*p.r*2.8,p.r*(4+p.vel*17),p.r*1.2,c,
        Math.min(1,p.bagliore*fading*flicker*1.55));
      if(p.colore===2)dot(x,y,p.r*.7,'#fff8dc',.8*fading);
    }
    for(let i=0;i<6;i++){
      const l=i%2?-1:1,yy=.65+i*.043;
      const x=puntoLaterale(personaggio,yy,l,.015)*w;
      haze(x,yy*h,w*.055,h*.045,'rgba(255,129,32,.16)',.22);
    }
  }
  function smoke(t){
    ambient(t);
    for(const p of vapori){
      const yy=((p.y-t*p.vel)%1+1)%1;
      const x=puntoLaterale(personaggio,yy,p.lato,p.dist+Math.sin(p.fase+t*.42)*.028)*w;
      const y=yy*h;
      const r=w*p.scala;
      const alpha=.18*smooth(.05,.22,yy)*(1-smooth(.68,.99,yy));
      if(alpha<=.004)continue;
      haze(x-r*.22,y,r*1.3,r*.7,'rgba(18,14,29,.60)',alpha);
      haze(x+r*.24,y-r*.35,r*.9,r*1.25,
        p.tonalita===0?'rgba(101,85,132,.43)':'rgba(65,53,90,.45)',alpha*.7);
      haze(x-r*.08,y-r*.58,r*.75,r*.95,'rgba(135,118,159,.23)',alpha*.55);
    }
  }
  const rnd=v=>{const x=Math.sin(v*128.11+49.17)*43758.5453;return x-Math.floor(x);};
  function arc(t){
    ambient(t);
    for(const ray of fulmini){
      const pos=t*ray.velocita+ray.fase,cycle=pos%1;
      if(cycle>ray.durata)continue;
      const flash=(.55+.45*Math.sin(Math.PI*cycle/ray.durata))*(.77+.23*rnd(ray.seed+Math.floor(pos)));
      const from=ray.y, end=Math.min(.86,from+ray.lunghezza);
      const knots=[];
      for(let j=0;j<=11;j++){
        const yy=from+(end-from)*j/11;
        const outside=puntoLaterale(personaggio,yy,ray.lato,
          .027 + rnd(ray.seed+j*2+Math.floor(pos)*29)*.075);
        knots.push([w*outside,h*yy]);
      }
      ctx.save();ctx.globalAlpha=flash;ctx.lineCap='round';ctx.lineJoin='round';
      ctx.strokeStyle='#9f59ff';ctx.shadowColor='#ae70ff';ctx.shadowBlur=Math.max(15,w*.055);
      ctx.lineWidth=Math.max(2,w*.018);ctx.beginPath();
      knots.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
      ctx.strokeStyle='#faf1ff';ctx.shadowBlur=9;ctx.lineWidth=Math.max(1,w*.0055);
      ctx.stroke();
      // Rami: diretti verso l'esterno, con una piccola ramificazione in punta.
      for(const pivot of [3,7]){
        const [x,y]=knots[pivot],bend=ray.lato*w*.065;
        ctx.beginPath();ctx.moveTo(x,y);
        ctx.lineTo(x+bend*.48,y-h*.018);
        ctx.lineTo(x+bend,y-h*.041);
        ctx.stroke();
      }
      ctx.restore();
    }
    for(const p of scintille.slice(0,24)){
      const yy=((p.y-t*p.vel*.55)%1+1)%1;
      dot(puntoLaterale(personaggio,yy,p.lato,p.dist)*w,yy*h,p.r,'#c4a8ff',.56);
    }
  }
  // v478: Nebulosa Cosmica è un effetto vivo sulla FOTO ORIGINALE.
  // La camera è la stessa di Astrale: niente ritaglio/zoom o skin sostitutiva.
  function nebula(t){
    dipingiNebulosaCosmica(ctx,w,h,personaggio,t,ios?36:70);
  }
  // v477 ASTR ALE: un portale mitico, non sei strisce lineari.
  // Comete, stelleAstrali e polvere viva circondano la fotografia originale:
  // ogni x segue puntoLaterale e shadowBlur è limitato al budget iPhone.
  const stelleAstrali=mitica ? Array.from({length:ios?27:48},(_,i)=>({
    y:casuale(.07,.90),lato:i%2?1:-1,dist:casuale(.045,.18),
    r:casuale(.55,1.75),fase:casuale(0,TAU),vel:casuale(.32,.95),
    tinta:i%5,luminosita:casuale(.6,1),
  })) : [];
  function astrale(t){
    dipingiRiftAstrale(ctx,w,h,personaggio,t,ios?48:88);
    // Micro-comete erranti vive, oltre la sagoma del mantello e delle armi.
    for(const p of stelleAstrali){
      const yy=.06+((p.y+.009*Math.sin(t*.38+p.fase))% .86);
      const xx=puntoLaterale(personaggio,yy,p.lato,p.dist)*w;
      const c=['#fdf0ff','#bca4ff','#8fe8ff','#ffbfff','#ffdefd'][p.tinta];
      const alpha=(.35+.55*(.5+.5*Math.sin(t*p.vel*3+p.fase)))*p.luminosita;
      dot(xx,yy*h,p.r,c,alpha);
      if(p.tinta===0){
        ctx.save();ctx.globalAlpha=alpha*.7;ctx.shadowColor=c;
        ctx.shadowBlur=Math.max(5,w*.025);ctx.strokeStyle=c;
        ctx.lineWidth=Math.max(.65,w*.002);
        ctx.beginPath();ctx.moveTo(xx-w*.018,yy*h);ctx.lineTo(xx+w*.018,yy*h);
        ctx.moveTo(xx,yy*h-h*.013);ctx.lineTo(xx,yy*h+h*.013);
        ctx.stroke();ctx.restore();
      }
    }
    // L'ultimo anello è ai piedi: non viene mai disegnato sul viso.
    ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#e7b1ff';
    ctx.lineWidth=Math.max(.8,w*.003);ctx.beginPath();
    ctx.ellipse(w*.5,h*.957,w*.405,h*.03,0,0,TAU);ctx.stroke();ctx.restore();
  }

  function aura(t){
    if(!divina&&!corona)return;
    const cx=w*.5,y=h*.055;
    const span=corona?w*.13:w*.11;
    // Il sigillo vive NELLO SPAZIO SOPRA il capo: niente cerchi sul viso.
    ctx.save();
    ctx.strokeStyle=corona?'#ffe2aa':'#b3eaff';
    ctx.lineWidth=Math.max(1,w*.007);
    ctx.shadowColor=corona?'#e7c175':'#76ccff';ctx.shadowBlur=10;
    const wave=1+Math.sin(t*.85)*.035;
    ctx.beginPath();ctx.ellipse(cx,y,span*wave,h*.014,0,0,TAU);ctx.stroke();
    if(divina && corona) {
      // Aura divina da 75 giorni e Corona da 80 giorni convivono:
      // il cerchio azzurro e' un livello distinto sotto la corona dorata.
      ctx.beginPath();ctx.ellipse(cx,y+h*.032,span*.88,h*.012,0,0,TAU);
      ctx.strokeStyle='rgba(154,229,255,.7)';ctx.shadowColor='#82d2ff';ctx.stroke();
      ctx.strokeStyle='#ffe2aa';ctx.shadowColor='#e7c175';
    }
    if(corona){
      ctx.fillStyle='rgba(225,180,78,.5)';
      ctx.beginPath();ctx.moveTo(cx-span,y);
      ctx.lineTo(cx-span,y-h*.033);ctx.lineTo(cx-span*.56,y-h*.01);
      ctx.lineTo(cx-span*.33,y-h*.057);ctx.lineTo(cx,y-h*.02);
      ctx.lineTo(cx+span*.33,y-h*.057);ctx.lineTo(cx+span*.56,y-h*.01);
      ctx.lineTo(cx+span,y-h*.033);ctx.lineTo(cx+span,y);
      ctx.closePath();ctx.fill();ctx.stroke();
      dot(cx,y-h*.023,Math.max(1,w*.01),'#e5f6ff',.8);
    }else{
      dot(cx,y,Math.max(1,w*.012),'#e0ffff',.6);
    }
    ctx.restore();
  }
  function cancellaCorpo(){
    // Stesso bordo fotografico del compositore principale, senza poligoni
    // secchi che creavano un ritaglio evidente davanti al Fumo d'Ombra.
    if(typeof ctx.createRadialGradient!=='function')return;
    ctx.save();
    ctx.globalCompositeOperation='destination-out';
    ctx.translate(w*.5,h*.49);
    const rx=personaggio==='berserker'?.67:personaggio==='guerriero'?.62:.56;
    ctx.scale(w*rx,h*.66);
    const fade=ctx.createRadialGradient(0,0,.28,0,0,1.13);
    fade.addColorStop(0,'rgba(0,0,0,1)');
    fade.addColorStop(.52,'rgba(0,0,0,.99)');
    fade.addColorStop(.74,'rgba(0,0,0,.85)');
    fade.addColorStop(.90,'rgba(0,0,0,.38)');
    fade.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=fade;
    ctx.fillRect(-1.2,-1.2,2.4,2.4);
    ctx.restore();
  }
  function render(t){
    if(w<16||h<20)return;
    ctx.clearRect(0,0,w,h);
    if(mitica) {
      // Mitico: una vera identita celeste, diversa dall'effetto Nebulosa.
      // Non crea un secondo accessorio o un secondo acquisto.
      ctx.save();ctx.globalAlpha=tipo?.58:1;astrale(t);ctx.restore();
    }
    if(tipo==='effetto-ambra')amber(t);
    else if(tipo==='effetto-ombra')smoke(t);
    else if(tipo==='effetto-fulmine')arc(t);
    else if(tipo==='effetto-nebula')nebula(t);
    else if(divina||corona)ambient(t);
    // Le scintille e gli archi sono già posizionati fuori dal bordo corporeo.
    // La vecchia grande maschera ovale li eliminava quasi tutti su iPhone!
    // La cancellazione sfumata rimane SOLO per i vapori più diffusi.
    if(tipo==='effetto-ombra') cancellaCorpo(); // Nebulosa ha maschere geometriche proprie
    aura(t);
  }
  function paginaNascosta() {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
  }
  function pianifica() {
    if(!ended && !frameId && visible && !paginaNascosta()) {
      frameId=requestAnimationFrame(tick);
    }
  }
  function alCambioVisibilita() {
    if (!paginaNascosta()) pianifica();
  }
  function cleanup(){
    if(ended)return;
    ended=true;
    if(frameId)cancelAnimationFrame(frameId);
    document.removeEventListener?.('visibilitychange',alCambioVisibilita);
    observer?.disconnect();resizeObs?.disconnect();
    canvas.remove();
    if(EFFETTI_ATTIVI.get(elemento)===cleanup)EFFETTI_ATTIVI.delete(elemento);
    elemento.classList?.remove?.('rpg-fx-attiva');
  }
  function tick(ms){
    frameId=0;
    if(ended)return;
    if(!elemento.isConnected){
      if(wasAttached||++tries>180){cleanup();return;}
      // Prima dell'inserimento nel DOM si aspetta ancora qualche frame.
      frameId=requestAnimationFrame(tick);return;
    }
    wasAttached=true;
    if(!visible || paginaNascosta()) return;
    if(ms-last>=intervalloFrame||!last){
      last=ms;
      // ResizeObserver aggiorna le dimensioni: niente reflow forzato
      // ogni frame sull'iPhone. Fallback periodico per browser vecchi.
      if(!w || (!resizeObs && ms-ultimaMisura>=1000)){
        size();ultimaMisura=ms;
      }
      render(riduci?0:ms/1000);
    }
    if(!riduci)pianifica();
    else {observer?.disconnect();resizeObs?.disconnect();}
  }
  if(typeof IntersectionObserver==='function'){
    observer=new IntersectionObserver(entries=>{
      visible=entries.some(e=>e.isIntersecting);
      if(visible)pianifica();
    },{threshold:0});
    observer.observe(elemento);
  }
  if(typeof ResizeObserver==='function'){
    resizeObs=new ResizeObserver(size);resizeObs.observe(elemento);
  }
  document.addEventListener?.('visibilitychange',alCambioVisibilita);
  elemento.classList?.add?.('rpg-fx-attiva');
  EFFETTI_ATTIVI.set(elemento,cleanup);
  pianifica();
  return cleanup;
}


// v476 — fotoritocco additivo per l'Atelier: nessuna nuova armatura, posa o volto.
// Disegna lo stesso tipo di energia del motore live, esternamente alla sagoma
// specifica di ogni classe, sopra un ritratto che rimane intatto.
// v477: stesso Rift mitico per il profilo e per le fotografie dell'Atelier.
// Importante: qui non compare nessun avatar, nessuna armatura o arma nuova.
export function disegnaAstraleExport(ctx,{classe='guerriero',x=0,y=0,width=780,height=1170}={}) {
  if(!ctx || typeof ctx.createRadialGradient!=='function')return false;
  ctx.save();ctx.translate(x,y);
  dipingiRiftAstrale(ctx,width,height,classe,2.3,90);
  ctx.restore();
  return true;
}

// Tavolozza e gesti propri della rarità MITICA, indipendenti da Nebulosa.
// Tutta la geometria è disegnata attorno ai contorni originali del personaggio.
// I cerchi sono portali ad arco, non sticker sul petto; le fiamme si incurvano
// e cambiano spessore, mentre la polvere galattica si muove lentamente.
export function dipingiRiftAstrale(ctx,w,h,classe='assassino',t=0,numeroStelle=75) {
  if(!ctx || w<16 || h<20)return false;
  const pi=Math.PI,PI2=pi*2;
  const pulse=.86+.14*Math.sin(t*.67);
  const outside=(side,y,offset)=>puntoLaterale(classe,Math.max(.005,Math.min(.995,y)),side,offset)*w;
  const fract=n=>n-Math.floor(n);
  const rnd=n=>fract(Math.sin(n*127.1+72.19)*43758.5453);
  const vivid=(lato)=>lato<0?'#b35aff':'#8d83ff';
  ctx.save();

  // (1) Atmosfera VOLUMETRICA: nubi a macchie irregolari, non tubi verticali.
  const clouds=[
    [-1,.14,.16,.27,.22,'rgba(132,30,225,.87)',.37],
    [-1,.31,.35,.25,.29,'rgba(194,48,245,.85)',.46],
    [-1,.58,.54,.25,.24,'rgba(127,40,248,.89)',.49],
    [-1,.81,.73,.20,.24,'rgba(218,76,233,.75)',.42],
    [ 1,.88,.19,.27,.24,'rgba(71,61,225,.82)',.41],
    [ 1,.72,.37,.31,.28,'rgba(102,78,249,.85)',.51],
    [ 1,.85,.65,.24,.33,'rgba(73,145,251,.78)',.42],
    [ 1,.67,.84,.24,.16,'rgba(159,83,252,.82)',.41]
  ];
  for(let j=0;j<clouds.length;j++){
    const [side,px,py,rx,ry,color,alpha]=clouds[j];
    const drift=Math.sin(t*.27+j*1.51)*.026;
    const centerX=outside(side,py,side<0?.09:.08)+drift*w;
    const centerY=(py+.014*Math.cos(t*.24+j))*h;
    ctx.save();
    ctx.globalAlpha=alpha*pulse;
    ctx.translate(centerX,centerY);ctx.scale(1,Math.max(.05,ry*h/(rx*w)));
    const g=ctx.createRadialGradient(0,0,0,0,0,rx*w);
    g.addColorStop(0,color);
    g.addColorStop(.35,color.replace(/,\s*\.\d+\)/,',.36)'));
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx*w,0,PI2);ctx.fill();
    ctx.restore();
  }

  // (2) ECLISSI ASTRALE: arco sopra il cappuccio, lati esterni, centro libero.
  // L'arco non forma una corona: è una fenditura celeste nello sfondo.
  for(const ring of [0,1,2]){
    ctx.save();
    ctx.globalAlpha=(ring===0?.22:ring===1?.62:.96)*pulse;
    ctx.strokeStyle=ring===2?'#f7dbff':ring===1?'#ba61ff':'#723cfb';
    ctx.lineWidth=Math.max(1,w*[.065,.018,.006][ring]);
    ctx.shadowColor=ring===2?'#e1a1ff':'#b967ff';
    ctx.shadowBlur=Math.min(30,w*[.10,.065,.042][ring]);
    ctx.beginPath();
    const q=1+.018*Math.sin(t*.5);
    // Disegna solo la metà superiore: nessun cerchio sul volto/torso.
    ctx.ellipse(w*.5,h*.205,w*.302*q,h*.168*q,0,pi*.985,pi*2.015);
    ctx.stroke();ctx.restore();
  }
  // Quattro discontinuità dell'eclissi (i frammenti si muovono lungo l'arco).
  for(let k=0;k<7;k++){
    const angle=pi*1.04+(k/6)*pi*.92+.016*Math.sin(t*.31+k);
    const px=w*.5+Math.cos(angle)*w*.304;
    const py=h*.205+Math.sin(angle)*h*.168;
    const r=w*(k===3?.011:.0055);
    ctx.save();ctx.globalAlpha=.58+.33*Math.sin(t*.65+k)*Math.sin(t*.65+k);
    ctx.fillStyle=k%3?'#ffe3ff':'#a2c8ff';ctx.shadowColor='#dd9dff';
    ctx.shadowBlur=Math.max(4,w*.045);
    ctx.beginPath();ctx.moveTo(px,py-r*1.75);ctx.lineTo(px+r*.65,py);
    ctx.lineTo(px,py+r*1.75);ctx.lineTo(px-r*.65,py);ctx.closePath();
    ctx.fill();ctx.restore();
  }

  // (3) ALI DI NEBULOSA: la stessa scia ha tre profondità, ogni onda ruota e
  // attraversa le altre dietro alla silhouette, non due neon rettilinei.
  const hues=[['#7629ed','#b765ff','#ffd6ff'],['#4b59df','#9891ff','#e0d4ff']];
  for(const lato of [-1,1]){
    const pal=hues[lato<0?0:1];
    for(let branch=0;branch<4;branch++){
      const path=()=>{
        ctx.beginPath();
        for(let step=0;step<=52;step++){
          const yy=.08+step/52*.82;
          const phase=yy*12.5-t*.52+branch*1.15+lato*.8;
          const dist=.086+branch*.032+
            Math.sin(phase)*(.078+branch*.004)+
            Math.sin(yy*29+t*.31+branch*2.9)*.033;
          const x=outside(lato,yy,Math.max(.016,dist));
          const y=yy*h+Math.sin(yy*8+t*.25+branch)*h*.006;
          if(step===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
      };
      for(let layer=0;layer<3;layer++){
        ctx.save();ctx.globalAlpha=[.13,.39,.88][layer]*pulse*(1-branch*.125);
        ctx.strokeStyle=pal[layer];
        ctx.lineWidth=Math.max(.65,w*[.072,.027,.0058][layer]);
        ctx.lineCap='round';ctx.lineJoin='round';
        ctx.shadowColor=pal[1];ctx.shadowBlur=Math.min(33,w*[.12,.08,.052][layer]);
        path();ctx.stroke();ctx.restore();
      }
    }
    // Ali trasversali, brevi archi di plasma staccati dal mantello.
    for(let j=0;j<7;j++){
      const yy=.18+j*.095;
      const d0=.023+Math.sin(t*.43+j)*.012;
      const x0=outside(lato,yy,d0);
      const x1=outside(lato,yy+.075,.13+(j%3)*.032);
      ctx.save();ctx.globalAlpha=(.32+.19*Math.sin(t*.8+j))*pulse;
      ctx.strokeStyle=j%3===0?'#f9cfff':pal[1];
      ctx.lineWidth=Math.max(.8,w*.005);
      ctx.shadowColor='#aa64ff';ctx.shadowBlur=Math.min(19,w*.075);
      ctx.beginPath();ctx.moveTo(x0,yy*h);
      ctx.quadraticCurveTo(x0+lato*w*.07,(yy+.024)*h,x1,(yy+.075)*h);
      ctx.stroke();ctx.restore();
    }
  }

  // (4) CRISTALLI FLUTTUANTI: piccoli prismi, non un filtro colorato sul corpo.
  for(let i=0;i<16;i++){
    const yy=.11+((i*.4739)%1)*.75;
    const side=i%2?-1:1;
    const x=outside(side,yy,.09+.13*rnd(i*7+11)+Math.sin(t*.18+i)*.008);
    const y=(yy+Math.sin(t*.41+i)*.012)*h;
    const size=w*(.007+.014*rnd(i*29+7));
    ctx.save();ctx.translate(x,y);ctx.rotate(.14*Math.sin(t*.37+i));
    ctx.globalAlpha=.30+.32*Math.sin(t*.33+i*.9)**2;
    ctx.fillStyle=i%3===0?'#dcb1ff':'#986eff';
    ctx.strokeStyle=i%4===0?'#f8dbff':'#ad89fa';
    ctx.lineWidth=Math.max(.5,w*.0017);
    ctx.shadowColor='#ab67fd';ctx.shadowBlur=w*.036;
    ctx.beginPath();ctx.moveTo(0,-size*1.7);ctx.lineTo(size*.65,-size*.25);
    ctx.lineTo(0,size*1.4);ctx.lineTo(-size*.65,-size*.25);
    ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }

  // (5) POLVERE DI STELLE e piccole comete distribuite nello SPAZIO 3D.
  for(let i=0;i<numeroStelle;i++){
    const yy=.045+(.91*rnd(i*29+4));
    const side=i%2?-1:1;
    const xx=outside(side,yy,.028+.20*rnd(i*31+9));
    const y=(yy+.010*Math.sin(t*(.16+.16*rnd(i*8))+i)) *h;
    const r=Math.max(.42,w*(.0015+.0046*rnd(i*23+5)));
    const alpha=.35+.55*(.5+.5*Math.sin(t*(.3+.6*rnd(i*49+2))+i*2));
    ctx.save();ctx.globalAlpha=alpha;
    const col=i%5===0?'#ffffff':i%3===0?'#8de2ff':'#e9bbff';
    ctx.fillStyle=col;ctx.shadowColor=col;
    ctx.shadowBlur=Math.min(16,Math.max(3,r*4));
    ctx.beginPath();ctx.arc(xx,y,r,0,PI2);ctx.fill();
    if(i%13===0){
      ctx.lineWidth=Math.max(.5,w*.0015);ctx.strokeStyle=col;
      ctx.beginPath();ctx.moveTo(xx-w*.015,y);ctx.lineTo(xx+w*.015,y);
      ctx.moveTo(xx,y-h*.011);ctx.lineTo(xx,y+h*.011);ctx.stroke();
    }
    if(i%19===0){
      // Comete: scia diagonale progressiva, senza fotogrammi a intermittenza.
      ctx.globalAlpha=alpha*.68;ctx.lineWidth=Math.max(.65,w*.003);
      ctx.beginPath();ctx.moveTo(xx-side*w*.055,y-h*.029);
      ctx.lineTo(xx,y);ctx.stroke();
    }
    ctx.restore();
  }

  // (6) SIGILLO DIMENSIONALE sotto i piedi: rune, tre orbite e riflessi.
  const baseline=h*.967;
  ctx.save();
  const g=ctx.createRadialGradient(w*.5,baseline,0,w*.5,baseline,w*.46);
  g.addColorStop(0,'rgba(218,128,255,.42)');
  g.addColorStop(.38,'rgba(141,47,247,.27)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=.48*pulse;ctx.fillStyle=g;
  ctx.beginPath();ctx.ellipse(w*.5,baseline,w*.47,h*.065,0,0,PI2);ctx.fill();
  ctx.restore();
  for(let k=0;k<3;k++){
    ctx.save();
    ctx.globalAlpha=(.68-k*.15)*pulse;
    ctx.strokeStyle=k===0?'#f0baff':k===1?'#9a55ff':'#8b9bff';
    ctx.shadowColor='#be5eff';ctx.shadowBlur=Math.min(23,w*.06);
    ctx.lineWidth=Math.max(.8,w*(.009-k*.002));
    ctx.beginPath();ctx.ellipse(w*.5,baseline-k*h*.009,w*(.42-k*.067),h*(.039-k*.008),0,0,PI2);
    ctx.stroke();ctx.restore();
  }
  for(let i=0;i<22;i++){
    const angle=i*PI2/22+t*.052;
    const rx=w*.415,ry=h*.036;
    const x=w*.5+Math.cos(angle)*rx,y=baseline+Math.sin(angle)*ry;
    const len=w*(i%3===0?.021:.012);
    ctx.save();ctx.globalAlpha=.5+.27*Math.sin(t*.7+i)**2;
    ctx.strokeStyle=i%4===0?'#fff3ff':'#bc9bff';
    ctx.shadowColor='#b163ff';ctx.shadowBlur=w*.032;
    ctx.lineWidth=Math.max(.75,w*.0028);
    ctx.beginPath();ctx.moveTo(x-len*.5,y-h*.004);
    ctx.lineTo(x+len*.5,y+h*.004);ctx.stroke();ctx.restore();
  }
  // L'esplosione centrale rimane ai PIEDI, non sul busto.
  const force=.6+.4*Math.sin(t*.52)**2;
  ctx.save();ctx.globalAlpha=force;
  ctx.fillStyle='#fff4ff';ctx.shadowColor='#c783ff';ctx.shadowBlur=w*.06;
  ctx.beginPath();ctx.moveTo(w*.5,baseline-h*.038);
  ctx.lineTo(w*.51,baseline);ctx.lineTo(w*.5,baseline+h*.033);
  ctx.lineTo(w*.49,baseline);ctx.closePath();ctx.fill();ctx.restore();

  ctx.restore();
  return true;
}


// v479 · NEBULOSA COSMICA: vera nube stellare, NON Astrale ricolorato.
// Soltanto gas volumetrici, ammassi di stelle e polvere cosmica, nessun
// nastro verticale, filamento neon, portale runico o fotografia sostitutiva.
// Tutto segue i contorni delle tre classi e conserva esattamente lo zoom.
// Un singolo Canvas trasparente è disegnato sopra la fotografia originale.
export function dipingiNebulosaCosmica(ctx,w,h,classe='assassino',t=0,stars=68) {
  if(!ctx || w<16 || h<20 || typeof ctx.createRadialGradient!=='function')return false;
  const TAU2=Math.PI*2;
  const fract=n=>n-Math.floor(n);
  const rnd=n=>fract(Math.sin(n*127.1+39.27)*43758.5453);
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const outside=(side,y,d)=>puntoLaterale(classe,clamp(y,.005,.995),side,Math.max(.022,d))*w;
  const breathe=.93+.07*Math.sin(t*.48);
  const lum=[
    [59,213,248], // gas ossigeno: turchese elettrico
    [85,113,240], // idrogeno ionizzato: indaco
    [190,97,242], // lilla tenue
    [251,108,190],// riflessi magenta
    [158,235,253] // stelle che illuminano le nubi
  ];
  // Ogni banco è fatto di macchie IRREGOLARI: non di linee sovrapposte.
  // Le macchie più grandi formano il gas, i nuclei piccoli creano profondità.
  const cloud=(x,y,rx,ry,rgb,alpha)=>{
    if(alpha<=.003)return;
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.translate(x,y);
    ctx.scale(Math.max(2,rx),Math.max(2,ry));
    const g=ctx.createRadialGradient(0,0,0,0,0,1);
    const p=(a)=>'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+a+')';
    g.addColorStop(0,p(.74));
    g.addColorStop(.26,p(.46));
    g.addColorStop(.58,p(.13));
    g.addColorStop(1,p(0));
    ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(0,0,1,0,TAU2);ctx.fill();
    ctx.restore();
  };
  ctx.save();
  // Nubi profonde: quattro masse asimmetriche per lato (niente simmetria da ali).
  const banks=[
    [-1,.15,.10,.19,.22,0],[-1,.38,.15,.25,.20,1],
    [-1,.64,.12,.21,.19,2],[-1,.85,.10,.16,.16,3],
    [ 1,.19,.13,.24,.24,1],[ 1,.48,.13,.24,.24,2],
    [ 1,.71,.09,.22,.20,0],[ 1,.88,.10,.16,.15,3]
  ];
  for(let k=0;k<banks.length;k++){
    const [side,cy,dist,rx,ry,pal]=banks[k];
    const y=(cy+.019*Math.sin(t*.19+k*1.3))*h;
    const x=outside(side,cy,dist);
    cloud(x,y,rx*w,ry*h,lum[pal],(.38+.08*Math.sin(t*.26+k))*breathe);
  }
  // Punti di condensazione, 6–10 per banco. Posizioni coerenti fra frame,
  // evoluzione lenta indipendente, variabilità di dimensioni e trasparenza.
  const perBank=stars<=45?6:10;
  for(let k=0;k<banks.length;k++){
    const [side,cy,dist,rx,ry,pal]=banks[k];
    for(let i=0;i<perBank;i++){
      const id=k*79+i*37;
      const yy=clamp(cy+(rnd(id+9)-.5)*ry*1.92,.05,.92);
      const dd=dist+(rnd(id+13)-.5)*rx*.94
        +.015*Math.sin(t*.22+id*.17);
      const x=outside(side,yy,Math.max(.027,dd));
      const y=(yy+.008*Math.cos(t*.32+id))*h;
      const rr=w*(.026+.079*rnd(id+18));
      const vr=h*(.025+.083*rnd(id+24));
      const color=lum[(pal+(i%3===0?1:0))%lum.length];
      const alpha=(.16+.23*rnd(id+28))
        *(.80+.20*Math.sin(t*.41+id*.1)**2);
      cloud(x,y,rr,vr,color,alpha*breathe);
    }
  }
  // Due regioni nebulari più luminose: stelle illuminano il gas circostante.
  for(const [side,yy,dist,pal,seed] of [
    [-1,.31,.16,4,7],[1,.59,.15,2,9],[-1,.78,.10,3,13]
  ]){
    const x=outside(side,yy,dist);
    const y=(yy+.009*Math.sin(t*.27+seed))*h;
    cloud(x,y,w*.102,h*.085,lum[pal],.52*breathe);
    cloud(x,y,w*.042,h*.037,[255,249,255],.17*breathe);
  }
  // v480 · TRE NUCLEI DI SUPERNOVA: punto focale che mancava alla Nebulosa.
  // Sono vere sorgenti di luce volumetrica: non cerchi/rune/portali di Astrale.
  // La rarità Leggendaria ha due stelle dominanti e una terza più tenue.
  // La posizione è calcolata sulla sagoma in tutte le tre classi.
  const nuclei=[
    {side:-1,y:.275,d:.155,col:[92,231,255],seed:1,intensita:1},
    {side:1,y:.565,d:.145,col:[232,137,255],seed:3,intensita:.87},
    {side:-1,y:.795,d:.112,col:[255,164,231],seed:5,intensita:.60}
  ];
  for(let k=0;k<nuclei.length;k++){
    const n=nuclei[k];
    const yy=n.y+.014*Math.sin(t*.28+n.seed);
    const x=outside(n.side,yy,n.d+.012*Math.sin(t*.21+n.seed));
    const y=yy*h;
    const pulsa=(.79+.21*Math.sin(t*.76+n.seed))*n.intensita;
    // alone largo + gas illuminato + nucleo, tre profondità disaccoppiate.
    cloud(x,y,w*.19,h*.16,n.col,.84*pulsa);
    cloud(x,y,w*.095,h*.082,[248,225,255],.79*pulsa);
    cloud(x,y,w*.037,h*.031,[255,255,255],.95*pulsa);
    // v481: niente tre adesivi a rombo: nuclei tondi, diffusi nel gas
    // con luminosità diversa e piccole variazioni di intensità.
    const rr=w*(k===0?.016:k===1?.013:.009);
    ctx.save();ctx.globalAlpha=.74*pulsa;
    ctx.fillStyle='#f5ffff';
    ctx.shadowColor=k===0?'#70f1ff':k===1?'#de9bff':'#ffc4ee';
    ctx.shadowBlur=Math.max(10,w*.068);
    ctx.beginPath();ctx.arc(x,y,rr,0,TAU2);ctx.fill();
    ctx.restore();

    // Polvere in orbita gravitazionale: una spirale fatta di singoli granelli,
    // mai di fasci o curve fluorescenti. L'insieme gira dolcemente.
    const granelli=stars<=45?17:27;
    for(let i=0;i<granelli;i++){
      const p=i/granelli;
      const angle=p*Math.PI*3.65+t*(k===1?-.27:.22)+n.seed;
      const radius=(.025+.14*p)*w;
      const xx=x+Math.cos(angle)*radius;
      const py=y+Math.sin(angle)*radius*(h/w)*.68;
      const dotRadius=Math.max(.45,w*(.0016+.0026*rnd(i*13+k*43)));
      const sparkle=.36+.48*(.5+.5*Math.sin(t*.73+i*.67+n.seed));
      ctx.save();
      ctx.globalAlpha=sparkle*pulsa;
      ctx.fillStyle=i%6===0?'#ffffff':k===0?'#a0f9ff':k===1?'#e2b1ff':'#ffd4f2';
      ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=Math.max(3,dotRadius*4);
      ctx.beginPath();ctx.arc(xx,py,dotRadius,0,TAU2);ctx.fill();
      ctx.restore();
    }
  }
  // Impulsi di micro-comete: tre piogge brevi, diverse per fase, niente
  // stroboscopi. Il moto resta all'esterno della foto originale.
  for(let i=0;i<(stars<=45?16:28);i++){
    const side=i%2?-1:1;
    const progress=(rnd(i*19+71)+t*(.025+.013*rnd(i*5+3)))%1;
    const yy=.09+progress*.81;
    const x=outside(side,yy,.040+.18*rnd(i*43+7));
    const y=yy*h;
    const rad=Math.max(.55,w*(.0016+.0023*rnd(i*23+4)));
    const fade=Math.sin(progress*Math.PI);
    ctx.save();ctx.globalAlpha=fade*(.32+.39*rnd(i*13+11));
    ctx.fillStyle=i%3===0?'#fcf5ff':i%3===1?'#83eaff':'#cda5ff';
    ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=Math.max(3,rad*5);
    ctx.beginPath();ctx.arc(x,y,rad,0,TAU2);ctx.fill();
    ctx.restore();
  }

  // v481: gas in ricircolo. La galassia sembra UN SOLO evento, non
  // tre luci separate. Le volute sono nubi irregolari con bordi morbidi,
  // non tubi al neon, e seguono la sagoma senza coprire il personaggio.
  for(let j=0;j<4;j++){
    const side=j%2?-1:1;
    const steps=stars<=45?7:12; // 20 fps iPhone, qualità invariata
    for(let i=0;i<steps;i++){
      const p=i/steps,yy=.12+.72*p;
      const twist=Math.sin(yy*9.5-t*.22+j*1.73);
      const dist=.075+.085*(.5+.5*twist)+.025*Math.cos(yy*17+j);
      const x=outside(side,yy,dist);
      const y=(yy+.017*Math.cos(t*.19+j+p*7))*h;
      const tone=lum[(j+i%3)%lum.length];
      const alpha=(.18+.12*Math.sin(p*Math.PI))*(.86+.14*Math.cos(t*.31+j));
      cloud(x,y,w*(.056+.042*Math.sin(p*Math.PI)),h*(.052+.04*Math.sin(p*Math.PI)),tone,alpha);
    }
  }
  // Polvere galattica: tante stelle PICCOLE intorno a tutte le silhouette.
  // I corpi rimangono protetti dalla maschera finale.
  const count=Math.max(20,Math.min(stars,100));
  for(let i=0;i<count;i++){
    const side=i%2?-1:1;
    const yy=.035+.92*rnd(i*23+6);
    const dist=.026+.20*rnd(i*19+5);
    const x=outside(side,yy,dist);
    const y=(yy+.011*Math.sin(t*(.11+.09*rnd(i*7))+i))*h;
    const r=Math.max(.50,w*(.0012+.0035*rnd(i*29+8)));
    const rgb=lum[(i+2)%lum.length];
    const twinkle=(.34+.57*(.5+.5*Math.sin(t*(.45+rnd(i*47))+i*1.9)));
    ctx.save();
    ctx.globalAlpha=twinkle;ctx.fillStyle='rgb('+rgb.join(',')+')';
    ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=Math.min(12,r*4);
    ctx.beginPath();ctx.arc(x,y,r,0,TAU2);ctx.fill();
    // Rari bagliori stellari a 4 punte, niente fasci o scie verticali.
    if(i%16===0){
      const d=w*(.009+.009*rnd(i+4));
      ctx.globalAlpha=twinkle*.65;
      ctx.beginPath();
      ctx.moveTo(x,y-d*1.6);ctx.lineTo(x+d*.25,y);
      ctx.lineTo(x,y+d*1.6);ctx.lineTo(x-d*.25,y);
      ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
  // Diffusione sul terreno senza cerchi, rune, halo da Astrale.
  cloud(w*.43,h*.954,w*.31,h*.040,lum[0],.30*breathe);
  cloud(w*.57,h*.947,w*.29,h*.038,lum[2],.19*breathe);

  // Svuotamento protettivo della sagoma originale, valido per ogni armatura,
  // livello e arma. Il personaggio conserva i pixel e la scala d'origine.
  ctx.save();
  ctx.globalCompositeOperation='destination-out';
  if('filter' in ctx)ctx.filter='blur('+Math.max(2,Math.round(w*.007))+'px)';
  ctx.fillStyle='#000';ctx.beginPath();
  for(let j=0;j<=80;j++){
    const yy=j/80;const [left]=bordoSagomaRpg(classe,yy);
    if(!j)ctx.moveTo((left-.014)*w,yy*h);
    else ctx.lineTo((left-.014)*w,yy*h);
  }
  for(let j=80;j>=0;j--){
    const yy=j/80;const [,right]=bordoSagomaRpg(classe,yy);
    ctx.lineTo((right+.014)*w,yy*h);
  }
  ctx.closePath();ctx.fill();ctx.restore();
  ctx.restore();
  return true;
}
