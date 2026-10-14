// mappa-muscoli.test.js -- l'omino non deve sbagliare l'anatomia.
//
// Ste (13/10/2026): "voglio che spunti questo omino con il muscolo allenato
// colorato di viola... non sbagliare però".
//
// Il "non sbagliare" qui è controllato, non sperato: sotto ci sono le regole
// che non si possono violare (i tricipiti si vedono solo dietro, gli addomi
// solo davanti, e così via) e il controllo che ogni pezzo di muscolo
// riconosciuto dall'app sia davvero disegnato. Se un domani aggiungi un muscolo
// e non gli disegni niente, qui fallisce e te lo dice.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ZONE, figurino, idZonaDaParte, L } from '../src/mappa-muscoli.js';
import { PARTI, parteDiMuscolo } from '../src/muscoli-parti.js';

const TUTTE = Object.keys(ZONE);

test('Z1. ogni pezzo di muscolo che l\'app riconosce è disegnato', () => {
  // Se qui sotto manca qualcosa, sull'app compare un omino tutto grigio e
  // nessuno capisce il perché: il test lo dice prima.
  for (const p of PARTI) {
    assert.ok(p.id in ZONE, 'il pezzo "' + p.id + '" non è disegnato sulla mappa');
  }
  // e non ci sono zone disegnate che l'app non conosce: quelle non si
  // accenderebbero mai e sarebbero solo sporco
  const conosciuti = new Set(PARTI.map((p) => p.id));
  for (const id of TUTTE) {
    assert.ok(conosciuti.has(id), 'la mappa disegna "' + id + '" ma l\'app non lo riconosce');
  }
});

test('Z2. ogni zona si accende, e si accende solo quella giusta', () => {
  for (const id of TUTTE) {
    assert.equal(idZonaDaParte(id), id, 'la zona ' + id + ' non si accende');

    for (const vista of ['fronte', 'retro']) {
      const svg = figurino(vista, id);
      const siVede = ZONE[id].vista === vista || ZONE[id].vista === 'entrambe';
      const segnaposto = new RegExp('class="muscolo acceso" data-muscolo="' + id + '"');

      if (siVede) {
        assert.match(svg, segnaposto, id + ' non si accende nella vista ' + vista);
      } else {
        assert.doesNotMatch(svg, segnaposto,
          id + ' si accende nella vista ' + vista + ', ma quel muscolo non si vede da li');
      }
      // e non deve accendersi nient'altro
      const accesi = svg.match(/class="muscolo acceso" data-muscolo="([^"]+)"/g) || [];
      assert.equal(accesi.length, siVede ? 1 : 0,
        'nella vista ' + vista + ' si è acceso qualcosa di più di ' + id);
    }
  }
});

test('Z3. l\'anatomia: i muscoli sono nel posto giusto', () => {
  const vista = (id) => ZONE[id].vista;
  // Il TRICIPITE STA DIETRO. Davanti al braccio non si vede: disegnarlo davanti
  // sarebbe dire che un dip lavora coi bicipiti, che è il contrario del vero.
  assert.equal(vista('spalla_gomito'), 'retro', 'il tricipite si vede solo di dietro');
  // i bicipiti invece davanti
  assert.equal(vista('braccio_alto'), 'fronte', 'il bicipite si vede davanti');
  assert.equal(vista('braccio_basso'), 'fronte', 'il bicipite si vede davanti');
  // gli addomi solo davanti, i glutei solo dietro
  assert.equal(vista('addome'), 'fronte', 'gli addomi sono davanti');
  assert.equal(vista('glutei'), 'retro', 'i glutei sono dietro');
  // la schiena e il dietro delle gambe solo dietro
  for (const id of ['dorso_alto', 'dorso_centrale', 'dorso_lati', 'femorale', 'polpaccio']) {
    assert.equal(vista(id), 'retro', id + ' si vede solo di dietro');
  }
  // il petto e il davanti delle gambe solo davanti
  for (const id of ['petto_alto', 'petto_centrale', 'petto_basso', 'quadricipite']) {
    assert.equal(vista(id), 'fronte', id + ' si vede solo davanti');
  }
  // il deltoide di lato si vede da entrambi i lati: è la spalla vista di profilo
  assert.equal(vista('spalle_laterali'), 'entrambe', 'il deltoide laterale si vede da tutte e due');
  assert.equal(vista('spalle_frontali'), 'fronte', 'il deltoide davanti si vede davanti');
  assert.equal(vista('spalle_posteriori'), 'retro', 'il deltoide dietro si vede dietro');
});

