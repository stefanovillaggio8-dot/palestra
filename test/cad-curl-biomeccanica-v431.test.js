import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { movimentoDi, valutaPrestazione } from '../src/rank-v3/valutazione.js';
import { CAD_CURL_FATTORE_SOGLIE, standardPerMovimento, soglieNormalizzate } from '../src/rank-v3/modello.js';
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
    serie: [{ id: 'serie-vera', esercizio_id:ex.id, seduta_id:'allenamento',
      peso:kg, ripetizioni:reps, stato:'fatta', spotter, peso_corpo:corpo }],
    pesoCorporeo: corpo,
  });
}

test('v431: il CAD ha un 15% in meno sulle soglie, NON sui pesi eseguiti', () => {
  assert.equal(CAD_CURL_FATTORE_SOGLIE, 0.85);
  assert.equal(cad.convenzione, 'per_manubrio');
  assert.equal(normale.convenzione, 'per_manubrio');
  assert.equal(stdCad.soglie1RMPerPeso.length, stdNormale.soglie1RMPerPeso.length);
  for (let i=0; i<stdCad.soglie1RMPerPeso.length; i++) {
    const cadR = stdCad.soglie1RMPerPeso[i];
    const normaleR = stdNormale.soglie1RMPerPeso[i];
    assert.equal(cadR[0], normaleR[0]);
    for (let j=1; j<6; j++) {
      assert.ok(Math.abs(cadR[j] - normaleR[j] * 0.85) < .002,
        `peso ${cadR[0]}, percentile ${j}: ${cadR[j]} non 0.85 × ${normaleR[j]}`);
    }
  }
});

test('v431: in qualsiasi peso corporeo tutti i sette gradini CAD sono più bassi', () => {
  for (const corpo of [55,65,66,75,85,100]) {
    const sNormale = soglieNormalizzate({standard:stdNormale,pesoCorporeo:corpo,meccanica:1});
    const sCad = soglieNormalizzate({standard:stdCad,pesoCorporeo:corpo,meccanica:1});
    assert.equal(sCad.length,7);
    for (let j=0; j<7; j++) {
      assert.ok(sCad[j] < sNormale[j],
        `a ${corpo} kg CAD soglia ${j} deve essere inferiore del curl normale`);
      const ratio=sCad[j]/sNormale[j];
      // A soglie molto piccole il Rank arrotonda ai centesimi:
      // lo scostamento relativo puo' essere >0,3% senza alterare la scala.
      assert.ok(Math.abs(ratio - .85) < .025, `corpo=${corpo} soglia=${j} rapporto=${ratio}`);
      if(j>0) assert.ok(sCad[j] > sCad[j-1], 'le soglie restano strettamente crescenti');
    }
  }
});

test('v431: stessi kg per mano e ripetizioni: CAD non prende MAI un Rank inferiore', () => {
  for (const corpo of [55,66,75,85,100]) {
    for (const kg of [6,10,14,16,18,20,22,26,30,36]) {
      for (const reps of [5,8,10,12]) {
        const rCad=valuta(cad,kg,reps,corpo);
        const rNormale=valuta(normale,kg,reps,corpo);
        assert.equal(rCad.valido,true);
        assert.equal(rNormale.valido,true);
        const indiceCad = rCad.rank?.indice ?? -1;
        const indiceNormale = rNormale.rank?.indice ?? -1;
        assert.ok(indiceCad >= indiceNormale,
          `${corpo}kg corp, ${kg}kg×${reps}: CAD ${indiceCad} vs normale ${indiceNormale}`);
        assert.equal(rCad.caricoRegistrato,kg,'non trasformare i manubri in totale a due mani');
        assert.equal(rCad.massimale,null,'non inventare il massimale dell atleta');
      }
    }
  }
});

test('v431: il coefficiente non si accumula con bonus meccanici e tiene la scala monotona', () => {
  for (const reps of [5,8,10,12]) {
    for (let kg=6; kg<=36; kg+=2) {
      const a=valuta(cad,kg,reps,66), b=valuta(cad,kg+2,reps,66);
      assert.ok(b.score>a.score, `più kg danno maggiore score a ${reps} reps`);
      assert.ok(b.rank.indice>=a.rank.indice);
    }
  }
  assert.equal(stdCad.fonte,'modello_tecnica_cad_curl');
  assert.equal(stdCad.affidabilitaBase,'bassa');
  assert.equal(stdCad.riferimentoNome,'CAD Curl (stima a partire dal Dumbbell Curl)');
  assert.match(stdCad.nota,/gomiti fermi sul cuscinetto/);
  assert.match(stdCad.nota,/busto arretrato/);
  assert.match(stdCad.limite,/non uno standard misurato/);
  const fonte=standardAutomaticoPerEsercizio(cad);
  assert.equal(fonte,null,'non spacciare dati del curl normale per percentili misurati sul CAD');
  assert.equal(standardPerMovimento('bicipiti_panca',scottMonobraccio).fonte,'strengthlevel_esercizio');
  assert.equal(standardPerMovimento('bicipiti_panca',ez).vertice,.85);
});

test('v431: il Rank mostra chiaramente tecnica, coefficiente e affidabilità limitata',()=>{
  const cadRecord=valuta(cad,18,8,66);
  assert.equal(cadRecord.valido,true);
  assert.equal(cadRecord.calibrazione.livello,'bassa');
  assert.equal(cadRecord.calibrazione.origine,'Stima tecnica specifica CAD Curl');
  assert.match(cadRecord.calibrazione.descrizione,/gomiti fissi/);
  assert.match(cadRecord.calibrazione.descrizione,/15%/);
  assert.match(cadRecord.calibrazione.descrizione,/nessuno studio/);
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/aggiornaCadCurlSalvato/);
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(sw,/palestra-v431/);
  assert.match(sw,/cad-curl-app\.jpg/);
});
