import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { recordAccount, recordEsercizio } from '../src/rank.js';
import { confronta } from '../src/sociale.js';
import { calcolaRankDiProva } from '../src/prova-rank.js';
import { erroreInvitoDefinitivo, scartaInvitoNonUtilizzabile } from '../src/inviti-pendenti.js';

const e = id => ESERCIZI.find(x => x.id === id);

test('v517: confronto e Rank personale usano lo stesso motore con il peso corporeo', () => {
  const esercizio = e('ex-one-arm-cable-reverse-fly');
  const serie = [{ id: 's', seduta_id: 'allenamento', esercizio_id: esercizio.id,
    peso: 28, ripetizioni: 8, stato: 'fatta' }];
  const gruppi = [{ esercizio_id: esercizio.id, seduta_id: 'allenamento', serie }];
  const personale = recordEsercizio(serie, esercizio, null, 72);
  const confronto = recordAccount([esercizio], gruppi, { pesoAttuale: 72, richiediPesoCorporeo: true })[0];
  assert.equal(personale.motore, 'nuovo');
  assert.equal(confronto.motore, 'nuovo');
  assert.equal(confronto.rank.id, personale.rank.id);
  assert.equal(confronto.punteggio, personale.punteggio);
  const senzaPeso = recordAccount([esercizio], gruppi, { richiediPesoCorporeo: true })[0];
  assert.equal(senzaPeso.valido, false);
  assert.match(senzaPeso.motivo, /Peso corporeo/);
  const storico = recordAccount([esercizio], [{ ...gruppi[0], serie: [{ ...serie[0], peso_corpo: 72 }] }],
    { richiediPesoCorporeo: true })[0];
  assert.equal(storico.rank.id, personale.rank.id);
});

test('v517: confronto amici senza dati comuni non produce finte vittorie', () => {
  const esercizio = e('ex-dumbbell-curl');
  const mio = [{ esercizio, valido: true, punteggio: 3, testo: '30 kg x 3' }];
  const nessuno = confronta({}, {}, mio, []);
  assert.deepEqual([nessuno.vinti, nessuno.pari, nessuno.persi, nessuno.nonConfrontabili], [0, 0, 0, 1]);
  assert.equal(nessuno.righe[0].esito, 'non_confrontabile');
  const inGara = confronta({}, {}, mio, [{ esercizio, valido: true, punteggio: 2, testo: '25 kg x 3' }]);
  assert.equal(inGara.vinti, 1);
  assert.equal(inGara.nonConfrontabili, 0);
});

test('v517: invito scaduto viene eliminato senza cambiare la pagina o i dati', () => {
  assert.equal(erroreInvitoDefinitivo('Questo invito è scaduto: chiedine uno nuovo.'), true);
  assert.equal(erroreInvitoDefinitivo('Invito non valido'), true);
  assert.equal(erroreInvitoDefinitivo('JWT non valido'), false);
  assert.equal(erroreInvitoDefinitivo('Timeout di rete'), false);
  const dati = new Map([['palestra-invito-pendente', 'token-old'], ['serie-offline', 'intatte']]);
  const memoria = {
    getItem: k => dati.get(k) || null,
    removeItem: k => dati.delete(k),
  };
  const posizione = { href: 'https://example.com/palestra/?p=1&inv=token-old#/amici' };
  const cronologia = { state: {}, replaceState: (_a, _b, url) => { posizione.href = 'https://example.com' + url; } };
  assert.equal(scartaInvitoNonUtilizzabile('token-old', { memoria, posizione, cronologia }), true);
  assert.equal(dati.has('palestra-invito-pendente'), false);
  assert.equal(dati.get('serie-offline'), 'intatte');
  assert.equal(posizione.href, 'https://example.com/palestra/?p=1#/amici');
  assert.equal(scartaInvitoNonUtilizzabile('token-old', { memoria, posizione, cronologia }), false);
});

test('v517: prova un esercizio non inventa il peso e replica il rank reale', () => {
  const curl = e('ex-dumbbell-curl');
  const prova = calcolaRankDiProva({ esercizio: curl, peso: '30', ripetizioni: '3', pesoCorporeo: '72' });
  assert.equal(prova.valido, true);
  assert.equal(prova.record.motore, 'nuovo');
  assert.equal(prova.record.rank.id, 'platinum');
  assert.equal(prova.record.divisione.id, 1);
  assert.equal(prova.serie.peso, 30);
  assert.equal(calcolaRankDiProva({ esercizio: curl, peso: 30, ripetizioni: 3, pesoCorporeo: '' }).valido, false);
  assert.equal(calcolaRankDiProva({ esercizio: curl, peso: 30, ripetizioni: '3,5', pesoCorporeo: 72 }).valido, false);
  assert.equal(calcolaRankDiProva({ esercizio: curl, peso: -30, ripetizioni: 3, pesoCorporeo: 72 }).valido, false);
});

test('v517: prova trazioni/dip a corpo libero non richiede pesi inventati', () => {
  for (const [libero, zavorrato] of [
    ['ex-trazioni-corpo-libero', 'ex-pull-ups'],
    ['ex-dips-corpo-libero', 'ex-dips'],
  ]) {
    const a = calcolaRankDiProva({ esercizio: e(libero), peso: '', ripetizioni: 10, pesoCorporeo: 72 });
    const b = calcolaRankDiProva({ esercizio: e(zavorrato), peso: 0, ripetizioni: 10, pesoCorporeo: 72 });
    assert.equal(a.valido, true, libero + ': ' + a.errore);
    assert.equal(a.record.motore, 'nuovo');
    assert.equal(b.record.motore, 'nuovo');
    assert.equal(a.record.rank.id, b.record.rank.id);
    assert.equal(a.record.punteggio, b.record.punteggio);
    assert.equal(a.serie.peso_assistenza, 0);
  }
});

test('v517: schermata Prova usa input validati e il dialogo scorre sul telefono', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../stile.css', import.meta.url), 'utf8');
  assert.match(app, /calcolaRankDiProva\(\{/);
  assert.match(app, /role: 'dialog'/);
  assert.match(app, /aria-modal/);
  assert.match(app, /guidaCarico\.textContent/);
  assert.match(css, /max-height: min\(90dvh, 780px\); overflow-y: auto/);
  assert.match(css, /\.campo-prova\[hidden\]/);
});
