// rank.test.js -- il motore del Rank: soglie diverse per esercizio, la
// performance migliore (non l'ultima), gli LP calcolati e la classifica.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  stimaMassimo, punteggioSerie, performanceEsercizio, recordEsercizio,
  calcolaRank, classificaEsercizio, storicoMiglioramenti, recordAccount,
  rankPrincipale, distribuzioneRank, distanzaAllaSoglia,
} from '../src/rank.js';
import {
  RANK, MISURE, profiloEsercizio, soglieDaRiferimento, ETICHETTE_MISURA, divisioneDaLp,
  profiloPerPesoCorporeo, MOLTIPLICATORI_SOGLIA,
} from '../src/rank-config.js';
import { ESERCIZI } from '../src/dati-iniziali.js';

const chest = ESERCIZI.find((e) => /chest press/i.test(e.nome));
const lateral = ESERCIZI.find((e) => /lateral/i.test(e.nome));

function serie(peso, rip, extra = {}) {
  return { id: 's' + peso + 'x' + rip + Math.random().toString(36).slice(2, 6), peso, ripetizioni: rip, stato: 'fatta', ordine: 1, ...extra };
}

test('1. i sette rank sono quelli richiesti, in ordine', () => {
  assert.deepEqual(RANK.map((r) => r.id), ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'titan', 'olympian']);
});

test('2. le cinque misure esistono tutte', () => {
  const valori = Object.values(MISURE);
  for (const v of ['kg_reps', 'solo_reps', 'tempo', 'distanza', 'kg_tempo']) {
    assert.ok(valori.includes(v), 'manca la misura ' + v);
    assert.ok(ETICHETTE_MISURA[v], 'manca l\'etichetta di ' + v);
  }
});

test('3. la stima del massimo tiene conto di peso e ripetizioni', () => {
  assert.equal(stimaMassimo(50, 1), 50);
  assert.ok(stimaMassimo(50, 5) > 50, '5 ripetizioni valgono piu\' di 1');
  assert.ok(stimaMassimo(50, 10) > stimaMassimo(50, 5), '10 ripetizioni valgono piu\' di 5');
  // una serie piu\' leggera ma lunga puo\' valere come una pesante e corta
  assert.ok(stimaMassimo(40, 12) > stimaMassimo(45, 3));
  assert.equal(stimaMassimo(null, 5), null);
  assert.equal(stimaMassimo(50, null), null);
  assert.equal(stimaMassimo(0, 5), null);
});

test('4. il rank prende la performance MIGLIORE, non l\'ultima serie', () => {
  // 45 kg x 12 e' la piu' forte delle tre (stima 64.8 kg, formula lunga):
  // l'ultima, 40 x 10, resta indietro. Il rank non dipende dall'ordine.
  const serieDelGiorno = [serie(50, 5), serie(45, 12), serie(40, 10)];
  const res = performanceEsercizio(serieDelGiorno, chest);
  assert.equal(res.tutte.length, 3);
  assert.equal(res.migliore.serie.peso, 45);
  assert.equal(res.migliore.serie.ripetizioni, 12);
  // anche mettendola per ultima il risultato non cambia
  const rovesciata = performanceEsercizio([serie(40, 10), serie(45, 12), serie(50, 5)], chest);
  assert.equal(rovesciata.migliore.serie.peso, 45);
  assert.equal(rovesciata.migliore.serie.ripetizioni, 12);
});

test('5. la stessa serie non viene contata due volte e le serie non fatte sono escluse', () => {
  const s = [serie(45, 8), serie(90, 3, { stato: 'da_fare' }), serie(45, 8, { id: 'altra' })];
  const res = performanceEsercizio(s, chest);
  assert.equal(res.tutte.length, 2);
});

test('6. le serie con lo spotter non sono record', () => {
  const res = performanceEsercizio([serie(120, 5, { spotter: true })], chest);
  assert.equal(res.migliore, null);
  const motivo = punteggioSerie(serie(120, 5, { spotter: true }), profiloEsercizio(chest));
  assert.equal(motivo.valido, false);
  assert.match(motivo.motivo, /spotter/);
});

test('7. OGNI ESERCIZIO HA SOGLIE PROPRIE: 50 kg non danno lo stesso rank', () => {
  const a = recordEsercizio([serie(50, 8)], chest);
  const b = recordEsercizio([serie(50, 8)], lateral);
  assert.notEqual(a.rankId, b.rankId, 'stesso peso, stesso rank: le soglie non sono diverse');
  assert.ok(b.rank.indice > a.rank.indice, 'il lateral raise con gli stessi numeri e\' piu\' difficile');
});

