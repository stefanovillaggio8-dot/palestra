// teschio-e-pulsanti.test.js -- le tre cose che Ste ha indicato con il dito.
//
// 10/10/2026, dal suo messaggio:
//
//   1. "quando finisco una seduta e mi spuntano i miglioramenti non devono spuntare
//      davanti il tasto 'lascia la scheda così' e 'aggiorna'";
//   2. "quando devo scegliere i giorni della settimana in cui ci vado e metto il
//      giorno, fallo spuntare in verde o comunque che si capisca che ho selezionato";
//   3. "la streak deve spuntare spenta nel giorno in cui dovrei allenarmi dove non
//      mi sono ancora allenato ma deve spuntare che devo andarci per farla aumentare
//      e farla accendere, non che spunta grigia come se l'avessi persa";
//   4. "metti più animazioni, sembra non essere cambiato nulla".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { aspettoStreak } from '../src/streak.js';

const srcApp = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const srcUi = await readFile(new URL('../src/ui.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');

/** Il corpo di una funzione. */
function corpo(nome, da = srcApp) {
  const inizio = da.indexOf(`function ${nome}(`);
  assert.ok(inizio >= 0, `non trovo ${nome}`);
  let i = da.indexOf('{', inizio);
  let prof = 0;
  for (; i < da.length; i++) {
    if (da[i] === '{') prof++;
    else if (da[i] === '}') { prof--; if (prof === 0) return da.slice(inizio, i + 1); }
  }
  return da.slice(inizio);
}

// ---- 1. L'AVVISO NON DEVE COPRIRE I PULSANTI ----

test('T1. l\'avviso sta SOTTO il dialogo, non sopra i pulsanti', () => {
  // Ste: "quando finisco una seduta e mi spuntano i miglioramenti non devono
  // spuntare davanti il tasto 'lascia la scheda così' e 'aggiorna'".
  //
  // Il difetto era di due righe di CSS, e la cosa importante è perché non l'avevo
  // visto: il numero era 120 contro 100, quindi l'avviso era VOLUTO sopra. Ma un
  // dialogo è modale: è lui che comanda. Un messaggio che copre i due pulsanti per
  // nove secondi dice "qui non c'è niente da fare", che è il contrario di quello che
  // l'avviso voleva dire.
  const zAvviso = /\.avviso \{[\s\S]{0,700}?z-index:\s*(\d+)/.exec(css);
  const zDialogo = /\.sfondo-dialogo \{[\s\S]{0,200}?z-index:\s*(\d+)/.exec(css);
  assert.ok(zAvviso, 'l\'avviso ha uno z-index');
  assert.ok(zDialogo, 'il dialogo ha uno z-index');
  assert.ok(Number(zAvviso[1]) < Number(zDialogo[1]),
    `l'avviso (${zAvviso[1]}) deve stare sotto il dialogo (${zDialogo[1]}): sopra copre i pulsanti`);

  // e se c'è un dialogo aperto l'avviso sale in alto, così non copre niente
  assert.match(css, /body:has\(\.sfondo-dialogo\) \.avviso \{[\s\S]{0,200}?top:/,
    'con un dialogo aperto l\'avviso va in cima');
});

test('T2. i pulsanti del dialogo restano in fondo anche con l\'elenco lungo', () => {
  // Una seduta lunga può avere dieci miglioramenti da leggere. Il dialogo è
  // `max-height: 86vh` con scorrimento: senza questo, i due pulsanti finiscono sotto
  // il bordo e non li vedi senza scorrere. E quello che vuoi premere dopo aver letto
  // è proprio "Aggiorna".
  const azioni = /\.dialogo-azioni \{[\s\S]{0,400}?\}/.exec(css);
  assert.ok(azioni, 'esistono i pulsanti del dialogo');
  assert.match(azioni[0], /position:\s*sticky/, 'devono restare appiccicati al fondo');
  assert.match(azioni[0], /bottom:/, 'in fondo al contenitore che scorre');
});

// ---- 2. I GIORNI SELEZIONATI ----

test('T3. il giorno scelto si vede, e prima non si vedeva', () => {
  // Ste: "quando devo scegliere i giorni della settimana in cui ci vado e metto il
  // giorno, fallo spuntare in verde o comunque che si capisca che ho selezionato".
  //
  // Il pulsante aveva la classe `attivo` dal primo giorno, ma NESSUNA regola CSS la
  // guardava. Quindi premere "Martedì" e non premere "Martedì" erano identici: l'unica
  // prova che avevi scelto era il riepilogo in basso.
  const giorni = corpo('bloccoGiorniAllenamento');
  assert.match(giorni, /giorno-settimana/, 'il bottone ha una classe sua');
  assert.match(giorni, /scelti\.has\(g\.n\) \? ' attivo' : ''/, 'e la classe attivo segue la scelta');
  // e la classe deve avere uno stile VERDE, non una riga generica
  const stile = /\.bot\.giorno-settimana\.attivo[\s\S]{0,300}?\}/.exec(css);
  assert.ok(stile, 'c\'è lo stile del giorno scelto');
  assert.match(stile[0], /verde/, 'ed è verde, come chiesto');
  assert.match(stile[0], /font-weight:\s*800/, 'e il testo è marcato');
  // e c'è la spunta, che si vede anche senza colori
  const spunta = /\.bot\.giorno-settimana\.attivo::after \{[\s\S]{0,120}?\}\s*\n/.exec(css);
  assert.ok(spunta, 'c\'è la regola della spunta sul giorno scelto');
  assert.match(spunta[0], /content:\s*' \u2713'/, 'ed è una spunta: si capisce anche a chi non vede i colori');
});

// ---- 3. LA STREAK: TRE STATI ----

test('T4. la streak distingue "da accendere" da "persa"', () => {
  // Ste: "la streak deve spuntare spenta nel giorno in cui dovrei allenarmi dove
  // non mi sono ancora allenato ma deve spuntare che devo andarci per farla aumentare
  // e farla accendere, non che spunta grigia come se l'avessi persa".
  //
  // Prima erano due stati e il caso intermedio finiva nel grigio, che vuol dire
  // "persa". Ma il lunedì mattina, non avendo ancora allenato, non avevi perso
  // niente: la giornata non era finita. La card diceva una cosa falsa, e in alto,
  // dove guardi per prima.
  const dow = new Date().getDay();

  // caso 1: allenato oggi, tutto bene
  const acceso = aspettoStreak({
    giorni: 5, attiva: true, interrotta: false, fattoOggi: true,
    giorniPrevisti: [dow], ultimoGiorno: '2026-10-10',
  });
  assert.equal(acceso.stato, 'acceso', 'se hai allenato oggi la streak è accesa');
  assert.equal(acceso.acceso, true);

  // caso 2: oggi ti tocca e non l'hai ancora fatto — NON è spenta
  const inAttesa = aspettoStreak({
    giorni: 3, attiva: false, interrotta: false, fattoOggi: false,
    giorniPrevisti: [dow], ultimoGiorno: '2026-10-08',
  });
  assert.equal(inAttesa.stato, 'da accendere',
    'oggi che ti tocca e non hai fatto: non è spenta, è in attesa');
  assert.equal(inAttesa.daAccendere, true);
  assert.equal(inAttesa.etichetta, 'da accendere oggi');
  assert.notEqual(inAttesa.colore, acceso.colore,
    'e non ha lo stesso colore della spenta: il grigio vuol dire "persa"');

  // caso 3: hai saltato un giorno che ti toccava — QUELLA sì è spenta
  const spenta = aspettoStreak({
    giorni: 0, attiva: false, interrotta: true, fattoOggi: false,
    giorniPrevisti: [(dow + 1) % 7], ultimoGiorno: '2026-10-08',
  });
  assert.equal(spenta.stato, 'spenta', 'un giorno saltato davvero resta spenta');
  assert.equal(spenta.daAccendere, false);
  assert.notEqual(spenta.colore, inAttesa.colore,
    'e il grigio della spenta è diverso dall\'ambra di chi deve ancora andare');
});

test('T5. la card dice cosa fare, e non sembra accesa quando non lo è', () => {
  // Ste, due volte: la prima "deve spuntare che devo andarci per farla aumentare e
  // farla accendere", la seconda "quando devo allenarmi, spunta streak accesa con
  // lo 0".
  //
  // La seconda frase è la correzione di come avevo risolto la prima. Avevo messo
  // l'ambra e un bordo che pulsa, e la card sembrava accesa col contatore a zero: un
  // contatore acceso sullo zero vuol dire "è rotto".
  //
  // Ma la verità è che in quel momento la streak NON è accesa: è spenta e ti aspetta.
  const card = corpo('teschioStreak');
  assert.match(card, /f\.stato \|\| \(f\.acceso \? 'acceso' : 'spenta'\)/,
    'la card legge i tre stati');
  assert.match(card, /▲ Non è ancora accesa: oggi ti tocca/,
    'e quando è zero, dice che non è ancora accesa e cosa fare');
  assert.match(card, /▲ Oggi ti tocca: allenati e sale a \$\{f\.giorni \+ 1\}/,
    'e quando ha giorni, dice quanto sale se vai: è la domanda che ti fai guardandola');
  // il numero resta quello vero, anche a zero: "??" avrebbe significato "l'hai persa"
  assert.match(card, /stato === 'spenta' \? '\?\?' : String\(f\.giorni\)/,
    'il numero resta anche quando devi ancora accenderla');

  // E LA CARD NON DEVE SEMBRARE ACCESA.
  //
  // Niente alone e niente pulsazione: una card che pulsa sembra viva, e quella non è
  // viva, è in attesa. L'unica cosa accesa deve essere l'avviso.
  const inAttesa = /\.teschio-streak\.da-accendere \{[\s\S]{0,300}?\}/.exec(css);
  assert.ok(inAttesa, 'c\'è lo stile del caso "da accendere"');
  assert.equal(/box-shadow/.test(inAttesa[0]), false,
    'niente alone: la card non deve sembrare accesa');
  assert.equal(/animation/.test(inAttesa[0]), false,
    'niente pulsazione: una card che pulsa sembra viva, e questa è in attesa');
  assert.match(inAttesa[0], /border-color:[^;]*oro/,
    'ma il bordo è colorato: la differenza con una spenta si vede');
  // e il numero non è colorato
  const numero = /\.teschio-streak\.da-accendere \.fuoco \{[^}]*\}/.exec(css);
  assert.match(numero[0], /var\(--testo\)/,
    'il numero resta col colore normale: un numero colorato sembra un dato acceso');
  // l'avviso invece è acceso, e marcato
  assert.match(css, /\.richiamo-streak \{[\s\S]{0,200}?font-weight: 800/, 'l\'avviso è forte');
});

// ---- 4. LE ANIMAZIONI ----

test('T6. le animazioni si sentono, non si notano appena', () => {
  // Ste: "metti più animazioni, sembra non essere cambiato nulla". Aveva ragione: le
  // prime erano 200 ms con 14 px su uno sfondo che sfuma, cioè qualcosa che su un
  // telefono che tieni in mano non si vede.
  const entra = /@keyframes dialogo-entra \{[\s\S]{0,200}?\}/.exec(css);
  assert.ok(entra, 'c\'è l\'animazione del dialogo');
  assert.match(entra[0], /translateY\((\d+)px\)/, 'il dialogo si sposta');
  const px = Number(/translateY\((\d+)px\)/.exec(entra[0])[1]);
  assert.ok(px >= 20, `il dialogo si alza di almeno 20px (ora ${px}): sotto, in palestra, non si sente`);

  // e devono esserci le altre tre che mancavano
  for (const [nome, segno] of [
    ['avviso-entra', /@keyframes avviso-entra/],
    ['avviso-esce', /@keyframes avviso-esce/],
    ['numero-pulse', /@keyframes numero-pulse/],
    ['cella-pulse', /@keyframes cella-pulse/],
    ['tocco', /@keyframes tocco/],
    ['serie-accesa', /@keyframes serie-accesa/],
    ['calendario-entra', /@keyframes calendario-entra/],
    // "attesa-streak" non deve più esserci: era quella che faceva sembrare la card
    // ACCESA mentre è spelta e in attesa. Ste: "quando devo allenarmi, spunta streak
    // accesa con lo 0".
  ]) {
    assert.match(css, segno, `manca l'animazione ${nome}`);
  }

  // e il numero che cambia deve pulsare DAVVERO, non a ogni ridisegno
  assert.match(srcUi, /export function numeroCambiato/, 'la funzione che fa lampeggiare');
  assert.match(srcApp, /function animaNumeriCambiati/, 'e quella che decide quando chiamarla');
  const anima = corpo('animaNumeriCambiati');
  assert.match(anima, /prima !== chiave/, 'pulsa solo se il numero è DIVERSO da prima');
  assert.match(anima, /prima !== undefined/, 'e mai alla prima disegnata, quando non c\'è un "prima"');
  assert.match(anima, /numeroCambiato\(nodo\)/, 'e poi chiama la funzione');
});

test('T7. chi ha "riduci animazioni" acceso non vede animazioni', () => {
  // Non è una gentilezza aggiunta dopo: è il motivo per cui le altre animazioni si
  // possono fare senza pensarci due volte, perché nessuno soffre.
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'il blocco c\'è');
  const blocco = css.slice(css.indexOf('prefers-reduced-motion'), css.indexOf('prefers-reduced-motion') + 400);
  assert.match(blocco, /animation-duration/, 'e azzera le animazioni');
  assert.match(blocco, /transition-duration/, 'e le transizioni');
});