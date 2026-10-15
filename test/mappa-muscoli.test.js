// mappa-muscoli.test.js -- l'omino non deve sbagliare niente.
//
// Ste (13/10/2026), tre richieste di fila sulla stessa figura:
//  1. "voglio che spunti questo omino con il muscolo allenato colorato di viola";
//  2. "deve essere l'omino come quello nella foto... si deve capire anche fronte
//     e retro e qua non si capisce e i quadratini grigi non mi piacciono";
//  3. "i muscoli formati da piu parti muscolari falli uniti, come nella foto".
//
// Sotto ci sono le regole che non si possono violare e i controlli che le fanno
// rispettare: se un domani si rompe qualcosa, fallisce qui e non sull'app.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ZONE, GRUPPI, figurino, gruppiDiVista, gruppoDiParte, idZonaDaParte, L,
} from '../src/mappa-muscoli.js';
import { PARTI, parteDiMuscolo } from '../src/muscoli-parti.js';

const TUTTE = Object.keys(ZONE);
const GRUPPI_CHIAVI = Object.keys(GRUPPI);

test('Z1. ogni pezzo di muscolo che l\'app riconosce è disegnato', () => {
  for (const p of PARTI) {
    assert.ok(p.id in ZONE, 'il pezzo "' + p.id + '" non è disegnato sulla mappa');
    assert.ok(gruppoDiParte(p.id), 'il pezzo "' + p.id + '" non dice in quale gruppo è disegnato');
  }
  const conosciuti = new Set(PARTI.map((p) => p.id));
  for (const id of TUTTE) {
    assert.ok(conosciuti.has(id), 'la mappa disegna "' + id + '" ma l\'app non lo riconosce');
  }
  // e ogni gruppo disegnato deve essere usato da almeno un pezzo
  for (const g of GRUPPI_CHIAVI) {
    assert.ok(TUTTE.some((id) => ZONE[id].gruppo === g),
      'il gruppo "' + g + '" è disegnato ma nessun pezzo lo usa');
  }
});

test('Z2. ogni gruppo si accende, e si accende solo quello giusto', () => {
  for (const id of TUTTE) {
    assert.equal(idZonaDaParte(id), id, 'la zona ' + id + ' non si accende');
    const gruppo = gruppoDiParte(id);
    for (const vista of ['fronte', 'retro']) {
      const svg = figurino(vista, id);
      const siVede = GRUPPI[gruppo].vista === vista || GRUPPI[gruppo].vista === 'entrambe';
      const acceso = new RegExp('class="muscolo acceso" data-gruppo="' + gruppo + '"');

      if (siVede) {
        assert.match(svg, acceso, id + ' non si accende nella vista ' + vista);
      } else {
        assert.doesNotMatch(svg, acceso, id + ' si accede in una vista dove non si vede');
      }
      const accesi = svg.match(/class="muscolo acceso" data-gruppo="([^"]+)"/g) || [];
      assert.equal(accesi.length, siVede ? 1 : 0,
        'nella vista ' + vista + ' si è acceso qualcosa di più di ' + gruppo);
    }
  }
});

test('Z3. l\'anatomia: i muscoli sono nel posto giusto', () => {
  const vista = (id) => GRUPPI[gruppoDiParte(id)].vista;
  // Il TRICIPITE STA DIETRO. Davanti al braccio non si vede: disegnarlo davanti
  // sarebbe dire che un dip lavora coi bicipiti, che è il contrario del vero.
  assert.equal(vista('spalla_gomito'), 'retro', 'il tricipite si vede solo di dietro');
  assert.equal(vista('braccio_alto'), 'fronte', 'il bicipite si vede davanti');
  assert.equal(vista('braccio_basso'), 'fronte', 'il bicipite si vede davanti');
  assert.equal(vista('addome'), 'fronte', 'gli addomi sono davanti');
  assert.equal(vista('glutei'), 'retro', 'i glutei sono dietro');
  for (const id of ['dorso_alto', 'dorso_centrale', 'dorso_lati', 'femorale', 'polpaccio']) {
    assert.equal(vista(id), 'retro', id + ' si vede solo di dietro');
  }
  for (const id of ['petto_alto', 'petto_centrale', 'petto_basso', 'quadricipite']) {
    assert.equal(vista(id), 'fronte', id + ' si vede solo davanti');
  }
  assert.equal(vista('spalle_laterali'), 'entrambe', 'il deltoide laterale si vede da tutte e due');
  assert.equal(vista('spalle_frontali'), 'fronte', 'il deltoide davanti si vede davanti');
  assert.equal(vista('spalle_posteriori'), 'retro', 'il deltoide dietro si vede dietro');
});

