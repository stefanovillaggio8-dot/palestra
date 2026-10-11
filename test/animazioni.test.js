// test/animazioni.test.js
//
// Ste (10/10/2026): "comunque io le animazioni non le vedo".
//
// IL MOTIVO ERA WINDOWS, NON IL CSS.
//
// Il CSS ha la regola di accessibilità standard che azzera le animazioni quando il
// browser dice `prefers-reduced-motion: reduce`. Su Windows quel segnale viene
// dall'interruttore "Effetti di animazione" in Impostazioni > Accessibilità >
// Effetti visivi, e sul PC di Ste era spento. Quindi tutte e 13 le animazioni
// erano azzerate da un pezzo, e sembrava che l'app non le avesse.
//
// Il default continua a ubbidire a Windows, che è la cosa giusta per chi le animazioni
// non le regge. Ma adesso c'è anche la scelta "sempre accese": se le vuoi e Windows
// le ha spente per un motivo che non c'entra, la tua scelta vale più del sistema.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../stile.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('il blocco che azzera le animazioni c\'è ancora', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/,
    'la regola di accessibilità non si tocca: chi non vuole le animazioni non le deve vedere');
});

test('ma non quando l\'utente ha scelto "sempre accese"', () => {
  // Il punto di tutta la modifica. Senza questo, l'app non poteva superare una
  // scelta di Windows, e per Ste l'app restava senza animazioni per sempre.
  const i = css.indexOf('@media (prefers-reduced-motion');
  const blocco = css.slice(i, i + 700);
  assert.match(blocco, /animation-duration/, 'azzera le animazioni');
  assert.match(blocco, /transition-duration/, 'e le transizioni');
  assert.match(blocco, /html:not\(.animazioni-sempre\)/,
    'ma il selettore deve escludere chi ha scelto "sempre accese"');
});

test('le animazioni esistono davvero nel CSS', () => {
  // Se non ci fossero, l'interruttore non servirebbe a niente: ci sarebbe solo un
  // pulsante che accende il vuoto.
  const chiavi = css.match(/@keyframes\s+([\w-]+)/g) || [];
  assert.ok(chiavi.length >= 10,
    `dovrebbero esserci almeno 10 animazioni, ci sono ${chiavi.length}`);
  for (const nome of ['dialogo-entra', 'avviso-entra', 'serie-accesa', 'tocco']) {
    assert.ok(css.includes('@keyframes ' + nome), 'manca ' + nome);
  }
});

test('il modulo delle animazioni esiste ed espone le tre scelte', () => {
  const mod = readFileSync(new URL('../src/animazioni.js', import.meta.url), 'utf8');
  for (const id of ['auto', 'sempre', 'mai']) {
    assert.ok(mod.includes("id: '" + id + "'"), 'manca la scelta ' + id);
  }
  assert.ok(mod.includes('animazioni-sempre'), 'la classe che il CSS ascolta');
  assert.ok(mod.includes('animazioni-mai'), 'e quella per chi le spegne del tutto');
});

test('l\'app applica la scelta prima di disegnare', () => {
  // Se stasse dentro una pagina, la prima schermata aprirebbe con la scelta vecchia.
  assert.ok(app.includes('avviaAnimazioni()'), 'l\'app deve chiamare avviaAnimazioni');
  const pos = app.indexOf('avviaAnimazioni();');
  const disegna = app.indexOf('function disegna');
  assert.ok(pos < disegna || disegna < 0, 'la scelta va applicata presto');
});

test('le Impostazioni hanno il blocco delle animazioni', () => {
  assert.ok(app.includes('bloccoAnimazioni'), 'il blocco esiste');
  assert.ok(app.includes('bloccoAnimazioni()'), 'e viene chiamato');
  // e dice cosa sta succedendo adesso, così se le animazioni non si vedono lo sa
  assert.ok(app.includes('chiede poco movimento'),
    'il blocco deve spiegare quando il dispositivo le ha spente');
});

test('il modulo delle animazioni è nella cache del service worker', () => {
  // Se non sta in cache, l'app non parte senza rete e resta senza la classe sul
  // <html>: tornano le animazioni di Windows, e sembra che l'interruttore non
  // funzioni. Sarebbe un bug che si vede solo offline.
  assert.ok(sw.includes('./src/animazioni.js'), 'manca dalla cache');
});

