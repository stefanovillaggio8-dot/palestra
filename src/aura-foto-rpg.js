// v333 — foto degli effetti Aura Shop. Le immagini sorgente contengono un
// personaggio dimostrativo: il centro viene nascosto dalla maschera CSS.
// Il vero avatar, le sue armature, la skin e il titolo NON sono sostituiti.
import { AURA_FOTO_ATLAS } from './aura-foto-atlas.js';

const RIQUADRI = Object.freeze({
  'effetto-ambra': ['0%', '0%', 'ambra'],
  'effetto-ombra': ['50%', '0%', 'ombra'],
  'effetto-fulmine': ['100%', '0%', 'fulmine'],
  'effetto-nebula': ['0%', '100%', 'nebula'],
  'corona': ['50%', '100%', 'corona'],
});
export function livelliFotoRpg(effetto, {mitica=false,corona=false}={}) {
  const levels=[];
  if (mitica && effetto!=='effetto-nebula')levels.push({id:'effetto-nebula',ruolo:'mitica'});
  if (RIQUADRI[effetto] && effetto!=='corona')levels.push({id:effetto,ruolo:'acquistato'});
  if (corona)levels.push({id:'corona',ruolo:'corona'});
  return levels;
}
export function montaFotoRpg(elemento,effetto,{mitica=false,corona=false}={}) {
  const levels=livelliFotoRpg(effetto,{mitica,corona});
  if (!levels.length || !elemento || typeof document==='undefined' ||
      typeof document.createElement!=='function' || typeof elemento.appendChild!=='function') return false;

  for(const {id,ruolo} of levels) {
    const [x,y,tema]=RIQUADRI[id];
    const img=document.createElement('div');
    img.className='aura-foto-fx aura-foto-'+tema+' aura-foto-'+ruolo;
    img.setAttribute?.('aria-hidden','true');
    img.setAttribute?.('role','presentation');
    if(img.style) {
      img.style.backgroundImage='url("'+AURA_FOTO_ATLAS+'")';
      img.style.backgroundPosition=x+' '+y;
      img.style.backgroundSize='300% 200%';
    }
    elemento.appendChild(img);
  }
  elemento.classList?.add?.('aura-foto-fx-attiva');
  return true;
}
