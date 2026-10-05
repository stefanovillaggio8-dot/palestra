import { pesoAllaSeduta } from './peso-corporeo.js';
import { stimaMassimo } from './rank.js';
import { riferimentoPerEsercizio } from './rank-config.js';

/**
 * Quanto hai sollevato IN PIU' del tuo corpo, e il rapporto.
 *
 * Ste (04/10/2026): "con kg intendo il peso che alzo in piu' rispetto al mio
 * corpo. Per esempio io peso 66 kg e faccio 96 di lat machine, alzo 30 kg in piu'
 * del mio peso".
 *
 * E' la misura piu' onesta che ci sia, perche' mette tutti sulla stessa scala:
 * chi pesa 66 e solleva 96 ha fatto +30, chi pesa 90 e solleva 96 ha fatto +6. Il
 * secondo e' piu' debole pur avendo gli stessi kg, e questa e' la verita'.
 *
 * Restituisce anche il RAPPORTO (quanto volte il proprio peso), perche' Ste ha
 * chiesto di vedere entrambi: i kg dicono quanto hai spostato, il rapporto dice
 * quanto era difficile per TE.
 *
 * LE GAMBE NON CONTANO, per scelta di Ste (04/10/2026): "non contare esercizi di
 * gambe perche' quelli sballano troppo". Un leg press da 110 kg sposta la media
 * di tutti gli esercizi e la tabella smette di dire qualcosa. Non e' che i
 * numeri delle gambe spariscano: restano visibili uno per uno, semplicemente non
 * entrano nella media.
 */

/**
 * I muscoli che Ste ha deciso di tenere fuori dalla media.
 *
 * Ste (04/10/2026): "non contare esercizi di gambe perché quelli sballano troppo".
 *
 * Le parole sono sia in italiano sia in inglese perché l'app riconosce gli
 * esercizi dal nome che scrivi tu in palestra, e quello è quasi sempre in
 * inglese: cercavo solo "gambe" e il leg press passava come se non fosse una
 * gamba.
 */
export const PAROLE_GAMBE = [
  'gamba', 'gambe', 'coscia', 'polpacc', 'femorale', 'glute', 'glutei',
  'leg press', 'legpress', 'sled press', 'calf', 'leg curl', 'leg extension',
  'squat', 'hack squat', 'hip thrust', 'stacco', 'deadlift',
];

export function gambeEsclusoDaMedia(gruppo, nome) {
  const testo = String(gruppo || '') + ' ' + String(nome || '');
  const g = testo.toLowerCase();
  return PAROLE_GAMBE.some((k) => g.includes(k));
}

/**
 * I kg che hai spostato davvero: prendo la serie fatta più pesante, e scarto le
 * serie non fatte o col solo spotter.
 *
 * Non riuso recordSenzaAssistenza di confronto.js perche' richiede il profilo
 * dell'esercizio e restituisce un oggetto { valore, valido, motivo }: qui non
 * serve tutto questo, serve il numero. La regola la applico qui, in tre righe,
 * e si vede.
 */
export function kgReali(serie) {
  let migliore = null;
  for (const s of (serie || [])) {
    if (!s || s.eliminata) continue;
    if (s.stato && s.stato !== 'fatta') continue;
    if (s.spotter === true) continue; // collo spotter non è un record pulito
    const peso = Number(s.peso);
    if (!Number.isFinite(peso) || peso <= 0) continue;
    if (migliore === null || peso > migliore) migliore = peso;
  }
  return migliore;
}

/**
 * Una prestazione, pronta per la tabella.
 * opportuno = null se non si puo' calcolare, e va detto PERCHE'.
 */
