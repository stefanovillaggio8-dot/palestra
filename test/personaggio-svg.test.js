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
import { PREMI, CLASSE_PER_ID, nomePremio } from '../src/avatar-rpg.js';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../stile.css', import.meta.url), 'utf8');

const ids = (svg) => [...svg.matchAll(/data-pezzo="([\w-]+)"/g)].map((m) => m[1]);

// Il pezzo e il PREMIO non sono la stessa cosa, e non devono diventarlo.
//
// Il pezzo si chiama come la parte del corpo che disegna (`torso`), il premio è
// quello che lo sblocca (`ferro`). Sono due nomi diversi di proposito: lo stesso
// premio, su una classe diversa, disegna una parte diversa — per il berserker il
// "ferro" è la pelliccia, non un corpetto d'acciaio.
//
// Si legge l'attributo `data-premio` direttamente dal `<g>`: ogni pezzo ha la sua
// apertura su una riga sola, quindi non serve andare a cercare il `</g>` giusto e
// il test non si rompe se il disegno dentro cambia.
const pezziDelPremio = (svg, premio) => {
  const fuori = [];
  for (const m of svg.matchAll(/data-pezzo="([\w-]+)"[^>]*/g)) {
    if (m[0].includes(`data-premio="${premio}"`)) fuori.push(m[1]);
  }
  return fuori;
};

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
    assert.ok(pezziDelPremio(svg, id).length === 1,
      `sbloccando "${id}" deve comparire il pezzo che quel premio disegna`);
  }
  // e con tutti i sei premi il personaggio è completo
  const completo = ids(personaggioSvg({ classe: 'guerriero', sbloccati: tutti }));
  assert.equal(completo.length, 2 + tutti.length, `il personaggio completo ha ${completo.length} pezzi`);
});

test('i pezzi si accendono nell\'ordine in cui sono sbloccati', () => {
  // Se si accendessero a caso il personaggio sembrerebbe montarsi al contrario:
  // prima l'armatura, poi i bracciali.
  //
  // I nomi dei PEZZI non sono i nomi dei PREMI: il pezzo si chiama come la parte del
  // corpo che disegna (`pugnale`, `piastre`), il premio è quello che lo sblocca
  // (`elmo`, `runica`). Sono due nomi diversi di proposito.
  const uno = ids(personaggioSvg({ classe: 'assassino', sbloccati: ['bracciali'] }));
  const due = ids(personaggioSvg({ classe: 'assassino', sbloccati: ['bracciali', 'elmo'] }));
  assert.ok(uno.indexOf('bracciali') < due.indexOf('pugnale'),
    'bracciali viene prima del pugnale: è l\'ordine in cui si sbloccano');
});

