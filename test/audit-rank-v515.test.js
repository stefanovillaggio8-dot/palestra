import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { valutaPrestazione } from '../src/rank-v3/valutazione.js';
import { recordEsercizio } from '../src/rank.js';

const esercizio = id => ESERCIZI.find(e => e.id === id);
const valuta = (e, pesiRip, pesoCorporeo = 72, extra = {}) => valutaPrestazione({
  esercizio:e,pesoCorporeo,
  serie:pesiRip.map(([peso,ripetizioni],i) => ({
    id:'serie-'+i,seduta_id:'audit',esercizio_id:e.id,peso,ripetizioni,stato:'fatta',...extra,
  })),
});

test('v515: Dumbbell Curl 30 kg x 3 a 72 kg resta Platinum I, con kg per un manubrio', () => {
  const e=esercizio('ex-dumbbell-curl');
  assert.equal(e.convenzione,'per_manubrio');
  const r=valuta(e,[[30,3]]);
  assert.equal(r.valido,true);
  assert.equal(r.caricoReale,30);
  assert.equal(r.ripetizioni,3);
  assert.equal(r.rank.id,'platinum');
  assert.equal(r.divisione.id,1);
  assert.equal(r.lp,16);
  assert.match(r.calibrazione.fonteUrl,/strength-standards\/dumbbell-curl\/kg/);
  assert.match(r.calibrazione.descrizione,/2-4 ripetizioni/);
  assert.doesNotMatch(r.calibrazione.descrizione,/Strict Curl/);
  assert.doesNotMatch(r.calibrazione.descrizione,/\.\./);
});

test('v516: una serie reale da 3 ripetizioni non viene scartata per una piu leggera da 8',()=>{
  const e=esercizio('ex-dumbbell-curl');
  const r=valuta(e,[[30,3],[20,8]]);
  assert.equal(r.caricoReale,30);
  assert.equal(r.ripetizioni,3);
  assert.equal(r.rank.id,'platinum');
  assert.equal(r.divisione.id,1);
  assert.equal(r.lp,18,'seconda serie completata: +2 LP di volume senza cambiare Rank');
  assert.equal(r.calibrazione.livello,'bassa');
});

test('v516: il carico breve conta ma non vince automaticamente una serie migliore',()=>{
  const e=esercizio('ex-dumbbell-curl');
  const forte=valuta(e,[[30,3],[26,5]]);
  assert.equal(forte.caricoReale,30);
  assert.equal(forte.ripetizioni,3);
  const lungo=valuta(e,[[30,3],[28,8]]);
  assert.equal(lungo.caricoReale,28);
  assert.equal(lungo.ripetizioni,8);
  assert.ok(lungo.score>forte.score);
  const cortissimo=valuta(e,[[30,1],[24,8]]);
  assert.equal(cortissimo.caricoReale,24);
  assert.equal(cortissimo.ripetizioni,8);
});

test('v518: Hyperextension con carico reale raggiunge Olympian come modello, senza sommare volume',()=>{
  const e=esercizio('ex-back-extension-hanging');
  const r=valuta(e,[[80,7]],72);
  assert.equal(r.valido,true);
  assert.equal(r.fuoriScalaProvvisoria,false);
  assert.equal(r.rank.id,'olympian');
  assert.equal(r.divisione,null);
  assert.ok(r.lp>=0);
  assert.equal(r.distanza,null);
  const card=recordEsercizio([{id:'hyper',esercizio_id:e.id,seduta_id:'audit',peso:80,
    ripetizioni:7,stato:'fatta'}],e,null,72);
  assert.equal(card.fuoriScalaProvvisoria,false);
  assert.equal(card.spiegaBonus,null,'non dire che il record e lontano da una soglia gia superata');
});

test('v515: monotonia carichi, penalita spotter e soglie ordinate in tutto il catalogo',()=>{
  let controllati=0;
  for(const e of ESERCIZI){
    if(e.convenzione==='corpo_libero')continue;
    const a=valuta(e,[[15,8]]),b=valuta(e,[[30,8]]);
    if(!a.valido||!b.valido)continue;
    controllati++;
    assert.ok(b.score>=a.score,e.nome+': piu kg non possono abbassare lo score');
    assert.ok(b.indice>=a.indice,e.nome+': piu kg non possono abbassare il Rank');
    assert.ok(b.soglie.every((s,i)=>i===0||s>b.soglie[i-1]),e.nome+': soglie ordinate');
    const assist=valuta(e,[[30,8]],72,{spotter:true});
    if(assist.valido)assert.ok(assist.score<=b.score,e.nome+': lo spotter non e un bonus');
  }
  assert.ok(controllati>=75,'il controllo deve coprire quasi tutto il catalogo');
});

test('v515: le schede rank distinguono limiti dei dati e convenzioni del carico',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/FUORI MODELLO · Titan\/Olympian non verificati/);
  assert.match(app,/Kg per un singolo manubrio, non la somma dei due/);
  assert.match(app,/Kg di zavorra esterna, senza sommare il peso corporeo/);
  assert.match(app,/I 99 LP sono il limite della scala provvisoria/);
  assert.match(app,/rip\. reali · considerate nel Rank/);
});
