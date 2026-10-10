// rpg-chiaro.test.js -- l'RPG deve essere capibile, non solo giusto.
//
// Ste (09/10/2026), guardando la schermata del Profilo:
//
//   - "come segno che faccio tapis roulant?"  → non c'era un modo dichiarato;
//   - "non spunta cosa ti dà in più il guerriero, l'assassino o il berserker"
//     → il bottone scelto aveva una classe CSS che non si vedeva;
//   - "il forza 10 agilità 1 stamina 2 livello 3 cosa indicano?" → quattro numeri
//     senza unità;
//   - "che vuol dire con i numeri di adesso ti viene il guerriero?" → una frase che
//     non dice quali numeri, perché quel Guerriero, né cosa cambia.
//
// Qui si verifica che tutte e quattro le risposte siano scritte nel codice. La
// grammatica è verificata a parte, in `grammatica.test.js`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { eCardio, minutiDiCardio, calcolaAvatar } from '../src/avatar-rpg.js';

const srcApp = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const srcRpg = await readFile(new URL('../src/avatar-rpg.js', import.meta.url), 'utf8');
const srcCss = await readFile(new URL('../stile.css', import.meta.url), 'utf8');

function corpo(nome, da = srcApp) {
  const inizio = da.indexOf(`function ${nome}(`);
  assert.ok(inizio >= 0, `non trovo ${nome}`);
  let i = da.indexOf('{', inizio);
  let prof = 0;
  for (; i < da.length; i++) {
    if (srcApp[i] === '{') prof++;
    else if (srcApp[i] === '}') { prof--; if (prof === 0) return da.slice(inizio, i + 1); }
  }
  return da.slice(inizio);
}

