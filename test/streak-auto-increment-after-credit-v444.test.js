import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaStreak } from '../src/streak.js';
import { calcolaStreakCloud } from '../src/streak-cloud.js';

// L'accredito di 18 conferma la sequenza FINO al 6 novembre, data
// dell'ultimo allenamento gia conteggiato. La seduta del 7 e nuova.
const profilo={
  id:'account-1', scheda_id:'scheda-gym-3', giorni_allenamento:[2,3,5,6],
  privacy:{
    rettifica_streak:{data:'2026-10-31',giorni:15,origine:'rettifica_richiesta_dal_titolare'},
    streak_ancora_confermata:{data:'2026-11-06',giorni:18,origine:'rettifica_richiesta_dal_titolare'},
  },
};
const sedute=[
  {id:'nov6',scheda_id:profilo.scheda_id,data:'2026-11-06',stato:'completata',eliminata:false},
  {id:'nov7',scheda_id:profilo.scheda_id,data:'2026-11-07',stato:'completata',eliminata:false},
  {id:'nov7-test-cancellato',scheda_id:profilo.scheda_id,data:'2026-11-07',stato:'completata',eliminata:true},
];

test('v444: oggi 7 novembre, ripristino 18 fino al 6 + allenamento vero = 19',()=>{
  const stato=calcolaStreak(sedute,'2026-11-07',profilo);
  assert.equal(stato.giorni,19);
  assert.equal(stato.record,19);
  assert.equal(stato.ultimoGiorno,'2026-11-07');
  assert.equal(stato.attiva,true);
  assert.deepEqual(stato.rettificaConfermata,{data:'2026-11-06',giorni:18});
});

test('v444: piu sedute nello stesso giorno non danno piu punti streak',()=>{
  const doppie=[...sedute,{id:'nov7-bis',scheda_id:profilo.scheda_id,data:'2026-11-07',stato:'completata'}];
  assert.equal(calcolaStreak(doppie,'2026-11-07',profilo).giorni,19);
  const soloPrecedenti=sedute.filter(x=>x.id!=='nov7');
  assert.equal(calcolaStreak(soloPrecedenti,'2026-11-07',profilo).giorni,18);
});

test('v444: giorni di riposo conservano 19; martedi nuovo allenamento = 20',()=>{
  assert.equal(calcolaStreak(sedute,'2026-11-08',profilo).giorni,19);
  assert.equal(calcolaStreak(sedute,'2026-11-09',profilo).giorni,19);
  const martedi=[...sedute,{id:'nov10',scheda_id:profilo.scheda_id,data:'2026-11-10',stato:'completata'}];
  assert.equal(calcolaStreak(martedi,'2026-11-10',profilo).giorni,20);
  assert.equal(calcolaStreak(martedi,'2026-11-11',profilo).giorni,20);
  assert.equal(calcolaStreak(sedute,'2026-11-11',profilo).giorni,0);
});

test('v444: dispositivo PC e iPhone ricavano entrambi 19 dal cloud',()=>{
  const snap=calcolaStreakCloud({
    account:profilo.id,profiloCloud:profilo,schedaId:profilo.scheda_id,
    seduteCloud:[...sedute,{id:'amico',scheda_id:'scheda-altro',data:'2026-11-07',stato:'completata'}],
    oggi:'2026-11-07'
  });
  assert.equal(snap.streak.giorni,19);
  assert.equal(snap.fonte,'cloud_verificato');
  assert.equal(snap.account,'account-1');
  assert.equal(snap.schedaId,'scheda-gym-3');
});
