// Segnali di possibili errori di registrazione, NON accuse di falsificazione.
// Nessun dato, premio, Rank o saldo viene modificato da queste funzioni.
// Le anomalie non bloccano un risultato valido: richiedono solo una verifica umana.
const numero = v => v===null || v===undefined || v==='' ? null : Number(v);
const data = v => String(v||'').slice(0,10);
const giornoValido = s => /^\d{4}-\d{2}-\d{2}$/.test(s)
  && !Number.isNaN(new Date(s+'T12:00:00Z').valueOf())
  && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;

export function segnaliDatiSospetti({sedute=[],serie=[],oggi=null}={}) {
  const segnalazioni=[],seen=new Set();
  const aggiungi=(codice,messaggio,sedutaId=null)=>{
    const chiave=codice+':'+(sedutaId||'generale');
    if(seen.has(chiave))return;
    seen.add(chiave);segnalazioni.push({codice,messaggio,sedutaId});
  };
  const rilevanti=(sedute||[]).filter(s=>s&&!s.eliminata&&s.stato==='completata');
  const associa=new Map(rilevanti.map(s=>[s.id,[]]));
  for(const x of serie||[]){
    if(!x||x.eliminata||!associa.has(x.seduta_id))continue;
    associa.get(x.seduta_id).push(x);
  }
  for(const s of rilevanti){
    const giorno=data(s.data),fatte=associa.get(s.id).filter(x=>x.stato==='fatta');
    if(!giornoValido(giorno)||(giornoValido(oggi)&&giorno>oggi)){
      aggiungi('data_da_controllare','La data di un allenamento non e coerente.',s.id);
    }
    const inizio=new Date(s.ora_inizio||NaN).valueOf(),fine=new Date(s.ora_fine||NaN).valueOf();
    if(Number.isFinite(inizio)&&Number.isFinite(fine)){
      const minuti=(fine-inizio)/60000;
      if(minuti<0){
        aggiungi('orari_invertiti','La fine dell’allenamento precede l’inizio.',s.id);
      }else if(minuti<3 && fatte.length>=12){
        aggiungi('serie_troppo_rapide','Molte serie registrate in pochissimi minuti: controlla gli orari.',s.id);
      }else if(minuti>18*60){
        aggiungi('durata_anomala','Durata superiore a 18 ore: controlla gli orari.',s.id);
      }
    }
    for(const x of fatte){
      const reps=numero(x.ripetizioni),kg=numero(x.peso),assistenza=numero(x.peso_assistenza);
      if(reps!==null&&(!Number.isFinite(reps)||reps<=0)){
        aggiungi('ripetizioni_non_valide','Ci sono serie completate con ripetizioni non valide.',s.id);
      }
      if((kg!==null&&(!Number.isFinite(kg)||kg<0||kg>1000))
        ||(assistenza!==null&&(!Number.isFinite(assistenza)||assistenza<0||assistenza>1000))){
        aggiungi('peso_da_controllare','Controlla un peso insolito: potrebbe essere un errore di battitura.',s.id);
      }
      if(reps!==null&&reps>1000){
        aggiungi('ripetizioni_da_controllare','Ci sono piu di mille ripetizioni in una serie: verifica il numero o l’unita.',s.id);
      }
    }
  }
  return segnalazioni;
}
