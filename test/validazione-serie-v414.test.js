import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 testoNumericoAmmesso,numeroCompleto,valutaNumeroInsolito,valutaCampiSerieInsoliti,
} from '../src/validazione-serie.js';
import {montaDom} from './dom-minimo.js';
montaDom();
const {campoNumero,campoTesto}=await import('../src/ui.js');

test('v414: i campi numerici accettano soltanto numeri, virgole e segni',()=>{
 for(const v of ['','+','-','.',',','80','80,5','0.75','-2,5','+30'])
  assert.equal(testoNumericoAmmesso(v),true,v);
 for(const v of ['otto','80kg','8 rep','1e3','12 3','1,2,3','7.3.2','NaN','Infinity'])
  assert.equal(testoNumericoAmmesso(v),false,v);
 assert.equal(numeroCompleto('80,5'),true);
 assert.equal(numeroCompleto('-.5'),true);
 assert.equal(numeroCompleto('-'),false);
 assert.equal(numeroCompleto(','),false);
});

test('v414: le parole digitate o incollate non rimangono nel campo kg',async()=>{
 const salvati=[];
 const kg=campoNumero(80,{etichetta:'kg',onCambio:v=>salvati.push(v)});
 kg.value='80kg';
 await kg.dispatch('input');
 assert.equal(kg.value,'80');
 assert.deepEqual(salvati,[]);
 kg.value='ottanta';
 await kg.dispatch('input');
 assert.equal(kg.value,'80');
 assert.deepEqual(salvati,[]);
 kg.value='80,5';
 await kg.dispatch('input');
 assert.equal(kg.value,'80,5');
 assert.deepEqual(salvati,['80,5']);
 await kg.dispatch('blur');
 assert.equal(kg.value,'80,5');
});

test('v414: tastiera blocca una lettera prima che entri nel campo',async()=>{
 const kg=campoNumero(80);
 kg.selectionStart=2;kg.selectionEnd=2;
 let blocked=false;
 await kg.dispatch('beforeinput',{data:'e',preventDefault(){blocked=true;}});
 assert.equal(blocked,true);
 blocked=false;
 await kg.dispatch('beforeinput',{data:'5',preventDefault(){blocked=true;}});
 assert.equal(blocked,false);
});

test('v414: input spotter e ripetizioni rifiutano le parole; note libere',async()=>{
 const ripetizioni=campoNumero(null,{etichetta:'ripetizioni'});
 ripetizioni.value='dieci';await ripetizioni.dispatch('input');
 assert.equal(ripetizioni.value,'');
 const assistite=campoNumero(2,{etichetta:'ripetizioni assistite'});
 assistite.value='2 spotter';await assistite.dispatch('input');
 assert.equal(assistite.value,'2');
 const note=campoTesto('',{righe:2});
 note.value='80 kg con 2 ripetizioni assistite';
 await note.dispatch('input');
 assert.equal(note.value,'80 kg con 2 ripetizioni assistite');
});

test('v414: input incompleti non cancellano serie e kg validi',async()=>{
 const salvati=[];
 const kg=campoNumero(80,{onCambio:v=>salvati.push(v)});
 kg.value='-';await kg.dispatch('input');
 assert.deepEqual(salvati,[]);
 await kg.dispatch('blur');
 assert.equal(kg.value,'80');
 kg.value='';await kg.dispatch('input');
 assert.deepEqual(salvati,[null]);
});

test('v414: 80 a 800 kg chiede conferma, 80 a 85 no',()=>{
 assert.equal(valutaNumeroInsolito({campo:'peso',valore:800,precedente:80})?.tipo,'da_confermare');
 assert.equal(valutaNumeroInsolito({campo:'peso',valore:'800,5',precedente:80})?.valore,800.5);
 assert.equal(valutaNumeroInsolito({campo:'peso',valore:85,precedente:80}),null);
 assert.equal(valutaNumeroInsolito({campo:'peso',valore:160,precedente:80}),null);
 assert.equal(valutaNumeroInsolito({campo:'peso',valore:800,storico:[75,80,85]})?.tipo,'da_confermare');
 assert.equal(valutaNumeroInsolito({campo:'peso',valore:10,precedente:80})?.tipo,'da_confermare');
 assert.equal(valutaNumeroInsolito({campo:'peso',valore:400})?.tipo,'da_confermare');
});

test('v414: ripetizioni, minuti cardio e assistite controllati separatamente',()=>{
 assert.equal(valutaNumeroInsolito({campo:'ripetizioni',valore:80,precedente:8})?.tipo,'da_confermare');
 assert.equal(valutaNumeroInsolito({campo:'ripetizioni',valore:10,precedente:8}),null);
 assert.equal(valutaNumeroInsolito({campo:'ripetizioni',valore:90,precedente:30,cardio:true}),null);
 assert.equal(valutaNumeroInsolito({campo:'rip_assistite',valore:10,ripetizioni:8})?.tipo,'non_valido');
 assert.equal(valutaNumeroInsolito({campo:'rip_assistite',valore:1,ripetizioni:8}),null);
 assert.equal(valutaNumeroInsolito({campo:'peso_assistenza',valore:-10})?.tipo,'non_valido');
 assert.equal(valutaNumeroInsolito({campo:'peso',valore:'ottanta'})?.tipo,'non_valido');
 assert.equal(valutaNumeroInsolito({campo:'ripetizioni',valore:'8 rep'})?.tipo,'non_valido');
});

test('v414: anche i giri dropset sono protetti, senza falsi allarmi su dati invariati',()=>{
 const s={peso:80,ripetizioni:8,giri_extra:[{peso:60,ripetizioni:8},{peso:50,ripetizioni:7}]};
 const err=valutaCampiSerieInsoliti({giri_extra:[{peso:800,ripetizioni:8},{peso:50,ripetizioni:7}]},s);
 assert.equal(err.length,1);
 assert.match(err[0].messaggio,/giro 2/);
 const normale=valutaCampiSerieInsoliti({giri_extra:[{peso:55,ripetizioni:8},{peso:50,ripetizioni:7}]},s);
 assert.deepEqual(normale,[]);
});

test('v414: UI e salvataggi condividono la protezione, anche con comandi vocali',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
 assert.match(app,/const controlli = valutaCampiSerieInsoliti\(campi, serieAttuale, comparabili/);
 assert.match(app,/const accettato = await chiediConferma\(/);
 assert.match(app,/if\(!salvataConVoce\)throw/);
 assert.match(ui,/if \(!testoNumericoAmmesso\(grezzo\)\)/);
});
