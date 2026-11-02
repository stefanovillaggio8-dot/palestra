import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaStreak, giorniAllenati, giorniStreakAccreditati } from '../src/streak.js';

const data='2026-11-02';
const profilo = {
  giorni_allenamento:[2,3,5,6],
  privacy:{rettifica_streak:{
    data:'2026-10-31',giorni:15,origine:'rettifica_richiesta_dal_titolare',
    nota:'Accredito della streak del 31 ottobre, senza creare una seduta o delle serie',
  }},
};
const r = (id,giorno,eliminata=false)=>({id,data:giorno,stato:'completata',eliminata});
const sedute=[r('a','2026-10-28'),r('b','2026-10-30'),r('c','2026-11-02')];

test('31 ottobre: usa il credito gia salvato online come UNA giornata valida',()=>{
  const s=calcolaStreak(sedute,data,profilo);
  assert.deepEqual(s.giorniAccreditati,['2026-10-31']);
  assert.deepEqual(s.giorniAllenati,['2026-11-02','2026-10-31','2026-10-30','2026-10-28']);
  assert.equal(s.giorni,4);
  assert.equal(giorniAllenati(sedute,data).includes('2026-10-31'),false,'nessuna seduta fittizia');
});
test('15 della rettifica non e una streak inventata: il 27 mancante spezza la catena',()=>{
  const conBuchi=[r('old','2026-10-24'),...sedute];
  const s=calcolaStreak(conBuchi,data,profilo);
  assert.equal(s.giorni,4);
  assert.ok(s.record < 15);
});
test('eliminare il 30 ottobre riduce streak anche con il 31 accreditato',()=>{
  const s=calcolaStreak(sedute.map(x=>x.id==='b'?{...x,eliminata:true}:x),data,profilo);
  assert.equal(s.giorni,2);
  assert.ok(s.giorniAllenati.includes('2026-10-31'));
  assert.ok(!s.giorniAllenati.includes('2026-10-30'));
});
test('giorno accreditato non si conta due volte quando esiste anche una seduta vera',()=>{
  const s=calcolaStreak([...sedute,r('four','2026-10-31')],data,profilo);
  assert.equal(s.giorniAllenati.filter(d=>d==='2026-10-31').length,1);
});
test('il credito resta specifico del profilo e non cambia la streak degli amici',()=>{
  const altro={giorni_allenamento:[2,3,5,6],privacy:{}};
  const s=calcolaStreak(sedute,data,altro);
  assert.equal(s.giorni,1);
  assert.deepEqual(giorniStreakAccreditati(altro,data),[]);
});
test('date invalide, future o manipolate non vengono accreditate',()=>{
  const original=JSON.parse(JSON.stringify(profilo));
  const invalid={privacy:{giorni_streak_accreditati:['2026-02-30','2026-12-01','2026-10-31','2026-10-31'] }};
  assert.deepEqual(giorniStreakAccreditati(invalid,data),['2026-10-31']);
  assert.deepEqual(profilo,original,'non muta il profilo');
  assert.deepEqual(giorniStreakAccreditati(profilo,'2026-10-30'),[]);
});
