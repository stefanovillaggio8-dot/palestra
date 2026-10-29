// Atelier RPG v335: ogni combinazione riutilizza ESATTAMENTE uno dei 18
// ritratti canonici di img/personaggi/stati. Volto, posa e corporatura invariati.
// Nessun acquisto/record viene modificato dalle anteprime o dal download.
import { AURA_FOTO_ATLAS } from './aura-foto-atlas.js';
import { FOTO_RPG_RIQUADRI, livelliFotoRpg } from './aura-foto-rpg.js';

export const CLASSI_ATELIER = Object.freeze(['guerriero','assassino','berserker']);
export const EFFETTI_ATELIER = Object.freeze([
  '', 'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula'
]);
export const ARMATURE_ATELIER = Object.freeze({
  guerriero: ['','armatura-guerriero-braci','armatura-guerriero-abisso'],
  assassino: ['','armatura-assassino-notte','armatura-assassino-spettro'],
  berserker: ['','armatura-berserker-rabbia','armatura-berserker-apocalisse'],
});
export const TITOLI_ATELIER = Object.freeze(['', 'titolo-cardio','titolo-tecnica','titolo-ego','titolo-riposo','titolo-specchio','titolo-panca']);
export const STADI_ATELIER = 6;
export const NUMERO_COMBINAZIONI_ATELIER =
  CLASSI_ATELIER.length * STADI_ATELIER * 3 * 2 * EFFETTI_ATELIER.length * 2 * 2 * TITOLI_ATELIER.length; // 15120

export function opzioniAtelier(valori={}) {
  const classe=CLASSI_ATELIER.includes(valori.classe)?valori.classe:'guerriero';
  const numero=Number(valori.stadio);
  const stadio=Number.isFinite(numero)?Math.max(0,Math.min(5,Math.trunc(numero))):0;
  return {
    classe,stadio,
    armatura:ARMATURE_ATELIER[classe].includes(valori.armatura)?valori.armatura:'',
    skin:valori.skin==='skin-mitica'?'skin-mitica':'',
    effetto:EFFETTI_ATELIER.includes(valori.effetto)?valori.effetto:'',
    divina:Boolean(valori.divina),corona:Boolean(valori.corona),
    titolo:TITOLI_ATELIER.includes(valori.titolo)?valori.titolo:'',
  };
}
export function* combinazioniRpg() {
  for(const classe of CLASSI_ATELIER)
    for(let stadio=0;stadio<STADI_ATELIER;stadio++)
      for(const armatura of ARMATURE_ATELIER[classe])
        for(const skin of ['', 'skin-mitica'])
          for(const effetto of EFFETTI_ATELIER)
            for(const divina of [false,true])
              for(const corona of [false,true])
                for(const titolo of TITOLI_ATELIER)
                  yield {classe,stadio,armatura,skin,effetto,divina,corona,titolo};
}
export function nomeFileAtelier(opzioni) {
  const c=opzioniAtelier(opzioni);
  return ['rpg',c.classe,'stato'+c.stadio,
    c.armatura||'standard',c.skin||'base',c.effetto||'senza-effetto',
    c.divina?'divina':'no-divina',c.corona?'corona':'no-corona',c.titolo||'senza-titolo'].join('_')+'.png';
}
const attesaImmagine = (url) => new Promise((resolve,reject)=>{
  const im=new Image();
  im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Immagine non caricabile'));
  im.src=url;
});
const fotoPronta = async(el)=>{
  if(!el) throw new Error('Nessuna foto RPG');
  if(el.decode && !el.complete) await el.decode();
  else if(!el.complete) await new Promise((resolve,reject)=>{
    el.addEventListener('load',resolve,{once:true});
    el.addEventListener('error',reject,{once:true});
  });
  if(!el.naturalWidth)throw new Error('Foto del personaggio non disponibile');
  return el;
};
/** Crea l'immagine della combinazione selezionata senza toccare la foto di origine.
    Funziona anche offline: usa lo sprite fotografico già in cache nel modulo.
    I cambi colore/armature sono solo cosmetici, mai premi Streak anticipati. */
export async function renderFotoAtelier(grafica, opzioni={}) {
  if(typeof document==='undefined')throw new Error('Serve il browser');
  const c=opzioniAtelier(opzioni);
  const immagine=await fotoPronta(grafica?.querySelector?.('.personaggio-ritratto'));
  const larghezza=780,altezza=1170;
  const canvas=document.createElement('canvas');
  canvas.width=larghezza;canvas.height=altezza;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas non disponibile');
  ctx.fillStyle='#090c12';ctx.fillRect(0,0,larghezza,altezza);
  const ratio=Math.min(larghezza/immagine.naturalWidth,altezza/immagine.naturalHeight);
  const dw=Math.round(immagine.naturalWidth*ratio),dh=Math.round(immagine.naturalHeight*ratio);
  const dx=(larghezza-dw)/2,dy=(altezza-dh)/2;
  ctx.drawImage(immagine,dx,dy,dw,dh);
  // Il rivestimento della skin in CSS e' un canvas separato dalla foto.
  const pelle=grafica.querySelector?.('.rpg-skin-fedele');
  if(pelle?.width&&pelle?.height) {
    try {ctx.save();ctx.globalCompositeOperation='color';ctx.drawImage(pelle,dx,dy,dw,dh);ctx.restore();}
    catch {ctx.restore();}
  }
  const livelli=livelliFotoRpg(c.effetto,{mitica:!!c.skin,corona:c.corona,divina:c.divina});
  if(livelli.length) {
    const atlas=await attesaImmagine(AURA_FOTO_ATLAS);
    const sw=atlas.naturalWidth/3,sh=atlas.naturalHeight/2;
    const posX={'0%':0,'50%':1,'100%':2},posY={'0%':0,'100%':1};
    for(const layer of livelli) {
      const pos=FOTO_RPG_RIQUADRI[layer.id];
      if(!pos)continue;
      ctx.save();
      // Le texture originali hanno la parte centrale trasparente: avatar invariato.
      ctx.globalAlpha=layer.ruolo==='mitica'?.42:1;
      ctx.globalCompositeOperation='screen';
      ctx.drawImage(atlas,posX[pos[0]]*sw,posY[pos[1]]*sh,sw,sh,dx,dy,dw,dh);
      ctx.restore();
    }
  }
  if(c.titolo) {
    const titolo= c.titolo.replace(/^titolo-/,'').replaceAll('-',' ').toUpperCase();
    ctx.save();ctx.fillStyle='rgba(7,9,19,.80)';ctx.fillRect(0,altezza-94,larghezza,94);
    ctx.fillStyle='#edddff';ctx.font='bold 29px system-ui, sans-serif';ctx.textAlign='center';
    ctx.fillText(titolo,larghezza/2,altezza-35,larghezza-45);ctx.restore();
  }
  return canvas;
}
export async function salvaFotoAtelier(grafica, opzioni={}) {
  const canvas=await renderFotoAtelier(grafica,opzioni);
  const file=nomeFileAtelier(opzioni);
  const ancora=document.createElement('a');ancora.download=file;
  if(typeof canvas.toBlob==='function'&&typeof URL.createObjectURL==='function') {
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(blob){
      const u=URL.createObjectURL(blob);ancora.href=u;ancora.click();
      setTimeout(()=>URL.revokeObjectURL(u),2000);
      return file;
    }
  }
  ancora.href=canvas.toDataURL('image/png');ancora.click();return file;
}
