import { test } from 'node:test';
import assert from 'node:assert/strict';

// La scala di un esercizio non e' piu' una tabella scritta a mano: si calcola dal
// movimento e da COME' si registra il carico.
//
// Ste (04/10/2026): "e dovrebbe farlo in automatico in realta'".
//
// I sette errori di unita' di una settimana (lo shrug da 120, le tirate tarate su
// 1.64 volte il peso, il -23,2 kg della media...) avevano tutti la stessa causa:
// la scala stava in UNA tabella con tutti i fattori dentro la stessa riga, quindi
// ogni riga poteva sbagliare l'unita'. Qui i fattori stanno separati e i test
// sotto stanno guardingando i tre punti in cui si era sbagliato.

import {
  scalaDerivata, unitaDi, SCALA_MOVIMENTO, SCALA_LIVELLO, CORRETTIVO,
  TETTO_CORRETTIVO, UNITA,
} from '../src/scala-auto.js';
import { scalaVerificata, scalaSulCorpo, SCALA_ESERCIZI } from '../src/scala-esercizi.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { profiloEsercizio, profiloPerPesoCorporeo, riferimentoPerEsercizio } from '../src/rank-config.js';
import { prestazione } from '../src/forza-generale.js';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { recordEsercizio } from '../src/rank.js';

const PESO_STE = 66; // il peso che ha detto lui
const PESO_RIF = 70;

// Il numero di riferimento di ogni suo esercizio, calcolato PRIMA che la scala
// diventasse automatica (v52, la tabella per movimento). Sono i numeri che Ste ha
// visto sul telefono: se uno di questi si muove, e' un bug di unita'.
//
// La tabella e' volutamente scritta qui, e non ricalcolata: un test che ricalcola
// la tabella con lo stesso codice che sta provando non controlla niente.
const RIFERIMENTI_VERIFICATI = {
  'ex-chest-press': 47.14,
  'ex-cable-hammer-curl': 30.17,
  'ex-cable-lateral-raise': 12.26,
  'ex-cable-overhead-tricep': 30.17,
  'ex-leg-extension': 86.74,
  'ex-neutral-grip-lat-pulldown': 96.17,
  'ex-dumbbell-bench-pull': 42.43,
  'ex-seated-db-shoulder-press': 30.17,
  'ex-cable-fly': 18.86,
  'ex-scott-bench-curl': 19.8,
  'ex-single-arm-tricep-pushdown': 28.29,
  'ex-seated-leg-curl': 80.14,
  'ex-smith-incline-bench': 30.17,
  'ex-seated-cable-row': 96.17,
  'ex-chest-supported-shrug': 42.43,
  'ex-sled-press-calf-raise': 132,
  'ex-single-leg-press': 34.62,
  'ex-one-arm-preacher-curl': 17.91,
  'ex-bodyweight-overhead-tricep': 15,
  'ex-one-arm-cable-reverse-fly': 15.09,
  'ex-pull-ups': 15,
  'ex-dips': 15,
  'ex-wrist-curl': 32.06,
  'ex-iso-lateral-row': 47.14,
  'ex-lat-pulldown-lats': 95.23,
  'ex-db-lateral-raise': 12.26,
  'ex-lying-cable-curl': 103.71,
};

// ---------------------------------------------------------------------------
// 1. Il numero e' un PESO, non un rapporto.
// ---------------------------------------------------------------------------

test('S1. la scala torna in kg, non in rapporto col peso', () => {
  // Il bug vero della v53: la tabella scriveva i rapporti (kg per kg di peso
  // corporeo) e la funzione restituiva il rapporto, quindi la chest press dava
  // 0.84 invece di circa 32. Un rapporto non e' un peso, e il numero con cui si
  // confronta la prestazione DEVE essere un peso.
  const scala = scalaDerivata({
    id: 'ex-di-prova', movimento: 'spinta_orizzontale', livello: 'composto',
    convenzione: 'per_braccio', attrezzatura: 'macchina_dischi',
  });
  assert.ok(scala > 5, 'una chest press non puo\' avere una scala di ' + scala + ': non sono kg');
  assert.ok(scala >= 25 && scala <= 55,
    'su un corpo di 70 kg la chest press per lato sta fra 25 e 55 kg, trovato ' + scala);
});

