// Fotografie originali per ciascuna combinazione Corona 80 giorni.
// 144 WebP REALI, generate da tools/render_corona_v359.py. Il titolo e l'Aura
// divina restano livelli indipendenti; la classe/stato/arma non cambiano.
export const EFFETTI_CORONA_V359=Object.freeze({
  'effetto-ambra':'ambra',
  'effetto-ombra':'ombra',
  'effetto-fulmine':'fulmine',
  'effetto-nebula':'nebula',
  'skin-mitica':'astrale'
});
const ARMATURE_CORONA=Object.freeze({
  assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']
});
export function percorsoFotoCoronaV359({classe,stato=0,armatura=null,effetto=null,armaSbloccata=false}={}){
  if(!Object.hasOwn(ARMATURE_CORONA,classe))return null;
  const n=Number(stato);
  if(!Number.isInteger(n)||n<0||n>5)return null;
  if(armatura && !ARMATURE_CORONA[classe].includes(armatura))return null;
  const base=armatura&&!armaSbloccata&&n<4?armatura:'stato-'+n;
  const variante=effetto?(EFFETTI_CORONA_V359[effetto]||null):'base';
  if(!variante)return null;
  return './img/personaggi/corona-v359/'+classe+'/'+base+'/'+variante+'.webp?v=359';
}
