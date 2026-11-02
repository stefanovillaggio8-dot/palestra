// Recap di Palestra: dati veri, senza scritture né premi automatici.
// Mese e anno sono due viste sullo STESSO storico di sedute completate.
import { CONVENZIONI } from './numeri.js';

const dataValida = (x) => {
  const d = String(x || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [a, m, g] = d.split('-').map(Number);
  const test = new Date(Date.UTC(a, m - 1, g));
  return test.getUTCFullYear() === a && test.getUTCMonth() === m - 1 && test.getUTCDate() === g ? d : null;
};
const numero = (x) => x === null || x === undefined || x === '' ? null :
  (Number.isFinite(Number(x)) ? Number(x) : null);
const mesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
export const NOMI_MESI_RECAP = Object.freeze(mesi);

function nuovoMese(anno, mese) {
  return { anno, mese, nome: mesi[mese - 1], allenamenti: 0,
    giorni: 0, serie: 0, esercizi: 0, record: 0, durataMinuti: 0,
    recordDettagli: [], esercizioPiuAllenato: null };
}
function confrontaSet(a, b, convenzione) {
  if (!b) return 1;
  // Assistenza reale: meno contrappeso = più lavoro, zavorra: più kg = più lavoro.
  const dir = convenzione === CONVENZIONI.ASSISTENZA ? -1 : 1;
  const d = (a.peso - b.peso) * dir;
  return d > 0 ? 1 : d < 0 ? -1 : Math.sign(a.ripetizioni - b.ripetizioni);
}
function carico(set, esercizio) {
  const conv = esercizio?.convenzione;
  const campo = conv === CONVENZIONI.ZAVORRI || conv === CONVENZIONI.ASSISTENZA
    ? 'peso_assistenza' : 'peso';
  const peso = numero(set[campo]), rip = numero(set.ripetizioni);
  if (rip === null || rip <= 0) return null;
  if (conv === CONVENZIONI.CORPO_LIBERO) return { peso: 0, ripetizioni: rip };
  // Serve una serie da almeno cinque ripetizioni per dichiarare un nuovo record di carico.
  if (peso === null || peso < 0 || rip < 5) return null;
  return { peso, ripetizioni: rip };
}
function confrontiStorici(sedute, serie, catalogo, oggi) {
  const esercizi = new Map((catalogo || []).filter(e => e?.id).map(e => [e.id, e]));
  const valide = (sedute || [])
    .filter(s => s?.id && !s.eliminata && s.stato === 'completata')
    .map(s => ({ ...s, _data: dataValida(s.data) }))
    .filter(s => s._data && s._data <= oggi)
    .sort((a,b) => a._data.localeCompare(b._data) ||
      String(a.ora_inizio || '').localeCompare(String(b.ora_inizio || '')) ||
      String(a.id).localeCompare(String(b.id)));
  const visite = new Set();
  const seduteUniche = valide.filter(s => !visite.has(s.id) && visite.add(s.id));
  const perSeduta = new Map(seduteUniche.map(s => [s.id, []]));
  const viste = new Set();
  for (const set of serie || []) {
    if (!set || set.eliminata || set.stato !== 'fatta' || !perSeduta.has(set.seduta_id)) continue;
    if (set.id && viste.has(set.id)) continue;
    if (set.id) viste.add(set.id);
    perSeduta.get(set.seduta_id).push(set);
  }
  const best = new Map();
  const record = [];
  for (const s of seduteUniche) {
    const miglioriSeduta = new Map();
    for (const set of perSeduta.get(s.id)) {
      if (set.spotter || set.assistito || (numero(set.rip_assistite) || 0) > 0) continue;
      const e = esercizi.get(set.esercizio_id);
      if (!e) continue;
      const prestazione = carico(set, e);
      if (!prestazione) continue;
      const p = miglioriSeduta.get(e.id);
      if (!p || confrontaSet(prestazione, p, e.convenzione) > 0) miglioriSeduta.set(e.id, prestazione);
    }
    for (const [id, p] of miglioriSeduta) {
      const e = esercizi.get(id);
      const prima = best.get(id);
      if (!prima || confrontaSet(p, prima, e.convenzione) > 0) {
        if (prima) record.push({ data:s._data, esercizio_id:id, nome:e.nome || 'Esercizio',
          peso:p.peso, ripetizioni:p.ripetizioni,
          unita:e.convenzione === CONVENZIONI.ZAVORRI ? 'zavorra' :
            e.convenzione === CONVENZIONI.ASSISTENZA ? 'assistenza' :
            e.convenzione === CONVENZIONI.CORPO_LIBERO ? 'ripetizioni' : 'kg' });
        best.set(id, p);
      }
    }
  }
  return { sedute: seduteUniche, perSeduta, record, catalogo:esercizi };
}
/**
 * Restituisce un anno intero o un singolo mese. I record sono solo nuovi massimi
 * rispetto a sedute PRECEDENTI conosciute: la prima seduta non è un record battuto.
 */
export function calcolaRecapPalestra({
  sedute = [], serie = [], esercizi = [], anno, mese = null, oggi = null,
} = {}) {
  const dataOggi = dataValida(oggi) || (() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0');
  })();
  const year = Number(anno);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new RangeError('Anno non valido');
  if (mese !== null && (!Number.isInteger(Number(mese)) || Number(mese)<1 || Number(mese)>12))
    throw new RangeError('Mese non valido');
  const storico = confrontiStorici(sedute, serie, esercizi, dataOggi);
  const calendario = Array.from({ length:12 },(_,i) => nuovoMese(year,i+1));
  const giorni = Array.from({length:12},()=>new Set());
  const unici = Array.from({length:12},()=>new Set());
  const frequenze = Array.from({length:12},()=>new Map());
  let totaleSecondi = Array(12).fill(0);
  for (const sessione of storico.sedute) {
    if (Number(sessione._data.slice(0,4)) !== year) continue;
    const index = Number(sessione._data.slice(5,7))-1;
    const m = calendario[index];
    m.allenamenti += 1;
    giorni[index].add(sessione._data);
    const durata = numero(sessione.durata_secondi);
    if (durata !== null && durata > 0) totaleSecondi[index] += durata;
    const idsEserciziSeduta = new Set();
    for (const set of storico.perSeduta.get(sessione.id)) {
      m.serie++;
      if (set.esercizio_id) {
        idsEserciziSeduta.add(set.esercizio_id);
        unici[index].add(set.esercizio_id);
      }
    }
    for (const id of idsEserciziSeduta) {
      frequenze[index].set(id,(frequenze[index].get(id)||0)+1);
    }
  }
  for (const r of storico.record) {
    if (Number(r.data.slice(0,4)) !== year) continue;
    const m=calendario[Number(r.data.slice(5,7))-1];
    m.record++;
    m.recordDettagli.push(r);
  }
  for (let i=0;i<12;i++) {
    const m=calendario[i];
    m.giorni=giorni[i].size;
    m.esercizi=unici[i].size;
    m.durataMinuti=Math.round(totaleSecondi[i]/60);
    const ordinati=[...frequenze[i].entries()].sort((a,b)=>b[1]-a[1] ||
      String(storico.catalogo.get(a[0])?.nome||a[0]).localeCompare(String(storico.catalogo.get(b[0])?.nome||b[0]),'it'));
    if (ordinati.length) {
      const [id, sedute] = ordinati[0];
      m.esercizioPiuAllenato={id,nome:storico.catalogo.get(id)?.nome||'Esercizio',sedute};
    }
    m.recordDettagli.sort((a,b)=>b.data.localeCompare(a.data)||a.nome.localeCompare(b.nome,'it'));
  }
  if (mese !== null) return { tipo:'mese', ...calendario[Number(mese)-1] };
  const all=calendario.reduce((acc,m)=>{
    acc.allenamenti+=m.allenamenti; acc.serie+=m.serie;
    acc.record+=m.record; acc.durataMinuti+=m.durataMinuti;
    return acc;
  },{allenamenti:0,serie:0,record:0,durataMinuti:0});
  const attivi=calendario.filter(m=>m.allenamenti>0);
  return { tipo:'anno', anno:year, mesi:calendario, ...all,
    giorni: new Set(storico.sedute.filter(s=>s._data.startsWith(String(year))).map(s=>s._data)).size,
    esercizi:new Set(storico.sedute.filter(s=>s._data.startsWith(String(year)))
      .flatMap(s=>storico.perSeduta.get(s.id).map(x=>x.esercizio_id).filter(Boolean))).size,
    meseMigliore:attivi.slice().sort((a,b)=>b.allenamenti-a.allenamenti || a.mese-b.mese)[0]||null,
  };
}


