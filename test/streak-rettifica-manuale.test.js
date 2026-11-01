import test from 'node:test';
import assert from 'node:assert/strict';
import {calcolaStreak} from '../src/streak.js';
const data=(...dates)=>dates.map((d,i)=>({id:'real-'+i,data:d,stato:'completata',eliminata:false}));
const p={id:'account-1',giorni_allenamento:[2,3,5,6],privacy:{rettifica_streak:{data:'2026-10-31',giorni:15,origine:'correzione utente'}}};
test('la rettifica del 31 ottobre rende la streak 15 il 1 novembre senza seduta inventata',()=>{
 const sedute=data('2026-10-28','2026-10-30');
 const a=calcolaStreak(sedute,'2026-11-01',p);
 assert.equal(a.giorni,15);
 assert.equal(a.record,15);
 assert.equal(a.attiva,true);
 assert.equal(a.ultimoGiorno,'2026-10-31');
 assert.ok(a.giorniAllenati.includes('2026-10-31'));
 assert.equal(sedute.length,2);
 const altro=calcolaStreak(sedute,'2026-11-01',{id:'account-2',giorni_allenamento:[2,3,5,6]});
 assert.equal(altro.giorni,0);
});
test('un nuovo allenamento alza a 16; una giornata prevista saltata spegne la streak ma conserva il record',()=>{
 const completate=data('2026-10-28','2026-10-30','2026-11-03');
 assert.equal(calcolaStreak(completate,'2026-11-03',p).giorni,16);
 const saltata=calcolaStreak(data('2026-10-30'),'2026-11-04',p);
 assert.equal(saltata.giorni,0);
 assert.equal(saltata.record,15);
});
test('una rettifica assente o malformata non cambia il calcolo storico',()=>{
 const base=data('2026-10-28','2026-10-30');
 const without=calcolaStreak(base,'2026-11-01',{giorni_allenamento:[2,3,5,6]});
 const wrong=calcolaStreak(base,'2026-11-01',{giorni_allenamento:[2,3,5,6],privacy:{rettifica_streak:{data:'non-date',giorni:15}}});
 assert.equal(wrong.giorni,without.giorni);
 assert.equal(wrong.record,without.record);
});
