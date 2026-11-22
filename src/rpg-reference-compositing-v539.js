// v539: il ritratto approvato e' una fotografia OPACA: non si possono
// vedere VFX dietro il personaggio disegnandoli sotto tutta la foto.
// I 18 ritagli alpha REALI esistono gia' nel repository. Per le 6 armature
// acquistabili riutilizziamo le sagome fotografate esistenti, mai immagini AI.
import {
  percorsoRitaglioCosmicoRpg, verificaIntegritaRitaglioRpg,
  idContornoArmaturaCosmicaRpg, mascheraArmaturaCosmicaRpg,
} from './rpg-scena-cosmica.js?v=539';

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
  const luce=documento.createElement('div');
  luce.className='rpg-reference-complete-v539 rpg-reference-'+reference.classe;
  luce.setAttribute?.('aria-hidden','true');

  const attiva=()=>{
    if(!soggetto.naturalWidth||!soggetto.naturalHeight||
       grafica.isConnected===false)return;
    if(alpha&&!verificaIntegritaRitaglioRpg(soggetto,documento))return;
    // Fino al caricamento resta la v538: nessuna schermata vuota su Safari.
    grafica.appendChild(luce);
    grafica.appendChild(soggetto);
    grafica.classList?.add?.('rpg-reference-integrated-v539');
  };
  soggetto.addEventListener?.('load',attiva,{once:true});
  soggetto.src=alpha||url;
  // Alcuni browser hanno gia' l'immagine pronta dalla cache PWA.
  if(soggetto.complete&&soggetto.naturalWidth)attiva();
  return true;
}
