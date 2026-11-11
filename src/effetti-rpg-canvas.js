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
  return Boolean((mitica || tipo==='effetto-ambra' || tipo==='effetto-fulmine') &&
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
  // ASTR ALE IMPERIALE — mitico deve essere inconfondibile, non la stessa
  // Nebulosa ricolorata. Fasci di aurora, comete e costellazioni sono sempre
  // esterni alla sagoma, con animazioni lente e un budget fisso su iPhone.
  // Le stelle vengono create UNA SOLA VOLTA al montaggio: niente allocazioni
  // o texture da scaricare a ogni frame.
  const stelleAstrali=mitica ? Array.from({length:ios?30:48},(_,i)=>({
    y:casuale(.045,.92),lato:i%2?1:-1,dist:casuale(.035,.13),
    r:casuale(.65,2.1),fase:casuale(0,TAU),vel:casuale(.42,.97),
    tinta:i%5,luminosita:casuale(.55,1),
  })) : [];
  function astrale(t){
    const pulsazione=.87+.13*Math.sin(t*.72);
    // Tre sorgenti luminose: l'armatura non viene tinta o oscurata.
    haze(w*.07,h*.39,w*.30,h*.50,'rgba(164,72,255,.84)',.62*pulsazione);
    haze(w*.93,h*.46,w*.31,h*.49,'rgba(53,204,255,.83)',.61*pulsazione);
    haze(w*.5,h*.975,w*.45,h*.11,'rgba(235,160,255,.75)',.53*pulsazione);
    // Tre nastri per lato: gradienti cromatici e ampiezza variabile,
    // come ali di aurora ma senza un cerchio sul volto o sul torso.
    for(const lato of [-1,1]){
      for(let fascia=0;fascia<3;fascia++){
        ctx.save();
        ctx.globalAlpha=(.79-fascia*.12)*pulsazione;
        ctx.strokeStyle=(lato<0
          ? ['#8852fa','#da7dff','#f3dbff']
          : ['#3ecff9','#99eafa','#f7d3ff'])[fascia];
        ctx.lineWidth=Math.max(1.65,w*(.019-fascia*.0045));
        ctx.lineCap='round';ctx.lineJoin='round';
        ctx.shadowColor=lato<0?'#995bff':'#3ee2ff';
        ctx.shadowBlur=Math.min(28,w*.078);
        ctx.beginPath();
        for(let i=0;i<=28;i++){
          const yy=.075+.83*i/28;
          const onda=Math.sin(yy*11-t*.68+fascia*1.25+lato*.5)*.018
            +Math.cos(yy*18+t*.27+fascia)*.009;
          const dist=.032+fascia*.024+onda;
          const x=puntoLaterale(personaggio,yy,lato,dist)*w;
          if(i===0)ctx.moveTo(x,yy*h);else ctx.lineTo(x,yy*h);
        }
        ctx.stroke();ctx.restore();
      }
    }
    // Comete con scia affusolata: le stelle grandi cambiano posizione,
    // evitando i lunghi flash elettrici degli effetti Epici.
    for(let i=0;i<6;i++){
      const p=stelleAstrali[i*5];
      if(!p)continue;
      const y=((p.y-t*(.035+i*.004))%1+1)%1;
      const x=puntoLaterale(personaggio,y,p.lato,p.dist)*w;
      const c=i%2?'#b8f7ff':'#ffcbff';
      const luce=.52+.37*(.5+.5*Math.sin(t*.85+p.fase));
      ctx.save();
      ctx.globalAlpha=luce;ctx.strokeStyle=c;
      ctx.lineWidth=Math.max(1,w*.0035);
      ctx.lineCap='round';ctx.shadowColor=c;ctx.shadowBlur=9;
      ctx.beginPath();ctx.moveTo(x-p.lato*w*.036,y*h+h*.027);
      ctx.lineTo(x,y*h);ctx.stroke();ctx.restore();
    }
    // Costellazioni nitide su un fondo diffuso: alcune stelle a quattro
    // punte e molti punti piccoli, senza interferire con la Corona.
    const colori=['#fff8ff','#dbb9ff','#8feaff','#ffceec','#fff0bf'];
    for(let i=0;i<stelleAstrali.length;i++){
      const p=stelleAstrali[i];
      const y=limita(p.y+Math.sin(t*.34+p.fase)*.008,.02,.98);
      const x=puntoLaterale(personaggio,y,p.lato,p.dist
        +Math.sin(t*.26+p.fase)*.009)*w;
      const twinkle=(.48+.52*(.5+.5*Math.sin(t*p.vel*2+p.fase)))
        *p.luminosita;
      const c=colori[p.tinta];
      dot(x,y*h,p.r,c,Math.min(.95,twinkle*.85));
      if(i%7===0) {
        ctx.save();ctx.globalAlpha=.80*twinkle;
        ctx.strokeStyle=c;ctx.lineWidth=Math.max(.65,w*.002);
        ctx.shadowColor=c;ctx.shadowBlur=7;
        ctx.beginPath();
        ctx.moveTo(x-w*.011,y*h);ctx.lineTo(x+w*.011,y*h);
        ctx.moveTo(x,y*h-h*.008);ctx.lineTo(x,y*h+h*.008);
        ctx.stroke();ctx.restore();
      }
    }
    // Sigillo di energia sospeso sul terreno, parzialmente nascosto
    // dalle gambe attraverso la normale maschera fotografica.
    ctx.save();ctx.globalAlpha=.48+.11*Math.sin(t*.84);
    ctx.lineWidth=Math.max(1,w*.004);
    ctx.strokeStyle='#bda1ff';ctx.shadowColor='#bd7aff';
    ctx.shadowBlur=Math.min(18,w*.045);
    ctx.beginPath();ctx.ellipse(w*.5,h*.958,w*.33,h*.027,0,0,TAU);ctx.stroke();
    ctx.globalAlpha=.35;ctx.strokeStyle='#93eaff';
    ctx.beginPath();ctx.ellipse(w*.5,h*.958,w*.245,h*.016,0,0,TAU);ctx.stroke();
    ctx.restore();
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
    if(tipo==='effetto-ombra'||tipo==='effetto-nebula') cancellaCorpo();
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
export function disegnaAstraleExport(ctx,{classe='guerriero',x=0,y=0,width=780,height=1170}={}) {
  if(!ctx || typeof ctx.createRadialGradient!=='function')return false;
  const w=width,h=height;
  ctx.save();ctx.translate(x,y);
  for(const lato of [-1,1]) {
    const cx=w*(lato<0?.08:.92);
    const grad=ctx.createRadialGradient(cx,h*.49,0,cx,h*.49,w*.28);
    grad.addColorStop(0,lato<0?'rgba(183,74,255,.26)':'rgba(75,215,255,.23)');
    grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.save();ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);ctx.restore();
    for(let fascia=0;fascia<3;fascia++) {
      ctx.save();ctx.globalAlpha=.86-fascia*.20;
      ctx.lineCap='round';ctx.lineJoin='round';
      ctx.strokeStyle=(lato<0?['#9e66ff','#eea7ff','#fff5ff']:
        ['#49ddff','#b9eeff','#efcfff'])[fascia];
      ctx.lineWidth=Math.max(1.5,w*(.010-fascia*.002));
      ctx.shadowColor=lato<0?'#9e5bff':'#62e3ff';
      ctx.shadowBlur=Math.max(7,w*.036);
      ctx.beginPath();
      for(let i=0;i<=40;i++) {
        const yy=.10+.79*i/40;
        const wave=Math.sin(yy*13+fascia*1.2+lato*.7)*.02;
        const xx=puntoLaterale(classe,yy,lato,.018+fascia*.021+wave)*w;
        if(i===0)ctx.moveTo(xx,yy*h);else ctx.lineTo(xx,yy*h);
      }
      ctx.stroke();ctx.restore();
    }
  }
  // Scie e costellazioni sempre esterne all'avatar, senza incollare un'altra skin.
  for(let i=0;i<36;i++) {
    const yy=.09+((i*0.6180339887)%1)*.83,lato=i%2?-1:1;
    const offset=.035+((i*0.3819660113)%1)*.09;
    const xx=puntoLaterale(classe,yy,lato,offset)*w;
    const r=Math.max(1,w*(i%9===0?.005:.002));
    ctx.save();ctx.fillStyle=i%3===0?'#fff7ff':i%3===1?'#b1eaff':'#e5adff';
    ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=r*6;
    ctx.globalAlpha=.55+(i%4)*.10;
    ctx.beginPath();ctx.arc(xx,yy*h,r,0,TAU);ctx.fill();
    if(i%9===0){
      ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=Math.max(1,w*.0015);
      ctx.beginPath();ctx.moveTo(xx-r*4,yy*h);ctx.lineTo(xx+r*4,yy*h);
      ctx.moveTo(xx,yy*h-r*4);ctx.lineTo(xx,yy*h+r*4);ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();ctx.strokeStyle='#c496ff';ctx.shadowColor='#ba75ff';
  ctx.shadowBlur=Math.max(6,w*.030);ctx.globalAlpha=.76;
  ctx.lineWidth=Math.max(1.5,w*.004);
  if(typeof ctx.ellipse==='function') {
    ctx.beginPath();ctx.ellipse(w*.5,h*.965,w*.36,h*.025,0,0,TAU);ctx.stroke();
    ctx.globalAlpha=.4;ctx.strokeStyle='#78e7ff';
    ctx.beginPath();ctx.ellipse(w*.5,h*.965,w*.25,h*.016,0,0,TAU);ctx.stroke();
  }
  ctx.restore();ctx.restore();
  return true;
}
