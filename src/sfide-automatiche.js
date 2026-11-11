// Sfide verificate dai dati: nessun bottone "L'ho fatta" può generare Aura.
// Le vecchie missioni restano nello storico, ma non sono più assegnabili.
// Nessuna seduta, serie, Rank o saldo è modificato da questo modulo puro.
import { idSettimana } from './missioni.js';
import { recordEsercizio } from './rank.js';

export const SFIDE_AUTOMATICHE = Object.freeze({
  daily: [
    {id:'allenamento-completo',titolo:'Allenamento completato',testo:'Termina un allenamento e registra almeno due serie realmente eseguite.',aura:25,xp:30,obiettivo:1},
    {id:'tre-serie',titolo:'Tre serie completate',testo:'Registra almeno tre serie eseguite oggi. Le serie saltate non contano.',aura:35,xp:35,obiettivo:3},
  ],
  weekly: [
    {id:'due-allenamenti',titolo:'Due giorni di allenamento',testo:'Completa allenamenti validi in due giorni diversi questa settimana.',aura:75,xp:80,obiettivo:2},
    {id:'tre-allenamenti',titolo:'Tre giorni di allenamento',testo:'Completa allenamenti validi in tre giorni diversi questa settimana.',aura:125,xp:130,obiettivo:3},
    {id:'record-vero',titolo:'Supera il tuo record',testo:'Batti la tua migliore serie precedente in almeno un esercizio. Il primo tentativo non vale come record battuto.',aura:150,xp:150,obiettivo:1},
  ],
  secret: [
    {id:'dieci-allenamenti',titolo:'Costanza d’acciaio',testo:'Completa dieci allenamenti validi complessivi.',aura:160,xp:170,obiettivo:10,permanente:true},
    {id:'tre-record-veri',titolo:'Cacciatore di record',testo:'Migliora tre record in tre esercizi diversi durante la stessa settimana.',aura:200,xp:220,obiettivo:3},
  ],
});
export const PREFISSO_SFIDE_AUTO = 'sfida-auto:';
export const INIZIO_SFIDE_AUTO = '2026-11-11';

