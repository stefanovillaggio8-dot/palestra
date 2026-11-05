import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { rankDaScore } from '../src/rank-v2/scalata.js';
import { standardPerMovimento, soglieNormalizzate, fattoreCorpo } from '../src/rank-v3/modello.js';
import { valutaPrestazione, soglieLegibiliNuove } from '../src/rank-v3/valutazione.js';
import { STANDARD_CALIBRAZIONE_ESTERNI, standardAutomaticoPerEsercizio,
  tipoAttrezzaturaRank, descriviAttrezzaturaRank } from '../src/rank-v3/standard-automatici.js';
import { modelloRipetizioniRank, ripetizioniPieneRank,
  ESPONENTE_PRESSA, ESPONENTE_BASE_RANK } from '../src/rank-v3/ripetizioni-rank.js';
import { presentaRank } from '../src/rank-spiegato.js';

const byId = id => ESERCIZI.find(e=>e.id===id);
const testSerie = (e,kg,reps=8,bw=70,extras={}) =>
  valutaPrestazione({ esercizio:e,pesoCorporeo:bw,
    serie:[{ esercizio_id:e.id,peso:kg,ripetizioni:reps,stato:'fatta',seduta_id:'finita',...extras }] });

test('v422: ogni riferimento da fonte esterna ha p5<p20<p50<p80<p95, 3 pesi e url corretto',()=>{
  assert.ok(STANDARD_CALIBRAZIONE_ESTERNI.length>=10);
  for(const s of STANDARD_CALIBRAZIONE_ESTERNI){
    assert.equal(s.righe.length,3,s.slug);
    assert.deepEqual(s.righe.map(r=>r[0]),[65,75,85],s.slug);
    assert.match(s.url,/^https:\/\/strengthlevel\.com\/strength-standards\//);
    for(const r of s.righe){
      for(let i=2;i<6;i++)assert.ok(r[i]>r[i-1],s.slug+' BW'+r[0]);
    }
  }
});

test('v422: riconoscimento automatico esatto per attrezzatura e nome, senza aggiungere bonus',()=>{
  const db=byId('ex-dumbbell-bench-press');
  const std=standardAutomaticoPerEsercizio(db);
  assert.equal(std.riferimentoNome,'dumbbell bench press');
  assert.equal(std.fonte,'strengthlevel_esercizio');
  const custom={id:'custom-1',nome:'Dumbbell Bench Press',convenzione:'per_manubrio'};
  assert.equal(standardAutomaticoPerEsercizio(custom)?.riferimentoNome,'dumbbell bench press');
  assert.equal(standardAutomaticoPerEsercizio({...custom,convenzione:'cavo'}),null);
  assert.equal(standardAutomaticoPerEsercizio({...custom,nome:'Dumbbell Bench Pull'}),null);
});

test('v422: nessuno standard di pila va sulla chest press per braccio o sullo Scott a due manubri',()=>{
  const chest=byId('ex-chest-press');
  assert.equal(tipoAttrezzaturaRank(chest),'macchina_dischi_per_braccio');
  assert.equal(standardAutomaticoPerEsercizio(chest),null);
  const scott=byId('ex-scott-bench-curl'),one=byId('ex-one-arm-preacher-curl');
  const s=standardPerMovimento('bicipiti_panca',scott);
  assert.equal(s.fonte,'proxy_cad_non_validato');
  assert.equal(s.affidabilitaBase,'bassa');
  assert.ok(Array.isArray(s.soglie1RMPerPeso));
  assert.equal(standardAutomaticoPerEsercizio(scott),null,
    'i percentili adattati non sono dati misurati per il CAD Curl');
  assert.equal(standardPerMovimento('bicipiti_panca',one).fonte,'strengthlevel_esercizio');
});

test('v422: attrezzature indipendenti e carrucole riconosciute senza conversioni immaginarie',()=>{
  const press=byId('ex-chest-press');
  const pulley=byId('ex-seated-cable-row');
  const ext=byId('ex-single-arm-tricep-pushdown');
  const smith=byId('ex-smith-incline-bench');
  assert.equal(tipoAttrezzaturaRank(press),'macchina_dischi_per_braccio');
  assert.equal(tipoAttrezzaturaRank(pulley),'cavo_stack_1a1_dichiarato');
  assert.equal(tipoAttrezzaturaRank(ext),'cavo_2a1_dichiarato');
  assert.equal(tipoAttrezzaturaRank(smith),'smith_dischi_senza_barra');
  assert.match(descriviAttrezzaturaRank(ext),/meta/);
  assert.match(descriviAttrezzaturaRank(smith),/barra esclusa/);
  assert.equal(tipoAttrezzaturaRank({nome:'Cable Curl',convenzione:'cavo'}),'cavo_rapporto_ignoto');
});

test('v422: score sempre della migliore serie reale, non un massimale stimato',()=>{
  const preacher=byId('ex-one-arm-preacher-curl');
  const r=testSerie(preacher,22,8,70);
  assert.equal(r.valido,true);
  assert.equal(r.caricoReale,22);
  assert.equal(r.massimale,null);
  assert.equal(r.rank.id,'platinum');
  assert.equal(r.calibrazione.origine,'Riferimento statistico specifico');
  assert.match(r.calibrazione.fonteUrl,/one-arm-dumbbell-preacher-curl/);
});

test('v422: i modelli delle ripetizioni sono monotoni e normalizzati a 8',()=>{
  const pressa=byId('ex-single-leg-press');
  const bilaterale={...pressa, id:'ex-pressa-due-gambe',convenzione:'macchina'};
  const generale=modelloRipetizioniRank('tirata_orizzontale');
  const gamba=modelloRipetizioniRank('gambe_pressa',bilaterale);
  const monogamba=modelloRipetizioniRank('gambe_pressa',pressa);
  assert.ok(ESPONENTE_PRESSA<ESPONENTE_BASE_RANK);
  assert.equal(monogamba.esponente,ESPONENTE_BASE_RANK);
  assert.equal(ripetizioniPieneRank(8,gamba),1);
  assert.equal(ripetizioniPieneRank(8,generale),1);
  let previous=0;
  for(let r=1;r<=100;r++){
    const p=ripetizioniPieneRank(r,gamba);
    assert.ok(p>=previous);previous=p;
  }
  assert.equal(ripetizioniPieneRank(100,gamba),ripetizioniPieneRank(20,gamba));
  assert.ok(ripetizioniPieneRank(12,gamba)<ripetizioniPieneRank(12,generale));
});

test('v422: score e soglie stesso sistema, Titan esiste, confidenza scende sulle code',()=>{
  const db=byId('ex-dumbbell-curl');
  const r=testSerie(db,20,8,75);
  assert.equal(r.valido,true);
  const p=standardPerMovimento('bicipiti',db);
  assert.equal(p.fonte,'strengthlevel_esercizio');
  const q=soglieNormalizzate({standard:p,pesoCorporeo:75,meccanica:r.meccanica});
  assert.equal(q.length,7);
  for(let i=1;i<7;i++)assert.ok(q[i]>q[i-1]);
  const doll= q[5]*fattoreCorpo(75)/r.meccanica;
  const titan=testSerie(db,Math.ceil(doll)+1,8,75);
  assert.ok(titan.indice>=5);
  assert.equal(titan.calibrazione.livello,'bassa'); // p98 extrapolato
  const source=presentaRank({...r,esercizio:db,rankId:r.rank.id,serie:{peso:20,ripetizioni:8},profilo:{unita:'kg'}});
  assert.ok(source.frasi.some(x=>x.includes('Attendibilita')));
  assert.match(source.fonteUrl,/strengthlevel.com/);
});

test('v422: i nuovi esercizi con nome esatto e attrezzo compatibile ricevono dati anche senza famiglia',()=>{
  const nuovo={id:'ex-nuovo-allenamento',nome:'Dumbbell Bench Press',convenzione:'per_manubrio'};
  const st=standardPerMovimento('famiglia-non-riconosciuta',nuovo);
  assert.ok(st);
  assert.equal(st.fonte,'strengthlevel_esercizio');
  assert.equal(st.soglie1RMPerPeso[1][0],75);
  const sbagliato={...nuovo,convenzione:'cavo'};
  assert.equal(standardPerMovimento('famiglia-non-riconosciuta',sbagliato),null);
});

test('v422: macchine monogamba diverse da pila bilaterale',()=>{
  const single=byId('ex-single-leg-press');
  assert.equal(tipoAttrezzaturaRank(single),'macchina_stack_monogamba');
  assert.equal(standardAutomaticoPerEsercizio(single),null);
  const seatedCurl=byId('ex-seated-leg-curl');
  assert.equal(tipoAttrezzaturaRank(seatedCurl),'macchina_stack');
  assert.ok(standardAutomaticoPerEsercizio(seatedCurl));
});

test('v422: la soglia esatta del primo rank assegna Bronze, non stato inferiore',()=>{
  // La fascia deve iniziare a >= soglia, non richiedere punteggio > soglia.
  const e=byId('ex-dumbbell-curl');
  const standard=standardPerMovimento('bicipiti',e);
  const soglie=soglieNormalizzate({standard,pesoCorporeo:75,meccanica:1});
  for(let i=1;i<7;i++)assert.ok(soglie[i]>soglie[i-1]);
  assert.equal(rankDaScore(soglie[0],soglie).rank.id,'bronze');
  assert.equal(rankDaScore(soglie[0]-0.0001,soglie).rank,null);
});

test('v422: tutte le schede nuove vengono riconosciute o segnalate come stima, mai fonte inventata',()=>{
  const catalog=ESERCIZI.filter(e=>e.convenzione!=='corpo_libero');
  let withSource=0,withoutSource=0;
  for(const e of catalog){
    const source=standardAutomaticoPerEsercizio(e);
    if(source){withSource++;assert.ok(source.fonteUrl);}else{withoutSource++;}
  }
  assert.ok(withSource>=10);
  assert.ok(withoutSource>0);
});
