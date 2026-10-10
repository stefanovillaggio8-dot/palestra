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
  const locale = Number(versioneLocale());
  if (!remota || remota <= locale) return null;
  return { remota, locale };
}

/** Registra il file che permette l'aggiornamento immediato (se supportato). */
export function registraAggiornamentoRapido() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./update-via-sw.js', { type: 'module' })
    .catch(() => { /* il browser non lo supporta: si usa il metodo sotto */ });
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
    const worker = reg && (reg.waiting || reg.active);
    if (worker) {
      worker.postMessage({ tipo: 'aggiorna-subito' });
      return;
    }
  } catch { /* pazienza */ }
  window.location.reload();
}