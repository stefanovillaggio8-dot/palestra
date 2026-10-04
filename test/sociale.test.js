// sociale.test.js -- privacy, amici, confronto e classifiche per esercizio.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  privacyDi, puoVedere, amiciDi, propostaAmicizia, confronta, classifichePerEsercizio,
  PRIVACY_PREDEFINITE, campiVisibili, CODICE_SCHEDE, codiceCorretto, codiceAperto,
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

test('1. di default i dati personali sono chiusi, le classifiche restano pubbliche', () => {
  const p = privacyDi({ id: 'p1' });
  assert.deepEqual(p, PRIVACY_PREDEFINITE);
  assert.equal(campiVisibili.length, 4);
  assert.equal(p.profilo, 'chiuso', 'il profilo non si vede');
  assert.equal(p.performance, 'chiuso', 'i record non si vedono');
  assert.equal(p.statistiche, 'chiuso', 'le statistiche non si vedono');
  assert.equal(p.leaderboard, 'pubblico', 'le classifiche restano pubbliche');
});

test('2. senza codice non si vede niente degli altri', () => {
  // nemmeno se sono "amici": il codice è l'unico modo
  assert.equal(puoVedere(stefano, andrea, 'record'), false, 'i record restano chiusi');
  assert.equal(puoVedere(stefano, andrea, 'profilo'), false, 'il profilo resta chiuso');
  assert.equal(puoVedere(stefano, andrea, 'statistiche'), false);
  // le classifiche invece si vedono: sono il punto della sfida
  assert.equal(puoVedere(stefano, andrea, 'leaderboard'), true, 'la classifica è pubblica');
});

test('3. col codice giusto si vede tutto quello che non è chiuso per scelta', () => {
  assert.equal(puoVedere(stefano, andrea, 'record', true), true);
  assert.equal(puoVedere(stefano, andrea, 'profilo', true), true);
  assert.equal(puoVedere(stefano, andrea, 'statistiche', true), true);
});

test('3b. privacy privata = dato non visibile, e non basta nasconderlo a schermo', () => {
  // "privato" è la scelta forte: nessuno lo vede, nemmeno con il codice.
  // "chiuso" invece è il default e si apre col codice (test 3).
  const privato = { id: 'p2', username: 'Andrea', privacy: { performance: 'privato' } };
  assert.equal(puoVedere(stefano, privato, 'record'), false, 'chiuso a tutti');
  assert.equal(puoVedere(stefano, privato, 'record', true), false, 'e resta chiuso anche col codice');
  assert.equal(puoVedere(stefano, privato, 'profilo', true), true, 'il profilo si vede col codice');
});

test('3c. il codice è 030226 e viene confrontato carattere per carattere', () => {
  assert.equal(CODICE_SCHEDE, '030226', 'il codice deve essere proprio questo');
  assert.equal(codiceCorretto('030226'), true);
  assert.equal(codiceCorretto(' 030226 '), true, 'gli spazi non contano');
  assert.equal(codiceCorretto('030227'), false, 'una cifra sbagliata non apre');
  assert.equal(codiceCorretto('30226'), false, 'gli zeri iniziali contano');
  assert.equal(codiceCorretto('0302260'), false, 'non si accettano cifre in più');
  assert.equal(codiceCorretto(''), false);
  assert.equal(codiceCorretto(null), false);
  assert.equal(codiceCorretto(undefined), false);
});

test('3d. il codice ricordato vale anche nelle visite dopo', () => {
  assert.equal(codiceAperto(true, false), true, 'aperto per questa sessione');
  assert.equal(codiceAperto(false, true), true, 'ricordato sul dispositivo');
  assert.equal(codiceAperto(false, false), false, 'senza codice resta chiuso');
  assert.equal(codiceAperto(undefined, undefined), false);
});

test('4. l\'account privato non si vede nella lista', () => {
  const privato = { id: 'p3', username: 'Marco', privacy: { profilo: 'chiuso' } };
  assert.equal(puoVedere(stefano, privato, 'profilo'), false);
  assert.equal(puoVedere(stefano, privato, 'profilo', true), true, 'ma il codice lo apre');
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
  // "chiuso" (il default) e si aprono col codice
  const mezzo = { id: 'p2', username: 'Andrea', privacy: { statistiche: 'privato' } };
  assert.equal(puoVedere(stefano, mezzo, 'statistiche'), false, 'le statistiche restano chiuse');
  assert.equal(puoVedere(stefano, mezzo, 'record'), false, 'i record senza codice no');
  assert.equal(puoVedere(stefano, mezzo, 'record', true), true, 'ma col codice sì');
});