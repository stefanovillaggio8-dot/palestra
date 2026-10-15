// mappa-muscoli.test.js -- l'omino non deve sbagliare niente.
//
// Ste (13/10/2026), quattro volte sulla stessa figura:
//  1. "voglio che spunti questo omino con il muscolo allenato colorato di viola";
//  2. "deve essere l'omino come quello nella foto... si deve capire anche fronte e
//     retro... i quadratini grigi non mi piacciono";
//  3. "i muscoli formati da piu parti muscolari falli uniti, come nella foto";
//  4. "e' veramente brutto, non puoi copiare la foto da download? pero' deve
//     avere colorati solo i muscoli allenanti" e "lo sfondo deve avere lo stesso
//     colore dell'app".
//
// Sotto ci sono le regole che non si possono violare e i controlli che le fanno
// rispettare: se un domani si rompe qualcosa, fallisce qui e non sull'app.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RITAGLI, GRUPPI, figurino, gruppoDiParte, idZonaDaParte, vistaDiGruppo,
  ETICHETTE, FOTO_L, FOTO_A, LIVELLI, livelloDiQuota,
} from '../src/mappa-muscoli.js';
import { PARTI, parteDiMuscolo } from '../src/muscoli-parti.js';

const TUTTE = Object.keys(GRUPPI);
const DISEGNATI = Object.keys(RITAGLI);

// la linea centrale di ogni figura, per controllare la simmetria
const CENTRI = { fronte: 162, retro: 577 };

// Due pezzi sono lo stesso se hanno lo stesso numero di vertici e ogni vertice
// cade entro mezzo centesimo di pixel. Il confronto esatto non va bene: riflettere
// un numero in virgola mobile due volte non torna al centesimo (324 - 239.33 fa
// 84.67000000000002), e un test che pretende l'uguaglianza al centesimo fallisce
// per la virgola mobile e non per un errore vero. Mezzo centesimo di pixel su una
// figura larga 809 è invisibile: i 6 pixel di sbaglio di prima, quelli li beve.
const STESSO = (a, b) => a.length === b.length
  && a.every(([x, y], k) => Math.abs(x - b[k][0]) < 0.05 && Math.abs(y - b[k][1]) < 0.05);

const esistePezzo = (poligono) => Object.values(RITAGLI)
  .some((gruppo) => gruppo.pezzi.some((p) => STESSO(p, poligono)));

// Stessa cosa, ma su quello che c'è scritto nell'SVG: i punti arrivano dal
// disegno come "12,34 56,78", quindi vanno riletti e confrontati con la stessa
// tolleranza di sopra.
const stampa = (p) => p.map(([x, y]) => `${x},${y}`).join(' ');
const disegnati = (svg) => [...svg.matchAll(/points="([^"]+)"/g)]
  .map((m) => m[1].trim().split(/\s+/)
    .map((xy) => xy.split(',').map(Number)));
const disegnato = (svg, poligono) => disegnati(svg).some((p) => STESSO(p, poligono));

test('Z1. ogni pezzo di muscolo che l\'app riconosce è ritagliato', () => {
  for (const p of PARTI) {
    assert.ok(p.id in GRUPPI, 'il pezzo "' + p.id + '" non c\'è nella mappa');
    assert.ok(RITAGLI[GRUPPI[p.id].gruppo],
      'il pezzo "' + p.id + '" punta a un gruppo che non è disegnato');
  }
  const conosciuti = new Set(PARTI.map((p) => p.id));
  for (const id of TUTTE) {
    assert.ok(conosciuti.has(id), 'la mappa mostra "' + id + '" ma l\'app non lo riconosce');
  }
  for (const g of DISEGNATI) {
    assert.ok(TUTTE.some((id) => GRUPPI[id].gruppo === g),
      'il gruppo "' + g + '" è disegnato ma nessun pezzo lo usa');
  }
});

