import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nomeTipoConflitto,campoPresentabile,differenzeConflitto,
  descriviConflitto,nomeCampoConflitto,valoreConflitto} from '../src/conflitti-compatti.js';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../stile.css',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('v416: il riepilogo elenca soltanto le modifiche effettivamente diverse',()=>{
 const conflitto={
  tabella:'serie',riga_id:'uuid-molto-lungo',locale:{
    id:'abc',account_id:'userA',rev:2,updated_at:'123',peso:37,ripetizioni:8,spotter:false,
  },remoto:{
    id:'abc',account_id:'userA',rev:3,updated_at:'456',peso:35,ripetizioni:8,spotter:true,
  }
 };
 assert.equal(nomeTipoConflitto(conflitto.tabella),'Serie');
 assert.deepEqual(differenzeConflitto(conflitto),['peso','spotter']);
 const d=descriviConflitto(conflitto);
 assert.match(d.titolo,/Serie · 2 differenze/);
 assert.match(d.sintesi,/Peso \(kg\)/);
 assert.match(d.sintesi,/Spotter/);
 assert.doesNotMatch(JSON.stringify(d),/uuid-molto-lungo|userA|account_id|updated_at/);
});
test('v416: l’interfaccia non mostra i metadati o le chiavi riservate',()=>{
 for(const k of ['id','account_id','device_id','rev','sync','ultimo_errore',
    'access_token','refresh_token','password','email','credenziali_auth','private_id']){
  assert.equal(campoPresentabile(k),false,k);
 }
 assert.equal(campoPresentabile('peso'),true);
 assert.equal(nomeCampoConflitto('rip_assistite'),'Ripetizioni assistite');
 assert.equal(valoreConflitto(false),'No');
 assert.equal(valoreConflitto(0),'0');
 assert.equal(valoreConflitto([1,2,3]),'3 elementi');
 assert.equal(valoreConflitto({a:1,b:2}),'2 dettagli');
 assert.equal(valoreConflitto('x'.repeat(900)).length,140);
});
test('v416: nessuna differenza visibile non autorizza una scelta automatica',()=>{
 const c={tabella:'schede',locale:{id:'X',rev:2},remoto:{id:'X',rev:3}};
 assert.deepEqual(differenzeConflitto(c),[]);
 assert.match(descriviConflitto(c).sintesi,/sembrano uguali/);
});
test('v416: i conflitti si aprono soltanto a richiesta e caricano 5 per volta',()=>{
 assert.match(app,/const conflittiBox = el\('details', \{class:'blocco blocco-chiuso conflitti-compatti'\}\)/);
 assert.match(app,/if\(!conflittiBox\.open\|\|popolato\)return/);
 assert.match(app,/const fino=Math\.min\(conflitti\.length,mostrati\+5\)/);
 assert.match(app,/const item = el\('details',\{class:'conflitto-voce'\}\)/);
 assert.match(app,/if\(!item\.open\|\|creato\)return/);
 assert.match(app,/Mostra altri 5/);
 assert.match(app,/class:'conflitto-campo-dettagli'/);
 assert.match(app,/if\(!dettagli\.open\|\|pronto\)return/);
 assert.match(css,/max-height:210px/);
 assert.doesNotMatch(app,/bottone\('Teni questa'/);
});
test('v416: la scelta resta esplicita, nessun dato cambia aprendo la sezione',()=>{
 assert.match(app,/const ok=await chiediConferma\(/);
 assert.match(app,/if\(!ok\)return;\s*occupato=true/);
 assert.match(app,/await sync\.risolvi\(c\.id,lato\)/);
 assert.match(app,/Questo dispositivo/);
 assert.match(app,/Altro dispositivo \/ online/);
});
test('v416: stile leggibile su iPhone, versione nuova e asset disponibili offline',()=>{
 assert.match(css,/\.conflitti-intestazione/);
 assert.match(css,/\.conflitti-campo/);
 assert.match(css,/@media\(max-width:440px\)/);
 assert.match(sw,/\.\/src\/conflitti-compatti\.js/);
 assert.match(sw,/const VERSIONE = 'palestra-v\d+'/);
});
