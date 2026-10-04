import { test } from 'node:test';
import assert from 'node:assert/strict';

// Il Rank deve tenere conto del peso corporeo: chi pesa 60 kg e chi pesa 90 kg
// non possono avere lo stesso Rank lifting gli stessi 60 kg. E le performance
// vecchie devono restare legate al peso che l'utente aveva in quel momento.

import {
  RANK, MISURE, PESO_RIFERIMENTO, pesoCorporeoValido,
  profiloEsercizio, profiloPerPesoCorporeo, RIFERIMENTO_DEFAULT, soglieDaRiferimento,
} from '../src/rank-config.js';
import { stimaMassimo, punteggioSerie, performanceEsercizio, recordEsercizio, calcolaRank } from '../src/rank.js';

const CP = { id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'macchina' };
const serie = (o, peso, rip, extra = {}) => ({
  ordine: o, peso, ripetizioni: rip, spotter: false, stato: 'fatta', ...extra,
});

test('1. il peso corporeo viene controllato', () => {
  assert.equal(pesoCorporeoValido('82,5'), 82.5, 'accetta la virgola');
  assert.equal(pesoCorporeoValido(70), 70);
  assert.equal(pesoCorporeoValido('10'), null, '10 kg non e\' un peso corporeo');
  assert.equal(pesoCorporeoValido('500'), null, '500 kg nemmeno');
  assert.equal(pesoCorporeoValido(''), null);
  assert.equal(pesoCorporeoValido(null), null);
});

test('2. il profilo di riferimento NON cambia se non c\'e\' il peso', () => {
  const p = profiloEsercizio(CP);
  const senza = profiloPerPesoCorporeo(p, null);
  assert.deepEqual(senza.soglie, p.soglie, 'senza peso le soglie sono quelle scritte');
  assert.equal(senza.pesoConsiderato, false);
  // e il rank funziona lo stesso
  assert.ok(calcolaRank(p.soglie[2] + 1, senza).rank, 'il rank si calcola comunque');
});

test('3. le soglie si adattano al peso corporeo', () => {
  const p = profiloEsercizio(CP);
  const leggero = profiloPerPesoCorporeo(p, 60);
  const pesante = profiloPerPesoCorporeo(p, 90);
  const standard = profiloPerPesoCorporeo(p, PESO_RIFERIMENTO);

  assert.equal(leggero.pesoConsiderato, true);
  // con 70 kg le soglie sono quelle di configurazione
  assert.deepEqual(standard.soglie, p.soglie);
  // chi pesa meno trova le soglie piu' basse
  assert.ok(leggero.soglie[0] < p.soglie[0], 'soglia di partenza piu\' bassa per chi e\' leggero');
  assert.ok(pesante.soglie[0] > p.soglie[0], 'soglia di partenza piu\' alta per chi e\' pesante');
  // il rapporto e' quello giusto
  const fattore = 90 / PESO_RIFERIMENTO;
  assert.ok(Math.abs(pesante.soglie[1] - p.soglie[1] * fattore) < 0.05);
});

test('4. 60 kg che lifting 60 kg e 90 kg che lifting 60 kg NON hanno lo stesso rank', () => {
  // la richiesta esatta di Ste
  const prestazione = 60; // kg di 1RM stimato
  const p = profiloEsercizio(CP);
  const leggero = calcolaRank(prestazione, profiloPerPesoCorporeo(p, 60));
  const pesante = calcolaRank(prestazione, profiloPerPesoCorporeo(p, 90));

  const nomeL = leggero.rank ? leggero.rank.nome : 'nessuno';
  const nomeP = pesante.rank ? pesante.rank.nome : 'nessuno';
  assert.ok(nomeL !== nomeP,
    `devono avere rank diversi (trovato ${nomeL} e ${nomeP})`);
  // e chi pesa di meno non puo' trovarsi piu' in basso di chi pesa di piu'
  const ordineL = leggero.rank ? RANK.findIndex((r) => r.id === leggero.rankId) : -1;
  const ordineP = pesante.rank ? RANK.findIndex((r) => r.id === pesante.rankId) : -1;
  assert.ok(ordineL >= ordineP,
    `a parita' di kg chi pesa di meno e\' almeno allo stesso livello (${ordineL} vs ${ordineP})`);
});

test('5. ogni esercizio ha soglie sue, anche a parita\' di peso corporeo', () => {
  const CPp = profiloPerPesoCorporeo(profiloEsercizio(CP), 70);
  const laterale = profiloPerPesoCorporeo(
    profiloEsercizio({ id: 'ex-db-lateral-raise', nome: 'Dumbbell Lateral Raise', convenzione: 'bilanciere' }), 70);
  assert.notDeepEqual(CPp.soglie, laterale.soglie,
    'stesso peso corporeo, soglie diverse: ogni esercizio e\' proprio suo');
});