test('8. gli LP stanno fra 0 e 99 dentro un rank e crescono col punteggio', () => {
  const profilo = profiloEsercizio(chest);
  const basso = calcolaRank(profilo.soglie[0], profilo);
  const alto = calcolaRank(profilo.soglie[2] + profilo.soglie[3] / 4, profilo);
  assert.equal(basso.lp, 0);
  assert.ok(alto.lp > 0 && alto.lp <= 99);
  assert.ok(alto.progresso > basso.progresso);
});

test('9. gli LP crescono quando la performance cresce, a parita\' di rank', () => {
  const profilo = profiloEsercizio(chest);
  // i valori si prendono DENTRO la stessa fascia: prima erano scritti a mano
  // (55 e 60) e quando sono cambiate le soglie finivano in due rank diversi,
  // quindi il test si rompeva senza che nessuno cambiasse il codice
  const [basso, alto] = profilo.soglie;
  const a = calcolaRank(basso + (alto - basso) * 0.3, profilo);
  const b = calcolaRank(basso + (alto - basso) * 0.7, profilo);
  assert.equal(a.rankId, b.rankId);
  assert.ok(b.lp > a.lp, 'sempre piu\' LP quando il punteggio sale');
});

test('10. sul rank piu\' alto gli LP non hanno un tetto (183 LP come nell\'esempio)', () => {
  const profilo = profiloEsercizio(chest);
  const tanto = calcolaRank(profilo.soglie[6] * 3, profilo);
  assert.equal(tanto.rankId, 'olympian');
  assert.ok(tanto.lp > 100, 'sopra 100 LP sul rank alto: deve essere possibile');
  assert.equal(tanto.inTop, true);
  assert.equal(tanto.sogliaSuccessiva, null);
});

test('11. chi non ha nessuna prestazione non riceve un rank inventato', () => {
  const r = recordEsercizio([], chest);
  assert.equal(r.valido, false);
  assert.equal(r.rank, null);
  assert.equal(r.punteggio, null);
});

test('12. sotto la prima soglia non c\'e\' rank', () => {
  const profilo = profiloEsercizio(chest);
  const r = calcolaRank(0.00001, profilo);
  assert.equal(r.rank, null);
  assert.equal(r.lp, 0);
});

test('13. la classifica confronta solo lo stesso esercizio e usa la migliore', () => {
  const voci = [
    { account: 'a', username: 'Stefano', serie: [serie(80, 6)], esercizio: chest },
    { account: 'b', username: 'Andrea', serie: [serie(75, 8)], esercizio: chest },
    { account: 'c', username: 'Marco', serie: [serie(70, 10)], esercizio: chest },
  ];
  const classifica = classificaEsercizio(voci, profiloEsercizio(chest));
  assert.equal(classifica.length, 3);
  assert.equal(classifica[0].username, 'Stefano');
  assert.equal(classifica[0].posizione, 1);
  assert.equal(classifica[2].posizione, 3);
  // ogni riga ha il punteggio migliore, non l'ultima serie
  for (const r of classifica) assert.ok(r.punteggio > 0);
});

test('14. a parita\' di punteggio la posizione e\' la stessa (ex aequo)', () => {
  const voci = [
    { account: 'a', username: 'A', punteggioCalcolato: 50 },
    { account: 'b', username: 'B', punteggioCalcolato: 50 },
    { account: 'c', username: 'C', punteggioCalcolato: 40 },
  ];
  const c = classificaEsercizio(voci, profiloEsercizio(chest));
  assert.equal(c[0].posizione, 1);
  assert.equal(c[1].posizione, 1);
  assert.equal(c[2].posizione, 3);
});

test('15. chi non ha il record non finisce in classifica', () => {
  const c = classificaEsercizio([{ account: 'a', username: 'A', serie: [] }], profiloEsercizio(chest));
  assert.equal(c.length, 0);
});

test('16. le divisioni stanno dentro il rank, col numero che sale', () => {
  // Ste, 07/10/2026: "il massimo deve essere GOLD 3", quindi I e' la piu' bassa.
  assert.equal(divisioneDaLp(0).nome, 'I');
  assert.equal(divisioneDaLp(40).nome, 'II');
  assert.equal(divisioneDaLp(80).nome, 'III');
  // e la scala deve essere monotona: piu' LP, mai una divisione piu' bassa
  let prima = 0;
  for (let lp = 0; lp <= 99; lp++) {
    const n = { I: 1, II: 2, III: 3 }[divisioneDaLp(lp).nome];
    assert.ok(n >= prima, 'a ' + lp + ' LP la divisione e\' tornata indietro');
    prima = n;
  }
});

