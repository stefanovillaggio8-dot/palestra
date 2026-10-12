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
  // Ste (12/10/2026): \"aggiungi piu' effetti\". La colonna di luce sta DAVANTI alla
  // foto nel DOM ma ha z-index: 0 mentre la foto ha z-index: 1: senza questo
  // la colonna verrebbe dipinta sopra la figura e la coprirebbe.
  assert.match(css, /\.aura-colonna\s*\{[^}]*z-index:\s*0/, 'la colonna di luce sta dietro la foto');
  assert.match(css, /personaggio-aura \.personaggio-ritratto\s*\{[^}]*z-index:\s*1/, 'e la foto sta sopra la colonna');
  assert.match(css, /@keyframes aura-colonna/, 'la colonna deve respirare piano');
  const appC = await readFile(join(RADICE, 'src', 'app.js'), 'utf8');
  assert.match(appC, /class: 'aura-colonna'/, "la colonna e' creata dal codice");
  // Ste (12/10/2026): "la banda di luce falla un po' piu' spesso che spunta, tipo
  // ogni 4,5 secondi". Prima passavano 6,5 e sembrava non accadesse mai: qui si
  // controlla il numero, perche' e' una cosa che si dimentica di cambiare.
  assert.match(css, /aura-lustro 4\.5s/, 'il bagliore deve passare ogni 4,5 secondi');
  assert.doesNotMatch(css, /aura-lustro 6\.5s/, 'non deve restare il vecchio tempo di 6,5');
  // IL ROSSO SULL'ARME E' STATO TOLTO.
  //
  // Ste (12/10/2026): avevo chiesto "metti anche nelle spade tipo sporche di sangue",
  // e avevo risposto con un alone rosso sulla zona delle braccia. Guardandola ha
  // detto: "no ma che è sto coso rosso, brutto toglilo". Aveva ragione: non sembrava
  // sangue sulla lama, sembrava una macchia rossa appoggiata addosso al personaggio,
  // e guastava tutta l'aura.
  //
  // Il controllo resta perche' il colore era troppo facile da rimettere: e' una cosa
  // che si rifa' senza accorgersene, e senza questo test nessuno se ne accorgerebbe.
  const appS = await readFile(join(RADICE, 'src', 'app.js'), 'utf8');
  assert.doesNotMatch(css, /aura-sangue/, "l'alone rosso sulle armi e' stato tolto");
  assert.doesNotMatch(appS, /aura-sangue/, "e non deve restare nel codice");
  assert.doesNotMatch(css, /#c3221f/, "ne' il rosso sul bordo del riquadro");
  const app0 = await readFile(join(RADICE, 'src', 'app.js'), 'utf8');
  assert.match(app0, /class: 'aura-stelle'/, 'le stelle sono create dal codice');
  assert.match(app0, /class: 'aura-lustro'/, "il bagliore e' creato dal codice");
  assert.match(css, /aura-fassi/, 'i fazzi di luce che passano dietro');
  assert.match(css, /drop-shadow\(0 0 3px/, "il contorno dorato sul personaggio: e' la parte che rende credibile la luce");
  // Ste (12/10/2026): "adesso non e' forse troppo acceso? dimmi tu". Era troppo
  // acceso: nove strati di luce con miscela screen, che somma. Perche' non torni
  // piu' cosi', la forza e' UN NUMERO SOLO, --forza, e tutte le intensita' passano
  // da li'. Senza, il prossimo ritocco sarebbe stato alzare un colore a mano e
  // l'avrebbe dimenticato due righe sotto.
  assert.match(css, /\.personaggio-scena-grafica\.personaggio-aura\s*\{[^}]*--forza:\s*\.58/,
    'la forza dell\'aura e\' un numero solo');
  const usiForza = [...css.matchAll(/calc\(\d+% \* var\(--forza\)\)/g)].length;
  assert.ok(usiForza >= 8, `le intensita' devono passare da --forza, ne' usano ${usiForza}`);

  // Ste (12/10/2026): "vedi cosa c'e' da migliorare, poi forse anche quelli senza
  // aura adesso sono troppo scuri invece". Due difetti diversi, due correzioni diverse.
  //
  // 1) L'AURA tingeva gli ANGOLI. Il gradiente dell'aria era 118% x 108%, piu' grande
  //    del riquadro, e con la miscela `screen` sul nero quegli angoli si accendevano
  //    di marrone: si vedeva un riquadro color caffe' invece di una figura con della
  //    luce intorno. Ora e' stretto, quindi gli angoli restano neri.
  const ariaLarga = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/radial-gradient\(1[0-9]{2}%\s+1[0-9]{2}%[^\n]*\n[^\n]*var\(--aura\)/);
  assert.equal(ariaLarga, null,
    "l'aria dell'aura non puo' essere piu' grande del riquadro: tingerebbe gli angoli");
  assert.match(css, /radial-gradient\(60% 54% at 50% 46%/,
    "l'aria dell'aura sta attorno alla figura e non sul riquadro intero");
  // E il posto dove la luce DEVE stare e' il contorno sulla figura: su uno sfondo
  // nero illuminare il vuoto non si vede, e Ste aveva detto "non e' cambiato molto".
  const contorno = css.match(/personaggio-aura \.personaggio-ritratto\s*\{[\s\S]*?\n\}/);
  assert.ok(contorno, 'il contorno del personaggio deve esistere');
  const alone = [...contorno[0].matchAll(/drop-shadow\(0 0 (\d+)px/g)].map(m => Number(m[1]));
  assert.ok(alone.length === 3, `il contorno deve avere tre strati, ne' ha ${alone.length}: ${alone.join(', ')}`);
  assert.ok(alone[2] >= 16,
    `l'alone esterno deve essere largo, non solo la linea: ${alone.join(', ')}`);
  // Ste (12/10/2026): "e ancora piu' nero e giallo". Il giallo era tutto dello stesso
  // colore dal filo all'alone, e una cosa tutta uguale non sembra luce: sembra
  // vernice. La luce vera ha il CENTRO BIANCO e il bordo colorato.
  assert.match(contorno[0], /drop-shadow\(0 0 2px rgba\(255,\s*252,\s*240/,
    'il filo piu\' vicino alla figura deve essere bianco caldo: e\' la luce, non la tinta');
  assert.ok(alone[0] < alone[1] && alone[1] < alone[2],
    `i tre strati devono crescere verso l'esterno: ${alone.join(', ')}`);
  assert.ok(/95% \* var\(--forza\)|88% \* var\(--forza\)/.test(contorno[0]),
    'la forza dell\'aura va messa sul contorno, che e\' l\'unico strato che tocca la figura');

  // Ste (12/10/2026): "non e' cambiato molto" e, guardando l'anteprima, una X bianca
  // ferma nell'angolo in alto a sinistra. Quella X era una stella: era un poligono a
  // quattro punte ritagliato con clip-path che al massimo girava di 45 gradi, quindi a
  // 7 px diventava una X. Non era una scintilla, sembrava un graffio.
  const stelle = css.match(/\.aura-stelle i\s*\{[\s\S]*?\n\}/);
  assert.ok(stelle, 'le stelle devono esistere');
  assert.doesNotMatch(stelle[0], /clip-path/,
    'le stelle non possono essere ritagliate: a 7 px la clip-path le faceva sembrare spigoli');
  assert.doesNotMatch(css, /@keyframes aura-stella\s*\{[^}]*rotate/,
    'le stelle non devono ruotare: era la rotazione a 45 gradi che faceva la X');
  assert.match(stelle[0], /drop-shadow/,
    'le stelle devono avere l\'alone, altrimenti sono macchioline sbiadite');

  // 2) SENZA AURA IL VUOTO RESTAVA VUOTO. Misurando le immagini: meta' del disegno sta
  //    sotto il 40 di luminosita' e il personaggio galleggia nel nero. La versione con
  //    l'aura sembrava piu' bella non perche' la figura fosse piu' luminosa, ma perche'
  //    l'oro RIEMPIEVA quel vuoto. Ora anche senza aura c'e' una luce, ma VIOLA: l'oro
  //    resta alla ricompensa, il viola e' la strada. E come si capisce dai colori usati.
  assert.match(css, /con-foto:not\(\.personaggio-aura\)::before/,
    "anche senza aura il vuoto dietro la figura va riempito");
  const luceBase = css.match(/con-foto:not\(\.personaggio-aura\)::before\s*\{[\s\S]*?\n\}/);
  assert.ok(luceBase, 'la luce di base deve esistere');
  assert.match(luceBase[0], /var\(--tinta\)/,
    'la luce senza aura e\' del colore della scena, non oro: l\'oro e\' la ricompensa');
  assert.doesNotMatch(luceBase[0], /var\(--aura\)/,
    'senza aura non puo\' esserci oro: altrimenti la ricompensa la vedi prima di averla');
  // E la foto deve stare DAVANTI alla luce, altrimenti la luce la tinge invece di
  // accenderle le spalle: serve `relative` + z-index, non `static`.
  assert.match(css, /con-foto \.personaggio-ritratto\s*\{[^}]*position:\s*relative[^}]*z-index:\s*1/,
    'la foto sta davanti alla luce di base');

  // Ste (12/10/2026), la terza volta sul contrasto: prima "quelli senza aura sono
  // troppo scuri", poi "non ha piu' la qualita' dell'inizio". Sono due richieste in
  // verso opposto e il modo per stare in mezzo e' il contrasto: alza i mezzitoni E
  // abbassa i neri. Ma piu' di 1.05 sulla foto la rende dura, e la durezza e'
  // esattamente la perdita di qualita' che Ste ha visto. Resta un filtro del
  // browser, quindi il file non viene toccato e si puo' disfare.
  const filtroBase = css.match(/con-foto \.personaggio-ritratto\s*\{[^}]*filter:\s*([^;]+);/);
  assert.ok(filtroBase, 'la foto deve avere un filtro');
  const contrasto = Number((filtroBase[1].match(/contrast\(([\d.]+)\)/) || [])[1]);
  const luminosita = Number((filtroBase[1].match(/brightness\(([\d.]+)\)/) || [])[1]);
  assert.ok(contrasto > 1 && contrasto <= 1.05,
    `il contrasto e' il modo giusto per vedere di piu', ma oltre 1.05 la foto diventa dura: era ${contrasto}`);
  assert.ok(luminosita <= 1.05,
    `la luminosita' va tenuta bassa: alzarla e' quello che ha fatto la nebbia (era ${luminosita})`);

  // Il bagliore era l'unico strato sfuggito all'interruttore: restava a piena forza
  // mentre tutto il resto scendeva. Ora passa anche lui da --forza.
  const lustro = css.match(/\.aura-lustro\s*\{[\s\S]*?\n\}/);
  assert.ok(lustro && !/var\(--aura\)\s+\d+%/.test(lustro[0]),
    'il bagliore non puo\' avere numeri propri: deve dipendere da --forza come gli altri');

  // L'aura e' una ricompensa: dev'essere d'oro in tutte e tre le classi, altrimenti
  // su due classi sembra parte del personaggio e su una no.
  // IL COLORE. Ste (12/10/2026): "e ancora piu' nero e giallo", poi "non ha piu'
  // la qualita' dell'inizio".
  //
  // L'aura era il giallo pieno dell'app. Ma `screen` non somma colori, li
  // schiaccia, e su uno sfondo scuro e FREDDO un giallo pieno schermato esce
  // VERDE OLIVA: per questo il riquadro sembrava malato invece che luminoso.
  //
  // Sulla FIGURA la luce e' bianca calda, e il giallo sta solo nell alone lontano,
  // dove la luce si e' gia' sciolta. Sono due colori distinti, e il test li separa
  // perche' tornare a un unico giallo e' esattamente il difetto da cui si esce.
  const senzaVirgolette = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(senzaVirgolette, /--aura:\s*var\(--giallo/,
    'il giallo pieno schermato esce verde oliva: la luce sulla figura e\' bianca calda');
  assert.match(senzaVirgolette, /--aura:\s*#fff4de/,
    'la luce sulla figura e\' un bianco caldo, non un colore');
  assert.match(senzaVirgolette, /--aura-oro:\s*#ffd35c/,
    'il giallo dell\'app resta, ma solo per l\'alone lontano');
  // E il giallo puo' stare SOLO nell alone lontano, non nel filo vicino.
  const conOro = senzaVirgolette.match(/[^}]*var\(--aura-oro\)[^;]*/g) || [];
  assert.ok(conOro.length >= 1 && conOro.every((frammento) => /drop-shadow/.test(frammento)),
    `l'oro puo' stare solo negli alone lontani: ${conOro.length} usi, alcuni fuori da un drop-shadow`);

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

  // 1) La luce arriva al bordo, ma NON con una cornice.
  //
  // Ste (12/10/2026) aveva chiesto "qui non e' giallo pure ai bordi come gli
  // altri" e io avevo risolto con una cornice luminosa disegnata lungo il riquadro.
  // Era la risposta sbagliata: una cornice si vede cornice, e per tre versioni
  // Ste ha detto "troppo acceso" guardando proprio quella. La richiesta vera era che
  // la LUCE arrivasse al bordo, e quello si ottiene allargando la maschera, senza
  // disegnare niente sopra.
  const regoleAfter = [...css.matchAll(/\.personaggio-scena-grafica\.personaggio-aura::after\s*\{([^}]*)\}/g)]
    .map((m) => m[1]);
  assert.ok(regoleAfter.length >= 1, 'deve esserci la regola dei fazzi');
  assert.doesNotMatch(
    css.replace(/\/\*[\s\S]*?\*\//g, '').match(/personaggio-aura::after\s*\{[^}]*\}/)?.[0] || '',
    /inset\s+0\s+0/,
    "l'aura non deve disegnare una cornice: arriva al bordo con la maschera, non con un bordo acceso",
  );
  assert.match(css, /mask-image:\s*radial-gradient\(100% 100%[^\n]*transparent 100%\)/,
    'la luce deve arrivare al bordo del riquadro');

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

  // 3) La luce NON arriva al bordo.
  //
  // Qui il test diceva il contrario ("deve esserci un alone largo che arriva fino al
  // bordo") e aveva ragione solo finche' non si e' visto il risultato. Ste (12/10):
  // prima "troppo acceso", poi "non e' cambiato molto".
  //
  // Su un'immagine con sfondo nero, la luce sul vuoto non dice niente: il vuoto resta
  // vuoto, solo un po' piu' color caffe'. E' il motivo per cui l'aura sembrava una
  // vignetta marrone invece di una figura con della luce intorno. La luce che si vede
  // e' quella che avvolge la FIGURA, e quella la disegna il contorno dorato, che
  //appunto e' l'unico strato a piena forza.
  const soloAura = css.match(/personaggio-aura::before\s*\{[\s\S]*?\n\}/);
  assert.ok(soloAura, "il primo strato dell'aura deve esistere");
  assert.doesNotMatch(soloAura[0], /radial-gradient\(1[0-9]{2}%/,
    'nell\'aura nessun gradiente puo\' essere piu\' largo del riquadro: tingerebbe gli angoli');
  assert.match(soloAura[0], /radial-gradient\(60% 54% at 50% 46%/,
    'l\'aria sta attorno alla figura, stretta');
});