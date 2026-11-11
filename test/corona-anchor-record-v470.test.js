import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calcolaStreak} from '../src/streak.js';
import {progressoCoronaInfinito,statoCoronaInfinito} from '../src/aura-skin.js';

const seduta=data=>({id:'s-'+data,data,stato:'completata',eliminata:false});
const profilo=(data,giorni)=>({id:'account-test',giorni_allenamento:[2,3,5,6],privacy:{
  streak_ancora_confermata:{data,giorni,origine:'rettifica_richiesta_dal_titolare'}
}});

test('v470: streak confermata 18 persa torna 0/80 senza perdere il record',()=>{
  const p=profilo('2026-11-07',18), sedute=[seduta('2026-11-06')];
  const snapshot=JSON.stringify({p,sedute});
  const st=calcolaStreak(sedute,'2026-11-11',p);
  assert.equal(st.giorni,0);
  assert.equal(st.record,18);
  assert.deepEqual(progressoCoronaInfinito(st),{giorni:0,record:18,sbloccata:false,mancanti:80,percentuale:0});
  assert.equal(JSON.stringify({p,sedute}),snapshot);
});
test('v470: il record riconosciuto include i veri giorni prima della perdita',()=>{
  const p=profilo('2026-11-06',18), sedute=[seduta('2026-11-06'),seduta('2026-11-07')];
  assert.equal(calcolaStreak(sedute,'2026-11-09',p).giorni,19);
  const persa=calcolaStreak(sedute,'2026-11-11',p);
  assert.equal(persa.giorni,0);
  assert.equal(persa.record,19);
  assert.equal(progressoCoronaInfinito(persa).mancanti,80);
});
test('v470: un nuovo allenamento riparte 1/80, record 19 conservato',()=>{
  const p=profilo('2026-11-06',18), sedute=[seduta('2026-11-06'),seduta('2026-11-07'),seduta('2026-11-13')];
  const st=calcolaStreak(sedute,'2026-11-13',p);
  assert.equal(st.giorni,1);
  assert.equal(st.record,19);
  assert.equal(progressoCoronaInfinito(st).giorni,1);
});
test('v470: Corona 80 giorni già sbloccata non viene revocata dopo perdita',()=>{
  const p=profilo('2026-11-07',80);
  const st=calcolaStreak([seduta('2026-11-06')],'2026-11-11',p);
  assert.equal(st.giorni,0);assert.equal(st.record,80);
  const c=progressoCoronaInfinito(st);
  assert.equal(c.giorni,0);assert.equal(c.percentuale,0);assert.equal(c.sbloccata,true);
  assert.equal(statoCoronaInfinito({},st.record).equipaggiata,true);
});
test('v470: nessuna rettifica valida non crea record inventati',()=>{
  const st=calcolaStreak([seduta('2026-11-06')],'2026-11-11',{giorni_allenamento:[2,3,5,6]});
  assert.equal(st.giorni,0);assert.equal(st.record,1);
});
test('v470: cache PWA e pagina principale condividono la stessa versione',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(html,/PALESTRA_VERSIONE = 'palestra-v475'/);
  assert.match(html,/app\.js\?v=475/);
  assert.match(sw,/const VERSIONE = 'palestra-v475'/);
});