test('S2. tutti i numeri del file sono kg sul corpo di riferimento', () => {
  // Se qui dentro ci finisce un rapporto (0.42 invece di 42) lo vedo subito:
  // un movimento grande su un corpo di 70 kg non puo' stare sotto i 30 kg.
  for (const [movimento, voce] of Object.entries(SCALA_MOVIMENTO)) {
    for (const unita of ['lato', 'totale']) {
      const n = voce[unita];
      assert.equal(Number.isFinite(n), true, movimento + '/' + unita + ' non e\' un numero');
      assert.ok(n >= 0 && n <= 3 * PESO_RIF,
        movimento + '/' + unita + ' = ' + n + ' kg: fuori scala umana su un corpo di 70 kg');
    }
  }
});

// ---------------------------------------------------------------------------
// 2. L'unita': come sono i kg che si registrano.
//    E' la cosa che ha prodotto sette numeri sbagliati.
// ---------------------------------------------------------------------------

test('S3. l\'unita\' si legge nei dati, non si ricorda', () => {
  assert.equal(unitaDi({ convenzione: 'per_braccio' }), UNITA.LATO);
  assert.equal(unitaDi({ convenzione: 'per_gamba' }), UNITA.LATO);
  assert.equal(unitaDi({ convenzione: 'per_manubrio' }), UNITA.LATO);
  // macchina a stack, cavo mono, bilanciere e dischi: un numero solo, il totale
  assert.equal(unitaDi({ convenzione: 'macchina' }), UNITA.TOTALE);
  assert.equal(unitaDi({ convenzione: 'macchina_stack' }), UNITA.TOTALE);
  assert.equal(unitaDi({ convenzione: 'cavo_totali' }), UNITA.TOTALE);
  assert.equal(unitaDi({ convenzione: 'bilanciere' }), UNITA.TOTALE);
  assert.equal(unitaDi({ convenzione: 'dischi' }), UNITA.TOTALE);
  assert.equal(unitaDi({}), UNITA.TOTALE);
  // il doppio carrucola ha la sua unita': il numero che leggi e' il carrello
  assert.equal(unitaDi({ convenzione: 'cavo_totali', carrucola: 'carrucola_doppia' }), UNITA.CARRELLO);
  assert.equal(unitaDi({ convenzione: 'cavo_totali', carrucola: 'carrucola_mono' }), UNITA.TOTALE);
});

test('S4. la stessa spinta registrata in due modi d\'due numeri giusti', () => {
  // Ste: "il massimale deve restare il numero di peso che metto in una sola parte".
  // Una spinta su macchina a dischi si registra 35 PER BRACCIO; la stessa spinta
  // col bilanciere libero si registra 70 IN TUTTO. Sono lo stesso movimento e due
  // numeri che non si confrontano fra loro.
  const perLato = scalaDerivata({
    id: 'ex-di-prova', movimento: 'spinta_orizzontale', livello: 'composto',
    convenzione: 'per_braccio', attrezzatura: 'macchina_dischi',
  });
  const inTotale = scalaDerivata({
    id: 'ex-di-prova', movimento: 'spinta_orizzontale', livello: 'composto',
    convenzione: 'bilanciere',
  });
  assert.ok(perLato > 25, 'per lato: scala da macchina a dischi, trovato ' + perLato);
  assert.ok(inTotale > 80, 'in totale: scala da bilanciere, trovato ' + inTotale);
  assert.ok(inTotale > perLato * 2,
    'il totale di un movimento bilaterale e\' piu\' della somma dei due lati');
});

