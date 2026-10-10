// calendario.test.js -- il calendario grande, da oggi a per sempre.
//
// Ste (09/10/2026), seconda richiesta sul calendario: "il calendario deve essere
// grande, da oggi a per sempre e deve segnare solo in verde i giorni in cui ci sono
// andato e in rosso i giorni che ho saltato e in viola quelli di recupero".
//
// La prima versione facevasette caselle: la settimana corrente. Ste l'ha respinta, e
// aveva ragione su tre cose, ognuna con un motivo:
//
//  1. SETTE CASELLE NON SONO UN CALENDARIO. Un calendario di sette caselle e' una
//     settimana, e una settimana non si può consultare: il giorno che ti serve
//     (quando ho saltato giovedì?) è cinque settimane fa. Il calendario parte dal mese
//     in cui hai iniziato ad allenarti e arriva a un mese avanti: si vede lo storico
//     E il futuro, e il futuro è la parte che puoi cambiare.
//
//  2. I TRE COLORI SONO TRE COSE DIVERSE, NON TRE DECORAZIONI:
//     - VERDE: ci sei andato. L'unica cosa buona.
//     - ROSSO: era un giorno che ti toccava, non l'hai fatto, il giorno è passato.
//       È L'UNICO che rompe la streak, quindi senza vederlo in rosso non capisci
//       perché il numero è tornato a zero.
//     - VIOLA: giorno di recupero, cioè non ti toccava. NON è una punizione: è il
//       motivo per cui puoi allenarti quattro volte su sette senza perdere niente.
//
//  3. LE FASCE DI MESI, non sette caselle isolate: ogni mese è una griglia sette
//     colonne, e sotto ogni giorno c'è il numero. Il numero è necessario: senza, un
//     calendario di più mesi è una parete di quadratini senza data.
//
// Qui si verifica la LOGICA e la STRUTTURA: ogni giorno riceve la classe giusta,
// i colori sono quelli richiesti, e la spiegazione sta dove serve.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const srcApp = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

/** Il corpo di una funzione. */
function corpo(nome) {
  const inizio = srcApp.indexOf(`function ${nome}(`);
  assert.ok(inizio >= 0, `non trovo ${nome}`);
  let i = srcApp.indexOf('{', inizio);
  let prof = 0;
  for (; i < srcApp.length; i++) {
    if (srcApp[i] === '{') prof++;
    else if (srcApp[i] === '}') { prof--; if (prof === 0) return srcApp.slice(inizio, i + 1); }
  }
  return srcApp.slice(inizio);
}

const cal = corpo('bloccoCalendario');

test('C1. il calendario parte dal primo allenamento e arriva a un mese avanti', () => {
  // "da oggi a per sempre": parte dal PRIMO GIORNO in cui ti sei allenato, non da
  // oggi. Se partisse da oggi, il calendario mostrerebbe solo il futuro e il suo
  // unico uso sarebbe dire "oggi ti tocca": il passato, che è la parte che ti dice
  // se sei regolare, non ci sarebbe.
  assert.match(cal, /primoGiorno = giorniFatti\.size \? \[\.\.\.giorniFatti\]\.sort\(\)\[0\] : oggi/,
    'deve partire dal primo allenamento della tua storia');
  assert.match(cal, /meseFine = aggiungiMesi\(oggi, 1\)/,
    'e arrivare un mese avanti: il futuro già pianificato, che è la parte che puoi cambiare');
  assert.match(cal, /while \(cursore <= meseFine\)/,
    'e quindi tutti i mesi in mezzo, uno dopo l\'altro');
});

