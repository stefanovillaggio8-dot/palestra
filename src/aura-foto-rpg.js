// v334: sei texture fotografiche a sfondo trasparente ottenute dalle immagini approvate.
// Le celle dell'atlante contengono SOLO effetti; il centro rimane trasparente:
// nessun avatar o capo viene disegnato al posto di quello reale.
import { AURA_FOTO_ATLAS } from './aura-foto-atlas.js';

export const FOTO_RPG_RIQUADRI = Object.freeze({
  'effetto-ambra': ['0%', '0%', 'ambra'],
  'effetto-ombra': ['50%', '0%', 'ombra'],
  'effetto-fulmine': ['100%', '0%', 'fulmine'],
  'effetto-nebula': ['0%', '100%', 'nebula'],
  'corona': ['50%', '100%', 'corona'],
  'divina': ['100%', '100%', 'divina'],
});

export function livelliFotoRpg(effetto, {mitica=false,corona=false,divina=false}={}) {
  const livelli=[];
  // La forma mitica e' un livello indipendente, non una sostituzione dell'effetto comprato.
  if(mitica && effetto!=='effetto-nebula')livelli.push({id:'effetto-nebula',ruolo:'mitica'});
  if(divina)livelli.push({id:'divina',ruolo:'streak'});
  if(FOTO_RPG_RIQUADRI[effetto] && effetto!=='corona' && effetto!=='divina')
    livelli.push({id:effetto,ruolo:'acquistato'});
  if(corona)livelli.push({id:'corona',ruolo:'corona'});
  return livelli;
}

export function montaFotoRpg(elemento,effetto,opzioni={}) {
  const livelli=livelliFotoRpg(effetto,opzioni);
  if(!livelli.length || !elemento || typeof document==='undefined' ||
      typeof document.createElement!=='function' || typeof elemento.appendChild!=='function')return false;
  for(const {id,ruolo} of livelli){
    const [x,y,tema]=FOTO_RPG_RIQUADRI[id];
    const layer=document.createElement('div');
    layer.className='aura-foto-fx aura-foto-'+tema+' aura-foto-'+ruolo;
    layer.setAttribute?.('aria-hidden','true');
    layer.setAttribute?.('role','presentation');
    if(layer.style){
      // v363: Aura Divina nuova da zero; i bordi del WEBP sono trasparenti
      // e il centro lascia visibili viso, torso, armi e armature reali.
      layer.style.backgroundImage=id==='divina'
        ? 'url("./img/effetti/aura-divina-v364.webp?v=364")'
        : 'url("'+AURA_FOTO_ATLAS+'")';
      layer.style.backgroundPosition=id==='divina'?'center center':x+' '+y;
      layer.style.backgroundSize=id==='divina'?'100% 100%':'300% 200%';
    }
    elemento.appendChild(layer);
  }
  elemento.classList?.add?.('aura-foto-fx-attiva');
  return true;
}
