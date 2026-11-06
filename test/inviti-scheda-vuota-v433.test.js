import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GIORNI, SCHEDA_ID, costruisciSnapshot, personaDaNome, personaDaMemoria, chiSei } from '../src/dati-iniziali.js';
import { creaSchedaVuotaNuovoAmico, aggiungiGiornoVuoto, rimuoviGiornoBozza } from '../src/giorni-scheda.js';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('v433: nuovo invitato vede esclusivamente giorno 1,2,3,4 completamente vuoti', () => {
  const amico = personaDaNome('Luca', 'luca01');
  const scheda = creaSchedaVuotaNuovoAmico(amico.schedaId, amico.nomeScheda);
  assert.equal(scheda.scheda_id, 'scheda-luca01');
  assert.equal(scheda.nome, 'Palestra di Luca');
  assert.equal(scheda.giorni.length, 4);
  scheda.giorni.forEach((g, i) => {
    assert.equal(g.nome, 'giorno ' + (i + 1));
    assert.equal(g.ordine, i + 1);
    assert.equal(g.id, 'giorno-' + amico.schedaId + '-' + (i + 1));
    assert.deepEqual(g.esercizi, []);
    assert.equal(Object.hasOwn(g, 'serie'), false);
    assert.equal(Object.hasOwn(g, 'peso'), false);
  });
  const serialized = JSON.stringify(scheda);
  assert.doesNotMatch(serialized, /ex-chest-press|ex-scott-bench-curl|es-1-1|"peso"|"ripetizioni"|"nota"/);
  assert.deepEqual(JSON.parse(serialized), scheda);
});

test('v433: due amici non condividono neppure gli ID dei giorni o i dati', () => {
  const a = creaSchedaVuotaNuovoAmico('scheda-anna001', 'Palestra di Anna');
  const b = creaSchedaVuotaNuovoAmico('scheda-marco02', 'Palestra di Marco');
  assert.notEqual(a.scheda_id, b.scheda_id);
  assert.equal(new Set([...a.giorni, ...b.giorni].map(g => g.id)).size, 8);
  a.giorni[0].esercizi.push({ id:'esempio', esercizio_id:'ex-chest-press', serie:[{peso:25}] });
  assert.equal(b.giorni[0].esercizi.length, 0);
  assert.equal(a.giorni[1].esercizi.length, 0);
});

test('v433: la scheda di Stefano resta completa, senza migrazioni distruttive', () => {
  const prima = costruisciSnapshot();
  const nomi = prima.giorni.map(g => g.nome);
  assert.equal(prima.scheda_id, SCHEDA_ID);
  assert.equal(prima.giorni.length, 4);
  assert.deepEqual(prima.giorni.map(g => g.esercizi.length), [6, 6, 7, 3]);
  const origin = JSON.stringify(prima);
  const nuova = creaSchedaVuotaNuovoAmico('scheda-guest1', 'Ospite');
  rimuoviGiornoBozza(nuova, nuova.giorni[0].id);
  assert.equal(JSON.stringify(costruisciSnapshot()), origin);
  assert.deepEqual(GIORNI.map(g => g.nome), nomi);
});

test('v433: la nuova scheda è collegata all identità generata dal link', () => {
  const persona = personaDaNome('Diego', 'df738a12');
  assert.equal(persona.creata,true);
  const daLink = chiSei({ ricerca:'?n=Diego&k=df738a12&inv=token-123', memoria:null, schede:[] });
  assert.equal(daLink.daChiedere,false);
  assert.equal(daLink.persona.schedaId,persona.schedaId);
  assert.equal(personaDaMemoria(daLink.memoria).schedaId, persona.schedaId);
  assert.equal(creaSchedaVuotaNuovoAmico(daLink.persona.schedaId).giorni.length,4);
});

test('v433: un nuovo giorno è vuoto e usa un ID distinto', () => {
  const bozza = creaSchedaVuotaNuovoAmico('scheda-c7', 'Palestra di Marco');
  const quinto = aggiungiGiornoVuoto(bozza,'giorno-custom-5');
  assert.equal(quinto.nome, 'giorno 5');
  assert.equal(quinto.ordine, 5);
  assert.deepEqual(quinto.esercizi, []);
  assert.equal(bozza.giorni.length, 5);
  assert.throws(() => aggiungiGiornoVuoto(bozza,'giorno-custom-5'), /ID giorno/);
  const sesto = aggiungiGiornoVuoto(bozza,'giorno-custom-6');
  assert.equal(sesto.nome, 'giorno 6');
  assert.equal(new Set(bozza.giorni.map(g=>g.id)).size, 6);
});