test('6. il record resta legato al peso del giorno in cui l\'hai fatto', () => {
  // l\'utente pesa 60 kg e registra 40 kg x 10 (1RM stimato 53,33)
  const serie60 = [serie(1, 40, 10, { peso_corpo: 60 })];
  // poi si pesa 90 kg: il record del passato NON deve cambiare
  const serie90 = [serie(1, 60, 10, { peso_corpo: 90 })];

  const r60 = recordEsercizio(serie60, CP, null, 90);
  const r90 = recordEsercizio(serie90, CP, null, 90);

  assert.equal(r60.pesoCorporeo, 60, 'il record vecchio resta col peso di allora');
  assert.equal(r60.punteggio, 53.33, 'e il suo punteggio non e\' stato toccato dal peso nuovo');
  assert.equal(r90.pesoCorporeo, 90, 'il record nuovo ha il peso nuovo');
  assert.equal(r90.punteggio, 80, '1RM stimato di 60 kg x 10');
  assert.ok(r60.rank !== r90.rank, 'e i due rank sono diversi');
});

test('7. senza peso salvato dentro si usa quello di adesso', () => {
  const serieVecchia = [serie(1, 40, 10)]; // senza peso_corpo
  const r = recordEsercizio(serieVecchia, CP, null, 80);
  assert.equal(r.pesoCorporeo, 80, 'usa il peso attuale per le prestazioni vecchie senza peso');
});

test('8. il Rank si adatta da solo quando il peso cambia', () => {
  const serieFissa = [serie(1, 60, 5)]; // 1RM 70 kg
  const prima = recordEsercizio(serieFissa, CP, null, 60);
  const dopo = recordEsercizio(serieFissa, CP, null, 90);
  assert.equal(prima.punteggio, dopo.punteggio, 'il punteggio della serie non cambia');
  // ma il rank si sposta, perche' le soglie sono diverse
  const nomePrima = prima.rank ? prima.rank.nome : 'nessuno';
  const nomeDopo = dopo.rank ? dopo.rank.nome : 'nessuno';
  assert.ok(nomePrima !== nomeDopo, `il rank si adatta (prima ${nomePrima}, dopo ${nomeDopo})`);
});

test('9. il Rank prende la prestazione migliore, non l\'ultima', () => {
  const tre = [serie(1, 40, 10), serie(2, 45, 8), serie(3, 50, 5)];
  const res = performanceEsercizio(tre, CP, null, 70);
  // 1RM stimati: 53,33 · 57 · 58,33 -> vince la terza
  assert.equal(res.migliore.serie.ordine, 3, 'viene scelta la migliore, non la prima');
  assert.ok(res.migliore.punteggio >= 58);
});

test('10. il tempo e la distanza NON dipendono dal peso', () => {
  // un plank di 60 secondi vale 60 secondi per tutti: non ha senso valutarlo
  // sul peso corporeo
  const p = profiloPerPesoCorporeo({ ...profiloEsercizio(CP), misura: MISURE.TEMPO }, 60);
  assert.equal(p.pesoConsiderato, false, 'per il tempo il peso non conta');
  const q = profiloPerPesoCorporeo({ ...profiloEsercizio(CP), misura: MISURE.KG_REPS }, 60);
  assert.equal(q.pesoConsiderato, true, 'per i kg invece conta');
});

test('11. la serie con spotter resta fuori dal record', () => {
  const res = performanceEsercizio([serie(1, 60, 5, { spotter: true })], CP, null, 70);
  assert.equal(res.migliore, null, 'una serie col spotter non e\' un record pulito');
});

test('12. la punteggio di una serie non cambia con il peso', () => {
  // il peso corporeio cambia le SOGLIE, non il punteggio: cosi' due persone
  // diverse con lo stesso carico hanno lo stesso numero e soglie diverse
  const p = profiloEsercizio(CP);
  const a = punteggioSerie(serie(1, 50, 5), profiloPerPesoCorporeo(p, 60));
  const b = punteggioSerie(serie(1, 50, 5), profiloPerPesoCorporeo(p, 90));
  assert.equal(a.punteggio, b.punteggio, 'stesso carico, stesso punteggio');
  assert.equal(a.punteggio, 58.33);
});

