// V365 — Nine fully integrated approved Golden Divine Aura photographs.
const CLASSES=new Set(['assassino','guerriero','berserker']);
const STAGES=new Set([0,3,5]);
/**
 * The full WebP is ALWAYS the original streak portrait + the exact
 * user-approved divine aura. Never show a paid armor, other aura, or
 * transform reward in place of the actually equipped item.
 */
export function percorsoFotoAuraDivinaV365({classe,stato,divina=false,
  armatura=null,corona=false,effetto=null,anteprima=false,
  armaSbloccata=false}={}){
  const stage=Number(stato);
  if(!divina || !CLASSES.has(classe) || !STAGES.has(stage))return null;
  if(corona || armatura)return null;
  if(effetto && !anteprima)return null; // Exclusive effect slot.
  if(stage>=4&&!armaSbloccata)return null; // Never invent weapons.
  return './img/personaggi/aura-divina-v365/'+classe+'/stato-'+stage+'.webp?v=365';
}
