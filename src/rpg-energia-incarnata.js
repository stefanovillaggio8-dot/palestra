// Effetti cosmici v493: la fonte della luce è il personaggio, non il panorama.
// Coordinate relative alla STESSA fotografia originale (900 × 1350): nessuna
// alterazione di corpo, volto, arma, armatura, posa o fattore di zoom.
const TAU = Math.PI * 2;
const classi = ['assassino', 'guerriero', 'berserker'];
const geometria = Object.freeze({
  assassino: {
    petto:[.50,.318], spalle:[[.33,.255],[.67,.255]], mani:[[.235,.529],[.753,.529]],
    giunture:[[.29,.39],[.71,.39]], nuclei:[[.42,.298],[.58,.302],[.50,.415]],
    stivali:[[.36,.865],[.65,.864]], cintura:[.50,.535],
    armi:[[[.23,.529],[.315,.675]],[[.75,.528],[.661,.683]]],
  },
  guerriero: {
    petto:[.49,.298], spalle:[[.345,.231],[.648,.234]], mani:[[.225,.517],[.735,.414]],
    giunture:[[.29,.358],[.675,.347]], nuclei:[[.43,.300],[.575,.31],[.765,.456]],
    stivali:[[.35,.853],[.66,.854]], cintura:[.50,.522],
    armi:[[[.224,.530],[.226,.925]],[[.74,.405],[.763,.557]]],
  },
  berserker: {
    petto:[.485,.312], spalle:[[.306,.254],[.688,.264]], mani:[[.188,.417],[.683,.489]],
    giunture:[[.265,.334],[.708,.367]], nuclei:[[.45,.32],[.555,.334],[.49,.413]],
    stivali:[[.32,.856],[.67,.858]], cintura:[.49,.534],
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

function gas(ctx,x,y,rx,ry,rgba,opacita) {
  // Tre gradienti sovrapposti con forme NON lineari: un vapore, non un tubo neon.
  for(let strato=0;strato<3;strato++){
    const offset=(strato-1)*rx*.28;
    radiale(ctx,x+offset,y+(strato%2?-.20:.12)*ry,
      rx*(strato===1?.90:.72),ry*(strato===2?1:.84),rgba,
      opacita*(strato===1?.70:.36));
  }
}

function saetta(ctx,w,h,inizio,fine,colore,forza,seme,t,rami=false) {
  // Una scarica corta, frastagliata e ripetibile nel tempo. Nasce SEMPRE da
  // una giuntura/impugnatura e si spegne vicino alla materia del personaggio.
  const dx=(fine[0]-inizio[0])*w,dy=(fine[1]-inizio[1])*h;
  const lunghezza=Math.hypot(dx,dy);
  const nx=-dy/(lunghezza||1),ny=dx/(lunghezza||1);
  const p=[];
  const scatto=Math.floor(t*2.3);
  for(let i=0;i<=8;i++){
    const q=i/8;
    const disturbo=i===0||i===8?0:(rand(seme*31+i*7+scatto*13)-.5)*
      Math.min(w*.035,lunghezza*.21)*Math.sin(q*Math.PI);
    p.push([inizio[0]+dx*q/w+nx*disturbo/w,
      inizio[1]+dy*q/h+ny*disturbo/h]);
  }
  traccia(ctx,p,w,h,colore,forza,.0017);
  if(rami){
    for(const q of [3,6]){
      const pivot=p[q];
      const braccio=[pivot[0]+nx*(.022+.012*rand(seme+q))/1,
        pivot[1]+ny*(w/h)*.018-(.008+.012*rand(seme*2+q))];
      traccia(ctx,[pivot,braccio],w,h,colore,forza*.49,.0011);
    }
  }
}

function plasma(ctx,w,h,origine,direzione,colore,accento,forza,seme,t) {
  // Pennacchi fisici CORTI e appuntiti: niente raggi dritti dal cielo a terra.
  const x=origine[0]*w,y=origine[1]*h;
  const verso=direzione<0?-1:1;
  const ondeggia=Math.sin(t*.82+seme*2.2)*w*.013;
  const altezza=h*(.043+.040*rand(seme*21+3));
  const larghezza=w*(.023+.019*rand(seme*13+9));
  for(let strato=0;strato<3;strato++){
    ctx.save();ctx.globalAlpha=forza*[.18,.39,.58][strato];
    ctx.fillStyle=strato===2?accento:colore;
    ctx.shadowColor=colore;
    ctx.shadowBlur=strato===0?w*.06:strato===1?w*.031:w*.012;
    const sx=larghezza*[1.5,.95,.38][strato];
    const ey=y-altezza*[1.6,1,.59][strato];
    ctx.beginPath();ctx.moveTo(x-sx*.55,y);
    ctx.bezierCurveTo(x-verso*sx*.6,y-altezza*.25,
      x+verso*sx*.3+ondeggia,ey+altezza*.28,x+verso*sx*.3+ondeggia,ey);
    ctx.bezierCurveTo(x+verso*sx*1.4,ey+altezza*.40,
      x+sx*.7,y-altezza*.13,x+sx*.5,y);
    ctx.closePath();ctx.fill();ctx.restore();
  }
}

/** Disegno trasparente, usabile sia nel browser sia nel PNG esportato.
 * `retro` è coperto dal WebP del personaggio; `fronte` vive sopra il ritratto.
 * Le scintille partono da mani, metallo e spalle e non dal cielo circostante.
 */
export function disegnaEnergiaIncarnataRpg(ctx,w,h,classe='assassino',effetto='astrale',t=0,{fase='fronte',soggetto=null,buffer=null}={}) {
  if(!ctx||w<16||h<20||!classi.includes(classe)||!['astrale','nebulosa'].includes(effetto))return false;
  const a=geometria[classe],astrale=effetto==='astrale';
  const primario=astrale?'#a65bff':'#55d9f8';
  const secondario=astrale?'#ffd18b':'#b58cff';
  const velluto=astrale?'rgba(126,34,233,.49)':'rgba(38,182,218,.48)';
  const pulso=.86+.14*Math.sin(t*1.52);
  const xy=p=>[p[0]*w,p[1]*h];
  const nascosto=fase==='retro';
  ctx.save();

  if(nascosto){
    // Come gli effetti Ambra/Fulmine dell'app: tutto nasce sulla silhouette.
    // Niente linee continue a tutta altezza e niente portali nello sfondo.
    const origini=[...a.spalle,...a.mani,...a.giunture,a.petto,a.cintura,...a.stivali];
    for(let i=0;i<origini.length;i++){
      const p=origini[i],x=p[0]*w,y=p[1]*h;
      const ampiezza=i<2?.148:i<4?.125:i>7?.072:.105;
      gas(ctx,x,y,w*ampiezza,h*(ampiezza*.66),
        i%3===1?astrale?'rgba(255,150,92,.54)':'rgba(178,98,246,.64)':velluto,
        (i>7?.36:astrale?.90:1.06)*pulso);
      if(astrale && i<6){
        // Fiamme dimensionali a contatto con spallacci e guanti; il busto
        // e il cappuccio dell'originale rimangono completamente riconoscibili.
        const fiammate=i<2?3:5;
        for(let k=0;k<fiammate;k++){
          const off=(k-(fiammate-1)/2)*.023;
          plasma(ctx,w,h,[p[0]+off,p[1]+(k%2)*.012],i%2?-1:1,
            k===2?secondario:primario,k===2?'#fff2d6':'#dec0ff',
            (i<2?.58:.81)*pulso,k+i*7,t);
        }
      } else if(!astrale){
        for(let k=0;k<4;k++){
          const f=k/3,aa=t*.33+i*2+k*1.6;
          const rx=.012+.040*f;
          const cx=x+Math.cos(aa)*w*rx,cy=y+Math.sin(aa)*h*.045;
          gas(ctx,cx,cy,w*(.038+.029*f),h*(.031+.021*f),
            k%2?'rgba(149,98,241,.65)':'rgba(71,225,249,.70)',.69*pulso);
        }
      }
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
    radiale(luce,p[0],p[1],w*(astrale?.15:.14),h*.095,
      i%2?secondario:primario,(astrale?.38:.28)*pulso);
  }
  for(let i=0;i<2;i++){
    const sp=xy(a.spalle[i]);const m=xy(a.mani[i]);
    radiale(luce,sp[0],sp[1],w*.12,h*.066,primario,(astrale?.42:.34)*pulso);
    radiale(luce,m[0],m[1],w*.10,h*.065,secondario,(astrale?.45:.40)*pulso);
    const bot=xy(a.stivali[i]);
    radiale(luce,bot[0],bot[1],w*.09,h*.056,
      i===0?primario:secondario,(astrale?.19:.20)*pulso);
  }
  if(luce!==ctx){
    luce.restore();luce.save();
    luce.globalCompositeOperation='destination-in';
    try {luce.drawImage(soggetto,0,0,w,h);}catch { /* nessun ritratto nascosto */ }
    luce.restore();
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.88;
    ctx.drawImage(buffer,0,0,w,h);ctx.restore();
  }

  // Scariche che corrono esclusivamente sulle lame/aste originali.
  // Ogni classe ha coordinate proprie: il Guerriero non riceve due pugnali!
  for(let i=0;i<a.armi.length;i++){
    const [inizio,fine]=a.armi[i];
    const onda=Math.sin(t*(astrale?2.2:1.1)+i*2.1)*.002;
    const punti=[];
    for(let s=0;s<=17;s++){
      const q=s/17;
      punti.push([inizio[0]+(fine[0]-inizio[0])*q+onda*Math.sin(q*TAU*1.7),
        inizio[1]+(fine[1]-inizio[1])*q]);
    }
    traccia(ctx,punti,w,h,i%2?primario:secondario,(astrale?.70:.43)*pulso,.0018);
    const p=xy(inizio);
    radiale(ctx,p[0],p[1],w*.085,h*.055,astrale?secondario:primario,.30*pulso);
  }

  // Il Mitico sviluppa SCARICHE CREPITANTI tra armatura, manopole e lame.
  // Il Leggendario condensa invece gas, stelle e piccoli vortici attorno ai
  // punti energetici, una firma visiva davvero diversa dalla scarica epica.
  for(let i=0;i<2;i++){
    const sp=a.spalle[i],man=a.mani[i],gi=a.giunture[i];
    if(astrale){
      saetta(ctx,w,h,sp,gi,primario,1.1*pulso,13+i*3,t,true);
      saetta(ctx,w,h,gi,man,secondario,.94*pulso,24+i*7,t,true);
      saetta(ctx,w,h,man,[man[0]+(i===0?-.045:.045),man[1]-.060],primario,1.05*pulso,37+i,t,true);
      const pet=a.petto;
      saetta(ctx,w,h,pet,a.nuclei[i],secondario,.39*pulso,41+i,t);
    }else{
      for(let k=0;k<8;k++){
        const n=k/8,ang=n*TAU+t*(i?-.44:.38)+i*1.7;
        const cx=man[0]+Math.cos(ang)*(.054+.023*n);
        const cy=man[1]+Math.sin(ang)*(.041+.015*n);
        const co=k%3?'#9cfaff':'#d8aaff';
        radiale(ctx,cx*w,cy*h,w*.027,h*.018,co,.54+.33*Math.sin(t*.6+k)**2);
      }
      gas(ctx,gi[0]*w,gi[1]*h,w*.083,h*.046,
        i?'rgba(176,113,244,.59)':'rgba(69,211,246,.66)',.70*pulso);
    }
  }

  // Nodi che rispondono ai movimenti, senza coprire la faccia.
  const centri=[...a.spalle,...a.mani,...a.giunture,...a.nuclei,a.cintura,...a.stivali];
  for(let i=0;i<centri.length;i++){
    const p=centri[i],phase=t*(astrale?1.3:.72)+i*1.8;
    const intensita=.41+.33*Math.sin(phase)**2;
    const px=p[0]*w,py=p[1]*h;
    radiale(ctx,px,py,w*(astrale?.055:.075),h*(astrale?.033:.046),
      i%3===0?secondario:primario,intensita*(astrale?.31:.23));
    if(astrale&&i<4){
      for(let k=0;k<3;k++){
        const a0=phase*.32+k*TAU/3;
        const p0=[p[0]+Math.cos(a0)*.027,p[1]+Math.sin(a0)*.020];
        const p1=[p[0]+Math.cos(a0+.7)*.041,p[1]+Math.sin(a0+.7)*.034];
        saetta(ctx,w,h,p0,p1,k%2?secondario:primario,.34*intensita,i*7+k,t);
      }
    }
  }

  // Particelle EMESSE dalle giunture, non stelle distribuite nello sfondo.
  // Posizioni deterministiche: niente sfarfallii casuali a ogni fotogramma.
  const quantita=astrale?92:73;
  for(let i=0;i<quantita;i++){
    const p=centri[i%centri.length],ciclo=(rand(i*17+3)+t*(astrale?.14:.085)+i*.023)%1;
    const direzione=rand(i*11+7)*TAU;
    const d=(.008+rand(i*37+9)*(astrale?.096:.108))*ciclo;
    const x=(p[0]+Math.cos(direzione)*d+Math.sin(t*.6+i)*.007)*w;
    const y=(p[1]-ciclo*(astrale?.087:.067)+Math.sin(direzione)*d*.5)*h;
    if(x<0||x>w||y<0||y>h)continue;
    const alpha=clamp(Math.sin(ciclo*Math.PI))*(.30+.44*rand(i*19+1));
    const radius=Math.max(.48,w*(.0014+rand(i*13+6)*.0028));
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

  // Esplosioni brevissime intorno ai punti di emissione, NON scie da sfondo.
  for(let i=0;i<2;i++){
    const m=a.mani[i],n=a.giunture[i];
    if(astrale){
      plasma(ctx,w,h,m,i?1:-1,primario,'#fbe9ff',.47,50+i,t);
      plasma(ctx,w,h,n,i?-1:1,secondario,'#fff4cf',.26,55+i,t);
    }else{
      const p=[m[0]+Math.sin(t*.42+i)*.021,m[1]-.032];
      gas(ctx,p[0]*w,p[1]*h,w*.066,h*.063,
        i?'rgba(186,105,241,.52)':'rgba(78,223,251,.59)',.45*pulso);
    }
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
  // Lo stesso scatto ORIGINALE della galleria fornisce la profondità fotografica;
  // non è un nuovo panorama né un effetto disegnato in lontananza. Il cutout
  // del medesimo scatto, davanti, copre le emissioni sul corpo (occlusione vera).
  const fondale=documento.createElement('img');
  fondale.className='rpg-foto-fondale';fondale.alt='';fondale.decoding='async';
  fondale.setAttribute?.('aria-hidden','true');fondale.style.pointerEvents='none';
  const aggiornaFoto=()=>{
    const sorgente=foto.currentSrc||foto.getAttribute?.('src')||foto.src;
    if(sorgente && fondale.src!==sorgente)fondale.src=sorgente;
  };
  aggiornaFoto();
  palco.appendChild(fondale);
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
    fondale.style.left=(fr.left-pr.left)+'px';fondale.style.top=(fr.top-pr.top)+'px';
    fondale.style.width=fr.width+'px';fondale.style.height=fr.height+'px';
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
  const fotoCaricata=()=>{aggiornaFoto();misura();riprendi();};
  const smonta=()=>{
    if(finito)return;finito=true;if(frame)cancelAnimationFrame(frame);
    observer?.disconnect();resize?.disconnect();documento.removeEventListener?.('visibilitychange',visibilita);
    foto.removeEventListener?.('load',fotoCaricata);
    fondale.remove?.();dietro.remove?.();davanti.remove?.();
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
  foto.addEventListener?.('load',fotoCaricata);
  riprendi();return true;
}