test('Z2. si accende il muscolo giusto, e solo quello', () => {
  for (const id of TUTTE) {
    assert.equal(idZonaDaParte(id), id, 'il pezzo ' + id + ' non si accende');
    const gruppo = gruppoDiParte(id);
    const svg = figurino(id);

    // dentro ci deve essere il ritaglio di QUEL gruppo e non di altri
    const poligoni = svg.match(/<polygon /g) || [];
    assert.equal(poligoni.length, RITAGLI[gruppo].pezzi.length,
      id + ': il ritaglio non contiene i pezzi del gruppo ' + gruppo);
    assert.match(svg, /muscoli\.png/, id + ': manca l\'immagine dei muscoli');
    assert.match(svg, /<clipPath id="taglio-muscolo-[^"]+"/, id + ': manca il ritaglio');

    // il poligono deve essere quello del gruppo, non uno qualsiasi
    const primo = RITAGLI[gruppo].pezzi[0];
    const atteso = primo.map(([x, y]) => `${x},${y}`).join(' ');
    assert.ok(svg.includes(atteso), id + ': il ritaglio non è quello di ' + gruppo);

    // e un pezzo sconosciuto non deve accendere niente
    const vuoto = figurino('pezzo-che-non-esiste');
    assert.doesNotMatch(vuoto, /muscoli\.png/,
      'un pezzo sconosciuto ha acceso qualcosa: meglio spento che sbagliato');
  }
});

test('Z3. l\'anatomia: ogni muscolo è nella vista giusta', () => {
  const vista = (id) => vistaDiGruppo(gruppoDiParte(id));
  // Il TRICIPITE STA DIETRO. Davanti al braccio non si vede, e metterlo davanti
  // direbbe che un dip lavora coi bicipiti: il contrario del vero.
  assert.equal(vista('spalla_gomito'), 'retro', 'il tricipite si vede solo di dietro');
  assert.equal(vista('braccio_alto'), 'fronte', 'il bicipite si vede davanti');
  assert.equal(vista('braccio_basso'), 'fronte', 'il bicipite si vede davanti');
  assert.equal(vista('addome'), 'fronte', 'gli addomi sono davanti');
  assert.equal(vista('glutei'), 'retro', 'i glutei sono dietro');
  for (const id of ['dorso_alto', 'dorso_centrale', 'dorso_lati', 'femorale', 'polpaccio']) {
    assert.equal(vista(id), 'retro', id + ' si vede solo di dietro');
  }
  for (const id of ['petto_alto', 'petto_centrale', 'petto_basso', 'quadricipite', 'avambraccio']) {
    assert.equal(vista(id), 'fronte', id + ' si vede solo davanti');
  }
  assert.equal(vista('spalle_frontali'), 'fronte', 'il deltoide davanti si vede davanti');
  assert.equal(vista('spalle_posteriori'), 'retro', 'il deltoide dietro si vede dietro');
  // Il deltoide LATERALE sta sul bordo della spalla e nella foto non ha un pezzo
  // tutto suo: si accende col deltoide davanti, che è quello che si vede in un
  // alzata laterale. Non è la schiena: l'ho avuto collegato ai dorsali e
  // un'alzata laterale non lavora la schiena.
  assert.equal(vista('spalle_laterali'), 'fronte',
    'il deltoide laterale si accende sulla spalla, non sulla schiena');
});

test('Z4. nessun ritaglio esce dalla figura', () => {
  for (const [g, r] of Object.entries(RITAGLI)) {
    for (const pezzo of r.pezzi) {
      for (const [x, y] of pezzo) {
        assert.ok(x >= 0 && x <= FOTO_L && y >= 0 && y <= FOTO_A,
          g + ': il ritaglio esce dalla foto (' + x + ',' + y + ')');
      }
    }
  }
  // ogni pezzo deve stare dalla parte giusta della figura
  for (const [g, r] of Object.entries(RITAGLI)) {
    const centro = CENTRI[r.vista];
    if (r.centro) continue;   // un pezzo al centro sta intero, non è doppio
    for (const pezzo of r.pezzi) {
      const cx = pezzo.reduce((s, p) => s + p[0], 0) / pezzo.length;
      const lato = cx < centro ? 'sinistro' : 'destro';
      const simmetrico = pezzo.map(([x, y]) => [2 * centro - x, y]);
      assert.ok(esistePezzo(simmetrico),
        g + ': il pezzo ' + lato + ' non ha il suo compagno specchiato');
    }
  }
});

