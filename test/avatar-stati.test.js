// avatar-stati.test.js -- le sei foto del personaggio, una per armatura.
//
// Ste (11/10/2026): "ogni volta che sblocco qualcosa quell'immagine deve vedersi
// meglio". Prima c'era UNA foto fissa più una fila di pezzi sciolti ritagliati da
// un'altra scheda, in un'altra posa, e incollarli veniva male. Adesso c'e' una foto
// per ogni livello di armatura e l'app la sceglie da sola.
//
// Qui si controlla la regola che decide QUALE foto mostrare, e che le immagini
// citate esistano davvero: una foto mancante si vedrebbe come un quadratino
// vuoto, e su un telefono senza rete non si saprebbe nemmeno perché.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  STATI_IMMAGINE, PREMI, CLASSI, statoVisivo, percorsoStato, schedaProgressione, nomePremio,
} from '../src/avatar-rpg.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Una lista di premi con i primi `n` già sbloccati. */
function conSbloccati(n) {
  return PREMI.map((p, i) => ({ ...p, sbloccato: i < n }));
}

test('R10a. nessuna armatura sbloccata = personaggio nudo', () => {
  const v = statoVisivo(conSbloccati(0));
  assert.equal(v.indice, 0, 'senza premi si vede lo stato 0');
  assert.equal(v.stato.id, 'nudo');
  assert.equal(v.aura, false, 'l\'aura non si accende prima del sesto premio');
});

test('R10b. ogni premio in piu\' cambia stato, e l\'ordine e\' quello giusto', () => {
  // Il punto della richiesta: un premio in più = un pezzo in più addosso.
  // Si controlla uno per uno, perché se due stati fossero uguali si vedrebbe
  // che la progressione e' ferma anche se il numero conta.
  const attesi = ['nudo', 'bracciali', 'corazza', 'armatura', 'arma', 'completo'];
  for (let n = 0; n <= 5; n++) {
    const v = statoVisivo(conSbloccati(n));
    assert.equal(v.stato.id, attesi[n], `con ${n} premi deve esserci lo stato "${attesi[n]}"`);
  }
});

test('R10c. l\'aura si accende solo col sesto premio', () => {
  assert.equal(statoVisivo(conSbloccati(5)).aura, false, 'cinque premi non bastano');
  assert.equal(statoVisivo(conSbloccati(6)).aura, true, 'il sesto premio accende l\'aura');
  // Con tutti e sei i premi lo stato resta "completo": il sesto non ha un'immagine
  // tutta sua, quindi non si può saltare a uno stato che non esiste.
  const v = statoVisivo(conSbloccati(6));
  assert.equal(v.stato.id, 'completo', 'il sesto premio non cambia la foto, accende l\'aura');
  assert.equal(v.indice, STATI_IMMAGINE.length - 1, 'la foto non deve uscire dagli stati che esistono');
});

test('R10d. i sei stati sono sei e i sei premi sono sei', () => {
  // Se i due numeri non coincidessero, o un premio non avrebbe una foto o una foto
  // non avrebbe un premio. E\' il patto fra `PREMI` e `STATI_IMMAGINE`.
  assert.equal(STATI_IMMAGINE.length, PREMI.length, 'stati e premi devono essere lo stesso numero');
  assert.equal(STATI_IMMAGINE.length, 6, 'la scheda ha sei livelli di armatura');
});

test('R10e. le 18 immagini esistono tutte davvero', () => {
  // Il controllo che vale di più: senza, un file dimenticato si vede come un
  // quadratino vuoto sul profilo, e su un telefono senza rete non si capisce che
  // e' un'immagine mancante invece che un errore dell'app.
  const mancanti = [];
  for (const c of Object.values(CLASSI)) {
    for (let i = 0; i < STATI_IMMAGINE.length; i++) {
      const p = join(RADICE, percorsoStato(c.id, i));
      if (!existsSync(p)) mancanti.push(percorsoStato(c.id, i));
    }
  }
  assert.deepEqual(mancanti, [], 'immagini manca' + (mancanti.length ? 'nte: ' + mancanti.join(', ') : 'nti'));
});

