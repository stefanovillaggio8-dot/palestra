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
  ETICHETTE, FOTO_L, FOTO_A, LIVELLI, livelloDiQuota, SOGLIA_SECONDARIO,
  righeDaAccendere,
} from '../src/mappa-muscoli.js';
import { PARTI, parteDiMuscolo, MOVIMENTI, gruppoMuscoloDi } from '../src/muscoli-parti.js';
import { ESERCIZI as CATALOGO } from '../src/dati-iniziali.js';
import { readFile } from 'node:fs/promises';

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
// Quali gruppi di muscoli si vedono accesi in una figura.
const gruppiAccesi = (svg) => {
  const accesi = new Set();
  for (const blocco of svg.match(/<clipPath\b[\s\S]*?<\/clipPath>/g) || []) {
    for (const [g, r] of Object.entries(RITAGLI)) {
      if (r.zone.some((z) => disegnato(blocco, r.bande[z][0]))) accesi.add(g);
    }
  }
  return accesi;
};

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

// GLI ESERCIZI DA PROVARE.
//
// Ste (15/10/2026): "fallo in tutto e che si aggiorni automaticamente". Quindi
// qui non c'è una lista scritta a mano e basta: si prende il CATALOGO VERO
// dell'app (src/dati-iniziali.js) e si aggiungono i nomi che compaiono nelle
// missioni e nelle schede. Il giorno che aggiungi un esercizio nuovo, i test lo
// controllano senza che nessuno debba ricordarsi di scriverlo qui.
const NOMI_PROVA = [
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

const ESERCIZI = [...new Set([
  ...CATALOGO.map((e) => e.nome).filter(Boolean),
  ...NOMI_PROVA,
])];

test('Z5. ogni esercizio della scheda accende un muscolo disegnato', () => {
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
  const svgDips = figurino(dips.parte, dips.livelli, dips.anatomia);
  assert.equal(opacitaDi(svgDips, 'petto', 'petto_basso'), LIVELLI[LIVELLI.length - 1],
    'sui dips la parte bassa del petto deve essere piena');
  assert.ok(opacitaDi(svgDips, 'petto', 'petto_alto') < LIVELLI[LIVELLI.length - 1],
    'sui dips la parte alta del petto lavora meno: deve essere più chiara');

  // 5. e una panca inclinata: alto pieno, centro un gradino sotto
  const panca = parteDiMuscolo({ nome: 'Smith Machine Incline Bench Press' });
  assert.equal(panca.parte, 'petto_alto', 'la panca inclinata lavora il petto alto');
  const svgPanca = figurino(panca.parte, panca.livelli, panca.anatomia);
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

test('Z11. anche i muscoli secondari, ma solo quelli veri', () => {
  // Ste (15/10/2026): "i dips non fanno anche tricipiti?". Sì: i dip schiacciano
  // il peso su braccia estese, i tricipiti sono lì accanto. Quindi si accendono.
  //
  // Ma NON tutto quello che capita in una quota piccola: sotto la soglia è rumore
  // delle parole. Per questo qui si controlla che nessun esercizio accenda un
  // muscolo secondario che non abbia un pezzo almeno della soglia.

  // 1. i dip accendono i tricipiti, e il petto resta il più pieno
  const dips = parteDiMuscolo({ nome: 'Dips' });
  const accesiDips = gruppiAccesi(figurino(dips.parte, dips.livelli, dips.anatomia));
  assert.ok(accesiDips.has('petto'), 'i dip devono accendere il petto');
  assert.ok(accesiDips.has('tricipite'),
    'i dip allenano anche i tricipiti: non si vedono sulla figura');
  assert.equal(accesiDips.size, 2,
    'sui dip si accendono solo petto e tricipiti, sono arrivati ' + [...accesiDips]);

  // 2. e il pezzo principale resta il più pieno in assoluto
  const righe = righeDaAccendere(dips.parte, dips.livelli, dips.anatomia);
  const pieno = righe.filter((r) => r.opacita === LIVELLI[LIVELLI.length - 1]);
  assert.equal(pieno.length, 1, 'un solo pezzo deve essere tutto pieno');
  assert.equal(pieno[0].zona, dips.parte, 'il pezzo pieno deve essere quello che l\'esercizio sceglie');

  // 3. NESSUN esercizio accende un muscolo che i dati non sostengono:
  //    ogni gruppo acceso deve avere almeno un pezzo oltre la soglia, oppure
  //    essere un muscolo che l'ANATOMIA mette accanto perché l'esercizio è di
  //    quel movimento (vedi MOVIMENTI in muscoli-parti.js).
  //    (con la descrizione, come fa l'app: qualche volta la parte è nel testo)
  for (const esercizio of CATALOGO) {
    const r = parteDiMuscolo({
      nome: esercizio.nome,
      descrizione: esercizio.nota_permanente || '',
    });
    assert.ok(r.trovata, esercizio.nome + ': l\'app non riconosce nessun muscolo');
    const principale = gruppoDiParte(r.parte);
    for (const g of gruppiAccesi(figurino(r.parte, r.livelli, r.anatomia))) {
      if (g === principale) continue;
      const sostegno = RITAGLI[g].zone.some((z) => (r.livelli[z] || 0) >= SOGLIA_SECONDARIO
        || (r.anatomia || {})[z] !== undefined);
      assert.ok(sostegno,
        esercizio.nome + ': ha acceso ' + g + ' (secondario) ma né le parole né '
        + 'l\'anatomia lo sostengono: ' + JSON.stringify(r.livelli));
    }
  }

  // 4. i casi che la parola sbagliata accendeva: qui il petto NON deve accendersi
  const SPENTI = [
    ['Dumbbell Bench Pull', 'petto'],
    ['Scott Bench Curl seduto al contrario', 'petto'],
    ['One Arm Cable Reverse Fly', 'petto'],
    ['Incline Single Arm Pulldown', 'petto'],
  ];
  for (const [nome, gruppo] of SPENTI) {
    const r = parteDiMuscolo({ nome: nome });
    assert.ok(!gruppiAccesi(figurino(r.parte, r.livelli, r.anatomia)).has(gruppo),
      nome + ': ha acceso ' + gruppo + ', ma non è un esercizio di ' + gruppo);
  }

  // 5. e i veri esercizi di petto continuano ad accenderlo
  for (const nome of ['Chest Press', 'Cable Fly', 'Bench Press']) {
    const r = parteDiMuscolo({ nome: nome });
    assert.equal(gruppoDiParte(r.parte), 'petto', nome + ': deve restare un esercizio di petto');
    assert.ok(gruppiAccesi(figurino(r.parte, r.livelli, r.anatomia)).has('petto'),
      nome + ': il petto non si accende più');
  }
});

test('Z12. a una TIRATA il petto non si accende, mai', () => {
  // Ste (15/10/2026): "piu' evidenziati devono essere i muscoli allenanti
  // principali di quell'esercizio. fallo in tutto e che si aggiorni
  // automaticamente".
  //
  // Il petto è un muscolo di SPINTA: se tiri il peso verso di te il petto non
  // c'entra, e accenderlo è sbagliato. È successo con "Incline Single Arm
  // Pulldown" (la parola "incline" la finiva nel petto) e prima ancora con
  // "Dumbbell Bench Pull" e "Scott Bench Curl" (la parola "bench").
  //
  // Qui la regola è scritta una volta sola e vale per TUTTI gli esercizi del
  // catalogo, compresi quelli che verranno aggiunti dopo.
  // I confini di parola (\b) non sono pignoli: senza, "chin" agganciava
  // "Ma-CHIN-e" e la Smith Machine finiva tra le tirate.
  const TIRATE = /\b(pulldown|pull[\s-]?up|pullover|tirat[ae]|trazione|trazioni|curl|row|rematore|rowing|chin|sled pull)\b/i;

  const guarda = (esercizio) => {
    const r = parteDiMuscolo({
      nome: esercizio.nome,
      descrizione: esercizio.nota_permanente || '',
    });
    return { r, gruppi: gruppiAccesi(figurino(r.parte, r.livelli, r.anatomia)) };
  };

  let controllate = 0;
  for (const esercizio of CATALOGO) {
    if (!TIRATE.test(esercizio.nome)) continue;
    controllate += 1;
    const { r, gruppi } = guarda(esercizio);
    assert.notEqual(gruppoDiParte(r.parte), 'petto',
      esercizio.nome + ': è una tirata, ma il pezzo principale è il petto');
    assert.ok(!gruppi.has('petto'),
      esercizio.nome + ': è una tirata, ma sulla figura si è acceso il petto ('
      + JSON.stringify(r.livelli) + ')');
  }
  assert.ok(controllate >= 8,
    'il controllo sta guardando troppo pochi esercizi: ' + controllate);

  // e il viceversa: se il petto è il pezzo principale, il nome non è di una
  // tirata
  for (const esercizio of CATALOGO) {
    const { r } = guarda(esercizio);
    if (gruppoDiParte(r.parte) !== 'petto') continue;
    assert.ok(!TIRATE.test(esercizio.nome),
      esercizio.nome + ': dice petto ma il nome è di una tirata: controllare i dati');
  }
});

test('Z13. i secondari vengono da quello che l\'esercizio FA, non dalle sue parole', () => {
  // Ste (15/10/2026): "i dips non fanno anche tricipiti? e poi nell' one arm cable
  // reverse fly non lavora anche tricipiti o si? o comunque se lo fa non lo fa
  // principalmente. piu' evidenziati devono essere i muscoli allenanti principali di
  // quell'esercizio. fallo in tutto e che si aggiorni automaticamente".
  //
  // "Che si aggiorni automaticamente" è la parte difficile, ed è quello che questo
  // test controlla: i secondari NON possono dipendere dal nome dell'esercizio,
  // perché il nome cambia e le parole si somigliano. Devono uscire dal movimento.
  // Qui sotto i nomi sono apposta SCELTI MALE: non compaiono da nessuna parte
  // (nessuna keyword, nessun test precedente) e devono lo stesso accendere i
  // muscoli giusti. Se domani si rompe, è la tabella dei movimenti che è da
  // rifare, non questo elenco.

  const APERTI = (nome) => {
    const r = parteDiMuscolo({ nome });
    assert.ok(r.trovata, nome + ': non ha riconosciuto nessun muscolo');
    return righeDaAccendere(r.parte, r.livelli, r.anatomia);
  };
  const pieno = (nome) => APERTI(nome)
    .filter((r) => r.opacita === LIVELLI[LIVELLI.length - 1]);
  const quota = (nome, zona) => {
    const r = parteDiMuscolo({ nome });
    const riga = APERTI(nome).find((x) => x.zona === zona);
    return riga ? riga.opacita : 0;
  };
  const accesi = (nome) => new Set(APERTI(nome).map((r) => r.gruppo));

  // 1. LA REGOLA DI STE: un solo pezzo pieno, e per ogni esercizio del catalogo.
  //    "piu' evidenziati devono essere i muscoli allenanti principali".
  for (const esercizio of CATALOGO) {
    const r = parteDiMuscolo({
      nome: esercizio.nome,
      descrizione: esercizio.nota_permanente || '',
    });
    const pieni = righeDaAccendere(r.parte, r.livelli, r.anatomia)
      .filter((x) => x.opacita === LIVELLI[LIVELLI.length - 1]);
    assert.equal(pieni.length, 1,
      esercizio.nome + ': ' + pieni.length + ' muscoli tutti pieni, deve essercene uno solo '
      + '(' + pieni.map((p) => p.zona).join(', ') + ')');
    assert.equal(pieni[0].zona, r.parte,
      esercizio.nome + ': il muscolo pieno è "' + pieni[0].zona + '" ma quello che '
      + 'l\'esercizio sceglie è "' + r.parte + '"');
  }

  // 2. NESSUN secondario può essere più pieno del principale: questo è il punto,
  //    e vale per ogni riga accesa di ogni esercizio.
  for (const nome of ESERCIZI) {
    const righe = APERTI(nome);
    const massimo = Math.max(...righe.map((r) => r.opacita));
    const via = (r) => r.gruppo === gruppoDiParte(parteDiMuscolo({ nome }).parte)
      ? null : r.zona;
    const peggiore = righe.filter((r) => r.opacita === massimo);
    for (const r of peggiore) {
      assert.ok(via(r) === null,
        nome + ': "' + r.zona + '" è secondario ma è pieno come il principale');
    }
  }

  // 3. LA DOMANDA DI STE SUL REVERSE FLY: "non lavora anche tricipiti o si? o
  //    comunque se lo fa non lo fa principalmente".
  //    Risposta: il gomito sta fermo, i tricipiti tengono l'equilibrio. Quindi
  //    SI accendono — altrimenti la domanda resterebbe senza risposta — ma
  //    all'ultima sfumatura, e il deltoide dietro resta pieno.
  const rev = parteDiMuscolo({ nome: 'One Arm Cable Reverse Fly' });
  assert.equal(rev.parte, 'spalle_posteriori', 'il reverse fly lavora il deltoide dietro');
  assert.ok(accesi('One Arm Cable Reverse Fly').has('tricipite'),
    'sul reverse fly i tricipiti si vedono: Ste li aveva chiesti esplicitamente');
  assert.equal(quota('One Arm Cable Reverse Fly', 'spalla_gomito'), LIVELLI[0],
    'ma sono l\'ultima sfumatura: il gomito è fermo e non sono il motore del movimento');
  assert.equal(pieno('One Arm Cable Reverse Fly').length, 1, 'sul reverse fly un solo pieno');
  assert.equal(pieno('One Arm Cable Reverse Fly')[0].zona, 'spalle_posteriori');

  // 4. LA DOMANDA SUI DIP: petto pieno e tricipiti veri, ma NIENT'ALTRO.
  //    Il deltoide sui dip passa quasi inosservato, e accenderlo sarebbe dire il
  //    contrario di quello che Ste ha chiesto.
  assert.ok(accesi('Dips').has('tricipite'), 'sui dip i tricipiti si accendono');
  assert.ok(!accesi('Dips').has('deltoide_fronte'),
    'sui dip il deltoide non si accende: non è un muscolo del movimento');
  assert.equal(pieno('Dips').length, 1);
  assert.equal(pieno('Dips')[0].zona, 'petto_basso');

  // 5. I NOMI MALE SCRITTI. Nessuno di questi compare in nessuna lista di
  //    parole, eppure devono accendere i muscoli giusti: è la prova che i
  //    secondari non dipendono dal nome.
  const AUTOMATICO = [
    // [nome, muscolo principale, secondari che DEVE accendere]
    ['Incline Dumbbell Press', 'petto_alto', ['tricipite', 'deltoide_fronte']],
    ['Weighted Dip Bar', 'petto_basso', ['tricipite']],
    ['Reverse Pec Deck', 'spalle_posteriori', ['tricipite', 'romboidi']],
    ['45 Gradi Leg Press', 'quadricipite', ['glutei', 'femorale']],
    ['Bassa Trazione Cavo', 'dorso_lati', ['bicipite']],
    ['Cavo Alzate laterali', 'spalle_laterali', []],
    ['Panca militare manubri', 'spalle_frontali', ['tricipite']],
  ];
  for (const [nome, principale, secondari] of AUTOMATICO) {
    const r = parteDiMuscolo({ nome });
    assert.ok(r.trovata, nome + ': nessun muscolo riconosciuto');
    assert.equal(gruppoDiParte(r.parte), gruppoDiParte(principale),
      nome + ': riconosciuto come "' + r.parte + '", non come "' + principale + '"');
    for (const s of secondari) {
      assert.ok(accesi(nome).has(s), nome + ': manca il secondario ' + s);
    }
    assert.equal(pieno(nome).length, 1, nome + ': un solo muscolo pieno');
  }

  // 6. LA PAROLA NON DEVE POTER FARE MALE. Il nome della descrizione di Ste su un
  //    pulldown contiene "panca inclinata": se il movimento si riconoscesse anche
  //    sul testo, quella frase accenderebbe il petto e i tricipiti di una tirata.
  const descritto = parteDiMuscolo({
    nome: 'Trazione verticale al cavo',
    descrizione: 'sto sulla panca inclinata col petto appoggiato e tiro il cavo verso di me',
  });
  assert.ok(!accesi('Trazione verticale al cavo').has('petto'),
    'una tirata non accende il petto nemmeno se la descrizione dice "panca"');
  assert.ok(descritto.trovata, 'e l\'esercizio deve comunque essere riconosciuto');

  // 7. IL FLY NON È UNA SPINTA. È l'unico caso in cui il gomito non si stende:
  //    accendere i tricipiti su un fly sarebbe esattamente l'errore che Ste ha
  //    segnalato con le altre keyword sbagliate.
  assert.ok(!accesi('Cable Fly').has('tricipite'),
    'sul fly i tricipiti non lavorano: il gomito non si stende');

  // 8. LA TABELLA DEI MOVIMENTI È SCRITTA CORRETTA: ogni muscolo che ci mette
  //    dentro deve esistere davvero sulla mappa, e nessuno può essere il pezzo
  //    che l'esercizio sceglie (sennò il pieno salterebbe).
  const conosciuti = new Set(PARTI.map((p) => p.id));
  for (const m of MOVIMENTI) {
    for (const [id, q] of Object.entries(m.secondari || {})) {
      assert.ok(conosciuti.has(id),
        'il movimento ' + m.id + ' mette "' + id + '" tra i muscoli, ma non è un pezzo del corpo');
      assert.ok(q > 0 && q < 1,
        'il movimento ' + m.id + ' dà a "' + id + '" la quota ' + q
        + ': un secondario non può essere né spento né il principale');
      const parteDelSecondario = PARTI.find((p) => p.id === id);
      assert.ok(parteDelSecondario.muscolo !== 'petto' || m.id !== 'tirata_verticale',
        'una tirata non mette il petto fra i suoi muscoli');
    }
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

test('Z14. niente muscoli accenti che non lavorano, e niente secondari fantasma', () => {
  // Ste (15/10/2026), guardando le schede: "il coso che disegna i muscoli evidenzia
  // anche muscoli che non c'entrano e in alcuni esercizi evidenzia piu' forte parti
  // che non sono i principali muscoli di quell'esercizio".
  //
  // Erano due difetti, e qui sotto sono chiusi uno per uno.
  //
  // IL PRIMO: nella mappa dei movimenti c'erano muscoli messi a 0,15 con la frase
  // "sotto la soglia, quindi non si accende". Il codice diceva una cosa e ne faceva
  // un'altra: `anatomia` certifica un secondario come VERO, e un certificato si
  // accende anche sotto soglia (vedi SOGLIA_SECONDARIO). Quindi il trapezio finiva
  // dipinto sulle alzate laterali e il deltoide posteriore sui pushdown. La frase
  // nel commento era quella giusta, il numero no: un secondario o ha una quota sua
  // e si vede, o non si mette.

  const NIENTE = [
    ['Cable Lateral Raise', 'trapezio'],
    ['Dumbbell Lateral Raise', 'trapezio'],
    ['Single Arm Tricep Pushdown', 'deltoide_posteriore'],
    ['Cable Overhead Tricep Extension', 'deltoide_posteriore'],
    ['Bodyweight Overhead Tricep Extension', 'deltoide_posteriore'],
    ['Cable Fly', 'deltoide_fronte'],
  ];
  for (const [nome, gruppo] of NIENTE) {
    const r = parteDiMuscolo({ nome });
    assert.ok(r.trovata, nome + ': esercizio non riconosciuto');
    assert.ok(!gruppiAccesi(figurino(r.parte, r.livelli, r.anatomia)).has(gruppo),
      nome + ': ha acceso ' + gruppo + ', che non è un muscolo di quell\'esercizio');
  }

  // IL SECONDO: il gruppo del deltoide è fatto di due fasce (laterale e anteriore),
  // e quando il secondario era solo la fascia anteriore, quella laterale veniva
  // comunque disegnata sul viola più chiaro. Sul cable fly si vedeva il deltoide
  // LATERALE acceso, che quel movimento non tocca.
  //
  // Non è una sciocchezza visiva: il deltoide laterale è l'esercizio più pesante
  // delle spalle, e accenderlo su una panca racconta che la panca è più difficile
  // di quanto sia. Quindi: un secondario si disegna SOLO nelle fasce che lavorano.
  const petto = parteDiMuscolo({ nome: 'Chest Press' });
  const svgPanca = figurino(petto.parte, petto.livelli, petto.anatomia);
  assert.ok(disegnato(svgPanca, RITAGLI.deltoide_fronte.bande.spalle_frontali[0]),
    'la panca accende il deltoide ANTERIORE, che è quello che spinge in avanti');
  assert.ok(!disegnato(svgPanca, RITAGLI.deltoide_fronte.bande.spalle_laterali[0]),
    'ma NON il deltoide laterale: sulla panca non lavora, e accenderlo dice che '
    + 'l\'esercizio è più difficile di quanto sia');

  // E LA REGOLA OPPOSTA DEVE RESTARE: il gruppo PRINCIPALE si disegna tutto, anche
  // le fasce che lavorano meno. È quello che Ste aveva chiesto per i dip ("segna
  // tutto il petto che è giusto ma allena principalmente la parte bassa"), e qui
  // non deve perdersi mentre si sistema il resto.
  const laterale = parteDiMuscolo({ nome: 'Dumbbell Lateral Raise' });
  const svgLaterale = figurino(laterale.parte, laterale.livelli, laterale.anatomia);
  assert.ok(disegnato(svgLaterale, RITAGLI.deltoide_fronte.bande.spalle_laterali[0]),
    'l\'alzata laterale accende il deltoide laterale, che è il suo muscolo');
  assert.ok(disegnato(svgLaterale, RITAGLI.deltoide_fronte.bande.spalle_frontali[0]),
    'e anche l\'anteriore dello stesso gruppo: sono un muscolo solo nella foto, e '
    + 'accenderne metà sembrerebbe un buco');
  const dips = parteDiMuscolo({ nome: 'Dips' });
  const svgDips = figurino(dips.parte, dips.livelli, dips.anatomia);
  for (const zona of ['petto_alto', 'petto_centrale', 'petto_basso']) {
    assert.ok(disegnato(svgDips, RITAGLI.petto.bande[zona][0]),
      'sui dip si accende tutto il petto (' + zona + '), non solo la parte bassa');
  }

  // INFINE LA PARTE SCRITTA. La scheda dice "LAVORA ANCHE", e se ci mette un muscolo
  // che sulla figura non si vede, il testo mente sul disegno.
  for (const e of CATALOGO) {
    const r = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
    if (!r.trovata) continue;
    const accesi = gruppiAccesi(figurino(r.parte, r.livelli, r.anatomia));
    const accese = righeDaAccendere(r.parte, r.livelli, r.anatomia)
      .filter((x) => x.opacita > 0);
    for (const nome of (r.anche || [])) {
      const pezzo = PARTI.find((p) => p.parte === nome);
      assert.ok(pezzo, e.nome + ': "anche ' + nome + '" non è un pezzo che l\'app conosce');
      const gruppo = gruppoDiParte(pezzo.id);
      if (gruppo === gruppoDiParte(r.parte)) continue;
      assert.ok(accesi.has(gruppo),
        e.nome + ': la scheda scrive "lavora anche ' + nome + '" ma sulla figura '
        + 'quel muscolo non si vede');
    }
    // e il viceversa: niente muscoli accesi che la scheda non nomini, cosi' la
    // riga e il disegno dicono la stessa cosa
    for (const g of accesi) {
      if (g === gruppoDiParte(r.parte)) continue;
      const dentro = accese.some((x) => x.gruppo === g);
      assert.ok(dentro, e.nome + ': sulla figura c\'è ' + g + ' ma nessuna riga dice che cosa sia');
    }
  }
});
// Z15. LA FOTO NON PUO' ESSERE LETTA AL CONTRARIO (15/10/2026).
//
// Ste, due volte di fila sulla stessa cosa:
//   "nei dips c'è segnato evidenziato nella foto l'avambraccio, ma è il tricipite
//    che lavora, anche non l'avambraccio"
//   "nei pull ups ci sono segnati anche tricipiti"
//
// Aveva ragione, e il motivo è scomodo: le foto NON hanno un sistema di
// evidenziazione del muscolo. Sono illustrazioni di pixel e il pezzo chiaro che si
// vede è l'illuminazione del disegno, che cade dove capita. Su 27 foto una sola
// (`incline-single-arm-pulldown`) ha la sagoma chiara disegnata apposta. Quindi la
// foto non può essere la fonte del nome del muscolo, e non basta neanche aggiungere
// un'etichetta in un posto: se manca in una schermata, in quella schermata la foto
// resta ambigua.
//
// QUI SI CONTROLANO DUE COSE.
//  1. che ogni esercizio del catalotto abbia un'etichetta (una riga vuota è un buco:
//     l'esercizio torna a dipendere dal disegno);
//  2. che OGNI posto di app.js che disegna la foto ci metta anche il muscolo. Il
//     controllo è fatto sul sorgente perché il difetto è per l'appunto strutturale:
//     basta aggiungere una settima vista con la foto e dimenticarsi l'etichetta, e
//     qui non se ne accorgerebbe nessuno.
test('Z15. ogni foto ha il nome del muscolo accanto, in ogni schermata', async () => {
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const { parteDiMuscolo, gruppoMuscoloDi } = await import('../src/muscoli-parti.js');

  const conEtichetta = (e) => {
    const r = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
    return Boolean(r.trovata) && Boolean(gruppoMuscoloDi(r.parte));
  };

  // 1. NESSUN ESERCIZIO SENZA ETICHETTA
  const buchi = ESERCIZI.filter((e) => !conEtichetta(e)).map((e) => e.nome);
  assert.deepEqual(buchi, [],
    'ci sono esercizi senza etichetta del muscolo: in quelle schermate la foto resta '
    + `leggibile al contrario. ${buchi.join(', ')}`);

  // 2. OGNI SITO CHE DISEGNA LA FOTO DISEGNA ANCHE IL MUSCOLO
  const src = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const linee = src.split('\n');
  const foto = linee
    .map((riga, i) => ({ riga, n: i + 1 }))
    .filter((x) => /class:\s*'foto-esercizio/.test(x.riga));
  assert.ok(foto.length >= 6,
    `i posti che disegnano la foto dovrebbero essere almeno 6, ne trovo ${foto.length}`);

// La finestra da controllare: dalla riga della foto in giù, finché non finisce il
  // blocco che la contiene. Dodici righe bastano e non si sovrappongono a nessun
  // altro sito (i sei posti sono a 1000, 1310, 1496, 2379, 2595 e 2686: il buco più
  // piccolo fra due siti è di 50 righe, quindi una finestra da dodici non può
  // prendere per suo l'etichetta di un altro posto).
  const FINESTRA = 12;
  const senza = [];
  for (const { riga, n } of foto) {
    const finestra = linee.slice(n - 1, n - 1 + FINESTRA).join('\n');
    if (!/nomeConMuscolo\(|muscoliDiEsercizio\(/.test(finestra)) {
      senza.push(n + ': ' + riga.trim());
    }
  }
  assert.deepEqual(senza, [],
    'ci sono posti che disegnano la foto senza scrivere il muscolo accanto, e in '
    + `quelli la foto si legge al contrario:\n  ${senza.join('\n  ')}`);

  // E IL CONTRARIO: non si può stampare il muscolo senza la foto, sennò il controllo
  // di sopra passerebbe per un motivo sbagliato.
  const chiamate = linee.filter((r) => /nomeConMuscolo\(|muscoliDiEsercizio\(/.test(r)
    && !/function nomeConMuscolo|function muscoliDiEsercizio/.test(r)).length;
  assert.ok(chiamate >= foto.length,
    `i muscoli vengono scritti in ${chiamate} punti e le foto sono in ${foto.length}: `
    + 'qualcuno scrive il muscolo senza la foto, o il controllo di sopra sta guardando '
    + 'la cosa sbagliata');
});
