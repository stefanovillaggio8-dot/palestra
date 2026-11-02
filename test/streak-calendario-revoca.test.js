import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calcolaStreak, giorniAllenati} from '../src/streak.js';

const r=(id,data,eliminata=false)=>({id,data,stato:'completata',eliminata});
const profilo={
  giorni_allenamento:[1,3,5], // lunedi, mercoledi, venerdi
  privacy:{rettifica_streak:{data:'2026-10-31',giorni:15}},
};
test('la streak ignora accrediti manuali se non presenti nel calendario',()=>{
  const s=calcolaStreak([r('a','2026-10-28'),r('b','2026-10-30'),r('c','2026-11-02')],'2026-11-02',profilo);
  assert.equal(s.giorni,3);
  assert.equal(s.record,3);
  assert.deepEqual(s.giorniAllenati,['2026-11-02','2026-10-30','2026-10-28']);
});
test('eliminare il venerdi spezza la sequenza e il record scende',()=>{
  const base=[r('a','2026-10-28'),r('b','2026-10-30'),r('c','2026-11-02')];
  const prima=calcolaStreak(base,'2026-11-02',profilo);
  const dopo=calcolaStreak(base.map(s=>s.id==='b'?{...s,eliminata:true}:s),'2026-11-02',profilo);
  assert.equal(prima.giorni,3);
  assert.equal(dopo.giorni,1);
  assert.equal(dopo.record,1);
  assert.equal(dopo.giorniAllenati.includes('2026-10-30'),false);
});
test('eliminando tutte le sedute non restano streak o record fantasma',()=>{
  const s=calcolaStreak([r('a','2026-10-28',true),r('b','2026-10-30',true)],'2026-11-02',profilo);
  assert.equal(s.giorni,0);
  assert.equal(s.record,0);
  assert.deepEqual(giorniAllenati([r('x','2026-11-02',true)],'2026-11-02'),[]);
});
test('se una seduta dello stesso giorno resta, il calendario resta verde',()=>{
  const base=[r('a','2026-10-28'),r('b','2026-10-30'),
    r('c','2026-11-02',true),r('d','2026-11-02')];
  const s=calcolaStreak(base,'2026-11-02',profilo);
  assert.equal(s.giorni,3);
});
