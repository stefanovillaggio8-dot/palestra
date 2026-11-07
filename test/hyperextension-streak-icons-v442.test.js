import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { movimentoDi, valutaPrestazione } from '../src/rank-v3/valutazione.js';
import { riferimentoHyperextension, varianteHyperextension } from '../src/hyperextension-rank.js';
import { calcolaStreakCloud, streakCloudUtilizzabile } from '../src/streak-cloud.js';
import { statoAccount } from '../src/gioco.js';
import { POSIZIONI_ICONE_CORRETTE, posizioneIconaCorretta } from '../src/exercise-icons.js';

const file = n => readFileSync(new URL('../'+n, import.meta.url),'utf8');
const e = id => ESERCIZI.find(x=>x.id===id);
const serie = (id, kg, reps) => [{id:'prova',esercizio_id:id,seduta_id:'seduta-test',stato:'fatta',peso:kg,ripetizioni:reps}];

test('v442: Hyperextension ha proprio movimento, non le soglie quadricipiti', () => {
  for(const id of ['ex-back-extension','ex-back-extension-chest','ex-back-extension-hanging']){
    const x=e(id);
    assert.ok(x,id);
    assert.equal(movimentoDi(x).movimento,'estensione_posteriore');
    const standard = riferimentoHyperextension(x);
    assert.equal(standard.fonte,'modello_hyperextension_non_validato');
    assert.equal(standard.massimoRankSupportato,4);
    assert.match(standard.nota,/VERSO IL PAVIMENTO|verso il pavimento/i);
  }
  assert.equal(varianteHyperextension(e('ex-back-extension')),'non_specificata');
  assert.equal(varianteHyperextension(e('ex-back-extension-chest')),'carico_al_petto');
  assert.equal(varianteHyperextension(e('ex-back-extension-hanging')),'braccia_tese_verso_il_basso');
});

test('v442: 80 kg esterni x 7 @ 67 kg sono prestazione oltre modello, non record inventato', () => {
  const r=valutaPrestazione({esercizio:e('ex-back-extension'),serie:serie('ex-back-extension',80,7),pesoCorporeo:67});
  assert.equal(r.valido,true);
  assert.equal(r.caricoReale,80);
  assert.equal(r.ripetizioni,7);
  assert.equal(r.pesoCorporeo,67);
  assert.equal(r.massimale,null);
  assert.equal(r.fuoriScalaProvvisoria,true);
  assert.equal(r.indice,4,'non attribuire automaticamente TITAN/OLYMPIAN da un modello teorico');
  assert.equal(r.calibrazione.livello,'bassa');
  assert.match(r.calibrazione.origine,/MODELLATO/);
  assert.equal(r.distanza,null);
});

test('v442: le varianti hanno registri distinti e nessun bonus percentuale inventato', () => {
  const chest = e('ex-back-extension-chest');
  const hanging = e('ex-back-extension-hanging');
  assert.notEqual(chest.id,hanging.id);
  const a=valutaPrestazione({esercizio:chest,serie:serie(chest.id,25,8),pesoCorporeo:67});
  const b=valutaPrestazione({esercizio:hanging,serie:serie(hanging.id,25,8),pesoCorporeo:67});
  assert.equal(a.valido,true);
  assert.equal(b.valido,true);
  assert.equal(a.score,b.score);
  assert.equal(a.indice,b.indice);
  assert.ok(!/somma.*peso corporeo/i.test(a.nota));
});

test('v442: cloud valido uguale su PC/iPhone; cancellati e in corso NON riattivati', () => {
  const profilo={id:'account-1',scheda_id:'scheda-gym-3',giorni_allenamento:[2,3,5,6],
    privacy:{rettifica_streak:{data:'2026-10-31',giorni:15,origine:'rettifica_richiesta_dal_titolare'}}};
  const cloud=[
    {id:'a',scheda_id:profilo.scheda_id,data:'2026-11-04',stato:'completata'},
    {id:'b',scheda_id:profilo.scheda_id,data:'2026-11-06',stato:'completata'},
    {id:'c',scheda_id:profilo.scheda_id,data:'2026-11-03',stato:'completata',eliminata:true},
    {id:'d',scheda_id:profilo.scheda_id,data:'2026-11-07',stato:'in_corso'},
    {id:'amico',scheda_id:'scheda-amico',data:'2026-11-03',stato:'completata'},
  ];
  const dati={account:profilo.id,profiloCloud:profilo,seduteCloud:cloud,schedaId:profilo.scheda_id,oggi:'2026-11-07'};
  const a=calcolaStreakCloud(dati),b=calcolaStreakCloud(dati);
  assert.equal(a.streak.giorni,2);
  assert.deepEqual(a.streak,b.streak);
  assert.ok(streakCloudUtilizzabile(a,{account:profilo.id,schedaId:profilo.scheda_id,oggi:'2026-11-07'}));
  assert.equal(streakCloudUtilizzabile(a,{account:'account-2',schedaId:profilo.scheda_id,oggi:'2026-11-07'}),false);
  assert.equal(streakCloudUtilizzabile(a,{account:profilo.id,schedaId:profilo.scheda_id,oggi:'2026-11-08'}),false);
  assert.equal(streakCloudUtilizzabile(a,{account:profilo.id,schedaId:profilo.scheda_id,oggi:'2026-11-07',localePendenti:true}),false);
  assert.equal(calcolaStreakCloud({...dati,account:'account-2'}),null);
  const gioco=statoAccount({account:profilo.id,sedute:cloud,serie:[],esercizi:[],profilo,oggi:'2026-11-07',streakAutorevole:a.streak});
  assert.equal(gioco.streak.giorni,2);
});

test('v442: 16 icone distinte e 3 screenshot corretti, senza vecchio sfondo realistico', () => {
  assert.equal(Object.keys(POSIZIONI_ICONE_CORRETTE).length,16);
  const seen=new Set();
  for(const [id] of Object.entries(POSIZIONI_ICONE_CORRETTE)){
    const pos=posizioneIconaCorretta(e(id));
    assert.ok(pos,id);
    const key=pos.x.toFixed(4)+'|'+pos.y.toFixed(4);
    assert.ok(!seen.has(key),'due esercizi condividono illustrazione: '+id);
    seen.add(key);
  }
  for(const id of ['ex-cable-bicep-curl','ex-ez-bar-lying-tricep-extension','ex-incline-dumbbell-bench-press']){
    assert.ok(posizioneIconaCorretta(e(id)),id);
  }
  const css=file('stile.css'),sw=file('sw.js');
  assert.match(css,/esercizi-illustrati-v442\.webp/);
  assert.match(css,/background-size: 400% 400%/);
  assert.doesNotMatch(css,/background-image: url\('\.\/img\/esercizi\/esercizi-correzioni-v441/);
  assert.match(sw,/esercizi-illustrati-v442\.webp/);
  assert.match(sw,/streak-cloud\.js/);
  assert.match(sw,/hyperextension-rank\.js/);
  assert.ok(statSync(new URL('../img/esercizi/esercizi-illustrati-v442.webp',import.meta.url)).size>2000);
});
