// esercizi-personali.test.js -- l'app impara a conoscere TE.
//
// Ste (04/10/2026): "non ho capito bene spiega meglio, comunque si fai tutto".
//
// Tre cose:
//  1) quanto è pesante per TE (non in assoluto)
//  2) le tue correzioni valgono per sempre
//  3) le parole che l'app non conosce te le chiede una volta sola

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  quantoEPesantePerTe, correggiLivello, dimenticaLivello,
  livelloImparato, livelliImparati, paroleDaChiedere, imparaParola, paroleImparate,
} from '../src/esercizi-personali.js';
import { classificaEsercizio, paroleConosciute } from '../src/esercizi-classificatore.js';
import { livelloEsercizio, impostaLivelliImparati } from '../src/rank-config.js';

const chest = { id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'macchina' };
const fly = { id: 'ex-cable-fly', nome: 'Cable Fly', convenzione: 'cavo_totali' };
const curl = { id: 'ex-cable-hammer-curl', nome: 'Cable Hammer Curl', convenzione: 'cavo_totali' };

const serie = (id, esercizio_id, peso, rip) => ({
  id, seduta_id: 's1', esercizio_id, peso, ripetizioni: rip, stato: 'fatta', ordine: 1, spotter: false,
});

// ---------------------------------------------------------------------------
// 1. QUANTO E' PESANTE PER TE
// ---------------------------------------------------------------------------

test('P1. lo stesso esercizio può essere facile o difficile secondo chi lo fa', () => {
  // Ste: "se tu nella chest press spingi 40 kg e sul cable fly ne spingi 4,
  // quel cable fly per te è leggerissimo, anche se sulla carta sembra
  // impegnativo".
  //
  // Il classificatore dice che il cable fly è un isolamento (= difficile),
  // ma il SUO numero è basso rispetto al massimo che spinge: per lui è leggero.
  const mie = [
    serie('a', chest.id, 60, 8),   // il suo massimo
    serie('b', fly.id, 6, 15),     // poco, ma è il suo 15 kg al cavo
    serie('c', curl.id, 20, 10),
  ];
  const r = quantoEPesantePerTe({ serie: mie, esercizi: [chest, fly, curl], peso: 66 });

  assert.ok(r, 'deve dare una risposta');
  assert.ok(r.massimo > 0, 'il suo massimo c\'è');
  assert.equal(r.righe.length, 3, 'una riga per ogni esercizio');

  // la chest press è al 100%: è il suo esercizio più forte
  const suo = r.righe.find((x) => x.esercizio_id === chest.id);
  assert.equal(suo.percentuale, 100, 'la chest press è il suo massimo');
  assert.equal(suo.giudizio, 'massimo');

  // il cable fly è molto più basso: per lui è leggero, NONOSTANTE il
  // classificatore lo chiami isolamento
  const suoFly = r.righe.find((x) => x.esercizio_id === fly.id);
  assert.ok(suoFly.percentuale < 20, 'il cable fly è una fetta piccola del suo massimo');
  assert.ok(['leggero', 'spezzato'].includes(suoFly.giudizio),
    'quindi per lui è leggero, trovato ' + suoFly.giudizio);
  assert.match(suoFly.frase, /per te è/, 'e la frase lo dice: ' + suoFly.frase);
});

test('P2. ordina gli esercizi dal più pesante al più leggero', () => {
  const mie = [serie('a', chest.id, 60, 8), serie('b', fly.id, 8, 12), serie('c', curl.id, 30, 10)];
  const r = quantoEPesantePerTe({ serie: mie, esercizi: [chest, fly, curl], peso: 66 });
  for (let i = 1; i < r.righe.length; i++) {
    assert.ok(r.righe[i - 1].percentuale >= r.righe[i].percentuale, 'devono essere in ordine');
  }
  assert.equal(r.righe[0].nome, 'Chest Press', 'il primo è il più forte');
});

test('P3. senza dati non inventa niente', () => {
  assert.equal(quantoEPesantePerTe({ serie: [], esercizi: [chest], peso: 66 }), null);
  assert.equal(quantoEPesantePerTe({ serie: [], esercizi: [], peso: 66 }), null);
  // le serie col solo spotter contano, ma valgono il 90%: non sono più scartate
  // (Ste, 18/10/2026). Prima qui si chiedeva che il numero restasse null.
  const soloSpotter = [{ ...serie('a', chest.id, 100, 5), spotter: true }];
  assert.notEqual(quantoEPesantePerTe({ serie: soloSpotter, esercizi: [chest], peso: 66 }), null,
    'una serie col solo spotter è un numero suo, vale solo un po\' meno');
});

// ---------------------------------------------------------------------------
// 2. LE TUE CORREZIONI
// ---------------------------------------------------------------------------

test('P4. una correzione resta e vince sul classificatore', async () => {
  const account = 'test-correzioni';
  await correggiLivello(account, 'ex-cable-fly', 'grande');
  assert.equal(await livelloImparato(account, 'ex-cable-fly'), 'grande', 'la correzione c\'è');

  // il Rank deve usarla, altrimenti la correzione non serve a niente
  impostaLivelliImparati(await livelliImparati(account));
  assert.equal(livelloEsercizio(fly), 'grande',
    'il Rank usa la correzione, non quello che aveva indovinato');
  assert.equal(livelloEsercizio(chest), 'composto', 'gli altri non sono toccati');

  impostaLivelliImparati({});
  assert.equal(livelloEsercizio(fly), 'isolamento', 'scordandola torna il classificatore');
});