test('Z5. ogni esercizio della scheda accende un muscolo disegnato', () => {
  const ESERCIZI = [
    'Chest Press', 'Cable Hammer Curl', 'Cable Lateral Raise',
    'Cable Overhead Tricep Extension', 'Leg Extension', 'Lat Pulldown macchina',
    'Dumbbell Bench Pull', 'Seated Dumbbell Shoulder Press', 'Cable Fly',
    'Scott Bench Curl seduto al contrario', 'Single Arm Tricep Pushdown',
    'Seated Leg Curl', 'Smith Machine Incline Bench Press', 'Seated Cable Row',
    'Chest Supported Dumbbell Shrug', 'Sled Press Calf Raise', 'Single Leg Press',
    'One Arm Dumbbell Preacher Curl', 'Bodyweight Overhead Tricep Extension',
    'One Arm Cable Reverse Fly', 'Pull Ups', 'Dips', 'Wrist Curl',
    'Iso-Lateral Row', 'Lat Pulldown (lats)', 'Dumbbell Lateral Raise',
    'Incline Single Arm Pulldown',
  ];
  for (const nome of ESERCIZI) {
    const p = parteDiMuscolo({ nome });
    assert.ok(p.trovata, nome + ': l\'app non riconosce nessun muscolo');
    assert.ok(idZonaDaParte(p.parte),
      nome + ': riconosce "' + p.parte + '" ma sulla mappa non c\'è: l\'omino resterebbe spento');
  }
});

test('Z6. il ritaglio è simmetrico: il sinistro è lo specchio del destro', () => {
  for (const [g, r] of Object.entries(RITAGLI)) {
    if (r.centro) continue;   // un pezzo al centro sta intero, non è doppio
    const centro = CENTRI[r.vista];
    const svg = figurino(Object.keys(GRUPPI).find((id) => GRUPPI[id].gruppo === g));
    for (const pezzo of r.pezzi) {
      const simmetrico = pezzo.map(([x, y]) => [2 * centro - x, y]);
      // il pezzo disegnato e il suo simmetrico devono esserci ENTRAMBI nella
      // pagina: se il destro manca, la figura resta mezza storta
      assert.ok(disegnato(svg, pezzo) && disegnato(svg, simmetrico),
        g + ': il ritaglio ha il pezzo ma non il suo specchio');
    }
  }
});

test('Z7. fronte e dietro si distinguono, e lo dicono', () => {
  // Ste: "si deve capire anche fronte e retro e qua non si capisce".
  const davanti = DISEGNATI.filter((g) => RITAGLI[g].vista === 'fronte');
  const dietro = DISEGNATI.filter((g) => RITAGLI[g].vista === 'retro');
  assert.ok(davanti.length >= 6, 'i muscoli di fronte sono troppo pochi: ' + davanti.length);
  assert.ok(dietro.length >= 6, 'i muscoli di dietro sono troppo pochi: ' + dietro.length);
  // e nessuno dei due gruppi e' lo stesso: se fossero lo stesso non si capirebbe
  for (const a of davanti) {
    assert.ok(!dietro.includes(a), a + ' sta sia davanti che dietro');
  }
  // le due etichette ci sono e sono ai due lati giusti
  assert.equal(ETICHETTE.length, 2, 'le etichette devono essere due: FRONTE e DIETRO');
  assert.equal(ETICHETTE[0].testo, 'FRONTE');
  assert.equal(ETICHETTE[1].testo, 'DIETRO');
  assert.ok(ETICHETTE[0].x < FOTO_L / 2, 'FRONTE sta nella figura di sinistra');
  assert.ok(ETICHETTE[1].x > FOTO_L / 2, 'DIETRO sta nella figura di destra');
});