test('ogni classe ha la sua arma', () => {
  // Ste (10/10/2026): "l'assassino ha in mano un coltello, il guerriero uno scudo e il
  // berserker l'ascia".
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

test('le tre classi non sono lo stesso personaggio', () => {
  // Dalla scheda di Ste: il secondo pezzo è "armatura di cuoio" per il guerriero,
  // "pelo e pelliccia" per il berserker e "vesti leggeri" per l'assassino. Il ferro
  // è un pezzo solo, ma disegna tre cose diverse.
  const tutti = PREMI.map((p) => p.id);
  const disegni = ['guerriero', 'berserker', 'assassino'].map((c) =>
    personaggioSvg({ classe: c, sbloccati: tutti }));

  // stesso numero di pezzi (la progressione è uguale), ma disegno DIVERSO.
  // Il conto è: corpo + arma di classe (che ci sono sempre) + un pezzo per ciascuno
  // dei sei premi. Nove non sono: sono otto.
  for (const d of disegni) {
    assert.equal(ids(d).length, 2 + tutti.length,
      `il personaggio completo deve avere ${2 + tutti.length} pezzi, ne ha ${ids(d).length}`);
  }
  assert.notEqual(disegni[0], disegni[1], 'guerriero e berserker devono essere diversi');
  assert.notEqual(disegni[1], disegni[2], 'berserker e assassino devono essere diversi');

  // e il pezzo del "ferro" ha un nome diverso per classe, perché è un'altra cosa
  const titoli = disegni.map((d) => {
    const m = /<title>([^<]+)<\/title>/.exec(d.slice(d.indexOf('data-premio="ferro"')));
    return m ? m[1] : '';
  });
  assert.equal(new Set(titoli).size, 3,
    `il pezzo del ferro si chiama in tre modi diversi, invece ne ha uno solo: ${titoli.join(' / ')}`);
});

test('i nomi dei premi cambiano con la classe', () => {
  // Dalla seconda versione della scheda: l'assassino NON ha l'armatura di ferro, ha
  // la cintura da assassino. E il guerriero ha lo scudo sempre più la spada come
  // quinto pezzo.
  assert.equal(nomePremio('ferro', 'guerriero'), 'Armatura di cuoio');
  assert.equal(nomePremio('ferro', 'berserker'), 'Pelo e pelliccia');
  assert.equal(nomePremio('ferro', 'assassino'), 'Vesti leggeri');
  // il terzo pezzo è ferro per i due muscoli e cintura per l'assassino
  assert.equal(nomePremio('runica', 'guerriero'), 'Armatura di ferro');
  assert.equal(nomePremio('runica', 'berserker'), 'Armatura di ferro');
  assert.equal(nomePremio('runica', 'assassino'), 'Cintura da assassino');
  // il quarto è l'arma
  assert.equal(nomePremio('elmo', 'guerriero'), 'Spada');
  assert.equal(nomePremio('elmo', 'berserker'), 'Ascia da guerra');
  assert.equal(nomePremio('elmo', 'assassino'), 'Pugnale');
  // e un premio senza nome per la classe, o una classe che non esiste, non devono
  // lasciare il buco: tornano al nome generico
  assert.equal(nomePremio('bracciali', 'berserker'), 'Bracciali di cuoio');
  assert.equal(nomePremio('ferro', 'nessuna-classe'), 'Armatura di ferro');
  assert.equal(nomePremio('non-esiste', 'guerriero'), 'non-esiste');
});

test('l\'assassino non ha le piastre, ha la cintura', () => {
  // È la differenza vera fra le due versioni della scheda. Se all\'assassino
  // tornassero le piastre, i due muscoli avrebbero lo stesso equipaggiamento e la
  // progressione per classe non esisterebbe più.
  const a = personaggioSvg({ classe: 'assassino', sbloccati: ['runica'] });
  assert.ok(!ids(a).includes('piastre'), 'l\'assassino non si copre di ferro');
  assert.ok(ids(a).includes('cintura'), 'ha la cintura');
  const g = personaggioSvg({ classe: 'guerriero', sbloccati: ['runica'] });
  assert.ok(ids(g).includes('piastre'), 'il guerriero sì');
  const b = personaggioSvg({ classe: 'berserker', sbloccati: ['runica'] });
  assert.ok(ids(b).includes('piastre'), 'il berserker sì');
});

test('la spada del guerriero si vede e non sparisce sotto l\'armatura', () => {
  // Nella prima versione la spada era disegnata dietro al corpo e, con le piastre
  // addosso, spariva: il pezzo era "sbloccato" ma non si vedeva. Il pezzo deve
  // stare nella mano LIBERA, cioè dalla parte opposta allo scudo.
  const g = personaggioSvg({ classe: 'guerriero', sbloccati: ['elmo'] });
  assert.ok(ids(g).includes('spada'), 'la spada deve comparire');
  const soloSpada = /data-pezzo="spada"[^>]*><title>[^<]*<\/title>([\s\S]*?)<\/g>/.exec(g);
  assert.ok(soloSpada, 'deve esserci il pezzo della spada');
  assert.ok(soloSpada[1].trim().length > 20, 'e deve avere del disegno dentro');
});

test('le regole dello sblocco NON cambiano con la classe', () => {
  // Il nome che vedi cambia, ma i numeri che decidono quando un pezzo si accende no:
  // altrimenti il berserker sbloccherebbe tutto prima del guerriero e la progressione
  // non sarebbe più la stessa.
  for (const p of PREMI) {
    assert.ok(Number.isFinite(p.giorni), `il premio ${p.id} deve avere i giorni`);
    assert.ok(p.richiede, `il premio ${p.id} deve dire cosa richiede`);
  }
  // lo stesso premio, nelle tre classi, ha gli stessi giorni.
  // Le soglie sono quelle di Ste del 10/10/2026: 3, 7, 15, 30, 50, 75. Prima erano
  // 3, 7, 14, 30, 60, 100.
  const perId = new Map(PREMI.map((p) => [p.id, p.giorni]));
  assert.equal(perId.get('ferro'), 7);
  assert.equal(perId.get('runica'), 15);
  assert.equal(perId.get('elmo'), 30);
  assert.equal(perId.get('leggendaria'), 50);
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

test('l\'ologramma ha le tre cose che lo fanno ologramma', () => {
  // Ste (10/10/2026): "fa cacare l'ologramma così".
  //
  // Il materiale `holoMat` della dashboard fa tre cose, e sono quelle che
  // distinguono un ologramma da una figurina colorata:
  //   1. la luce sta sui bordi (alone)
  //   2. le scanline orizzontali che scorrono
  //   3. la banda che sale dal basso
  // Se manca una di queste tre, non è più un ologramma.
  //
  // 1. l alone: il drop-shadow sul disegno intero, non per pezzo
  const disegno = css.slice(css.indexOf('.persono-disegno {'));
  const bloccoDisegno = disegno.slice(0, disegno.indexOf('}'));
  assert.match(bloccoDisegno, /drop-shadow/, 'la luce deve stare sui bordi');
  // Il blocco va letto FINO ALLA SUA CHIUSURA. Senza il taglio, `[\s\S]*?`
  // proseguirebbe per tutto il file e troverebbe un `filter:` molto più in giù,
  // in un'altra regola: è già successo e il test dava un falso "va tutto bene".
  const perPezzo = css.slice(css.indexOf('.persono-pezzo {'));
  const bloccoPezzo = perPezzo.slice(0, perPezzo.indexOf('}'));
  assert.doesNotMatch(bloccoPezzo, /filter:/,
    'l\'alone non va per pezzo: sei filtri su un telefono fanno tremare tutto');
  // 2. le scanline
  assert.match(css, /\.persono-scanline\s*\{/, 'le scanline ci devono essere');
  assert.match(css, /\.persono-proiezione\s*\{[\s\S]*?pointer-events:\s*none/,
    'la proiezione non deve rubare i tocchi al personaggio');
  // 3. la banda che sale
  assert.match(css, /@keyframes proiezione-banda/, 'la banda che sale deve esistere');
  const k = css.slice(css.indexOf('@keyframes proiezione-banda'));
  assert.match(k.slice(0, 400), /translateY\(200px\)/,
    'e deve salire tutta: senza, è una macchia ferma');

  // e i gradienti che le disegna devono stare nel `defs`: un `repeating-linear-
  // gradient` non si può scrivere dentro un attributo fill
  const svg = personaggioSvg({ classe: 'guerriero', sbloccati: [] });
  assert.match(svg, /<defs>/, 'i gradienti stanno in un defs');
  assert.match(svg, /persono-scanline-grad/, 'il gradiente delle scanline');
  assert.match(svg, /persono-banda-grad/, 'quello della banda');
  assert.match(svg, /url\(#persono-scanline-grad\)/, 'e le scanline lo usano davvero');
});

test('le scanline e la banda prendono il colore della classe', () => {
  // Dentro l'SVG `currentColor` vale il colore del TESTO, che è il bianco dei
  // caratteri. Se le scanline restassero su `currentColor`, sarebbero bianche su
  // tutte e tre le classi e il colore dell'ologramma sarebbe perso.
  const per = { guerriero: '#ffb020', assassino: '#a97bff', berserker: '#37d18b' };
  for (const [classe, tinta] of Object.entries(per)) {
    const svg = personaggioSvg({ classe, sbloccati: [] });
    assert.match(svg, new RegExp('fill="' + tinta + '"'),
      `le scanline di ${classe} devono essere ${tinta}`);
    assert.doesNotMatch(svg, /currentColor/,
      `${classe}: currentColor dentro l'SVG è il colore del testo, non quello della classe`);
  }
});

test('i pezzi sbloccati restano distinguibili anche come ologramma', () => {
  // Con l alone e le scanline, due pezzi sovrapposti si somigliano: un bracciale
  // sopra un braccio, un'elmo sopra la testa. Devono restare leggibili, quindi i
  // pezzi hanno contorni spessi e i tratti interni sono un tono più chiaro.
  const cssPezzo = css.slice(css.indexOf('.persono-pezzo {'));
  const blocco = cssPezzo.slice(0, cssPezzo.indexOf('}'));
  const spessore = /stroke-width:\s*([\d.]+)/.exec(blocco);
  assert.ok(spessore && Number(spessore[1]) >= 2,
    `il contorno deve essere spesso, almeno 2: è ${spessore ? spessore[1] : 'assente'}`);
});