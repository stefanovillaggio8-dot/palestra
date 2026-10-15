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
  ETICHETTE, FOTO_L, FOTO_A,
} from '../src/mappa-muscoli.js';
import { PARTI, parteDiMuscolo } from '../src/muscoli-parti.js';

const TUTTE = Object.keys(GRUPPI);
const DISEGNATI = Object.keys(RITAGLI);

// la linea centrale di ogni figura, per controllare la simmetria
const CENTRI = { fronte: 162, retro: 577 };

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
    assert.match(svg, /id="taglio-muscolo"/, id + ': manca il ritaglio');

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
      const esiste = Object.values(RITAGLI).some((altro) =>
        altro.punti_esatto === undefined
        && altro.pezzi.some((p) => JSON.stringify(p) === JSON.stringify(simmetrico)));
      assert.ok(esiste,
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
    for (const pezzo of r.pezzi) {
      const simmetrico = pezzo.map(([x, y]) => [2 * centro - x, y]);
      const stampa = (p) => p.map(([x, y]) => `${x},${y}`).join(' ');
      const svg = figurino(Object.keys(GRUPPI).find((id) => GRUPPI[id].gruppo === g));
      assert.ok(svg.includes('points="' + stampa(simmetrico) + '"'),
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