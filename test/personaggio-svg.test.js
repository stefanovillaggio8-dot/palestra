// test/personaggio-svg.test.js
//
// Ste (10/10/2026), dalla foto: "al posto di mettere dove c'è 'il tuo personaggio'
// un'immagine con quello che ho scelto e il guanto che sarebbe la cosa che ho
// sbloccato, fai un personaggio tipo all'inizio nudo, che mano a mano che sblocchi le
// cose si riempe di cose. l'assassino ha in mano un coltello, il guerriero uno scudo e
// il berserker l'ascia".
//
// I DUE MOTIVI PER CUI È UN SVG E NON LE EMOJI.
//
//  1. Le emoji sono un font: cambiano da telefono a telefono, e su Android il
//     coltello è un altro coltello. Qui il disegno è lo stesso ovunque.
//
//  2. Le emoji non si possono accendere e spegnere. Il personaggio deve riempirsi
//     MANO A MANO, quindi ogni parte deve essere un pezzo che si può mostrare: è un
//     `<g>` con un nome, non un carattere.
//
// LA REGOLA PIU' IMPORTANTE.
//
// Un personaggio all'inizio è NUDO: solo il corpo. Un premio mai sbloccato non si
// disegna. E i pezzi si accendono nell'ordine in cui sono stati sbloccati: se si
// accendessero a caso, il personaggio sembrerebbe montarsi al contrario.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { personaggioSvg } from '../src/personaggio-svg.js';
import { PREMI, CLASSE_PER_ID } from '../src/avatar-rpg.js';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../stile.css', import.meta.url), 'utf8');

const ids = (svg) => [...svg.matchAll(/data-pezzo="([\w-]+)"/g)].map((m) => m[1]);

test('all\'inizio il personaggio ha solo il corpo e l\'arma', () => {
  // "un personaggio tipo all'inizio nudo": niente premiche, niente elmo, niente
  // armatura. Solo il corpo e l'arma della classe, che sei già tu.
  const svg = personaggioSvg({ classe: 'guerriero', sbloccati: [] });
  const pezzi = ids(svg);
  assert.ok(pezzi.includes('corpo'), 'il corpo ci deve sempre essere');
  assert.ok(pezzi.includes('arma-guerriero'), "l'arma della classe pure");
  assert.equal(pezzi.length, 2, `con zero premi devono esserci solo 2 pezzi, ce ne sono ${pezzi.length}`);
});

test('nessun premio mai sbloccato viene disegnato', () => {
  // Il difetto che rovinerebbe tutto: mostrare in grigio spento un premio che non
  // hai ancora. Non si deve neanche accennare a quello che non è tuo.
  const svg = personaggioSvg({ classe: 'guerriero', sbloccati: [] });
  for (const p of ['bracciali', 'ferro', 'runica', 'elmo', 'leggendaria', 'divina']) {
    assert.ok(!ids(svg).includes(p), `${p} non è sbloccato e non deve comparire`);
  }
});

test('ogni premio sbloccato aggiunge il suo pezzo', () => {
  // La lista dei sbloccati si ACCUMULA: passare sempre un premio solo e contare i
  // pezzi non torna, perché ogni giro ripartirebbe da due pezzi e il confronto
  // con il giro prima (che ne contava tre) fallirebbe senza che nulla sia cambiato.
  const tutti = PREMI.map((p) => p.id);
  const aperti = [];
  for (const id of tutti) {
    aperti.push(id);
    const svg = personaggioSvg({ classe: 'guerriero', sbloccati: aperti });
    // corpo + arma della classe + un pezzo per ogni premio sbloccato
    assert.equal(ids(svg).length, 2 + aperti.length,
      `dopo aver sbloccato ${aperti.length} premi devono esserci ${2 + aperti.length} pezzi`);
    assert.ok(ids(svg).includes(id), `il pezzo di "${id}" deve comparire`);
  }
  // e con tutti i sei premi il personaggio è completo
  const completo = ids(personaggioSvg({ classe: 'guerriero', sbloccati: tutti }));
  assert.equal(completo.length, 2 + tutti.length, `il personaggio completo ha ${completo.length} pezzi`);
});

test('i pezzi si accendono nell\'ordine in cui sono sbloccati', () => {
  // Se si accendessero a caso il personaggio sembrerebbe montarsi al contrario:
  // prima l'elmo, poi i bracciali.
  const uno = ids(personaggioSvg({ classe: 'assassino', sbloccati: ['bracciali'] }));
  const due = ids(personaggioSvg({ classe: 'assassino', sbloccati: ['bracciali', 'elmo'] }));
  assert.ok(uno.indexOf('bracciali') < due.indexOf('elmo'),
    'bracciali viene prima di elmo: è l\'ordine in cui si sbloccano');
});

test('ogni classe ha la sua arma', () => {
  // Ste: "l'assassino ha in mano un coltello, il guerriero uno scudo e il berserker
  // l'ascia".
  for (const [id, atteso] of [
    ['guerriero', 'arma-guerriero'],
    ['assassino', 'arma-assassino'],
    ['berserker', 'arma-berserker'],
  ]) {
    // `CLASSE_PER_ID` è una `Map`, non un oggetto: con `['guerriero']` si prende
    // `undefined` e sembra che la classe non esista. Con una Map si chiede `.get()`.
    assert.ok(CLASSE_PER_ID.get(id), 'la classe ' + id + ' deve esistere');
    const pezzi = ids(personaggioSvg({ classe: id, sbloccati: [] }));
    assert.ok(pezzi.includes(atteso), `${id} deve avere ${atteso}`);
    // e NON quella degli altri: due armi insieme non hanno senso
    for (const altro of ['arma-guerriero', 'arma-assassino', 'arma-berserker']) {
      if (altro === atteso) continue;
      assert.ok(!pezzi.includes(altro), `${id} non deve avere anche ${altro}`);
    }
  }
});

test('ogni pezzo ha un nome che si può leggere', () => {
  // Chi usa uno screen reader deve sapere cosa indossa, quindi ogni `<g>` ha il
  // suo `<title>`. Senza, il personaggio è un disegno muto.
  const svg = personaggioSvg({ classe: 'berserker', sbloccati: PREMI.map((p) => p.id) });
  const titoli = [...svg.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]);
  const pezzi = ids(svg);
  assert.equal(titoli.length, pezzi.length,
    `ogni pezzo ha un titolo: ${pezzi.length} pezzi, ${titoli.length} titoli`);
});

test('l\'SVG è accessibile e non si rompe', () => {
  const svg = personaggioSvg({ classe: 'guerriero', sbloccati: ['ferro'] });
  assert.match(svg, /<svg[^>]*viewBox=/, 'deve avere il viewBox, altrimenti si distorce');
  assert.match(svg, /role="img"/, 'e dire alle mac assistive che è un\'immagine');
  assert.match(svg, /aria-label=/, 'con una descrizione');
  // nessuna classe inesistente: già successo con `--oro` in stile.css, una variabile
  // che non esisteva rendeva il colore trasparente senza dire niente
  const usate = [...svg.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
  const definite = new Set([...css.matchAll(/\.([\w-]+)/g)].map((m) => m[1]));
  for (const c of usate) {
    assert.ok(definite.has(c), `la classe "${c}" non esiste nel CSS: il pezzo sarebbe invisibile`);
  }
});