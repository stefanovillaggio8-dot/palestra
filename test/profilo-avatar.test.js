// profilo-avatar.test.js -- l'avatar sta nel Profilo e NON nei Progressi.
//
// Ste (08/10/2026): "questa cosa dell'avatar mettila nel profilo non su progressi".
//
// Il punto e' che l'avatar NON deve stare nei Progressi. I Progressi rispondono a
// una domanda sola ("quanto stai sollevando in piu' del tuo corpo", e i tuoi Rank),
// e l'avatar e' identita': quindi sta con il nome, col livello e col bottone per
// cambiarlo, cioe' nel Profilo.
//
// Questo test esiste perche' la cosa giusta si puo' rompere senza che nessuno se ne
// accorga: basta spostare un blocco di tre righe e l'app funziona lo stesso, ma
// l'avatar compare dove non serve.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sorgenteApp = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

/** Il corpo di una funzione, dato il suo nome. */
function corpo(nome) {
  const inizio = sorgenteApp.indexOf(`function ${nome}(`);
  assert.ok(inizio >= 0, `non trovo ${nome}`);
  let i = sorgenteApp.indexOf('{', inizio);
  let profondita = 0;
  for (; i < sorgenteApp.length; i++) {
    if (sorgenteApp[i] === '{') profondita++;
    else if (sorgenteApp[i] === '}') {
      profondita--;
      if (profondita === 0) return sorgenteApp.slice(inizio, i + 1);
    }
  }
  return sorgenteApp.slice(inizio);
}

test('P1. l\'avatar e la scelta dell\'avatar stanno nel PROFILO', () => {
  const profilo = corpo('vistaProfilo');
  assert.match(profilo, /avatarNodo\(profilo, \{ grande: true/,
    'il profilo deve avere l\'avatar grande in alto, col nome e il livello');
  assert.match(profilo, /Il tuo avatar/,
    'e il blocco per scegliere l\'avatar: e\' la cosa che Ste ha chiesto di spostare');
});

test('P2. nei PROGRESSI non c\'e\' nessun avatar', () => {
  // La parte che conta: non basta che ci sia nel Profilo, deve anche NON esserci nei
  // Progressi. Se appare in entrambi i posti, l\'app ha due risposte alla domanda
  // "dove cambio il mio avatar", e quella giusta cambia.
  const progressi = corpo('vistaProgressi');
  assert.doesNotMatch(progressi, /avatarNodo/,
    'la schermata Progressi non deve disegnare avatar: e\' una schermata di numeri');
  assert.doesNotMatch(progressi, /Il tuo avatar/,
    'neanche il blocco di scelta dell\'avatar');
  assert.doesNotMatch(progressi, /elencoAvatar/,
    'e non deve neanche leggere l\'elenco degli avatar: non serve a niente li\'');
});

test('P3. l\'avatar compare UNA sola volta per schermata', () => {
  // Nel Profilo compare l\'avatar grande in alto E la griglia per cambiarlo: sono due
  // cose diverse (uno sei tu, l\'altro e\' il menu), ma non devono diventare tre.
  const profilo = corpo('vistaProfilo');
  const grandi = (profilo.match(/avatarNodo\(profilo, \{ grande: true/g) || []).length;
  assert.equal(grandi, 1, 'l\'avatar grande deve comparire una volta sola');
  const griglie = (profilo.match(/grigliaAvatar/g) || []).length;
  // tre volte e non due: la dichiarazione (const grigliaAvatar = ...), la costruzione
  // dei pulsanti (grigliaAvatar.appendChild) e il montaggio (boxAvatar.appendChild).
  // Se diventassero quattro, o due, il blocco e' stato spostato o spezzato.
  assert.equal(griglie, 3, 'la griglia: dichiarazione, costruzione, montaggio');
});