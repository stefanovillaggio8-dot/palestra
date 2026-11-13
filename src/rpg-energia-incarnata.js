// Effetti cosmici v493: la fonte della luce è il personaggio, non il panorama.
// Coordinate relative alla STESSA fotografia originale (900 × 1350): nessuna
// alterazione di corpo, volto, arma, armatura, posa o fattore di zoom.
const TAU = Math.PI * 2;
const classi = ['assassino', 'guerriero', 'berserker'];
const geometria = Object.freeze({
  assassino: {
    petto:[.50,.318], spalle:[[.33,.255],[.67,.255]], mani:[[.235,.529],[.753,.529]],
    giunture:[[.29,.39],[.71,.39]], nuclei:[[.42,.298],[.58,.302],[.50,.415]],
    armi:[[[.23,.529],[.315,.675]],[[.75,.528],[.661,.683]]],
  },
  guerriero: {
    petto:[.49,.298], spalle:[[.345,.231],[.648,.234]], mani:[[.225,.517],[.735,.414]],
    giunture:[[.29,.358],[.675,.347]], nuclei:[[.43,.300],[.575,.31],[.765,.456]],
    armi:[[[.224,.530],[.226,.925]],[[.74,.405],[.763,.557]]],
  },
  berserker: {
    petto:[.485,.312], spalle:[[.306,.254],[.688,.264]], mani:[[.188,.417],[.683,.489]],
    giunture:[[.265,.334],[.708,.367]], nuclei:[[.45,.32],[.555,.334],[.49,.413]],
    armi:[[[.178,.423],[.173,.913]],[[.188,.425],[.113,.204]]],
  },
});

export function ancoreEnergiaRpg(classe='assassino') {
  return geometria[classi.includes(classe) ? classe : 'assassino'];
}

const rand = n => {const v=Math.sin(n*78.233+12.75)*43758.5453;return v-Math.floor(v);};
const clamp = (n,a=0,b=1) => Math.max(a,Math.min(b,n));

function radiale(ctx,x,y,rx,ry,colore,forza) {
  if(forza<=0)return;
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  const grad=ctx.createRadialGradient(0,0,0,0,0,1);
  grad.addColorStop(0,colore);grad.addColorStop(.22,colore);
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=forza;ctx.fillStyle=grad;
  ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.fill();ctx.restore();
}

function traccia(ctx,punti,w,h,colore,forza,spessore=.003) {
  if(punti.length<2||forza<=0)return;
  const path=()=>{
    ctx.beginPath();ctx.moveTo(punti[0][0]*w,punti[0][1]*h);
    for(let i=1;i<punti.length;i++)ctx.lineTo(punti[i][0]*w,punti[i][1]*h);
  };
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.globalAlpha=forza*.24;ctx.strokeStyle=colore;ctx.lineWidth=w*spessore*9;
  ctx.shadowColor=colore;ctx.shadowBlur=Math.min(17,w*.044);
  path();ctx.stroke();
  ctx.globalAlpha=forza*.58;ctx.lineWidth=w*spessore*3.1;ctx.shadowBlur=Math.min(9,w*.022);
  path();ctx.stroke();
  ctx.globalAlpha=forza;ctx.strokeStyle='#fff9f3';ctx.lineWidth=Math.max(.55,w*spessore*.62);
  ctx.shadowBlur=0;path();ctx.stroke();ctx.restore();
}

function orbita(ctx,w,h,centro,raggio,t,colore,forza,angolo=0) {
  // Orbita interrotta: una parte dietro al corpo, non uno sticker sul torace.
  const punti=[];
  for(let i=0;i<=36;i++){
    const a=angolo+.20+i/36*Math.PI*.92+t*.085;
    const x=centro[0]+Math.cos(a)*raggio[0];
    const y=centro[1]+Math.sin(a)*raggio[1];
    punti.push([x,y]);
  }
  traccia(ctx,punti,w,h,colore,forza,.0032);
}

/** Disegno trasparente, usabile sia nel browser sia nel PNG esportato.
 * `retro` è coperto dal WebP del personaggio; `fronte` vive sopra il ritratto.
 * Le scintille partono da mani, metallo e spalle e non dal cielo circostante.
 */
