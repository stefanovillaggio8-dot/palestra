// v342 — i tre collage fotografici APPROVATI sono la fonte delle scene RPG.
// Ogni atlante contiene 3 colonne x 3 righe, ritagliate SENZA didascalie.
// Niente pennellate sul torso, maschere, ovali, corona adesiva o fondali sovrapposti.
// Le scene sono usate solo quando rappresentano ESATTAMENTE la configurazione;
// per gli altri cosmetici resta il normale renderer precedente.
export const SCENE_ATLANTI_RPG = Object.freeze({
  assassino:'img/personaggi/scene/assassino-nove-scene.webp?v=342',
  guerriero:'img/personaggi/scene/guerriero-nove-scene.webp?v=342',
  berserker:'img/personaggi/scene/berserker-nove-scene.webp?v=342',
});
export const ARMATURE_EPICHE_SCENE = Object.freeze({
  assassino:'armatura-assassino-notte',
  guerriero:'armatura-guerriero-braci',
  berserker:'armatura-berserker-rabbia',
});
const PROMISES = new Map();
const CACHE = new Map();
export function indiceScenaCinematograficaRpg({classe,armatura=null,effetto=null,skin=null,corona=false,divina=false}={}) {
  if(!Object.hasOwn(SCENE_ATLANTI_RPG,classe))return null;
  if(skin)return null; // La forma Astrale non compare in questi nove scatti.
  if(armatura && armatura!==ARMATURE_EPICHE_SCENE[classe])return null;
  if(effetto && effetto!=='effetto-ombra')return null; // Niente effetti inventati.
  const fumo=effetto==='effetto-ombra',epica=Boolean(armatura);
  // Lo scatto numero 9 e' l'unico con tutte le aure insieme.
  if(divina) return epica && fumo && corona ? 8 : null;
  if(!epica)return (fumo?2:0)+(corona?1:0); // pannelli 1–4
  return 4+(fumo?2:0)+(corona?1:0); // pannelli 5–8
}
export function percorsoAtlanteScenaRpg(classe) {
  return Object.hasOwn(SCENE_ATLANTI_RPG,classe)?SCENE_ATLANTI_RPG[classe]:null;
}
function caricaAtlante(classe) {
  if(typeof Image!=='function')return Promise.resolve(null);
  if(!PROMISES.has(classe)) {
    const src=percorsoAtlanteScenaRpg(classe);
    PROMISES.set(classe,new Promise(resolve=>{
      const im=new Image();
      im.onload=()=>resolve(im.naturalWidth===960 && im.naturalHeight===1080?im:null);
      im.onerror=()=>resolve(null);
      im.src=src;
    }));
  }
  return PROMISES.get(classe);
}
export async function fotoCinematograficaRpg(opzioni={}) {
  const indice=indiceScenaCinematograficaRpg(opzioni);
  if(indice===null || typeof document==='undefined')return null;
  const key=opzioni.classe+':'+indice;
  if(CACHE.has(key))return CACHE.get(key);
  const atlas=await caricaAtlante(opzioni.classe);
  if(!atlas)return null;
  const c=document.createElement('canvas');
  c.width=320;c.height=360;
  const ctx=c.getContext?.('2d');
  if(!ctx)return null;
  const sx=(indice%3)*320,sy=Math.floor(indice/3)*360;
  ctx.drawImage(atlas,sx,sy,320,360,0,0,320,360);
  const url=c.toDataURL?.('image/webp',.9);
  if(!url)return null;
  CACHE.set(key,url);
  return url;
}
/** La foto pronta SOSTITUISCE la scena: non si sommano mai due effetti.
 * Le immagini mancanti su GitHub lasciano intatta la v341.
 */
export function montaScenaCinematograficaRpg(grafica,foto,opzioni={}) {
  const indice=indiceScenaCinematograficaRpg(opzioni);
  if(indice===null || !grafica || !foto)return false;
  void fotoCinematograficaRpg(opzioni).then(src=>{
    if(!src || !grafica.isConnected || !foto.isConnected)return;
    const chiave=opzioni.classe+':'+indice;
    if(foto.dataset)foto.dataset.scenaCinematografica=chiave;
    // Una fotografia completa, già con armatura, fumo, luce e corona integrati.
    // L'eventuale renderer precedente resta nel DOM solo come fallback.
    foto.src=src;
    grafica.classList.add('rpg-scena-cinematografica');
    grafica.classList.add('rpg-composite-active');
  }).catch(()=>{}); // offline/prima installazione: fotografia precedente
  return true;
}
