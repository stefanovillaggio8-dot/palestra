import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { filtraEserciziPerRicerca, corrispondeRicercaEsercizi } from '../src/ricerca-esercizi.js';

const cerca = testo => filtraEserciziPerRicerca(ESERCIZI, testo);
const ids = testo => cerca(testo).map(e => e.id);
const deveTrovare = (ricerca,id) =>
  assert.ok(ids(ricerca).includes(id), '"' + ricerca + '" non trova "' + id + '"');
const nonDeveTrovare = (ricerca,id) =>
  assert.ok(!ids(ricerca).includes(id), '"' + ricerca + '" confonde "' + id + '"');

test('v437: esercizi inglesi trovati con italiano comune, singolare e plurale',()=>{
  for(const [ricerca,id] of [
    ['alzate laterali con manubri','ex-db-lateral-raise'],
    ['alzata laterale al cavo','ex-cable-lateral-raise'],
    ['rematore con manubrio','ex-dumbbell-row'],
    ['remata manubri','ex-dumbbell-row'],
    ['croci ai cavi','ex-cable-fly'],
    ['croci inverse ai cavi','ex-cable-reverse-fly'],
    ['curl a martello con manubri','ex-hammer-curl-dumbbell'],
    ['panca scott manubri','ex-one-arm-preacher-curl'],
    ['scrollate manubri','ex-chest-supported-shrug'],
    ['stacco da terra manubri','ex-dumbbell-deadlift'],
    ['estensioni tricipiti sopra la testa al cavo','ex-cable-overhead-tricep'],
    ['estensioni delle gambe','ex-leg-extension'],
    ['flessioni gambe seduto','ex-seated-leg-curl'],
    ['sollevamenti polpacci','ex-sled-press-calf-raise'],
    ['lat machine presa neutra','ex-lat-pulldown-lats'],
    ['lat machine presa stretta','ex-neutral-grip-lat-pulldown'],
    ['lat machine presa larga','ex-wide-grip-lat-pulldown'],
    ['panca inclinata con manubri','ex-incline-dumbbell-bench-press'],
    ['panca piana con bilanciere','ex-bench-press'],
    ['panca piana con manubri','ex-dumbbell-bench-press'],
    ['spinte tricipiti verso il basso','ex-single-arm-tricep-pushdown'],
    ['tirate al viso','ex-face-pull'],
    ['panca scott al contrario','ex-scott-bench-curl'],
    ['iperestensioni lombari','ex-back-extension'],
    ['multipower panca','ex-smith-machine-bench-press'],
  ]) deveTrovare(ricerca,id);
});

test('v437: non confonde manubri, cavi e bilanciere e riconosce le prese',()=>{
  nonDeveTrovare('alzate laterali ai cavi','ex-db-lateral-raise');
  nonDeveTrovare('alzate laterali con manubri','ex-cable-lateral-raise');
  nonDeveTrovare('croci inverse ai cavi','ex-cable-fly');
  nonDeveTrovare('panca piana manubri','ex-incline-dumbbell-bench-press');
  nonDeveTrovare('panca piana manubri','ex-decline-dumbbell-bench-press');
  nonDeveTrovare('panca scott al contrario','ex-one-arm-preacher-curl');
  nonDeveTrovare('lat machine presa stretta','ex-lat-pulldown-lats');
  nonDeveTrovare('lat machine presa neutra','ex-wide-grip-lat-pulldown');
});

test('v437: la ricerca originale inglese, parziale e senza accenti resta valida',()=>{
  for(const [ricerca,id] of [
    ['Dumbbell Lat','ex-db-lateral-raise'],
    ['dumbbell row','ex-dumbbell-row'],
    ['preacher','ex-one-arm-preacher-curl'],
    ['LAT Pulldown','ex-lat-pulldown-lats'],
    ['cable fly','ex-cable-fly'],
    ['DÉLTOIDE','ex-cable-lateral-raise'],
    ['alz','ex-db-lateral-raise'],
    ['cávO','ex-cable-fly'],
    ['REMÁTORE MANÚBRI','ex-dumbbell-row'],
  ]) deveTrovare(ricerca,id);
  assert.deepEqual(cerca(null), ESERCIZI);
  assert.deepEqual(cerca(''), ESERCIZI);
});

test('v437: nomi personalizzati funzionano con sinonimi, preservando oggetti e ordine',()=>{
  const voci=[
    {e:{id:'a',nome:'Cable Lateral Raise'},gruppo:'deltoidi',generale:'spalle'},
    {e:{id:'b',nome:'Dumbbell Lateral Raise'},gruppo:'deltoidi',generale:'spalle'},
    {e:{id:'c',nome:'Lat Pulldown presa neutra'},gruppo:'schiena',generale:'dorso'},
  ];
  assert.deepEqual(filtraEserciziPerRicerca(voci,'alzate laterali ai cavi'),[voci[0]]);
  assert.deepEqual(filtraEserciziPerRicerca(voci,'alzate laterali manubri'),[voci[1]]);
  assert.deepEqual(filtraEserciziPerRicerca(voci,'lat machine neutra'),[voci[2]]);
  assert.equal(corrispondeRicercaEsercizi(null,'alzate'),false);
  assert.deepEqual(filtraEserciziPerRicerca(voci,'trovami niente'),[]);
});

test('v437: Prova esercizio e modifica scheda condividono la ricerca bilingue',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/import \{ corrispondeRicercaEsercizi \} from '\.\/ricerca-esercizi\.js'/);
  assert.match(app,/corrispondeRicercaEsercizi\(v, testoRicerca\)/);
  assert.match(app,/lista\.appendChild\(costruisciSelettoreEsercizi\(liberi,/);
  assert.match(app,/contenitore\.appendChild\(costruisciSelettoreEsercizi\(V\.esercizi \|\| \[\],/);
});