export function disegnaEnergiaIncarnataRpg(ctx,w,h,classe='assassino',effetto='astrale',t=0,{fase='fronte',soggetto=null,buffer=null}={}) {
  if(!ctx||w<16||h<20||!classi.includes(classe)||!['astrale','nebulosa'].includes(effetto))return false;
  const a=geometria[classe],astrale=effetto==='astrale';
  const primario=astrale?'#b16bff':'#5addf3';
  const secondario=astrale?'#ffc47c':'#ae8fff';
  const velluto=astrale?'rgba(146,60,255,.48)':'rgba(34,196,230,.39)';
  const pulso=.86+.14*Math.sin(t*1.52);
  const xy=p=>[p[0]*w,p[1]*h];
  const nascosto=fase==='retro';
  ctx.save();

  if(nascosto){
    // Grandi nastri morbidi in profondità: scompaiono quando passano DIETRO
    // scudo, mantello e corazza, perché il ritratto viene dipinto dopo.
    for(let lato=0;lato<2;lato++){
      const s=lato===0?-1:1;
      const origine=a.spalle[lato];
      for(let fila=0;fila<(astrale?3:4);fila++){
        const punti=[];
        for(let i=0;i<=28;i++){
          const q=i/28;
          const y=.22+q*.60;
          const corrente=Math.sin(q*TAU*(astrale?1.15:1.42)-t*(astrale?.58:.39)+fila*1.25+lato)*(.025+fila*.010);
          const x=origine[0]+s*(.035+q*.065+fila*.026)+corrente;
          punti.push([x,y]);
        }
        traccia(ctx,punti,w,h,fila%2?secondario:primario,(astrale?.35:.26)*pulso/(1+fila*.28),astrale?.0027:.0044);
      }
      const p=xy(a.mani[lato]);
      radiale(ctx,p[0],p[1],w*.14,h*.12,velluto,(astrale?.48:.65)*pulso);
    }
    if(astrale){
      orbita(ctx,w,h,[.50,.46],[.32,.116],t,secondario,.36,Math.PI*.05);
      orbita(ctx,w,h,[.50,.70],[.31,.090],-t,primario,.33,Math.PI*.90);
    }else{
      orbita(ctx,w,h,[.49,.47],[.30,.14],t,primario,.24,Math.PI*.08);
    }
    ctx.restore();return true;
  }

  // RIFLESSI SULL'ARMATURA: disegnati prima su canvas separato e poi
  // mascherati con l'alpha REALE del personaggio, non una sagoma inventata.
  let luce=ctx;
  if(soggetto?.naturalWidth && buffer?.getContext){
    if(buffer.width!==Math.round(w)||buffer.height!==Math.round(h)){
      buffer.width=Math.round(w);buffer.height=Math.round(h);
    }
    const temporaneo=buffer.getContext('2d',{alpha:true});
    if(temporaneo){
      luce=temporaneo;luce.clearRect(0,0,w,h);
      luce.save();luce.globalCompositeOperation='screen';
    }
  }
  for(let i=0;i<a.nuclei.length;i++){
    const p=xy(a.nuclei[i]);
    radiale(luce,p[0],p[1],w*(astrale?.15:.13),h*.092,
      i%2?secondario:primario,(astrale?.31:.23)*pulso);
  }
  for(let i=0;i<2;i++){
    const sp=xy(a.spalle[i]);const m=xy(a.mani[i]);
    radiale(luce,sp[0],sp[1],w*.12,h*.066,primario,(astrale?.34:.27)*pulso);
    radiale(luce,m[0],m[1],w*.10,h*.065,secondario,(astrale?.37:.32)*pulso);
  }
  if(luce!==ctx){
    luce.restore();luce.save();
    luce.globalCompositeOperation='destination-in';
    try {luce.drawImage(soggetto,0,0,w,h);}catch { /* nessun ritratto nascosto */ }
    luce.restore();
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.88;
    ctx.drawImage(buffer,0,0,w,h);ctx.restore();
  }

  // Vene d'energia direttamente dalle mani lungo il metallo delle armi.
  // Ogni classe ha coordinate proprie: il Guerriero non riceve due pugnali!
  for(let i=0;i<a.armi.length;i++){
    const [inizio,fine]=a.armi[i];
    const onda=Math.sin(t*(astrale?2.2:1.1)+i*2.1)*.006;
    const punti=[];
    for(let s=0;s<=17;s++){
      const q=s/17;
      punti.push([inizio[0]+(fine[0]-inizio[0])*q+onda*Math.sin(q*TAU*1.7),
        inizio[1]+(fine[1]-inizio[1])*q]);
    }
    traccia(ctx,punti,w,h,i%2?primario:secondario,(astrale?.68:.47)*pulso,.0023);
    const p=xy(inizio);
    radiale(ctx,p[0],p[1],w*.085,h*.055,astrale?secondario:primario,.30*pulso);
  }

  // Nodi che rispondono ai movimenti: si accendono su guanti e spallacci;
  // i piccoli archi sono ancorati alla materia, non al fondale.
  const centri=[...a.spalle,...a.mani,...a.giunture,...a.nuclei];
  for(let i=0;i<centri.length;i++){
    const p=centri[i],phase=t*(astrale?1.3:.72)+i*1.8;
    const intensita=.41+.33*Math.sin(phase)**2;
    const px=p[0]*w,py=p[1]*h;
    radiale(ctx,px,py,w*(astrale?.055:.075),h*(astrale?.033:.046),
      i%3===0?secondario:primario,intensita*(astrale?.31:.23));
    if(astrale&&i<4){
      const r=w*(i%2?.044:.053);
      ctx.save();ctx.strokeStyle=i%2?primario:secondario;
      ctx.globalAlpha=intensita*.57;ctx.lineWidth=Math.max(.8,w*.0033);
      ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=11;
      ctx.beginPath();ctx.arc(px,py,r,phase*.18+.2,phase*.18+Math.PI*.85);
      ctx.stroke();ctx.restore();
    }
  }

  // Particelle EMESSE dalle giunture, non stelle distribuite nello sfondo.
  // Posizioni deterministiche: niente sfarfallii casuali a ogni fotogramma.
  const quantita=astrale?48:35;
  for(let i=0;i<quantita;i++){
    const p=centri[i%centri.length],ciclo=(rand(i*17+3)+t*(astrale?.14:.085)+i*.023)%1;
    const direzione=rand(i*11+7)*TAU;
    const d=(.012+rand(i*37+9)*(astrale?.12:.11))*ciclo;
    const x=(p[0]+Math.cos(direzione)*d+Math.sin(t*.6+i)*.007)*w;
    const y=(p[1]-ciclo*(astrale?.115:.085)+Math.sin(direzione)*d*.5)*h;
    if(x<0||x>w||y<0||y>h)continue;
    const alpha=clamp(Math.sin(ciclo*Math.PI))*(.30+.44*rand(i*19+1));
    const radius=Math.max(.48,w*(.0015+rand(i*13+6)*.0033));
    ctx.save();ctx.globalAlpha=alpha;
    ctx.fillStyle=i%4===0?secondario:(i%3===0?'#fff9ed':primario);
    ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=Math.min(12,Math.max(3,radius*5));
    ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.fill();
    if(astrale&&i%9===0){
      ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=Math.max(.6,w*.0014);
      ctx.beginPath();ctx.moveTo(x-w*.011,y);ctx.lineTo(x+w*.011,y);
      ctx.moveTo(x,y-h*.008);ctx.lineTo(x,y+h*.008);ctx.stroke();
    }
    ctx.restore();
  }

  // Il Mitico ha un guizzo di energia d'oro sul pettorale; il Leggendario
  // un nastro fluido che avvolge guanti e spalle, senza coprire il volto.
  for(let i=0;i<2;i++){
    const m=a.mani[i],s=a.spalle[i],n=a.giunture[i];
    const punti=[];
    for(let j=0;j<=24;j++){
      const q=j/24;
      const y=m[1]+(s[1]-m[1])*q;
      const x=m[0]+(n[0]-m[0])*Math.sin(Math.PI*q*.85)
        +Math.sin(q*TAU*1.4-t*(astrale?.85:.50)+i)*(.009+.009*q);
      punti.push([x,y]);
    }
    traccia(ctx,punti,w,h,i===0?primario:secondario,(astrale?.31:.43)*pulso,astrale?.002:.0034);
  }
  ctx.restore();
  return true;
}

