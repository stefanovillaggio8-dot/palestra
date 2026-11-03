// Report tecnico PRIVATO e copiabile. In memoria solo categorie, non messaggi,
// stack, email, ID, JWT, URL, nomi di account o dati degli allenamenti.
const ultimiErrori = [];
const LIMITE = 12;

export function categoriaErrore(errore) {
  let messaggio = '';
  try { messaggio = String(errore?.message ?? errore?.codice ?? errore ?? ''); } catch {}
  const t = messaggio.toLowerCase();
  if (/indexeddb|quotaexceeded|storage|transactioninactive|objectstore/.test(t)) return 'memoria del dispositivo';
  if (/jwt|token|auth|unauthorized|401|login|session expired/.test(t)) return 'accesso online';
  if (/rls|permission|forbidden|403|policy|row-level/.test(t)) return 'permessi del database';
  if (/failed to fetch|network|offline|timeout|timed out|connection|fetch failed/.test(t)) return 'connessione';
  if (/404|not found|resource missing/.test(t)) return 'risorsa mancante';
  if (/500|502|503|gateway|server error/.test(t)) return 'servizio temporaneamente non disponibile';
  if (/syntaxerror|unexpected token|referenceerror|typeerror|is not a function|undefined/.test(t)) return 'errore dell’app';
  return 'errore non classificato';
}

export function registraProblema(errore, origine = 'app') {
  const etichetta = ['app','browser','salvataggio','sincronizzazione'].includes(origine) ? origine : 'app';
  ultimiErrori.push({tipo:categoriaErrore(errore),origine:etichetta,quando:new Date().toISOString()});
  if (ultimiErrori.length > LIMITE) ultimiErrori.splice(0,ultimiErrori.length-LIMITE);
}
export function elencoProblemi() { return ultimiErrori.map(e => ({...e})); }
export function svuotaProblemi() { ultimiErrori.length = 0; }

export function paginaGenerica(hash) {
  const rotta=String(hash||'').replace(/^#\/?/,'').split('/')[0].toLowerCase();
  const nomi={
    '':'Home', casa:'Casa',seduta:'Allenamento',storico:'Storico',
    esercizio:'Esercizio',giorno:'Scheda del giorno',scheda:'Scheda',
    rank:'Rank',ranki:'Rank',profilo:'Profilo',impostazioni:'Impostazioni',
    progressi:'Progressi',recap:'Recap',amici:'Amici',amico:'Amici',
    'aura-shop':'Shop',
  };
  return nomi[rotta] || 'Altra schermata';
}

/** Accetta solo valori di una lista chiusa; nessun testo utente entra nel report. */
export function generaReport({
  versione, dispositivo, online, installata, serviceWorker,
  cloud, sincronizzazione, inAttesa, erroriSync, conflitti,
  schermata, errori = elencoProblemi(),
}={}) {
  const safeVersion=String(versione||'sconosciuta').match(/^v?\d{1,5}$/)?.[0] || 'sconosciuta';
  const device=['iPhone/iPad','Android','Computer','Altro'].includes(dispositivo)?dispositivo:'Altro';
  const statoCloud=['collegato','non collegato'].includes(cloud)?cloud:'non disponibile';
  const statoSync=['ok','attesa','errore','offline','in corso','non disponibile'].includes(sincronizzazione)
    ? sincronizzazione:'non disponibile';
  const schermo=['Home','Casa','Allenamento','Storico','Esercizio','Scheda del giorno',
    'Scheda','Rank','Profilo','Impostazioni','Progressi','Recap','Amici','Shop','Altra schermata']
    .includes(schermata)?schermata:'Altra schermata';
  const conteggio=(v)=>Number.isSafeInteger(Number(v))&&Number(v)>=0?Math.min(Number(v),99999):0;
  const problemi=Array.isArray(errori)?errori.slice(-LIMITE).map(e=>({
    tipo:categoriaNotaSicura(e?.tipo),origine:['app','browser','salvataggio','sincronizzazione']
      .includes(e?.origine)?e.origine:'app',
  })):[];
  return [
    'DIAGNOSTICA PALESTRA (senza dati personali)',
    'Versione: '+safeVersion,
    'Dispositivo: '+device,
    'Schermata: '+schermo,
    'Internet: '+(online === true?'disponibile':online === false?'offline':'non rilevato'),
    'App installata: '+(installata === true?'sì':'no/non rilevato'),
    'Cache offline attiva: '+(serviceWorker === true?'sì':'no/non rilevato'),
    'Database online: '+statoCloud,
    'Sincronizzazione: '+statoSync,
    'Modifiche in attesa: '+conteggio(inAttesa),
    'Errori di sincronizzazione: '+conteggio(erroriSync),
    'Conflitti: '+conteggio(conflitti),
    'Ultimi problemi: '+(problemi.length
      ? problemi.map(e=>e.origine+' / '+e.tipo).join('; ')
      : 'nessuno rilevato in questa sessione'),
    'Il report non contiene messaggi integrali, ID, nomi, mail, password, token, stack o dati delle serie.',
  ].join('\n');
}
function categoriaNotaSicura(v) {
  const note=['memoria del dispositivo','accesso online','permessi del database',
    'connessione','risorsa mancante','servizio temporaneamente non disponibile',
    'errore dell’app','errore non classificato'];
  return note.includes(v)?v:'errore non classificato';
}