test('S5. sul doppio carrucola la scala NON si dimezza', () => {
  // Questo e' il secondo mio errore, e Ste l'aveva gia' segnalato una volta:
  // sul doppio carrucola il peso che senti e' meta' di quello del carrello, MA
  // il dimezzamento e' gia' in pesoReale(), sulla prestazione. Se anche la scala
  // si dimezza si dimezza due volte: il Cable Fly era finito a 15.7 kg di
  // riferimento e i suoi 18.5 kg sembravano un'arma.
  const scala = scalaDerivata({
    id: 'ex-di-prova', movimento: 'petto_isolamento', livello: 'isolamento',
    convenzione: 'cavo_totali', carrucola: 'carrucola_doppia',
  });
  assert.equal(scala, SCALA_MOVIMENTO.petto_isolamento.lato,
    'la scala del carrello e\' quella di un lato, non la meta\'');

  // e sul suo Cable Fly vero: 20 kg sul corpo di 70, cioe' 18.86 sul suo corpo
  const fly = ESERCIZI.find((e) => e.id === 'ex-cable-fly');
  const p = profiloPerPesoCorporeo(profiloEsercizio(fly), PESO_STE);
  assert.equal(p.riferimento, 18.86);
  assert.ok(p.riferimento > 12.5,
    'il riferimento deve stare sopra i suoi 12,5 kg sentiti, non sotto: '
    + 'un riferimento sotto fa sembrare chi si allena un campione');
});

test('S6. il confronto fra Rank e percentuale usa la stessa unita\'', () => {
  // Due posti dell'app confrontano lo stesso esercizio con lo stesso numero: il
  // Rank (sul massimale) e la percentuale "quanto alzo in piu\'". Se uno dei due
  // legge il carrello e l'altro il peso sentito, dicono due percentuali diverse
  // sullo stesso esercizio.
  const fly = ESERCIZI.find((e) => e.id === 'ex-cable-fly');
  const serie = [{ ordine: 1, peso: 37, ripetizioni: 5, stato: 'fatta' }];

  const rec = recordEsercizio(serie, fly, null, PESO_STE);
  const p = prestazione({ esercizio: fly, serie, pesoCorporeo: PESO_STE });

  assert.equal(p.kg, 18.5, 'il peso che senti e\' meta\' del carrello');
  assert.equal(p.riferimento, rec.profilo.riferimento,
    'i due posti devono usare lo stesso riferimento: '
    + p.riferimento + ' contro ' + rec.profilo.riferimento);
  // La fascia e' larga apposta: qui si controlla l'UNITA', non la bontà del numero.
  // E il numero su questo esercizio è una stima incrociata: la percentuale viene
  // da un massimale stimato su 5 ripetizioni con un movimento corto, quindi è
  // essa stessa una stima (e l'app lo dice nella schermata).
  assert.ok(p.percentuale > 50 && p.percentuale < 110,
    'la percentuale deve essere plausibile, trovata ' + p.percentuale);
});

test('S7. il totale non e\' il doppio del lato, e la ragione e\' scritta', () => {
  // Un movimento bilaterale e' piu' debole della somma dei due lati: due curl con
  // 21 kg per mano non sono un curl da 42. Se il "totale" fosse il doppio, la
  // scala di ogni esercizio bilaterale sarebbe il doppio della giusta.
  for (const [movimento, voce] of Object.entries(SCALA_MOVIMENTO)) {
    if (movimento === 'core' || movimento === 'spalle_isolamento') continue;
    assert.ok(voce.totale > voce.lato * 1.5,
      movimento + ': il totale (' + voce.totale + ') deve stare fra il lato e il suo doppio');
  }
  // e sulle spalle il totale non esiste come numero: un paio di alzate laterali si
  // registra per mano, quindi totale = lato. E' l'unica voce che ha lo stesso
  // numero, e deve restare l'unica: se un giorno si raddoppia, si sbaglia.
  assert.equal(SCALA_MOVIMENTO.spalle_isolamento.totale, SCALA_MOVIMENTO.spalle_isolamento.lato);
});