/** Attacca la coppia di canvas al riquadro della FOTO, che mantiene il suo zoom.
 * Non cambia mai l'immagine originale né lo stato del giocatore.
 */
export function montaEnergiaIncarnataRpg(palco,grafica,foto,{classe='assassino',effetto='astrale',documento=globalThis.document}={}) {
  if(!palco?.appendChild||!foto||!documento?.createElement||
      typeof requestAnimationFrame!=='function'||!classi.includes(classe))return false;
  const dietro=documento.createElement('canvas'),davanti=documento.createElement('canvas');
  for(const [can,tag] of [[dietro,'rpg-energia-retro'],[davanti,'rpg-energia-fronte']]){
    can.className=tag;can.setAttribute?.('aria-hidden','true');
    can.style.pointerEvents='none';palco.appendChild(can);
  }
  const retro=dietro.getContext?.('2d',{alpha:true}),front=davanti.getContext?.('2d',{alpha:true});
  if(!retro||!front){dietro.remove?.();davanti.remove?.();return false;}
  const buffer=documento.createElement('canvas');
  const ios=typeof navigator!=='undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent||'');
  const movimentoRidotto=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion:reduce)').matches;
  let w=0,h=0,ratio=1,finito=false,frame=0,ultimo=-Infinity,ultimaMisura=-Infinity;
  let visibile=true,attaccato=false,tentativi=0;
  let observer=null,resize=null;
  const misura=()=>{
    const fr=foto.getBoundingClientRect?.(),pr=palco.getBoundingClientRect?.();
    if(!fr||!pr||fr.width<16||fr.height<20)return false;
    const bw=Math.round(fr.width),bh=Math.round(fr.height),dpr=Math.min(ios?1.15:1.45,globalThis.devicePixelRatio||1);
    for(const can of [dietro,davanti]){
      can.style.left=(fr.left-pr.left)+'px';can.style.top=(fr.top-pr.top)+'px';
      can.style.width=fr.width+'px';can.style.height=fr.height+'px';
      if(w!==bw||h!==bh||ratio!==dpr){can.width=Math.round(bw*dpr);can.height=Math.round(bh*dpr);}
    }
    if(w!==bw||h!==bh||ratio!==dpr){w=bw;h=bh;ratio=dpr;retro.setTransform(dpr,0,0,dpr,0,0);front.setTransform(dpr,0,0,dpr,0,0);}
    return true;
  };
  const disegna=tempo=>{
    if(w<16||h<20)return;
    retro.clearRect(0,0,w,h);front.clearRect(0,0,w,h);
    const cutout=grafica?.querySelector?.('.rpg-cosmic-cutout-asset');
    const alpha=palco.classList?.contains?.('rpg-cosmic-cutout-ready')&&cutout?.naturalWidth?cutout:null;
    disegnaEnergiaIncarnataRpg(retro,w,h,classe,effetto,tempo,{fase:'retro'});
    disegnaEnergiaIncarnataRpg(front,w,h,classe,effetto,tempo,{fase:'fronte',soggetto:alpha,buffer});
    palco.classList?.add?.('rpg-energia-pronta');
    palco.parentNode?.classList?.add?.('rpg-energia-pronta');
  };
  const hidden=()=>documento.visibilityState==='hidden';
  const loop=ms=>{
    frame=0;if(finito)return;
    if(!palco.isConnected){
      if(attaccato||++tentativi>180){smonta();return;}
      frame=requestAnimationFrame(loop);return;
    }
    attaccato=true;
    if(hidden()||!visibile)return;
    // Non misuriamo la pagina ogni frame: sul telefono un reflow continuo
    // rallenterebbe scroll e anteprime. ResizeObserver segue lo zoom reale.
    if(!w||ms-ultimaMisura>950){misura();ultimaMisura=ms;}
    if(ms-ultimo>(ios?65:40)||ultimo===-Infinity){ultimo=ms;disegna(movimentoRidotto?2.8:ms/1000);}
    if(!movimentoRidotto)frame=requestAnimationFrame(loop);
  };
  const riprendi=()=>{if(!frame&&!finito&&!hidden()&&visibile)frame=requestAnimationFrame(loop);};
  const visibilita=()=>riprendi();
  const smonta=()=>{
    if(finito)return;finito=true;if(frame)cancelAnimationFrame(frame);
    observer?.disconnect();resize?.disconnect();documento.removeEventListener?.('visibilitychange',visibilita);
    dietro.remove?.();davanti.remove?.();
  };
  if(typeof IntersectionObserver==='function'){
    observer=new IntersectionObserver(entries=>{
      visibile=entries.some(e=>e.isIntersecting);if(visibile)riprendi();
    });observer.observe(palco);
  }
  if(typeof ResizeObserver==='function'){
    resize=new ResizeObserver(()=>{misura();riprendi();});
    resize.observe(foto);resize.observe(palco);
  }
  documento.addEventListener?.('visibilitychange',visibilita);
  riprendi();return true;
}
