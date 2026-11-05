import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calcolaStreak} from '../src/streak.js';
import {validaCreditoStreakOnline,profiloConCreditoStreak} from '../src/streak-online.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('rettifica 15 letta su PC anche senza sedute locali, se il profilo è sincronizzato',()=>{
 const local={id:'account-1',giorni_allenamento:[2,3,5,6],privacy:{}};
 const remote={id:'account-1',privacy:{rettifica_streak:{data:'2026-10-31',giorni:15,origine:'rettifica_richiesta_dal_titolare'}}};
 const credit=validaCreditoStreakOnline(remote);
 const p=profiloConCreditoStreak(local,credit);
 assert.equal(calcolaStreak([], '2026-11-01',p).giorni,1);
 assert.equal(calcolaStreak([], '2026-11-01',p).record,1);
 assert.deepEqual(calcolaStreak([], '2026-11-01',p).giorniAllenati,['2026-10-31']);
 assert.equal(calcolaStreak([], '2026-11-01',local).giorni,0);
 assert.equal(calcolaStreak([], '2026-11-01',{id:'account-2'}).giorni,0);
});
test('v429: nessuna scorciatoia Music Box in Allenamento, Casa e Profilo',()=>{
 const app=read('src/app.js'),html=read('index.html');
 assert.doesNotMatch(app,/collegamentoMusicBox|musicbox-palestra-link|https:\/\/stefanovillaggio8-dot\.github\.io\/music-box/);
 assert.doesNotMatch(read('stile-rpg.css'),/\.musicbox-palestra-link/);
 assert.doesNotMatch(read('stile-premium.css'),/workout-hub-music/);
 assert.doesNotMatch(html,/id="apri-musicbox-gym"/);
 assert.match(app,/workout-hub-actions/);
 assert.match(read('stile-premium.css'),/grid-template-columns:minmax\(0,1fr\)/);
});
test('PC con streak 0 può riconnettere o ricaricare i giorni senza duplicarli',()=>{
 const app=read('src/app.js');
 assert.match(app,/function avvisoStreakDaSincronizzare\(st\)/);
 assert.match(app,/function aggiornaCreditoStreakOnline\(\)/);
 assert.match(app,/bottone\(connesso \? 'Ricarica streak' : 'Accedi al database'/);
 assert.match(app,/vai\('\/amici'\)/);
 assert.match(app,/window\.addEventListener\('focus'/);
});
test('PWA rinfresca la cache alla v385',()=>{
 assert.match(read('index.html'),/palestra-v\d+/);
 assert.match(read('sw.js'),/palestra-v\d+/);
 assert.match(read('index.html'),/src\/app\.js\?v=\d+/);
 assert.match(read('sw.js'),/stile-rpg\.css\?v=\d+/);
});
