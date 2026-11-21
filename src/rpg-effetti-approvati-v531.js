// v531 · Solo livelli Canvas trasparenti ispirati all'anteprima approvata.
// Non disegna MAI un avatar, casco, corpo, arma o paesaggio e non ritocca le foto.
// Stessa grammatica per tutte le classi, armature, stadi, divisa e Corona.
const TAU=Math.PI*2;
const CLASSI=['assassino','guerriero','berserker'];
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const rand=(s)=>{const v=Math.sin(s*127.17+74.13)*43758.5453;return v-Math.floor(v);};
const bordi={
  assassino:[[.01,.43,.57],[.12,.35,.64],[.24,.30,.71],[.42,.24,.77],[.59,.23,.77],[.74,.26,.75],[.90,.30,.70],[.99,.34,.66]],
  guerriero:[[.01,.40,.60],[.12,.37,.64],[.24,.24,.78],[.42,.19,.88],[.59,.20,.88],[.74,.23,.78],[.90,.27,.73],[.99,.33,.68]],
  berserker:[[.01,.05,.68],[.12,.025,.71],[.24,.06,.81],[.42,.09,.93],[.59,.10,.94],[.74,.13,.87],[.90,.18,.78],[.99,.23,.74]],
};
function fianco(classe,y,side,delta=0) {
  const rows=bordi[classe]||bordi.assassino;
  const yy=clamp(y,.01,.99);
  let n=1;while(n<rows.length-1&&rows[n][0]<yy)n++;
  const a=rows[n-1],b=rows[n],f=clamp((yy-a[0])/(b[0]-a[0]));
  const idx=side<0?1:2;
  return clamp(a[idx]+(b[idx]-a[idx])*f+side*delta,.015,.985);
}
function nuvola(ctx,x,y,rx,ry,color,alpha=1) {
  if(alpha<=0)return;
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  const g=ctx.createRadialGradient(0,0,.03,0,0,1);
  g.addColorStop(0,color);g.addColorStop(.28,color);
  g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=alpha;ctx.fillStyle=g;
  ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.fill();ctx.restore();
}
function traccia(ctx,pts,color,alpha,width,glow=0) {
  if(pts.length<2)return;
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';
  ctx.shadowColor=color;ctx.shadowBlur=glow;
  ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.stroke();ctx.restore();
}
function punto(ctx,x,y,r,color,alpha=1,bagliore=8) {
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.shadowColor=color;
  ctx.shadowBlur=bagliore;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();
}
function scintille(ctx,w,h,t,classe,colors,count,luminosita=1) {
  for(let i=0;i<count;i++){
    const y=.09+rand(i*47+11)*.83;
    const side=i%2?-1:1;
    const near=.015+rand(i*19+8)*.12;
    const x=fianco(classe,y,side,near)*w+Math.sin(t*.72+i*4)*w*.009;
    const yy=(y-.016*Math.sin(t*(.23+.24*rand(i+17))+i)) *h;
    const radius=Math.max(.65,w*(.0017+.0034*rand(i*7+29)));
    const pulse=(.57+.43*Math.sin(t*(.41+rand(i+13)) + i*2.3)**2)*luminosita;
    const c=colors[i%colors.length];
    punto(ctx,x,yy,radius,c,pulse,Math.min(15,Math.max(3,radius*4)));
    if(i%11===0){
      traccia(ctx,[[x-w*.012,yy],[x+w*.012,yy]],c,pulse*.46,
        Math.max(.55,w*.0015),3);
      traccia(ctx,[[x,yy-h*.009],[x,yy+h*.009]],c,pulse*.4,Math.max(.55,w*.0014),3);
    }
  }
}
function nastro(ctx,w,h,classe,t,side,seed,color,alpha=.5,intensity=1) {
  const points=[];
  for(let k=0;k<=40;k++){
    const u=k/40, y=.13+.71*u,ph=u*TAU*(1.2+seed*.07)+seed*1.31-t*.29;
    const offset=.038 + seed*.008 + Math.sin(ph)*(.043+seed*.006);
    const x=fianco(classe,y,side,Math.max(.01,offset))*w;
    points.push([x,y*h+h*.009*Math.sin(t*.25+u*8+seed)]);
  }
  traccia(ctx,points,color,alpha*.13*intensity,w*.085,Math.min(30,w*.12));
  traccia(ctx,points,color,alpha*.31*intensity,w*.028,Math.min(24,w*.08));
  traccia(ctx,points,seed%2?'#f9d4ff':'#adf7ff',alpha*.52*intensity,Math.max(.9,w*.004),8);
}
function onda(ctx,w,h,classe,t,c1,c2,forza,rami=4) {
  for(const side of [-1,1]){
    for(let s=0;s<rami;s++){
      const y0=.15 + s*.16+rand(s*17+side*23)*.038;
      const y1=Math.min(.90,y0+.18+rand(s*13+side*37)*.11);
      const x0=fianco(classe,y0,side,.006)*w;
      const x1=fianco(classe,y1,side,.022)*w;
      const bend=w*side*(.060+.04*rand(s*41+side));
      const pts=[];
      for(let k=0;k<=16;k++){
        const u=k/16, y=(y0+(y1-y0)*u)*h;
        const x=x0+(x1-x0)*u + bend*Math.sin(u*Math.PI)
          +(rand(s*113+k*7+Math.floor(t*2.4)*17+side*59)-.5)*w*.018*Math.sin(u*Math.PI);
        pts.push([x,y]);
      }
      const c=s%3===0?c2:c1;
      traccia(ctx,pts,c,forza*.27,w*.037,18);
      traccia(ctx,pts,c,forza*.87,Math.max(1,w*.007),12);
      traccia(ctx,pts,'#f8edff',forza*.89,Math.max(.65,w*.002),3);
      for(const anchor of [5,11]){
        const x=pts[anchor][0],y=pts[anchor][1];
        const branch=[[x,y],[x+side*w*.036,y-h*.018],[x+side*w*.059,y-h*.047]];
        traccia(ctx,branch,c,forza*.63,Math.max(.65,w*.0034),9);
      }
    }
  }
}
function cerchioTerra(ctx,w,h,colour,amount,inciso=false,t=0) {
  const cy=h*.951;
  ctx.save();
  ctx.translate(w*.5,cy);
  ctx.strokeStyle=colour;ctx.shadowColor=colour;ctx.shadowBlur=inciso?23:10;
  ctx.lineWidth=Math.max(1,w*(inciso?.009:.003));
  ctx.globalAlpha=amount;
  ctx.beginPath();ctx.ellipse(0,0,w*(inciso?.43:.34),h*.027,0,0,TAU);ctx.stroke();
  if(inciso){
    ctx.lineWidth=Math.max(.7,w*.0033);ctx.globalAlpha=amount*.85;
    ctx.beginPath();ctx.ellipse(0,0,w*.35,h*.020,0,0,TAU);ctx.stroke();
    ctx.setLineDash([w*.015,w*.012]);
    ctx.lineDashOffset=-(t%TAU)*w*.008;
    ctx.beginPath();ctx.ellipse(0,0,w*.49,h*.036,0,0,TAU);ctx.stroke();
    ctx.setLineDash([]);
    for(let i=0;i<16;i++){
      const a=i*TAU/16,px=Math.cos(a)*w*.40,py=Math.sin(a)*h*.026;
      traccia(ctx,[[px-w*.009,py],[px,py-h*.006],[px+w*.009,py]],'#ffe2ff',amount*.65,Math.max(.7,w*.002),4);
    }
  }
  ctx.restore();
}
function sigillo(ctx,w,h,t,classe) {
  // Halo ANTERIORE e rune laterali, mai un disco opaco sulla faccia.
  const cx=w*.5,cy=h*.35;
  ctx.save();ctx.globalAlpha=.67;ctx.strokeStyle='#cf7dff';
  ctx.shadowColor='#dd69ff';ctx.shadowBlur=Math.min(26,w*.09);
  ctx.lineWidth=Math.max(1,w*.005);
  ctx.beginPath();ctx.ellipse(cx,cy,w*.423,h*.34,-.04,Math.PI*.59,Math.PI*2.42);ctx.stroke();
  ctx.strokeStyle='#ffe0ff';ctx.lineWidth=Math.max(.75,w*.0025);
  ctx.globalAlpha=.8;
  ctx.beginPath();ctx.ellipse(cx,cy,w*.45,h*.37,.03,Math.PI*.60,Math.PI*2.35);ctx.stroke();
  for(let i=0;i<20;i++){
    const a=i*TAU/20+t*.028;
    // Evita l'area interna del cappuccio.
    if(Math.sin(a)<-.45&&Math.abs(Math.cos(a))<.56)continue;
    const x=cx+Math.cos(a)*w*.45,y=cy+Math.sin(a)*h*.367;
    const r=Math.max(2,w*.013);
    traccia(ctx,[[x-r,y+r*.48],[x,y-r],[x+r,y+r*.48]],'#f5c5ff',.65,Math.max(.65,w*.0017),5);
  }
  ctx.restore();
}
function gasColorato(ctx,w,h,classe,t,astrale=false) {
  const c1=astrale?'rgba(225,69,254,.52)':'rgba(45,193,242,.46)';
  const c2=astrale?'rgba(123,84,255,.55)':'rgba(171,76,242,.53)';
  for(let i=0;i<26;i++){
    const side=i%2?-1:1,y=.13+rand(i*23+2)*.76,edge=fianco(classe,y,side,
      .034+rand(i*41+7)*.11);
    const x=(edge+Math.sin(t*.15+i)*.011)*w;
    const ry=h*(.040+.062*rand(i*13+11));
    const rx=w*(.065+.075*rand(i*19+5));
    nuvola(ctx,x,y*h,rx,ry,i%3?c1:c2,.40+.22*rand(i*5+3));
  }
}
function braci(ctx,w,h,classe,t){
  for(const side of [-1,1]){
    for(let k=0;k<3;k++){
      const pts=[];
      for(let j=0;j<=34;j++){
        const y=.16+j/34*.76,phi=j/34*TAU*2.1+t*.32+k*2.6;
        const x=fianco(classe,y,side,.027+.038*Math.sin(phi)+.016*k)*w;
        pts.push([x,y*h]);
      }
      traccia(ctx,pts,'#f87a20',.32,w*.025,17);
      traccia(ctx,pts,'#ffcb65',.58,Math.max(.75,w*.0034),10);
    }
  }
  scintille(ctx,w,h,t,classe,['#ff9c30','#ffc453','#ffebaf','#fff7d8'],54,1.05);
  cerchioTerra(ctx,w,h,'#fa9837',.32,false,t);
}
function ombra(ctx,w,h,classe,t){
  for(let i=0;i<17;i++){
    const y=.12+rand(i*17+3)*.78,side=i%2?-1:1;
    const x=fianco(classe,y,side,.035+rand(i*31+1)*.07)*w;
    const rx=w*(.064+.054*rand(i*13+9));
    nuvola(ctx,x+Math.sin(t*.23+i)*w*.019,y*h-h*.022,rx,h*.10,
      i%3?'rgba(105,34,168,.39)':'rgba(44,20,99,.55)',.48);
  }
  for(const side of [-1,1])for(let s=0;s<5;s++)
    nastro(ctx,w,h,classe,t,side,s,'#a34ced',.75,.83);
  scintille(ctx,w,h,t,classe,['#a96afb','#5b2986','#d1a7f8'],23,.33);
}
function scarica(ctx,w,h,classe,t){
  onda(ctx,w,h,classe,t,'#8d38f7','#b884ff',.99,5);
  scintille(ctx,w,h,t,classe,['#ac6cff','#f9e9ff','#b0b7ff'],33,.64);
}
function nebulosa(ctx,w,h,classe,t){
  gasColorato(ctx,w,h,classe,t,false);
  for(const side of [-1,1])for(let s=0;s<5;s++)
    nastro(ctx,w,h,classe,t,side,s,side<0?'#44c7ef':'#ac61ef',.88,1.05);
  scintille(ctx,w,h,t,classe,['#7fe8ff','#c0a2ff','#f9edff','#9a61ed'],78,1);
  cerchioTerra(ctx,w,h,'#55cdf9',.34,false,t);
}
function astrale(ctx,w,h,classe,t) {
  gasColorato(ctx,w,h,classe,t,true);
  for(const side of [-1,1])for(let s=0;s<6;s++)
    nastro(ctx,w,h,classe,t,side,s,side<0?'#f06fff':'#9779ff',.92,1.24);
  sigillo(ctx,w,h,t,classe);
  scintille(ctx,w,h,t,classe,['#fff0ff','#f8a7ff','#d191ff','#91e7ff'],108,1.14);
  cerchioTerra(ctx,w,h,'#e77cff',.93,true,t);
}
export const EFFETTI_APPROVATI_RPG=Object.freeze([
  'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica'
]);
/** Disegna esclusivamente VFX trasparenti, stessa sagoma, stessa foto/sfondo.
 * t in secondi; su Safari iOS la densità segue il renderer host a 20fps.
 */
export function disegnaEffettoApprovatoRpg(ctx,w,h,classe='assassino',effetto='',t=0){
  if(!ctx||w<16||h<20||!CLASSI.includes(classe)||!EFFETTI_APPROVATI_RPG.includes(effetto))
    return false;
  ctx.save();
  if(effetto==='effetto-ombra')ombra(ctx,w,h,classe,t);
  else {
    ctx.globalCompositeOperation='screen';
    if(effetto==='effetto-ambra')braci(ctx,w,h,classe,t);
    else if(effetto==='effetto-fulmine')scarica(ctx,w,h,classe,t);
    else if(effetto==='effetto-nebula')nebulosa(ctx,w,h,classe,t);
    else astrale(ctx,w,h,classe,t);
  }
  ctx.restore();
  return true;
}
