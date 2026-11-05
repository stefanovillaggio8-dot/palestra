import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { movimentoDi, valutaPrestazione } from '../src/rank-v3/valutazione.js';
import {
  CAD_CURL_FATTORE_SOGLIE, standardPerMovimento, soglieNormalizzate,
} from '../src/rank-v3/modello.js';
import { standardAutomaticoPerEsercizio } from '../src/rank-v3/standard-automatici.js';

const cad = ESERCIZI.find(e => e.id === 'ex-scott-bench-curl');
const normale = ESERCIZI.find(e => e.id === 'ex-dumbbell-curl');
const scottMonobraccio = ESERCIZI.find(e => e.id === 'ex-one-arm-preacher-curl');
const ez = ESERCIZI.find(e => e.id === 'ex-ez-bar-preacher-curl');

const stdCad = standardPerMovimento(movimentoDi(cad).movimento, cad);
const stdNormale = standardPerMovimento(movimentoDi(normale).movimento, normale);

function valuta(ex, kg, reps, corpo=66, spotter=false) {
  return valutaPrestazione({
    esercizio: ex,
    serie: [{ id: 'serie-vera', esercizio_id: ex.id, seduta_id: 'allenamento',
      peso: kg, ripetizioni: reps, stato: 'fatta', spotter, peso_corpo: corpo }],
    pesoCorporeo: corpo,
  });
}

test('v432: il 15% inventato non è usato come bonus scientifico', () => {
  assert.equal(CAD_CURL_FATTORE_SOGLIE, 1);
  assert.equal(cad.convenzione, 'per_manubrio');
  assert.equal(normale.convenzione, 'per_manubrio');
  assert.notStrictEqual(stdCad.soglie1RMPerPeso, stdNormale.soglie1RMPerPeso);
  assert.deepEqual(stdCad.soglie1RMPerPeso, stdNormale.soglie1RMPerPeso,
    'il proxy non aggiunge alcuna differenza di forza priva di misure');
  assert.equal(stdCad.fonte, 'proxy_cad_non_validato');
  assert.equal(stdCad.affidabilitaBase, 'bassa');
  assert.match(stdCad.limite, /Nessuno studio disponibile quantifica/);
  assert.match(stdCad.limite, /NON validato/);
});

test('v432: i sette livelli di riferimento sono senza sconti fittizi a ogni peso corporeo', () => {
  for (const corpo of [55, 65, 66, 75, 85, 100]) {
    const rNorm = soglieNormalizzate({ standard:stdNormale, pesoCorporeo:corpo, meccanica:1 });
    const rCad = soglieNormalizzate({ standard:stdCad, pesoCorporeo:corpo, meccanica:1 });
    assert.equal(rCad.length, 7);
    for (let j=0; j<7; j++) {
      assert.ok(Math.abs(rCad[j] - rNorm[j]) < .000001,
        `corpo=${corpo}, soglia=${j}: un coefficiente inventato ha alterato i valori`);
      if(j>0) assert.ok(rCad[j] > rCad[j-1]);
    }
  }
});

test('v432: 200 serie reali non ricevono punti CAD per percentuali non dimostrate', () => {
  for (const corpo of [55,66,75,85,100]) {
    for (const kg of [6,10,14,16,18,20,22,26,30,36]) {
      for (const reps of [5,8,10,12]) {
        const rCad=valuta(cad,kg,reps,corpo);
        const rNorm=valuta(normale,kg,reps,corpo);
        assert.equal(rCad.valido, true);
        assert.equal(rNorm.valido, true);
        assert.ok(Math.abs(rCad.score - rNorm.score) < .000001,
          `il confronto del proxy non deve introdurre un moltiplicatore: ${kg}×${reps}`);
        assert.equal(rCad.rank?.indice ?? -1,rNorm.rank?.indice ?? -1);
        assert.equal(rCad.caricoRegistrato,kg,'sempre peso per UN manubrio');
        assert.equal(rCad.massimale,null,'non derivare il Rank dal 1RM stimato');
      }
    }
  }
});

test('v432: Rank CAD migliora con kg e ripetizioni; altri curl rimangono indipendenti', () => {
  for (const reps of [5,8,10,12]) {
    for (let kg=6;kg<=36;kg+=2) {
      const a=valuta(cad,kg,reps,66),b=valuta(cad,kg+2,reps,66);
      assert.ok(b.score>a.score);
      assert.ok((b.rank?.indice??-1)>=(a.rank?.indice??-1));
    }
  }
  assert.equal(stdCad.riferimentoNome, 'Dumbbell Curl (riferimento provvisorio; non CAD Curl)');
  assert.match(stdCad.nota,/gomiti sul cuscinetto/);
  assert.match(stdCad.nota,/busto arretrato/);
  assert.match(stdCad.nota,/nessun bonus percentuale/i);
  assert.equal(standardAutomaticoPerEsercizio(cad),null,
    'non spacciare i percentili del curl normale per valori osservati sul CAD');
  assert.equal(standardPerMovimento('bicipiti_panca',scottMonobraccio).fonte,'strengthlevel_esercizio');
  assert.equal(standardPerMovimento('bicipiti_panca',ez).vertice,.85);
});

test('v432: mostra studi reali ma afferma che NON quantificano la variante CAD',()=>{
  const rec=valuta(cad,18,8,66);
  assert.equal(rec.valido,true);
  assert.equal(rec.calibrazione.livello,'bassa');
  assert.equal(rec.calibrazione.origine,'CAD Curl: calibrazione scientifica non disponibile');
  assert.match(rec.calibrazione.descrizione,/Scott al contrario/);
  assert.match(rec.calibrazione.descrizione,/nessun bonus percentuale/i);
  assert.match(rec.calibrazione.descrizione,/Nessuno confronta direttamente il CAD Curl/);
  for(const pmid of ['24150552','40082069','42829982']) {
    assert.ok(rec.calibrazione.descrizione.includes(pmid));
  }
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/aggiornaCadCurlSalvato/);
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(sw,/palestra-v432/);
  assert.match(sw,/cad-curl-app\.jpg/);
});