test('17. solo reps: conta il numero, non i kg', () => {
  const trazioni = { id: 'ex-pull-ups', nome: 'Pull Ups', convenzione: 'assistenza' };
  const profilo = profiloEsercizio(trazioni);
  assert.equal(profilo.misura, MISURE.SOLO_REPS);
  const res = performanceEsercizio([{ id: 'x', peso: null, peso_assistenza: 0, ripetizioni: 12, stato: 'fatta' }], trazioni);
  assert.equal(res.migliore.punteggio, 12);
  // con 20 kg di zavorra le stesse 12 ripetizioni valgono meno
  const assistito = performanceEsercizio([
    { id: 'y', peso: null, peso_assistenza: 20, ripetizioni: 12, stato: 'fatta' },
  ], trazioni);
  assert.ok(assistito.migliore.punteggio < 12, 'la zavorra deve abbassare il punteggio');
});

test('18. tempo e distanza dipendono dalla loro unita\'', () => {
  const tempo = { id: 'plank', nome: 'Plank', convenzione: 'macchina', misura: MISURE.TEMPO };
  const res = performanceEsercizio([{ id: 't', peso: null, ripetizioni: 120, stato: 'fatta' }], tempo);
  assert.equal(res.migliore.punteggio, 120);
  const distanza = { id: 'tiro', nome: 'Tiro a centro', convenzione: 'macchina', misura: MISURE.DISTANZA };
  const res2 = performanceEsercizio([{ id: 'd', peso: null, ripetizioni: 250, stato: 'fatta' }], distanza);
  assert.equal(res2.migliore.punteggio, 250);
});

test('19. kg + tempo considera entrambi i numeri', () => {
  const iso = { id: 'iso', nome: 'Iso laterale', convenzione: 'macchina', misura: MISURE.KG_TEMPO };
  const corto = performanceEsercizio([{ id: 'k1', peso: 40, ripetizioni: 10, stato: 'fatta' }], iso);
  const lungo = performanceEsercizio([{ id: 'k2', peso: 40, ripetizioni: 30, stato: 'fatta' }], iso);
  const pesante = performanceEsercizio([{ id: 'k3', peso: 60, ripetizioni: 10, stato: 'fatta' }], iso);
  assert.ok(lungo.migliore.punteggio > corto.migliore.punteggio, 'piu\' tempo conta');
  assert.ok(pesante.migliore.punteggio > corto.migliore.punteggio, 'piu\' kg conta');
});

test('20. un esercizio nuovo senza profilo ha comunque soglie', () => {
  const nuovo = { id: 'ex-nuovo-admin', nome: 'Esercizio nuovo', convenzione: 'macchina' };
  const p = profiloEsercizio(nuovo);
  assert.equal(p.soglie.length, RANK.length);
  assert.ok(p.soglie[3] > p.soglie[0]);
});

