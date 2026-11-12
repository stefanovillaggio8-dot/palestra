import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {profiloRipristinabile,profiloUnicoConScheda,scegliProfiloOnline} from '../src/profilo-online.js';
const valido={id:'account-1',username:'Stefano',scheda_id:'scheda-gym-3'};
const vuoto={id:'account-altro',username:'Stefano',scheda_id:null};
test('v464: se esiste un doppione vuoto, recupera la scheda vera indipendentemente dall ordine',()=>{
 for(const r of [[vuoto,valido],[valido,vuoto]]) {
  assert.equal(profiloUnicoConScheda(r),valido);
  assert.equal(scegliProfiloOnline(r),valido);
 }
});
test('v464: account-1 orfano non precede un account-2 valido',()=>{
 assert.equal(scegliProfiloOnline([{id:'account-1',scheda_id:null},{id:'account-2',scheda_id:'scheda-2'}]).id,'account-2');
});
test('v464: profili vuoti e schede non corrispondenti non si ripristinano',()=>{
 assert.equal(scegliProfiloOnline([vuoto]),null);
 assert.equal(profiloRipristinabile({id:'account-abc',scheda_id:'scheda-altro'}),false);
 assert.equal(profiloRipristinabile({id:'account-abc',scheda_id:'scheda-abc'}),true);
});
test('v464: due schede personalizzate richiedono scelta esplicita',()=>{
 const righe=[{id:'account-uno',scheda_id:'scheda-uno'},{id:'account-due',scheda_id:'scheda-due'}];
 assert.equal(scegliProfiloOnline(righe),null);
 assert.equal(profiloUnicoConScheda(righe),null);
});
test('v464: priorita storica di account-1 con due schede vere',()=>{
 assert.equal(scegliProfiloOnline([valido,{id:'account-2',scheda_id:'scheda-2'}]),valido);
});
test('v464: le due vie di recupero usano la verifica delle schede e la PWA la memorizza',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.ok(app.includes('profiloUnicoConScheda(propri)'));
 assert.ok(app.includes('scegliProfiloOnline(profiliServer)'));
 assert.ok(sw.includes('./src/profilo-online.js'));
 assert.ok(sw.includes('palestra-v488'));
});
