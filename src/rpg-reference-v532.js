// v532: veri effetti fotografici isolati DAL COLLAGE APPROVATO dell'utente.
// Un atlas di SOLA ENERGIA su nero: usando screen il nero è neutro e nessun
// pixel di faccia, corporatura, corazza, casco, armi o sfondo viene sostituito.
// Colonne da sinistra: Ambra, Ombra, Fulmine. Seconda riga: Nebulosa, Astrale.
export const ATLANTE_REFERENCE_V532='./img/effetti/effetti-reference-v532.webp?v=532';
// v533: atlas HD da QUEST'ULTIMA immagine approvata, sfondo e personaggio assenti.
// La struttura dei cinque effetti e le tre classi restano identiche.
export const ATLANTE_REFERENCE_V533='./img/effetti/effetti-reference-v533.webp?v=533';
// v534: cinque pannelli alpha della tavola finale; blend normale senza riflessi verdastri.
export const ATLANTE_REFERENCE_V534='./img/effetti/effetti-reference-v534.webp?v=534';
// v535: provenienza identica, estrazione più fedele e ricca anche ai bordi.
export const ATLANTE_REFERENCE_V535='./img/effetti/effetti-reference-v535.webp?v=535';
// v536: cinque texture indipendenti generate SENZA personaggio o ritagli
// di silhouette, codificate nello stesso atlante 3x2 a risoluzione 1440x1200.
export const ATLANTE_REFERENCE_V536='./img/effetti/effetti-reference-v536.webp?v=536';
export const EFFETTI_REFERENCE_V532=Object.freeze({
  'effetto-ambra':Object.freeze({colonna:0,riga:0,classe:'ambra'}),
  'effetto-ombra':Object.freeze({colonna:1,riga:0,classe:'ombra'}),
  'effetto-fulmine':Object.freeze({colonna:2,riga:0,classe:'fulmine'}),
  'effetto-nebula':Object.freeze({colonna:0,riga:1,classe:'nebula'}),
  'skin-mitica':Object.freeze({colonna:1,riga:1,classe:'astrale'}),
});
export function effettoReferenceV532(id){
  return EFFETTI_REFERENCE_V532[id]||null;
}
// I frame sono indipendenti dalla classe: tutte le combinazioni vedono le
// STESSE identiche scie (non la precedente ricostruzione Canvas v531).
export function scenaReferenceClassV532(id){
  const fx=effettoReferenceV532(id);
  return fx?'rpg-reference-v532 rpg-reference-'+fx.classe:'';
}
