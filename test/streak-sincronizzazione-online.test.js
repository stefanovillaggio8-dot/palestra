import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validaCreditoStreakOnline,profiloConCreditoStreak} from '../src/streak-online.js';
import {calcolaStreak} from '../src/streak.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('online 15 streak overrides stale local 0 without inventing sessions',()=>{
 const local={id:'account-1',giorni_allenamento:[2,3,5,6],privacy:{profilo:'pubblico'}};
 const remote={id:'account-1',privacy:{rettifica_streak:{data:'2026-10-31',giorni:15}}};
 const credit=validaCreditoStreakOnline(remote);
 assert.deepEqual(credit,{data:'2026-10-31',giorni:15});
 const p=profiloConCreditoStreak(local,credit);
 const st=calcolaStreak([{data:'2026-10-30',stato:'completata'}],'2026-11-01',p);
 assert.equal(st.giorni,15);assert.equal(st.record,15);
 assert.equal(calcolaStreak([], '2026-11-01',local).giorni,0);
 assert.deepEqual(local.privacy,{profilo:'pubblico'});
});
test('invalid credit rejected and other account never receives it',()=>{
 assert.equal(validaCreditoStreakOnline({privacy:{rettifica_streak:{data:'2026-02-31',giorni:15}}}),null);
 assert.equal(validaCreditoStreakOnline({privacy:{rettifica_streak:{data:'2026-10-31',giorni:-1}}}),null);
 assert.equal(calcolaStreak([], '2026-11-01', {id:'account-2',giorni_allenamento:[2,3,5,6]}).giorni,0);
});
test('the app redraws the streak on startup and after sync, cache v383',()=>{
 const app=read('src/app.js');
 assert.match(app,/sync\.iscriviti\(\(\) => \{/);
 assert.match(app,/if \(sync\.inEsecuzione\(\)\) return/);
 assert.match(app,/await aggiornaCreditoStreakOnline\(\)/);
 assert.match(app,/aggiornaCreditoStreakOnline\(\)\.then/);
 assert.match(app,/RETTIFICHE_STREAK_ONLINE\.get\(accountAttivo\(\)\)/);
 assert.match(app,/if \(cambiata\) disegna\(\)/);
 assert.match(app,/from '\.\/streak-online\.js'/);
 assert.match(read('index.html'),/palestra-v385/);
 assert.match(read('sw.js'),/palestra-v385/);
 assert.match(read('index.html'),/src\/app\.js\?v=385/);
});
