// update-via-sw.js -- fa prendere subito la versione nuova.
//
// Il problema: il service worker vecchio continua a servire i file dalla sua
// cache, quindi anche chiude e riapre l'app non basta e il telefono resta
// indietro di versione. Qui sotto, ogni volta che l'app parte, si controlla se
// online cÈ una versione più nuova e, se cÈ, si dice al service worker di
// prendersela subito invece di aspettare che tutte le schede siano chiuse.

const CONTROLLO = 60 * 60 * 1000; // un'ora: tanto basta, il deploy non è continuo
const URL_CONTROLLO = './sw.js';

let ultimaControllo = 0;

function versioneLocale() {
  return (window.PALESTRA_VERSIONE || '0');
}

/** Il numero di versione dentro il sw.js online (0 se non si legge). */
function versioneOnline(testo) {
  const m = /palestra-v(\d+)/.exec(testo || '');
  return m ? Number(m[1]) : 0;
}

/**
 * Controlla se online cÈ una versione più recente.
 * Non usa l'API del service worker perchÈ su Safari non cÈ: va detto con
 * la parola chiave giusta, altrimenti la pagina si ricarica a ogni avvio.
 */
export async function controllaAggiornamento({ forzato = false } = {}) {
  if (typeof window === 'undefined' || !window.navigator) return null;
  const adesso = Date.now();
  if (!forzato && adesso - ultimaControllo < CONTROLLO) return null;
  ultimaControllo = adesso;

  // col bump automatico del nome la richiesta non passa dalla cache
  let testo = '';
  try {
    const r = await fetch(URL_CONTROLLO + '?controllo=' + adesso, { cache: 'no-store' });
    if (!r || !r.ok) return null;
    testo = await r.text();
  } catch {
    return null; // nessuna rete: si continua con quello che c'è
  }

  const remota = versioneOnline(testo);
  // PALESTRA_VERSIONE contiene "palestra-v280", non un numero puro.
  // Number("palestra-v280") restituisce NaN: il confronto falliva sempre e
  // l'app non riconosceva correttamente la versione già installata.
  const locale = versioneOnline(versioneLocale());
  if (!remota || remota <= locale) return null;

  // IL BLOCCO ANTI-LOOP (22/10/2026).
  //
  // Ste: "appena apro l'app in basso spunta c’è la versione 248, ti aggiorno e
  // mi si aggiorna all'infinito".
  //
  // Il motivo: la pagina dichiarava una versione vecchia (247) mentre il sw.js
  // online diceva già 248. Ogni volta che la pagina partiva vedeva "c’è una
  // versione nuova", ricaricava, e al ricaricamento rivedeva la stessa cosa:
  // un ciclo che non finiva più.
  //
  // Qui si segna in sessionStorage la versione che si è già provata a prendere.
  // Se è la stessa e la pagina è ANCORA quella vecchia, non si insiste: la
  // pagina non si ricarica in giro. Con una versione nuova vera, invece, la
  // pagina si aggiorna come prima e il segno si cancella da solo (la pagina
  // nuova dichiara la versione nuova, quindi il confronto non arriva più qui).
  try {
    const giaProvata = Number(sessionStorage.getItem('palestra:versione-provata') || 0);
    if (giaProvata === remota) return null;
    sessionStorage.setItem('palestra:versione-provata', String(remota));
  } catch { /* pazienza: se sessionStorage non c’è si prosegue come prima */ }

  return { remota, locale };
}

/** Registra il file che permette l'aggiornamento immediato (se supportato). */
// NON REGISTRA NESSUN SERVICE WORKER. Prima qui c'era
// `navigator.serviceWorker.register('./update-via-sw.js')`, e quello era un BUG
// grosso, non una sciocchezza (16/10/2026).
//
// Un service worker senza `scope` prende come scope la cartella in cui si trova,
// cioè la radice del sito: `./`. Ma anche `sw.js` è registrato sulla radice. Due
// service worker sullo stesso scope NON possono stare insieme: il secondo
// SOSTITUISCE il primo. Quindi `update-via-sw.js` prendeva il posto di `sw.js`,
// che smetteva di controllare la pagina (e con lui la cache per offline), e
// `applicaAggiornamento` spediva il messaggio "aggiorna-subito" a un file che
// quel messaggio non lo ascolta: la ricarica non arrivava mai.
//
// Il risultato per Ste era questo: l'app restava ferma sulla stessa versione per
// giorni, e io continuavo a pubblicare correzioni che lui non vedeva. Quando me
// l'ha detto, la foto che aveva davanti era tre versioni vecchia.
//
// Il file resta in `src/` e resta nella lista di `sw.js`, ma non viene MAI
// registrato come worker: l'unico service worker del sito è `sw.js`.
export function registraAggiornamentoRapido() {
  // niente, e apposta: vedi la nota sopra. La funzione resta perché `app.js`
  // continua a chiamarla e così il chiamante non deve cambiare.
}

/**
 * Dice al service worker di prendere subito la versione nuova e, quando è
 * pronta, ricarica la pagina una volta sola.
 */
export async function applicaAggiornamento() {
  if (!('serviceWorker' in navigator)) {
    // senza service worker l'aggiornamento è automatico: basta ricaricare
    window.location.reload();
    return;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      // prima gli dico di prendere subito la versione nuova
      const worker = reg.waiting || reg.installing || reg.active;
      if (worker) worker.postMessage({ tipo: 'aggiorna-subito' });
      // e poi gli dico di andare a r leggere sw.js, che potrebbe essere cambiato
      if (reg.update) await reg.update().catch(() => { /* pazienza */ });
    }
  } catch { /* pazienza */ }
  // E ricarico COMUNQUE, senza aspettare nessuna risposta.
  //
  // Prima qui finiva dopo `postMessage`: se il messaggio non veniva ascoltato non
  // succedeva niente e la pagina restava quella vecchia per sempre. Invece il
  // `fetch` di `sw.js` è "prima la rete", quindi un ricaricamento prende i file
  // freschi anche senza un worker nuovo. Meglio una pagina che si ricarica una
  // volta in più che una pagina ferma su una versione che non esiste più.
  setTimeout(() => window.location.reload(), 900);
}