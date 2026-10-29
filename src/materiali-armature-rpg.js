// Dettagli delle armature acquistabili: forma e materiali, NON filtri colore.
// Sono disegnati nelle zone della corazza sullo stato Streak originale, senza
// sostituire il ritratto, il volto o le armi e senza cambiare il salvataggio.
export const MATERIALI_ARMATURA_RPG = Object.freeze({
  'armatura-assassino-notte': {classe:'assassino',metallo:'#383d4a',chiaro:'#8b929e',ombra:'#10151d',pelle:'#292d35',accento:'#657991',schema:'lamelle'},
  'armatura-assassino-spettro': {classe:'assassino',metallo:'#672838',chiaro:'#b45b66',ombra:'#1b101b',pelle:'#30212b',accento:'#d14962',schema:'spettrale'},
  'armatura-guerriero-braci': {classe:'guerriero',metallo:'#51443b',chiaro:'#cd8258',ombra:'#171b22',pelle:'#392922',accento:'#e99d5b',schema:'braci'},
  'armatura-guerriero-abisso': {classe:'guerriero',metallo:'#302e45',chiaro:'#8c82aa',ombra:'#10121b',pelle:'#282537',accento:'#8e77cd',schema:'abisso'},
  'armatura-berserker-rabbia': {classe:'berserker',metallo:'#614b38',chiaro:'#b08c65',ombra:'#252018',pelle:'#402f27',accento:'#c8a06d',schema:'rabbia'},
  'armatura-berserker-apocalisse': {classe:'berserker',metallo:'#4b2729',chiaro:'#b66a52',ombra:'#1b1616',pelle:'#342124',accento:'#e2754c',schema:'apocalisse'},
  'skin-mitica': {classe:null,metallo:'#24364f',chiaro:'#9fdded',ombra:'#172335',pelle:'#2a4058',accento:'#c9f6ff',schema:'astrale'},
});
const POLIGONI = Object.freeze({
 assassino: {corpo:[[.375,.306],[.63,.307],[.665,.485],[.605,.536],[.401,.535],[.339,.489]],
  spallaS:[[.336,.317],[.397,.299],[.424,.371],[.359,.404],[.326,.378]],
  spallaD:[[.603,.298],[.668,.319],[.682,.382],[.64,.411],[.576,.37]],
  cintura:[[.388,.516],[.612,.516],[.635,.552],[.372,.552]]},
 guerriero: {corpo:[[.352,.296],[.645,.298],[.676,.484],[.604,.549],[.395,.551],[.326,.481]],
  spallaS:[[.27,.291],[.381,.273],[.407,.366],[.321,.39],[.257,.349]],
  spallaD:[[.613,.272],[.724,.29],[.744,.352],[.675,.389],[.587,.364]],
  cintura:[[.374,.523],[.623,.523],[.655,.567],[.345,.567]]},
 berserker: {corpo:[[.339,.307],[.659,.306],[.699,.478],[.622,.537],[.379,.538],[.302,.479]],
  spallaS:[[.24,.294],[.37,.277],[.42,.385],[.31,.41],[.227,.36]],
  spallaD:[[.63,.277],[.76,.299],[.773,.362],[.694,.412],[.584,.384]],
  cintura:[[.367,.519],[.631,.519],[.657,.561],[.344,.56]]},
});
export function dettagliArmaturaRpg(classe,id) {
 const materiale=MATERIALI_ARMATURA_RPG[id];
 return materiale && (!materiale.classe || materiale.classe===classe) ? materiale : null;
}
function traccia(ctx,points) {
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
}
function pannello(ctx,points,materiale,{alpha=.91,luce=1}={}) {
 ctx.save();ctx.globalAlpha=alpha;
 const g=ctx.createLinearGradient(points[0][0],points[0][1],points[2][0],points[2][1]);
 g.addColorStop(0,materiale.chiaro);g.addColorStop(.14,materiale.metallo);
 g.addColorStop(.54,materiale.pelle);g.addColorStop(1,materiale.ombra);
 ctx.fillStyle=g;ctx.strokeStyle=materiale.ombra;ctx.lineWidth=.009;
 traccia(ctx,points);ctx.fill();ctx.stroke();
 ctx.globalAlpha=.65*luce;ctx.strokeStyle=materiale.chiaro;ctx.lineWidth=.0021;
 ctx.beginPath();ctx.moveTo(...points[0]);ctx.lineTo(...points[1]);ctx.stroke();
 ctx.restore();
}
function cucitura(ctx,pts,mat,alpha=.72) {
 ctx.save();ctx.beginPath();
 pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
 ctx.globalAlpha=alpha;ctx.strokeStyle=mat.accento;
 ctx.lineWidth=.0025;ctx.setLineDash([.009,.007]);ctx.stroke();ctx.setLineDash([]);
 ctx.restore();
}
function banda(ctx,points,mat) {
 pannello(ctx,points,{...mat,metallo:mat.pelle,chiaro:mat.metallo},{alpha:.94,luce:.45});
}
function rivetto(ctx,x,y,mat,size=.0045) {
 ctx.save();ctx.fillStyle=mat.ombra;ctx.beginPath();ctx.arc(x,y,size*1.7,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=mat.chiaro;ctx.beginPath();ctx.arc(x-size*.2,y-size*.2,size,0,Math.PI*2);ctx.fill();ctx.restore();
}
function corazzaAssassino(ctx,mat) {
 const notte=mat.schema==='lamelle';
 pannello(ctx,POLIGONI.assassino.corpo,mat,{alpha:.89});
 pannello(ctx,POLIGONI.assassino.spallaS,mat);
 pannello(ctx,POLIGONI.assassino.spallaD,mat);
 if(notte){
   // Velo della Notte: veste tattica completamente diversa dal giubbotto base.
   // Due cinghie di cuoio oblique, piastre laminate e cuciture metalliche.
   banda(ctx,[[.385,.321],[.404,.31],[.594,.505],[.574,.519]],mat);
   banda(ctx,[[.609,.319],[.629,.332],[.413,.524],[.393,.505]],mat);
   for(let k=0;k<5;k++){
     const y=.365+k*.028,spread=.092+k*.006;
     pannello(ctx,[[.5-spread,y],[.5+spread,y],[.5+spread+.009,y+.022],[.5-spread-.009,y+.022]],mat,{alpha:.91});
     cucitura(ctx,[[.5-spread+.006,y+.012],[.5+spread-.006,y+.012]],mat,.36);
   }
   // Gorgiera e lembi del mantello, senza alterare il viso.
   pannello(ctx,[[.397,.294],[.453,.307],[.497,.34],[.437,.36]],mat,{alpha:.9});
   pannello(ctx,[[.603,.295],[.547,.307],[.503,.34],[.562,.36]],mat,{alpha:.9});
 } else {
   // Spettro Cremisi: corazza angolare in piastre sfalsate, non blu scuro.
   for(let k=0;k<4;k++){
     const y=.344+k*.043;
     pannello(ctx,[[.388,y],[.495,y+.015],[.481,y+.05],[.368,y+.034]],mat);
     pannello(ctx,[[.504,y+.013],[.622,y],[.638,y+.036],[.521,y+.049]],mat);
   }
   cucitura(ctx,[[.5,.321],[.53,.373],[.479,.417],[.516,.478]],mat,.97);
   for(let k=0;k<5;k++){
     const y=.347+k*.035;
     rivetto(ctx,.39,y,mat,.004);rivetto(ctx,.612,y,mat,.004);
   }
 }
 pannello(ctx,POLIGONI.assassino.cintura,mat,{alpha:.9});
 banda(ctx,[[.485,.516],[.521,.516],[.517,.556],[.479,.556]],mat);
 rivetto(ctx,.501,.537,mat,.008);
 // Bracciali distinti dalla giacca, mani e armi intoccate.
 for(const x of [.317,.646]) {
   pannello(ctx,[[x,.419],[x+.055,.42],[x+.058,.493],[x-.009,.489]],mat,{alpha:.79});
   for(let k=0;k<3;k++)cucitura(ctx,[[x+.006,.433+k*.021],[x+.051,.434+k*.021]],mat,.55);
 }
}
function corazzaGuerriero(ctx,mat) {
 const abisso=mat.schema==='abisso';
 pannello(ctx,POLIGONI.guerriero.corpo,mat,{alpha:.93});
 pannello(ctx,POLIGONI.guerriero.spallaS,mat);pannello(ctx,POLIGONI.guerriero.spallaD,mat);
 for(let k=0;k<4;k++){
  const y=.337+k*.047;
  pannello(ctx,[[.372,y],[.493,y+.007],[.491,y+.051],[.365,y+.041]],mat);
  pannello(ctx,[[.506,y+.007],[.63,y],[.638,y+.041],[.507,y+.051]],mat);
  cucitura(ctx,[[.379,y+.015],[.46,y+.018]],mat,.5);
 }
 if(abisso) {
  pannello(ctx,[[.488,.325],[.511,.327],[.539,.419],[.5,.457],[.46,.421]],mat);
  cucitura(ctx,[[.5,.332],[.516,.407],[.5,.435],[.482,.405],[.5,.332]],mat,1);
 }else{
  banda(ctx,[[.367,.317],[.391,.307],[.606,.511],[.581,.53]],mat);
  for(const x of [.325,.675])for(let k=0;k<3;k++)rivetto(ctx,x,.317+k*.023,mat,.005);
 }
 pannello(ctx,POLIGONI.guerriero.cintura,mat);
 rivetto(ctx,.5,.541,mat,.013);
}
function corazzaBerserker(ctx,mat) {
 const fine=mat.schema==='apocalisse';
 pannello(ctx,POLIGONI.berserker.corpo,mat,{alpha:.84});
 pannello(ctx,POLIGONI.berserker.spallaS,mat,{alpha:.94});
 pannello(ctx,POLIGONI.berserker.spallaD,mat,{alpha:.94});
 for(let k=0;k<(fine?5:3);k++){
  const y=.342+k*.034;
  pannello(ctx,[[.387,y],[.612,y+.006],[.607,y+.027],[.392,y+.022]],mat,{alpha:.92});
 }
 if(fine) {
  for(const x of [.299,.687]){
   pannello(ctx,[[x-.035,.305],[x+.045,.286],[x+.07,.348],[x+.013,.378],[x-.052,.348]],mat);
   cucitura(ctx,[[x,.318],[x+.021,.341],[x-.012,.361]],mat,1);
  }
  cucitura(ctx,[[.438,.33],[.477,.397],[.439,.448],[.494,.499]],mat,.92);
 } else {
  for(const x of [.334,.666]){
    banda(ctx,[[x-.04,.311],[x+.023,.305],[x+.055,.355],[x-.034,.364]],mat);
    for(let k=0;k<5;k++)rivetto(ctx,x-.019+k*.012,.333,mat,.005);
  }
 }
 pannello(ctx,POLIGONI.berserker.cintura,mat);
 rivetto(ctx,.5,.537,mat,.014);
}
function decoraAstrale(ctx,classe,mat){
 const area=POLIGONI[classe]||POLIGONI.guerriero;
 ctx.save();ctx.globalAlpha=.8;ctx.strokeStyle=mat.accento;ctx.lineWidth=.0028;
 ctx.shadowColor=mat.accento;ctx.shadowBlur=.007;ctx.beginPath();
 ctx.moveTo(.5,.317);ctx.lineTo(.523,.39);ctx.lineTo(.5,.444);ctx.lineTo(.477,.39);ctx.closePath();ctx.stroke();
 for(let k=0;k<6;k++){
   const y=.35+k*.026,x=.5+Math.sin(k*1.7)*.092;
   rivetto(ctx,x,y,mat,.003);
 }
 cucitura(ctx,[[.38,.517],[.5,.541],[.625,.518]],mat,.7);
 ctx.restore();
}
/** Rafforza il rivestimento con vere forme e materiali, non solo tinta.
 * Le coordinate sono in proporzione alla foto della classe, non alterano il DOM.
 */
export function disegnaMaterialiArmaturaRpg(ctx,w,h,classe,armaturaId,skinId=null) {
 if(!ctx || typeof ctx.fill!=='function' || typeof ctx.scale!=='function'
   || typeof ctx.createLinearGradient!=='function')return false;
 const materiale=dettagliArmaturaRpg(classe,armaturaId);
 const mitica=skinId==='skin-mitica';
 if(!materiale&&!mitica)return false;
 ctx.save();ctx.scale(w,h);
 if(materiale) {
  if(classe==='assassino')corazzaAssassino(ctx,materiale);
  if(classe==='guerriero')corazzaGuerriero(ctx,materiale);
  if(classe==='berserker')corazzaBerserker(ctx,materiale);
 }
 if(mitica)decoraAstrale(ctx,classe,MATERIALI_ARMATURA_RPG['skin-mitica']);
 ctx.restore();
 return true;
}
