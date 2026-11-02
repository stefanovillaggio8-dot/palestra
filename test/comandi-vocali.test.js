import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizzaComandoVocale, supportoComandiVocali } from '../src/comandi-vocali.js';

const parse=(s,options={maxSerie:4})=>analizzaComandoVocale(s,options);
test('voce: numeri semplici 22 kg e 7 ripetizioni',()=>{
 assert.deepEqual(parse('22 chili 7 ripetizioni').campi,{peso:22,ripetizioni:7});
 assert.deepEqual(parse('ventidue chili sette ripetizioni').campi,{peso:22,ripetizioni:7});
 assert.deepEqual(parse('22 kg e 7 reps').campi,{peso:22,ripetizioni:7});
});
test('voce: decimali e ripetizioni espresse in italiano',()=>{
 assert.deepEqual(parse('ventidue virgola cinque chili sette rip').campi,{peso:22.5,ripetizioni:7});
 assert.deepEqual(parse('22,5 kg 7 rip').campi,{peso:22.5,ripetizioni:7});
 assert.deepEqual(parse('quarantotto chili otto ripetizioni').campi,{peso:48,ripetizioni:8});
});
test('voce: numero di serie non influenza il carico',()=>{
 const p=parse('serie due ventidue chili e sette ripetizioni');
 assert.equal(p.numeroSerie,2);
 assert.deepEqual(p.campi,{peso:22,ripetizioni:7});
});
test('voce: carico e rip separati, in ordine inverso',()=>{
 assert.deepEqual(parse('7 ripetizioni 22 chili').campi,{peso:22,ripetizioni:7});
 assert.deepEqual(parse('ripetizioni 7 peso 22').campi,{peso:22,ripetizioni:7});
});
test('voce: recupero ha comandi espliciti',()=>{
 assert.equal(parse('avvia recupero').tipo,'recupero_avvia');
 assert.equal(parse('ferma il recupero').tipo,'recupero_stop');
 assert.equal(parse('recupero').ok,false);
});
test('voce: serie fatta solo dietro comando chiaro',()=>{
 const p=parse('segna serie due');
 assert.equal(p.tipo,'completa_serie');
 assert.equal(p.numeroSerie,2);
 assert.equal(parse('serie due 22 chili').tipo,'dati');
});
test('voce: cardio usa i minuti senza peso',()=>{
 assert.deepEqual(parse('trenta minuti',{cardio:true,maxSerie:2}).campi,{ripetizioni:30});
 assert.equal(parse('22 chili sette ripetizioni',{cardio:true,maxSerie:2}).ok,false);
});
test('voce: non inventa informazioni su frasi ambigue',()=>{
 assert.equal(parse('ventidue sette').ok,false);
 assert.equal(parse('ciao come va').ok,false);
 assert.equal(parse('').ok,false);
 assert.equal(parse('22 chili 25 chili').ok,false);
});
test('voce: numeri e serie fuori limiti bloccati',()=>{
 assert.equal(parse('serie cinque 22 chili 7 rip').ok,false);
 assert.equal(parse('800 chili 7 ripetizioni').ok,false);
 assert.equal(parse('20 chili 300 ripetizioni').ok,false);
});
test('voce: microfono rilevato senza accessi forzati',()=>{
 assert.equal(supportoComandiVocali({}).disponibile,false);
 class MockRecognition{}
 assert.equal(supportoComandiVocali({webkitSpeechRecognition:MockRecognition}).disponibile,true);
});