test('v433: togliere un giorno non cancella lo storico e non lascia ordini sballati', () => {
  const storico = creaSchedaVuotaNuovoAmico('scheda-uno', 'Palestra');
  const bozza = structuredClone(storico);
  bozza.giorni[1].esercizi.push({id:'es-già-esistente',esercizio_id:'ex-cable-fly',
    serie:[{peso:20,ripetizioni:8}]});
  assert.equal(rimuoviGiornoBozza(bozza,bozza.giorni[1].id),true);
  assert.deepEqual(bozza.giorni.map(g=>g.ordine),[1,2,3]);
  assert.deepEqual(bozza.giorni.map(g=>g.nome),['giorno 1','giorno 3','giorno 4']);
  assert.equal(rimuoviGiornoBozza(bozza,'inesistente'),false);
  assert.equal(storico.giorni.length,4);
  assert.deepEqual(storico.giorni[1].esercizi,[]);
  const salvata=JSON.parse(JSON.stringify(bozza));
  assert.equal(salvata.giorni.length,3);
  assert.deepEqual(salvata.giorni[1].esercizi,[]);
});

test('v433: si possono togliere tutti i giorni e aggiungerne uno senza dati', () => {
  const bozza = creaSchedaVuotaNuovoAmico('scheda-ricomincio');
  for (const id of bozza.giorni.map(g=>g.id)) {
    assert.equal(rimuoviGiornoBozza(bozza,id),true);
  }
  assert.deepEqual(bozza.giorni,[]);
  const primo=aggiungiGiornoVuoto(bozza,'giorno-ripristinato');
  assert.equal(primo.nome,'giorno 1');
  assert.deepEqual(primo.esercizi,[]);
});

test('v433: l app semina giorni vuoti soltanto per i nuovi profili', () => {
  const i=app.indexOf('async function seminaPersona()');
  const j=app.indexOf('async function seminaProfilo(',i);
  const semina=app.slice(i,j);
  assert.ok(i>0 && j>i);
  assert.match(semina,/if \(gia\) \{[\s\S]*?return;/);
  assert.match(semina,/snapshot: p\.creata\s*\?\s*creaSchedaVuotaNuovoAmico\(p\.schedaId, p\.nomeScheda\)\s*:\s*costruisciSnapshot\(\{ conSerie: true \}\)/);
  assert.match(semina,/scheda_id: p\.schedaId/);
  assert.doesNotMatch(semina,/db\.cestino|db\.elimina|delete |clear\(/);
});

test('v433: UI gestisce tutti i giorni e non avvia sedute vuote', () => {
  assert.match(app,/function vistaScheda\(zona\)/);
  assert.match(app,/rimuoviGiornoBozza\(bozza, g\.id\)/);
  assert.match(app,/aggiungiGiornoVuoto\(bozza, 'giorno-' \+ nuovoId\(\)\)/);
  assert.match(app,/\+ Aggiungi giorno/);
  assert.match(app,/Rimuovi giorno/);
  assert.match(app,/Giorno vuoto: aggiungi i tuoi esercizi/);
  assert.match(app,/\(g\.esercizi \|\| \[\]\)\.length\s*\?\s*bottone\('Inizia allenamento'/);
  assert.match(app,/Aggiungi esercizi a questo giorno/);
  assert.match(app,/Non ci sono giorni nella scheda/);
  assert.match(app,/Salva come nuova versione/);
  assert.match(app,/Le sedute che hai gia/);
});

test('v433: modulo disponibile offline e versione PWA aggiornata',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(sw,/'\.\/src\/giorni-scheda\.js'/);
  const versione=sw.match(/const VERSIONE = 'palestra-v(\d+)'/)?.[1];
  assert.ok(versione);
  assert.match(html,new RegExp("palestra-v" + versione));
  assert.match(html,new RegExp("stile.css\\?v=" + versione));
});