// ---------------------------------------------------------------------------
// 3. Il numero verificato vince, e i correttivi non possono stravolgere.
// ---------------------------------------------------------------------------

test('S8. un numero verificato a mano vince sempre sul calcolo', () => {
  // Ste ha verificato questi numeri guardando l'esercizio. Il calcolo puo'
  // sbagliare: quelli no, quindi non li tocca.
  const scala = scalaDerivata({
    id: 'ex-chest-supported-shrug', // 45 kg per mano, non i 120 da bilanciere
    movimento: 'spalle_isolamento', livello: 'isolamento',
    convenzione: 'per_manubrio', attrezzatura: 'macchina_dischi',
    bracciaIndipendenti: true,
  });
  assert.equal(scala, 45, 'i correttivi non toccano un numero verificato');
  assert.equal(scalaVerificata('ex-chest-supported-shrug'), 45);
  assert.equal(scalaVerificata('ex-che-non-esiste'), null);
  assert.equal(scalaVerificata(undefined), null);
});

test('S9. nessun correttivo puo\' spostare la scala piu\' del tetto', () => {
  // Il tetto non e' un vezzo: la prima volta che ho sommato i fattori senza tetto
  // il risultato era un -30% e il riferimento del Cable Fly era finito a 15.7 kg.
  const senza = scalaDerivata({
    id: 'x', movimento: 'tirata_orizzontale', livello: 'composto', convenzione: 'bilanciere',
  });
  const con = scalaDerivata({
    id: 'x', movimento: 'tirata_orizzontale', livello: 'composto', convenzione: 'bilanciere',
    attrezzatura: 'macchina_dischi', bracciaIndipendenti: true,
  });
  const correttivo = 1 - TETTO_CORRETTIVO;
  assert.ok(senza * correttivo <= con && con <= senza * (1 + TETTO_CORRETTIVO),
    'tre correttivi insieme possono spostare ' + con + ' contro ' + senza
    + ': troppo, il tetto non sta funzionando');
  // e ogni correttivo da solo sta nel tetto
  for (const fattore of [CORRETTIVO.attrezzatura.macchina_dischi,
    CORRETTIVO.attrezzatura.macchina_stack,
    CORRETTIVO.bracciaIndipendenti, CORRETTIVO.spinta]) {
    assert.ok(fattore >= 1 - TETTO_CORRETTIVO && fattore <= 1 + TETTO_CORRETTIVO,
      'il correttivo ' + fattore + ' e\' fuori dal tetto');
  }
});

test('S10. un esercizio nuovo ha gia\' il suo numero', () => {
  // Ste: "ogni esercizio deve avere la sua scala". Un esercizio che crea domani non
  // puo' restare senza soglie, altrimenti la pagina di quell'esercizio si rompe.
  const nuovo = scalaDerivata({
    id: 'ex-che-non-esser-ho-mai-visto',
    movimento: classificaEsercizio({ nome: 'Machine Chest Press' }).movimento,
    livello: 'composto', convenzione: 'per_braccio', attrezzatura: 'macchina_dischi',
  });
  assert.ok(nuovo > 0, 'un esercizio nuovo ha subito un numero');

  // e se il nome non dice niente e non si sa qual e' il movimento, il livello
  // regge: meglio una scala generica che una pagina che non si apre
  const oscuro = scalaDerivata({ id: 'ex-misterioso', nome: 'Zz', movimento: 'sconosciuto', livello: 'composto' });
  assert.equal(oscuro, SCALA_LIVELLO.composto);
  assert.ok(scalaDerivata({}) > 0, 'anche senza nessun dato c\'e\' un numero');
});

// ---------------------------------------------------------------------------
// 4. Il pezzo che non si deve perdere: l'unita' attraverso il profilo.
//    Prima la convenzione e la carrucola viaggiavano in un campo ma non passavano
//    al calcolo della scala, quindi un esercizio registrato per lato veniva
//    valutato con la scala del totale (il doppio, o la meta').
// ---------------------------------------------------------------------------