test('Z8. i muscoli fatti di più parti sono uniti, come nella foto', () => {
  // Ste: "i muscoli formati da piu parti muscolari falli uniti, come nella
  // foto". Nella foto il pettorale è un pezzo solo, non tre macchie: dentro ci
  // sono delle linee sottili che lo dividono, ma il contorno è uno. Il
  // bicipite idem.
  const UNITI = {
    petto: ['petto_alto', 'petto_centrale', 'petto_basso'],
    bicipite: ['braccio_alto', 'braccio_basso'],
  };
  for (const [gruppo, pezzi] of Object.entries(UNITI)) {
    assert.ok(RITAGLI[gruppo], 'il gruppo ' + gruppo + ' non è disegnato');
    for (const p of pezzi) {
      assert.equal(GRUPPI[p].gruppo, gruppo,
        p + ' dovrebbe stare nel gruppo ' + gruppo + ': stesso muscolo, ritaglio unito');
    }
    // e accenderne uno deve accendere TUTTO il gruppo
    const svg = figurino(pezzi[0]);
    const poligoni = svg.match(/<polygon /g) || [];
    assert.equal(poligoni.length, RITAGLI[gruppo].pezzi.length,
      'accendendo ' + pezzi[0] + ' non si è acceso tutto il ' + gruppo);
  }
});

