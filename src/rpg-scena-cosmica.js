// v486: gli effetti cosmici appartengono a una scena esterna alla FOTO.
// Mantiene l'elemento img originale (e l'intero equipaggiamento) nello stesso
// contenitore grafico; sposta SOLO l'overlay cosmetico fuori da overflow:hidden.
// Non legge/scrive database, record, premi, classi o inventario.
export function montaScenaCosmicaRpg(scena,grafica,{classe='assassino',effetto=null,creaElemento}={}) {
  if(!scena || !grafica || typeof scena.appendChild!=='function')return false;
  const layerName=effetto==='astrale'?'rpg-astrale-presenza'
    :effetto==='nebulosa'?'rpg-nebulosa-presenza':null;
  const layer=layerName && grafica.querySelector?.(':scope > .'+layerName);
  if(!layer || typeof creaElemento!=='function'){
    scena.appendChild(grafica);
    return false;
  }
  const classeId=['guerriero','assassino','berserker'].includes(classe)?classe:'assassino';
  const palco=creaElemento('div',{class:'rpg-cosmic-stage rpg-cosmic-'+effetto+' personaggio-'+classeId});
  const ambiente=creaElemento('div',{class:'rpg-cosmic-ambiente',aria:{hidden:'true'}});
  // Ordine pittorico: atmosfera DIETRO, foto intatta al centro, FX DAVANTI.
  // appendChild rimuove automaticamente il vecchio overlay dal ritratto.
  palco.appendChild(ambiente);
  palco.appendChild(grafica);
  palco.appendChild(layer);
  scena.appendChild(palco);
  return true;
}
