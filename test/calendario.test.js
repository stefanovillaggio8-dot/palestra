// calendario.test.js -- il calendario vero: un anno intero, con i numeri dei giorni.
//
// Ste (09/10/2026), terza richiesta sul calendario: "il calendario deve essere proprio
// un calendario, che da ora fino al 2027 ecc...".
//
// Prima gli avevo proposto sette caselle (una settimana). Poi una striscia di mesi
// uno sotto l'altro. Due volte aveva ragione lui: un calendario, nel senso di tutti i
// giorni, e' un'altra cosa.
//
// QUI SI VERIFICA LA STRUTTURA, cioe' che le cose ci siano e siano nel posto giusto.
// I COLORI che escono davvero sono veri in `calendario-colori.test.js`, che chiama la
// funzione e conta le celle.

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
const mese = corpo('bloccoMese');
const frase = corpo('rigaOggi');

test('C1. si parte dall anno di oggi e si va fino al 2027 con le frecce', () => {
  // Il "ecc..." di Ste sono le frecce: si parte dall'anno in cui sei e si cambia anno
  // con due frecce. Senza di quelle, "fino al 2027" è una promessa che non si può
  // mantenere: l'unico modo di arrivare al 2027 sarebbe aspettare che arrivi.
  assert.match(cal, /statoCalendario\.anno === null \? oggiAnno : statoCalendario\.anno/,
    'di default si parte dall\'anno di oggi');
  assert.match(cal, /bottone\('‹'/, 'la freccia per andare all\'anno prima');
  assert.match(cal, /bottone\('›'/, 'la freccia per andare all\'anno dopo');
  assert.match(cal, /bottone\('A oggi'/, 'il bottone per tornare a oggi');
  assert.match(cal, /statoCalendario\.anno = nuovo; disegna\(\)/, 'cambiare anno ridisegna');
});

test('C2. parte dal primo allenamento, non dal primo gennaio', () => {
  // Un calendario con due anni di quadratini vuoti davanti non è un calendario: è
  // rumore con dei numeri dentro. Si parte dal mese della prima seduta.
  assert.match(cal, /primoGiorno = giorniFatti\.size \? \[\.\.\.giorniFatti\]\.sort\(\)\[0\] : oggi/,
    'parte dal primo allenamento della tua storia');
  assert.match(cal, /const meseIniziale = \(anno === oggiAnno\)/,
    'e nell\'anno in cui sei parte dal mese della prima seduta');
});

test('C3. i mesi sono una tabella, non una lista', () => {
  // Dodici mesi in colonna diventano una lista da scorrere. Un calendario mette i
  // mesi in fila, come tutti i calendari.
  assert.match(cal, /class: 'calendario-anno'/, 'c\'è la griglia dei mesi');
  assert.match(cal, /for \(let m = meseIniziale; m <= 12; m\+\+\)/, 'tutti i mesi dell\'anno');
});

test('C4. ogni giorno mostra il SUO numero', () => {
  // Questo è il punto che distingue un calendario da sette quadratini colorati: senza
  // il numero non sai QUANDO è successo. Con il numero diventa "martedì 6".
  assert.match(mese, /testo: String\(d\.getDate\(\)\)/, 'la cella mostra il numero del giorno');
});

test('C5. ogni mese parte dal lunedì, o il calendario mente', () => {
  // L'errore più comune dei calendari scritti a mano: se il mese non parte dal
  // lunedì, il giorno 1 cade sotto la colonna sbagliata e tutto il mese è spostato.
  // "Martedì 6" finisce sotto "giovedì" e nessuno se ne accorge.
  assert.match(mese, /inizio\.setDate\(primoDelMese\.getDate\(\) - \(\(primoDelMese\.getDay\(\) \+ 6\) % 7\)\)/,
    'la prima riga parte dal lunedì della settimana del primo del mese');
  assert.match(mese, /fine\.setDate\(ultimo\.getDate\(\) \+ \(6 - \(\(ultimo\.getDay\(\) \+ 6\) % 7\)\)\)/,
    'e l\'ultima finisce sulla domenica');
  // i giorni fuori dal mese prendono posto ma non si vedono: senza, ogni mese avrebbe
  // una colonna in più e i giorni non sommano.
  assert.match(mese, /cella-calendario fuori/, 'i giorni fuori dal mese esistono ma spariscono');
});

test('C6. i TRE colori richiesti: verde fatto, rosso saltato, viola recupero', () => {
  // Le tre richieste di Ste, ognuna con il perché per cui è giusta.
  assert.match(mese, /if \(fatto\) classi\.push\('fatto'\)/, 'VERDE: ci sei andato');
  assert.match(mese, /else if \(saltato\) classi\.push\('saltato'\)/, 'ROSSO: hai saltato un giorno che ti toccava');
  assert.match(mese, /else if \(!previsto && passato\) classi\.push\('recupero'\)/, 'VIOLA: giorno di recupero');
  // E il giorno che ti tocca deve essere DIVERSO dal recupero, altrimenti non sai
  // quale dei due è un fallo.
  assert.match(mese, /classi\.push\('atteso'\)/, 'il giorno che ti aspetta ha un colore suo');
});

test('C7. il SALTATO richiede tre cose insieme', () => {
  // IL SALTATO È L'UNICO CHE ROMPE LA STREAK. Se non richiedesse che il giorno sia
  // passato, oggi risulterebbe "saltato" prima di sera, che è falso. E un giorno di
  // recupero non è mai saltato: non ti toccava.
  assert.match(mese, /const saltato = passato && previsto && !fatto/, 'deve essere passato E previsto E non fatto');
});

test('C8. accanto al mese c\'è quante giornate hai allenato', () => {
  // Senza questo, "marzo com\'è andato?" si risponde leggendo il mese giorno per
  // giorno. Con il numero lì accanto si risponde subito.
  assert.match(mese, /class: 'calendario-conto'/, 'il conteggio sta accanto al nome');
  assert.match(mese, /fattiDelMese = \[\.\.\.giorniFatti\]\.filter\(\(g\) => g\.startsWith\(prefisso\)\)\.length/,
    'e conta i giorni davvero allenati in quel mese');
});

test('C9. la risposta "oggi mi tocca?" sta SOPRA tutto', () => {
  // Con un anno di caselle, trovare oggi è impossibile. La risposta va in cima.
  const iFrase = cal.indexOf('rigaOggi(previsti');
  const iGriglia = cal.indexOf("class: 'calendario-anno'");
  assert.ok(iFrase >= 0, 'la frase c\'è');
  assert.ok(iGriglia > iFrase, 'e sta PRIMA del calendario');
  assert.match(frase, /Oggi hai allenato/, 'se hai allenato oggi');
  assert.match(frase, /Oggi ti tocca e non l'hai ancora fatto/, 'se oggi ti tocca');
  assert.match(frase, /giorno di recupero: non ti toglie niente/, 'se oggi è di recupero');
  assert.match(frase, /Non hai ancora scelto i giorni/, 'se non hai scelto i tuoi giorni');
});

test('C10. premi un giorno e vedi cosa ci hai fatto', () => {
  // Un calendario che non si lascia cliccare è uno sfondo.
  assert.match(mese, /onClick: \(\) => \{/, 'i giorni sono premibili');
  assert.match(mese, /statoCalendario\.giorno = \(statoCalendario\.giorno === isoCell\) \? null : isoCell/,
    'e premere lo stesso giorno lo richiude');
  assert.match(cal, /dettaglioGiorno\(statoCalendario\.giorno\)/, 'sotto compare cosa hai fatto');
  assert.match(corpo('dettaglioGiorno'), /Qui non hai allenato/, 'anche quando non hai allenato');
});

test('C11. ogni casella ha un\'etichetta per chi non vede i colori', () => {
  // Tre stati comunicati solo col colore sono inaccessibili a chi non distingue il
  // verde dal rosso, e sul telefono in piena luce non si vedono.
  assert.match(mese, /aria: \{ label: ariaGiorno/, 'ogni casella ha un\'etichetta');
  assert.match(corpo('ariaGiorno'), /giorno di recupero/, 'che dice se è recupero');
  assert.match(corpo('ariaGiorno'), /giorno che ti toccava/, 'e se è saltato');
});

test('C12. il CSS: i mesi in fila e le celle quadrate e piccole', async () => {
  const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');
const grigliaAnno = /\.calendario-anno \{[\s\S]{0,260}?\}/.exec(css);
  assert.ok(grigliaAnno, 'manca la griglia dei mesi');
  assert.match(grigliaAnno[0], /grid-template-columns: repeat\(auto-fill, minmax\(/,
    'i mesi vanno a FILO, non uno sotto l\'altro');
  assert.match(css, /\.calendario-coppie \{[\s\S]{0,140}?repeat\(7, 1fr\)/,
    'e ogni mese a sette colonne');
  // Se la cella non è quadrata e piccola, dodici mesi non ci stanno e il calendario
  // diventa una lista lunga: cioè non è più un calendario.
  const bloccoCella = /\.cella-calendario \{[\s\S]{0,420}?\}/.exec(css);
  assert.ok(bloccoCella, 'manca lo stile della cella');
  assert.match(bloccoCella[0], /aspect-ratio: 1 \/ 1/, 'la cella è quadrata');
  assert.match(bloccoCella[0], /font-variant-numeric: tabular-nums/, 'i numeri sono allineati');
});

test('C13. i tre colori sono davvero verde, rosso e viola', async () => {
  const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');
  const saltato = /\.cella-calendario\.saltato \{[\s\S]{0,220}?\}/.exec(css);
  assert.ok(saltato, 'manca .saltato');
  assert.match(saltato[0], /rosso/, 'il giorno saltato deve essere rosso');
  const fatto = /\.cella-calendario\.fatto \{[\s\S]{0,220}?\}/.exec(css);
  assert.ok(fatto, 'manca .fatto');
  assert.match(fatto[0], /verde/, 'il giorno fatto deve essere verde');
  const recupero = /\.cella-calendario\.recupero \{[\s\S]{0,220}?\}/.exec(css);
  assert.ok(recupero, 'manca .recupero');
  assert.match(recupero[0], /viola/, 'il recupero deve essere viola');
});

test('C14. il calendario sta nel Profilo e legge i giorni dal profilo', () => {
  assert.match(corpo('vistaProfilo'), /bloccoCalendario\(/, 'è nel Profilo');
  assert.match(cal, /profilo\.giorni_allenamento/, 'i previsti vengono dal profilo della persona');
  assert.match(cal, /st\.streak\.giorniAllenati/, 'e i fatti dalla streak');
});

// ---- IL PERSONAGGIO E IL PULSANTE ----
//
// Ste: "deve aggiornarsi un personaggio che metti dove gli vengono messe cose tipo
// l'armatura ecc... che si aggiorna automaticamente e metti pure un pulsante che ti
// spiega come funziona questo rpg".

test('P1. il personaggio cambia aspetto con la classe e porta le armature', () => {
  const per = corpo('bloccoPersonaggio');
  assert.match(per, /class: 'personaggio personaggio-' \+ classeId/, 'cambia con la classe');
  assert.match(per, /personaggio-arma persona-arma-alta/, 'e le armature si vedono addosso');
  assert.match(per, /indosano = rpg\.premi\.filter\(\(p\) => p\.sbloccato\)/,
    'le armature cambiano quando le sblocchi');
});

test('P2. c\'è il pulsante che spiega come funziona l\'RPG', () => {
  const per = corpo('bloccoPersonaggio');
  assert.match(per, /bottone\('Come funziona questo RPG\?'/, 'il pulsante c\'è');
  assert.match(per, /spiegazione\.hidden = !spiegazione\.hidden/, 'si apre e si chiude');
  assert.match(per, /Chiudi la spiegazione/, 'e cambia etichetta');
});

test('P3. la spiegazione dice le TRE statistiche e cosa NON conta', () => {
  const sp = corpo('spiegazioneRpg');
  assert.match(sp, /Forza/, 'dice cos\'è la forza');
  assert.match(sp, /Agilit/, 'e l\'agilità');
  assert.match(sp, /Stamina/, 'e la stamina');
  assert.match(sp, /Cosa NON conta/, 'e cosa NON conta');
});