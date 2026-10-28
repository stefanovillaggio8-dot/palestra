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
import { ATLANTE_FRONTE, ATLANTE_RETRO } from '../src/anatomia-vettoriale.js';
import { zoneAtlante } from '../src/mappa-muscoli.js';


const COLORI_SPENTI = ['#d5d1dc', '#d8d4de', '#efedf2', 'none'];

// le sfumature: quante tappe ha e di che colore
const sfumature = (svg) => {
  const fuori = new Map();
  for (const m of svg.matchAll(/<linearGradient\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/linearGradient>/g)) {
    const tappe = [...m[2].matchAll(/stop-color="([^"]+)"/g)].map((x) => x[1]);
    fuori.set(m[1], tappe);
  }
  return fuori;
};
// I path con fill="url(#...)" sono i muscoli con la SFUMATURA (il pettorale).
// Sono accesi solo se la sfumatura contiene un viola: se i tre capi sono tutti spenti,
// la sfumatura e' del colore del corpo e il muscolo non si vede.
// un colore e' un VIOLA (quindi acceso) se il canale blu e' molto piu' alto del
// rosso. Il grigio del corpo e' quasi neutro, e i grigi spenti non lo sono.
const eViola = (colore) => {
  if (!colore || colore === 'none') return false;
  if (!/^#[0-9a-f]{6}$/i.test(colore)) return false;
  const r = parseInt(colore.slice(1, 3), 16);
  const b = parseInt(colore.slice(5, 7), 16);
  return b - r >= 15;
};
const pathAccesi = (svg) => {
  const tappe = tappeDi(svg);
  return [...svg.matchAll(/<path\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => {
      const fill = (tag.match(/\bfill="([^"]*)"/)?.[1] || '').trim().toLowerCase();
      if (!fill) return false;
      if (fill.startsWith('url(#')) {
        const nome = (fill.match(/url\(#([^)]+)\)/) || [])[1];
        const t = tappe.get(nome) || [];
        return t.some((c) => eViola(c.colore));
      }
      return !COLORI_SPENTI.includes(fill) && eViola(fill);
    });
};
const idAccesi = (svg) => pathAccesi(svg)
  .map((tag) => tag.match(/\bid="([^"]+)"/)?.[1])
  .filter(Boolean);
const fillDi = (svg) => {
  const out = new Map();
  for (const m of svg.matchAll(/<path\b[^>]*>/g)) {
    const id = m[0].match(/\bid="([^"]+)"/)?.[1];
    const fill = m[0].match(/\bfill="([^"]*)"/)?.[1]?.trim().toLowerCase();
    if (id && fill) out.set(id, fill);
  }
  return out;
};
// la pienezza di un colore: 255 - canale rosso. Il grigio base (d5) vale 42, il
// viola pieno (9b) vale 100: quindi PIU' ALTA e' PIU' PIENO.
const pienezzaColore = (colore) => 255 - parseInt(colore.slice(1, 3), 16);

// le tappe di una sfumatura, con la loro posizione
const tappeDi = (svg) => {
  const fuori = new Map();
  for (const m of svg.matchAll(/<linearGradient\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/linearGradient>/g)) {
    fuori.set(m[1], [...m[2].matchAll(/<stop offset="([\d.]+)%" stop-color="([^"]+)"/g)]
      .map((x) => ({ offset: parseFloat(x[1]) / 100, colore: x[2] })));
  }
  return fuori;
};

// la tappa PIU' piena di una sfumatura: quella col viola pieno
const tappaPiena = (tappe) => {
  if (!tappe || !tappe.length) return null;
  let migliore = null;
  for (const t of tappe) {
    if (!eViola(t.colore)) continue;
    if (!migliore || pienezzaColore(t.colore) > pienezzaColore(migliore.colore)) migliore = t;
  }
  return migliore;
};

const pienezzaDi = (svg, id) => {
  const tag = [...svg.matchAll(/<path\b[^>]*>/g)].map((m) => m[0])
    .find((t) => (t.match(/\bid="([^"]+)"/) || [])[1] === id);
  if (!tag) return null;
  const fill = (tag.match(/\bfill="([^"]+)"/) || [])[1] || '';
  // il pettorale e' disegnato con una SFUMATURA: la sua pienezza e' quella della tappa
  // piu' piena, cioe' del pezzo di petto che lavora
  if (fill.startsWith('url(#')) {
    const nome = (fill.match(/url\(#([^)]+)\)/) || [])[1];
    const tappa = tappaPiena((tappeDi(svg).get(nome) || []));
    return tappa ? pienezzaColore(tappa.colore) : null;
  }
  if (fill === 'none' || !fill) return null;
  return pienezzaColore(fill);
};
const ZONE_ATLANTE = new Set();
for (const sorgente of [ATLANTE_FRONTE, ATLANTE_RETRO]) {
  for (const m of sorgente.matchAll(/<path\b[^>]*\bid="([^"]+)"/g)) {
    for (const z of zoneAtlante(m[1])) ZONE_ATLANTE.add(z);
  }
}
const disegnabile = (gruppo) => (RITAGLI[gruppo]?.zone || []).some((z) => ZONE_ATLANTE.has(z));
const pathDiZona = (svg, zona) => {
  const out = [];
  for (const [id, fill] of fillDi(svg)) {
    if (!zoneAtlante(id).includes(zona)) continue;
    if (COLORI_SPENTI.includes(fill)) continue;
    out.push(id);
  }
  return out;
};
const zoneAccese = (svg) => {
  const out = new Set();
  for (const id of idAccesi(svg)) {
    for (const z of zoneAtlante(id)) out.add(z);
  }
  return out;
};
const figureDi = (svg) => svg.match(/<svg\b[\s\S]*?<\/svg>/g) || [];
const idDelGruppo = (gruppo) => [...ATLANTE_FRONTE.matchAll(/<path\b[^>]*\bid="([^"]+)"/g),
  ...ATLANTE_RETRO.matchAll(/<path\b[^>]*\bid="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((id) => zoneAtlante(id).some((z) => RITAGLI[gruppo].zone.includes(z)));

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

test("Z2. si accende il muscolo giusto, e solo quello", () => {
  for (const id of TUTTE) {
    const zona = idZonaDaParte(id);
    assert.ok(zona, 'il pezzo ' + id + ' non si accende');
    const gruppo = gruppoDiParte(id);
    assert.equal(RITAGLI[gruppo].zone.includes(zona), true,
      id + ' porta a una zona che il gruppo non disegna: ' + zona);
    // i muscoli che l\'atlante non disegna restano spenti: non c'è nessun tracciato loro
    if (!disegnabile(gruppo)) continue;

    const svg = figurino(id);
    const accese = zoneAccese(svg);
    assert.ok(accese.has(zona),
      id + ': il pezzo non ha acceso la sua zona (' + zona + ')');

    // e NON deve accendere niente di un altro gruppo
    for (const [altro, r2] of Object.entries(RITAGLI)) {
      if (altro === gruppo) continue;
      if (!disegnabile(altro)) continue;
      for (const zonaAltra of r2.zone) {
        // La zona del PEZZO puo' stare anche in un altro gruppo: e' il caso
        // dell'ALIAS, cioe' due nomi che sulla figura sono un muscolo solo (il
        // brachiale e il bicipite). Quello che non deve accendersi e' una zona
        // DIVERTA da quella del pezzo.
        if (zonaAltra === zona) continue;
        assert.ok(!accese.has(zonaAltra),
          id + ': ha acceso anche ' + altro + '/' + zonaAltra + ', che non c\'entra');
      }
    }
  }

  const vuoto = figurino('pezzo-che-non-esiste');
  assert.equal(idAccesi(vuoto).length, 0,
    'un pezzo sconosciuto ha acceso qualcosa: meglio spento che sbagliato');
});

test('Z3. l\'anatomia: ogni muscolo è nella vista giusta', () => {
  const vista = (id) => vistaDiGruppo(gruppoDiParte(id));
  // Il TRICIPITE STA DIETRO. Davanti al braccio non si vede, e metterlo davanti
  // direbbe che un dip lavora coi bicipiti: il contrario del vero.
  assert.equal(vista('spalla_gomito_alto'), 'retro', 'il capo lungo si vede solo di dietro');
  assert.equal(vista('spalla_gomito_basso'), 'retro', 'e il capo laterale pure');
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

test("Z4. nessun ritaglio esce dalla figura", () => {
  // Nell\'atlante i tracciati sono il disegno anatomico: non possono uscire dal corpo per
  // costruzione, e dentro ci sono anche piedi, mani e ossa, che l\'app non accende.
  //
  // Il controllo che conta è il contrario: ogni muscolo che l\'app ACCENDE deve avere un
  // tracciato suo. Se un gruppo non ha tracciati, l\'app lo accenderebbe e non si vedrebbe
  // niente: il peggior difetto possibile.
  const senzaTracciati = [];
  for (const [g, r] of Object.entries(RITAGLI)) {
    if (!disegnabile(g)) continue;
    if (!idDelGruppo(g).length) senzaTracciati.push(g);
  }
  assert.deepEqual(senzaTracciati, [],
    'questi muscoli non hanno tracciati nell\'atlante: ' + senzaTracciati.join(', '));
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
  'Cable Overhead Tricep Extension', 'Leg Extension', 'Lat Pulldown presa stretta',
  'Dumbbell Bench Pull', 'Seated Dumbbell Shoulder Press', 'Cable Fly',
  'Scott Bench Curl seduto al contrario', 'Single Arm Tricep Pushdown',
  'Seated Leg Curl', 'Smith Machine Incline Bench Press', 'Seated Cable Row',
  'Chest Supported Dumbbell Shrug', 'Sled Press Calf Raise', 'Single Leg Press',
  'One Arm Dumbbell Preacher Curl', 'One Arm Overhead Tricep Extension',
  'One Arm Cable Reverse Fly', 'Trazioni zavorrate', 'Dips zavorrati', 'Wrist Curl',
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

test("Z6. il ritaglio è simmetrico: il sinistro è lo specchio del destro", () => {
  // Nell\'atlante i due lati sono DUE TRACCIATI (pectoralis_major_l e _r): sono disegnati a
  // parte e non sono uno il copia matematica dell\'altro. Quello che conta è che il muscolo
  // ci sia DA ENTRAMBI I LATTI.
  const senzaLato = [];
  for (const [g, r] of Object.entries(RITAGLI)) {
    if (!disegnabile(g)) continue;
    const ids = idDelGruppo(g);
    if (!ids.length) continue;
    const conSx = ids.some((id) => /_l$/.test(id));
    const conDx = ids.some((id) => /_r$/.test(id));
    if (!conSx || !conDx) senzaLato.push(g);
  }
  assert.deepEqual(senzaLato, [],
    'questi muscoli stanno da un lato solo: ' + senzaLato.join(', '));
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

test("Z8. i muscoli fatti di più parti sono uniti, come nella foto", () => {
  // Ste: "i muscoli formati da più parti muscolari falli uniti, come nella foto".
  // Nell\'atlante le fasce di un muscolo stanno sullo STESSO tracciato: il pettorale (tre
  // fasce) e il bicipite (due posizioni) sono un pezzo solo, come nella foto.
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
    const svg = figurino(pezzi[0]);
    const accese = zoneAccese(svg);
    for (const z of RITAGLI[gruppo].zone) {
      assert.ok(accese.has(z),
        'accendendo ' + pezzi[0] + ' non si è acceso tutto il ' + gruppo + ' (zona ' + z + ')');
    }
  }

  // IL LIMITE DA DIRE (19/10/2026). Il pettorale è un TRACCIATO UNICO: le tre fasce
  // stanno dentro lo stesso path, quindi la sfumatura interna (la parte che lavora di piu'
  // più piena) non si vede piu'. Non si inventa niente: si lascia così e si dice.
  const pathsPetto = [...ATLANTE_FRONTE.matchAll(/<path\b[^>]*\bid="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((id) => /^pectoralis_major_/.test(id));
  assert.equal(pathsPetto.length, 2,
    'il pettorale è un tracciato per lato: non se ne aggiungono altri con bande inventate');
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

// Le fasce devono riempire la sagoma (niente buchi) e non sbordare (niente
  // orecchi).
  //
  // DAL 16/10 LO STACCO E' ZERO. Prima ogni fascia veniva stringuta di 1,5 pixel e le
  // fasce di uno stesso muscolo si toccavano ma non si somnavano del tutto. Ste: "il
  // brachioradiale è attaccato al bicipite no? devi farli bene le fasce muscolari":
  // la fessura grigia di 3 pixel fra due muscoli attaccati li faceva sembrare sconnessi.
  // Ora le fasce si toccano esattamente e la separazione la fa una linea (vedi
  // `figurino`), quindi le fasce sommano ESATTAMENTE la sagoma.
  //
  // Per questo il confronto ha una tolleranza minima (1 px quadrato): i vertici sono
  // arrotondati a due decimali e il totale può valere qualche decimo più della
  // sagoma senza che ci sia un orecchio. Un orecchio vero fa centinaia di px.
  //
  // Qui si controllano i due difetti veri: le fasce non possono superare la sagoma
  // (orecchio) e non possono scendere sotto il 70% (buco vero).
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
    const tenuto = somma / intera;
    // la tolleranza di 1 px² è per l'arrotondamento dei vertici: vedi la nota sopra
    assert.ok(somma <= intera + 1,
      gruppo + ': le fasce sommano ' + Math.round(somma) + ' ma la sagoma è solo '
      + Math.round(intera) + ': le fasce sbordano, si vedrebbe un orecchio');
    assert.ok(tenuto >= 0.7,
      gruppo + ': le fasce coprono solo il ' + Math.round(tenuto * 100) + '% della sagoma '
      + '(' + Math.round(somma) + ' su ' + Math.round(intera) + '): sul muscolo ci '
      + 'sarebbe un buco');
  }
});

test("Z10. quanto lavora: la parte più allenata è più piena, le altre più chiare", () => {
  // Ste (15/10/2026): "la parte che lavora di più deve essere più evidenziata, la parte
  // che lavora di meno deve essere evidenziata più chiara".
  //
  // Nell\'atlante l\'intensita' è sul riempimento DIRETTO del tracciato: il principale
  // prende un viola pieno, il secondario un viola più chiaro. La pienezza si legge dal
  // canale rosso del fill (il grigio base è d5, il viola pieno è 9b).
  const petto = parteDiMuscolo({ nome: 'Chest Press' });
  const svgPanca = figurino(petto.parte, petto.livelli, petto.anatomia);
  const gruppoPrincipale = gruppoDiParte(petto.parte);

  const pieniPrincipale = idAccesi(svgPanca)
    .filter((id) => zoneAtlante(id).some((z) => RITAGLI[gruppoPrincipale].zone.includes(z)))
    .map((id) => pienezzaDi(svgPanca, id))
    .filter((v) => v !== null);
  assert.ok(pieniPrincipale.length > 0, 'la panca non accende il muscolo principale');

  // ogni secondario acceso deve essere PIU' CHIARO del principale
  for (const altro of Object.keys(RITAGLI)) {
    if (altro === gruppoPrincipale) continue;
    if (!disegnabile(altro)) continue;
    const zone = RITAGLI[altro].zone.filter((z) => zoneAccese(svgPanca).has(z));
    if (!zone.length) continue;
    for (const id of idAccesi(svgPanca)) {
      if (!zoneAtlante(id).some((z) => zone.includes(z))) continue;
      const p = pienezzaDi(svgPanca, id);
      if (p === null) continue;
      assert.ok(p < Math.max(...pieniPrincipale),
        'il secondario ' + altro + ' è più pieno del principale: i colori sono invertiti');
    }
  }
});

test("Z11. anche i muscoli secondari, ma solo quelli veri", () => {
  // Ste (15/10/2026): "i dips non fanno anche tricipiti?". Si': i dip schiacciano il peso
  // su braccia estese, i tricipiti sono li' accanto. Quindi si accendono.
  const dips = parteDiMuscolo({ nome: 'Dips zavorrati' });
  const svgDips = figurino(dips.parte, dips.livelli, dips.anatomia);
  const acceseDips = zoneAccese(svgDips);
  assert.ok(RITAGLI.petto.zone.some((z) => acceseDips.has(z)),
    'i dip devono accendere il petto');
  assert.ok(RITAGLI.tricipite.zone.some((z) => acceseDips.has(z)),
    'i dip allenano anche i tricipiti: non si vedono sulla figura');
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
    // idZonaDaParte tiene conto dell'ALIAS: il brachiale e il bicipite sono due
    // nomi che sulla figura sono un muscolo solo, quindi le zone devono coincidere
    // DOPO l'alias, non prima.
    assert.equal(pieni[0].zona, idZonaDaParte(r.parte),
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
  assert.equal(quota('One Arm Cable Reverse Fly', 'spalla_gomito_alto'), LIVELLI[0],
    'ma sono l\'ultima sfumatura: il gomito è fermo e non sono il motore del movimento');
  assert.equal(pieno('One Arm Cable Reverse Fly').length, 1, 'sul reverse fly un solo pieno');
  assert.equal(pieno('One Arm Cable Reverse Fly')[0].zona, 'spalle_posteriori');

  // 4. LA DOMANDA SUI DIP: petto pieno e tricipiti veri, ma NIENT'ALTRO.
  //    Il deltoide sui dip passa quasi inosservato, e accenderlo sarebbe dire il
  //    contrario di quello che Ste ha chiesto.
  assert.ok(accesi('Dips zavorrati').has('tricipite'), 'sui dip i tricipiti si accendono');
  assert.ok(!accesi('Dips zavorrati').has('deltoide_fronte'),
    'sui dip il deltoide non si accende: non è un muscolo del movimento');
  assert.equal(pieno('Dips zavorrati').length, 1);
  assert.equal(pieno('Dips zavorrati')[0].zona, 'petto_basso');

  // 5. I NOMI MALE SCRITTI. Nessuno di questi compare in nessuna lista di
  //    parole, eppure devono accendere i muscoli giusti: è la prova che i
  //    secondari non dipendono dal nome.
  const AUTOMATICO = [
    // [nome, muscolo principale, secondari che DEVE accendere]
    ['Incline Dumbbell Press', 'petto_alto', ['tricipite', 'deltoide_fronte']],
    ['Weighted Dip Bar', 'petto_basso', ['tricipite']],
    // Ste (16/10/2026): "one arm cable reverse fly fa deltoide anteriore non il
    // centro schiena". Sul centro schiena ha ragione: il reverse fly muove le braccia
    // e non tira la parte centrale della schiena, ed era un secondario messo lì "per
    // completezza". Quindi qui i secondari sono solo i tricipiti, all'ultima sfumatura.
    ['Reverse Pec Deck', 'spalle_posteriori', ['tricipite']],
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

test("Z9. la figura è un SVG valido, o il muscolo non si accende", () => {
  // Ste (15/10/2026): "ma non si vede il muscolo evidenziato in nessun esercizio". Il
  // colpevole era un attributo scritto come se fosse un elemento: il browser lo ignorava e
  // la figura usciva tutta apagata. Con l\'atlante non c'è più la maschera, ma il
  // controllo resta: la figura deve essere un SVG VALIDO.
  for (const id of TUTTE) {
    const svg = figurino(id);
    // ogni <path> deve chiudersi da solo. Si contano i path chiusi, NON tutte le
    // chiusure: la sfumatura del pettorale aggiunge dei <stop/> che non sono path
    const apertiPath = (svg.match(/<path\b/g) || []).length;
    const chiusiPath = (svg.match(/<path\b[^>]*\/>/g) || []).length;
    assert.equal(apertiPath, chiusiPath,
      id + ': ci sono ' + apertiPath + ' <path> e ' + chiusiPath + ' chiusi');

    for (const figura of figureDi(svg)) {
      const apertiSvg = (figura.match(/<svg\b/g) || []).length;
      const chiusiSvg = (figura.match(/<\/svg>/g) || []).length;
      assert.equal(apertiSvg, chiusiSvg, id + ': la figura non è chiusa');
      const ids = [...figura.matchAll(/<path\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(new Set(ids).size, ids.length,
        id + ': due tracciati hanno lo stesso id: la seconda mostrerebbe il muscolo della prima');
    }

    for (const tag of pathAccesi(svg)) {
      assert.ok(/\bid="[^"]+"/.test(tag), id + ': un tracciato acceso non ha id');
      assert.ok(/\bfill="[^"]+"/.test(tag), id + ': un tracciato acceso non ha fill');
    }
  }
});

test("Z14. niente muscoli accenti che non lavorano, e niente secondari fantasma", () => {
  const NIENTE = [
    ['Cable Lateral Raise', 'trapezio'],
    ['Dumbbell Lateral Raise', 'trapezio'],
    ['Single Arm Tricep Pushdown', 'deltoide_posteriore'],
    ['Cable Overhead Tricep Extension', 'deltoide_posteriore'],
    ['One Arm Overhead Tricep Extension', 'deltoide_posteriore'],
    ['Cable Fly', 'deltoide_fronte'],
  ];
  for (const [nome, gruppo] of NIENTE) {
    const r = parteDiMuscolo({ nome });
    assert.ok(r.trovata, nome + ': esercizio non riconosciuto');
    const accese = zoneAccese(figurino(r.parte, r.livelli, r.anatomia));
    for (const z of RITAGLI[gruppo].zone) {
      assert.ok(!accese.has(z),
        nome + ': ha acceso ' + gruppo + '/' + z + ', che non è un muscolo di quell\'esercizio');
    }
  }

  // il deltoide laterale è l\'esercizio più pesante delle spalle: accenderlo su una panca
  // racconta che la panca è più difficile di quanto sia
  const petto = parteDiMuscolo({ nome: 'Chest Press' });
  const accesaPanca = idAccesi(figurino(petto.parte, petto.livelli, petto.anatomia));
  assert.ok(accesaPanca.some((id) => /^anterior_deltoid_/.test(id)),
    'la panca accende il deltoide ANTERIORE, che è quello che spinge in avanti');
  assert.ok(!accesaPanca.some((id) => /^lateral_deltoid_/.test(id)),
    'ma NON il deltoide laterale: sulla panca non lavora');

  // l\'alzata laterale accende il deltoide LATERALE
  const laterale = parteDiMuscolo({ nome: 'Dumbbell Lateral Raise' });
  const accesaLaterale = idAccesi(figurino(laterale.parte, laterale.livelli, laterale.anatomia));
  assert.ok(accesaLaterale.some((id) => /^lateral_deltoid_/.test(id)),
    'l\'alzata laterale accende il deltoide laterale, che è il suo muscolo');
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

// Z16. SU UNA TIRATA IN BASSO NON LAVORANO I TRAPEZI, E I LOMBARI NO (15/10/2026).
//
// Ste, guardando la figura del pulley: "i trapezi dove? nel pulley non lavorano i
// trapezi". Aveva ragione. Qui il movimento `tirata_verticale` accendeva anche
// `dorso_alto` al 30%, cioe' la fascia fra collo e spalle: un secondario messo li'
// per completezza, che non si vedeva e non c'era.
//
// E i LOMBARI non sono un errore da correggere: Ste ha spiegato perché è giusto che
// non ci siano. "il pulley fa dorsali, i lombari stanno in isometria, e i bicipiti
// pure lavorano perche' è di tirata". Un muscolo in ISOMETRIA tiene senza
// accorciarsi: non produce movimento e non si dipinge. Su un pulley col fermo coscia i
// lombari sono scaricati due volte, dalla posizione seduta e dal fermo.
//
// Quindi su una tirata in basso restano due muscoli: i latini (principale, presi
// dalle parole) e il bicipite. Questo test lo blocca.
test('Z16. nessun trapezio e nessun lombare sulle tirate in basso', async () => {
  const { parteDiMuscolo, gruppoMuscoloDi } = await import('../src/muscoli-parti.js');

  // Tutti gli esercizi che il riconoscitore manda al movimento tirata_verticale.
  const TIRATE_IN_BASSO = [
    'Trazioni zavorrate', 'Lat Pulldown presa stretta', 'Lat Pulldown (lats)',
    'Incline Single Arm Pulldown', 'Neutral Grip Pulldown', 'Pullover',
  ];
  for (const nome of TIRATE_IN_BASSO) {
    const r = parteDiMuscolo({ nome });
    assert.ok(r.trovata, `${nome}: l'esercizio deve essere riconosciuto`);
    assert.equal(r.movimento, 'tirata_verticale',
      `${nome}: deve essere una tirata in basso, non "${r.movimento}"`);

    const accesi = [r.parte, ...(r.ancheDettaglio || []).map((x) => x.id)];
    const gruppi = accesi.map(gruppoMuscoloDi);

    // I trapezi non ci sono: Ste li ha guardati e non ci sono sul pulley.
    assert.ok(!gruppi.includes('trapezio'),
      `${nome}: il trapezio non lavora su una tirata in basso, ma è acceso`);
    assert.ok(!accesi.includes('dorso_alto'),
      `${nome}: la fascia alta della schiena non si accende`);

    // E i lombari non ci sono perché stanno in isometria. La figura non ha quella
    // zona, e questo test verifica che nessun movimento la accenda "per completezza".
    assert.ok(!accesi.includes('lombari'),
      `${nome}: i lombari stanno in isometria e non si dipingono`);

    // Resta il bicipite, perché è una tirata: il gomito si piega e lo piega lui.
    assert.ok(gruppi.includes('bicipite'),
      `${nome}: su una tirata lavora anche il bicipite`);
  }

  // E il generale: nessun esercizio del catalogo accende i trapezi "per completezza".
  // Lo shrug e le spinte in sù sì, e devono: lì il trapezio è il movimento.
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  for (const e of ESERCIZI) {
    const r = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
    if (!r.trovata) continue;
    const gruppi = [r.parte, ...(r.ancheDettaglio || []).map((x) => x.id)].map(gruppoMuscoloDi);
    if (!gruppi.includes('trapezio')) continue;
    // se c'e' il trapezio deve essere per una tirata ALTA o per uno shrug, non per un
    // movimento in basso: l'altro caso è quello che Ste ha segnalato
    assert.notEqual(r.movimento, 'tirata_verticale',
      `${e.nome}: il trapezio è acceso ma il movimento è una tirata in basso`);
  }
});

// Z18. IL TRICIPITE NON PUO' SCENDERE SOTTO IL GOMITO (16/10/2026).
//
// Ste, due volte sulla stessa cosa, e la seconda con la foto anatomica accanto:
//   "i dips sono evidenziati gli avambracci"
//   "ma non vedi che segna anche l'avambraccio? deve segnare il tricipite"
//
// Aveva ragione, e per due volte io avevo risposto spostando la sagoma un po' piu'
// in su. Non era la strada giusta, perche' il problema non e' DOVE finisce il
// pezzo ma COSA c'e' sotto: la figura ha il braccio diviso in tre pezzi —
//
//   spalla     fino a y~368
//   BRACCIO    368-403
//   AVAMBRACCIO 403-452
//   mano       dopo
//
// e io avevo messo il tricipite fino a y=440, cioe' 37 pixel di avambraccio
// accesi insieme al muscolo. Spostarlo non bastava: finche' il pezzo scende
// sotto il gomito, metà di quello che si vede acceso è un avambraccio.
//
// PERCHE' Y=403 E NON UN NUMERO MIO. Perche' la figura di FRONTE ha gia' la
// fascia dell'avambraccio, e parte a y=402: il gomito e' li'. E' l'unico
// riferimento che non devo indovinare, perche' l'ha disegnato lo stesso artista
// sullo stesso corpo.
//
// QUI SI CONTROLLA QUELLO, e non un numero scritto a mano: il tricipite deve
// finire PRIMA (o coincide) dove comincia l'avambraccio.
test("Z18: il tricipite non scende sotto il gomito, e il gomito non si indovina", () => {
  // Ste, due volte sulla stessa cosa: "i dips sono evidenziati gli avambracci" e "ma non
  // vedi che segna anche l\'avambraccio? deve segnare il tricipite".
  //
  // Nell\'atlante il gomito è il confine fra i tracciati del braccio e quelli
  // dell\'avambraccio: sono tracciati DIVERSI, quindi non può accendersi l\'avambraccio
  // insieme al tricipite. Il controllo è sulle zone, non sui pixel.
  const tricipite = parteDiMuscolo({ nome: 'Single Arm Tricep Pushdown' });
  const accese = zoneAccese(figurino(tricipite.parte, tricipite.livelli, tricipite.anatomia));
  assert.ok(RITAGLI.tricipite.zone.some((z) => accese.has(z)),
    'il pushdown deve accendere il tricipite');
  assert.ok(!RITAGLI.avambraccio.zone.some((z) => accese.has(z)),
    'l\'avambraccio non deve accendersi insieme al tricipite: e\' il gomito che lo separa');

  // E DUE MUSCOLI DIVERSI NON SI SOVRAPPONGONO. Questo controllo in passato ha scoperto un
  // bug VERO (i dorsali invadevano il tricipite), quindi non si allenta: si rifa sul
  // modello NUOVO.
  //
  // Due gruppi diversi non possono condividere un tracciato: se lo condividessero,
  // accendendo uno accenderebbe anche l\'altro, e la figura mostrerebbe due muscoli uno
  // sopra l\'altro.
  const perZona = new Map();
  for (const sorgente of [ATLANTE_FRONTE, ATLANTE_RETRO]) {
    for (const m of sorgente.matchAll(/<path\b[^>]*\bid="([^"]+)"/g)) {
      for (const z of zoneAtlante(m[1])) {
        if (!perZona.has(z)) perZona.set(z, new Set());
        perZona.get(z).add(m[1]);
      }
    }
  }
  const condivisi = [];
  for (const [g, r] of Object.entries(RITAGLI)) {
    if (!disegnabile(g)) continue;
    for (const z of r.zone) {
      if (!perZona.has(z)) continue;
      for (const [g2, r2] of Object.entries(RITAGLI)) {
        if (g2 === g) continue;
        if (!disegnabile(g2)) continue;
        for (const z2 of r2.zone) {
          if (z2 === z) continue;
          if (!perZona.has(z2)) continue;
          const comune = [...perZona.get(z)].filter((id) => perZona.get(z2).has(id));
          if (comune.length) condivisi.push(g + '/' + z + ' e ' + g2 + '/' + z2 + ': ' + comune.join(', '));
        }
      }
    }
  }
  assert.deepEqual(condivisi, [],
    'due muscoli diversi condividono un tracciato: ' + condivisi.join('; '));
});

// Z21. NOME E DESCRIZIONE NON SI INCOLLANO MAI (16/10/2026).
//
// Ste: "il bicipite/brachiale e altre cose non sono divise". Il sintomo era che sul
// Cable Hammer Curl si accendevano bicipite e brachiale insieme. La figura era
// innocente: era il CLASSIFICATORE.
//
// Il classificatore, quando una frase non la trova, toglie le parole dell'attrezzo e
// riprova (serve per "Incline Dumbbell Press" -> "incline press"). Ma lo faceva sul
// testo UNITO di nome e descrizione:
//
//   "Cable Hammer Curl" + "Cavo basso, alla cavigliera"
//   tolte le parole dell'attrezzo -> "hammer curl basso"
//   e "hammer curl basso" CONTIENE "curl basso"
//
// quindi il martello veniva riconosciuto come braccio BASSO invece che come
// brachiale, e sull'app si accendevano due muscoli che insieme non hanno senso.
//
// Qui si controlla che una frase non possa mai nascere dal confine fra nome e
// descrizione: si mettono due mezzi che, uniti e ripuliti, farebbero una frase
// esistente, e si pretende che il classificatore NON la trovi.
test('Z21: il classificatore non inventa frasi attaccando nome e descrizione', () => {
  // il caso vero, con la descrizione esatta del catalogo
  const martello = parteDiMuscolo({
    nome: 'Cable Hammer Curl',
    descrizione: 'Cavo basso, alla cavigliera.',
  });
  assert.equal(martello.parte, 'brachiale',
    'il Cable Hammer Curl lavora il brachiale, non il braccio basso: '
    + '"cavo basso" non è un "curl basso"');
  assert.ok(!Object.keys(martello.livelli).includes('braccio_basso'),
    'il martello non deve accendere il bicipite basso');

  // e la forma generale del guaio: due mezzi che uniti fanno una frase vera
  const inventato = parteDiMuscolo({
    nome: 'Cable Hammer Curl',
    descrizione: 'Cavo basso',
  });
  assert.equal(inventato.parte, 'brachiale',
    '"Cable Hammer Curl" + "Cavo basso" non può diventare "curl basso"');

  // e il rovescio: una frase che sta DAVVERO nel nome deve continuare a funzionare,
  // perché il riprovo senza accessori è quello che rende "Incline Dumbbell Press"
  // riconoscibile come panca inclinata
  const incline = parteDiMuscolo({
    nome: 'Incline Dumbbell Press',
    descrizione: '',
  });
  assert.equal(incline.parte, 'petto_alto',
    'il riprovo senza parole dell\'attrezzo deve continuare a funzionare: '
    + '"Incline Dumbbell Press" è "incline press"');
});

// Z20. IL REMATORE E' DORSALE, IL CENTRO SCHIENA E' DELLA TIRATA IN BASSO (16/10/2026).
//
// Ste: "il seated cable row non fa centro schiena principalmente, fa i dorsali e
// non fa proprio il centro schiena, sarebbe il pulley".
//
// Il difetto era una parola nel posto sbagliato, e i numeri lo nascondevano
// perche' sembravano giusti: "row", "rematore" e "tiremento" erano dentro
// `dorso_centrale`, quindi ogni rematore prendeva il CENTRO SCHIENA come muscolo
// pieno e i dorsali restavano in seconda fascia. Sulla scheda si leggeva
// "dorso centrale" pieno e dorsali accesi: il contrario di quello che fa.
//
// Qui si controllano tre cose, e tutte e tre erano sbagliate prima:
//  1. il rematore ha i DORSALI pieni, e non il centro schiena;
//  2. il centro schiena NON compare affatto sul rematore, nemmeno in secondo fascia;
//  3. e sulla tirata in basso NON c'e': sul pull up e sul lat pulldown fanno i
  //     dorsali, non il centro schiena.
//
// La terza cosa e' l'opposto di quello che avevo scritto prima: Ste, 16/10/2026,
// "il pull up e lat pulldown fanno dorsali", cioe' senza centro schiena. Avevo
// capito al contrario che il centro schiena dovesse passare sul pulley, e l'avevo
// aggiunto. Il centro schiena resta al bench pull prono e al reverse fly, che
// li lavorano davvero.
test('Z20: dorsali primari nelle tirate, retrazione scapolare nei rematori', () => {
  const righeDi = (nome) => {
    const r = parteDiMuscolo({ nome });
    assert.ok(r.trovata, nome + ': non ha riconosciuto nessun muscolo');
    return righeDaAccendere(r.parte, r.livelli, r.anatomia);
  };
  const gruppi = (righe) => new Set(righe.map((r) => r.gruppo));
  const pieno = (righe) => righe.find((r) => r.opacita === 1);

  // le due tirate: dorsali pieni, niente centro schiena
  for (const nome of ['Seated Cable Row', 'Seated Dumbbell Row',
    'Lat Pulldown', 'Trazioni zavorrate', 'Neutral Grip Lat Pulldown',
    'Incline Single Arm Pulldown']) {
    const righe = righeDi(nome);
    assert.equal(pieno(righe)?.gruppo, 'dorsale',
      `${nome}: il muscolo pieno è "${pieno(righe)?.gruppo}", e deve essere il dorso largo`);
    // Revisione anatomica v328: la retrazione scapolare del rematore coinvolge
    // il trapezio medio e i romboidi; non cambia il dorsale primario né i Rank.
    assert.equal(gruppi(righe).has('romboidi'), nome.includes('Row'), nome);
    if (nome.includes('Row')) assert.ok(righe.find(r => r.gruppo === 'romboidi').opacita < 1);

  }

  // il bicipite resta su tutte le tirate: e' una tirata, il gomito si piega
  for (const nome of ['Lat Pulldown', 'Seated Cable Row']) {
    assert.ok(gruppi(righeDi(nome)).has('bicipite'),
      `${nome}: il bicipite resta, è una tirata e chi piega il gomito è lui`);
  }

  // E la tirata prona coi manubri tiene la sua scelta dell'08/10: centro schiena pieno
  const bench = righeDi('Dumbbell Bench Pull');
  assert.equal(pieno(bench)?.gruppo, 'romboidi',
    'il Dumbbell Bench Pull resta centro schiena pieno: e\' la decisione dell\'08/10 '
    + 'e non si tocca insieme al rematore');
});

test('Z22: il brachioradiale sul martello, e l\'avambraccio solo sul polso', () => {
  // Ste, 16/10/2026: "l'hammer curl non fa anche il brachioradiale?". Ha ragione:
  // in presa neutra il gomito si piega per il brachiale e il brachioradiale, e il
  // bicipite resta un terzo motore solo perche' diventa pronatore.
  //
  // Prima il codice diceva il contrario ("il brachioradiale non e' quello disegnato
  // qui: meglio acceso niente che acceso il muscolo sbagliato") e lasciava spento
  // anche l'avambraccio perche', diceva, piega il polso e in un curl non lavora.
  const righeDi = (nome) => {
    const e = CATALOGO.find((x) => x.nome === nome);
    const r = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
    assert.ok(r.trovata, nome + ': non ha riconosciuto nessun muscolo');
    return righeDaAccendere(r.parte, r.livelli, r.anatomia);
  };
  const gruppi = (righe) => new Set(righe.map((r) => r.gruppo));
  const pieno = (righe) => righe.find((r) => r.opacita === 1);

  // IL MARTELLO (Ste, 18/10/2026).
  //
  // "deve evidenziare di piu' quello che ora e' evidenziato di meno, e evidenziare di
  // meno quello che e' evidenziato di piu' ora". Il braciale non si disegna (e' profondo
  // sotto al bicipite), quindi il muscolo che si VEDE nel martello e' il
  // brachioradiale, quello dell'avambraccio: e' lui il viola pieno. Il bicipite, che
  // in presa neutra e' un pronatore e perde forza, resta un supporto.
  const martello = righeDi('Cable Hammer Curl');
  assert.equal(pieno(martello)?.gruppo, 'brachiale',
    'Cable Hammer Curl: il pieno deve essere del gruppo del brachiale');
  assert.equal(pieno(martello)?.zona, 'brachioradiale',
    'Cable Hammer Curl: il viola pieno va sul BRACHIORADIALE, l\'avambraccio');
  assert.ok(gruppi(martello).has('bicipite'),
    'Cable Hammer Curl: il bicipite deve accendersi, ma come supporto');
  const bicipiteMartello = martello.find((x) => x.gruppo === 'bicipite');
  assert.ok(bicipiteMartello && bicipiteMartello.opacita < 1,
    'Cable Hammer Curl: il bicipite non deve essere pieno, ma un supporto');

  // l'avambraccio piega il POLSO: in un curl non lavora e resta spento
  for (const nome of ['Cable Hammer Curl', 'One Arm Dumbbell Preacher Curl']) {
    assert.ok(!gruppi(righeDi(nome)).has('avambraccio'),
      nome + ': l\'avambraccio piega il polso e su un curl non deve accendersi');
  }

  // il wrist curl e' l'avambraccio puro: il brachioradiale NON e' il suo muscolo
  const polso = righeDi('Wrist Curl');
  assert.equal(pieno(polso)?.gruppo, 'avambraccio',
    'Wrist Curl: il pieno deve essere l\'avambraccio');
  assert.ok(!gruppi(polso).has('brachioradiale'),
    'Wrist Curl: il brachioradiale sta spento, il lavoro e\' del piegatore del polso');

  // i due muscoli sono pezzi DIVERSI: non possono accendersi insieme sulla stessa
  // scheda, altrimenti la figura mostrerebbe due muscoli sovrapposti
  assert.ok(!gruppi(martello).has('avambraccio') && !gruppi(polso).has('brachioradiale'),
    'avambraccio e brachioradiale non devono mai accendersi insieme');
});

test("Z23: la linea di contorno non può uscire dal corpo", () => {
  // Ste, due volte: "in alcune parti ci sono delle linee bianche che sono fuori dal
  // corpo" e, dopo il primo tentativo, "ancora si vedono quelle linee di fuori".
  //
  // Con l\'atlante vettoriale la linea di contorno E' il tracciato anatomico: segue il
  // bordo del muscolo, quindi non può uscire dal corpo per costruzione, e la maschera non
  // serve piu'. Il controllo che resta è che la figura contenga il corpo.
  for (const id of TUTTE) {
    const svg = figurino(id);
    assert.ok(/<path/.test(svg), id + ': la figura non ha tracciati');
    assert.equal(figureDi(svg).length, 2,
      id + ': la figura deve avere il fronte e il dietro');
  }
});


// ---------------------------------------------------------------------------
// IL PETTORALE IN TRE FASI (Ste, 18/10/2026)
// ---------------------------------------------------------------------------

test('Z21: il pettorale si divide in tre, e si vede quale parte lavora', async () => {
  // Ste (18/10/2026): "il petto era diviso in 3, che segnava quando era petto alto, petto
  // basso o petto in mezzo" e poi "i fasci sono storti e fatti male".
  //
  // Il pettorale e' UN path solo (quello di Ryan Graves), quindi non si puo' accendere "la
  // zona giusta": si disegna UNA volta sola, con una sfumatura che va dal chiaro al pieno
  // lungo la direzione delle fibre. I tre capi sono le tre tappe della sfumatura, e la
  // tappa PIENA deve cadere sul capo che l'esercizio sta lavorando.
  const { figurino } = await import('../src/mappa-muscoli.js');
  const { parteDiMuscolo } = await import('../src/muscoli-parti.js');

  // LE FASCE DEL PETTORALE (Ste, 18/10/2026).
  //
  // "il petto viene evidenziato poco e non evidenzia le fasce muscolari
  // corrispondenti": ogni capo e' una fascia PIENA, quindi si controlla in QUALE fascia
  // cade la parte piena, e non in che punto esatto.
  const FASCE = {
    petto_alto: [0, 0.30],
    petto_centrale: [0.30, 0.74],
    petto_basso: [0.74, 1],
  };
  const nellaFascia = (offset, zona) => offset >= FASCE[zona][0] - 0.001
    && offset <= FASCE[zona][1] + 0.001;

  const pienoDi = (nome) => {
    const p = parteDiMuscolo({ nome });
    const svg = figurino(p.parte, p.livelli, p.anatomia);
    const tappe = [...tappeDi(svg).values()][0] || [];
    const piena = tappaPiena(tappe);
    assert.ok(piena, nome + ': il pettorale deve avere una parte piena');
    // la zona che l'esercizio sta lavorando
    const zona = Object.entries(p.livelli || {})
      .sort((a, b) => (b[1]?.livello || 0) - (a[1]?.livello || 0))[0]?.[0];
    return { piena, zona, tappe };
  };

  // la panca inclinata lavora il capo CLAVICOLARE, quello alto
  const inclinata = pienoDi('Smith Machine Incline Bench Press');
  assert.equal(inclinata.zona, 'petto_alto',
    'sulla panca inclinata l\'app deve accendere il petto ALTO (il capo clavicolare)');
  assert.ok(nellaFascia(inclinata.piena.offset, 'petto_alto'),
    'sulla panca inclinata la parte PIENA deve cadere sul capo alto');

  // i DIP: l'app accende il petto basso (le fibre sternali basse)
  const dips = pienoDi('Dips zavorrati');
  assert.ok(FASCE[dips.zona] !== undefined,
    'sui dip l\'app deve accendere una delle tre zone del petto, non ' + dips.zona);
  assert.ok(nellaFascia(dips.piena.offset, dips.zona),
    'sui dip la parte PIENA deve cadere sul capo che l\'app accende (' + dips.zona + ')');

  // la panca in PIANO: il capo grande, quello centrale
  const piana = pienoDi('Chest Press');
  assert.equal(piana.zona, 'petto_centrale',
    'sulla panca in piano l\'app deve accendere il petto CENTRALE (il capo sternale)');
  assert.ok(nellaFascia(piana.piena.offset, 'petto_centrale'),
    'sulla panca in piano la parte PIENA deve cadere sul capo centrale');

  // e un esercizio che non tocca il petto lo lascia tutto spento
  const curl = parteDiMuscolo({ nome: 'Cable Hammer Curl' });
  const svgCurl = figurino(curl.parte, curl.livelli, curl.anatomia);
  for (const tappe of tappeDi(svgCurl).values()) {
    for (const t of tappe) {
      assert.ok(!eViola(t.colore), 'sul curl il pettorale deve restare spento');
    }
  }
});