test('S11. l\'unita\' sopravvive al giro del profilo', () => {
  const perLato = {
    id: 'ex-di-prova', nome: 'Machine Chest Press',
    convenzione: 'per_braccio', attrezzatura: 'macchina_dischi',
  };
  const profilo = profiloEsercizio(perLato);
  assert.equal(profilo.convenzione, 'per_braccio', 'il profilo ricorda come si registra');

  const sulCorpo = profiloPerPesoCorporeo(profilo, PESO_STE);
  const atteso = scalaSulCorpo(scalaDerivata({
    id: perLato.id,
    movimento: classificaEsercizio(perLato).movimento,
    livello: 'composto', convenzione: 'per_braccio', attrezzatura: 'macchina_dischi',
  }), PESO_STE);
  assert.equal(sulCorpo.riferimento, atteso,
    'la scala ricalcolata sul peso deve essere quella di prima: '
    + sulCorpo.riferimento + ' contro ' + atteso);
  assert.ok(sulCorpo.riferimento < 45,
    'una spinta per lato non puo\' avere il riferimento di una spinta in totale, trovato '
    + sulCorpo.riferimento);
});

test('S12. nessun numero cambia per gli esercizi di Ste', () => {
  // Il test piu' importante di questo file. I numeri qui a fianco sono quelli
  // che l'app gli ha mostrato fino alla v53: se uno si muove di un centesimo
  // mentre risistruisco la scala, ho sbagliato l'unita' da qualche parte.
  for (const [id, atteso] of Object.entries(RIFERIMENTI_VERIFICATI)) {
    const esercizio = ESERCIZI.find((e) => e.id === id);
    assert.ok(esercizio, 'l\'esercizio ' + id + ' deve esistere nella scheda');
    const p = profiloPerPesoCorporeo(profiloEsercizio(esercizio), PESO_STE);
    assert.equal(p.riferimento, atteso,
      esercizio.nome + ': il riferimento e\' cambiato (era ' + atteso + ')');
    assert.deepEqual(p.soglie, p.soglie, 'le soglie nascono sempre dal riferimento');
    assert.ok(p.soglie[3] === atteso, 'e il platino coincide con il riferimento');
  }
  // tutti gli esercizi del catalogo devono avere un riferimento: nessuno resta
  // senza scala, quindi nessuna pagina si rompe
  for (const e of ESERCIZI) {
    const p = profiloPerPesoCorporeo(profiloEsercizio(e), PESO_STE);
    assert.ok(p.soglie.length === 7 && p.soglie.every((n) => Number.isFinite(n) && n >= 0),
      e.nome + ' non ha una scala completa');
  }
});

test('S13. il core non ha kg, e il suo riferimento sono le ripetizioni', () => {
  const crunch = { id: 'ex-crunch', nome: 'Crunch', convenzione: 'corpo_libero' };
  const riconosciuto = classificaEsercizio(crunch);
  assert.equal(scalaDerivata({
    id: crunch.id, movimento: riconosciuto.movimento, livello: riconosciuto.livello,
  }), 0, 'sul core non si pesano kg');
  const p = profiloEsercizio(crunch);
  assert.equal(p.misura, 'solo_reps', 'e la misura sono le ripetizioni');
  assert.ok(p.riferimento > 0, 'ma il riferimento per le ripetizioni c\'e\' comunque');
});