test('Z8b. uniti non vuol dire tutti uguali: le fasce si toccano e non si sommano', () => {
  // Ste ha chiesto due cose, e vanno messe d'accordo: (13/10/2026) "i muscoli
  // formati da piu' parti muscolari falli uniti, come nella foto", e (15/10/2026)
  // "la parte che lavora di piu' deve essere piu' evidenziata".
  //
  // Si tengono insieme cosi': le fasce sono tagliate DAL CODICE dentro la sagoma
  // originale, quindi ricompongono il muscolo esattamente. Se la somma delle
  // fasce non torna, sulla figura si vedrebbe una riga vuota in mezzo al
  // pettorale, o un orecchio che sporge fuori: il muscolo sembrerebbe rotto.
  const area = (poligono) => {
    let a = 0;
    for (let i = 0; i < poligono.length; i += 1) {
      const [x1, y1] = poligono[i];
      const [x2, y2] = poligono[(i + 1) % poligono.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a / 2);
  };

  for (const [gruppo, r] of Object.entries(RITAGLI)) {
    const sinistra = (zona) => (r.centro ? r.bande[zona] : [r.bande[zona][0]]);
    let somma = 0;
    for (const zona of r.zone) {
      const pezzi = sinistra(zona);
      assert.ok(pezzi.length > 0 && area(pezzi[0]) > 1,
        gruppo + '/' + zona + ': la fascia è vuota, sul muscolo ci sarebbe un buco');
      somma += sinistra(zona).reduce((s, p) => s + area(p), 0);
    }
    const intera = area(r.sagoma);
    const scarto = Math.abs(somma - intera) / intera;
    assert.ok(scarto < 0.02,
      gruppo + ': le fasce sommano ' + Math.round(somma) + ' ma la sagoma è '
      + Math.round(intera) + ' (scarto ' + Math.round(scarto * 100) + '%): '
      + 'il muscolo si vedrebbe con un buco o con un orecchio');
  }
});

test('Z10. quanto lavora: la parte più allenata è più piena, le altre più chiare', () => {
  // Ste (15/10/2026): "la parte che lavora di piu' deve essere piu' evidenziata,
  // la parte che lavora di meno deve essere evidenziata piu' chiara. tipo il dip
  // qua segna tutto il petto che e' giusto ma allena principalmente la parte
  // bassa".
  //
  // Quindi: il pezzo acceso è SEMPRE pieno, gli altri pezzi dello stesso muscolo
  // restano accesi ma chiari. Un pezzo spento sarebbe peggio (il lettore
  // penserebbe che il muscolo non c'entra), un pezzo acceso uguale sarebbe la
  // cosa che Ste ha chiesto di togliere.

  const opacitaDi = (svg, gruppo, zona) => {
    // cerca l'immagine il cui ritaglio contiene la fascia di quella zona
    let trovata = null;
    for (const blocco of svg.match(/<clipPath\b[\s\S]*?<\/clipPath>/g) || []) {
      const id = blocco.match(/id="([^"]+)"/)[1];
      const poligoni = [...blocco.matchAll(/points="([^"]+)"/g)]
        .map((m) => m[1].trim().split(/\s+/).map((xy) => xy.split(',').map(Number)));
      if (!poligoni.some((p) => STESSO(p, RITAGLI[gruppo].bande[zona][0]))) continue;
      const img = svg.match(new RegExp('<image[^>]*clip-path="url\\(#' + id + '\\)"[^>]*/>'));
      trovata = Number(img[0].match(/opacity="([\d.]+)"/)[1]);
    }
    return trovata;
  };

  for (const [gruppo, r] of Object.entries(RITAGLI)) {
    const primario = r.zone[0];
    const svg = figurino(primario);

    // 1. il pezzo acceso è pieno
    assert.equal(opacitaDi(svg, gruppo, primario), LIVELLI[LIVELLI.length - 1],
      gruppo + '/' + primario + ': il pezzo acceso deve essere tutto pieno');

    // 2. tutti gli altri pezzi dello stesso muscolo restano accesi, ma chiari
    for (const zona of r.zone.slice(1)) {
      const op = opacitaDi(svg, gruppo, zona);
      assert.ok(op !== null, gruppo + '/' + zona + ': sparisce del tutto dal muscolo');
      assert.ok(op < LIVELLI[LIVELLI.length - 1],
        gruppo + '/' + zona + ': è acceso uguale a ' + primario
        + ', e il pezzo che lavora di meno deve essere più chiaro');
      assert.ok(op >= LIVELLI[0], gruppo + '/' + zona + ': troppo chiaro, non si vede');
    }

    // 3. nessun pezzo di un ALTRO muscolo si accende per sbaglio
    for (const [altro, r2] of Object.entries(RITAGLI)) {
      if (altro === gruppo) continue;
      for (const zona of r2.zone) {
        const stampa = RITAGLI[altro].bande[zona][0]
          .map(([x, y]) => `${x},${y}`).join(' ');
        assert.ok(!svg.includes(stampa),
          gruppo + ': si è acceso anche ' + altro + '/' + zona + ', che non c\'entra');
      }
    }
  }

  // 4. i DIPS, l'esempio di Ste: petto tutto acceso ma la parte bassa piena
  const dips = parteDiMuscolo({ nome: 'Dips' });
  assert.equal(dips.parte, 'petto_basso', 'i dips allenano la parte bassa del petto');
  const svgDips = figurino(dips.parte, dips.livelli);
  assert.equal(opacitaDi(svgDips, 'petto', 'petto_basso'), LIVELLI[LIVELLI.length - 1],
    'sui dips la parte bassa del petto deve essere piena');
  assert.ok(opacitaDi(svgDips, 'petto', 'petto_alto') < LIVELLI[LIVELLI.length - 1],
    'sui dips la parte alta del petto lavora meno: deve essere più chiara');

  // 5. e una panca inclinata: alto pieno, centro un gradino sotto
  const panca = parteDiMuscolo({ nome: 'Smith Machine Incline Bench Press' });
  assert.equal(panca.parte, 'petto_alto', 'la panca inclinata lavora il petto alto');
  const svgPanca = figurino(panca.parte, panca.livelli);
  const alto = opacitaDi(svgPanca, 'petto', 'petto_alto');
  const centro = opacitaDi(svgPanca, 'petto', 'petto_centrale');
  assert.ok(alto > centro,
    'la panca inclinata: il petto alto (' + alto + ') deve essere più pieno del centro (' + centro + ')');

  // 6. la scala non esce mai dai quattro valori scelti, e resta ordinata
  for (const q of [0, 0.05, 0.11, 0.12, 0.3, 0.39, 0.4, 0.6, 0.74, 0.75, 1, 2, -1]) {
    assert.ok(LIVELLI.includes(livelloDiQuota(q)),
      'quota ' + q + ' -> ' + livelloDiQuota(q) + ': non è nessuno dei quattro livelli');
  }
  let precedente = -1;
  for (let q = 0; q <= 1.0001; q += 0.01) {
    const v = livelloDiQuota(q);
    assert.ok(v >= precedente, 'la sfumatura non può tornare più chiara aumentando la quota');
    precedente = v;
  }
});

