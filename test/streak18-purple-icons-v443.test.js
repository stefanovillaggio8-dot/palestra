import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calcolaStreak, giorniAllenati} from '../src/streak.js';
import {calcolaStreakCloud} from '../src/streak-cloud.js';
import {preservaMetadatiProfiloLocaleSuRemoto} from '../src/sincronizzazione.js';

const reali=[
  {id:'n4',scheda_id:'scheda-gym-3',data:'2026-11-04',stato:'completata',eliminata:false},
  {id:'n6',scheda_id:'scheda-gym-3',data:'2026-11-06',stato:'completata',eliminata:false},
  {id:'n3',scheda_id:'scheda-gym-3',data:'2026-11-03',stato:'completata',eliminata:true},
];
const profilo={
  id:'account-1',scheda_id:'scheda-gym-3',giorni_allenamento:[2,3,5,6],
  privacy:{
    rettifica_streak:{data:'2026-10-31',giorni:15,origine:'rettifica_richiesta_dal_titolare'},
    streak_ancora_confermata:{data:'2026-11-07',giorni:18,origine:'rettifica_richiesta_dal_titolare'},
  }
};

test('v443: 18 giorni autorizzati il 7/11, senza creare sedute o ripristinare cancellati',()=>{
  const prima=JSON.stringify(reali);
  const s=calcolaStreak(reali,'2026-11-07',profilo);
  assert.equal(s.giorni,18);
  assert.equal(s.record,18);
  assert.deepEqual(s.rettificaConfermata,{data:'2026-11-07',giorni:18});
  assert.equal(JSON.stringify(reali),prima);
  assert.deepEqual(giorniAllenati(reali,'2026-11-07'),['2026-11-06','2026-11-04']);
  assert.ok(!s.giorniAllenati.includes('2026-11-03'));
  assert.ok(!s.giorniAllenati.includes('2026-11-07'));
});

test('v443: alla ripresa dopo 18, il successivo allenamento incrementa, il riposo non interrompe',()=>{
  assert.equal(calcolaStreak(reali,'2026-11-08',profilo).giorni,18); // domenica riposo
  assert.equal(calcolaStreak(reali,'2026-11-09',profilo).giorni,18); // lunedi riposo
  const nuovo=[...reali,{id:'10',scheda_id:'scheda-gym-3',data:'2026-11-10',stato:'completata'}];
  assert.equal(calcolaStreak(nuovo,'2026-11-10',profilo).giorni,19);
  assert.equal(calcolaStreak(reali,'2026-11-11',profilo).giorni,0); // martedi saltato
  assert.equal(calcolaStreak(nuovo,'2026-11-11',profilo).giorni,19); // mercoledi non ancora scaduto
});

test('v443: stessa fotografia canonica su PC e telefono, indipendentemente dalla cache',()=>{
  const a=calcolaStreakCloud({
    account:profilo.id,profiloCloud:profilo,seduteCloud:reali,
    schedaId:profilo.scheda_id,oggi:'2026-11-07',
  });
  const b=calcolaStreakCloud({
    account:profilo.id,profiloCloud:profilo,seduteCloud:reali,
    schedaId:profilo.scheda_id,oggi:'2026-11-07',
  });
  assert.equal(a.streak.giorni,18);
  assert.deepEqual(a.streak,b.streak);
  assert.equal(calcolaStreakCloud({
    account:'account-2',profiloCloud:profilo,seduteCloud:reali,
    schedaId:profilo.scheda_id,oggi:'2026-11-07',
  }),null);
});

test('v443: la PWA vecchia non sovrascrive mai il valore 18 del cloud',()=>{
  const locale={id:'account-1',privacy:{rettifica_streak:profilo.privacy.rettifica_streak}};
  const protetto=preservaMetadatiProfiloLocaleSuRemoto(locale,profilo);
  assert.deepEqual(protetto.privacy.streak_ancora_confermata,profilo.privacy.streak_ancora_confermata);
  assert.equal(protetto.privacy.rettifica_streak.giorni,15);
  assert.deepEqual(profilo.privacy.streak_ancora_confermata,{data:'2026-11-07',giorni:18,origine:'rettifica_richiesta_dal_titolare'});
});

test('v443: sfondo viola originario e cerchio, senza screenshot incollati',()=>{
  const svg=readFileSync(new URL('../img/esercizi/esercizi-viola-v443.svg',import.meta.url),'utf8');
  const css=readFileSync(new URL('../stile.css',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(svg,/<svg/);
  assert.equal((svg.match(/<circle cx="104" cy="102" r="86"/g)||[]).length,16);
  assert.equal((svg.match(/<rect x="4" y="4"/g)||[]).length,16);
  assert.ok(svg.includes('fill="#241032"')&&svg.includes('fill="#3b1458"'));
  assert.match(css,/esercizi-viola-v443\.svg/);
  assert.doesNotMatch(css,/esercizi-illustrati-v442\.webp/);
  assert.match(sw,/esercizi-viola-v443\.svg/);
});
