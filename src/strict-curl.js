// V438 - Strict Curl alla parete con barra EZ a presa interna.
// Il campo serie.peso registra sempre il TOTALE realmente sollevato.
// Il peso dell'EZ bar non e' standard: si deve misurare/verificare.
export const STRICT_CURL_ID = 'ex-strict-curl-ez-wall';

const parseKg = value => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const testo = String(value).trim().replace(',', '.');
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(testo)) return null;
  const n = Number(testo);
  return Number.isFinite(n) ? n : null;
};

/** Barra EZ + piastre del lato destro + piastre del lato sinistro.
 * Per il montaggio simmetrico entrambi i lati pesano uguale.
 * Si salvano i kg TOTALI, non il solo carico dei dischi.
 */
export function calcolaCaricoStrictCurl(barra, dischiPerLato) {
  const b = parseKg(barra), lato = parseKg(dischiPerLato);
  if (b === null || b <= 0 || b > 50)
    return { valido: false, motivo: 'Inserisci il peso reale della barra EZ in kg (deve essere maggiore di zero).' };
  if (lato === null || lato < 0 || lato > 150)
    return { valido: false, motivo: 'Inserisci i kg dei dischi su UN lato (puoi scrivere 0).' };
  const totale = Math.round((b + 2 * lato) * 100) / 100;
  if (totale > 350) return { valido: false, motivo: 'Carico totale fuori intervallo; ricontrolla i kg.' };
  return { valido: true, barra: b, dischiPerLato: lato, totale,
    formula: `${b} + 2 × ${lato} = ${totale} kg` };
}

export function strictCurlConBarraInclusa(esercizio) {
  return !!esercizio && esercizio.id === STRICT_CURL_ID
    && esercizio.convenzione === 'bilanciere' && esercizio.caricoIncludeBarra === true;
}