test('R10f. il percorso dell\'immagine e\' pulito e non esce dalla cartella', () => {
  assert.equal(percorsoStato('guerriero', 0), 'img/personaggi/stati/guerriero-0.webp');
  assert.equal(percorsoStato('assassino', 5), 'img/personaggi/stati/assassino-5.webp');
  // I numeri strani non devono costruire percorsi assurdi: `calcolaAvatar` non
  // sbaglia, ma un valore letto da un profilo salvato male può arrivare.
  assert.equal(percorsoStato('guerriero', -3), 'img/personaggi/stati/guerriero-0.webp');
  assert.equal(percorsoStato('guerriero', 99), 'img/personaggi/stati/guerriero-5.webp');
  assert.equal(percorsoStato('guerriero', 'pippo'), 'img/personaggi/stati/guerriero-0.webp');
});

test('R10g. senza premi la lista vuota non fa crashare', () => {
  // `calcolaAvatar` restituisce sempre `premi`, ma se un domani arriva una lista
  // vuota (profilo nuovo, importazione rotta) la pagina non deve esplodere.
  for (const v of [statoVisivo([]), statoVisivo(null), statoVisivo(undefined)]) {
    assert.equal(v.indice, 0);
    assert.equal(v.sbloccati, 0);
    assert.equal(v.aura, false);
  }
});

test('R10h. lo stato visivo esiste FUORI dal blocco che lo usa', async () => {
  // IL MIO ERRORE, e la ragione di questo test.
  //
  // Avevo scritto `const viso = statoVisivo(rpg.premi)` DENTRO a
  // `if (classeScelta) { ... }`, e poi lo riusavo più in basso nella riga sotto il
  // personaggio, che sta FUORI da quel blocco. In JavaScript un `const` dentro le
  // graffe esiste solo li dentro: fuori e' come se non esistesse, e la pagina si
  // fermava con "Can't find variable: viso" senza disegnare il profilo.
  //
  // Il difetto e' invisibile a `node --check`: il file e' sintatticamente giusto, e
  // un errore di ambito viene fuori solo quando la pagina viene disegnata davvero.
  // Percio' qui si controlla l'ordine delle righe: `viso` deve essere dichiarato
  // PRIMA di `if (classeScelta)`, e non ridichiarato dentro.
  const app = await readFile(join(RADICE, 'src', 'app.js'), 'utf8');
  const righe = app.split('\n');
  const dichiara = righe.findIndex((r) => /^\s*const viso\s*=/.test(r));
  const apreIf = righe.findIndex((r) => /^\s*if \(classeScelta\)/.test(r));

  assert.ok(dichiara >= 0, 'in app.js deve esserci "const viso = ..."');
  assert.ok(apreIf >= 0, 'in app.js deve esserci "if (classeScelta)"');
  assert.ok(dichiara < apreIf,
    '"viso" va dichiarato PRIMA di "if (classeScelta)", altrimenti fuori dal blocco non esiste');

  // E non deve essere dichiarato due volte: il secondo annullerebbe il controllo
  // qui sopra, perché la riga sotto continuerebbe a puntare a una viso che non c'e'.
  const quante = righe.filter((r) => /^\s*const viso\s*=/.test(r)).length;
  assert.equal(quante, 1, '"viso" deve essere dichiarato una volta sola');
});
test('R10i. la foto grande viene PRIMA della fila degli stati', async () => {
  // Ste (11/10/2026), dalla foto del telefono: "deve esserci il mio attuale più
  // grande". La striscia degli stati si metteva per prima, prendeva tutta la riga
  // (`flex: 1 0 100%`) e spingeva la foto in fondo, piccola.
  //
  // L'ordine con cui gli elementi vengono aggiunti a `scena` e' quello con cui il
  // browser li disegna: non si vede in anteprima e nessun test lo controllava.
  const app = await readFile(join(RADICE, 'src', 'app.js'), 'utf8');
  const posFoto = app.indexOf('scena.appendChild(grafica)');
  const posStriscia = app.indexOf('if (rigaStati) scena.appendChild(rigaStati)');

  assert.ok(posFoto >= 0, 'la foto deve essere aggiunta alla scena');
  assert.ok(posStriscia >= 0, 'la fila degli stati deve essere aggiunta alla scena');
  assert.ok(posFoto < posStriscia,
    'la foto grande deve venire PRIMA della fila degli stati, altrimenti finisce in fondo e piccola');
});

