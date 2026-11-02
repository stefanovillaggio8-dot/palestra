import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analizzaComandoVocale, supportoComandiVocali, normalizzaDettaturaSerie, scegliTrascrizioneVocale } from '../src/comandi-vocali.js';

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


test('voce: il peso detto due volte come 22 peso 22 chili vale sempre 22',()=>{
 assert.deepEqual(parse('peso 22 chili 7 ripetizioni').campi,{peso:22,ripetizioni:7});
 assert.deepEqual(parse('ripetizioni 7 peso 22').campi,{peso:22,ripetizioni:7});
});
test('voce: non segna la serie per caso nella trascrizione dei dati',()=>{
 const x=parse('serie 2 22 kg sette ripetizioni');
 assert.equal(x.tipo,'dati');
 assert.equal(x.numeroSerie,2);
});

test('voce v411: ordinali prima, seconda, terza e quarta serie',()=>{
 const second=parse('seconda serie 25 chili 8 rep');
 assert.equal(second.tipo,'dati');
 assert.equal(second.numeroSerie,2);
 assert.deepEqual(second.campi,{peso:25,ripetizioni:8});
 assert.equal(parse('serie seconda 20 chili').numeroSerie,2);
 assert.equal(parse('terza serie 25 kg').numeroSerie,3);
 assert.equal(parse('quarta serie, 25 chili, 8 ripetizioni').numeroSerie,4);
 assert.equal(parse('quinta serie 20 chili').ok,false);
});
test('voce v411: chili e mezzo prima o dopo l unita',()=>{
 for (const frase of [
  'seconda serie 25 chili e mezzo 8 rip',
  'seconda serie 25 e mezzo chili 8 rep',
  'serie 2 venticinque chili e mezzo otto ripetizioni',
  'serie 2 25,5 kg 8 reps',
  'serie 2 25.5 kg 8 rip.'
 ]) {
  const p=parse(frase);
  assert.equal(p.numeroSerie,2,frase);
  assert.deepEqual(p.campi,{peso:25.5,ripetizioni:8},frase);
 }
});
test('voce v411: fatto e fatta segnano la serie, anche da soli',()=>{
 for(const s of ['fatto','fatta','segna serie','segna la seconda serie',
   'seconda serie 25 chili e mezzo 8 rep fatta']){
  assert.equal(parse(s).tipo,'completa_serie',s);
 }
 const completa=parse('seconda serie 25 chili e mezzo 8 rep fatta con spotter');
 assert.equal(completa.numeroSerie,2);
 assert.deepEqual(completa.campi,{peso:25.5,ripetizioni:8,spotter:true,rip_assistite:1});
 assert.equal(parse('serie 2 25 chili 8 rep').tipo,'dati');
 assert.equal(parse('serie 2 non fatta').ok,false);
});
test('voce v411: spotter e ripetizioni assistite preservano il carico',()=>{
 assert.deepEqual(parse('spotter').campi,{spotter:true,rip_assistite:1});
 assert.deepEqual(parse('senza spotter').campi,{spotter:false});
 const p=parse('seconda serie 25 chili 8 rep 2 assistite con spotter');
 assert.deepEqual(p.campi,{peso:25,ripetizioni:8,spotter:true,rip_assistite:2});
 assert.equal(parse('8 rep 9 assistite con spotter').ok,false);
 assert.equal(parse('30 minuti con spotter',{cardio:true}).ok,false);
});
test('voce v411: richiede ancora la conferma della UI e recupero da ogni spunta',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/comandi-vocali-ui.js',import.meta.url),'utf8');
 assert.match(ui,/const conferma=bottone\('Conferma'/);
 assert.match(ui,/await suConferma\(p,target\)/);
 assert.match(app,/function impostaRecuperoSerie\(sedutaId, avvia\)/);
 assert.match(app,/impostaRecuperoSerie\(serie\.seduta_id, fatta\)/);
 assert.match(app,/impostaRecuperoSerie\(seduta\.id,true\)/);
 assert.match(app, /await aggiornaSerie\(target,\{\.\.\.campi,stato:'fatta'\}\)/);
});

test('voce v412: 8 euro/euri equivale a 8 rep nel contesto di una serie',()=>{
 for(const parola of ['8 euro','otto euro','8 euri','8 euros']){
  const p=parse(parola);
  assert.equal(p.ok,true,parola);
  assert.equal(p.tipo,'dati',parola);
  assert.deepEqual(p.campi,{ripetizioni:8},parola);
  assert.equal(normalizzaDettaturaSerie(parola),'8 ripetizioni');
 }
 assert.deepEqual(parse('seconda serie 25 chili e mezzo 8 euro').campi,
  {peso:25.5,ripetizioni:8});
 assert.deepEqual(parse('seconda serie, 25 chili e mezzo, otto euri, fatta con spotter').campi,
  {peso:25.5,ripetizioni:8,spotter:true,rip_assistite:1});
 assert.equal(parse('8 euro').tipo,'dati'); // Non spunta per sbaglio.
});
test('voce v412: nessuna conversione da euro a minuti nel cardio',()=>{
 assert.equal(parse('8 euro',{cardio:true}).ok,false);
 assert.deepEqual(parse('8 minuti',{cardio:true}).campi,{ripetizioni:8});
 assert.equal(normalizzaDettaturaSerie('8 euro',{cardio:true}),'8 euro');
});
test('voce v412: sceglie la variante rep solo se gli stessi dati coincidono',()=>{
 const opts={maxSerie:4};
 assert.equal(scegliTrascrizioneVocale([
  'seconda serie 25 chili 8 euro','seconda serie 25 chili 8 rep'
 ],opts),'seconda serie 25 chili 8 rep');
 assert.equal(scegliTrascrizioneVocale([
  'seconda serie 25 chili 8 euro','seconda serie 25 chili 9 rep'
 ],opts),'seconda serie 25 chili 8 euro');
 assert.equal(scegliTrascrizioneVocale(['rumore','8 ripetizioni'],opts),'8 ripetizioni');
 assert.equal(scegliTrascrizioneVocale([] ,opts),'');
 const ui=readFileSync(new URL('../src/comandi-vocali-ui.js',import.meta.url),'utf8');
 assert.match(ui,/maxAlternatives=5/);
 assert.match(ui,/scegliTrascrizioneVocale\(alternative/);
 assert.match(ui,/normalizzaDettaturaSerie\(trascrizione/);
 assert.match(ui,/await suConferma\(p,target\)/);
});

test('voce v412: con lo spotter senza numero equivale a una rip assistita',()=>{
 for(const comando of [
   '37 chili 7 ripetizioni con lo spotter',
   '37 chili 7 rep con lo spotter',
   '37 chili 7 euro con lo spotter'
 ]) {
   const p=parse(comando);
   assert.equal(p.ok,true,comando);
   assert.deepEqual(p.campi,{peso:37,ripetizioni:7,spotter:true,rip_assistite:1},comando);
 }
 assert.deepEqual(parse('37 chili 7 rep 2 assistite con spotter').campi,
   {peso:37,ripetizioni:7,spotter:true,rip_assistite:2});
 assert.deepEqual(parse('7 rep 0 assistite con spotter').campi,
   {ripetizioni:7,spotter:true,rip_assistite:0});
 assert.deepEqual(parse('37 chili 7 rep senza spotter').campi,
   {peso:37,ripetizioni:7,spotter:false});
 assert.equal(parse('37 chili 0 rip con spotter').ok,false);
 assert.deepEqual(parse('con lo spotter').campi,{spotter:true,rip_assistite:1});
});