test('CARDIO-1. si può dichiarare un esercizio "è cardio" invece di indovinare dal nome', () => {
  // PRIMA: il cardio si riconosceva SOLO dal nome ("tapis", "corsa", "corda"). Un
  // esercizio chiamato "Camminata veloce" non contava niente e non si capiva perché.
  assert.match(srcRpg, /export function eCardio\(e\)/, 'esiste un modo unico di dire se è cardio');
  assert.match(srcRpg, /if \(e\.cardio === true\) return true;/,
    'il flag scritto quando crei l\'esercizio conta, non solo il nome');
  assert.match(corpo('eCardio', srcRpg), /CARDIO\.test\(String\(e\.nome \|\| ''\)\)/,
    'e il nome continua a valere, così gli esercizi già nel catalogo funzionano');
  // e il flag si salva davvero quando crei l'esercizio
  assert.match(srcApp, /cardio\.value === 'si' \? \{ cardio: true \} : \{\}/,
    'il flag viene salvato con l\'esercizio');
  assert.match(srcApp, /È cardio\?|è cardio \(tapis/,
    'e nell\'editor c\'è la scelta da spuntare');
});

test('CARDIO-2. il flag conta davvero nei calcoli', () => {
  // Non basta che il flag esista: deve cambiare il risultato. Il test chiama la
  // funzione vera e confronta due esercizi con lo stesso nome ma flag diverso.
  const esercizi = { t1: { id: 't1', nome: 'Tapis', cardio: true }, t2: { id: 't2', nome: 'Tapis' } };
  const cerca = (id) => esercizi[id] || null;
  const serie = [{ esercizio_id: 't1', peso: 0, ripetizioni: 30 }];
  const serieSenzaFlag = [{ esercizio_id: 't2', peso: 0, ripetizioni: 30 }];

  const conFlag = calcolaAvatar(null, serie, [], cerca, { profilo: { giorni_allenamento: [] } });
  const senzaFlag = calcolaAvatar(null, serieSenzaFlag, [], cerca, { profilo: { giorni_allenamento: [] } });

  // 30 minuti di cardio = 6 punti, più quello di partenza = 7
  assert.equal(conFlag.st.agilita, 7, 'col flag, 30 minuti di cardio sono 7 punti di agilità');
  // e senza il flag l'esercizio è forza normale: il nome "Tapis" lo salva comunque
  assert.equal(senzaFlag.st.agilita, 7,
    'il nome "Tapis" lo riconosce lo stesso: gli esercizi vecchi continuano a funzionare');

  // e il caso che non funzionava prima: un nome che NON contiene una parola cardio
  const e3 = { id: 'c1', nome: 'Camminata veloce' };
  const r3 = calcolaAvatar(null, [{ esercizio_id: 'c1', peso: 0, ripetizioni: 30 }], [],
    () => e3, { profilo: { giorni_allenamento: [] } });
  assert.equal(r3.cardio, 0,
    'senza spunta "Camminata veloce" non è cardio, come prima: il nome non basta');
  e3.cardio = true;
  const r4 = calcolaAvatar(null, [{ esercizio_id: 'c1', peso: 0, ripetizioni: 30 }], [],
    () => e3, { profilo: { giorni_allenamento: [] } });
  assert.equal(r4.cardio, 30, 'ma con la spunta conta: 30 minuti di cardio');
  assert.equal(r4.st.agilita, 7, 'e l\'agilità sale a 7 punti');
});

test('CARDIO-3. minuti e secondi sono la stessa cosa', () => {
  // Ste deve poter sbagliare unità senza che l'app si sbagli: mezz'ora sono 30
  // minuti o 1800 secondi, e devono dare lo stesso numero.
  assert.equal(minutiDiCardio(30), 30, '30 minuti');
  assert.equal(minutiDiCardio(1800), 30, '1800 secondi = 30 minuti');
  assert.equal(minutiDiCardio(45), 45, '45 minuti');
  assert.equal(minutiDiCardio(2700), 45, '2700 secondi = 45 minuti');
});

test('CARDIO-4. sotto la serie c\'è scritto cosa scrivere', () => {
  // Il campo si chiama "ripetizioni" anche per il cardio, e su un tapis non ci sono
  // ripetizioni. La lettera sotto il campo deve dire MIN, e sotto la riga ci deve
  // essere la spiegazione.
  assert.match(srcApp, /serieCardio \? 'MIN' : 'RIP'/,
    'la lettera sotto il campo cambia da RIP a MIN quando è cardio');
  assert.match(srcApp, /nota-cardio/,
    'e sotto la riga compare la spiegazione');
  assert.match(srcApp, /scrivi i minuti \(30 = mezz/,
    'che dice cosa scrivere, con l\'esempio dei secondi');
});

test('CLASSE-1. il bottone scelto si vede', async () => {
  // Ste: "non spunta cosa ti dà in più il guerriero, l'assassino o il berserker".
  // Il codice aveva già `attiva`, ma il CSS non la rendeva visibile.
  assert.match(corpo('bloccoAvatarRpg'), /scelta \? `\$\{c\.icona\}  \$\{c\.nome\}  .` : /,
    'la spunta è nel testo del bottone, quindi si vede anche in alto contrasto');
  assert.match(corpo('bloccoAvatarRpg'), /'aria-pressed': scelta/,
    'e il bottone dice anche a chi non vede il colore che è quello scelto');
  const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');
  // il blocco contiene un commento lungo: si cerca in tutto quello che segue
  // `.classe-rpg.attiva`, non solo le prime righe
  const da = css.indexOf('.classe-rpg.attiva');
  const blocco = css.slice(da, da + 700);
  assert.match(blocco, /border-width: 2px/,
    'e il bottone scelto ha un bordo spesso: prima era un bordo viola tenue');
  assert.match(blocco, /font-weight: 800/,
    'e il testo è più marcato');
});

test('CLASSE-2. sotto ogni bottone c\'è scritto cosa dà', () => {
  // Un bottone che dice solo "Guerriero" non dice niente: cosa mi dà? Ste lo ha
  // chiesto esplicitamente.
  const avatar = corpo('bloccoAvatarRpg');
  assert.match(avatar, /riga-bonus/, 'c\'è la riga con i bonus');
  const i = avatar.indexOf('riga-bonus');
  assert.ok(i > 0, 'la riga dei bonus c\'è');
  assert.match(avatar.slice(i, i + 300), /SPIEGAZIONE_STAT\[c\.bonus\]\.nome/,
    'che dice: Guerriero → Forza +20%, Assassino → Agilità +20%, Berserker → Stamina +20%');
});

test('STAT-1. ogni statistica dice cosa conta', () => {
  // Ste: "il forza 10 agilità 1 stamina 2 livello 3 cosa indicano?".
  // Un numero senza unità è rumore. Ogni riga deve avere la spiegazione.
  assert.match(srcApp, /const SPIEGAZIONE_STAT = \{/,
    'le tre statistiche hanno una spiegazione scritta');
  assert.match(srcApp, /forza: \{\s*nome: 'Forza',\s*cosa: '[^']*500 kg/,
    'la Forza dice cosa serve per un punto: 500 kg spostati');
  assert.match(srcApp, /agilita: \{\s*nome: 'Agili/,
    'l\'Agilità c\'è');
  assert.match(srcApp, /Ogni 5 minuti sono un punto/,
    'e dice che ogni 5 minuti di cardio è un punto');
  assert.match(srcApp, /stamina: \{/,
    'la Stamina c\'è');
  assert.match(corpo('bloccoAvatarRpg'), /class: 'riga-stat riga-stat-spiegata'/,
    'e ogni riga della schermata è quella che porta la spiegazione');
});

test('STAT-2. il LIVELLO dice che non è quanto sei forte', () => {
  // "Livello 3" accanto a "Forza 10" sembrano la stessa cosa misurata due volte.
  // La riga del livello deve dire che è quanta pratica hai fatto.
  const avatar = corpo('bloccoAvatarRpg');
  const iLivello = avatar.indexOf("nome-stat', testo: 'Livello'");
  assert.ok(iLivello > 0, 'la riga del livello c\'è');
  const pezzo = avatar.slice(iLivello, iLivello + 400);
  assert.match(pezzo, /Quanta pratica hai fatto in tutto, non quanto sei forte/,
    'e lo dice: il livello è pratica, non forza');
  assert.match(pezzo, /guarda il Rank/,
    'e rimanda al Rank per misurare quanto sei forte');
});

test('SPIEGA-1. la spiegazione dice come si scrive il cardio', () => {
  const sp = corpo('spiegazioneRpg');
  assert.match(sp, /Come si segna il cardio/,
    'c\'è la sezione sul cardio, che prima non c\'era');
  assert.match(sp, /scrivi i MINUTI, non le ripetizioni/,
    'che dice cosa scrivere');
  assert.match(sp, /1800 per mezz/,
    "con l'esempio dei secondi, così non sbaglia");
  assert.match(sp, /È cardio/, 'e dice di spuntare "È cardio" quando crea un esercizio nuovo');
});

test('SPIEGA-2. "con i numeri ti viene il Guerriero" dice i numeri e il perché', () => {
  // Ste: "che vuol dire con i numeri di adesso ti viene il guerriero?".
  const avatar = corpo('bloccoAvatarRpg');
  assert.match(avatar, /consigliato il \$\{sceltaClasse\.nome\}/,
    'dice quale classe consiglia');
  assert.match(avatar, /è la tua statistica più alta/,
    'e PERCHÉ: perché è la statistica più alta');
  assert.match(avatar, /Ma non è un obbligo/,
    'e dice che non è un obbligo');
});

test('SPIEGA-3. la spiegazione dell\'RPG non usa gli apostrofi al posto degli accenti', () => {
  // Ste, prima foto: "la grammatica non si capisce tanto, alcune volte sbagli a
  // scrivere". La spiegazione aveva "perche'", "piu'", "e'" al posto degli accenti.
  const sp = corpo('spiegazioneRpg');
  for (const sbagliato of ["perche'", "piu'", "cosi'", "gia'", "puo'"]) {
    assert.equal(sp.includes(sbagliato), false,
      `nella spiegazione dell'RPG c'è ancora "${sbagliato}" al posto dell'accento`);
  }
  // e i due accenti che servono ci sono davvero
  assert.match(sp, /perché/, 'la spiegazione usa "perché" con l\'accento');
  assert.match(sp, /più/, 'e "più" con l\'accento');
});