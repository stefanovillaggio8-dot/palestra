// Riferimento SOLO indicativo per Hyperextension con zavorra esterna.
// FitnessVolt, "Back Extension Standards by Bodyweight", aggiornati 29/03/2026:
// sono stime del MODELLO, NON percentili misurati né record agonistici.
// Unità della fonte: lb di 1RM del solo sovraccarico, qui convertite in kg.
// Questi dati non valgono per macchine a selettore o ROM e varianti non comparabili.
// TITAN e OLYMPIAN sono PROIEZIONI (non percentili osservati):
// per i cinque livelli iniziali si mantengono le ancore FV; per i due successivi
// soglieNormalizzate() applica estendiPercentiliAlti() con
// log(K_t/K_elite) = log(K_elite/K_advanced) * (z_t-z_elite)/(z_elite-z_advanced).
// La proiezione NON basta a certificare il Rank dell'atleta: mancano le
// leve individuali, l'appoggio della panca e la cinematica della ripetizione.
export const FONTE_HYPER = 'https://www.fitnessvolt.com/strength-standards/back-extension/';
export const GRAVITA_STANDARD = 9.80665;

/** Momento QUASI-statico del SOLO sovraccarico sull'anca (N m).
 * Nessun valore predefinito per la leva: senza misura non si può ricavare
 * il momento dai kg. Non equivale al momento totale di tronco, testa e braccia.
 */
export function momentoCaricoEsternoHyper({ caricoKg, braccioOrizzontaleMetri } = {}) {
  const m = Number(caricoKg), d = Number(braccioOrizzontaleMetri);
  if (caricoKg === null || braccioOrizzontaleMetri === null
      || caricoKg === undefined || braccioOrizzontaleMetri === undefined
      || String(caricoKg).trim() === '' || String(braccioOrizzontaleMetri).trim() === ''
      || !Number.isFinite(m) || !Number.isFinite(d) || m < 0 || d < 0) return null;
  return m * GRAVITA_STANDARD * d;
}
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
    limite: 'Le soglie Titan/Olympian sono proiezioni statistiche e NON possono essere assegnate a questa variante senza misurare geometria, appoggio della panca e ROM. I 5 livelli FitnessVolt sono anch’essi un modello, non percentili misurati.',
    nota: 'Il carico indica SOLO kg esterni, senza sommare il peso corporeo ai kg scritti. Il momento del carico vale M = kg × 9,80665 × distanza orizzontale dall’anca (metri), ma la leva varia durante il movimento e si somma il momento dei segmenti corporei. Con braccia tese verso il pavimento, senza conoscere panca 45/90°, appoggio del bacino, posizione dei pesi e ROM non è corretto trasformare 80 kg in un percentile di forza. Le varianti restano separate e nessun bonus di leva viene inventato.',
    proiezioneAlti: 'lognormale_advanced_elite',
    richiedeGeometria: true,
    massimoRankSupportato: 4, // proiezione conservata per trasparenza, NON titolo competitivo.
  };
}
