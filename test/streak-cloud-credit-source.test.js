import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validaCreditoStreakOnline,profiloConCreditoStreak} from '../src/streak-online.js';
import {calcolaStreak} from '../src/streak.js';

const remoto={id:'account-1',privacy:{rettifica_streak:{
  data:'2026-10-31',giorni:15,origine:'rettifica_richiesta_dal_titolare'
}}};
const profilo={id:'account-1',giorni_allenamento:[2,3,5,6],privacy:{}};
const vecchiaSeduta={id:'a',data:'2026-10-30',stato:'completata'};
test('BUG STREAK 0: la lettura cloud mantiene la provenienza dell accredito',()=>{
  const credito=validaCreditoStreakOnline(remoto);
  assert.equal(credito.origine,'rettifica_richiesta_dal_titolare');
  const p=profiloConCreditoStreak(profilo,credito);
  const s=calcolaStreak([vecchiaSeduta], '2026-11-02',p);
  assert.deepEqual(s.giorniAccreditati,['2026-10-31']);
  assert.equal(s.giorni,2);
  assert.ok(s.giorniAllenati.includes('2026-10-31'));
});
test('anche senza sedute locali, la giornata del 31 resta verde e non produce 15 giorni fittizi',()=>{
  const p=profiloConCreditoStreak(profilo,validaCreditoStreakOnline(remoto));
  const s=calcolaStreak([], '2026-11-02',p);
  assert.deepEqual(s.giorniAllenati,['2026-10-31']);
  assert.equal(s.giorni,1);
});
test('un credito senza origine validata non inventa giornate',()=>{
  const credito=validaCreditoStreakOnline({privacy:{rettifica_streak:{data:'2026-10-31',giorni:15}}});
  const s=calcolaStreak([], '2026-11-02',profiloConCreditoStreak(profilo,credito));
  assert.deepEqual(s.giorniAllenati,[]);
  assert.equal(s.giorni,0);
});
