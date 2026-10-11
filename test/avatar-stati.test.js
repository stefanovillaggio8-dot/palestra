// avatar-stati.test.js -- le sei foto del personaggio, una per armatura.
//
// Ste (11/10/2026): "ogni volta che sblocco qualcosa quell'immagine deve vedersi
// meglio". Prima c'era UNA foto fissa piu' una fila di pezzi sciolti ritagliati da
// un'altra scheda, in un'altra posa, e incollarli veniva male. Adesso c'e' una foto
// per ogni livello di armatura e l'app la sceglie da sola.
//
// Qui si controlla la regola che decide QUALE foto mostrare, e che le immagini
// citate esistano davvero: una foto mancante si vedrebbe come un quadratino
// vuoto, e su un telefono senza rete non si saprebbe nemmeno perche'.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  STATI_IMMAGINE, PREMI, CLASSI, statoVisivo, percorsoStato,
} from '../src/avatar-rpg.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Una lista di premi con i primi `n` gia' sbloccati. */
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
  // Il punto della richiesta: un premio in piu' = un pezzo in piu' addosso.
  // Si controlla uno per uno, perche' se due stati fossero uguali si vedrebbe
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
  // Il controllo che vale di piu': senza, un file dimenticato si vede come un
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
  assert.equal(percorsoStato('guerriero', 0), 'img/personaggi/stati/guerriero-0.png');
  assert.equal(percorsoStato('assassino', 5), 'img/personaggi/stati/assassino-5.png');
  // I numeri strani non devono costruire percorsi assurdi: `calcolaAvatar` non
  // sbaglia, ma un valore letto da un profilo salvato male puo' arrivare.
  assert.equal(percorsoStato('guerriero', -3), 'img/personaggi/stati/guerriero-0.png');
  assert.equal(percorsoStato('guerriero', 99), 'img/personaggi/stati/guerriero-5.png');
  assert.equal(percorsoStato('guerriero', 'pippo'), 'img/personaggi/stati/guerriero-0.png');
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
  // `if (classeScelta) { ... }`, e poi lo riusavo piu' in basso nella riga sotto il
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
  // qui sopra, perche' la riga sotto continuerebbe a puntare a una viso che non c'e'.
  const quante = righe.filter((r) => /^\s*const viso\s*=/.test(r)).length;
  assert.equal(quante, 1, '"viso" deve essere dichiarato una volta sola');
});