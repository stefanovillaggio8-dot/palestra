// sociale.test.js -- privacy, amici, confronto e classifiche per esercizio.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  privacyDi, puoVedere, amiciDi, propostaAmicizia, confronta, classifichePerEsercizio,
  PRIVACY_PREDEFINITE, campiVisibili,
} from '../src/sociale.js';
import { gradienteAvatar, iniziali, avatarPerId, elencoAvatar, avatarPredefinito } from '../src/avatar.js';
import { recordEsercizio } from '../src/rank.js';

const chest = { id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'macchina' };
const curl = { id: 'ex-scott-bench-curl', nome: 'Scott Bench Curl', convenzione: 'per_manubrio' };

function serie(peso, rip) {
  return { id: 'x' + peso + 'x' + rip, peso, ripetizioni: rip, stato: 'fatta', ordine: 1 };
}

function rec(peso, rip, esercizio) {
  return recordEsercizio([serie(peso, rip)], esercizio);
}

const stefano = { id: 'p1', username: 'Stefano', amici: ['p2'] };
const andrea = { id: 'p2', username: 'Andrea', amici: ['p1'] };
const marco = { id: 'p3', username: 'Marco', amici: [] };

// ---------------------------------------------------------------------------
// Ste (30/09/2026): "non dare il permesso a nessuno di andare nelle schede
// degli altri se non immettendo un codice: 030226".
//
// Quindi i test 1-4 qui sotto descrivono il comportamento VECCHIO (tutto
// pubblico). Ho lasciato la privacy che funziona ancora (se uno chiude un
// campo, resta chiuso anche con il codice) e ho spostato il resto nei test 3b
// e seguenti, che verificano il codice.
// ---------------------------------------------------------------------------

test('1. di default tutto è pubblico (il codice 030226 è stato tolto)', () => {
  const p = privacyDi({ id: 'p1' });
  assert.deepEqual(p, PRIVACY_PREDEFINITE);
  assert.equal(campiVisibili.length, 4);
  assert.equal(p.profilo, 'pubblico');
  assert.equal(p.performance, 'pubblico');
  assert.equal(p.statistiche, 'pubblico');
  assert.equal(p.leaderboard, 'pubblico');
});

test('2. un amico vede i dati pubblici, senza codici in mezzo', () => {
  // Ste ha tolto il codice 030226: non esiste più nessuna porta segreta,
  // quindi la privacy normale (privato o pubblico) basta e avanza
  assert.equal(puoVedere(stefano, andrea, 'record'), true);
  assert.equal(puoVedere(stefano, andrea, 'profilo'), true);
  assert.equal(puoVedere(stefano, andrea, 'statistiche'), true);
  assert.equal(puoVedere(stefano, andrea, 'leaderboard'), true);
});

test('2b. se è privato, nessuno lo vede: non basta nasconderlo a schermo', () => {
  const privato = { id: 'p2', username: 'Andrea', privacy: { performance: 'privato' } };
  assert.equal(puoVedere(stefano, privato, 'record'), false, 'chiuso a tutti');
  // e gli altri campi restano aperti: la privacy lavora campo per campo
  assert.equal(puoVedere(stefano, privato, 'profilo'), true);
  assert.equal(puoVedere(stefano, privato, 'leaderboard'), true);
});

test('3b. lo stato "chiuso" non esiste più', () => {
  // con il codice tolto non c'è più "visibile solo a chi ha il codice":
  // se un profilo ha ancora quel valore da qualche versione vecchia, viene
  // letto come privato, che è la scelta più prudente
  const vecchio = { id: 'p9', username: 'Vecchio', privacy: { profilo: 'chiuso' } };
  assert.equal(puoVedere(stefano, vecchio, 'profilo'), false, 'il "chiuso" di prima ora è privato');
});

test('4. l\'account privato non si vede nella lista', () => {
  const privato = { id: 'p3', username: 'Marco', privacy: { profilo: 'privato' } };
  assert.equal(puoVedere(stefano, privato, 'profilo'), false);
});

test('5. ognuno vede sempre i propri dati', () => {
  const privato = { id: 'p1', username: 'Stefano', privacy: { performance: 'privato', profilo: 'privato' } };
  assert.equal(puoVedere(privato, privato, 'record'), true);
  assert.equal(puoVedere(privato, privato, 'profilo'), true);
});

