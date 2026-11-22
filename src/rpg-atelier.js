// Atelier RPG v335: ogni combinazione riutilizza ESATTAMENTE uno dei 18
// ritratti canonici di img/personaggi/stati. Volto, posa e corporatura invariati.
// Nessun acquisto/record viene modificato dalle anteprime o dal download.
import { AURA_FOTO_ATLAS } from './aura-foto-atlas.js';
import { disegnaEffettoApprovatoRpg, EFFETTI_APPROVATI_RPG } from './rpg-effetti-approvati-v531.js?v=531';
import { effettoReferenceV532 } from './rpg-reference-v532.js?v=540';
import { FOTO_RPG_RIQUADRI, livelliFotoRpg } from './aura-foto-rpg.js';
import { fasciaSagoma, disegnaCoronaEnergetica } from './anteprima-combinata-rpg.js?v=513';
import { fotoCinematograficaRpg } from './foto-cinematica-rpg.js';
import {disegnaAtmosferaCosmicaRpg,disegnaAccentiCosmiciRpg,disegnaSoggettoCosmicoRpg,disegnaSfondoFotograficoCosmicoRpg,disegnaFotografiaFusaRpg} from './rpg-scena-cosmica.js?v=540';
import {caricaEnergiaFotograficaRpg,disegnaEnergiaFotograficaRpg} from './rpg-energia-incarnata.js';
import { percorsoFotoCoronaV360 } from './foto-corona-v360.js';
import { percorsoFotoAuraDivinaV366 } from './foto-aura-divina-v366.js';
import { percorsoFotoArmaturaArmataV371 } from './foto-armatura-armata-v371.js';
import { usaRitrattoVeloNotteV528, CORONA_VELO_NOTTE_V528 } from './velo-notte-v528.js';

export const CLASSI_ATELIER = Object.freeze(['guerriero','assassino','berserker']);
export const EFFETTI_ATELIER = Object.freeze([
  '', 'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica'
]);
export const ARMATURE_ATELIER = Object.freeze({
  guerriero: ['','armatura-guerriero-braci','armatura-guerriero-abisso'],
  assassino: ['','armatura-assassino-notte','armatura-assassino-spettro'],
  berserker: ['','armatura-berserker-rabbia','armatura-berserker-apocalisse'],
});
export const TITOLI_ATELIER = Object.freeze(['', 'titolo-cardio','titolo-tecnica','titolo-ego','titolo-riposo','titolo-specchio','titolo-panca']);
export const STADI_ATELIER = 6;
export const NUMERO_COMBINAZIONI_ATELIER =
  CLASSI_ATELIER.length * STADI_ATELIER * 3 * EFFETTI_ATELIER.length * 2 * 2 * TITOLI_ATELIER.length; // 9072