test('Z9. il ritaglio è un SVG valido, o il muscolo non si accende', () => {
  // Ste (15/10/2026): "ma non si vede il muscolo evidenziato in nessun esercizio".
  //
  // Il colpevole era `clipPathUnits`: è un ATTRIBUTO di clipPath, non un
  // elemento. Scritto come elemento, il browser considera il ritaglio non
  // valido, il clipPath resta vuoto e la figura esce tutta apagata: senza
  // dirlo, senza errori in console, e con l'id del ritaglio al suo posto, così
  // anche i test erano contenti. I 821 test passavano e sull'app non si vedeva
  // niente: è per questo che qui si controlla la STRUTTURA, non solo gli id.
  const FORME = ['polygon', 'path', 'rect', 'circle', 'ellipse', 'use', 'text'];

  for (const id of TUTTE) {
    const svg = figurino(id);

    // 1. nessun elemento dentro clipPath che non sia una forma
    const dentro = svg.match(/<clipPath\b[^>]*>([\s\S]*?)<\/clipPath>/);
    assert.ok(dentro, id + ': il ritaglio non si chiude, non si può disegnare');
    for (const tag of dentro[1].match(/<([a-zA-Z]+)/g) || []) {
      assert.ok(FORME.includes(tag.slice(1).toLowerCase()),
        id + ': dentro il ritaglio c\'è <' + tag.slice(1) + '>, che il browser '
        + 'ignora: il ritaglio diventa vuoto e il muscolo non si accende');
    }

    // 2. dentro il ritaglio c'è almeno una forma, altrimenti è a vuoto
    assert.ok(/<(polygon|path|rect|circle|ellipse)\b/.test(dentro[1]),
      id + ': il ritaglio è vuoto, il muscolo non può accendersi');

    // 3. i tag sono bilanciati: un </clipPath> in più chiude tutto a vuoto
    const aperti = (svg.match(/<clipPath\b/g) || []).length;
    const chiusi = (svg.match(/<\/clipPath>/g) || []).length;
    assert.equal(aperti, chiusi,
      id + ': ci sono ' + aperti + ' <clipPath> e ' + chiusi + ' </clipPath>');

    // 4. l'id di ogni ritaglio e' unico, e ognuno e' quello che la sua immagine
    //    cerca: con lo stesso id, due figure della stessa pagina si ruberebbero
    //    il muscolo (una mostrerebbe quello dell'altra).
    const idTagli = [...svg.matchAll(/<clipPath id="([^"]+)"/g)].map((m) => m[1]);
    const idUsati = [...svg.matchAll(/clip-path="url\(#([^)]+)\)"/g)].map((m) => m[1]);
    assert.equal(new Set(idTagli).size, idTagli.length,
      id + ': un id di ritaglio ripetuto nella stessa figura');
    assert.equal(idTagli.length, idUsati.length,
      id + ': ci sono ' + idTagli.length + ' ritagli e ' + idUsati.length + ' immagini');
    for (const cercato of idUsati) {
      assert.ok(idTagli.includes(cercato),
        id + ': un\'immagine cerca il ritaglio "' + cercato + '" che non c\'è');
    }
    assert.ok(idUsati.length >= 1, id + ': nessuna immagine ritagliata');
  }

  // due figure nella stessa pagina non devono confondersi
  const id1 = figurino('petto_basso').match(/<clipPath id="([^"]+)"/)[1];
  const id2 = figurino('addome').match(/<clipPath id="([^"]+)"/)[1];
  assert.notEqual(id1, id2,
    'due figure hanno lo stesso id di ritaglio: la seconda mostrerebbe il muscolo della prima');
});