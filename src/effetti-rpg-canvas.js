// Effetti RPG procedurali v329. Canvas trasparente sopra l'avatar originale.
// Mantiene intatte le immagini dei livelli Streak e non anticipa armi o armature.
// Nessun timer permanente: l'animazione si arresta quando il nodo viene rimosso.
const MASSIMO_DPR = 1.5;
const TIPI = new Set(['effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula']);
const casuale = (a, b) => a + Math.random() * (b - a);

export function montaEffettiRpg(elemento, tipo, { corona = false, divina = false } = {}) {
  if (!elemento || (!TIPI.has(tipo) && !corona && !divina)) return () => {};
  if (typeof document === 'undefined' || typeof requestAnimationFrame !== 'function') return () => {};
  const canvas = document.createElement('canvas');
  canvas.className = 'rpg-effetti-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};
  elemento.appendChild(canvas);

  const menoMovimento = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quanti = tipo === 'effetto-ambra' ? 30 : tipo === 'effetto-ombra' ? 18 : 26;
  const particelle = Array.from({ length: quanti }, () => ({
    x: Math.random(), y: Math.random(), fase: casuale(0, Math.PI * 2),
    v: casuale(.06, .24), r: casuale(.7, 2.3),
  }));
  let larghezza = 0, altezza = 0, dpr = 1, visibile = true;
  let frameId = 0, ultima = 0, vistoConnesso = false, attese = 0, terminato = false;
  let osservatore = null, dimensioni = null;

  function ridimensiona() {
    const rett = elemento.getBoundingClientRect();
    const w = Math.max(1, Math.round(rett.width));
    const h = Math.max(1, Math.round(rett.height));
    const rapporto = Math.min(MASSIMO_DPR, window.devicePixelRatio || 1);
    if (w === larghezza && h === altezza && rapporto === dpr) return;
    larghezza = w; altezza = h; dpr = rapporto;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function luce(x, y, r, colore, intensita = 1) {
    if (r <= 0) return;
    ctx.save();
    ctx.globalAlpha = intensita;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colore);
    g.addColorStop(.25, colore);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function scintilla(x,y,r,colore) {
    luce(x,y,r*6,colore,.28);
    ctx.save();
    ctx.strokeStyle = colore; ctx.lineWidth = Math.max(.7,r*.7);
    ctx.beginPath();ctx.moveTo(x-r*2,y);ctx.lineTo(x+r*2,y);
    ctx.moveTo(x,y-r*2);ctx.lineTo(x,y+r*2);ctx.stroke();
    ctx.restore();
  }
  function orbita(x,y,rx,ry,tempo,colore) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(x,y);ctx.rotate(-.2 + Math.sin(tempo*.37)*.07);
    ctx.strokeStyle = colore;ctx.lineWidth = Math.max(1,larghezza*.009);
    ctx.shadowColor = colore;ctx.shadowBlur = 12;
    ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();
    const a = tempo*.65;
    scintilla(Math.cos(a)*rx,Math.sin(a)*ry,Math.max(1,larghezza*.009),'#fff3cf');
    ctx.restore();
  }
  function ambra(t) {
    for(const p of particelle) {
      const y=((p.y - t*p.v)%1+1)%1;
      const x=p.x*.83+.085 + Math.sin(t*1.2+p.fase)*.035;
      const px=x*larghezza, py=y*altezza;
      const colore=p.r>1.6?'#fff2ac':'#ff9f31';
      luce(px,py,p.r*6,colore,.22);
      ctx.fillStyle=colore;ctx.globalAlpha=.42+Math.sin(t*2+p.fase)*.22;
      ctx.beginPath();ctx.arc(px,py,p.r,0,7);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function ombra(t) {
    for(const p of particelle) {
      const y=((p.y-t*p.v*.36)%1+1)%1;
      const px=(p.x*.75+.125+Math.sin(t*.55+p.fase)*.09)*larghezza;
      const py=y*altezza;
      const r=larghezza*(.12+p.r*.026);
      ctx.save();ctx.globalAlpha=.1+.04*Math.sin(t+p.fase);
      const g=ctx.createRadialGradient(px,py,0,px,py,r);
      g.addColorStop(0,'rgba(134,104,177,.58)');
      g.addColorStop(.42,'rgba(44,29,66,.42)');
      g.addColorStop(1,'rgba(12,7,22,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,r,0,7);ctx.fill();ctx.restore();
    }
  }
  function scarica(t) {
    const periodo=Math.floor(t*2.1);
    for(let i=0;i<4;i++){
      const k=periodo*9+i*17;
      const bagliore=Math.sin(t*8+i*3.15);
      if(bagliore<.72) continue;
      const lato=i%2 ? .81 : .19;
      const inizioY=altezza*(.16+i*.16);
      const fineY=altezza*(.38+i*.13);
      const dx=Math.sin(k*2.3)*larghezza*.11;
      ctx.save();ctx.globalAlpha=(bagliore-.72)*3.1;
      ctx.lineWidth=larghezza*.009;ctx.strokeStyle='#b38cff';
      ctx.shadowBlur=13;ctx.shadowColor='#8d57ff';
      ctx.beginPath();ctx.moveTo(larghezza*lato,inizioY);
      for(let j=1;j<=7;j++){
        const f=j/7;
        ctx.lineTo(larghezza*lato+Math.sin(k+j*4.4)*larghezza*.07+dx*f,inizioY+(fineY-inizioY)*f);
      }
      ctx.stroke();ctx.strokeStyle='#fff2ff';ctx.lineWidth=1;ctx.stroke();ctx.restore();
    }
    for(const p of particelle.slice(0,14)){
      const x=(.16+.68*p.x)*larghezza;
      const y=(.12+.78*p.y)*altezza;
      luce(x,y,3.3,'#d7adff',.13+.1*Math.sin(t*4+p.fase));
    }
  }
  function nebulosa(t) {
    const cx=larghezza*.5,cy=altezza*.49;
    orbita(cx,cy,larghezza*.38,altezza*.17,t,'rgba(102,194,255,.42)');
    for(let i=0;i<particelle.length;i++){
      const p=particelle[i];
      const a=p.fase+t*(.07+p.v*.6), rad=larghezza*(.18+p.x*.23);
      const x=cx+Math.cos(a)*rad, y=cy+Math.sin(a)*rad*.8;
      const col=i%3?'#8fcaff':'#f4b5ff';
      luce(x,y,p.r*5,col,.18);
      if(i%5===0)scintilla(x,y,1.2,col);
    }
  }
  function aureola(t, prestigio) {
    const x=larghezza*.5,y=altezza*.135;
    const rx=larghezza*(prestigio?.20:.16),ry=altezza*.035;
    orbita(x,y,rx,ry,t,prestigio?'rgba(255,213,99,.68)':'rgba(154,231,255,.48)');
    if(prestigio){
      ctx.save();ctx.lineJoin='round';ctx.lineWidth=Math.max(1.4,larghezza*.008);
      ctx.strokeStyle='#ffe2a0';ctx.fillStyle='rgba(207,153,63,.35)';
      ctx.shadowColor='#ffc966';ctx.shadowBlur=11;
      const top=y-altezza*.057,bot=y+altezza*.015;
      const lx=x-larghezza*.115,rx2=x+larghezza*.115;
      ctx.beginPath();ctx.moveTo(lx,bot);ctx.lineTo(lx,top+12);
      ctx.lineTo(x-larghezza*.072,top+20);ctx.lineTo(x-larghezza*.04,top-3);
      ctx.lineTo(x,top+15);ctx.lineTo(x+larghezza*.04,top-3);
      ctx.lineTo(x+larghezza*.072,top+20);ctx.lineTo(rx2,top+12);
      ctx.lineTo(rx2,bot);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
      luce(x,top+altezza*.013,larghezza*.08,'#a4ebff',.42);
    }
  }
  function disegna(t) {
    if(larghezza<16||altezza<20) return;
    ctx.clearRect(0,0,larghezza,altezza);
    if(tipo==='effetto-ambra')ambra(t);
    if(tipo==='effetto-ombra')ombra(t);
    if(tipo==='effetto-fulmine')scarica(t);
    if(tipo==='effetto-nebula')nebulosa(t);
    if(divina||corona)aureola(t,corona);
  }
  function fermati() {
    if(terminato)return;
    terminato=true;
    cancelAnimationFrame(frameId);
    if(osservatore)osservatore.disconnect();
    if(dimensioni)dimensioni.disconnect();
    canvas.remove();
  }
  function ciclo(ms) {
    if(terminato)return;
    if(!elemento.isConnected) {
      if(vistoConnesso||++attese>180){fermati();return;}
      frameId=requestAnimationFrame(ciclo);return;
    }
    vistoConnesso=true;
    if(visibile && (ms-ultima>=33 || !ultima)) {
      ultima=ms;ridimensiona();disegna(ms/1000);
    }
    if(!menoMovimento)frameId=requestAnimationFrame(ciclo);
  }
  if(typeof IntersectionObserver==='function'){
    osservatore=new IntersectionObserver(es=>{visibile=es.some(e=>e.isIntersecting);},{threshold:0});
    osservatore.observe(elemento);
  }
  if(typeof ResizeObserver==='function'){
    dimensioni=new ResizeObserver(ridimensiona);dimensioni.observe(elemento);
  }
  frameId=requestAnimationFrame(ciclo);
  return fermati;
}