test('Z4. nessun muscolo è disegnato fuori dal corpo', () => {
  const dentro = (punti, da, a, nome) => {
    for (const [x, y] of punti) {
      assert.ok(x >= da && x <= a,
        nome + ' esce dal corpo di lato: x=' + x + ', il corpo sta fra ' + da + ' e ' + a);
      assert.ok(y >= 60 && y <= 300, nome + ' esce dal corpo in alto o in basso: y=' + y);
    }
  };
  for (const g of ['bicipite', 'avambraccio', 'tricipite']) dentro(GRUPPI[g].punti, 38, 64, g);
  for (const g of ['quadricipite', 'femorale', 'polpaccio']) dentro(GRUPPI[g].punti, 4, 34, g);
  for (const g of ['petto']) {
    dentro(GRUPPI[g].punti, 2, 48, g);
    for (const [, y] of GRUPPI[g].punti) {
      assert.ok(y >= 72 && y <= 126, g + ' non sta sul petto: sta a y ' + y);
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
      nome + ': riconosce "' + p.parte + '" ma sulla mappa non c\'è: l\'omino resterebbe grigio');
  }
});

test('Z6. il disegno è simmetrico: il sinistro è lo specchio del destro', () => {
  // nel path i punti NON sono di fila (in mezzo ci sono i comandi di curva),
  // quindi per controllare la simmetria basta il primo punto di ogni sagoma
  const inizioDi = (punti) => 'M ' + (L / 2 + punti[0][0]).toFixed(1) + ',' + punti[0][1].toFixed(1);
  for (const g of GRUPPI_CHIAVI) {
    const gruppo = GRUPPI[g];
    if (gruppo.centrato) continue;
    const specchiato = gruppo.punti.map(([x, y]) => [-x, y]);
    const svg = figurino(gruppo.vista === 'entrambe' ? 'retro' : gruppo.vista, null);
    assert.ok(svg.includes('d="' + inizioDi(specchiato)),
      g + ' non ha il disegno specchiato');
  }
});

test('Z7. fronte e dietro si distinguono, e lo dicono anche', () => {
  // Ste: "si deve capire anche fronte e retro e qua non si capisce".
  const dentro = figurino('fronte', null);
  const dietro = figurino('retro', null);
  assert.match(dentro, /class="volto"/, 'la faccia non c\'è nella figura di fronte');
  assert.doesNotMatch(dietro, /class="volto"/, 'la figura di dietro ha una faccia: impossibile');
  assert.match(dietro, /linee-spina/, 'la spina dorsale non c\'è nella figura di dietro');
  assert.doesNotMatch(dentro, /linee-spina/, 'la spina dorsale c\'è anche davanti: impossibile');
  assert.match(dentro, /linee-fronte/, 'la figura di fronte non ha le sue linee');
  assert.match(dentro, />FRONTE</, 'sotto la figura di fronte non c\'è scritto FRONTE');
  assert.match(dietro, />DIETRO</, 'sotto la figura di dietro non c\'è scritto DIETRO');
});

test('Z8. i muscoli fatti di piu parti sono disegnati UNITI', () => {
  // Ste (13/10/2026): "i muscoli formati da piu parti muscolari falli uniti,
  // come nella foto". Nella foto il pettorale è un pezzo giallo solo, non tre
  // macchie: dentro ci sono delle linee sottili che lo dividono, ma il contorno
  // è uno. Il bicipite idem.
  //
  // Quindi: i pezzi che l'app chiama in modo diverso ma che sono lo stesso
  // muscolo devono stare nello stesso gruppo, e accenderne uno deve accendere
  // tutto il gruppo. Se domani ne aggiungo uno nuovo e gli do un gruppo
  // diverso, qui si vede subito che è sbagliato.
  const UNITI = {
    petto: ['petto_alto', 'petto_centrale', 'petto_basso'],
    bicipite: ['braccio_alto', 'braccio_basso'],
  };
  for (const [gruppo, pezzi] of Object.entries(UNITI)) {
    assert.ok(GRUPPI[gruppo], 'il gruppo ' + gruppo + ' non esiste');
    for (const p of pezzi) {
      assert.equal(ZONE[p].gruppo, gruppo,
        p + ' dovrebbe stare nel gruppo ' + gruppo + ' (stesso muscolo, disegno unito)');
    }
    // e accendere un pezzo deve accendere TUTTO il gruppo, non una parte
    const svg = figurino(GRUPPI[gruppo].vista, pezzi[0]);
    const accesi = svg.match(/class="muscolo acceso" data-gruppo="([^"]+)"/g) || [];
    assert.equal(accesi.length, 1,
      'accendendo ' + pezzi[0] + ' si è acceso solo un pezzo invece di tutto il ' + gruppo);
    assert.match(svg, new RegExp('data-gruppo="' + gruppo + '"'),
      'il gruppo ' + gruppo + ' non si accende');
  }
  // le linee interne non dividono il disegno: sono sottili e bianche
  assert.ok(GRUPPI.petto.linee.length >= 2,
    'il petto è un pezzo solo con dentro le linee che lo dividono: quelle linee ci devono essere');
  assert.ok(GRUPPI.addome.linee.length >= 2,
    'gli addomi sono un pezzo solo con le fette dentro: le linee ci devono essere');
});