/**
 * Miglior serie DI OGNI ESERCIZIO PER MESE: mostra il risultato assoluto,
 * non variazioni percentuali o "kg guadagnati".
 * Il peso corporeo è il valore salvato nella serie/seduta o l'ultima pesata
 * registrata entro quel giorno; mai una pesata futura o il peso attuale.
 * Non modifica record, rank, XP o dati storici.
 */
export function tabellaEserciziAnnuale({
  sedute = [], serie = [], esercizi = [], pesi = [], anno, oggi = null,
} = {}) {
  const year = Number(anno);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new RangeError('Anno non valido');
  const dataOggi = dataValida(oggi) || (() => {
    const d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  })();
  const storico = confrontiStorici(sedute, serie, esercizi, dataOggi);
  const misure = (pesi || [])
    .filter(p => p && !p.eliminata && dataValida(p.data) && numero(p.kg) !== null &&
      numero(p.kg) >= 25 && numero(p.kg) <= 300 && dataValida(p.data) <= dataOggi)
    .slice().sort((a,b) => String(a.data).localeCompare(String(b.data)));
  const mensile = Array.from({length:12},(_,i)=>({
    mese:i+1, nome:mesi[i], esercizi:[],
  }));
  const migliori = Array.from({length:12},()=>new Map());

  function pesoCorpoAllaSerie(set, sessione) {
    const diretto = [set.peso_corpo, set.peso_corporeo, sessione.peso_corpo, sessione.peso_corporeo]
      .map(numero).find(n=>n !== null && n >= 25 && n <= 300);
    if(diretto !== undefined) return diretto;
    let ultimo = null;
    for(const p of misure) {
      if (String(p.data).slice(0,10) <= sessione._data) ultimo = numero(p.kg);
      else break;
    }
    return ultimo;
  }
  for(const sessione of storico.sedute) {
    if(Number(sessione._data.slice(0,4)) !== year) continue;
    const index = Number(sessione._data.slice(5,7))-1;
    for(const set of storico.perSeduta.get(sessione.id)) {
      if (set.spotter || set.assistito || (numero(set.rip_assistite) || 0)>0) continue;
      const esercizio = storico.catalogo.get(set.esercizio_id);
      if(!esercizio) continue;
      const conv = esercizio.convenzione;
      const rip = numero(set.ripetizioni);
      if(rip === null || rip <= 0) continue;
      const corpoLibero = conv === CONVENZIONI.CORPO_LIBERO;
      const zavorre = conv === CONVENZIONI.ZAVORRI;
      const assistenza = conv === CONVENZIONI.ASSISTENZA;
      const caricoRegistrato = corpoLibero ? null : numero(
        zavorre || assistenza ? set.peso_assistenza : set.peso);
      if(!corpoLibero && (caricoRegistrato === null || caricoRegistrato < 0)) continue;
      const p = { peso: caricoRegistrato, ripetizioni:rip };
      const vecchio = migliori[index].get(esercizio.id);
      const misurazione = pesoCorpoAllaSerie(set,sessione);
      const candidato = {
        esercizio_id:esercizio.id, nome:String(esercizio.nome || 'Esercizio'),
        convenzione:conv || '', peso:caricoRegistrato,
        ripetizioni:rip, pesoCorporeo:misurazione,
        data:sessione._data, ora:String(sessione.ora_inizio || ''),
      };
      let migliore = !vecchio;
      if(vecchio) {
        if(corpoLibero) migliore = rip > vecchio.ripetizioni;
        else migliore = confrontaSet(p,vecchio,conv) > 0;
        if(!migliore && rip === vecchio.ripetizioni && caricoRegistrato === vecchio.peso) {
          // A parità di prestazione, usa quella più recente dello stesso mese.
          migliore = sessione._data > vecchio.data ||
            (sessione._data === vecchio.data && candidato.ora > vecchio.ora);
        }
      }
      if(migliore) migliori[index].set(esercizio.id,candidato);
    }
  }
  for(let i=0;i<12;i++) {
    mensile[i].esercizi=[...migliori[i].values()]
      .sort((a,b)=>a.nome.localeCompare(b.nome,'it') || a.esercizio_id.localeCompare(b.esercizio_id));
  }
  return mensile;
}
