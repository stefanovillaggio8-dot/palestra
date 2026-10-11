// sigillo-classe.js -- la parola segreta che tiene chiusa la scelta della classe.
//
// Ste (12/10/2026): "fai in modo che SOLO io posso cambiare la mia classe quando
// voglio senza ovviamente perdere i progressi dell'altra classe. ma attenzione:
// devo essere solo io in grado di farlo".
//
// LA PARTE FACILE: PERDERE I PROGRESSI.
//
// Prima di tutto, il dubbio: se cambio classe, perdo l'armatura? No, e non per
// merito dell'app ma per come è fatto il sistema. Le armature si sbloccano con il
// RECORD DI STREAK e basta (vedi `calcolaAvatar` in src/avatar-rpg.js: `haStreak` =
// `recordStreak >= p.giorni`, e `richiede` non conta più). Il record di streak
// viene ricalcolato dalle sedute a ogni caricamento e non dipende dalla classe.
// Quindi cambiare classe non tocca niente: restano gli stessi giorni e quindi le
// stesse armature.
//
// Il commento che c'era prima nell'app diceva il contrario ("cambiare ora
// rifarebbe da capo tutto l'equipaggiamento"): era vero quando un premio pretendeva
// anche una statistica, e adesso non è più vero. Quel commento era rimasto indietro.
//
// LA PARTE IMPORTANTE: SOLO LUI.
//
// L'app non ha un server e non ha account: i dati sono nel telefono di ognuno. Quindi
// nessuno, aprendo l'app sul proprio cellulare, può toccare i dati di Ste: sono
// salvati da un'altra parte. Il caso reale è un altro: qualcuno prende in mano il
// telefono di Ste e gli cambia la classe sotto gli occhi, oppure Ste stesso
// preme il bottone sbagliato.
//
// Per questo qui sotto c'è una parola segreta. La cosa importante è COME è
// tenuta:
//
//   - NON è scritta da nessuna parte nel codice. La sceglie Ste, la prima volta, e
//     nessuno la vede: nemmeno chi legge i file dell'app.
//   - nel profilo finisce solo l'IMPRONTA, cioè il risultato di passare la parola
//     (mescolata a un sale casuale) per SHA-256. Dalla impronta non si torna
//     indietro alla parola.
//   - il sale è diverso per ogni profilo, quindi due parole uguali non danno la
//     stessa impronta.
//
// LA VERITÀ SCOMODA, e va detta.
//
// Questa non è una cassaforte di banca. Il codice dell'app è pubblico (GitHub
// Pages) e chi è bravo può leggerlo, e l'impronta è lì dentro. Con una parola corta
// la si potrebbe indovinare provando a raffica. Quindi questa protezione serve per
// QUELLO CHE SERVE DAVVERO: perché chi ha il telefono in mano non cambi la classe di
// Ste senza sapere cosa sta facendo, e perché Ste non la cambia per sbaglio.
//
// Come ogni cosa lato browser, se volessimo una garanzia vera il controllo dovrebbe
// stare su un server che conosce la parola. Ma quello non c'è e non serve qui.

const SALE_BYTE = 16;

/** Due caratteri da un byte, in minuscolo: l'esadecimale che si usa di solito. */
function aEsadecimale(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** I byte di una stringa, come li vuole Web Crypto. */
function aByte(testo) {
  return new TextEncoder().encode(testo);
}

/** Il sale nuovo, casuale. */
export function saleNuovo() {
  const b = new Uint8Array(SALE_BYTE);
  globalThis.crypto.getRandomValues(b);
  return aEsadecimale(b);
}

/** Il sale di un profilo salvato, se c'è; altrimenti ne crea uno in memoria. */
function saleDel(profilo) {
  const s = profilo && profilo.sigillo_classe && profilo.sigillo_classe.sale;
  if (typeof s === 'string' && /^[0-9a-f]{32}$/.test(s)) return s;
  return saleNuovo();
}

/**
 * L'impronta di una parola, per un sale.
 *
 * @param parola  la parola segreta
 * @param sale    il sale del profilo (esadecimale)
 */
export async function impronta(parola, sale) {
  const testo = String(sale) + '|' + String(parola);
  // Se il browser non ha Web Crypto (succede solo in contesti non sicuri, cioe' una
  // pagina aperta da file:// su qualche browser) non si abbassa la sicurezza: si
  // rifiuta. Una funzione più debole sarebbe peggio che nessuna.
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error("Questo browser non può verificare la parola: usa la app dal sito.");
  }
  const hash = await globalThis.crypto.subtle.digest('SHA-256', aByte(testo));
  return aEsadecimale(new Uint8Array(hash));
}

/** Il profilo ha già una parola per cambiare classe? */
export function haSigillo(profilo) {
  const s = profilo && profilo.sigillo_classe;
  return !!(s && typeof s.hash === 'string' && /^[0-9a-f]{64}$/.test(s.hash) && s.sale);
}

/**
 * Le due righe da salvare nel profilo quando si sceglie la parola.
 *
 * La parola non viene salvata e non viene nemmeno rimandata indietro: qui dentro
 * c'e' solo l'impronta.
 */
export async function creaSigillo(parola, ora) {
  const testo = String(parola || '').trim();
  if (testo.length < 4) throw new Error('La parola deve avere almeno 4 caratteri.');
  const sale = saleNuovo();
  const hash = await impronta(testo, sale);
  return { sale, hash, creato: ora || null };
}

/**
 * La parola è quella giusta?
 *
 * @return true/false, e MAI un errore: una parola sbagliata è una risposta normale,
 *         non un guasto. Solo se il browser non può calcolare l'impronta si
 *         propaga l'errore, perché li il problema e' un altro.
 */
export async function verificaSigillo(parola, profilo) {
  if (!haSigillo(profilo)) return false;
  try {
    const dato = await impronta(String(parola || '').trim(), saleDel(profilo));
    return dato === profilo.sigillo_classe.hash;
  } catch (e) {
    // Il confronto si fa sempre: anche quando l'hardware non c'e', due stringhe
    // diverse danno 'false'. Il tempo impiegato e' diverso, ma qui non c'e' un
    // avversario che misura il tempo, e non vale la pena complicare il codice.
    return false;
  }
}
