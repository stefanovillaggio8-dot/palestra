// Riferimento SOLO indicativo per Hyperextension con zavorra esterna.
// FitnessVolt, "Back Extension Standards by Bodyweight", aggiornati 29/03/2026:
// sono stime del MODELLO, NON percentili misurati né record agonistici.
// Unità della fonte: lb di 1RM del solo sovraccarico, qui convertite in kg.
// Questi dati non valgono per macchine a selettore o ROM e varianti non comparabili.
export const FONTE_HYPER = 'https://www.fitnessvolt.com/strength-standards/back-extension/';
const LIBBRE_IN_KG = 0.45359237;
export const ANCORE_HYPER_LB = Object.freeze([
  // BW lb, beginner, novice, intermediate, advanced, elite (modello FV).
  [140, 0.5, 6, 26, 53, 85],
  [150, 0.5, 7, 27, 53, 83],
  [160, 0.5, 8, 27, 53, 82],
  [170, 0.5, 8, 28, 53, 80],
  [180, 0.5, 9, 28, 52, 79],
]);
export const SOGLIE_HYPER_MODELLO = Object.freeze(ANCORE_HYPER_LB.map(([bw, ...livelli]) =>
  [Math.round((bw * LIBBRE_IN_KG)*100)/100, ...livelli.map(v => Math.round(v*LIBBRE_IN_KG*100)/100)]
));
export const VARIANTI_HYPER = Object.freeze({
  'ex-back-extension': 'non_specificata',
  'ex-back-extension-chest': 'carico_al_petto',
  'ex-back-extension-hanging': 'braccia_tese_verso_il_basso',
});
export function varianteHyperextension(esercizio) {
  return VARIANTI_HYPER[String(esercizio?.id || '')] || (/hyperextension|back extension/i.test(String(esercizio?.nome || '')) ? 'non_specificata' : null);
}
export function riferimentoHyperextension(esercizio) {
  const variante = varianteHyperextension(esercizio);
  if (!variante) return null;
  return {
    ingresso: SOGLIE_HYPER_MODELLO[1][1] / SOGLIE_HYPER_MODELLO[1][0],
    vertice: SOGLIE_HYPER_MODELLO[1][5] / SOGLIE_HYPER_MODELLO[1][0],
    soglie1RMPerPeso: SOGLIE_HYPER_MODELLO,
    fonte: 'modello_hyperextension_non_validato',
    affidabilitaBase: 'bassa',
    fonteUrl: FONTE_HYPER,
    riferimentoNome: 'Back Extension zavorrata · modello FitnessVolt',
    dataFonte: '2026-03-29',
    tipoAttrezzatura: 'dischi_esterni',
    varianteHyperextension: variante,
    limite: 'Riferimento stimato e non validato: differenze di panca 45/90°, ROM, carico al petto o a braccia tese in basso e movimento d’anca/colonna. Non esistono percentili agonistici verificati per queste varianti. Nessun bonus di leva assegnato.',
    nota: 'Il carico inserito indica SOLTANTO kg esterni, senza sommare il peso corporeo. Con carico al petto e con braccia tese che pendono verso il pavimento si usano registrazioni distinte, senza bonus percentuale arbitrario. La distanza orizzontale dall’anca, non la direzione verticale delle braccia, determina il momento del carico.',
    massimoRankSupportato: 4, // Diamond come ultimo livello modellato p95; Titan/Olympian richiedono dati reali.
  };
}