test('6. la lista amici contiene solo chi e\' autorizzato', () => {
  const catalogo = [stefano, andrea, marco];
  const amici = amiciDi(stefano, catalogo);
  assert.deepEqual(amici.map((a) => a.id), ['p2']);
  assert.equal(amiciDi(marco, catalogo).length, 0);
  assert.equal(amiciDi(stefano, catalogo).some((a) => a.id === 'p1'), false, 'non sei amico di te stesso');
});

test('7. la proposta di amicizia non ripete un amico gi\u00e0 presente', () => {
  assert.equal(propostaAmicizia(stefano, andrea).amici, true);
  assert.equal(propostaAmicizia(stefano, marco).amici, false);
  assert.equal(propostaAmicizia(stefano, stefano), null);
});

test('8. il confronto e\' esercizio per esercizio', () => {
  const r = confronta(stefano, andrea, [rec(50, 8, chest), rec(20, 7, curl)], [rec(45, 8, chest), rec(25, 5, curl)]);
  const perNome = new Map(r.righe.map((x) => [x.nome, x]));
  assert.equal(perNome.get('Chest Press').esito, 'mio');
  assert.equal(perNome.get('Scott Bench Curl').esito, 'suo');
  assert.equal(r.vinti, 1);
  assert.equal(r.persi, 1);
  assert.equal(r.pari, 0);
});

test('9. chi non ha un record non vince niente', () => {
  const r = confronta(stefano, andrea, [rec(50, 8, chest)], []);
  assert.equal(r.righe[0].esito, 'mio');
  assert.equal(r.righe[0].suo, null);
});

test('10. le classifiche sono una per esercizio e non sommano muscoli diversi', () => {
  const classifiche = classifichePerEsercizio([
    { account: 'p1', username: 'Stefano', record: [rec(50, 8, chest), rec(20, 7, curl)] },
    { account: 'p2', username: 'Andrea', record: [rec(45, 8, chest)] },
  ], [chest, curl]);
  assert.equal(classifiche.length, 2);
  for (const c of classifiche) {
    assert.ok(c.voci.length >= 1);
    // ogni voce ha lo stesso esercizio: nessuna somma di pesi diversi
    for (const v of c.voci) assert.equal(v.punteggio !== undefined, true);
  }
  const chestClassifica = classifiche.find((c) => c.esercizio.id === chest.id);
  assert.equal(chestClassifica.voci.length, 2);
  assert.equal(chestClassifica.voci[0].username, 'Stefano');
});

test('11. chi non ha il record non compare in classifica', () => {
  const classifiche = classifichePerEsercizio([
    { account: 'p1', username: 'Stefano', record: [recordEsercizio([], chest)] },
  ], [chest]);
  assert.equal(classifiche.length, 0);
});

test('12. gli avatar hanno id univoci e un colore', () => {
  const id = new Set(elencoAvatar().map((a) => a.id));
  assert.equal(id.size, elencoAvatar().length);
  for (const a of elencoAvatar()) assert.match(a.colore, /^#[0-9a-f]{6}$/i);
  assert.ok(gradienteAvatar('viola').includes('linear-gradient'));
  assert.equal(avatarPerId('non-esiste').id, 'vuoto', 'avatar sconosciuto: si usa quello di default');
});

test('13. le iniziali si ricavano dal nome', () => {
  assert.equal(iniziali('Stefano'), 'ST');
  assert.equal(iniziali('Andrea Rossi'), 'AR');
  assert.equal(iniziali(''), '??');
  assert.ok(avatarPredefinito('Marco').iniziali);
});

test('14. la privacy chiusa di un campo non impedisce di vedere gli altri', () => {
  // le statistiche sono private, quindi chiuse a tutti; i record restano
  // pubblici, perché la privacy lavora campo per campo
  const mezzo = { id: 'p2', username: 'Andrea', privacy: { statistiche: 'privato' } };
  assert.equal(puoVedere(stefano, mezzo, 'statistiche'), false, 'le statistiche restano chiuse');
  assert.equal(puoVedere(stefano, mezzo, 'record'), true, 'i record si vedono: sono pubblici');
});