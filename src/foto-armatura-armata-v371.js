// Real photographic weapon-bearing Shop armor variants, generated from the exact
// original photographed armors and canonical day-30 weapon photographs.
// Never assume that owning an armor means a weapon has been unlocked.
const ARMORS=Object.freeze({
  assassino:Object.freeze(['armatura-assassino-notte','armatura-assassino-spettro']),
  guerriero:Object.freeze(['armatura-guerriero-braci','armatura-guerriero-abisso']),
  berserker:Object.freeze(['armatura-berserker-rabbia','armatura-berserker-apocalisse']),
});
const FX=Object.freeze({
  'effetto-ambra':'ambra',
  'effetto-ombra':'ombra',
  'effetto-fulmine':'fulmine',
  'effetto-nebula':'nebula',
  'skin-mitica':'astrale',
});
export function percorsoFotoArmaturaArmataV371({
  classe,stato=0,armatura=null,effetto=null,armaSbloccata=false
}={}){
  if(!ARMORS[classe]?.includes(armatura))return null;
  const n=Number(stato);
  if(!armaSbloccata || !Number.isInteger(n) || n<4 || n>5)return null;
  const fx=effetto===null?'base':FX[effetto];
  if(!fx)return null;
  return './img/personaggi/armatura-con-arma-v371/'+classe+'/'+armatura+'/'+fx+'.webp?v=372';
}
