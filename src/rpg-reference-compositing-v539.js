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
  // v547: repaired full rune bases and continuous approved-color trails.
  // Load before activating: old alpha v546 remains the offline fallback.
  let fotoV547Pronta=false;
  const attivaV547=()=>{
    if(fotoV547Pronta&&inserito&&grafica.isConnected!==false)
      grafica.classList?.add?.('rpg-reference-stage-v547');
  };
  if(typeof globalThis.Image==='function'){
    const fotografiaSenzaTagli=new globalThis.Image();
    fotografiaSenzaTagli.onload=()=>{
      fotoV547Pronta=fotografiaSenzaTagli.naturalWidth===1383&&
        fotografiaSenzaTagli.naturalHeight===880;
      attivaV547();
    };
    fotografiaSenzaTagli.onerror=()=>{fotoV547Pronta=false;};
    fotografiaSenzaTagli.src=new URL('../img/effetti/reference-scene-v547.webp?v=547',import.meta.url).href;
    if(fotografiaSenzaTagli.complete&&fotografiaSenzaTagli.naturalWidth)
      fotoV547Pronta=fotografiaSenzaTagli.naturalWidth===1383&&
        fotografiaSenzaTagli.naturalHeight===880;
  }
  // v548: the exact five approved previews are real assets, never AI
  // regenerated at runtime. The default Assassin preview can reproduce
  // its approved screenshot; other classes keep the real progression body.
  let approvatoSfondoPronto=false;
  let approvatoShowcasePronto=false;
  // v549: in Shop la promo approvata non dipende dal livello Streak reale.
  // Il livello resta vero altrove: questa è SOLTANTO la preview senza
  // armatura/Corona/arma, e la verifica avviene DOPO il mount nel dialogo.
  // Fare il check quando grafica è ancora detached farebbe sempre false.
  const avatarMockupConsentito=()=>classe==='assassino'&&
    Boolean(grafica.closest?.('.aura-preview-panel'))&&
    !grafica.dataset?.referenceArmatura&&
    grafica.dataset?.referenceDivina!=='true'&&
    grafica.dataset?.referenceCorona!=='true'&&!corona&&!arma;
  const attivaV548=()=>{
    if(!inserito||grafica.isConnected===false)return;
    if(approvatoSfondoPronto)
      grafica.classList?.add?.('rpg-reference-stage-v548');
    if(approvatoSfondoPronto&&approvatoShowcasePronto&&avatarMockupConsentito())
      grafica.classList?.add?.('rpg-reference-stage-v548-static');
  };
  if(typeof globalThis.Image==='function'){
    const preload=(filename,callback)=>{
      const test=new globalThis.Image();
      test.onload=()=>{
        callback(test.naturalWidth===1878&&test.naturalHeight===1420);
        attivaV548();
      };
      test.onerror=()=>callback(false);
      test.src=new URL('../img/effetti/'+filename+
        '?v='+(filename.includes('-v550.')?'550':'548'),import.meta.url).href;
      if(test.complete&&test.naturalWidth)
        callback(test.naturalWidth===1878&&test.naturalHeight===1420);
    };
    preload('approved-environments-v548.webp',v=>{approvatoSfondoPronto=v;});
    preload('approved-showcase-v550.webp',v=>{approvatoShowcasePronto=v;});
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
    attivaV547();
    attivaV548();
  };
  soggetto.addEventListener?.('load',attiva,{once:true});
  soggetto.src=alpha||url;
  // Alcuni browser hanno già l'immagine pronta dalla cache PWA.
  if(soggetto.complete&&soggetto.naturalWidth)attiva();
  // Il ritratto può essere già in cache PRIMA che il dialogo venga
  // collegato al DOM. Ripeti un solo controllo dopo l'append del dialogo.
  globalThis.queueMicrotask?.(()=>{attiva();attivaV548();});
  return true;
}
