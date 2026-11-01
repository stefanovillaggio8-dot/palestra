// Corona dell'Infinito: 648 corrected original-photo artworks refreshed in v371
// 3 classi × 6 stadi Streak × 3 stati armatura × 6 effetti × 2 Aura divina.
// Le immagini sono solo viste: gli sblocchi reali vengono valutati in app.js.
export const CLASSI_CORONA_V360=Object.freeze({
  assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse'],
});
export const EFFETTI_CORONA_V360=Object.freeze({
  'effetto-ambra':'ambra',
  'effetto-ombra':'ombra',
  'effetto-fulmine':'fulmine',
  'effetto-nebula':'nebula',
  'skin-mitica':'astrale',
});
export function percorsoFotoCoronaV360({classe,stato=0,armatura=null,
  effetto=null,divina=false,armaSbloccata=false}={}){
  if(!Object.hasOwn(CLASSI_CORONA_V360,classe))return null;
  const livello=Number(stato);
  if(!Number.isInteger(livello)||livello<0||livello>5)return null;
  if(armatura && !CLASSI_CORONA_V360[classe].includes(armatura))return null;
  if(armaSbloccata && livello<4)return null;
  const variante=effetto?EFFETTI_CORONA_V360[effetto]:'base';
  if(!variante)return null;
  return './img/personaggi/corona-v360/'+classe+'/stato-'+livello+'/' +
    (armatura||'standard')+'/'+variante+(divina?'-divina':'')+'.webp?v=371';
}
