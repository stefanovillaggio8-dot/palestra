import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  testoRicercaEsercizi, corrispondeRicercaEsercizi, filtraEserciziPerRicerca,
} from '../src/ricerca-esercizi.js';

const voci = [
  { e: { id:'preacher', nome:'One Arm Dumbbell Preacher Curl' }, gruppo:'bicipiti', generale:'braccia' },
  { e: { id:'laterali', nome:'Alzate laterali al cavo' }, gruppo:'deltoide laterale', generale:'spalle' },
  { e: { id:'scott', nome:'Curl Scott con bilanciere EZ' }, gruppo:'bicipiti', generale:'braccia' },
  { e: { id:'row', nome:'Rematore manubrio' }, gruppo:'centro schiena', generale:'schiena' },
];

// Dal v437: Preacher e Scott sono sinonimi (inglese e italiano).
test('v421: cerca parole in qualsiasi punto della frase, non soltanto allinizio', () => {
  assert.deepEqual(filtraEserciziPerRicerca(voci, 'preacher').map(x=>x.e.id), ['preacher', 'scott']);
  assert.deepEqual(filtraEserciziPerRicerca(voci, 'dumbbell').map(x=>x.e.id), ['preacher']);
  assert.deepEqual(filtraEserciziPerRicerca(voci, 'cavo').map(x=>x.e.id), ['laterali']);
  assert.deepEqual(filtraEserciziPerRicerca(voci, 'manubrio').map(x=>x.e.id), ['row']);
});

test('v421: parole multiple in qualunque ordine, tra nome e muscolo', () => {
  assert.deepEqual(filtraEserciziPerRicerca(voci, 'curl one').map(x=>x.e.id), ['preacher']);
  assert.deepEqual(filtraEserciziPerRicerca(voci, 'bicipiti preacher').map(x=>x.e.id), ['preacher', 'scott']);
  assert.deepEqual(filtraEserciziPerRicerca(voci, 'schiena rematore').map(x=>x.e.id), ['row']);
  assert.deepEqual(filtraEserciziPerRicerca(voci, 'spalle cavo').map(x=>x.e.id), ['laterali']);
  assert.deepEqual(filtraEserciziPerRicerca(voci, 'curl pressa'), []);
});

test('v421: ignora accenti, punteggiatura, maiuscole e spazi', () => {
  assert.equal(testoRicercaEsercizi('  DéLTOÍDE -  LÁTERALE '), 'deltoide laterale');
  assert.deepEqual(filtraEserciziPerRicerca(voci, 'DÉLTOIDE LATERALE').map(x=>x.e.id), ['laterali']);
  assert.deepEqual(filtraEserciziPerRicerca(voci, ' ONE   ARM ').map(x=>x.e.id), ['preacher']);
  assert.deepEqual(filtraEserciziPerRicerca(voci, ''), voci);
  assert.deepEqual(filtraEserciziPerRicerca(voci, null), voci);
  assert.deepEqual(filtraEserciziPerRicerca([], 'curl'), []);
  assert.equal(corrispondeRicercaEsercizi(null, 'curl'), false);
});

test('v421: il catalogo non crea duplicati e mantiene i riferimenti', () => {
  const source = [voci[0], {...voci[0],e:{id:'secondo-preacher',nome:'Preacher Curl'}}];
  assert.deepEqual(filtraEserciziPerRicerca(source,'preacher').map(x=>x.e.id),
    ['preacher','secondo-preacher']);
});

test('v421: Prova Rank e modifica della scheda richiamano lo stesso elenco', () => {
  const code = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(code, /function costruisciSelettoreEsercizi\(esercizi, onScelta\)/);
  assert.match(code, /lista\.appendChild\(costruisciSelettoreEsercizi\(liberi,/);
  assert.match(code, /contenitore\.appendChild\(costruisciSelettoreEsercizi\(V\.esercizi \|\| \[\],/);
  assert.match(code, /corrispondeRicercaEsercizi\(v, testoRicerca\)/);
  assert.doesNotMatch(code, /n\.toLowerCase\(\)\.startsWith\(testo\)/);
  assert.doesNotMatch(code, /la prossima soglia è a ['"]? \+ record\.sogliaSuccessiva \+ ['"] kg/);
});

test('v421: il catalogo completo ha foto, muscolo, filtro e conta i risultati', () => {
  const code = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const start = code.indexOf('function costruisciSelettoreEsercizi(');
  const end = code.indexOf('function scegliEsercizio(',start);
  assert.ok(start>=0 && end>start);
  const ui = code.slice(start,end);
  assert.match(ui, /class: 'foto-esercizio'/);
  assert.match(ui, /nomeConMuscolo\(e, \{ soloPrincipale: true \}\)/);
  assert.match(ui, /class: 'lista-scelte'/);
  assert.match(ui, /filtroGenerale/);
  assert.match(ui, /filtroGruppo/);
  assert.match(ui, /esercizi trovati/);
});
