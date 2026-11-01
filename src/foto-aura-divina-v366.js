/**
 * v374 — The 75-day Divine Aura applies ONLY to a complete Streak-5 avatar:
 * original weapons unlocked day 30, legendary armor day 50, aura day 75.
 * Three classes x [completed free armor, two purchasable Shop armors] = 9 photos.
 */
export const ARMATURE_DIVINE_V366=Object.freeze({
 assassino:Object.freeze(['base','armatura-assassino-notte','armatura-assassino-spettro']),
 guerriero:Object.freeze(['base','armatura-guerriero-braci','armatura-guerriero-abisso']),
 berserker:Object.freeze(['base','armatura-berserker-rabbia','armatura-berserker-apocalisse']),
});
export function percorsoFotoAuraDivinaV366({
 classe,stato,divina=false,armatura=null,corona=false,
 effetto=null,anteprima=false,armaSbloccata=false
}={}){
 const disponibili=ARMATURE_DIVINE_V366[classe];
 if(!disponibili||!divina||corona)return null;
 // Preview is illustrative and never changes actual streak/unlocks.
 if(Number(stato)!==5 || (!anteprima&&!armaSbloccata))return null;
 // One effect at a time. A temporary preview does not change equipment.
 if(effetto&&!anteprima)return null;
 const nome=armatura||'base';
 if(!disponibili.includes(nome))return null;
 return './img/personaggi/aura-divina-v374/'+classe+'/'+nome+'.webp?v=374';
}