test('P5. puoi dimenticare una correzione', async () => {
  const account = 'test-dimentica';
  await correggiLivello(account, 'ex-wrist-curl', 'grande');
  impostaLivelliImparati(await livelliImparati(account));
  assert.equal(livelloEsercizio({ id: 'ex-wrist-curl', nome: 'Wrist Curl' }), 'grande');
  await dimenticaLivello(account, 'ex-wrist-curl');
  impostaLivelliImparati(await livelliImparati(account));
  assert.equal(livelloEsercizio({ id: 'ex-wrist-curl', nome: 'Wrist Curl' }), 'isolamento');
  impostaLivelliImparati({});
});

test('P6. non accetta livelli inventati', async () => {
  assert.equal(await correggiLivello('test-x', 'ex-chest-press', 'giocattolo'), null);
  assert.equal(await livelloImparato('test-x', 'ex-chest-press'), null);
});

// ---------------------------------------------------------------------------
// 3. LE PAROLE CHE NON CONOSCE
// ---------------------------------------------------------------------------

test('P7. chiede solo le parole che davvero non conosce', async () => {
  const account = 'test-parole';
  // nomi con parole normali: non deve chiedere niente
  const noti = await paroleDaChiedere(account, [chest, fly, curl]);
  assert.equal(noti.length, 0, 'gli esercizi normali non generano domande: ' + JSON.stringify(noti));
});

test('P8. se trova una parola nuova, te la chiede una volta sola', async () => {
  const account = 'test-parole-2';
  const esercizi = [
    chest,
    { id: 'ex-bolla', nome: 'Bolla Russa al Zerbino', convenzione: 'cavo_totali' },
  ];
  const prima = await paroleDaChiedere(account, esercizi);
  assert.ok(prima.length >= 1, 'deve chiedere qualcosa');
  assert.ok(prima[0].parole.includes('bolla'), 'la parola nuova è "bolla": ' + JSON.stringify(prima[0].parole));

  // gliela insegno
  await imparaParola(account, 'bolla', 'isolamento');
  assert.equal((await paroleImparate(account)).bolla, 'isolamento');

  // adesso non lo chiede più
  const dopo = await paroleDaChiedere(account, esercizi);
  assert.ok(!dopo.some((v) => v.parole.includes('bolla')), 'non la chiede una seconda volta');
});

test('P9. non chiede le parole vuote e gli accenti non contano', async () => {
  const account = 'test-parole-3';
  const esercizi = [{ id: 'ex-x', nome: 'Panca Inclinata Con Bilanciore', convenzione: 'bilanciere' }];
  const r = await paroleDaChiedere(account, esercizi);
  assert.equal(r.length, 0, 'tutte le parole sono note, nonostante siano scritte in modo diverso');
});

test('P10. il vocabolario dell\'app è pubblico e ispezionabile', () => {
  const conosciute = paroleConosciute();
  assert.ok(conosciute.size > 40, 'deve conoscere un bel po\' di parole');
  for (const p of ['chest', 'press', 'lateral', 'raise', 'pulldown', 'leg', 'curl']) {
    assert.ok(conosciute.has(p), 'deve conoscere "' + p + '"');
  }
});

// L'ESERCIZIO CHE HA CAMBIATO NOME (Ste, 21/10/2026).
//
// "sostituisci il nome bodyweight overhead tricep extension con one arm overhead tricep
// extension". L'esercizio sta nei DATI di Ste (l'avevo tolto dal catalogo il 18/10),
// quindi il nome glielo rinomino sul dispositivo: id uguale, cosi' le serie vecchie
// restano attaccate all'esercizio giusto, e nessun numero viene toccato.
test('M25. l esercizio col nome nuovo, e il Rank che non cambia', async () => {
  const { nuovoNomeEsercizio, RINOMINE } = await import('../src/esercizi-personali.js');
  const { classificaEsercizio } = await import('../src/esercizi-classificatore.js');

  assert.equal(nuovoNomeEsercizio('Bodyweight Overhead Tricep Extension'),
    'One Arm Overhead Tricep Extension', 'il nome vecchio va rinominato');
  assert.equal(nuovoNomeEsercizio('One Arm Overhead Tricep Extension'), null,
    'il nome nuovo non si rinomina da solo');
  assert.equal(nuovoNomeEsercizio('Chest Press'), null,
    'gli altri esercizi non si toccano');
  assert.ok(Object.keys(RINOMINE).length >= 1, 'le rinomine stanno in un posto solo');

  // IL PUNTE ESSENZIALE: col nome nuovo l'esercizio deve restare "a corpo del
  // corpo". Se no, il Rank cambierebbe da solo, e il peso che la macchina ti toglie
  // non e' un peso che l'atleta spinge.
  assert.equal(classificaEsercizio({ nome: 'One Arm Overhead Tricep Extension' }).livello,
    'assistito',
    'col nome nuovo l esercizio deve restare assistito (a corpo del corpo col cavo)');
  assert.equal(classificaEsercizio({ nome: 'Bodyweight Overhead Tricep Extension' }).livello,
    'assistito', 'e anche col nome vecchio');
});
