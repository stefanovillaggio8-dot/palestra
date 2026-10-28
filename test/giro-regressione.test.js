import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indiceProssimoGiorno } from '../src/sedute.js';

const v = { id: 'v2', scheda_id: 's', snapshot: { giorni: [1, 2, 3, 4].map(n => ({ id: 'g' + n, nome: 'Giorno ' + n })) } };
const seduta = (n, extra = {}) => ({ id: 'a' + n, scheda_id: 's', versione_id: 'v1', giorno_id: 'g' + n,
  nome_giorno: 'Giorno ' + n, stato: 'completata', data: '2026-10-25', ...extra });

test('il giro avanza in tutti i giorni e riparte dopo il quarto, anche tra versioni', () => {
  for (let n = 1; n <= 4; n++) assert.equal(indiceProssimoGiorno(v, [seduta(n)]), n % 4);
  assert.equal(indiceProssimoGiorno(v, []), 0);
  assert.equal(indiceProssimoGiorno({ ...v, snapshot: { giorni: [] } }, []), -1);
});
test('gli inserimenti storici recenti non scavalcano gli allenamenti recenti', () => {
  const dati = [seduta(1), seduta(3, { data: '2026-09-01', ora_fine: '2026-10-28T12:00:00Z' })];
  assert.equal(indiceProssimoGiorno(v, dati), 1);
  assert.equal(indiceProssimoGiorno(JSON.parse(JSON.stringify(v)), JSON.parse(JSON.stringify(dati)).reverse()), 1);
});
test('giorni ricreati si riconoscono per nome, rinominati per ID, ambigui non si inventano', () => {
  assert.equal(indiceProssimoGiorno(v, [seduta(2, { giorno_id: 'vecchio' })]), 2);
  assert.equal(indiceProssimoGiorno(v, [seduta(2, { nome_giorno: 'Nome precedente' })]), 2);
  const ambiguo = structuredClone(v);
  ambiguo.snapshot.giorni[0].nome = 'Giorno 2';
  assert.equal(indiceProssimoGiorno(ambiguo, [seduta(2, { giorno_id: 'vecchio' })]), 0);
});
test('ignora altre schede, cestino, sedute aperte e date invalide', () => {
  for (const extra of [{ scheda_id: 'altra' }, { eliminata: true }, { stato: 'in_corso' }, { data: 'non-data' }]) {
    assert.equal(indiceProssimoGiorno(v, [seduta(2, extra)]), 0);
  }
});
test('snapshot storico recupera il nome mancante e appartenenza legacy', () => {
  const vecchia = { id: 'v1', scheda_id: 's', snapshot: { giorni: [{ id: 'vecchio', nome: 'Giorno 2' }] } };
  assert.equal(indiceProssimoGiorno(v, [seduta(2, { scheda_id: null, giorno_id: 'vecchio', nome_giorno: null })], [vecchia]), 2);
});
