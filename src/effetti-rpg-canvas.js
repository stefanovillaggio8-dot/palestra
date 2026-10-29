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
  return Boolean(mitica || tipo==='effetto-ambra' || tipo==='effetto-fulmine');
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
  let w=0,h=0,dpr=1,frameId=0,last=0,visible=true,ended=false;
  let wasAttached=false,tries=0,observer=null,resizeObs=null;
  let motionFirstFrame=true;

  function size(){
    const rect=elemento.getBoundingClientRect();
    const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
    const ratio=Math.min(MASSIMO_DPR,window.devicePixelRatio||1);
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
  function nebula(t){
    ambient(t);
    for(const p of vapori){
      const yy=((p.y-t*p.vel*.65)%1+1)%1;
      const x=puntoLaterale(personaggio,yy,p.lato,p.dist+Math.sin(t*.36+p.fase)*.028)*w;
      const r=w*p.scala*1.1;
      const c=['rgba(77,151,203,.40)','rgba(137,91,186,.39)','rgba(75,172,169,.35)'][p.tonalita];
      haze(x,h*yy,r*1.45,r*1.15,c,.25);
    }
    for(const p of scintille){
      const yy=((p.y-t*p.vel*.22)%1+1)%1;
      const x=puntoLaterale(personaggio,yy,p.lato,p.dist+Math.sin(t*.45+p.fase)*.023)*w;
      const twinkle=.15+.37*(.5+.5*Math.sin(t*(.7+p.giro)+p.fase));
      dot(x,h*yy,Math.max(.5,p.r*.8),palette[p.colore],twinkle);
    }
    for(const side of [-1,1]){
      ctx.save();
      ctx.globalAlpha=.18;
      ctx.strokeStyle=side<0?'#75b9ef':'#cc92ff';
      ctx.lineWidth=Math.max(.7,w*.003);
      ctx.beginPath();
      for(let i=0;i<=32;i++){
        const yy=.22+i/32*.63;
        const x=puntoLaterale(personaggio,yy,side,.07+.025*Math.sin(yy*9+t*.42+side))*w;
        if(i===0)ctx.moveTo(x,yy*h);else ctx.lineTo(x,yy*h);
      }
      ctx.stroke();ctx.restore();
    }
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
    if(mitica && tipo!=='effetto-nebula') {
      // Astrale è un cielo di stelle e luce dietro l'eroe, non un rombo sul petto.
      // Se un altro effetto è equipaggiato, non ne nasconde le scintille.
      ctx.save();ctx.globalAlpha=tipo?.55:1;nebula(t);ctx.restore();
    }
    if(tipo==='effetto-ambra')amber(t);
    else if(tipo==='effetto-ombra')smoke(t);
    else if(tipo==='effetto-fulmine')arc(t);
    else if(tipo==='effetto-nebula')nebula(t);
    else if(divina||corona)ambient(t);
    // Le scintille e gli archi sono già posizionati fuori dal bordo corporeo.
    // La vecchia grande maschera ovale li eliminava quasi tutti su iPhone!
    // La cancellazione sfumata rimane SOLO per i vapori più diffusi.
    if(tipo==='effetto-ombra'||tipo==='effetto-nebula' ||
       (mitica&&!tipo)) cancellaCorpo();
    aura(t);
  }
  function cleanup(){
    if(ended)return;
    ended=true;cancelAnimationFrame(frameId);
    observer?.disconnect();resizeObs?.disconnect();
    canvas.remove();
    if(EFFETTI_ATTIVI.get(elemento)===cleanup)EFFETTI_ATTIVI.delete(elemento);
    elemento.classList?.remove?.('rpg-fx-attiva');
  }
  function tick(ms){
    if(ended)return;
    if(!elemento.isConnected){
      if(wasAttached||++tries>180){cleanup();return;}
      frameId=requestAnimationFrame(tick);return;
    }
    wasAttached=true;
    if(visible && (ms-last>=33||!last)){
      last=ms;size();render(riduci?0:ms/1000);
    }
    if(!riduci)frameId=requestAnimationFrame(tick);
    else {observer?.disconnect();resizeObs?.disconnect();}
  }
  if(typeof IntersectionObserver==='function'){
    observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);},{threshold:0});
    observer.observe(elemento);
  }
  if(typeof ResizeObserver==='function'){
    resizeObs=new ResizeObserver(size);resizeObs.observe(elemento);
  }
  elemento.classList?.add?.('rpg-fx-attiva');
  EFFETTI_ATTIVI.set(elemento,cleanup);
  frameId=requestAnimationFrame(tick);
  return cleanup;
}
