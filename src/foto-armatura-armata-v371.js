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
  // Il Velo della Notte v528 ha un nuovo ritratto coerente con i suoi pugnali:
  // aggiorniamo solo le sue sei fotografie, senza invalidare le altre armature.
  const veloNotte=armatura==='armatura-assassino-notte';
  const versione=veloNotte?'528':'372';
  // v531: TUTTE le armature, non solo Velo, mantengono la stessa foto
  // e l'identica arma per ogni effetto. I nuovi VFX sono solo Canvas alpha.
  // I WebP vecchi con FX incorporati non vengono più usati.
  const fotografia='base';
  return './img/personaggi/armatura-con-arma-v371/'+classe+'/'+armatura+'/'+fotografia+'.webp?v='+versione;
}