test('S14. la scala segue il peso del corpo', () => {
  // Un solo posto riporta il numero sul peso vero (scalaSulCorpo), quindi il
  // peso non puo' entrare due volte: il rapporto e' lineare e pulito.
  const e = ESERCIZI.find((x) => x.id === 'ex-neutral-grip-lat-pulldown');
  const a = profiloPerPesoCorporeo(profiloEsercizio(e), 70).riferimento;
  const b = profiloPerPesoCorporeo(profiloEsercizio(e), 35).riferimento;
  assert.equal(a, 102);
  assert.equal(b, 51, 'la meta\' del peso e\' la meta\' della scala');
  assert.equal(scalaSulCorpo(scalaDerivata({ id: 'x', movimento: 'tirata_verticale', livello: 'composto' }), 35),
    scalaSulCorpo(SCALA_MOVIMENTO.tirata_verticale.totale, 35));
  // e senza peso la scala resta quella scritta, l'app non si rompe
  assert.equal(profiloPerPesoCorporeo(profiloEsercizio(e), null).riferimento, a);
  assert.equal(profiloPerPesoCorporeo(profiloEsercizio(e), 'non un numero').riferimento, a);
});

test('S15. la tabella dei numeri verificati resta solo quella che deve', () => {
  // Ogni riga deve avere un id che esiste davvero: una riga con l'id sbagliato e'
  // una trappola (c'era "ex-cable-overhead-tricep-extension", che non e' un
  // esercizio di nessuno, e non e' mai entrata in funzione).
  for (const id of Object.keys(SCALA_ESERCIZI)) {
    assert.ok(ESERCIZI.some((e) => e.id === id),
      'la riga ' + id + ' non corrisponde a nessun esercizio: non vale niente');
    assert.ok(SCALA_ESERCIZI[id] > 0, id + ' non e\' un numero positivo');
  }
  // e nessuna riga duplicata con due significati diversi
  assert.equal(new Set(Object.keys(SCALA_ESERCIZI)).size, Object.keys(SCALA_ESERCIZI).length);
});

test('S16. riferimentoPerEsercizio e\' l\'unico posto che riporta sul peso', () => {
  // Se un altro pezzo di codice riportasse la scala sul peso da solo, i due
  // numeri potrebbero non essere d'accordo: e' il difetto che ha fatto dire all'app
  // "hai passato il livello" mentre il prossimo obiettivo era ancora lontano.
  const e = ESERCIZI.find((x) => x.id === 'ex-single-leg-press');
  // 34 di base, ma la sua macchina e' a stack e il correttivo la alza dell'8%: la
  // scala vera e' 36,72 sul corpo di riferimento, e 34,62 sul suo corpo di 66 kg
  assert.equal(riferimentoPerEsercizio(e, PESO_STE), 34.62);
  assert.equal(riferimentoPerEsercizio(e, null), 36.72,
    'senza peso torna il numero del corpo di riferimento');
  assert.equal(riferimentoPerEsercizio(e, 700), 36.72, 'un peso assurdo si ignora, non si rompe');
  // e se il peso non e' un numero la scala non diventa NaN
  for (const peso of [null, undefined, '', 'abc', 0, -5]) {
    const r = riferimentoPerEsercizio(e, peso);
    assert.ok(Number.isFinite(r), 'riferimento non valido con peso ' + peso);
  }
});

// ---------------------------------------------------------------------------
// I due numeri che penalizzavano di piu' Ste, e il PERCHE' di ognuno.
// Non serve a farlo salire di rank: serve a non avere numeri presi a prestito.
// ---------------------------------------------------------------------------