test('il default è "sempre accese", anche da telefono', () => {
  // Ste (10/10/2026): "le animazioni voglio vederle anche da telefono".
  //
  // Con il default "auto" dipendevano dal sistema, e i telefoni le spengono più
  // spesso del computer (iPhone con "Riduci movimento", Android col risparmio
  // batteria): quindi si vedevano sul PC e non da telefono, per un motivo che non
  // c'entrava con l'app.
  const mod = readFileSync(new URL('../src/animazioni.js', import.meta.url), 'utf8');
  assert.ok(mod.includes("|| 'sempre'"), 'senza memoria la scelta è sempre');
  // e una scelta ignota o corrotta non deve diventare "spente" né "auto":
  // il fallback è quello che l'utente voleva
  assert.ok(mod.includes("v) ? v : 'sempre'"), 'una scelta ignota torna a sempre');
});

test('"spente" esiste davvero, se un giorno le animazioni non vanno', () => {
  // Il default being "sempre" non vuol dire che non si possa spegnerle: se un
  // giorno danno fastidio, l'app deve potersi spegnere da sola.
  const mod = readFileSync(new URL('../src/animazioni.js', import.meta.url), 'utf8');
  assert.ok(mod.includes("id: 'mai'"), 'la scelta "spente" esiste');
  assert.ok(mod.includes('animazioni-mai'), 'e mette una classe che il CSS può ascoltare');
});

test('c\'è un bottone che mostra un\'animazione vera', () => {
  // Ste: "ma io ancora sul telefono non ne vedo animazioni".
  //
  // Da fuori non si può capire se il problema è il browser, la copia vecchia della
  // pagina, o il fatto che le animazioni dell'app scattano solo quando tocchi
  // qualcosa e lui stava guardando una schermata ferma. Serve qualcosa che si
  // muove quando lo chiedi, senza doverlo indovinare.
  assert.ok(app.includes('PROVA ANIMAZIONE'), 'il bottone c\'è');
  assert.ok(css.includes('.prova-pallina.in-corso'), 'e muove qualcosa');
  assert.ok(css.includes('@keyframes prova-gira'), 'una rotazione');
  assert.ok(css.includes('@keyframes prova-pulse'), 'e un cambio di opacità');
  // due animazioni diverse: se il browser ne ignora una, si vede lo stesso
  assert.ok(/animation:[^;]*prova-gira[^;]*prova-pulse/.test(css),
    'le due devono partire insieme');
});