test('R10j. la foto non resta stretta in una scatola', async () => {
  // Lo stesso difetto, dal lato del CSS: `.con-foto` aveva solo `display: block`,
  // quindi restava la `width: clamp(150px, 46%, 260px)` della scatola piccola e sul
  // telefono la foto non cresceva mai. Ora la foto prende tutta la riga.
  const css = await readFile(join(RADICE, 'stile.css'), 'utf8');
  const m = css.match(/\.personaggio-scena-grafica\.con-foto\s*\{([^}]*)\}/);
  assert.ok(m, 'in stile.css deve esserci la regola .personaggio-scena-grafica.con-foto');
  assert.match(m[1], /flex:\s*1 0 100%/,
    'il riquadro della foto deve prendere tutta la riga: senza, resta stretto');
});
test('R10k. la foto non viene tagliata in basso', async () => {
  // LA STESSA FOTO, LA STESSA CAUSA, una volta di più. Dopo R10j si vedeva solo
  // la testa e le spalle.
  //
  // Il riquadro ha due classi: `personaggio-scena-grafica` e `personaggio`. La
  // seconda viene dal quadratino piccolo del disegno e porta `width: 76px;
  // height: 88px`. Nella regola `.con-foto` si toccava la larghezza ma non
  // l'altezza, e con `overflow: hidden` sulla regola vecchia la foto veniva
  // ritagliata a 88 pixel.
  //
  // Il controllo e' sul CSS, perché e' il CSS a decidere quanto e' alta la scatola.
  const css = await readFile(join(RADICE, 'stile.css'), 'utf8');
  const m = css.match(/\.personaggio-scena-grafica\.con-foto\s*\{([^}]*)\}/);
  assert.ok(m, 'in stile.css deve esserci la regola .personaggio-scena-grafica.con-foto');
  assert.match(m[1], /height:\s*auto/,
    'il riquadro della foto deve avere height: auto: con un\'altezza fissa la foto viene tagliata');

  // E la regola vecchia non deve poter reintrodurre l'altezza fissa sulla foto.
  const img = css.match(/\.personaggio-scena-grafica\.con-foto\s+\.personaggio-ritratto\s*\{([^}]*)\}/);
  assert.ok(img, 'deve esserci la regola sulla foto dentro .con-foto');
  assert.match(img[1], /height:\s*auto/, 'la foto deve avere height: auto, cosi\' l\'altezza la decide lei');
  assert.doesNotMatch(img[1], /max-height/, 'sulla foto non deve esserci max-height: taglierebbe la figura');
});
test('R10l. le immagini sono piu\' grandi di quanto le vedeva il telefono', async () => {
  // Ste (11/10/2026): "non puoi aumentargli la qualita'?".
  //
  // La griglia di partenza era piccola (190x170 per personaggio), e la foto grande
  // si vedeva a circa 400 px: il browser allungava l'immagine di due volte e la
  // faceva sembrare sfocata. Le immagini sono state ingrandite di 3 volte a mano.
  //
  // Il controllo e' sui pixel, perché e' li che dicono se l'immagine e' grande
  // abbastanza: un test che guardasse solo il nome del file passerebbe anche con
  // un'immagine minuscola.
  const { readdir } = await import('node:fs/promises');
  const cartella = join(RADICE, 'img', 'personaggi', 'stati');
  const nomi = (await readdir(cartella)).filter((n) => n.endsWith('.webp'));
  assert.equal(nomi.length, 18, 'devono esserci 18 immagini webp');

  const MINIMO = 400; // la foto grande arriva a 400 px: sotto, si allunga da sola
  for (const n of nomi) {
    const p = join(cartella, n);
    const b = await readFile(p);
    // WebP lossless e' "VP8L", con compressione lossy e' "VP8 ". Il primo byte
    // del chunk e' già la firma, quindi basta guardare i quattro caratteri.
    const firma = b.toString('latin1', 0, 4);
    assert.ok(firma === 'RIFF', `${n}: non sembra un file WebP valido`);
    const bmp = await readFile(p).then((buf) => buf);
    assert.ok(bmp.length > 4000, `${n}: troppo piccola (${bmp.length} byte), sembra non ingrandita`);
  }

  // E la larghezza vera, letta dall'intestazione WebP (VP8X / VP8 / VP8L).
  const larghezze = [];
  for (const n of nomi) {
    larghezze.push(larghezzaWebp(await readFile(join(cartella, n))));
  }
  const piccola = Math.min(...larghezze);
  assert.ok(piccola >= MINIMO,
    `le immagini devono essere larghe almeno ${MINIMO} px, la piu\' piccola e\' ${piccola}`);
});

