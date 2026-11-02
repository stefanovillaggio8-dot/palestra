import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {CAMPI_REGOLAZIONI,idRegolazioni,leggiRegolazioni,pulisciRegolazioni,recordRegolazioni,riepilogoRegolazioni} from '../src/regolazioni-macchina.js';
import {riassuntoFinaleAllenamento,messaggioFinaleAllenamento} from '../src/finale-allenamento.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Regolazioni diverse per persona ed esercizio; le note sono nella tabella esistente',()=>{
 const a=idRegolazioni('account-1','ex-chest-press');
 const b=idRegolazioni('account-2','ex-chest-press');
 const c=idRegolazioni('account-1','ex-leg-extension');
 assert.notEqual(a,b);assert.notEqual(a,c);assert.match(a,/nota-regolazioni-v397/);
 const r=recordRegolazioni('account-1','ex-chest-press',{sedile:'4',presa:'Neutra',cavo:'12'});
 assert.equal(r.livello,'regolazioni_macchina');
 assert.equal(r.esercizio_id,'ex-chest-press');
 assert.deepEqual(leggiRegolazioni(r).sedile,'4');
 assert.deepEqual(leggiRegolazioni(r).cavo,'12');
 assert.equal(Object.keys(leggiRegolazioni(r)).length,CAMPI_REGOLAZIONI.length);
 assert.ok(!('peso' in r)&&!('peso_assistenza' in r)&&!('soglie_rank' in r));
});
test('Le regolazioni sono sanificate; note malformate non bloccano',()=>{
 assert.equal(pulisciRegolazioni({sedile:'   4 '}).sedile,'4');
 assert.equal(pulisciRegolazioni({presa:'x'.repeat(800)}).presa.length,280);
 assert.equal(leggiRegolazioni({testo:'non-json'}).sedile,'');
 assert.match(riepilogoRegolazioni({sedile:'4',presa:'neutra'}),/Sedile.*4.*Impugnatura.*neutra/);
 assert.equal(riepilogoRegolazioni({}),'');
});
const map=(x)=>new Map(Object.entries(x));
const seduta={id:'sess1',nome_giorno:'Giorno 2',durata_secondi:3750};
const serie=[
 {id:'a',seduta_id:'sess1',esercizio_id:'chest',stato:'fatta'},
 {id:'b',seduta_id:'sess1',esercizio_id:'chest',stato:'fatta'},
 {id:'c',seduta_id:'sess1',esercizio_id:'lat',stato:'fatta'},
 {id:'d',seduta_id:'sess1',esercizio_id:'lat',stato:'da_fare'},
 {id:'e',seduta_id:'old',esercizio_id:'other',stato:'fatta'},
 {id:'f',seduta_id:'sess1',esercizio_id:'dip',stato:'fatta',eliminata:true},
];
test('Finale conta solo serie completate e premi autentici di questa seduta',()=>{
 const r=riassuntoFinaleAllenamento({
   seduta,serie,premi:[{aura:40,xp:80},{aura:7,xp:10}],
   prima:map({chest:{indice:3,punteggio:100},lat:{indice:2,punteggio:40}}),
   dopo:map({chest:{indice:4,punteggio:115},lat:{indice:2,punteggio:42}}),
 });
 assert.equal(r.serie,3);assert.equal(r.esercizi,2);assert.equal(r.minuti,63);
 assert.equal(r.rank,1);assert.equal(r.record,1);assert.equal(r.primi,0);
 assert.equal(r.aura,47);assert.equal(r.xp,90);
 assert.match(messaggioFinaleAllenamento(r),/rank/);
});
test('Nessuna ricompensa inventata se sessione senza premi o rank',()=>{
 const r=riassuntoFinaleAllenamento({seduta,serie,premi:[],prima:map({chest:{indice:2,punteggio:10},lat:{indice:1,punteggio:5}}),
 dopo:map({chest:{indice:2,punteggio:10},lat:{indice:1,punteggio:5}})});
 assert.equal(r.aura,0);assert.equal(r.xp,0);assert.equal(r.record,0);
 assert.match(messaggioFinaleAllenamento(r),/Allenamento completato/);
});
test('Il primo livello non viene spacciato per record migliorato',()=>{
 const r=riassuntoFinaleAllenamento({seduta,serie,prima:new Map(),
 dopo:map({chest:{indice:0,punteggio:8},lat:{indice:1,punteggio:11}})});
 assert.equal(r.primi,2);assert.equal(r.record,0);assert.equal(r.rank,0);
});
test('UI: le impostazioni sono raggiungibili dal giorno e durante la seduta',()=>{
 const app=read('src/app.js');
 assert.match(app,/function modificaRegolazioni\(e\)/);
 assert.match(app,/Regolazioni macchina/);
 assert.match(app,/bottone\('⚙ Regolazioni'/);
 assert.match(app,/idRegolazioni\(accountAttivo\(\),e.id\)/);
 assert.match(read('src/regolazioni-ui.js'),/db\.salva\('note'/);
 assert.match(read('src/regolazioni-ui.js'),/onSalvato\(r\)/);
 assert.doesNotMatch(read('src/regolazioni-ui.js'),/svuotaTutto|cestino\('serie'\)/);
});
test('UI: fine allenamento salva prima e mostra la scena solo dopo l eventuale aggiornamento',()=>{
 const app=read('src/app.js');
 const a=app.indexOf('async function finisceAllenamento('),b=app.indexOf('\n/**',a+20);
 const finish=app.slice(a,b);
 assert.ok(finish.indexOf("db.salva('sedute'")<finish.indexOf('mostraFinaleCinematico'));
 assert.ok(finish.indexOf('await proponiAggiornamentoScheda')<finish.indexOf('mostraFinaleCinematico'));
 assert.match(finish,/const premiAllenamento = await assegnaRicompense/);
 assert.match(finish,/riassuntoFinaleAllenamento/);
 assert.match(read('src/finale-allenamento-ui.js'),/Salta/);
 assert.match(read('src/finale-allenamento-ui.js'),/Escape/);
 const css=read('stile-premium.css');
 assert.match(css,/@media\(prefers-reduced-motion:no-preference\)/);
 assert.match(css,/finale-cine-personaggio/);
});
