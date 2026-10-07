import { test } from 'node:test';
import assert from 'node:assert/strict';

// Due persone nella stessa app, con link diversi (?p=1 e ?p=2), piu' chi si registra
// col link (?n=nome&k=chiave). Il pericolo grosso e' che i dati di una finiscano nei
// progressi dell'altra: questi test premono esattamente quel tasto.

import { chiSei, PERSONE } from '../src/dati-iniziali.js';

/** Data quella scheda gia' presente sul telefono, la scelta torna a Ste. */
const SU_STE = ['scheda-gym-3'];

test('la persona si sceglie dalla URL', () => {
  assert.equal(chiSei({ ricerca: '', memoria: null, schede: SU_STE }).persona.id, 1,
    'senza ?p=, su un telefono che ha gia\' le tue schede, parti da te');
  assert.equal(chiSei({ ricerca: '?p=1', memoria: null, schede: [] }).persona.id, 1);
  assert.equal(chiSei({ ricerca: '?p=2', memoria: null, schede: [] }).persona.id, 2);
  assert.equal(chiSei({ ricerca: '?p=2' + String.fromCharCode(35) + '/', memoria: null, schede: [] }).persona.id, 2,
    'anche con il pezzo di scheda dopo');
  assert.equal(chiSei({ ricerca: '?altro=2', memoria: null, schede: SU_STE }).persona.id, 1);
  // ?p=99 non esiste piu': non si butta nessuno fuori, si cerca il resto del
  // dispositivo (o si chiede il nome). Non si sceglie Ste a caso, perche' cosi'
  // un link scritto male finirebbe con qualcuno dentro la scheda di un altro.
  assert.equal(chiSei({ ricerca: '?p=99', memoria: null, schede: SU_STE }).persona.id, 1,
    'un numero inesistente non deve rompere: torna a chi c\'era gia\'');
  assert.equal(chiSei({ ricerca: '?p=99', memoria: null, schede: [] }).daChiedere, true,
    'su un telefono nuovo, un link scritto male porta a chiedere il nome');
});

test('ogni persona ha la sua scheda e un id diverso', () => {
  const idSchede = PERSONE.map((p) => p.schedaId);
  assert.equal(new Set(idSchede).size, PERSONE.length, 'nessuna scheda condivisa');
  for (const p of PERSONE) assert.ok(p.nomeScheda, `${p.id}: ha un titolo`);
});

test('la seconda persona si chiama Palestra A, non "gym 3"', () => {
  const seconda = PERSONE.find((p) => p.id === 2);
  assert.equal(seconda.nomeScheda, 'Palestra A');
  assert.doesNotMatch(seconda.nomeScheda, /gym/i);
});

// ---------------------------------------------------------------------------
// Il peso corporeo è per persona.
//
// Ste: "non ho capito perchè non spunta niente se ho gia' messo il mio peso".
// Due problemi distinti, trovati insieme:
//
//  1) la tabella "pesi" non aveva un account_id, quindi i due profili leggevano
//     lo stesso peso: se uno si pesava 82 kg, anche l'altro risultava 82 kg.
//     E i Rank di entrambi erano sbagliati.
//  2) un record compare solo dopo "Allenamento finito": con la seduta ancora
//     aperta non c'e' nessun rank, e la schermata non lo diceva.
//
// Qui blocco il punto 1. Il 2 e' un test in gioco-ui.test.js.
// ---------------------------------------------------------------------------

test('i pesi sono divisi per persona, non condivisi', async () => {
  const pc = await import('../src/peso-corporeo.js');
  const db = await import('../src/db.js');

  const a = 'account-1';
  const b = 'account-2';
  await db.salva('pesi', { id: 'w-a', account_id: a, kg: 82, data: '2026-01-10' });
  await db.salva('pesi', { id: 'w-b', account_id: b, kg: 65, data: '2026-01-10' });

  assert.equal(await pc.pesoAttuale(a), 82, 'il primo profilo vede il suo peso');
  assert.equal(await pc.pesoAttuale(b), 65, 'il secondo vede il suo, non quello del primo');

  const soloA = await pc.pesiCronologici(a);
  const soloB = await pc.pesiCronologici(b);
  assert.equal(soloA.length, 1, 'il primo profilo ha una sola misurazione');
  assert.equal(soloB.length, 1, 'il secondo idem');
  assert.equal(soloA[0].kg, 82);
  assert.equal(soloB[0].kg, 65);

  // e la storia è separata: il peso di ieri dell'altro non entra
  await db.salva('pesi', { id: 'w-a2', account_id: a, kg: 81, data: '2026-01-11' });
  const aggA = await pc.pesiCronologici(a);
  assert.equal(aggA.length, 2, 'le due misurazioni del primo profilo');
  assert.equal(await pc.pesoAttuale(a), 81, 'l\'ultima del primo');
  assert.equal(await pc.pesoAttuale(b), 65, 'il secondo non cambia');
});

test('segnare un peso non tocca quello dell\'altro profilo', async () => {
  const pc = await import('../src/peso-corporeo.js');
  const db = await import('../src/db.js');
  const a = 'account-3';
  const b = 'account-4';

  await pc.segnaPeso(90, { account: a, data: '2026-02-01' });
  await pc.segnaPeso(70, { account: b, data: '2026-02-01' });
  assert.equal(await pc.pesoAttuale(a), 90);
  assert.equal(await pc.pesoAttuale(b), 70);

  // correggo il peso del primo: quello del secondo deve restare
  await pc.segnaPeso(88, { account: a, data: '2026-02-01' });
  assert.equal(await pc.pesoAttuale(a), 88, 'il primo e\' stato corretto');
  assert.equal(await pc.pesoAttuale(b), 70, 'il secondo e\' rimasto com\'era');
  const delB = await pc.pesiCronologici(b);
  assert.equal(delB.length, 1, 'non e\' stata creata una misurazione in piu\' per l\'altro');
});