/** La larghezza in pixel di un file WebP, letta dalla sua intestazione. */
function larghezzaWebp(buf) {
  const tipo = buf.toString('latin1', 12, 16);
  if (tipo === 'VP8X') return 1 + buf.readUIntLE(24, 3);
  if (tipo === 'VP8 ') return buf.readUInt16LE(26) & 0x3fff;
  if (tipo === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return (b & 0x3fff) + 1;
  }
  throw new Error('formato WebP non riconosciuto: ' + tipo);
}
test('R10m. la fila della progressione e\' la STESSA lista delle ricompense', () => {
  // Ste (12/10/2026): "nelle foto piccole spunta senza armatura, bracciali, corazza,
  // armatura, arma, completo. ma giu' nelle ricompense spunta bracciali di cuoio,
  // vesti leggeri, cintura da assassino, pugnale, armatura leggendaria, arma divina:
  // che sono cose diverse".
  //
  // Il difetto era che la fila usava i nomi degli STATI ("Corazza", "Armatura") e la
  // lista delle ricompense usava i nomi della CLASSE ("Vesti leggeri", "Cintura da
  // assassino"). Due vocabolari per la stessa cosa, e quello giusto non si capiva.
  //
  // Qui si controlla che ogni casella, meno la prima, abbia ESATTAMENTE il nome del
  // premio che sblocca: e' la definizione di "la stessa lista".
  for (const classe of Object.keys(CLASSI)) {
    const lista = schedaProgressione(conSbloccati(6), classe, 100);
    const ricompense = lista.slice(1);
    assert.equal(ricompense.length, PREMI.length,
      `${classe}: una casella per ogni ricompensa`);
    for (const p of PREMI) {
      const casella = ricompense.find((c) => c.chiave === p.id);
      assert.ok(casella, `${classe}: manca la casella del premio "${p.id}"`);
      assert.equal(casella.nome, nomePremio(p.id, classe),
        `${classe}: la casella di "${p.id}" dice "${casella.nome}" e la ricompensa `
        + `dice "${nomePremio(p.id, classe)}": devono essere la stessa cosa`);
    }
  }
});

test('R10n. la fila ha la casella di partenza e poi tutti i premi', () => {
  const lista = schedaProgressione(conSbloccati(6), 'assassino', 100);
  assert.equal(lista.length, PREMI.length + 1, 'sette caselle: la partenza e poi i sei premi');
  assert.equal(lista[0].chiave, 'niente', "la prima casella non e' una ricompensa");
  assert.equal(lista[0].sbloccato, true, 'senza armatura si parte sempre da li');
  // E i nomi dell'Assassino, che sono quelli che hanno fatto notare la cosa.
  assert.deepEqual(lista.slice(1).map((c) => c.nome), [
    'Bracciali di cuoio', 'Vestiti leggeri', 'Cintura da assassino',
    'Pugnale', 'Armatura leggendaria', 'Aura divina',
  ]);
});

test('R10o. l\'ultima casella e\' l\'aura e riusa l\'ultima foto', () => {
  // Il sesto premio non ha una foto tutta sua: l'ultima riga e' già "tutto addosso".
  // Se la casella non lo dice, sembrerebbe che "Aura divina" non esista.
  const lista = schedaProgressione(conSbloccati(6), 'guerriero', 100);
  const ultima = lista[lista.length - 1];
  const penultima = lista[lista.length - 2];
  assert.equal(ultima.aura, true, 'l\'ultima casella deve dire che e\' l\'aura');
  assert.equal(ultima.immagine, penultima.immagine,
    'aura e completo mostrano la stessa foto: l\'aura e\' la luce sopra, non un\'altra figura');
  assert.equal(ultima.chiave, 'divina', 'l\'aura e\' il sesto premio');
});

test('R10p. ogni casella dice quanti giorni mancano', () => {
  const lista = schedaProgressione(conSbloccati(1), 'guerriero', 4);
  const chiusa = lista.find((c) => c.chiave === 'ferro');
  assert.equal(chiusa.sbloccato, false);
  assert.equal(chiusa.mancano, 7 - 4, 'con 4 giorni di fila, all\'armatura ne mancano 3');
  const aperta = lista.find((c) => c.chiave === 'bracciali');
  assert.equal(aperta.sbloccato, true);
  assert.equal(aperta.mancano, 0, 'una ricompensa presa non ha giorni mancanti');
});