test('C2. ogni mese è una griglia di SETTE colonne', async () => {
  // Se le colonne non sono sette, i giorni non sommano e il calendario mente.
  // La griglia sta nel CSS, quindi il CSS va letto qui.
  const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');
  assert.match(css, /\.calendario-coppie \{[\s\S]{0,140}?repeat\(7, 1fr\)/,
    'sette colonne: lunedì-venerdì-sabato-domenica, l\'ordine italiano');
  assert.match(cal, /inizioRiga\.setDate\(primoDelMese\.getDate\(\) - \(\(primoDelMese\.getDay\(\) \+ 6\) % 7\)\)/,
    'e ogni mese parte dal lunedì della sua prima settimana');
  assert.match(cal, /d\.getMonth\(\) === m - 1 && d\.getFullYear\(\) === a/,
    'i giorni fuori dal mese vengono marcati, altrimenti i mesi hanno colonne sbagliate');
});

test('C3. i TRE colori richiesti: verde fatto, rosso saltato, viola recupero', () => {
  // Le tre richieste di Ste, ognuna con il perché per cui è giusta.
  assert.match(cal, /if \(fatto\) classi\.push\('fatto'\)/,
    'VERDE: i giorni in cui ci sei andato');
  assert.match(cal, /else if \(saltato\) classi\.push\('saltato'\)/,
    'ROSSO: i giorni che hai saltato');
  assert.match(cal, /else if \(recupero && passato\) classi\.push\('recupero'\)/,
    'VIOLA: i giorni di recupero');
  // E il viola NON deve essere il previsto. Se il "previsto" fosse viola come prima,
  // il recupero e il giorno che ti tocca avrebbero lo stesso colore, e non sapresti
  // quale dei due è un fallo.
  assert.match(cal, /if \(previsto && !fatto && !saltato\) classi\.push\('atteso'\)/,
    'il giorno che ti tocca deve avere un colore DIVERSO dal recupero');
});

test('C4. il SALTATO è l\'unico che rompe la streak, quindi è rosso e passato', () => {
  // IL SALTATO E' IL PIU' IMPORTANTE. È l'unico che rompe la streak. Se la condizione
  // non richiedesse che il giorno sia PASSATO, il giorno di oggi risulterebbe
  // "saltato" prima di arrivare a sera: che è falso, perché è ancora oggi.
  assert.match(cal, /const saltato = passato && previsto && !fatto/,
    'il saltato richiede che il giorno sia passato: oggi non è un giorno saltato');
  // E il recupero non conta mai come saltato: se dicesse il contrario, i giorni di
  // recupero (che NON devi fare) ti romperebbero la streak.
  assert.match(cal, /const previsto = nelMese && previsti\.has\(d\.getDay\(\)\)/,
    'e solo i giorni che hai scelto possono essere saltati');
});

test('C5. la risposta "oggi mi tocca?" sta SOPRA tutto', () => {
  // Un calendario grande senza questa frase in cima costringe a cercare oggi fra
  // decine di caselle. La domanda che ti fai guardando il Profilo è "oggi mi tocca?".
  const iFrase = cal.indexOf('nota-grande');
  const iGriglia = cal.indexOf("class: 'calendario-fasce'");
  assert.ok(iFrase >= 0, 'deve esserci la frase in evidenza');
  assert.ok(iGriglia > iFrase,
    'e deve stare PRIMA del calendario: è la risposta, il calendario è il dettaglio');
  assert.match(cal, /Oggi hai allenato/, 'se hai allenato oggi');
  assert.match(cal, /Oggi ti tocca e non l'hai ancora fatto/, 'se oggi ti tocca e non l\'hai fatto');
  assert.match(cal, /giorno di recupero: non ti toglie niente/,
    'e se oggi è di recupero, che non ti toglie niente: la frase deve dirlo, '
    + 'altrimenti il riposo sembra una punizione');
  assert.match(cal, /Non hai ancora scelto i giorni/,
    'senza giorni scelti deve dirlo, non lasciare un calendario tutto viola');
});

test('C6. la LEGENDA dice cosa vuol dire ogni colore', () => {
  // Tre colori senza spiegazione sono tre decorazioni. Senza sapere che il rosso è
  // il giorno perso, il rosso è solo un colore.
  assert.match(cal, /legenda-calendario/, 'deve esserci la legenda');
  assert.match(cal, /testo: 'allenato'/, 'e dire cosa significa il verde');
  assert.match(cal, /testo: 'saltato'/, 'e il rosso');
  assert.match(cal, /testo: 'giorno di recupero'/, 'e il viola');
  assert.match(cal, /testo: 'ti tocca'/, 'e il giorno che ti aspetta');
});

test('C7. ogni casella ha un\'etichetta per chi non vede i colori', () => {
  // Tre stati comunicati solo col colore sono inaccessibili a chi non distingue il
  // verde dal rosso, e sul telefono in piena luce non si vedono. L'etichetta `aria`
  // dice le cose a parole: "mercoledì 6: saltato, giorno che ti toccava".
  assert.match(cal, /aria: \{ label: ariaGiorno/, 'ogni casella deve avere un\'etichetta');
  assert.match(corpo('ariaGiorno'), /giorno di recupero/, 'che dice se è recupero');
  assert.match(corpo('ariaGiorno'), /giorno che ti toccava/, 'e se è saltato');
});

test('C8. il CSS: le tre classi hanno i tre colori richiesti', async () => {
  const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');
  // IL SALTATO DEVE ESSERE DAVVERO ROSSO. È l'unico che rompe la streak.
  const bloccoSaltato = /\.cella-calendario\.saltato \{[\s\S]{0,220}?\}/.exec(css);
  assert.ok(bloccoSaltato, 'manca il blocco .saltato');
  assert.match(bloccoSaltato[0], /rosso/,
    'lo stato "saltato" non usa il rosso: è il giorno perso, deve sembrarlo');
  // IL FATTO DEVE ESSERE VERDE.
  const bloccoFatto = /\.cella-calendario\.fatto \{[\s\S]{0,220}?\}/.exec(css);
  assert.ok(bloccoFatto, 'manca il blocco .fatto');
  assert.match(bloccoFatto[0], /verde/,
    'e lo stato "fatto" non usa il verde: così non si distingue a colpo d\'occhio');
  // IL RECUPERO DEVE ESSERE VIOLA.
  const bloccoRecupero = /\.cella-calendario\.recupero \{[\s\S]{0,220}?\}/.exec(css);
  assert.ok(bloccoRecupero, 'manca il blocco .recupero');
  assert.match(bloccoRecupero[0], /viola/,
    'e il recupero non è viola: è il giorno che NON devi fare, e dev\'essere diverso dal giorno che ti tocca');
  // LA GRIGLIA A SETTE COLONNE.
  assert.match(css, /\.calendario-coppie \{[\s\S]{0,120}?repeat\(7, 1fr\)/,
    'la griglia dei giorni deve essere a sette colonne');
  // I giorni fuori dal mese non si vedono, o ogni mese sembra shiftato di una colonna.
  assert.match(css, /\.cella-calendario\.fuori \{[^}]*opacity: 0/,
    'i giorni fuori dal mese devono sparire, altrimenti le colonne sbagliano');
});

test('C9. il calendario sta nel PROFILO e legge i giorni dal profilo', () => {
  // Deve stare dove ci sono anche la streak e l'avatar: la domanda "oggi mi tocca?"
  // e la domanda "la mia streak com'è" sono la stessa domanda vista da due lati.
  assert.match(corpo('vistaProfilo'), /bloccoCalendario\(/,
    'il calendario deve essere nel Profilo');
  assert.match(cal, /profilo\.giorni_allenamento/,
    'i previsti vengono dal profilo della persona, non da una lista fissa');
  assert.match(cal, /st\.streak\.giorniAllenati/,
    'e i fatti dalla streak, che viene dai dati veri delle sedute');
});

// ---- IL PERSONAGGIO E IL PULSANTE ----
//
// Ste: "inoltra fai che quando scelgo guerriero ecc... deve aggiornarsi un personaggio
// che metti dove gli vengono messe cose tipo l'armatura ecc... che si aggiorna
// automaticamente e metti pure un pulsante che ti spiega come funziona questo rpg".

test('P1. il personaggio si disegna col colore della classe e le armature addosso', () => {
  const per = corpo('bloccoPersonaggio');
  assert.match(per, /class: 'personaggio personaggio-' \+ classeId/,
    'il personaggio deve cambiare aspetto con la classe');
  assert.match(per, /personaggio-arma persona-arma-alta/,
    'e le armature sbloccate si vedono sul personaggio');
  assert.match(per, /indosano = rpg\.premi\.filter\(\(p\) => p\.sbloccato\)/,
    'la classe aggiorna il personaggio: le armature cambiano quando sblocchi');
});

test('P2. c\'è il PULSANTE che spiega come funziona l\'RPG', () => {
  const per = corpo('bloccoPersonaggio');
  assert.match(per, /bottone\('Come funziona questo RPG\?'/,
    'deve esserci il pulsante che spiega');
  // E che si apra e si chiuda, cambiando etichetta: altrimenti non sai se è aperto.
  assert.match(per, /spiegazione\.hidden = !spiegazione\.hidden/,
    'il riquadro si apre e si chiude');
  assert.match(per, /Chiudi la spiegazione/,
    'e il pulsante cambia etichetta, così non devi indovinare');
});

test('P3. la spiegazione dice le TRE statistiche e cosa NON conta', () => {
  const sp = corpo('spiegazioneRpg');
  assert.match(sp, /Forza/, 'la spiegazione deve dire cos\'è la forza');
  assert.match(sp, /Agilita/, 'e l\'agilità');
  assert.match(sp, /Stamina/, 'e la stamina');
  assert.match(sp, /500 kg/, 'e da quanto viene un punto di forza');
  assert.match(sp, /Cosa NON conta/,
    'e deve dire cosa NON conta: il livello non è quanto sei forte');
  assert.match(sp, /non ti perdi niente/,
    'e che cambiando classe non si perdono le armature');
});