test('Z4. nessun muscolo è disegnato fuori dal corpo', () => {
  // Le coordinate dei muscoli sono distanze dal CENTRO del corpo, quindi anche
  // i confronti sono su quelle distanze e non su quelle assolute.
  const dentro = (dx, rx, da, a) => dx - rx >= da && dx + rx <= a;

  // il braccio sta fra dx 37 e dx 52
  for (const id of ['braccio_alto', 'braccio_basso', 'avambraccio', 'spalla_gomito']) {
    for (const f of ZONE[id].forme) {
      assert.ok(dentro(f.dx, f.rx, 37, 52),
        id + ' esce dal braccio: centro ' + f.dx + ', raggio ' + f.rx);
    }
  }
  // la gamba sta fra dx 5 e dx 33
  for (const id of ['quadricipite', 'femorale', 'polpaccio']) {
    for (const f of ZONE[id].forme) {
      assert.ok(dentro(f.dx, f.rx, 5, 33),
        id + ' esce dalla gamba: centro ' + f.dx + ', raggio ' + f.rx);
    }
  }
  // il petto sta sopra la cintura, non arriva alle braccia e non scende all'addome
  for (const id of ['petto_alto', 'petto_centrale', 'petto_basso']) {
    for (const f of ZONE[id].forme) {
      assert.ok(dentro(f.dx, f.rx, 2, 37), id + ' non sta sul petto: arriva a dx ' + (f.dx + f.rx));
      assert.ok(f.cy >= 58 && f.cy <= 96, id + ' non sta sul petto: sta a y ' + f.cy);
    }
  }
  // gli addomi non possono salire sul petto
  for (const f of ZONE.addome.forme) {
    assert.ok(f.cy - f.ry >= 96, 'gli addomi salgono sul petto: iniziano a y ' + (f.cy - f.ry));
  }
});

test('Z5. ogni esercizio della scheda accende un muscolo disegnato', () => {
  // Il giro completo: per ogni esercizio, il pezzo che l'app riconosce deve
  // essere uno di quelli disegnati. Se tornasse "non so quale muscolo",
  // sull'app non si accenderebbe niente e io non me ne accorgerei.
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
      nome + ': riconosce "' + p.parte + '" ma sulla mappa non c\'e\': l\'omino resterebbe grigio');
  }
});

test('Z6. il disegno è simmetrico: il sinistro è lo specchio del destro', () => {
  // Se una forma c'è solo da un lato, l'app sta dicendo che l'omino lavora
  // da una parte sola. Le ellissi si cercano con cx, i poligoni con i punti.
  const stampa = (punti) => punti.map(([x, y]) => (L / 2 + x) + ',' + y).join(' ');

  for (const id of TUTTE) {
    for (const f of ZONE[id].forme) {
      if (f.doppio === false) continue;
      // la figura da guardare e' quella dove il muscolo si vede: i dorsali
      // sono dietro, e chiederli alla figura di fronte non ha senso
      const dove = ZONE[id].vista === 'entrambe' ? 'retro' : ZONE[id].vista;
      const svg = figurino(dove, id);
      if (f.tipo === 'ellisse') {
        const destra = svg.match(new RegExp('cx="' + (L / 2 + f.dx) + '"', 'g')) || [];
        const sinistra = svg.match(new RegExp('cx="' + (L / 2 - f.dx) + '"', 'g')) || [];
        assert.ok(destra.length >= 1 && sinistra.length >= 1,
          id + ' c\'è solo da un lato: destra ' + destra.length + ', sinistra ' + sinistra.length);
      } else {
        const specchiato = f.punti.map(([x, y]) => [-x, y]);
        assert.ok(svg.includes('points="' + stampa(specchiato) + '"'),
          id + ' non ha il disegno specchiato: ' + stampa(specchiato));
        assert.ok(svg.includes('points="' + stampa(f.punti) + '"'),
          id + ' non ha il disegno del lato giusto');
      }
    }
  }
});