import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { valutaPrestazione } from '../src/rank-v3/valutazione.js';
import { posizioneIconaCorretta, POSIZIONI_ICONE_CORRETTE } from '../src/exercise-icons.js';
import { standardAutomaticoPerEsercizio } from '../src/rank-v3/standard-automatici.js';

const strict = ESERCIZI.find(e => e.id === 'ex-strict-curl-ez-wall');
const s = (id, peso, ripetizioni, extra = {}) => ({
  id, esercizio_id:strict.id, seduta_id:'seduta-test',
  stato:'fatta', peso, ripetizioni, ...extra,
});
const prova = serie => valutaPrestazione({esercizio:strict,serie,pesoCorporeo:72});
const src = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v441: 70 x 1 valido nello Strict Curl e un 1RM misurato, non una stima', () => {
  const r = prova([s('singola',70,1)]);
  assert.equal(r.valido,true);
  assert.equal(r.caricoReale,70);
  assert.equal(r.ripetizioni,1);
  assert.equal(r.massimale,null);
  assert.equal(r.serieId,'singola');
  assert.equal(r.calibrazione.livello,'indicativa');
  assert.match(r.calibrazione.notaMassimale,/1 ripetizione massimale/);
  // Non si gonfia il Rank per farlo coincidere con un record italiano non dimostrato.
  assert.ok(r.indice>=3 && r.indice<5, 'gli standard community non autorizzano TITAN a 70x1');
});

test('v441: la singola da record batte una serie leggera da 8 senza preferenza arbitraria 5+', () => {
  const r=prova([s('otto',28,8),s('massimale',70,1)]);
  assert.equal(r.serieId,'massimale');
  assert.equal(r.ripetizioni,1);
  assert.equal(r.caricoReale,70);
  assert.equal(r.score,prova([s('massimale',70,1)]).score);
  const conSpotter=prova([s('otto',28,8),s('assistita',70,1,{spotter:true})]);
  assert.equal(conSpotter.spotter,true);
  assert.ok(conSpotter.score < r.score);
});

test('v441: confronti validi a parita di 1 rep e peso corporeo, nessuna soglia arbitraria', () => {
  const p65=valutaPrestazione({esercizio:strict,serie:[s('uno',70,1)],pesoCorporeo:65});
  const p85=valutaPrestazione({esercizio:strict,serie:[s('uno',70,1)],pesoCorporeo:85});
  assert.ok(p65.score>p85.score);
  const standard=standardAutomaticoPerEsercizio(strict);
  assert.equal(standard.soglie1RMPerPeso.find(x=>x[0]===75).at(-1),81);
  assert.match(standard.fonteUrl,/strict-curl/);
});

test('v441: la libreria non riusa la stessa miniatura su 16 esercizi differenti', () => {
  const ids=Object.keys(POSIZIONI_ICONE_CORRETTE);
  assert.equal(ids.length,16);
  const coordinate=new Set();
  for(const id of ids){
    const esercizio=ESERCIZI.find(e=>e.id===id);
    assert.ok(esercizio, id+' esiste nel catalogo');
    const pos=posizioneIconaCorretta(esercizio);
    assert.ok(pos, id+' usa la nuova illustrazione');
    const k=pos.x.toFixed(3)+'/'+pos.y.toFixed(3);
    assert.equal(coordinate.has(k),false,id+' non condivide la stessa cella');
    coordinate.add(k);
  }
  assert.equal(posizioneIconaCorretta({id:'custom',foto:'img/esercizi/mia.png'}),null);
});

test('v441: tutte le viste usano miniatura e CSS/sync mantengono la spritesheet', () => {
  const app=src('src/app.js');
  const css=src('stile.css');
  const premium=src('stile-premium.css');
  const sw=src('sw.js');
  assert.match(app,/import \{ miniaturaEsercizio \} from '\.\/exercise-icons\.js'/);
  assert.equal((app.match(/miniaturaEsercizio\(/g)||[]).length,7);
  assert.match(css,/\.foto-esercizio-sprite[\s\S]*?background-size: 400% 400%/);
  assert.match(premium,/\.app-vista-allenamento \.pillola-esercizio \.foto-esercizio[\s\S]*?flex-basis:30px/);
  assert.match(sw,/'\.\/src\/exercise-icons\.js'/);
  assert.match(sw,/'\.\/img\/esercizi\/esercizi-pittogrammi-viola-v443\.svg'/);
});