test('21. le soglie si possono scrivere a mano per un esercizio', () => {
  const p = profiloEsercizio(chest, { soglie: [1, 2, 3, 4, 5, 6, 7] });
  assert.deepEqual(p.soglie, [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(calcolaRank(6.5, p).rankId, 'titan');
});

test('22. soglieDaRiferimento cresce sempre e parte da zero', () => {
  const s = soglieDaRiferimento(100);
  assert.equal(s.length, RANK.length);
  for (let i = 1; i < s.length; i++) assert.ok(s[i] > s[i - 1]);
  assert.equal(soglieDaRiferimento(0), null);
  assert.equal(soglieDaRiferimento(-5), null);
});

test('23. lo storico dei miglioramenti tiene solo i passi in avanti', () => {
  const sedute = [
    { id: 's1', data: '2026-09-01', stato: 'completata' },
    { id: 's2', data: '2026-09-08', stato: 'completata' },
    { id: 's3', data: '2026-09-15', stato: 'completata' },
  ];
  const registrate = [
    { ...serie(30, 8), seduta_id: 's1', esercizio_id: chest.id },
    { ...serie(32, 8), seduta_id: 's2', esercizio_id: chest.id },
    { ...serie(31, 8), seduta_id: 's3', esercizio_id: chest.id },
  ];
  const tappe = storicoMiglioramenti(registrate, chest, sedute);
  assert.equal(tappe.length, 2, 'il terzo giorno e\' peggio: non e\' un miglioramento');
  assert.equal(tappe[0].miglioramento, false);
  assert.equal(tappe[1].miglioramento, true);
});

test('24. recordAccount e\' gia\' ordinato dal rank piu\' alto', () => {
  const catalogo = [
    chest,
    lateral,
    { id: 'ex-pull-ups', nome: 'Pull Ups', convenzione: 'assistenza' },
  ];
  // pesi realistici. ATTENZIONE ALLE UNITA': le alzate laterali sono al cavo con
  // doppia carrucola, quindi il numero che leggi e' il TOTALE sui due cavi e quello
  // che entra nel calcolo e' la meta'. Il test metteva 6 kg letti (= 3 per lato),
  // che col motore nuovo danno legittimamente "nessun Rank": l'ingresso di un
  // isolamento sulle spalle e' bassissimo (0,12x il corpo per lato = 7,9 kg), ma
  // 3 kg per lato non arrivano. Quindi qui si mettono 20 kg letti = 10 per lato,
  // che e' un numero che si vede davvero in palestra.
  const gruppi = [
    { esercizio_id: chest.id, serie: [{ id: 'a', peso: 50, ripetizioni: 8, stato: 'fatta' }] },
    { esercizio_id: lateral.id, serie: [{ id: 'b', peso: 20, ripetizioni: 15, stato: 'fatta' }] },
  ];
  const record = recordAccount(catalogo, gruppi, { pesoAttuale: 66 });
  assert.equal(record.length, 2);
  // e i due devono avere un Rank entrambi: un record senza Rank e' un caso
  // possibile (chi non ha ancora sbloccato il primo livello) e non deve far
  // esplodere niente, ma qui siamo nel caso normale
  assert.ok(record[0].rank && record[1].rank,
    'con questi pesi entrambi gli esercizi hanno un Rank');
  assert.equal(record[0].esercizio.id, chest.id);
  assert.ok(record[0].rank.indice > record[1].rank.indice);
  assert.equal(rankPrincipale(record).esercizio.id, chest.id);
  const d = distribuzioneRank(record);
  assert.equal(d.length, RANK.length);
  assert.equal(d.reduce((a, x) => a + x.numero, 0), 2,
    'e ogni esercizio con Rank conta una volta sola nella distribuzione');
});

test('24b. un esercizio senza Rank non fa esplodere nulla', () => {
  // Un record puo' stare sotto la prima soglia: e' il caso di chi si allena ma
  // non ha ancora sbloccato il BRONZE su quell'esercizio. Prima non succedeva
  // (il motore vecchio non restituiva mai Rank null) e un pezzo dell'app che legge
  // "record.rank.indice" andava in crash.
  //
  // Le alzate laterali con 6 kg letti sul cavo doppio sono 3 kg per lato, sotto
  // l'ingresso di 7,9: nessun Rank, e va benissimo.
  const catalogo = [
    chest,
    lateral,
  ];
  const gruppi = [
    { esercizio_id: chest.id, serie: [{ id: 'a', peso: 37, ripetizioni: 8, stato: 'fatta' }] },
    { esercizio_id: lateral.id, serie: [{ id: 'b', peso: 6, ripetizioni: 15, stato: 'fatta' }] },
  ];
  const record = recordAccount(catalogo, gruppi, { pesoAttuale: 66 });
  assert.equal(record.length, 2, 'entrambi i record ci sono');
  const senza = record.find((r) => r.esercizio.id === lateral.id);
  assert.equal(senza.rank, null, 'quello sulle alzate laterali non ha ancora un Rank');
  assert.equal(senza.sottoSoglia, true, 'e lo sa: e\' sotto la prima soglia');
  assert.ok(senza.ingresso > 0, 'e sa anche quanto gli serve');
  // il record senza Rank non deve contare nella distribuzione, e il rank principale
  // deve essere quello che ce l'ha
  const d = distribuzioneRank(record);
  assert.equal(d.reduce((a, x) => a + x.numero, 0), 1,
    'nella distribuzione conta solo l\'esercizio che ha un Rank');
  assert.equal(rankPrincipale(record).esercizio.id, chest.id,
    'e il Rank principale non e\' quello sotto soglia');
});
test('R10. la prossima divisione si chiama come la divisione giusta', () => {
  // Ste: non "per il PLATINUM mancano" quando sei a ORO 2, ma "per l'ORO 3 mancano"
  const p = profiloEsercizio(chest);
  const soglie = p.soglie;

  // meta' strada fra due soglie = LP 50, quindi sei gia' nella divisione 2
  // del bronzo (LP 34-66) e la successiva e' la 3 (la piu' alta del bronzo)
  const mezzo = (soglie[0] + soglie[1]) / 2;
  const r = calcolaRank(mezzo, p);
  assert.equal(r.rankId, RANK[0].id);
  assert.equal(r.divisione.nome, 'II', 'a meta\' strada sei nella divisione 2');
  assert.ok(r.prossimoObiettivo, 'deve dire qual e\' il prossimo obiettivo');
  assert.equal(r.prossimoObiettivo.etichetta, `${RANK[0].nome} III`, 'quindi il prossimo e\' bronze 3');
  assert.ok(r.prossimoObiettivo.solaDivisione, 'e\' una divisione, non un altro rank');

  // il numero del prossimo obiettivo deve essere proprio la soglia della divisione
  // che dice (Ste: "54 kg per bronze 1" quando la soglia giusta era un'altra)
  const attesa = soglie[0] + (soglie[1] - soglie[0]) * (67 / 100);
  assert.ok(Math.abs(r.prossimoObiettivo.punteggio - attesa) < 1e-6,
    'la soglia di bronze 3 deve stare a 67/100 fra bronze e silver, non a '
    + r.prossimoObiettivo.punteggio);

  // in cima al rank (LP 90+) la divisione 3 e' finita: si passa al rank dopo,
  // che si riparte dalla divisione 1, la piu' bassa
  const quasiFine = soglie[1] - 1e-6;
  const r2 = calcolaRank(quasiFine, p);
  assert.equal(r2.rankId, RANK[0].id, 'sei ancora bronze, alla fine');
  assert.equal(r2.prossimoObiettivo.etichetta, `${RANK[1].nome} I`, 'a fine bronze si va a silver 1');
  assert.equal(r2.prossimoObiettivo.solaDivisione, false);

  // nell'ultimo rank non si inventa un obiettivo
  const alto = soglie[soglie.length - 1] * 5;
  assert.equal(calcolaRank(alto, p).prossimoObiettivo, null, 'sopra tutto non c\'e\' un prossimo pezzo');
});

test('R11. la scala parte easy e il platino resta un traguardo', () => {
  // Ste: "con la chest press 35 kg x 8 mi sembra poco argento 3, o no?"
  // Aveva ragione: la scala era troppo ripida all'inizio. I gradini bassi
  // sono vicini fra loro (e si entra in bronzo presto), il platino resta
  // lontano e non e' una medaglia che arriva in una settimana.
  const s = soglieDaRiferimento(100); // riferimento 100 = platino

  // si entra in bronzo presto: non deve restare tutto grigio
  assert.ok(s[0] <= 52, 'il bronzo si prende presto, trovato ' + s[0]);
  // l'argento e' il salto vero, e ci si arriva con una serie normale
  assert.ok(s[1] >= 70 && s[1] <= 74, 'l\'argento sta intorno al 72%, trovato ' + s[1]);
  // l'oro e' impegnativo
  assert.ok(s[2] >= 86 && s[2] <= 90, 'l\'oro sta intorno all\'88%, trovato ' + s[2]);
  // il platino resta il 100%: e' il traguardo, non una formalita'
  assert.equal(s[3], 100, 'il platino coincide con il riferimento');
  // sopra il platino continua a salire
  assert.ok(s[4] > 100 && s[6] > s[5], 'sopra il platino la scala cresce ancora');

  // la scalinata sale sempre e i gradini non si appiattiscono troppo
  for (let i = 1; i < s.length; i++) {
    assert.ok(s[i] > s[i - 1], 'la soglia ' + i + ' sale rispetto alla precedente');
  }
});

test('R12. una 35 kg x 8 alla chest press porta all\'oro', () => {
  // Il caso concreto che Ste ha citato: 66 kg di persona (le ha dette lui),
  // chest press 35 kg x 8 per lato.
  //
  // Prima questo test aspettava l'ARGENTO divisione 3, e passava. Ma il
  // riferimento di allora era 42.43, che e' un numero troppo basso per una chest
  // press a macchina: il suo massimale di 44.33 lo superava appena e sembrava
  // "quasi argento" per un soffio. Ricalibrata la scala, il riferimento e' 47.14
  // e il suo 44.33 sta al 94%: ORO.
  //
  // Il numero e' salito perche' il riferimento e' salito, non perche' il rank si
  // e' alzato da solo. E il riferimento e' salito perche' ora dice una cosa
  // precisa: quanto sposta una persona forte su QUEL esercizio con QUEL peso.
  const p = profiloPerPesoCorporeo(profiloEsercizio(chest), 66);
  const q = calcolaRank(stimaMassimo(35, 8), p);
  assert.equal(q.rankId, 'gold', 'deve essere oro, trovato ' + q.rankId);
});

test('R14. lista Rank e pagina esercizio dicono la stessa cosa', async () => {
  // Bug trovato provando l'app: la lista dei Rank NON passava il peso corporeo,
  // quindi usava soglie diverse dalla pagina dell'esercizio e due schermate
  // dicevano due rank diversi sullo stesso record.
  const { statoAccount } = await import('../src/gioco.js');
  const esercizi = [chest];
  const sedute = [{ id: 's1', data: '2026-10-04', stato: 'completata', eliminata: false }];
  const unaSerie = { ...serie(35, 8), seduta_id: 's1', esercizio_id: chest.id };

  const senza = statoAccount({ account: 'io', sedute, serie: [unaSerie], esercizi, oggi: '2026-10-04' });
  const con = statoAccount({ account: 'io', sedute, serie: [unaSerie], esercizi, oggi: '2026-10-04', pesoCorporeo: 66 });

  const a = senza.record[0];
  const b = con.record[0];
  assert.ok(a && b, 'devono esserci record in entrambi i casi');
  // Il Rank e' cambiato due volte l'08/10/2026: prima col motore nuovo (la chest
  // press 35 kg x 8 su corpo 66 dava SILVER), e poi quando Ste ha chiesto gli
  // ingressi piu' bassi del 15% ("come faccio a non essere manco bronzo?"), per cui
  // la stessa prestazione e' salita a GOLD.
  //
  // Il NOME non e' il punto di questo test: il punto e' che la lista dei Rank e la
  // pagina dell'esercizio dicano la STESSA cosa (riga sotto). Scrivere qui il
  // numero di oggi serve solo a documentarlo; se un domani gli ingressi si
  // muovono ancora, il test da' un rosso che non vuol dire che il bug e' tornato.
  assert.equal(b.rankId, 'gold', `col peso la chest press 35x8 e' gold (ingressi abbassati del 15%), trovato ${b.rankId}`);
  // il punto del test, che e' quello vero: senza il peso la scala e\' un\'altra, e
  // quindi i due non possono coincidere. E' il motivo per cui il peso va passato
  // ovunque: due schermate non possono dare due Rank diversi sullo stesso record.
  assert.notEqual(b.sogliaSuccessiva, a.sogliaSuccessiva,
    'senza peso le soglie sono diverse: e\' il bug che aveva fatto due risposte diverse');
  assert.equal(b.prossimoObiettivo.punteggio > 0, true, 'il numero del prossimo obiettivo c\'e\'');
});

test('R15. il giudizio "quanto ho fatto" tiene conto del livello', async () => {
  const { giudizioPerformance } = await import('../src/rank.js');
  const laterale = { id: 'ex-db-lateral-raise', nome: 'Dumbbell Lateral Raise', convenzione: 'per_manubrio' };
  const iso = profiloPerPesoCorporeo(profiloEsercizio(laterale), 66);

  // lo stesso numero su un isolamento e' "tanto", su un grande e' "poco"
  const numero = 12;
  const suIso = giudizioPerformance(iso, numero);
  assert.ok(['tanto', 'molto', 'discreto'].includes(suIso.giudizio),
    'sull\'isolamento 12 dev\'essere gia\' tanto, trovato ' + suIso.giudizio);
  assert.match(suIso.frase, /isolamento/, 'e la frase lo dice, cosi\' non sembra uno scontro');

  const legPress = { id: 'ex-sled-press-calf-raise', nome: 'Sled Press', convenzione: 'dischi' };
  const suGrande = giudizioPerformance(profiloPerPesoCorporeo(profiloEsercizio(legPress), 66), numero);
  assert.ok(['poco', 'sotto'].includes(suGrande.giudizio),
    'sul leg press 12 non significa niente, trovato ' + suGrande.giudizio);

  // nessuna prestazione: non giudica nulla di inventato
  const vuoto = giudizioPerformance(iso, null);
  assert.equal(vuoto.valido, false);
  assert.equal(vuoto.giudizio, null);
});

test('R17. nessun rank chiede numeri fuori scala umana', async () => {
  // Ste: "per essere olympian 110 kg? manco Ronnie Coleman riuscirebbe, devi
  // renderla realistica". Prima l'olympian valeva 1.9 volte il platino.
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  for (const e of ESERCIZI) {
    for (const peso of [55, 66, 80, 100]) {
      const p = profiloPerPesoCorporeo(profiloEsercizio(e), peso);
      if (!MOLTIPLICATORI_SOGLIA.length) continue;
      const alto = p.soglie[p.soglie.length - 1];
      if (!alto) continue;
      // nessun rank puo' valere piu' di 2.2 volte il peso della persona
      assert.ok(alto / peso <= 2.25,
        e.nome + ' a ' + peso + ' kg chiede un rank alto troppo (' + Math.round(alto / peso * 100) / 100 + 'x il peso)');
      // e la scala deve salire sempre: un tetto troppo stretto l'aveva resa rotta
      for (let i = 1; i < p.soglie.length; i++) {
        assert.ok(p.soglie[i] > p.soglie[i - 1],
          e.nome + ' a ' + peso + ' kg: il gradino ' + i + ' non sale (' + p.soglie.join('/') + ')');
      }
    }
  }
});

test('R18. sopra il platino i gradini sono vicini, non sparati', () => {
  const s = soglieDaRiferimento(100);
  // il platino e' il 100, e l'olympian non deve essere il doppio: prima era
  // 1.9 volte e servivano numeri assurdi
  assert.ok(s[6] <= 140, 'l\'olympian non deve superare il 140% del platino, trovato ' + s[6]);
  // e nessun gradino alto vale piu' di un quarto del platino
  for (let i = 4; i < s.length; i++) {
    assert.ok(s[i] - s[i - 1] <= 25, 'il gradino ' + i + ' non deve essere un salto');
  }
});

test('R20. sul rank piu\' alto gli LP sono la percentuale sopra la soglia', () => {
  // Ste (06/10/2026): "con 3 serie sei al massimo del tuo range e il passo dopo e'
  // lontanissimo. Non e' un errore, ma un segnale che la scala di quell'esercizio
  // e' stretta".
  //
  // Sul suo Dumbbell Bench Pull la barra era piena e scriveva "3 LP": sembrava una
  // progressione quasi finita dentro un rango. Ma sopra l'OLYMPIAN non c'e' nessun
  // rango: li' gli LP crescono senza tetto e valgono una cosa sola, quanto sei
  // sopra la soglia in percentuale. E' quello che devono dire, anche all'interfaccia.
  const p = profiloPerPesoCorporeo(profiloEsercizio(lateral), 66);
  const sogliaTop = p.soglie[p.soglie.length - 1];

  const appena = calcolaRank(sogliaTop + 0.01, p);
  assert.equal(appena.rankId, 'olympian', 'e\' sul rank piu\' alto');
  assert.equal(appena.inTop, true);
  assert.equal(appena.prossimoRank, null, 'e non c\'e\' nessun passo dopo');
  assert.equal(appena.prossimoObiettivo, null, 'quindi nessun obiettivo da inseguire');
  assert.equal(appena.sogliaSuccessiva, null);
  assert.ok(appena.lp <= 1, 'un passo sopra la soglia sono 0-1 LP: ' + appena.lp);

  // la regola e' una sola e vale sempre: LP = quanto sei sopra la soglia, per 100
  for (const sopra of [1, 5, 23, 100]) {
    const r = calcolaRank(sogliaTop * (1 + sopra / 100), p);
    assert.equal(r.rankId, 'olympian');
    assert.ok(Math.abs(r.lp - sopra) <= 1,
      `a +${sopra}% sopra la soglia gli LP sono ${sopra}, trovati ${r.lp}`);
  }

  // e sotto non cambiano: li' gli LP sono la posizione DENTRO il rango, 0-99
  const dentro = calcolaRank(sogliaTop * 0.5, p);
  assert.notEqual(dentro.rankId, 'olympian');
  assert.ok(dentro.lp >= 0 && dentro.lp <= 99, 'dentro il.rank gli LP stanno fra 0 e 99');
});

test('R21. la distanza alla soglia si scrive in percentuale, non in kg', () => {
  // Ste (06/10/2026): "la colonna 'manca alla prossima' mente... se il tuo peso
  // corporeo passa da 66 a 68 kg la Chest Press ti passa da OLYMPIAN a TITAN... quel
  // numero e la soglia vengono DALLO STESSO calcolo... quindi 'manca 0,15 kg' e' una
  // precisione che non esiste".
  //
  // Verificato, e il fondo e' anche piu' netto: sulla Chest Press a 66 kg gli mancano
  // 0,15 kg al PLATINUM, ma a 65,79 kg di corpo la raggiunge e a 65 kg e' gia'
  // PLATINUM III. Il suo punteggio non cambia mai: e' la soglia che si sposta col
  // peso corporeo. Un "0,15 kg" e' quindi piu' piccolo dell'incertezza dello stesso
  // numero che lo produce.
  const p = profiloPerPesoCorporeo(profiloEsercizio(chest), 66);
  const obiettivo = calcolaRank(46.99, p).prossimoObiettivo;
  const distanza = distanzaAllaSoglia(46.99, obiettivo.punteggio);

  assert.ok(distanza, 'la distanza si calcola');
  assert.equal(distanza.percentuale, 0.3,
    '0,15 kg su 47,14 sono 0,3%: si scrive la percentuale, non i kg');
  assert.equal(distanza.inGioco, true, 'e si sa che il passo e\' ancora da fare');

  // il caso peggiore: sul suo Cable Fly la distanza era 0,14 kg, cioe' 0,6%
  const lateraleR = profiloPerPesoCorporeo(profiloEsercizio(lateral), 66);
  const l = distanzaAllaSoglia(16.35, calcolaRank(16.35, lateraleR).prossimoObiettivo.punteggio);
  assert.equal(l.percentuale, 1.2);

  // e non si puo' scrivere una distanza in kg neanche per sbaglio: la funzione
  // restituisce solo una percentuale, e di una cifra sola
  assert.deepEqual(Object.keys(distanza).sort(), ['inGioco', 'percentuale', 'piccolo']);
  assert.equal(distanza.kg, undefined, 'nessun numero in kg: non deve esistere');

  // sotto l'1% non si scrive "0,04%": si dice che manca pochissimo
  const minuscolo = distanzaAllaSoglia(46.99, 46.99 * 1.0004);
  assert.equal(minuscolo.percentuale, 0, 'arrotonda a zero');
  assert.equal(minuscolo.piccolo, true, 'ma si sa che manca qualcosa');
  assert.equal(distanzaAllaSoglia(46.99, 46.99).piccolo, false, 'se e\' zero, non manca niente');

  // casi che non hanno distanza: niente numero inventato
  assert.equal(distanzaAllaSoglia(null, 10), null);
  assert.equal(distanzaAllaSoglia(10, null), null);
  assert.equal(distanzaAllaSoglia(0, 10), null);
  assert.equal(distanzaAllaSoglia(10, 0), null);
  assert.equal(distanzaAllaSoglia('abc', 'def'), null);

  // e la soglia si sposta davvero col peso: e' la prova che il punto due di Ste
  // regge, quindi la percentuale e' l'unico numero onesto da mostrare
  const basso = profiloPerPesoCorporeo(profiloEsercizio(chest), 65);
  const alto = profiloPerPesoCorporeo(profiloEsercizio(chest), 68);
  assert.ok(alto.soglie[3] > basso.soglie[3], 'chi pesa di piu\' ha la soglia piu\' alta');
  assert.equal(calcolaRank(46.99, basso).rankId, 'platinum', 'a 65 kg lo stesso punteggio e\' platino');
  assert.equal(calcolaRank(46.99, p).rankId, 'gold', 'a 66 kg lo stesso punteggio e\' oro');
});

test('R19. la scala si adatta al tipo di esercizio', () => {
  // Ste: "i rank per ogni esercizio devono adattarsi al tipo di esercizio,
  // se e' difficile, facile, medio. Tipo alzate laterali e' difficile quindi
  // anche un carico basso puo' essere tanto".
  const laterale = { id: 'ex-db-lateral-raise', nome: 'Dumbbell Lateral Raise', convenzione: 'per_manubrio' };
  const legPress = { id: 'ex-sled-press-calf-raise', nome: 'Sled Press', convenzione: 'dischi' };

  const iso = profiloPerPesoCorporeo(profiloEsercizio(laterale), 66);
  const grande = profiloPerPesoCorporeo(profiloEsercizio(legPress), 66);

  // stesso peso, ma il platino di un isolamento e' molto piu' basso
  assert.ok(iso.riferimento * 5 < grande.riferimento,
    'sull\'isolamento il platino deve essere molto piu\' basso: '
    + iso.riferimento + ' contro ' + grande.riferimento);

  assert.equal(iso.livello, 'isolamento');
  assert.equal(grande.livello, 'grande');

  // e questo e' il punto: sulle alzate laterali un numero basso e' gia' tanto
  const basso = stimaMassimo(8, 15); // ~12 kg di massimale
  assert.ok(basso >= iso.soglie[0], '8 kg x 15 sulle laterali e\' almeno bronzo');
  // Verificato con la scala ricalibrata: 8 kg x 15 fanno 12 kg di massimale su
  // un riferimento di 12.26, quindi IL 98%: e' una prestazione forte, e su un
  // deltoide laterale lo e' davvero. Prima questo test pretendeva il contrario,
  // ma era scritto quando il riferimento era un numero diverso.
  //
  // Il confronto che conta e' un altro: lo STESSO massimale vale su un
  // isolamento e non vale niente su un movimento pesante.
  assert.ok(basso > iso.soglie[2],
    'sulle laterali 8 kg x 15 sono una prestazione forte: ' + basso);
  assert.ok(basso < grande.soglie[0],
    'ma sul leg press gli stessi 8 kg non valgono niente: ' + basso);
  // sul leg press invece 8 kg non significano niente
  assert.ok(basso < grande.soglie[0], '8 kg sul leg press non valgono niente');
});