export function prestazione({ esercizio, serie, pesoCorporeo, carrucola = null }) {
  const fatti = (serie || []).filter((s) => s && !s.eliminata
    && (!s.stato || s.stato === 'fatta') && s.spotter !== true);
  const letto = kgReali(serie);
  // Sul doppio carrucola il peso che senti è META' di quello sul carrello.
  // Senza questo, le alzate laterali finivano con il doppio: la stessa identica
  // dimenticanza che Ste mi ha fatto correggere tre volte sul Rank.
  const kg = letto === null ? null : (carrucola === 'carrucola_doppia' ? letto / 2 : letto);
  const gruppo = (esercizio && (esercizio.gruppo || '')) || '';
  const nomeEsercizio = (esercizio && esercizio.nome) || '';
  const gamba = gambeEsclusoDaMedia(gruppo, nomeEsercizio);
  const base = {
    id: (esercizio && esercizio.id) || '',
    nome: nomeEsercizio,
    gruppo,
    kg: null,
    rapporto: null,
    eccesso: null,
    percentuale: null,
    contaNellaMedia: !gamba,
    percheNonConta: gamba
      ? 'Le gambe non contano nella media: i loro numeri sono troppo alti e la farebbero saltare.'
      : null,
  };
  if (kg === null || kg <= 0) return { ...base, percheNonConta: base.percheNonConta || 'Nessun carico registrato.' };
  const peso = Number(pesoCorporeo);
  if (!Number.isFinite(peso) || peso <= 0) {
    return { ...base, kg, percheNonConta: base.percheNonConta || 'Non c\'è il tuo peso nel profilo: senza quello non posso dire quanto hai sollevato in più.' };
  }

  // LA PERCENTUALE, e questo è il numero che conta.
  //
  // Ste ha visto -23.5 kg nella media e ha chiesto "come è possibile?". La
  // risposta è che la formula era sbagliata, non i suoi numeri. Sottrarre il peso
  // corporeo NON rende confrontabili esercizi di scale diverse: 12.5 kg di laterale
  // è una prestazione forte, 90 kg di rematore è una prestazione media, ma
  // "12.5 - 66" dice che il laterale è stato meglio del rematore. Il contrario.
  //
  // La percentuale invece funziona, perché ogni esercizio viene confrontato con la
  // SUA scala (quanto sposta chi si allena bene su QUEL esercizio, riportato sul
  // peso di questa persona). 100% = il livello realistico per te. E i due numeri
  // sono confrontabili fra esercizi qualsiasi, perché ognuno è già normalizzato.
  //
  // E si aggiorna da sola: scala, peso corporeo e prestazione si rileggono ogni
  // volta che apri la schermata. Nessun numero scritto dentro il codice.
  const migliore = fatti.reduce((a, s) => {
    const rip = Number(s.ripetizioni);
    if (!Number.isFinite(rip) || rip <= 0) return a;
    return (a === null || rip > a) ? rip : a;
  }, null);
  const massimale = migliore === null ? null : stimaMassimo(kg, migliore);
  const riferimento = riferimentoPerEsercizio(
    { id: base.id, nome: nomeEsercizio, convenzione: (esercizio && esercizio.convenzione) || null,
      attrezzatura: (esercizio && esercizio.attrezzatura) || null,
      bracciaIndipendenti: !!(esercizio && esercizio.bracciaIndipendenti) },
    peso,
  );
  const percentuale = (massimale !== null && Number.isFinite(riferimento) && riferimento > 0)
    ? Math.round((massimale / riferimento) * 1000) / 10
    : null;

  return {
    ...base,
    kg,
    ripetizioni: migliore,
    massimale,
    riferimento,
    percentuale,
    rapporto: Math.round((kg / peso) * 1000) / 1000,
    // Ste: "il peso che alzo in piu' rispetto al mio corpo". 96 - 66 = 30.
    eccesso: Math.round((kg - peso) * 100) / 100,
  };
}

