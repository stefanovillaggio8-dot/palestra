import { recordEsercizio } from './rank.js';

function leggiNumero(valore) {
  if (valore === null || valore === undefined || String(valore).trim() === '') return null;
  const numero = Number(String(valore).replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

/** Simulazione soltanto in memoria: non registra serie, XP o record. */
export function calcolaRankDiProva({ esercizio, peso, ripetizioni, pesoCorporeo }) {
  if (!esercizio?.id) return { valido: false, errore: 'Scegli un esercizio dall’elenco.' };
  const corpo = leggiNumero(pesoCorporeo);
  if (corpo === null || corpo < 25 || corpo > 300) {
    return { valido: false, errore: 'Inserisci il tuo peso corporeo reale (25–300 kg). Non uso un peso inventato per il Rank.' };
  }
  const rip = leggiNumero(ripetizioni);
  if (!Number.isInteger(rip) || rip < 1 || rip > 200) {
    return { valido: false, errore: 'Le ripetizioni devono essere un numero intero da 1 a 200.' };
  }
  const zavorra = esercizio.convenzione === 'zavorri';
  const senzaCarico = esercizio.convenzione === 'corpo_libero';
  const kg = senzaCarico ? 0 : leggiNumero(peso);
  if (kg === null || (zavorra ? kg < 0 : !senzaCarico && kg <= 0)) {
    return { valido: false, errore: zavorra
      ? 'Inserisci la zavorra, anche 0 kg per una serie a corpo libero.'
      : 'Inserisci il peso realmente utilizzato.' };
  }
  const serie = {
    id: 'simulazione-rank', seduta_id: 'simulazione-rank', esercizio_id: esercizio.id,
    peso: zavorra || senzaCarico ? null : kg,
    ...(zavorra || senzaCarico ? { peso_assistenza: kg } : {}),
    ripetizioni: rip, peso_corpo: corpo, stato: 'fatta', ordine: 1,
  };
  const record = recordEsercizio([serie], esercizio, null, corpo);
  return { valido: !!record.valido, record, serie, peso: kg,
    ripetizioni: rip, pesoCorporeo: corpo,
    errore: record.valido ? null : (record.motivo || 'Non valutabile con il modello attuale.') };
}
