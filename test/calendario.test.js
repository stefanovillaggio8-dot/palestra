// calendario.test.js -- il calendario deve segnare i giusti giorni.
//
// Ste (09/10/2026): "aggiungi anche un calendario dove mi segna evidenziato i giorni in
// cui vado in palestra".
//
// Tre stati, e ognuno ha un perché che lo rende indispensabile:
//
//   - PREVISTO: uno dei giorni che hai scelto in Impostazioni. Ti dice se oggi ti
//     tocca, e la risposta deve stare in cima, non in fondo a una pagina.
//   - FATTO: ci sei andato davvero. E' l'unica cosa che conta per la streak.
//   - SALTATO: era previsto, non l'hai fatto, e il giorno è passato. E' L'UNICO che
//     rompe la streak. Senza vederlo in rosso non capisci perché il numero è tornato
//     a zero.
//
// Qui si verifica la LOGICA, non il disegno: la schermata è provata a mano e
// dall'interfaccia, e qui conta che ogni giorno riceva la classe giusta.

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

test('C1. il calendario sette caselle, una per giorno della settimana', () => {
  assert.match(cal, /for \(let i = 0; i < 7; i\+\+\)/,
    'la settimana ha sette giorni');
  assert.match(cal, /\[1, 2, 3, 4, 5, 6, 0\]/,
    "e l'ordine e' quello italiano: lunedi' in alto, domenica in fondo");
  // i giorni partono dal LUNEDI' della settimana corrente, non da oggi
  assert.match(cal, /lunedi\.setDate\(oggiD\.getDate\(\) - \(\(oggiD\.getDay\(\) \+ 6\) % 7\)\)/,
    'la settimana parte dal luned\u00ec: se partisse da oggi, chi legge domenica '
    + 'vedrebbe una settimana spezzata');
});

test('C2. i TRE stati sono distinti e hanno un nome tutto loro', () => {
  assert.match(cal, /if \(previsto\) classi\.push\('previsto'\)/, 'stato previsto');
  assert.match(cal, /if \(fatto\) classi\.push\('fatto'\)/, 'stato fatto');
  assert.match(cal, /if \(saltato\) classi\.push\('saltato'\)/, 'stato saltato');
  assert.match(cal, /if \(oggiQuesta\) classi\.push\('oggi'\)/,
    'e oggi, che si vedee anche se è anche fatto o saltato');
  // IL SALTATO E' IL PIU' IMPORTANTE: e' l'unico che rompe la streak, quindi la
  // condizione deve richiedere che il giorno sia PASSATO. Se mancasse, il giorno
  // di oggi risulterebbe "saltato" prima di arrivare a sera, che e' falso.
  assert.match(cal, /const saltato = info\.passato && previsto && !fatto/,
    'il saltato deve richiedere che il giorno sia passato: oggi non e\' un giorno saltato');
});

test('C3. la risposta "oggi mi tocca?" sta SOPRA le caselle', () => {
  // Un calendario senza questa frase costringe a cercare oggi fra sette caselle,
  // e la domanda che ti fai guardando il Profilo è proprio "oggi mi tocca?".
  const iFrase = cal.indexOf("nota-grande");
  const iGriglia = cal.indexOf("class: 'calendario'");
  assert.ok(iFrase >= 0, 'deve esserci la frase in evidenza');
  assert.ok(iGriglia > iFrase,
    'e deve stare PRIMA delle caselle: è la risposta, le caselle sono il dettaglio');
  // e la frase deve dire una delle quattro cose che servono
  assert.match(cal, /Non hai ancora scelto i giorni/,
    'senza giorni scelti deve dirlo, non lasciare sette caselle tutte uguali');
  assert.match(cal, /Oggi hai allenato/, 'se hai allenato oggi');
  assert.match(cal, /Oggi ti tocca e non l'hai ancora fatto/, 'se oggi ti tocca e non l\'hai fatto');
  assert.match(cal, /giorno di riposo/,
    'e se oggi e\' di riposo, che non ti toglie niente: la frase deve dirlo, '
    + 'altrimenti il riposo sembra una punizione');
});