export function opzioniAtelier(valori={}) {
  const classe=CLASSI_ATELIER.includes(valori.classe)?valori.classe:'guerriero';
  const numero=Number(valori.stadio);
  const stadio=Number.isFinite(numero)?Math.max(0,Math.min(5,Math.trunc(numero))):0;
  return {
    classe,stadio,
    armatura:ARMATURE_ATELIER[classe].includes(valori.armatura)?valori.armatura:'',
    // Astrale è un effetto, non una seconda skin sovrapponibile.
    skin:'',
    effetto:EFFETTI_ATELIER.includes(valori.effetto)&&valori.effetto
      ? valori.effetto : valori.skin==='skin-mitica'?'skin-mitica':'',
    divina:Boolean(valori.divina),corona:Boolean(valori.corona),
    titolo:TITOLI_ATELIER.includes(valori.titolo)?valori.titolo:'',
  };
}
export function* combinazioniRpg() {
  for(const classe of CLASSI_ATELIER)
    for(let stadio=0;stadio<STADI_ATELIER;stadio++)
      for(const armatura of ARMATURE_ATELIER[classe])
        for(const skin of [''])
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
// v538: stessi due piani della schermata Shop. Nessun pixel viene tolto
// dall'atlante approvato, e la maschera riguarda soltanto il PIANO davanti.
function disegnaReferenceV538(ctx,atlas,riferimentoV532,dx,dy,dw,dh,piano='retro'){
  const cellW=atlas.naturalWidth/3,cellH=atlas.naturalHeight/2;
  const fxX=dx-dw*.32,fxY=dy-dh*.04,fxW=dw*1.64,fxH=dh*1.08;
  if(piano==='retro'){
    ctx.save();
    // Mock Canvas e browser vecchi possono non esporre la clip: il ritratto
    // resta comunque sopra, mai usare una funzione mancante per bloccare PNG.
    if(typeof ctx.rect==='function' && typeof ctx.clip==='function'){
      ctx.beginPath();ctx.rect(dx,dy,dw,dh);ctx.clip();
    }
    ctx.globalCompositeOperation='source-over';
    ctx.drawImage(atlas,riferimentoV532.colonna*cellW,riferimentoV532.riga*cellH,
      cellW,cellH,dx-dw*.32,dy-dh*.04,dw*1.64,dh*1.08);
    ctx.restore();return;
  }
  const buffer=document.createElement('canvas');
  buffer.width=Math.max(2,Math.round(fxW));
  buffer.height=Math.max(2,Math.round(fxH));
  const fx=buffer.getContext('2d',{alpha:true});
  if(!fx?.drawImage||typeof fx.createRadialGradient!=='function'||
     typeof fx.translate!=='function'||typeof fx.scale!=='function')return;
  fx.drawImage(atlas,riferimentoV532.colonna*cellW,riferimentoV532.riga*cellH,
    cellW,cellH,0,0,buffer.width,buffer.height);
  fx.save();fx.globalCompositeOperation='destination-out';
  fx.translate(buffer.width*.5,buffer.height*.43);
  fx.scale(buffer.width*.31,buffer.height*.45);
  const mask=fx.createRadialGradient(0,0,0,0,0,1);
  mask.addColorStop(0,'rgba(0,0,0,1)');
  mask.addColorStop(.75,'rgba(0,0,0,1)');
  mask.addColorStop(.84,'rgba(0,0,0,.82)');
  mask.addColorStop(.99,'rgba(0,0,0,0)');
  mask.addColorStop(1,'rgba(0,0,0,0)');
  fx.fillStyle=mask;fx.fillRect(-2,-2,4,4);fx.restore();
  ctx.save();ctx.globalCompositeOperation='source-over';
  ctx.drawImage(buffer,fxX,fxY,fxW,fxH);ctx.restore();
}
/** Crea l'immagine della combinazione selezionata senza toccare la foto di origine.
    Funziona anche offline: usa lo sprite fotografico già in cache nel modulo.
    I cambi colore/armature sono solo cosmetici, mai premi Streak anticipati. */
export async function renderFotoAtelier(grafica, opzioni={}) {
  if(typeof document==='undefined')throw new Error('Serve il browser');
  const input=opzioniAtelier(opzioni);
  const c=input.divina?{...input,stadio:5}:input;
  // v531: Aura Divina e Corona non annullano il livello effetti dello Shop.
  const veloNotteV528=usaRitrattoVeloNotteV528(c.classe,c.armatura);
  const fotoBase=await fotoPronta(grafica?.querySelector?.('.personaggio-ritratto'));
  // Non usare un ritaglio alpha alternativo: l'Atelier esporta proprio la
  // stessa foto scelta dall'utente, senza inventare un altro fondale.
  const riferimentoV532=effettoReferenceV532(c.effetto);
  // Nessuna texture cosmetica deve sostituire foto/paesaggio nel PNG.
  const fxSenzaFoto = !riferimentoV532 && (c.effetto==='skin-mitica' || c.effetto==='effetto-nebula');
  const texturaCosmica=fxSenzaFoto?await caricaEnergiaFotograficaRpg():null;
  // Il file finale deve usare lo stesso scatto completo visibile in anteprima.
  // Se il collage non e' installato resta il renderer precedente.
  const fotoCorona=c.corona && !veloNotteV528 ? percorsoFotoCoronaV360({
    classe:c.classe,stato:c.stadio,armatura:c.armatura||null,
    effetto:null,divina:c.divina,armaSbloccata:c.stadio>=4,
  }) : null;
  // Aura alone is already baked into all nine full-armored Shop/standard photos.
  // The Atelier never adds a second Shop effect to Divine Aura.
  const fotoDivina=!veloNotteV528&&!c.corona&&c.divina?percorsoFotoAuraDivinaV366({
    classe:c.classe,stato:c.stadio,armatura:c.armatura||null,
    divina:true,corona:false,effetto:null,anteprima:true,armaSbloccata:true
  }):null;
  const fotoArmata=(!c.corona&&!c.divina || veloNotteV528) ? percorsoFotoArmaturaArmataV371({
    classe:c.classe,stato:c.stadio,armatura:c.armatura||null,
    effetto:null,armaSbloccata:c.stadio>=4,
  }) : null;
  const scena=fotoDivina||fotoCorona||fotoArmata||((veloNotteV528||c.divina||Boolean(c.effetto))?null:await fotoCinematograficaRpg({...c,corona:false,divina:false}));
  // Con Astrale/Nebulosa il ritratto mostrato nell'Atelier e' l'autorita':
  // non caricare una seconda foto con armi diverse da quelle visibili.
  const immagine=fxSenzaFoto ? fotoBase
    : riferimentoV532 ? fotoBase // esattamente lo stesso ritratto selezionato in Shop
    : (scena ? await attesaImmagine(scena).catch(()=>fotoBase) : fotoBase);
  const giaFotografica=Boolean(scena&&immagine!==fotoBase);
  // Gli effetti possono estendersi a lato della fotografia: nel PNG con
  // un cosmetico lasciamo margine extra mantenendo lo stesso zoom del soggetto.
  const larghezza=riferimentoV532?1120:780,altezza=riferimentoV532?1320:1170;
  const canvas=document.createElement('canvas');
  canvas.width=larghezza;canvas.height=altezza;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas non disponibile');
  ctx.fillStyle='#090c12';ctx.fillRect(0,0,larghezza,altezza);
  const ratio=Math.min((riferimentoV532?780:larghezza)/immagine.naturalWidth,
    (riferimentoV532?1170:altezza)/immagine.naturalHeight);
  const dw=Math.round(immagine.naturalWidth*ratio),dh=Math.round(immagine.naturalHeight*ratio);
  const dx=(larghezza-dw)/2,dy=(altezza-dh)/2;
  // v541: nel PNG esportato deve esserci lo stesso SFONDO con PAVIMENTO
  // fotografico che si vede in anteprima, prima dell'effetto e del soggetto.
  const ambienteV541=riferimentoV532 ? await attesaImmagine(
    new URL('../img/effetti/reference-ambiente-v541.webp?v=541',import.meta.url).href
  ).catch(()=>null) : null;
  if(ambienteV541)ctx.drawImage(ambienteV541,dx,dy,dw,dh);
  const atlanteV539=riferimentoV532 ? await attesaImmagine(
    new URL('../img/effetti/effetti-reference-v540.webp?v=540',import.meta.url).href) : null;
  const elementoRitaglio=grafica?.querySelector?.('.rpg-reference-subject-v539');
  const scenaRitagliata=Boolean(riferimentoV532&&
    grafica?.classList?.contains?.('rpg-reference-integrated-v539')&&
    elementoRitaglio?.complete&&elementoRitaglio?.naturalWidth);
  // Per un'armatura, il ritaglio HTML e' la STESSA foto con maschera alpha
  // del costume. drawImage da solo non esporta la maschera CSS; ricopiala.
  let ritaglioEsportabile=scenaRitagliata ? elementoRitaglio : null;
  if(ritaglioEsportabile?._rpgReferenceMask){
    const data=ritaglioEsportabile._rpgReferenceMask.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/)?.[0];
    const mask=data?await attesaImmagine(data).catch(()=>null):null;
    const ritaglioCanvas=mask?document.createElement('canvas'):null;
    if(ritaglioCanvas){
      ritaglioCanvas.width=dw;ritaglioCanvas.height=dh;
      const t=ritaglioCanvas.getContext?.('2d',{alpha:true});
      if(t?.drawImage){
        t.drawImage(immagine,0,0,dw,dh);
        t.globalCompositeOperation='destination-in';
        t.drawImage(mask,0,0,dw,dh);
        t.globalCompositeOperation='source-over';
        ritaglioEsportabile=ritaglioCanvas;
      }else ritaglioEsportabile=null;
    }else ritaglioEsportabile=null;
  }
  const riferimentoCompleto=Boolean(atlanteV539&&ritaglioEsportabile);
  if(riferimentoCompleto){
    // Stessi pixel RGB della reference ripulita, sotto il ritaglio vero.
    const cellW=atlanteV539.naturalWidth/3,cellH=atlanteV539.naturalHeight/2;
    ctx.drawImage(atlanteV539,
      riferimentoV532.colonna*cellW,riferimentoV532.riga*cellH,cellW,cellH,
      dx-dw*.32,dy-dh*.04,dw*1.64,dh*1.08);
  }else if(atlanteV539) {
    disegnaReferenceV538(ctx,atlanteV539,riferimentoV532,dx,dy,dw,dh,'retro');
  }
  if(fxSenzaFoto) {
    // La foto e il suo ambiente restano IDENTICI per ogni effetto Shop.
    // Astrale/Nebulosa aggiungono una sola texture alpha sul ritratto originale.
    ctx.drawImage(immagine,dx,dy,dw,dh);
    ctx.save();ctx.translate(dx,dy);
    disegnaEnergiaFotograficaRpg(ctx,dw,dh,c.classe,
      c.effetto==='skin-mitica'?'astrale':'nebulosa',2.8,
      {fase:'fronte',texture:texturaCosmica});
    ctx.restore();
  } else ctx.drawImage(riferimentoCompleto?ritaglioEsportabile:immagine,dx,dy,dw,dh);
  // Il rivestimento della skin in CSS e' un canvas separato dalla foto.
  const pelle=grafica.querySelector?.('.rpg-skin-fedele');
  if(!riferimentoCompleto&&!giaFotografica&&pelle?.width&&pelle?.height) {
    try {
      ctx.save();ctx.globalCompositeOperation='source-over';
      if(!fxSenzaFoto || !disegnaSoggettoCosmicoRpg(ctx,pelle,dx,dy,dw,dh,c.classe))
        ctx.drawImage(pelle,dx,dy,dw,dh);
      ctx.restore();
    }
    catch {ctx.restore();}
  }
  // I nuovi WebP includono già l'effetto acquistato. Solo l'Aura divina,
  // premio separato dei 75 giorni, va aggiunta alla foto finale.
  const canvasEffetto=grafica.querySelector?.('.rpg-effetti-canvas');
  const effettoDalCanvas=!fxSenzaFoto && Boolean(c.effetto) &&
    Boolean(canvasEffetto?.width && canvasEffetto?.height);
  const effettoApprovato=EFFETTI_APPROVATI_RPG.includes(c.effetto);
  const livelli=effettoApprovato ? (!fotoDivina && !fotoCorona && c.divina ? livelliFotoRpg(null,{divina:true}):[])
    : fxSenzaFoto ? (veloNotteV528 && c.divina
      ? livelliFotoRpg(null,{divina:true}):[]) : (veloNotteV528
    ? livelliFotoRpg(c.effetto,{mitica:false,corona:false,divina:c.divina})
    : (fotoDivina||fotoCorona||fotoArmata)
      ? livelliFotoRpg(null,{mitica:false,corona:false,divina:false})
      : livelliFotoRpg(c.effetto,{mitica:false,corona:false,divina:c.divina}));
  // Anche con pugnali (foto completa) gli effetti del Velo si applicano DOPO
  // la foto, mai scegliendo un'armatura diversa per Ambra/Ombra/Fulmine.
  if((!giaFotografica || (c.divina && !fotoDivina) || veloNotteV528)&&livelli.length) {
    const atlas=await attesaImmagine(AURA_FOTO_ATLAS);
    const sw=atlas.naturalWidth/3,sh=atlas.naturalHeight/2;
    const posX={'0%':0,'50%':1,'100%':2},posY={'0%':0,'100%':1};
    // Gli effetti si disegnano in una tela SEPARATA dalla fotografia,
    // poi cancelliamo ogni pixel sopra faccia, cappuccio, torso e gambe.
    const fxCanvas=document.createElement('canvas');
    fxCanvas.width=dw;fxCanvas.height=dh;
    const fx=fxCanvas.getContext('2d',{alpha:true});
    if(fx) {
      for(const layer of livelli.filter(l=>l.id!=='corona')) {
        const pos=FOTO_RPG_RIQUADRI[layer.id];
        if(!pos)continue;
        fx.save();fx.globalAlpha=layer.ruolo==='mitica'?.42:1;
        fx.drawImage(atlas,posX[pos[0]]*sw,posY[pos[1]]*sh,sw,sh,0,0,dw,dh);
        fx.restore();
      }
      fx.save();fx.globalCompositeOperation='destination-out';
      fx.filter='blur('+Math.max(18,Math.round(dw*.05))+'px)';
      fx.beginPath();
      // Per la testa allarghiamo la sagoma protetta, così neppure i
      // gradienti o i fulmini possono rendere il volto illeggibile.
      for(let i=0;i<=100;i++){
        const y=i/100;let [left]=fasciaSagoma(c.classe,y);
        if(y<.23)left=Math.min(left,.34);
        if(i===0)fx.moveTo(left*dw,y*dh);
        else fx.lineTo(left*dw,y*dh);
      }
      for(let i=100;i>=0;i--){
        const y=i/100;let [,right]=fasciaSagoma(c.classe,y);
        if(y<.23)right=Math.max(right,.66);
        fx.lineTo(right*dw,y*dh);
      }
      fx.closePath();fx.fillStyle='#000';fx.fill();fx.restore();
      ctx.save();ctx.globalCompositeOperation='screen';
      ctx.drawImage(fxCanvas,dx,dy,dw,dh);ctx.restore();
    }

  }

  // Non disegnare un secondo VFX: lo strato alpha è già sopra la foto.
  // Il Canvas live usato in anteprima per Fumo/Scintille/Scarica viene copiato
  // nel PNG, anziche' sostituito con un altro effetto preso dall'atlante.
  if(riferimentoV532){
    // La parte anteriore e' SOLO all'esterno del soggetto; non si attraversa.
    if(!riferimentoCompleto&&atlanteV539)
      disegnaReferenceV538(ctx,atlanteV539,riferimentoV532,dx,dy,dw,dh,'fronte');
  } else if(effettoApprovato && !fxSenzaFoto && typeof ctx.translate==='function'){
    ctx.save();ctx.translate(dx,dy);
    if(effettoDalCanvas){
      ctx.globalCompositeOperation='screen';
      ctx.drawImage(canvasEffetto,0,0,dw,dh);
    }else{
      // Prima del primo frame, con movimento ridotto e offline la stessa
      // geometria approvata è riproducibile in modo deterministico nel PNG.
      disegnaEffettoApprovatoRpg(ctx,dw,dh,c.classe,c.effetto,2.8);
    }
    ctx.restore();
  }

  if(veloNotteV528 && c.corona) {
    // Anche il PNG scaricato utilizza la Corona allineata al Velo nuovo;
    // i collage v360 fotografavano invece l'armatura precedente.
    try {
      const corona=await attesaImmagine(new URL('../'+CORONA_VELO_NOTTE_V528.replace(/^\.\//,''),import.meta.url).href);
      ctx.drawImage(corona,0,0,larghezza,altezza);
    } catch {disegnaCoronaEnergetica(ctx,larghezza,altezza);}
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