function dataDi(x) { return String(x?.data || '').slice(0,10); }
function validaData(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data))) return false;
  const d=new Date(data+'T12:00:00Z');
  return !Number.isNaN(+d) && d.toISOString().slice(0,10)===data;
}
function giorniPrevisti(profilo) {
  const g=profilo?.giorni_allenamento;
  return Array.isArray(g) && g.length && g.every(x=>Number.isInteger(x)&&x>=0&&x<=6) ? new Set(g) : null;
}
function giornoPrevisto(data,profilo) {
  const previsti=giorniPrevisti(profilo);
  return !previsti || previsti.has(new Date(data+'T12:00:00Z').getUTCDay());
}
function datiValidi({sedute=[],serie=[],oggi}) {
  const giornoLimite=validaData(oggi)?oggi:'9999-12-31';
  const seduteValide=(sedute||[]).filter(s=>s && !s.eliminata && s.stato==='completata'
    && validaData(dataDi(s)) && dataDi(s)<=giornoLimite);
  const tutte=new Map(seduteValide.map(s=>[s.id,{seduta:s,serie:[]}]));
  for (const x of serie||[]) {
    if (!x || x.eliminata || x.stato!=='fatta' || !Number.isFinite(Number(x.ripetizioni))
        || Number(x.ripetizioni)<=0) continue;
    const target=tutte.get(x.seduta_id);
    if(target) target.serie.push(x);
  }
  return [...tutte.values()];
}
function recordAutentici(dati,periodo,esercizi=[],pesoCorporeo=null) {
  const eserciziMap=new Map((esercizi||[]).filter(x=>x?.id).map(x=>[x.id,x]));
  const seriePrima=new Map(),serieSettimana=new Map();
  for(const d of dati) {
    const dalPeriodo=idSettimana(dataDi(d.seduta))===periodo;
    for(const s of d.serie){
      if(!s.esercizio_id || !eserciziMap.has(s.esercizio_id)) continue;
      const tab=dalPeriodo?serieSettimana:seriePrima;
      if(!tab.has(s.esercizio_id)) tab.set(s.esercizio_id,[]);
      // I mesi SUCCESSIVI al periodo non sono un confronto storico.
      if(dalPeriodo || dataDi(d.seduta)<inizioSettimana(periodo)) tab.get(s.esercizio_id).push(s);
    }
  }
  const validi=[];
  for(const [id,attuali] of serieSettimana){
    const precedenti=seriePrima.get(id)||[];
    if(!precedenti.length) continue; // il primo allenamento non e un PR
    const e=eserciziMap.get(id);
    const nuovo=recordEsercizio(attuali,e,null,pesoCorporeo);
    const prima=recordEsercizio(precedenti,e,null,pesoCorporeo);
    if(nuovo?.valido && prima?.valido && Number.isFinite(nuovo.punteggio)
      && Number.isFinite(prima.punteggio) && nuovo.punteggio>prima.punteggio+1e-7) validi.push(id);
  }
  return validi;
}
function inizioSettimana(periodo){
  const m=/^(\d{4})-W(\d{2})$/.exec(String(periodo||''));
  if(!m) return '9999-12-31';
  const d=new Date(Date.UTC(Number(m[1]),0,4));
  d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7)+(Number(m[2])-1)*7);
  return d.toISOString().slice(0,10);
}
function identificativo(account,categoria,id,periodo) {
  return 'auto:'+account+':'+categoria+':'+id+':'+periodo;
}
export function fonteSfida({categoria,id,periodo}) {
  return PREFISSO_SFIDE_AUTO+categoria+':'+id+':'+periodo;
}
export function interpretaPremioSfida(premio) {
  if(premio?.tipo!=='missione_auto') return null;
  const m=/^sfida-auto:(daily|weekly|secret):([a-z0-9-]+):([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{4}-W[0-9]{2}|sempre)$/.exec(String(premio.fonte||''));
  if(!m) return null;
  return {categoria:m[1],id:m[2],periodo:m[3]};
}

/** Il motore ricalcola ogni risultato dalle sedute E dalle serie fatte,
 * mai da un flag premuto dall'utente. "Raggiunta" non significa "pagata":
 * l'accredito usa un ID deterministico, per non duplicarsi tra dispositivi.
 */
export function quadroSfideAutomatiche({account,oggi,sedute=[],serie=[],esercizi=[],profilo=null,ricompense=[],pesoCorporeo=null}={}, {periodoDaily=oggi,periodoWeekly=idSettimana(oggi)}={}) {
  const dati=datiValidi({sedute,serie,oggi});
  const validi=dati.filter(x=>x.serie.length>=2);
  const giornata=validi.filter(x=>dataDi(x.seduta)===periodoDaily);
  const serieOggi=dati.filter(x=>dataDi(x.seduta)===periodoDaily).flatMap(x=>x.serie);
  const dellaSettimana=validi.filter(x=>idSettimana(dataDi(x.seduta))===periodoWeekly);
  const dateSettimana=new Set(dellaSettimana.map(x=>dataDi(x.seduta)));
  const record=recordAutentici(dati,periodoWeekly,esercizi,pesoCorporeo);
  const previsti=giorniPrevisti(profilo);
  const programma=previsti?.size||7;
  const esistenti=new Set((ricompense||[]).filter(x=>x&&!x.eliminata).map(x=>x.id));
  const crea=(def,categoria,periodo,progresso)=>{
    const chiave=identificativo(account,categoria,def.id,periodo);
    return {...def,categoria,periodo,chiave,fonte:fonteSfida({categoria,id:def.id,periodo}),
      progresso:Math.max(0,progresso),raggiunta:progresso>=def.obiettivo,
      premiata:esistenti.has(chiave)};
  };
  const daily=validaData(periodoDaily)&&periodoDaily>=INIZIO_SFIDE_AUTO
    && giornoPrevisto(periodoDaily,profilo)
    ? SFIDE_AUTOMATICHE.daily.map(def=>crea(def,'daily',periodoDaily,def.id==='tre-serie'?serieOggi.length:giornata.length))
    : [];
  const weekly=SFIDE_AUTOMATICHE.weekly
    .filter(def=>def.id!=='tre-allenamenti'||programma>=3)
    .filter(def=>def.id!=='due-allenamenti'||programma>=2)
    .map(def=>crea(def,'weekly',periodoWeekly,
      def.id==='record-vero'?Math.min(1,record.length):dateSettimana.size));
  const secret=SFIDE_AUTOMATICHE.secret.map(def=>crea(def,'secret',
    def.permanente?'sempre':periodoWeekly,
    def.id==='dieci-allenamenti'?validi.length:record.length));
  return {daily,weekly,secret,recordVeri:record.length};
}
export function premioSfidaAutomatica(s) {
  if(!s?.raggiunta || !s?.chiave) return null;
  return {id:s.chiave,account_id:s.chiave.split(':')[1],tipo:'missione_auto',
    fonte:s.fonte,aura:s.aura,xp:s.xp,dettaglio:s.titolo,
    quando:new Date().toISOString().slice(0,10)};
}
/** Ricalcola una vecchia ricevuta usando il PERIODO originale, anche dopo
 * la cancellazione di una seduta o una sincronizzazione multi-dispositivo.
 */
export function premioSfidaAncoraValido(premio,args={}) {
  const parsed=interpretaPremioSfida(premio);
  if(!parsed) return null;
  const {categoria,id,periodo}=parsed;
  const periodoDaily=categoria==='daily'?periodo:args.oggi;
  const periodoWeekly=(categoria==='weekly'||(categoria==='secret'&&periodo!=='sempre'))
    ?periodo:idSettimana(args.oggi);
  const q=quadroSfideAutomatiche(args,{periodoDaily,periodoWeekly});
  const candidata=q[categoria].find(x=>x.id===id&&x.periodo===periodo);
  return candidata?.raggiunta===true;
}