test('C4. la LEGENDA dice cosa vuol dire ogni colore', () => {
  // Tre colori diversi senza spiegazione sono tre decorazioni. E il "saltato" e'
  // rosso: senza sapere che il rosso e' il giorno perso, e' solo un colore.
  assert.match(cal, /legenda-calendario/, 'deve esserci la legenda');
  assert.match(cal, /giorno che alleni/, 'e dire cosa significa il giorno previsto');
  assert.match(cal, /allenato/, 'e il giorno fatto');
  assert.match(cal, /saltato/, 'e il saltato');
  // e la legenda compare solo se hai scelto dei giorni, sennò e' rumore
  assert.match(cal, /if \(previsti\.size\)/,
    'la legenda serve solo se ci sono giorni previsti: senza, si spiega il nulla');
});

test('C5. ogni casella ha un\'etichetta per chi non vede i colori', () => {
  // Tre stati comunicati solo col colore sono inaccessibili a chi non distingue il
  // verde dal rosso, e sul telefono in piena luce non si vedono. L'etichetta `aria`
  // dice le cose a parole: "mer 6, giorno di allenamento, saltato".
  assert.match(cal, /aria: \{ label:/, 'ogni casella deve avere un\'etichetta');
  assert.match(cal, /giorno di allenamento/, 'che dice se e\' previsto');
  assert.match(cal, /allenato/, 'e se e\' fatto');
  assert.match(cal, /saltato/, 'e se e\' saltato');
});

test('C6. il calendario sta nel PROFILO e legge i giorni dal profilo', () => {
  // Deve stare dove ci sono anche la streak e l'avatar: la domanda "oggi mi tocca?"
  // e la domanda "la mia streak com'\''e" sono la stessa domanda vista da due lati.
  assert.match(corpo('vistaProfilo'), /bloccoCalendario\(/,
    'il calendario deve essere nel Profilo');
  // e i giorni vengono dal profilo, cioe' quelli scelti dalla persona: non da una
  // lista scritta a mano, che sarebbe di nuovo i giorni di Ste per tutti
  assert.match(cal, /profilo\.giorni_allenamento/,
    'i previsti vengono dal profilo della persona, non da una lista fissa');
  assert.match(cal, /st\.streak\.giorniAllenati/,
    'e i fatti dalla streak, che viene dai dati veri delle sedute');
});

test('C7. il CSS ci sono tutti e i tre stati si vedono davvero', async () => {
  const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');
  assert.match(css, /\.calendario \{/, 'manca la griglia del calendario');
  assert.match(css, /grid-template-columns: repeat\(7, 1fr\)/,
    'e deve essere a sette colonne: un calendario di sette giorni su sei colonne '
    + 'fa una griglia che non somma i giorni');
  for (const stato of ['previsto', 'fatto', 'saltato', 'oggi']) {
    assert.match(css, new RegExp(`\\.casella-calendario\\.${stato}`),
      `manca lo stile .casella-calendario.${stato}: senza, lo stato e' scritto nel `
      + 'codice ma non si vede');
  }
  // IL SALTATO DEVE ESSERE DAVVERO ROSSO. E\' l\'unico che rompe la streak, quindi se
  // \'appaicino uguale al previsto non capisci che hai perso il filo.
  const bloccoSaltato = /\.casella-calendario\.saltato \{[\s\S]{0,220}?\}/.exec(css);
  assert.ok(bloccoSaltato, 'manca il blocco .saltato');
  assert.match(bloccoSaltato[0], /rosso/,
    'lo stato "saltato" non usa il rosso: e\' il giorno perso, deve sembrarlo');
  const bloccoFatto = /\.casella-calendario\.fatto \{[\s\S]{0,220}?\}/.exec(css);
  assert.match(bloccoFatto[0], /verde/,
    'e lo stato "fatto" non usa il verde: cosi\' non si distingue a colpo d\'occhio');
});