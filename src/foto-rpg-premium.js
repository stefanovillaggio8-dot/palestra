// Immagini cinematografiche premium: opzionali e senza modificare dati o sblocchi.
// I file devono esistere nel repository, non si inventano immagini via CSS.
// Se un'immagine manca o non carica su Safari, resta la foto completa originale.
export const FOTO_RPG_PREMIUM = Object.freeze({
  'armatura-assassino-notte': 'img/personaggi/fotografici/assassino-notte.webp',
  'armatura-assassino-spettro': 'img/personaggi/fotografici/assassino-spettro.webp',
  'armatura-assassino-notte|effetto-ombra': 'img/personaggi/fotografici/assassino-notte-ombra.webp',
});
export function fotoPremiumRpg(armatura,effetto) {
  if(!armatura)return null;
  return FOTO_RPG_PREMIUM[armatura+'|'+(effetto||'')]
    || FOTO_RPG_PREMIUM[armatura]
    || null;
}
export function sostituisciFotoQuandoProntaRpg(foto,armatura,effetto,versione='') {
  const path=fotoPremiumRpg(armatura,effetto);
  if(!path || !foto || typeof Image!=='function')return null;
  const url=path+(versione||'');
  const carica=new Image();
  carica.onload=()=>{
    // Non cambiare sorgente se il personaggio e' stato smontato nel frattempo.
    if(foto.isConnected!==false)foto.src=url;
  };
  // Fallback sul ritratto fotorealistico già visibile.
  carica.onerror=()=>{};
  carica.src=url;
  return carica;
}