test('13. sette rank, ognuno con tre divisioni', () => {
  assert.equal(RANK.length, 7);
  assert.deepEqual(RANK.map((r) => r.nome), ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'TITAN', 'OLYMPIAN']);
});
// ---------------------------------------------------------------------------
// Il riferimento PLATINUM scelto automaticamente.
//
// Ste: "non si puo' rendere automatica sta cosa?". Nel form di creazione
// esercizio il campo e' facoltativo: se e' vuoto l'app sceglie il riferimento
// in base alla misura e lo scala sul peso corporeo.
// ---------------------------------------------------------------------------

test('14. senza scrivere nulla il riferimento esiste ed e giusto', () => {
  const es = { id: 'ex-nuovo', nome: 'Nuovo', convenzione: 'macchina', misura: MISURE.KG_REPS };

  // Nessun riferimento scritto a mano: ora il numero NON viene piu' preso dal
  // default per misura, ma nasce dal LIVELLO di difficolta' dell'esercizio.
  // Ste: "i rank per ogni esercizio devono adattarsi al tipo di esercizio".
  const senzaNumero = profiloEsercizio(es, {});
  assert.equal(senzaNumero.riferimentoFisso, false, 'il numero non e\' scritto a mano');
  assert.ok(senzaNumero.riferimento > 0, 'ma un riferimento c\'e\' comunque');
  assert.ok(senzaNumero.soglie.length === RANK.length, 'la scala ha un gradino per ogni rank');
  assert.deepEqual(senzaNumero.soglie, soglieDaRiferimento(senzaNumero.riferimento));

  // ogni misura ha una scala completa, quindi nessun esercizio resta senza
  for (const misura of Object.values(MISURE)) {
    const p = profiloEsercizio({ id: 'x', nome: 'X', convenzione: 'macchina', misura }, {});
    assert.ok(p.soglie.length === RANK.length, 'scala completa per ' + misura);
    assert.ok(p.soglie.every((n) => Number.isFinite(n) && n > 0), 'nessun gradino a zero per ' + misura);
  }
});

test('15. il riferimento automatico si scala sul peso corporeo', () => {
  const es = { id: 'ex-nuovo', nome: 'Nuovo', convenzione: 'macchina', misura: MISURE.KG_REPS };
  const p = profiloEsercizio(es, {});

  const leggero = profiloPerPesoCorporeo(p, 60);
  const pesante = profiloPerPesoCorporeo(p, 90);

assert.ok(leggero.pesoConsiderato, 'il peso viene usato');
  // il riferimento ricalcola sul peso vero, quindi i due non sono piu' legati
  // al numero di prima
  assert.ok(pesante.soglie[3] > leggero.soglie[3], 'chi pesa di piu ha il platino piu in alto');
  // e soprattutto: il riferimento e' SEMPRE quello che ha generato le soglie
  // (prima non era cosi': diceva 63 mentre le soglie erano fatte su 59.4, e il
  // giudizio "quanto ho fatto" risultava sbagliato)
  for (const q of [leggero, pesante]) {
    assert.deepEqual(q.soglie, soglieDaRiferimento(q.riferimento),
      'le soglie devono nascere dal riferimento dichiarato');
  }
});

test('16. un numero scritto a mano vince sempre sul automatico', () => {
  const es = { id: 'ex-nuovo', nome: 'Nuovo', convenzione: 'macchina', misura: MISURE.KG_REPS };
  const manuale = profiloEsercizio(es, { riferimento: 25 });
  assert.equal(manuale.riferimento, 25, 'vale quello scritto a mano');
  assert.equal(manuale.riferimentoFisso, true, 'e l\'app sa che e\' scritto a mano');
  assert.deepEqual(manuale.soglie, soglieDaRiferimento(25), 'e la scala nasce da quello');

  // e il peso NON lo tocca il numero: se hai scritto un numero, quello resta
  const colPeso = profiloPerPesoCorporeo(manuale, 90);
  assert.ok(colPeso.soglie[3] > 25, 'il peso scala le soglie');
  const scalaManuale = profiloPerPesoCorporeo(manuale, 70);
  assert.equal(Math.round(scalaManuale.soglie[3] * 100) / 100, 25,
    'ma a 70 kg il platino torna esattamente al numero scritto');

  // se il numero non e' valido si torna al calcolo automatico, senza rompere
  for (const brutto of [0, -5, 'abc', null]) {
    const p = profiloEsercizio(es, { riferimento: brutto });
    assert.equal(p.riferimentoFisso, false, 'un numero brutto non e\' "fisso": ' + brutto);
    assert.ok(p.riferimento > 0, 'e il profilo resta valido');
  }
});
