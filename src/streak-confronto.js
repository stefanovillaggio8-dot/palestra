import { calcolaStreak, giorniAllenati, giorniStreakAccreditati } from './streak.js';

/**
 * Confronto SOLTANTO IN LETTURA. Non si riattivano sedute cancellate,
 * non si creano sedute fittizie e non si sincronizzano account di amici.
 * La streak e' ricalcolata dalla stessa funzione usata nella Home.
 */
export function confrontaStreakDispositivi({
  seduteLocali = [], seduteCloud = [], profiloLocale = null,
  profiloCloud = null, oggi,
} = {}) {
  const locali = calcolaStreak(seduteLocali, oggi, profiloLocale);
  const cloud = calcolaStreak(seduteCloud, oggi, profiloCloud);
  const giorniLocali = new Set([
    ...giorniAllenati(seduteLocali, oggi),
    ...giorniStreakAccreditati(profiloLocale, oggi),
  ]);
  const giorniCloud = new Set([
    ...giorniAllenati(seduteCloud, oggi),
    ...giorniStreakAccreditati(profiloCloud, oggi),
  ]);
  const soloLocale = [...giorniLocali].filter(d => !giorniCloud.has(d)).sort();
  const soloCloud = [...giorniCloud].filter(d => !giorniLocali.has(d)).sort();
  const statiCloud = (giorno) => {
    const righe = seduteCloud.filter(s => String(s?.data || '').slice(0,10) === giorno);
    if (righe.some(s => s.eliminata)) return 'eliminata nel cloud';
    if (righe.some(s => s.stato === 'in_corso')) return 'ancora in corso nel cloud';
    return 'assente nel cloud';
  };
  return {
    locale: locali,
    cloud,
    soloLocale,
    soloCloud,
    dettaglioSoloLocale: soloLocale.map(data => ({data, stato:statiCloud(data)})),
    differenti: locali.giorni !== cloud.giorni || soloLocale.length>0 || soloCloud.length>0,
  };
}