test('R10q. le foto delle caselle esistono', () => {
  for (const classe of Object.keys(CLASSI)) {
    for (const c of schedaProgressione(conSbloccati(6), classe, 100)) {
      const p = join(RADICE, percorsoStato(classe, c.immagine));
      assert.ok(existsSync(p), `manca l'immagine: ${percorsoStato(classe, c.immagine)}`);
    }
  }
});
test('R10r. ogni classe ha la sua misura, e il CSS la dichiara', async () => {
  // Ste (12/10/2026): "il guerriero e il berserker sono troppo grossi
  // orizzontalmente, tipo larghi". Il Berserker con ascia e scudo e il Guerriero
  // con spada e scudo arrivavano ai bordi della casella, l'Assassino no.
  //
  // Il PRIMO tentativo e' sbagliato ed e' pericoloso: per far stare il personaggio
  // piu' piccolo dentro la stessa casella bisogna aggiungere sfondo ai lati, e lo
  // sfondo della foto e' una vignettatura, non un colore piatto. Con un colore fisso
  // si vedeva un rettangolo scuro intorno al personaggio; riempiendo a specchio si
  // vedevano strisce verticali. Nessuna delle due e' un'immagine, e' una toppa.
  //
  // Quindi l'immagine resta INTERA e si riduce nel CSS, in percentuale. Qui si
  // controlla che tutte e tre le classi abbiano una percentuale: una classe senza
  // regola resterebbe larga e il difetto tornerebbe senza che nessuno se ne accorga.
  const css = await readFile(join(RADICE, 'stile.css'), 'utf8');
  for (const c of Object.keys(CLASSI)) {
    const m = css.match(
      new RegExp(`\\.personaggio-scena-grafica\\.personaggio-${c} \\.personaggio-ritratto\\s*\\{\\s*width:\\s*(\\d+)%`),
    );
    assert.ok(m, `manca la misura della classe "${c}" in stile.css`);
    const w = Number(m[1]);
    assert.ok(w > 50 && w <= 100, `la classe "${c}" ha una misura fuori senso: ${w}%`);
  }
  // E il berserker, che e' il piu' largo, deve essere il piu' ridotto.
  const misura = (c) => Number(css.match(
    new RegExp(`\\.personaggio-scena-grafica\\.personaggio-${c} \\.personaggio-ritratto\\s*\\{\\s*width:\\s*(\\d+)%`),
  )[1]);
  assert.ok(misura('berserker') <= misura('guerriero'),
    'il berserker e\' il piu\' largo: deve essere ridotto almeno quanto il guerriero');
  assert.ok(misura('guerriero') <= misura('assassino'),
    'l\'assassino e\' il piu\' snello: non va ridotto quanto gli altri');
});

