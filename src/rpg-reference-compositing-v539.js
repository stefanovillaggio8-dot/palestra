// v539: il ritratto approvato e' una fotografia OPACA: non si possono
// vedere VFX dietro il personaggio disegnandoli sotto tutta la foto.
// I 18 ritagli alpha REALI esistono già nel repository. Per le 6 armature
// acquistabili riutilizziamo le sagome fotografate esistenti, mai immagini AI.
import {
  percorsoRitaglioCosmicoRpg, verificaIntegritaRitaglioRpg,
  idContornoArmaturaCosmicaRpg, mascheraArmaturaCosmicaRpg,
} from './rpg-scena-cosmica.js?v=543';

export function montaReferenceScontornataV539(grafica,ritratto,classe,reference,{
  corona=false,arma=false,documento=globalThis.document,
}={}){
  if(!grafica?.appendChild||!ritratto||!reference?.classe||
     !documento?.createElement)return false;
  const url=ritratto.getAttribute?.('src')||ritratto.currentSrc||ritratto.src||'';
  // Il cutout e' prodotto dalla STESSA identica fotografia di progressione.
  const alpha=percorsoRitaglioCosmicoRpg(url);
  const idArmatura=alpha?null:idContornoArmaturaCosmicaRpg(url);
  // Mai usare il cutout di un'altra armatura/stato: cambierebbe la figura.
  if(!alpha&&!idArmatura)return false;
  const maschera=idArmatura
    ? mascheraArmaturaCosmicaRpg(idArmatura,documento,corona,arma)
    : null;
  if(idArmatura&&!maschera)return false;

  const soggetto=documento.createElement('img');
  soggetto.className='rpg-reference-subject-v539'+(maschera?' rpg-reference-mask-v539':'');
  soggetto.alt='';
  soggetto.decoding='async';
  soggetto.setAttribute?.('aria-hidden','true');
  if(maschera){
    // CSS e PNG condividono la STESSA maschera di armatura. Il volto e
    // l'armatura NON si rigenerano: e' una seconda vista della stessa foto.
    soggetto._rpgReferenceMask=maschera;
    if(typeof soggetto.style?.setProperty==='function'){
      soggetto.style.setProperty('-webkit-mask-image',maschera,'important');
      soggetto.style.setProperty('mask-image',maschera,'important');
    }else if(soggetto.style){
      soggetto.style.webkitMaskImage=maschera;
      soggetto.style.maskImage=maschera;
    }
  }
  // v542: atmosfera fotografica sfumata davvero sui quattro bordi e
  // pavimento originale; ogni effetto ha una cella coerente nel WebP 3x2.
  const ambiente=documento.createElement('div');
  ambiente.className='rpg-reference-environment-v541 rpg-reference-'+reference.classe;
  ambiente.setAttribute?.('aria-hidden','true');
  const luce=documento.createElement('div');
  luce.className='rpg-reference-complete-v539 rpg-reference-'+reference.classe;
  luce.setAttribute?.('aria-hidden','true');

  // v543: carica la scena COMPLETA dalla reference originale.
  // Lo sprite v539 resta come fallback solo se il nuovo asset non si carica.
  // Non duplicare mai la magia sul palco fotografico (anelli e suolo sono
  // già pixel originali della tavola approvata).
  let palcoPronto=false;
  let inserito=false;
  const attivaPalco=()=>{
    if(palcoPronto&&inserito&&grafica.isConnected!==false)
      grafica.classList?.add?.('rpg-reference-stage-v543');
  };
  if(typeof globalThis.Image==='function'){
    const palcoImg=new globalThis.Image();
    palcoImg.onload=()=>{
      palcoPronto=palcoImg.naturalWidth===1383&&palcoImg.naturalHeight===880;
      attivaPalco();
    };
    palcoImg.onerror=()=>{palcoPronto=false;};
    palcoImg.src=new URL('../img/effetti/reference-scene-v543.webp?v=543',import.meta.url).href;
    if(palcoImg.complete&&palcoImg.naturalWidth){
      palcoPronto=palcoImg.naturalWidth===1383&&palcoImg.naturalHeight===880;
    }
  }
  // v545: l'atlante conserva i colori PIENI e i veri pixel delle 5 foto.
  // Attiva soltanto con dimensioni corrette: se manca, resta v543 offline.
  let fotoV545Pronta=false;
  const attivaV545=()=>{
    if(fotoV545Pronta&&inserito&&grafica.isConnected!==false)
      grafica.classList?.add?.('rpg-reference-stage-v545');
  };
  if(typeof globalThis.Image==='function'){
    const fotografia=new globalThis.Image();
    fotografia.onload=()=>{
      fotoV545Pronta=fotografia.naturalWidth===1383&&fotografia.naturalHeight===880;
      attivaV545();
    };
    fotografia.onerror=()=>{fotoV545Pronta=false;};
    fotografia.src=new URL('../img/effetti/reference-scene-v545.webp?v=545',import.meta.url).href;
    if(fotografia.complete&&fotografia.naturalWidth){
      fotoV545Pronta=fotografia.naturalWidth===1383&&fotografia.naturalHeight===880;
    }
  }
  // v546: picture-perfect original streaks with no old knight in the sprite.
  // This asset is ALPHA: no squared dark photo or ghost cape can survive.
  let fotoV546Pronta=false;
  const attivaV546=()=>{
    if(fotoV546Pronta&&inserito&&grafica.isConnected!==false)
      grafica.classList?.add?.('rpg-reference-stage-v546');
  };
  if(typeof globalThis.Image==='function'){
    const effettiPuliti=new globalThis.Image();
    effettiPuliti.onload=()=>{
      fotoV546Pronta=effettiPuliti.naturalWidth===1383&&effettiPuliti.naturalHeight===880;
      attivaV546();
    };
    effettiPuliti.onerror=()=>{fotoV546Pronta=false;};
    effettiPuliti.src=new URL('../img/effetti/reference-scene-v546.webp?v=546',import.meta.url).href;
    if(effettiPuliti.complete&&effettiPuliti.naturalWidth)
      fotoV546Pronta=effettiPuliti.naturalWidth===1383&&effettiPuliti.naturalHeight===880;
  }
  const attiva=()=>{
    if(inserito)return;
    if(!soggetto.naturalWidth||!soggetto.naturalHeight||
       grafica.isConnected===false)return;
    if(alpha&&!verificaIntegritaRitaglioRpg(soggetto,documento))return;
    // Fino al caricamento resta la v538: nessuna schermata vuota su Safari.
    inserito=true;
    // Ordine di disegno: fondale fotografico + pavimento -> cinque VFX
    // originali -> avatar vero, senza ritaglio delle scie o del terreno.
    grafica.appendChild(ambiente);
    grafica.appendChild(luce);
    grafica.appendChild(soggetto);
    grafica.classList?.add?.('rpg-reference-integrated-v539','rpg-reference-original-env-v541');
    attivaPalco();
    attivaV545();
    attivaV546();
  };
  soggetto.addEventListener?.('load',attiva,{once:true});
  soggetto.src=alpha||url;
  // Alcuni browser hanno già l'immagine pronta dalla cache PWA.
  if(soggetto.complete&&soggetto.naturalWidth)attiva();
  return true;
}
