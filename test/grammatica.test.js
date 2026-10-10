// grammatica.test.js -- niente apostrofi al posto degli accenti.
//
// Ste (09/10/2026), prima foto: "la grammatica non si capisce tanto, alcune volte
// sbagli a scrivere".
//
// Non è un problema di stile: `e'` invece di `è`, `piu'` invece di `più` e
// `perche'` invece di `perché` si leggono come refusi. E in italiano l'apostrofo ha
// un altro significato, quello del troncamento (l'allenamento, un esercizio), quindi
// metterlo al posto dell'accento non è solo una questione di aspetto.
//
// QUI SI CONTROLLA IL CODICE, non quello che vedi a schermo, perché i test non
// possono cliccare ogni schermata. I testi veri vengono fuori e vengono provati a
// mano; questo è il segnale che non ne resta nessuno.
//
// LA GUARDIA SULLE CIFRE. Il primotentativo ha usato una regex che non escludeva le
// cifre, e ha trasformato il colore `'#ff4d5e'` in `'#ff4d5È`: quello è un colore,
// non una parola. Qui la guardia esclude cifre, lettere e virgolette, quindi
// l'apostrofo viene mangiato solo se è davvero un accento mancante.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const cartella = fileURLToPath(new URL('../src/', import.meta.url));
const nomi = (await readdir(cartella)).filter((n) => n.endsWith('.js'));

// LE PAROLE CHE IN ITALIANO PORTANO L'ACCENTO. Ognuna compare nel codice con
// l'apostrofo al posto dell'accento, e quella è la forma sbagliata.
const PAROLE = ['perche', 'percio', 'piu', 'cosi', 'gia', 'puo', 'sara', 'verra', 'potra', 'fara', 'dara', 'andra', 'stara'];
const SENZA_ACCENTO = new RegExp(
  '(?<![A-Za-z0-9à-ù])(' + PAROLE.join('|') + ")'(?![A-Za-z0-9à-ù'])",
);

test('G1. nessuna parola con l\'apostrofo al posto dell\'accento', async () => {
  const trovati = [];
  for (const nome of nomi) {
    const testo = await readFile(join(cartella, nome), 'utf8');
    testo.split('\n').forEach((riga, i) => {
      const m = SENZA_ACCENTO.exec(riga);
      if (m) trovati.push(`${nome}:${i + 1}  ${m[0]}`);
    });
  }
  assert.deepEqual(trovati, [],
    'ci sono ancora parole scritte con l\'apostrofo invece dell\'accento:\n  '
    + trovati.join('\n  '));
});

test('G2. l\'apostrofo non viene MANGIato dai colori e dalle stringhe', async () => {
  // IL DIFETTO CHE HO FATTO IO. La regex che metteva gli accenti non escludeva le
  // cifre, quindi il colore `#ff4d5e` diventava `#ff4d5È` e il codice si rompeva.
  // Qui si verifica che ogni stringa di colore sia ancora un colore esadecimale.
  const trovati = [];
  for (const nome of nomi) {
    const testo = await readFile(join(cartella, nome), 'utf8');
    for (const m of testo.matchAll(/colore:\s*'([^']*)'/g)) {
      // `colore:` non è sempre un colore: può essere una parola chiave ('neutro',
      // 'errore', 'ok'). Controllo solo quelli che DOVREBBERO essere un colore.
      if (m[1].startsWith('#') && !/^#[0-9a-fA-F]{6}$/.test(m[1])) {
        trovati.push(`${nome}: ${m[0]}`);
      }
    }
    // e i ternari che scelgono una lettera: `${n === 1 ? 'a' : 'e'}`
    for (const m of testo.matchAll(/'([à-ù])'/g)) {
      trovati.push(`${nome}: lettera accentata al posto di una lettera: ${m[0]}`);
    }
  }
  assert.deepEqual(trovati, [], 'i colori e le lettere nei ternari sono rotte:\n  ' + trovati.join('\n  '));
});

test('G3. i file sono UTF-8 senza caratteri corrotti', async () => {
  // Se un file viene scritto con la codifica sbagliata, al posto di "perché" finisce
  // una sequenza illeggibile e non la vedi in un diff: sembva un refuso e invece è
  // un file rotto.
  const corrotti = [];
  for (const nome of nomi) {
    const testo = await readFile(join(cartella, nome), 'utf8');
    const brutti = testo.match(/\uFFFD/g);
    if (brutti) corrotti.push(`${nome}: ${brutti.length} caratteri illeggibili`);
  }
  assert.deepEqual(corrotti, [], 'ci sono caratteri illeggibili:\n  ' + corrotti.join('\n  '));
});

test('G4. i file si possono caricare: la grammatica non ha rotto il codice', () => {
  // La verifica finale, e quella vera: ogni file viene passato a `node --check`,
  // che è lo stesso controllo che fa Node prima di eseguire il file. Se qui dentro
  // un accente ha mangiato una virgoletta (è successo: il colore `#ff4d5e` è
  // diventato `#ff4d5È`), questo test diventa rosso e non si pubblica niente.
  //
  // Non provo a togliere `import` ed `export` con una regex e a dare il resto a
  // `new Function`: quello è un trucco che dà falsi verdi, perché un file senza i
  // suoi import gira in un contesto diverso da quello vero. Qui si fa girare il
  // controllore vero sul file vero.
  for (const nome of nomi) {
    try {
      execFileSync(process.execPath, ['--check', join(cartella, nome)], { stdio: 'pipe' });
    } catch (e) {
      assert.fail(`${nome} non si può caricare: sintassi rotta\n${String(e.stderr || '')}`);
    }
  }
});

function carteldaUrl(base, nome) {
  return new URL(nome, base);
}