test('S17. ogni numero della tabella ha una ragione che si puo\' controllare', () => {
  // Ste (06/10/2026), sul cable fly e sul single leg press: "sono i due numeri che
  // mi penalizzano di piu' e non ha senso che siano sbagliati per caso".
  //
  // I due casi hanno la stessa natura: il numero non veniva da una misura ma da un
  // posto che non c'entava. Sul fly era il numero che c'era gia' in tabella, lasciato
  // li' per non spostare niente; sulla leg press era il numero della leg press a due
  // gambe, cioe' un'altra macchina. Quindi qui si blocca il ragionamento, non il
  // numero: un numero giustificato male torna indietro, e non lo sapremmo.

  // (a) IL CABLE FLY si prende dal suo vicino verificato: il One Arm Cable Reverse
  // Fly, sullo stesso cavo a doppia carrucola, sullo stesso braccio. Il fly e' il
  // davanti invece che il dietro, quindi un po' piu' facile e un po' piu' grosso.
  const reverse = scalaVerificata('ex-one-arm-cable-reverse-fly');
  const fly = SCALA_MOVIMENTO.petto_isolamento.lato;
  assert.ok(fly > reverse,
    `il fly (${fly}) deve stare sopra il reverse fly (${reverse}): stesso cavo, stesso braccio`);
  assert.ok(fly < reverse * 1.5,
    `il fly non puo' valere la meta' piu' del reverse fly (${reverse}): e' un movimento piu' facile, non un'altra macchina`);

  // (b) LA LEG PRESS SU UNA GAMBA SOLA e' una stima dichiarata, non una misura: su
  // una macchina sola conta la sua geometria e due macchine con lo stesso nome si
  // leggono numeri diversi. Quindi il numero e' ancorato al peso del corpo, dentro
  // una fascia, e resta comunque molto piu' basso della pressione a due gambe.
  const gamba = SCALA_MOVIMENTO.gambe_pesanti.lato;
  assert.ok(gamba >= 0.3 * PESO_RIF && gamba <= 0.7 * PESO_RIF,
    `la pressa su una gamba sola sta fra 0,3 e 0,7 volte il peso (${21} e ${49} kg), trovato ${gamba}`);
  assert.ok(gamba < SCALA_MOVIMENTO.gambe_pesanti.totale / 3,
    'e resta molto piu\' bassa della pressione a due gambi: non puo\' essere la meta\' di 140');

  // (c) E la cosa che conta di piu': nessuno dei due numeri e' tarato sul suo record.
  // Se la scala fosse stata scelta per farlo arrivare al 100%, il riferimento
  // sarebbe il suo massimale. Non lo e': uno dei due sta sopra e uno sotto, quindi
  // nessuno dei due e' stato scelto per arrivare a una percentuale precisa.
  const quota = (punteggio, serie) => punteggio * [1, 1.03, 1.06, 1.08][Math.min(3, serie - 1)];
  const flyRif = scalaSulCorpo(SCALA_MOVIMENTO.petto_isolamento.lato, PESO_STE);
  const gambaRif = scalaSulCorpo(
    scalaDerivata({
      id: 'ex-single-leg-press', movimento: 'gambe_pesanti', livello: 'grande',
      convenzione: 'per_gamba', attrezzatura: 'macchina_stack',
    }), PESO_STE);
  assert.ok(quota(21.58, 3) > flyRif,
    `sul fly il suo massimale e\' SOPRA il riferimento (${flyRif}): non tarato su di lui`);
  assert.ok(quota(21.53, 2) < gambaRif,
    `sulla leg press obliqua il suo massimale e\' SOTTO il riferimento (${gambaRif}): neppure li`);
});

test('S18. la scala di un esercizio non dipende dal suo record', () => {
  // Se la scala cambiasse in base a quanto ha sollevato una persona, il rank
  // inseguirebbe se stesso e non distinguerebbe piu' nessuno. La scala dipende
  // solo da: id (numero verificato), movimento, unita', attrezzatura, carrucola
  // e braccia indipendenti. Punto.
  const fly = ESERCIZI.find((e) => e.id === 'ex-cable-fly');
  const vuoto = { id: 'ex-prova', nome: 'Cable Fly', convenzione: 'cavo_totali', carrucola: 'carrucola_doppia' };
  const a = profiloPerPesoCorporeo(profiloEsercizio(fly), PESO_STE).soglie;
  const b = profiloPerPesoCorporeo(profiloEsercizio(vuoto), PESO_STE).soglie;
  assert.deepEqual(a, b, 'la scala non guarda le serie: solo l\'esercizio');

  const gamba = ESERCIZI.find((e) => e.id === 'ex-single-leg-press');
  assert.ok(profiloPerPesoCorporeo(profiloEsercizio(gamba), PESO_STE).soglie[3] > 0,
    'e nessuna scala resta a zero: altrimenti la pagina dell\'esercizio si rompe');
});