test('il bottone della prova viene davvero aggiunto a schermo', () => {
  // Il bug vero di Ste: "non ce ne sono palline".
  //
  // Il bottone veniva costruito con `bottone('PROVA ANIMAZIONE', {...})` e il
  // risultato buttato via: non è mai finito nella pagina. La pallina c'era, ma non
  // c'era il bottone per farla muovere, quindi sembrava che le animazioni non
  // funzionassero.
  //
  // Il controllo è sul testo del codice, non sull'esecuzione: vale per tutti i
  // bottone di questa schermata, non solo per quello della prova.
  const schermata = app.slice(app.indexOf('function bloccoAnimazioni'));
  const fine = schermata.indexOf('\nfunction vistaImpostazioni');
  const corpo = fine > 0 ? schermata.slice(0, fine) : schermata;

  // ogni bottone(...) deve finire dentro box.appendChild(...)
  const chiamate = [...corpo.matchAll(/^\s*bottone\(/gm)];
  for (const c of chiamate) {
    const riga = corpo.slice(0, c.index).split('\n').pop();
    assert.ok(/box\.appendChild\(bottone\(/.test(corpo.slice(Math.max(0, c.index - 20), c.index + 1)),
      `un bottone costruito ma non aggiunto: "${riga.trim()}"`);
  }
  // e ci sono davvero i due bottoni che devono esserci
  assert.ok(/box\.appendChild\(bottone\('PROVA ANIMAZIONE'/.test(corpo), 'manca il bottone della prova');
  assert.ok(/rigaAggiorna\.appendChild\(bottone\('AGGIORNA ORA'/.test(corpo), 'manca il bottone aggiorna');
});

test('c\'è un modo per buttare via la copia vecchia', () => {
  // Ste: "ma io ancora sul telefono non ne vedo animazioni". La causa più probabile
  // su un telefono è la copia in cache: l'app è aperta da prima e continua a
  // servire il CSS di ieri, anche se il sito è cambiato.
  assert.ok(app.includes('AGGIORNA ORA'), 'il bottone c\'è');
  assert.ok(app.includes('getRegistrations'), 'tira via il service worker');
  assert.ok(app.includes('caches.delete'), 'e la cache dei file');
  assert.ok(app.includes('location.reload'), 'poi ricarica');
});

test('"aggiorna ora" non tocca i dati', () => {
  // Il rischio vero di una funzione così: se cancellasse anche IndexedDB, gli
  // perderei account, sedute e record. Qui si cancellano solo i FILE.
  const i = app.indexOf('AGGIORNA ORA');
  const corpo = app.slice(i, i + 900);
  assert.ok(!/indexedDB|cancellaTutto|Elimina tutto|azzeraTutto/.test(corpo),
    'non deve toccare IndexedDB: i dati del account stanno lì');
});

test('il pannello di diagnostica non può rompere l\'app', () => {
  // Il pannello legge cose che non sono garantite (`document.documentElement`,
  // `getComputedStyle`, i `cssRules` dei fogli di stile). Se una manca, la riga
  // deve dire "non disponibile" e l'app va avanti: un pannello che serve a
  // diagnosticare non può essere lui stesso la cosa che rompe.
  assert.ok(app.includes('function righeAnimazioni'), 'la lettura è in una funzione');
  assert.ok(app.includes('non disponibile'), 'e ha un fallback');
  const corpo = app.slice(app.indexOf('function righeAnimazioni'));
  const fine = corpo.indexOf('\n}');
  assert.ok(corpo.slice(0, fine).includes('try'), 'la lettura è dentro un try');
});

test('il blocco reduced-motion sta in fondo al CSS', () => {
  // Se sta in mezzo, una regola dopo con la stessa importanza lo annulla e le
  // animazioni si spengono anche quando Ste ha scelto "sempre accese".
  const i = css.indexOf('@media (prefers-reduced-motion');
  const dentro = css.slice(i);
  assert.ok(!/@keyframes/.test(dentro),
    'non deve stare niente dopo: deve essere l\'ultima regola del file');
});

test('ogni animazione dura abbastanza da essere vista', () => {
  // Ste (10/10/2026): "funziona ma le vedo solo lì le animazioni".
  //
  // La pallina di prova si vedeva, e quella gira per 1,1s due volte. Le altre erano
  // di 0,14s e 0,18s: un decimo e un quinto di secondo. Su un telefono non si
  // vedono, e il caso peggiore è che erano le più corte proprio quelle che
  // scattano più spesso (toccare un bottone, aprire il calendario).
  //
  // Sotto i 0,25s un'animazione non è un'animazione: è un salto. Le uscite restano
  // sotto, e devono restarci: uscire è più veloce che entrare, altrimenti l'app
  // sembra lentissima quando chiudi una cosa.
  const soglie = { entra: 0.25, esce: 0.12 };
  const problemi = [];
  for (const m of css.matchAll(/animation:\s*([\w-]+)\s+([\d.]+)s/g)) {
    const [, nome, secondi] = m;
    const durata = Number(secondi);
    const minimo = /-esce$/.test(nome) ? soglie.esce : soglie.entra;
    if (durata < minimo) {
      problemi.push(`${nome} dura ${secondi}s (minimo ${minimo}s)`);
    }
  }
  assert.deepEqual(problemi, [],
    `animazioni troppo rapide per essere viste: ${problemi.join(', ')}`);
});

test('il tocco su un bottone si sente davvero', () => {
  // Il caso più frequente di tutti: si tocca un bottone, e non si vede niente.
  // Controlla che l'effetto ci sia e non sia una sfumatura impercettibile.
  const i = css.indexOf('@keyframes tocco {');
  const blocco = css.slice(i, css.indexOf('}', css.indexOf('100%', i)));
  const scale = [...blocco.matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]));
  assert.ok(scale.length >= 2, 'il tocco deve avere almeno inizio e fine');
  const minimo = Math.min(...scale);
  assert.ok(minimo <= 0.9,
    `il bottone deve abbassarsi almeno del 10% quando lo tocc: scende al ${minimo}`);
});

test('il traguardo ha un\'animazione sua, diversa da tutti gli altri avvisi', () => {
  // Ste (10/10/2026): "aggiungi più animazioni".
  //
  // Questo è l'unico momento dell'app in cui qualcosa di vero è successo: un Rank
  // salito, un record battuto. Aveva la stessa animazione di "questo esercizio è
  // opzionale". La skill dice che il movimento deve rispondere a un'azione e
  // mostrare che cosa è cambiato: qui è esattamente il contrario.
  assert.ok(css.includes('@keyframes traguardo'), 'il traguardo ha un\'animazione sua');
  assert.ok(/\.avviso-traguardo\s*\{/.test(css), 'e il suo stile');
  assert.ok(css.includes('alone-traguardo'), 'con anche l\'alone che va via');
  // non deve essere uno scivolamento dal basso come un avviso qualsiasi
  const i = css.indexOf('@keyframes traguardo {');
  const blocco = css.slice(i, css.indexOf('}', css.indexOf('100%', i)));
  assert.ok(/scale\(\.8\)/.test(blocco), 'deve partire più piccolo');
  assert.ok(/scale\(1\.0[0-9]/.test(blocco), 'e scattare sopra la sua misura');
});

test('l\'annuncio dei Rank saliti usa il tipo traguardo', () => {
  // Se tornasse a "ok", l'annuncio più importante dell'app avrebbe l'animazione di
  // un messaggio qualsiasi.
  const i = app.indexOf('export function annunciaFineSeduta');
  const fine = app.indexOf('\nexport function', i + 10);
  const corpo = fine > 0 ? app.slice(i, fine) : app.slice(i, i + 2500);
  assert.match(corpo, /tipo: 'traguardo'/, 'deve dire quale tipo di avviso è');
  assert.doesNotMatch(corpo, /tipo: 'ok'/, 'e non "ok"');
});

test('il campo conferma il numero quando ESCI, non a ogni tasto', () => {
  // La regola della skill: il movimento risponde a un'azione. Se il campo
  // lampeggiasse a ogni tasto premuto diventa una cosa fastidiosa che non dice
  // niente: è il rumore di fondo che rende le animazioni insopportabili.
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  const i = ui.indexOf('campo-confermato');
  assert.ok(i > 0, 'la classe deve esistere');
  const blocco = ui.slice(Math.max(0, i - 400), i);
  assert.match(blocco, /addEventListener\('change'/,
    'deve stare su "change", che parte quando esci dal campo');
  assert.doesNotMatch(blocco, /addEventListener\('input'/,
    'e NON su "input", che parte a ogni tasto');
  assert.ok(css.includes('@keyframes campo-confermato'), 'e deve avere il movimento');
});

test('ci sono tre animazioni che si muovono da sole', () => {
  // Ste (10/10/2026): "devono esserci animazioni anche senza che faccio qualcosa".
  //
  // La regola del design è che il movimento senza gesto si usa con parsimonia e solo
  // per attirare l'attenzione: animazioni a caso su ogni scheda si leggono come
  // rumore e dopo due giorni danno fastidio. Quindi qui sono TRE, non trenta.
  for (const nome of ['fiamma-respira', 'personaggio-respira', 'strada-luccichio']) {
    assert.ok(css.includes('@keyframes ' + nome), 'manca ' + nome);
  }
  // e tutte e tre devono essere lente: se una dura mezzo secondo e ricomincia,
  // l'app sembra lampeggiare invece di respirare
  for (const nome of ['fiamma-respira', 'personaggio-respira', 'strada-luccichio']) {
    const uso = new RegExp('animation:\\s*' + nome + '\\s+([\\d.]+)s').exec(css);
    assert.ok(uso, nome + ' non è usata da nessuna parte');
    assert.ok(Number(uso[1]) >= 2.5,
      `${nome} dura ${uso[1]}s: sotto due secondi e mezzo non è "respirare", è lampeggiare`);
  }
});

test('la fiamma respira SOLO quando è accesa', () => {
  // Una fiamma che pulsa mentre è spenta dice "stai andando bene" quando non è
  // vero. È il difetto che Ste aveva già segnalato una volta, con un'altra
  // animazione: non deve tornare da un'altra parte.
  assert.match(css, /\.teschio-streak\.acceso\s*\{[\s\S]*?fiamma-respira/,
    'la respirazione deve stare sulla card accesa');
  assert.match(css, /\.teschio-streak:not\(\.acceso\)\s*\{[\s\S]*?animation:\s*none/,
    'e le altre devono stare ferme');
});

test('la respirazione non ruba l\'animazione del numero che è cambiato', () => {
  // Se la fiamma respirasse anche sul NUMERO, le due animazioni si contenderebbero
  // `transform` e vincerebbe sempre la più specifica: il "questo numero è nuovo"
  // non si vedrebbe MAI. Sono due informazioni diverse e ognuna sul suo elemento.
  const fiammata = /\.teschio-streak[^{]*\{[^}]*fiamma-respira/;
  assert.doesNotMatch(css, /\.fuoco[^{]*\{[^}]*fiamma-respira/,
    'la respirazione non deve stare sul numero: li\' condividerebbero il transform');
  assert.ok(fiammata.test(css), 'deve stare sulla card');
  // e il numero deve poter pulsare da solo
  assert.match(css, /\.numero-cambiado|\.numero-cambiato\s*\{[^}]*numero-pulse/,
    'il numero deve poter pulsare quando il valore cambia');
});

test('una sola animazione si prende la scena', () => {
  //
  // Il modo di capire se un'animazione si prende la scena NON è quanto scala: una
  // cella del calendario che si allarga del 18% è riscontro, non show. È l'ALONE
  // che si espande in un alone che esce dal riquadro, perché quello cattura l'occhio
  // anche se non stai guardando lì.
  //
  // Quindi si controlla che l'alone ce l'abbia solo il traguardo. Se un domani
  // un'altra animazione aggiunge un alone che si espande, il messaggio del traguardo
  // smette di dire niente: due cose urlano insieme e non si sente nessuna.
  const conAlone = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)]
    .filter(([, , corpo]) => {
      // un alone che si ESPANDE: i valori di `0 0 0 N` non sono tutti uguali.
      // Il primo spesso è `0 0 0 0` senza `px`, quindi la regex non può pretendere
      // l'unità: altrimenti l'alone del traguardo non verrebbe visto e il test
      // passerebbe mentre non controlla niente.
      const spread = [...corpo.matchAll(/0 0 0\s+([\d.]+)(?:px)?/g)].map((m) => Number(m[1]));
      return spread.length >= 2 && Math.max(...spread) > Math.min(...spread) + 4;
    })
    .map(([, nome]) => nome);
  assert.deepEqual(conAlone, ['alone-traguardo'],
    `solo il traguardo può avere un alone che si espande, ma lo hanno anche: ${conAlone.join(', ')}`);
});

test('le scale esagerate sono solo nei posti giusti', () => {
  // Una scala forte ha senso dove il numero o l'oggetto è il contenuto (la pallina
  // della prova, una cella che compare) e nel tocco, dove il dito la aspetta.
  // Non ha senso su un riquadro intero che arriva dal basso: quello è un messaggio,
  // e un messaggio che si ingrandisce sembra un errore.
  const eccezioni = new Set(['traguardo', 'cella-pulse', 'numero-pulse', 'prova-gira', 'tocco']);
  const esagerate = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)]
    // `[, nome]` e non `[nome]`: il primo elemento di un match è TUTTO il testo
    // trovato ("@keyframes cella-pulse {..."), non il nome catturato. Con `[nome]`
    // l'eccezione non scattava mai e il test accusava anche i nomi giusti.
    .filter(([, nome]) => !eccezioni.has(nome))
    .map(([, nome, corpo]) => [nome, [...corpo.matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]))])
    .filter(([, scale]) => scale.some((s) => s >= 1.15 || s <= 0.6))
    .map(([nome]) => nome);
  assert.deepEqual(esagerate, [],
    `scala esagerata dove non serve: ${esagerate.join(', ')}`);
});