/**
 * La media, sui soli esercizi che contano.
 *
 * ATTENZIONE: qui c'è una correzione importante, e la chiamo perché è il punto
 * che Ste ha notato da solo.
 *
 * Avevo fatto la media dei kg "in più del tuo corpo", come chiedeva lui. Ma sulla
 * sua scheda dava -23.5 kg: un numero che non può esistere. Non era un bug, era la
 * formula sbagliata. Sottrarre il peso corporeo NON rende confrontabili esercizi di
 * scale diverse: 12.5 kg di alzate laterali è una prestazione forte, 90 kg di
 * rematore è una prestazione media, ma "12.5 - 66" dice che il laterale è stato
 * meglio del rematore. Il contrario della realtà.
 *
 * Adesso la media è la media delle PERCENTUALI rispetto alla scala di ciascun
 * esercizio. Ogni esercizio è già normalizzato sul suo livello realistico e sul
 * peso di questa persona, quindi le percentuali sono confrontabili fra loro.
 * 100% significa "hai raggiunto il livello realistico per te, su quell'esercizio".
 *
 * I kg in più del corpo restano scritti per ogni esercizio, come chiedeva, ma non
 * sono loro la media.
 */
export function mediaPrestazioni(lista) {
  const valide = (lista || []).filter((p) => p.contaNellaMedia && p.percentuale !== null);
  if (!valide.length) {
    return { percentuale: null, media: null, rapporto: null, eccessoMedio: null, conta: 0, saltate: (lista || []).length };
  }
  const media = (f) => valide.reduce((a, p) => a + (p[f] || 0), 0) / valide.length;
  return {
    percentuale: Math.round(media('percentuale') * 10) / 10,
    // "media" è l'alias vecchio: ora è la percentuale, che è il numero che ordina
    media: Math.round(media('percentuale') * 10) / 10,
    rapporto: Math.round(media('rapporto') * 1000) / 1000,
    eccessoMedio: Math.round(media('eccesso') * 100) / 100,
    conta: valide.length,
    saltate: (lista || []).length - valide.length,
  };
}

/**
 * La classifica "più forte in generale", come l'ha chiesta Ste:
 * TUTTI in elenco, ognuno con i kg E il rapporto, ordinati dalla media più
 * alta. Non solo il primo: una classifica che mostra solo il vincitore è una
 * pubblicità, non una classifica.
 */
export function classificaGenerale(persone) {
  const righe = (persone || [])
    .map((p) => {
      // Il peso corporeo della PERSONA va passato: senza, "quanto hai sollevato
      // in piu' del tuo corpo" non si puo' calcolare e la classifica veniva
      // vuota. E' esattamente la meta' della misura, quindi non e' un dettaglio.
      const prestazioni = (p.serie || []).map((s) => prestazione({
        esercizio: s.esercizio,
        serie: s.serie,
        pesoCorporeo: p.peso,
        carrucola: s.carrucola || null,
      }));
      const m = mediaPrestazioni(prestazioni);
      return {
        nome: p.nome,
        peso: p.peso,
        media: m.media,
        eccessoMedio: m.eccessoMedio,
        rapporto: m.rapporto,
        conta: m.conta,
        saltate: m.saltate,
        prestazioni,
      };
    })
    .filter((r) => r.media !== null)
    .sort((a, b) => b.media - a.media);
  return righe;
}

/**
 * Quanto hai sollevato in più del corpo nel tempo, per capire se stai
 * migliorando davvero. Serve il peso corporeo di QUEL giorno: se pesa di più,
 * la soglia sale anche senza che tu perda niente.
 */
export function prestazioneAllaSeduta({ serie, esercizio, data, pesiPerData }) {
  const kg = kgReali(serie);
  const peso = pesiPerData && pesiPerData(data);
  if (kg === null || !Number.isFinite(Number(peso)) || Number(peso) <= 0) return null;
  const pesoNum = Number(peso);
  return {
    data,
    kg,
    peso: pesoNum,
    rapporto: Math.round((kg / pesoNum) * 1000) / 1000,
    eccesso: Math.round((kg - pesoNum) * 100) / 100,
  };
}