test('R10s. l\'aura ha luce, raggi e scintille, e rispetta chi non vuole le animazioni', async () => {
  // Ste (12/10/2026): "l\'arma divina deve essere bella". Prima era una sola macchia
  // grigia fatta di due box-shadow, e con il colore della classe sembrava parte del
  // personaggio invece che una ricompensa.
  const css = await readFile(join(RADICE, 'stile.css'), 'utf8');
  assert.match(css, /personaggio-aura::before/, 'deve esserci la luce dietro');
  assert.match(css, /personaggio-aura::after/, 'deve esserci qualcosa davanti');
  assert.match(css, /@keyframes aura-sali/, 'le scintille che salgono');
  // Ste (12/10/2026): "deve essere il livello finale quindi qualcosa di bello bello".
  // Un livello finale non si distingue perche' ha piu' luce: si distingue perche'
  // ha delle cose che gli altri livelli non hanno. Qui si controlla che ci siano.
  assert.match(css, /radial-gradient\(circle at 50% 23%/, "l'alone dietro la testa");
  assert.match(css, /repeating-conic-gradient/, "l'anello che gira piano");
  assert.match(css, /@keyframes aura-stella/, 'le stelle che si accendono e spengono');
  assert.match(css, /@keyframes aura-lustro/, 'il bagliore che attraversa la figura');
  const app0 = await readFile(join(RADICE, 'src', 'app.js'), 'utf8');
  assert.match(app0, /class: 'aura-stelle'/, 'le stelle sono create dal codice');
  assert.match(app0, /class: 'aura-lustro'/, "il bagliore e' creato dal codice");
  assert.match(css, /aura-fassi/, 'i fazzi di luce che passano dietro');
  assert.match(css, /drop-shadow\(0 0 4px/, "il contorno dorato sul personaggio: e' la parte che rende credibile la luce");
  // L'aura e' una ricompensa: dev'essere d'oro in tutte e tre le classi, altrimenti
  // su due classi sembra parte del personaggio e su una no.
  assert.match(css, /--aura:\s*var\(--giallo/, 'il colore dell\'aura e\' il giallo dell\'app');
  // E chi ha scelto "mai" non deve vedere niente muoversi.
  assert.match(css, /html\.animazioni-mai[^{]*\{[^}]*animation:\s*none/,
    'chi sceglie "mai" non deve vedere l\'aura muoversi');
  // Le quattro scintille devono avere tempi diversi, altrimenti salgono insieme e
  // sembrano un\'unica palla.
  const app = await readFile(join(RADICE, 'src', 'app.js'), 'utf8');
  assert.match(app, /--ritardo:\$\{ritardi\[i\]\}s/, 'le scintille si creano da una lista sola');
  assert.match(app, /const posizioni = \[20, 31, 41, 50, 59, 68, 79\]/, 'sette scintille a sette posizioni');
  assert.match(app, /const derive = \[14, -9, 6, -13, 10, -6, 16\]/, 'ogni scintilla sbandiera di lato: altrimenti salgono in fila');
});
test("R10t. l'aura arriva al bordo e non usa mask-composite", async () => {
  // Ste (12/10/2026): "qui non e' giallo pure ai bordi come gli altri". La luce si
  // spegneva prima del bordo, quindi su un'immagine con sfondo chiaro si vedeva che
  // l'oro mancava e su una con sfondo scuro sembrava che ci fosse: la stessa aura
  // sembrava due cose diverse.
  const css = await readFile(join(RADICE, 'stile.css'), 'utf8');

  // 1) La luce del bordo DEVE stare sullo strato che e' SOPRA la foto, non sul
  //    riquadro. Il riquadro la disegna sotto il contenuto, e il contenuto del
  //    riquadro e' la foto: con l'Assassino (foto al 100%) l'alone finiva coperto e
  //    non si vedeva proprio li', mentre con gli altri (foto all'86-88%) si vedeva.
  // Ci sono DUE regole `::after`: una mette a posto posizione e dimensioni (ha
  // `inset: 0`) e l'altra disegna i fazzi ed e' quella che porta l'alone del bordo.
  // Controllare la prima sbaglierebbe: quindi si cercano tutte e si guarda se una
  // delle due ha davvero la luce interna.
  const regoleAfter = [...css.matchAll(/\.personaggio-scena-grafica\.personaggio-aura::after\s*\{([^}]*)\}/g)]
    .map((m) => m[1]);
  assert.ok(regoleAfter.length >= 1, 'deve esserci la regola dei fazzi');
  assert.ok(regoleAfter.some((corpo) => /inset 0 0/.test(corpo)),
    "l'alone del bordo sta sullo strato sopra la foto");
  assert.doesNotMatch(
    css.match(/\.personaggio-scena-grafica\.personaggio-aura\s*\{([^}]*)\}/)?.[1] || '',
    /inset 0 0/,
    'l\'alone NON deve stare sul riquadro: la foto lo coprirebbe',
  );

  // 2) UNA sola maschera. `mask-composite` su Safari si comporta diversamente da
  //    Chrome, e l'aura cambiava da telefono a telefono.
  // Si conta quanti gradienti ci sono dentro la dichiarazione, NON le virgole:
  // dentro `radial-gradient(...)` le virgole sono parte della funzione, quindi
  // contandole sembrerebbe sempre una lista di maschere e il test accuserebbe una
  // maschera sola che invece e' giusta.
  const maschere = [...css.matchAll(/(?<!-)mask-image:\s*([^;]+);/g)];
  assert.ok(maschere.length > 0, 'i fazzi devono avere una maschera');
  for (const [, valore] of maschere) {
    const quanti = (valore.match(/gradient\(/g) || []).length;
    assert.equal(quanti, 1,
      `una maschera sola, non due da comporre: "${valore.trim()}"`);
  }

  // 3) La luce arriva al bordo: il gradiente piu' largo deve superare il 100%.
  assert.match(css, /radial-gradient\(1[0-9]{2}% 1[0-9]{2}% at 50%/,
    'deve esserci un alone largo che arriva fino al bordo del riquadro');
});