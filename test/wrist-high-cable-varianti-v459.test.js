import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ESERCIZI} from '../src/dati-iniziali.js';
import {sorgenteMiniatura} from '../src/exercise-icons.js';
import {caricoEffettivo, configEsercizio} from '../src/rank-v3/modello.js';
import {movimentoDi, valutaPrestazione, soglieLegibiliNuove} from '../src/rank-v3/valutazione.js';

const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8');
const one = ESERCIZI.find(e => e.id === 'ex-high-cable-wrist-curl-one-arm');
const two = ESERCIZI.find(e => e.id === 'ex-high-cable-wrist-curl-two-arm');

test('v459: aggiunte 2 varianti al cavo ALTO, storico Wrist Curl intatto', () => {
  assert.equal(ESERCIZI.length, 81);
  assert.equal(new Set(ESERCIZI.map(e=>e.id)).size,81);
  const old=ESERCIZI.find(e => e.id==='ex-wrist-curl');
  assert.ok(old); assert.equal(old.nome,'Wrist Curl');
  assert.ok(one); assert.ok(two);
  assert.equal(one.usoBraccia,'un_braccio');
  assert.equal(two.usoBraccia,'due_braccia');
  assert.equal(one.convenzione,'cavo_totali'); assert.equal(two.convenzione,'cavo_totali');
  assert.equal(one.carrucola,'carrucola_mono');
  assert.equal(two.carrucola,'carrucola_mono');
  assert.equal(old.carrucola,'carrucola_doppia');
  assert.equal(old.usoBraccia,'un_braccio');
  assert.equal(one.rapportoCarrucolaDaVerificare,undefined);
  assert.equal(two.rapportoCarrucolaDaVerificare,undefined);
  assert.match(one.nota_permanente,/ALTA/);
  assert.match(two.nota_permanente,/sbarra/i);
});

test('v459: due foto indipendenti nell app e nella galleria, visibili offline', () => {
  const g=read('verifica-icone.html'),sw=read('sw.js');
  for(const e of [one,two]) {
    const img=sorgenteMiniatura(e);
    assert.equal(img.tipo,'originale');
    assert.equal(img.src,e.foto);
    // Le icone approvate ora sono WebP binari (non SVG provvisori).
    const bytes=readFileSync(new URL('../'+e.foto, import.meta.url));
    assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF');
    assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP');
    assert.ok(bytes.length>3000,'illustrazione approvata non vuota');
    assert.ok(g.includes(e.id));
    assert.ok(g.includes(e.foto));
    assert.ok(sw.includes('./'+e.foto));
  }
  assert.match(sw,/palestra-v473/);
  assert.match(read('index.html'),/palestra-v473/);
  assert.equal((g.match(/<article class="tile /g)||[]).length,81);
});

test('v459: Rank indipendente, kg per mano vs pila bilaterale', () => {
  const vOne=movimentoDi(one), vTwo=movimentoDi(two);
  assert.equal(vOne.movimento,'polso');
  assert.equal(vTwo.movimento,'polso');
  const c1=configEsercizio({esercizio:one,movimento:vOne.movimento,livello:vOne.livello});
  const c2=configEsercizio({esercizio:two,movimento:vTwo.movimento,livello:vTwo.livello});
  assert.equal(caricoEffettivo({peso:30},c1,{esercizio:one}).carico,30);
  assert.equal(caricoEffettivo({peso:30},c2,{esercizio:two}).carico,30);
  assert.equal(caricoEffettivo({peso:30},c2,{esercizio:two}).caricoPerScore,15);
  assert.equal(caricoEffettivo({peso:30},c1,{esercizio:ESERCIZI.find(e=>e.id==='ex-wrist-curl')}).carico,15);
});

test('v460: alto 1:1, basso 2:1, due mani /2 sullo stesso carico',()=>{
 const low=ESERCIZI.find(e=>e.id==='ex-wrist-curl');
 function effettivo(e,peso){
   const m=movimentoDi(e),cfg=configEsercizio({esercizio:e,movimento:m.movimento,livello:m.livello});
   return caricoEffettivo({peso},cfg,{esercizio:e});
 }
 for(const peso of [10,25,40,60]){
   assert.equal(effettivo(one,peso).carico,peso,'alto monobraccio 1:1');
   assert.equal(effettivo(two,peso).carico,peso,'alto sbarra: carico TOTALE realmente tirato');
   assert.equal(effettivo(two,peso).caricoPerScore,peso/2,'solo confronto per polso');
   assert.equal(effettivo(low,peso).carico,peso/2,'basso monobraccio 2:1');
 }
 assert.equal(low.id,'ex-wrist-curl','lo storico rimane sul vecchio ID');
});

test('v461: 20 kg sulla sbarra sono 20 kg TOTALI, il Rank usa una proxy per polso senza falsare il totale',()=>{
  const pesoCorporeo=70;
  const carico=20;
  const serie=[{peso:carico,ripetizioni:8,stato:'fatta'}];
  const bil=valutaPrestazione({esercizio:two,serie,pesoCorporeo});
  const mono=valutaPrestazione({esercizio:one,serie:[{peso:carico/2,ripetizioni:8,stato:'fatta'}],pesoCorporeo});
  assert.equal(bil.valido,true);
  assert.equal(mono.valido,true);
  assert.equal(bil.caricoRegistrato,20,'si registra il carico della pila intero');
  assert.equal(bil.caricoReale,20,'la carrucola alta 1:1 sposta 20 kg TOTALI');
  assert.equal(bil.caricoPerPolsoStimato,10,'solo lo score provvisorio e per polso');
  assert.match(bil.notaCarico,/TOTALE/);
  assert.equal(bil.score,mono.score,'proxy per polso: stessa serie equivalente a 10 kg monobraccio');
  assert.equal(bil.rank.nome,mono.rank.nome);
  assert.equal(bil.ingresso,mono.ingresso*2,'soglia espressa in kg TOTALI caricati');
  assert.equal(bil.vertice,mono.vertice*2,'vertice in kg TOTALI caricati');
  assert.equal(bil.kgEquivalenti,mono.kgEquivalenti*2,'equivalenti in kg sulla sbarra');
  const soglieMono=soglieLegibiliNuove(mono.soglie,{esercizio:one,pesoCorporeo,cfg:mono.cfg});
  const soglieBil=soglieLegibiliNuove(bil.soglie,{esercizio:two,pesoCorporeo,cfg:bil.cfg});
  assert.equal(soglieMono.length,soglieBil.length);
  for(let i=0;i<soglieMono.length;i++) if(soglieMono[i]!==null&&soglieBil[i]!==null) {
    assert.ok(soglieBil[i]>soglieMono[i],
      'soglia '+i+' bilaterale deve indicare piu kg TOTALI che una sola mano');
    // Non chiediamo esattamente il doppio: la pila e' a scatti di peso selezionabili.
    // Verifichiamo che il carico in kg totali consigliato raggiunga davvero lo score.
    const conSbarra=valutaPrestazione({esercizio:two,
      serie:[{peso:soglieBil[i],ripetizioni:8,stato:'fatta'}],pesoCorporeo});
    assert.ok(conSbarra.valido && conSbarra.score+0.00001>=bil.soglie[i],
      'soglia '+i+' deve essere realmente raggiunta coi kg TOTALI indicati');
  }
  if(bil.distanza?.kgNecessari!==null && mono.distanza?.kgNecessari!==null) {
    assert.ok(bil.distanza.kgNecessari > mono.distanza.kgNecessari,
      'l obiettivo di carico sulla sbarra deve richiedere piu kg che su una sola mano');
  }
});
