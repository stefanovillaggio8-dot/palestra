import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { valutaPrestazione } from '../src/rank-v3/valutazione.js';
import { modelloRipetizioniRank, ripetizioniPieneRank } from '../src/rank-v3/ripetizioni-rank.js';
import { standardAutomaticoPerEsercizio } from '../src/rank-v3/standard-automatici.js';
import { confrontaStreakDispositivi } from '../src/streak-confronto.js';

const strict = ESERCIZI.find(e=>e.id==='ex-strict-curl-ez-wall');
const standard = standardAutomaticoPerEsercizio(strict);
const rank=(kg,reps,bw=72)=>valutaPrestazione({
  esercizio: strict,pesoCorporeo:bw,
  serie:[{esercizio_id:strict.id, id:'serie', stato:'fatta', peso:kg, ripetizioni:reps, seduta_id:'seduta'}],
});
const s=(id,data,extra={})=>({id,data,stato:'completata',...extra});

test('v440: 70 kg x 1 rep con bw 72 kg non e Gold III per Strict Curl',()=>{
  assert.ok(strict && standard);
  const risultato=rank(70,1,72);
  assert.equal(risultato.valido,true);
  assert.equal(risultato.caricoReale,70);
  assert.equal(risultato.ripetizioni,1);
  assert.equal(risultato.pesoCorporeo,72);
  assert.equal(risultato.massimale,null,'mai inventare il massimale');
  assert.equal(risultato.calibrazione.livello,'indicativa','il singolo massimale misurato non e un 1RM stimato');
  assert.ok(risultato.indice>=3,'deve essere almeno Platinum, non Gold III');
  assert.ok(risultato.indice<5,'non dare Titan o Olympian con 70kg 1 rep');
});

test('v440: continuita 8 reps e solo nuova calibrazione sui bassi reps dello Strict Curl',()=>{
  const modello=modelloRipetizioniRank('bicipiti',strict,standard);
  assert.equal(modello.tipo,'strict_curl_basse_rip');
  const misura=(r)=>ripetizioniPieneRank(r,modello);
  for(let n=1;n<=7;n++){
    assert.ok(Math.abs(misura(n)-(1+n/30)/(1+8/30))<1e-10);
    assert.ok(misura(n)<misura(n+1));
  }
  assert.equal(misura(8),1);
  assert.ok(misura(9)>1);
  assert.ok(rank(70,8).score>rank(70,1).score);
  const altro=modelloRipetizioniRank('bicipiti',{id:'ex-dumbbell-curl',nome:'Dumbbell Curl'});
  assert.equal(altro.tipo,'isolamento_generale');
  assert.ok(Math.abs(ripetizioniPieneRank(1,altro)-Math.pow(1/8,.2))<1e-10,
    'non modificare gli altri esercizi');
});

test('v440: confronto locale 18 vs cloud 2 senza scritture, segnala eliminata/in corso',()=>{
  const date=['2026-10-07','2026-10-09','2026-10-10','2026-10-13','2026-10-14',
    '2026-10-16','2026-10-17','2026-10-20','2026-10-21','2026-10-23',
    '2026-10-24','2026-10-27','2026-10-28','2026-10-30','2026-10-31',
    '2026-11-03','2026-11-04','2026-11-06'];
  const profilo={giorni_allenamento:[2,3,5,6],privacy:{}};
  const locale=date.map((d,i)=>s('l'+i,d));
  const cloud=[
    s('l13','2026-10-30'),s('r1','2026-10-27',{eliminata:true}),
    s('r2','2026-11-03',{eliminata:true}),
    s('r3','2026-10-27',{stato:'in_corso'}),
    s('l16','2026-11-04'),s('l17','2026-11-06'),
  ];
  const origineLocal=JSON.stringify(locale),origineCloud=JSON.stringify(cloud);
  const c=confrontaStreakDispositivi({
    seduteLocali:locale,seduteCloud:cloud,profiloLocale:profilo,profiloCloud:profilo,
    oggi:'2026-11-07',
  });
  assert.equal(c.locale.giorni,18);
  assert.equal(c.cloud.giorni,2);
  assert.ok(c.differenti);
  assert.equal(c.dettaglioSoloLocale.find(x=>x.data==='2026-10-27').stato,'eliminata nel cloud');
  assert.equal(c.dettaglioSoloLocale.find(x=>x.data==='2026-11-03').stato,'eliminata nel cloud');
  assert.equal(JSON.stringify(locale),origineLocal);
  assert.equal(JSON.stringify(cloud),origineCloud);
});

test('v440: date cloud e locale uguali = confronto senza falsi conflitti',()=>{
  const profile={giorni_allenamento:[2,3,5,6],privacy:{}};
  const rows=[s('a','2026-11-04'),s('b','2026-11-06')];
  const c=confrontaStreakDispositivi({seduteLocali:rows,seduteCloud:rows,
    profiloLocale:profile,profiloCloud:profile,oggi:'2026-11-07'});
  assert.equal(c.differenti,false);
  assert.deepEqual(c.soloLocale,[]);
  assert.equal(c.cloud.giorni,2);
});

test('v440: la Home rilegge IndexedDB dopo la sync e il confronto non invia modifiche',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../stile.css',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(app,/Prima veniva aggiornata SOLO la rettifica/);
  assert.match(app,/await ricaricaTutto\(\{ caricaAmiciOnline: false \}\);/);
  assert.match(app,/Verifica giorni locali e cloud/);
  assert.match(app,/confrontaStreakDispositivi\(/);
  assert.doesNotMatch(app,/await sb\.scrivi\('sedute'/);
  assert.match(css,/\.foto-esercizio \{[\s\S]*?object-fit: contain/);
  assert.match(css,/\.foto-esercizio\.grande \{/);
  assert.match(sw,/'\.\/src\/streak-confronto\.js'/);
  assert.match(sw,/const VERSIONE = 'palestra-v445'/);
  assert.match(html,/window\.PALESTRA_VERSIONE = 'palestra-v445'/);
});
