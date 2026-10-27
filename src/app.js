// app.js -- interfaccia e navigazione.
// Tutto in italiano, tema scuro, pulsanti grandi, fatto per essere usato
// in palestra con le mani occupate.

import * as db from './db.js';
import * as sb from './supabase.js';
import * as sync from './sync.js';
import { el, svuota, campoNumero, campoTesto, bottone, chiediConferma, chiediTesto, avviso, numeroCambiato, schedaEvento, oraLocale, dataLeggibile, conRitardo, bottoneSu } from './ui.js';
import { graficoLinea, graficoBarre } from './grafici.js';
import {
  formattaNumero, formattaPeso, formattaRipetizioni, formattaCronometro, formattaDurata,
  ETICHETTE_CONVENZIONE, CONVENZIONI, convenzioneMisuraCarico, convenzioneConCorpo, etichettaUnita, campoCarico,
} from './numeri.js';
import { confrontaEsercizio, riassuntoEsercizio, NON_DISPONIBILE } from './confronto.js';
import { prossimoOrdine, apriSeduta, nuovaSerie, seduteFinite, eFatta, commutaFatta, pulsa, segnaAspettoFatto, registra, REGISTRO, cambiaSerie, etichettaSpotterSerie, aspettaSalvataggi, cambiaGiro, sovrapponiGiri } from './sedute.js';
import {
  MODALITA, raccogliPerEsercizio, proposta as propostaAggiornamento, notaSulNumeroSerie,
  riassuntoSpotter,
} from './aggiornamento.js';
import { testoProgresso, serieARipetizioniCostanti, riepilogoGenerale } from './progressi.js';
import { prestazione, mediaPrestazioni, classificaGenerale } from './forza-generale.js';
import { creaPacchetto, validaPacchetto, unisci, csvSerie, csvSedute, csvEsercizi, soloMiaScheda } from './backup.js';
import { ESERCIZI, SCHEDA_ID, SCHEDA_NOME, PERSONE, accountId, chiSei, personaDaMemoria, costruisciSnapshot, eserciziMancanti } from './dati-iniziali.js';
import { nuovoId, adesso, TABELLE, riallineaEsercizi } from './sincronizzazione.js';
// --- il gioco: rank, LP, streak, Aura, missioni, amici ---
import { statoAccount, ricompenseAllenamento, gruppiDaSerie } from './gioco.js';
import { calcolaAvatar, CLASSI, classeConsigliata, eCardio, minutiDiCardio, nomePremio, statoVisivo, percorsoStato, schedaProgressione, STATI_IMMAGINE } from './avatar-rpg.js';
import { haSigillo, creaSigillo, verificaSigillo } from './sigillo-classe.js';
import { isoGiorno } from './streak.js';
import { suona, sbloccaAudio, audioSpento, impostaAudioSpento } from './audio.js';
import { bloccoGlossario } from './glossario-app.js';
import {
  SCELTE_ANIMAZIONI, sceltaAnimazioni, impostaSceltaAnimazioni, pocoMovimento, avviaAnimazioni,
} from './animazioni.js';
import { recordEsercizio, recordAccount, classificaEsercizio, storicoMiglioramenti, giudizioPerformance, giudizioPerformanceRecord, distanzaAllaSoglia, soglieLegibili, scoreSerie } from './rank.js';
// IL MODELLO NUOVO DEL RANK (22/10/2026): la traduzione delle soglie in pesi che
// si caricano la fa il motore, non una formula scritta qui.
import { soglieLegibiliNuove } from './rank-v3/valutazione.js';
import { confrontoGiorno, confrontiMensili, GIORNI_UN_MESE } from './confronto-mensile.js';
import { profiloEsercizio, profiloPerPesoCorporeo, RANK, ETICHETTE_MISURA, descriviPunteggio, descrizioneLivello, livelloEsercizio, impostaLivelliImparati, livelliImparati, rapportoDifficolta, MOLTIPLICATORI_SOGLIA, passoCaricabile } from './rank-config.js';
import { formattaAura } from './aura.js';
import { elencoAvatar, avatarPerId, gradienteAvatar, iniziali } from './avatar.js';
import { amiciDi, confronta, classifichePerEsercizio, privacyDi, campiVisibili, PRIVACY_PREDEFINITE } from './sociale.js';
import { classificaEsercizio as riconosciEsercizio } from './esercizi-classificatore.js';
import { parteDiMuscolo, AVVERTIMENTO_PARTI, stessoLavoro, livelloConMuscolo, ordinePerMuscolo }
  from './muscoli-parti.js';
// L'omino che dice DOVE lavori. Ste (13/10/2026): "voglio che spunti questo
// omino con il muscolo allenato colorato di viola se possibile, non di giallo".
import { figurino as figurinoMuscolo, FOTO_L, FOTO_A, ETICHETTE as ETICHETTE_OMINO }
  from './mappa-muscoli.js';
import { quantoEPesantePerTe, correggiLivello, dimenticaLivello, livelloImparato, paroleDaChiedere, imparaParola , rinominaEserciziCambiati, sistemaConvenzioniEsercizi } from './esercizi-personali.js';
import { controllaAggiornamento, applicaAggiornamento as prendiVersioneNuova, registraAggiornamentoRapido } from './update-via-sw.js';
import {
  pesoAttuale, pesiCronologici, segnaPeso, togliPeso, pesoCorporeoValido,
  serveAggiornare, PESO_RIFERIMENTO,
} from './peso-corporeo.js';
import { avvisoPesoEsercizio } from './avviso-peso.js';
import { personaggioSvg } from './personaggio-svg.js';

// Il peso corporeo sta in una variabile semplice per non rileggerlo dal database
// a ogni schermata: cambia raramente e il Rank lo usa spesso.
let PESO_CACHE = { valore: null, pronto: false };
async function aggiornaPesoInMemoria() {
  // il peso È DELLA PERSONA che sta usando l'app: senza questo filtro i due
  // profili leggevano lo stesso peso e i Rank erano sbagliati per entrambi
  PESO_CACHE = { valore: await pesoAttuale(accountAttivo()), pronto: true };
  return PESO_CACHE.valore;
}
function pesoCorporeoOra() {
  return PESO_CACHE.pronto ? PESO_CACHE.valore : null;
}

/** Lo stato del peso per mostrarlo nel profilo e ricordare di aggiornarlo. */
async function controlloPeso() {
  const account = accountAttivo();
  const peso = await pesoAttuale(account);
  if (!PESO_CACHE.pronto) await aggiornaPesoInMemoria();
  const avviso_ = await serveAggiornare(account);
  const pesi = await pesiCronologici(account);
  const ultimo = pesi.length ? pesi[pesi.length - 1] : null;
  let durata = '';
  if (ultimo) {
    const giorni = Math.max(0, Math.round((Date.now() - new Date(ultimo.data + 'T12:00:00').getTime()) / 86400000));
    durata = giorni === 0 ? 'oggi' : (giorni === 1 ? 'ieri' : `${giorni} giorni fa`);
  }
  return { peso, serve: avviso_.serve, motivo: avviso_.motivo, durata };
}

function capitalizza(t) {
  const s = String(t || '');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const V = {}; // stato dell'app
const GIRI_DROPSET = 3; // i 3 posti in più che ha chiesto Ste
const CHIAVE_INVITO_PENDENTE = 'palestra-invito-pendente';

function invitoDallaUrl() {
  try {
    return new URL(window.location.href).searchParams.get('inv') || '';
  } catch { return ''; }
}

function invitoPendente() {
  const url = invitoDallaUrl();
  if (url) {
    try { localStorage.setItem(CHIAVE_INVITO_PENDENTE, url); } catch { /* memoria non disponibile */ }
    return url;
  }
  try { return localStorage.getItem(CHIAVE_INVITO_PENDENTE) || ''; } catch { return ''; }
}

function consumaInvitoPendente() {
  try { localStorage.removeItem(CHIAVE_INVITO_PENDENTE); } catch { /* memoria non disponibile */ }
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('inv');
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + '#/profilo');
  } catch { /* vecchio browser */ }
}

/* ===================== chi sta usando l'app ===================== */

// Ognuno ha la sua scheda e i suoi allenamenti. La scelta sta nel link:
// ?p=2 per la seconda persona, ?p=1 (o niente) per la prima.
// TUTTO quello che segue È già filtrato su questa persona: È quello che
// evita che gli allenamenti di uno finiscano nei progressi dell'altro.
let persona = null;
function personaAttiva() {
  if (!persona) {
    // Non si può decidere qui: la scelta dipende dal link E dalla memoria del
    // dispositivo, e la memoria sta nel database. Chi decide È risolviPersona(),
    // chiamata all'avvio prima di qualsiasi schermata. Questo È solo la rete di
    // sicurezza: se qualcosa la chiama prima, non deve saltare, e la prima cosa da
    // proteggere È la scheda di Ste.
    persona = personaDaMemoria({ p: 1 });
  }
  return persona;
}
function schedaAttivaId() { return personaAttiva().schedaId; }

/**
 * CHI SEI, risolto una volta sola all'avvio.
 *
 * Ste (06/10/2026): "quando un amico apre il link vede Stefano. Deve chiedere il
 * nome e diventare se stesso".
 *
 * L'ordine (link, memoria, schede già presenti, altrimenti chiedi) È in
 * `chiSei`, in dati-iniziali.js, ed È li' che È scritto perchÈ. Qui solo si
 * raccolgono i tre ingredienti e si applica il risultato.
 *
 * La memoria sta nella tabella `meta`, che È LOCALE e non va sul server: È una
 * cosa di questo dispositivo ("questo telefono È di Luca"), non un fatto da
 * condividere.
 */
async function risolviPersona() {
  let ricerca = (typeof window !== 'undefined' && window.location && window.location.search) || '';
  // Il link d'invito sopravvive alla scelta iniziale del nome e all'eventuale
  // conferma email: non deve perdersi durante il cambio URL.
  const invito = invitoPendente();
  const memoria = await db.leggiMeta('persona', null);

  // Supabase usa l'URL di conferma già autorizzato (?p=1). Se la conferma
  // arriva dopo la registrazione di un nuovo profilo, non deve sostituire
  // l'identità salvata con quella di Stefano: ripristina la memoria locale
  // e conserva anche l'invito, se presente.
  if (memoria && /[?&]p=1(?:&|$)/.test(ricerca) && sb.collegato()) {
    const qs = new URLSearchParams(ricerca.replace(/^\?/, ''));
    if (memoria.p !== undefined && memoria.p !== null) {
      qs.set('p', String(memoria.p));
      qs.delete('n');
      qs.delete('k');
    } else if (memoria.n && memoria.k) {
      qs.delete('p');
      qs.set('n', memoria.n);
      qs.set('k', memoria.k);
    }
    if (invito) qs.set('inv', invito);
    ricerca = '?' + qs.toString();
    try {
      window.history.replaceState({}, '', window.location.pathname + ricerca + (window.location.hash || ''));
      const manifesto = document.querySelector('link[rel="manifest"]');
      if (manifesto) {
        const tipoManifesto = memoria.n && memoria.k ? 'nuovo' : (Number(memoria.p) === 2 ? 'p2' : 'p1');
        manifesto.setAttribute('href', './manifest-' + tipoManifesto + '.webmanifest');
      }
    } catch { /* browser senza History API */ }
  }

  // Su iPhone l'icona Home può aprire una finestra senza parametri URL e con
  // IndexedDB separato da Safari. Se è installata e non ha identità locale,
  // apri il profilo di Stefano invece di chiedere un nome.
  let installata = false;
  try {
    installata = window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  } catch { /* browser senza rilevamento modalità installata */ }
  if (installata && !/[?&](?:p=\d+|n=)/.test(ricerca) && !memoria) {
    ricerca = '?p=1';
  }

  const schede = (await db.tutti('schede')).map((s) => s && s.id).filter(Boolean);
  const esito = chiSei({ ricerca, memoria, schede });
  if (esito.persona) {
    persona = esito.persona;
    if (esito.memoria) await db.scriviMeta('persona', esito.memoria);
  }
  return esito;
}

/**
 * La domanda del nome, e poi il rinvio col link.
 *
 * Il nome va chiesto una volta sola: quando lo scrivi, si genera la chiave, si
 * scrive la memoria del dispositivo e si riapre la pagina con `?n=nome&k=chiave`.
 * Cosi' l'amico vede subito la sua scheda, e se un giorno copia il link o cambia
 * telefono ritrova la stessa.
 */
async function chiediNome() {
  const chiave = nuovoId().replace(/-/g, '').slice(0, 8);
  const nome = await chiediTesto(
    'Come ti chiami?',
    'Questa scheda e\' tua: quello che ci metti lo vedi solo tu.',
    { segnaposto: 'Il tuo nome' },
  );
  if (!nome) {
    // nessun nome: non si entra. Meglio una pagina vuota che una scheda chiamata
    // "senza nome" che poi nessuno ricorda di aver creato.
    return false;
  }
  await db.scriviMeta('persona', { n: nome, k: chiave });
  try {
    const invito = invitoPendente();
    const qs = '?n=' + encodeURIComponent(nome) + '&k=' + chiave + (invito ? '&inv=' + encodeURIComponent(invito) : '');
    window.location.href = window.location.pathname + qs + (invito ? '#/profilo' : '');
  } catch {
    vai('/');
  }
  return true;
}

/** Le versioni della scheda della persona che sta usando l'app. */
function versioniDellaPersona() {
  const id = schedaAttivaId();
  return V.versi.filter((v) => v.scheda_id === id);
}

/** Le sedute della persona che sta usando l'app (le altre non le vede). */
function seduteDellaPersona() {
  const id = schedaAttivaId();
  const miei = new Set(versioniDellaPersona().map((v) => v.id));
  // Le sedute hanno già scheda_id: non dipendere dalla presenza della versione
  // collegata, perché alcune versioni storiche possono mancare nel database.
  // Altrimenti allenamenti validi spariscono dalla streak e dal calendario.
  return V.sedute.filter((s) => s && (
    s.scheda_id === id ||
    (!s.scheda_id && miei.has(s.versione_id))
  ));
}

/** Le serie della persona che sta usando l'app. */
function serieDellaPersona() {
  const mie = new Set(seduteDellaPersona().map((s) => s.id));
  return V.serie.filter((x) => mie.has(x.seduta_id));
}

/* ===================== avvio ===================== */

/**
 * Carica in memoria le correzioni che Ste ha fatto ai livelli.
 *
 * Il Rank calcola il livello di un esercizio migliaia di volte mentre disegna
 * una schermata: leggerlo dal database ogni volta sarebbe lentissimo, quindi
 * lo tengo qui e lo aggiorno solo quando lui corregge qualcosa.
 */
async function caricaLivelliImparati() {
  try {
    impostaLivelliImparati(await livelliImparati(accountAttivo()));
  } catch {
    impostaLivelliImparati({});
  }
}

/**
 * Un solo ascolto per lo scorrimento, per tutta l'app.
 *
 * Ste (07/10/2026): "il coso con scritto 'allenamento iniziato alle', il tempo ecc,
 * È troppo grosso, fallo più piccolo quando scorro verso il basso".
 *
 * La banda col cronometro sta appiccicata in alto (position: sticky), quindi
 * mentre lavori sulle serie ti mangia un pezzo di schermo per ogni riga. Quando
 * scendi, quella banda si fa piccola: restano il cronometro e il bottone per
 * finire l'allenamento, e sparisce il testo di contorno.
 *
 * Perche' una classe sul body e non stili sul nodo della banda: la banda viene
 * ridisegnata a ogni salvataggio (disegna() gira spesso), quindi metterle un
 * ascolto ogni volta creerebbe ascolti a ripetizione, che dopo un po' si chiamano
 * dieci volte per ogni scroll. Qui cÈ UN ascolto solo, e la classe sul body la
 * trovano tutte le bande, anche quelle che nascono dopo che hai iniziato a
 * scorrere.
 */
const SOGLIA_SCORRIMENTO = 48;
function ascoltaScorrimento() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  if (ascoltaScorrimento.giaFatto) return;
  ascoltaScorrimento.giaFatto = true;
  const aggiorna = () => {
    const y = typeof window.scrollY === 'number' ? window.scrollY : 0;
    const body = typeof document !== 'undefined' ? document.body : null;
    if (body && body.classList) body.classList.toggle('scorso', y > SOGLIA_SCORRIMENTO);
  };
  window.addEventListener('scroll', aggiorna, { passive: true });
  aggiorna();
}

async function avvia() {
  const radice = document.getElementById('app');
  installaSpiaErrori();
  // Una conferma email può restituire i token nel frammento dell'URL.
  sb.ripristinaSessioneDaUrl();

  // LE ANIMAZIONI, PRIMA DI DISEGNARE.
  //
  // Deve stare qui e non dentro una pagina: la classe sul <html> va messa prima che
  // qualcosa venga disegnato, altrimenti la prima schermata parte con la scelta
  // vecchia e le animazioni della prima apertura non si vedono.
  avviaAnimazioni();

  // SBLOCA L'AUDIO AL PRIMO TOCCO.
  //
  // Safari e Chrome sui telefoni non fanno suonare niente se l'audio non è stato
  // aperto da un gesto tuo. Va fatto qui, sul PRIMO tocco su qualunque cosa, e non
  // al primo avvio dell'app: all'avvio non c'è ancora stato nessun gesto, e
  // sbloccarlo lì non avrebbe effetto. Dopo il primo tocco i suoni escono.
  //
  // Non costa niente e non blocca niente: se il browser non supporta l'audio, la
  // funzione torna senza fare niente e l'app funziona lo stesso, muta.
  const sbloccaAlPrimoTocco = () => {
    sbloccaAudio();
    window.removeEventListener('pointerdown', sbloccaAlPrimoTocco);
    window.removeEventListener('keydown', sbloccaAlPrimoTocco);
  };
  window.addEventListener('pointerdown', sbloccaAlPrimoTocco);
  // la tastiera conta come gesto: senza, un utente che usa l'app dal computer non
  // sentirebbe mai niente
  window.addEventListener('keydown', sbloccaAlPrimoTocco);

  svuota(radice);
  const statoAvvio = el('div', { class: 'caricamento', testo: 'Carico i tuoi dati...' });
  radice.appendChild(statoAvvio);
  let faseAvvio = 'inizializzazione';
  const aggiornaFaseAvvio = (testo) => {
    faseAvvio = testo;
    if (statoAvvio && statoAvvio.isConnected) statoAvvio.textContent = 'Carico i tuoi dati...\\n' + testo;
  };
  const controlloAvvio = setTimeout(() => {
    if (statoAvvio && statoAvvio.isConnected) {
      statoAvvio.textContent = 'Avvio bloccato durante: ' + faseAvvio +
        '. Ricarica la pagina una volta con internet. I tuoi allenamenti salvati non sono stati cancellati.';
    }
  }, 12000);

  try {
    aggiornaFaseAvvio('apertura database locale');
    await db.apriDb();
    // CHI SEI, prima di qualsiasi altra cosa. Se questo dispositivo non lo sa e il
    // link non lo dice, si chiede il nome: meglio una domanda che trovarsi dentro la
    // scheda di un altro.
    aggiornaFaseAvvio('lettura del profilo su questo dispositivo');
    const chi = await risolviPersona();
    if (chi.daChiedere) {
      const risposto = await chiediNome();
      if (!risposto) {
        svuota(radice);
        radice.appendChild(el('div', { class: 'caricamento', testo: 'Serve un nome per aprire la scheda.' }));
        return;
      }
      return; // chiediNome sta rilegando la pagina col link giusto
    }
    aggiornaFaseAvvio('preparazione della scheda');
    await seminaSeVuoto();
    bottoneSu();
    ascoltaScorrimento();

    aggiornaFaseAvvio('lettura di esercizi e allenamenti salvati');
    await ricaricaTutto();

    aggiornaFaseAvvio('controllo dei dati salvati');
    // Una volta sola: gli esercizi con i zavorri salvati come assistenza passano
    // a zavorri. Solo l'etichetta, nessun numero viene toccato. Vedi la funzione.
    const sistematiZavorri = await sistemaZavorriComeZavorri();
    if (sistematiZavorri.length) await ricaricaTutto();

    // Il One Arm Overhead Tricep Extension è un normale cavo, non assistenza.
    const tricipiteCavoCorretto = await correggiOneArmTricepExtension();
    if (tricipiteCavoCorretto) await ricaricaTutto();

    // Un esercizio ha cambiato nome (Ste, 21/10/2026). Solo il nome: l'id resta,
    // cosi le serie vecchie restano attaccate all'esercizio giusto.
    const convenzioni = await sistemaConvenzioniEsercizi();
    if (convenzioni.length) await ricaricaTutto();

    // Il Face Pull ora è un solo esercizio: la carrucola si sceglie nella sua configurazione.
    const facePullUnificato = await unificaFacePullDoppia();
    if (facePullUnificato) await ricaricaTutto();

    const rinominati = await rinominaEserciziCambiati();
    if (rinominati.length) {
      await ricaricaTutto();
      avviso(rinominati.map((r) => r.a).join(' e ') + ': adesso l\'app lo chiama cosi\'. '
        + 'I tuoi numeri non sono cambiati.', { tipo: 'ok' });
    }

    aggiornaFaseAvvio('preparazione della sincronizzazione online');
    // La prima sincronizzazione non deve partire prima della relazione d'amicizia:
    // dopo un invito valido il server autorizza il download dei dati condivisi.
    if (sb.collegato()) {
      try {
        const pronto = invitoPendente()
          ? await completaInvitoPendente()
          : await preparaAccountOnline();
        if (pronto === false) return;
        await ricaricaTutto();
      } catch (e) {
        avviso('Account online: ' + e.message, { tipo: 'errore', durata: 9000 });
      }
    }

    sync.iscriviti(() => { aggiornaStatoSalvataggio(); });
    aggiornaFaseAvvio('caricamento delle statistiche');
    // il peso corporeo serve al Rank: lo carico in memoria subito all'avvio
    await aggiornaPesoInMemoria();
    // le correzioni che Ste ha fatto ai livelli: il Rank deve usarle subito,
    // altrimenti per qualche secondo mostrerebbe il livello vecchio
    await caricaLivelliImparati();
    sync.avvia();
    window.addEventListener('hashchange', () => disegna());

    // LE SEZIONI CHE ENTRANO A CASCATA (22/10/2026).
    //
    // Ste: "le sezioni entrano a cascata solo quando cambi schermata, non a
    // ogni salvataggio". Prima l'animazione era sul contenuto e ripartiva ogni
    // volta che la pagina si ridisegnava, cioe' a ogni salvataggio: sembrava
    // che l'app si impiantasse invece di salvare.
    //
    // Qui la classe "cascata" viene messa SOLO quando cambia la rotta (l'URL),
    // e tolta quando l'animazione ha finito. Il ricalcolo di stile serve a far
    // ripartire l'animazione se si torna sulla stessa schermata.
    window.addEventListener('hashchange', () => {
      const c = document.getElementById('contenuto');
      if (!c) return;
      c.classList.remove('cascata');
      if (typeof c.offsetWidth === 'number') void c.offsetWidth;
      c.classList.add('cascata');
      setTimeout(() => c.classList.remove('cascata'), 1100);
    });
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* senza service worker funziona lo stesso, solo niente offline */ });
    registraAggiornamentoRapido();
    // se il browser prende una versione nuova mentre l'app È aperta, lo dico
    try {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e && e.data && e.data.tipo === 'aggiornata') {
          disegnaStatoSalvataggio();
          avviso('C\'e\' una versione nuova. Sto ricaricando...', { durata: 3000 });
          // ricarico una volta sola, quando arriva davvero il nuovo worker
          if (typeof window.__reloadGiaFatto === 'undefined') {
            window.__reloadGiaFatto = true;
            setTimeout(() => window.location.reload(), 600);
          }
        }
      });
    } catch { /* pazienza */ }
  }
    clearTimeout(controlloAvvio);
    disegna();

    // Controllo se online cÈ già una versione più nuova: succede spesso
    // che Ste veda la v20 mentre la v21 È già online da un po'.
    controllaAggiornamento().then((trovata) => {
      if (!trovata) return;
      registraAggiornamentoRapido();
      avviso(`C\'e\' la versione ${trovata.remota}: ti aggiorno.`, { durata: 3500 });
      prendiVersioneNuova();
    }).catch(() => { /* senza rete resta comÈ */ });
    if (db.MOTORE_SCELTO.tipo === 'memoria del browser') {
      avviso('Attenzione: questo browser blocca il database veloce, sto usando la memoria del browser. Tutto funziona, ma esporta un backup ogni tanto.', { durata: 9000 });
    }
  } catch (errore) {
    clearTimeout(controlloAvvio);
    mostraErrore(radice, errore);
  }
}

/**
 * Rete di sicurezza: ogni errore non previsto viene scritto a schermo.
 * Prima gli errori sparivano e sembrava che i pulsanti non facessero niente.
 */
function installaSpiaErrori() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    const testo = (e && (e.message || (e.error && e.error.message))) || 'errore sconosciuto';
    console.error('Errore:', testo, e && e.error && e.error.stack);
    avviso('Qualcosa e\' andato storto: ' + testo + ' (non e\' successo nessun danno ai tuoi dati, prova a rifare la stessa cosa)', { tipo: 'errore', durata: 12000 });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && (e.reason || e);
    const testo = (r && (r.message || r.codice)) || 'operazione non riuscita';
    console.error('Promessa non riuscita:', testo, r && r.stack);
    avviso('Non sono riuscito a salvare: ' + testo + '. I tuoi dati sono al sicuro, prova di nuovo.', { tipo: 'errore', durata: 12000 });
  });
}

/**
 * "Quello che hai fatto diventa la scheda".
 * Ti mostra cosa cambia e ti chiede conferma: la scheda non si riscrive mai
 * di nascosto. Le sedute già fatte restano quelle che sono.
 */
async function proponiAggiornamentoScheda(sedutaId) {
  const modalita = await db.leggiMeta('aggiornamento_scheda', MODALITA.CHIEDI);
  if (modalita === MODALITA.MAI) return { fatto: false, motivo: 'disattivato' };

  const seduta = await db.prendi('sedute', sedutaId);
  if (!seduta || seduta.stato !== 'completata') return { fatto: false, motivo: 'seduta non valida' };
  const versione = V.versi.find((v) => v.id === seduta.versione_id) || versioneCorrente();
  if (!versione || !versione.snapshot) return { fatto: false, motivo: 'versione non trovata' };

  const perEsercizio = raccogliPerEsercizio(V.serie, sedutaId);
  const perId = new Map(V.esercizi.map((e) => [e.id, e]));
  const res = propostaAggiornamento(versione.snapshot, seduta.giorno_id, perEsercizio, perId);
  if (res.nessunaNovita) {
    return { fatto: false, motivo: 'nessuna novita' };
  }

  const righe = res.cambiamenti.map((c) => el('li', { class: 'riga-cambio' }, [
    el('div', { class: 'cambio-testa' }, [
      el('strong', { testo: c.nome }),
      notaSulNumeroSerie(c) ? el('span', { class: 'tag-numero-serie', testo: notaSulNumeroSerie(c) }) : null,
    ]),
    el('div', { class: 'cambio-riga' }, [
      el('span', { class: 'prima', testo: c.prima }),
      el('span', { class: 'freccia', testo: '→' }),
      el('span', { class: 'dopo', testo: c.dopo }),
    ]),
  ]));
  // Nel dialogo di aggiornamento la riga "Con lo spotter: ..." è stata tolta
  // per lo stesso motivo (diceva le stesse cose delle singole serie, e usciva
  // anche quando non avevi fatto nessuna serie con lo spotter). Resta solo
  // l'avviso utile, quello sullo spotter cambiato, e compare solo se è vero.
  const testoSpotter = res.cambiamenti.some((c) => c.spotterCambiato)
    ? 'In questo esercizio hai cambiato lo spotter: la prossima volta la serie te la trovi gia\' segnata.'
    : '';
  const box = el('div', { class: 'sfondo-dialogo' }, el('div', { class: 'dialogo dialogo-largo' }, [
    el('h3', { testo: 'Aggiorno la scheda con quello che hai fatto?' }),
    el('p', { class: 'testo-dialogo', testo: `${res.cambiamenti.length} ${res.cambiamenti.length === 1 ? 'esercizio cambia' : 'esercizi cambiano'} nel ${seduta.nome_giorno || 'giorno'}.` }),
    el('ul', { class: 'lista-cambi' }, righe),
    el('p', { class: 'testo-dialogo legenda-cambi', testo: 'S = fatta con lo spotter · D = dropset' }),
    testoSpotter ? el('p', { class: 'testo-dialogo testo-spotter', testo: testoSpotter }) : null,
    el('p', { class: 'testo-dialogo testo-attenzione', testo: 'Nasce una versione nuova della scheda. Le sedute gia\' registrate restano esattamente come sono.' }),
    el('div', { class: 'dialogo-azioni' }, [
      bottone('Lascia la scheda cosi\'', { onClick: () => box.remove(), classe: 'fantasma' }),
      bottone('Aggiorna la scheda', {
        onClick: async () => {
          box.remove();
          await applicaAggiornamento(res, seduta);
        },
        classe: 'principale',
      }),
    ]),
  ]));
  document.body.appendChild(box);
  return { fatto: false, proposta: res };
}

async function applicaAggiornamento(res, seduta) {
  const nuovoNumero = Math.max(0, ...versioniDellaPersona().map((x) => Number(x.numero) || 0)) + 1;
  const nuovaVersioneId = 'ver-' + nuovoId();
  const pulita = JSON.parse(JSON.stringify(res.snapshot));
  for (const g of pulita.giorni) {
    g.esercizi.forEach((e, i) => { e.ordine = i + 1; });
    g.ordine = pulita.giorni.indexOf(g) + 1;
  }
  await db.salva('versioni', {
    id: nuovaVersioneId, scheda_id: schedaAttivaId(), numero: nuovoNumero, snapshot: pulita,
    nota: `Aggiornata con la seduta del ${seduta.data}`,
  });
  await db.salva('schede', { ...scheda(), versione_corrente: nuovaVersioneId });
  scartaBozza();
  await ricaricaTutto();
  avviso(`Scheda aggiornata: ora sei alla versione ${nuovoNumero}.`, { tipo: 'ok' });
  return nuovaVersioneId;
}

async function aggiornaSchedaDaUltimaSeduta() {
  const finite = seduteFinite(seduteDellaPersona());
  if (!finite.length) { avviso('Non ci sono sedute finite da cui prendere i dati.'); return; }
  await proponiAggiornamentoScheda(finite[0].id);
}

/** Se qualcosa va storto lo dico a schermo, invece di girare all'infinito. */
function mostraErrore(radice, errore) {
  console.error('Avvio non riuscito:', errore);
  svuota(radice);
  radice.appendChild(el('div', { class: 'schermo-errore' }, [
    el('h1', { testo: 'L\'app non e\' partita' }),
    el('p', { testo: 'Questo e\' il motivo, cosi\' lo vediamo subito invece di aspettare:' }),
    el('pre', { class: 'testo-errore', testo: (errore && (errore.message || String(errore))) || 'errore sconosciuto' }),
    el('p', { class: 'nota', testo: 'Motore scelto per i dati: ' + db.MOTORE_SCELTO.tipo + '. Browser: ' + navigator.userAgent }),
    el('div', { class: 'riga-pulsanti' }, [
      bottone('Riprova', { onClick: () => location.reload(), classe: 'principale grande' }),
      bottone('Prova con la memoria del browser', {
        onClick: async () => {
          try {
            await db.svuotaTutto();
            for (const t of TABELLE) { try { localStorage.removeItem('palestra-mem-' + t); } catch { /* pazienza */ } }
            try { localStorage.removeItem('palestra-mem-meta'); } catch { /* pazienza */ }
            location.reload();
          } catch (e) { avviso('Non sono riuscito a cancellare: ' + e.message, { tipo: 'errore' }); }
        },
        classe: 'fantasma',
      }),
    ]),
  ]));
}

/** Ricarica tutto quello che serve per la vista corrente. */
async function ricaricaTutto() {
  V.esercizi = await db.tutti('esercizi');
  V.schede = await db.tutti('schede');
  V.versi = await db.tutti('versioni');
  V.sedute = await db.tutti('sedute');
  V.serie = await db.tutti('serie');
  V.note = await db.tutti('note');

  // Il database locale contiene il profilo attivo; i profili degli amici
  // arrivano da una RPC limitata e non entrano mai nella coda di sincronizzazione.
  const idMio = accountAttivo();
  V.profili = (await db.tutti('profili')).filter((p) => p && p.id === idMio);
  if (sb.collegato()) {
    try {
      const amiciOnline = await sb.profiliAmici();
      const visti = new Set(V.profili.map((p) => p.id));
      for (const p of amiciOnline || []) {
        if (!p || !p.id || visti.has(p.id) || !p.scheda_id) continue;
        V.profili.push(p);
        visti.add(p.id);
      }
    } catch (e) {
      console.warn('Non ho potuto aggiornare l’elenco amici:', e && e.message);
    }
  }
  V.missioni = await db.tutti('missioni');
  V.ricompense = await db.tutti('ricompense');
  V.conflitti = await sync.conflittiDaScegliere();
}

/**
 * I ZAVORRI CHE ERANO SCRITTI COME ASSISTENZA.
 *
 * Ste (13/10/2026): "ancora i dips e le trazioni i kg che metto sono sempre
 * di zavorra, non di assistite". Aveva ragione: l'assistenza va contata al
 * contrario (più ne metti e più è facile) e i zavorri no (più ne metti e più è
 * difficile), quindi 20 kg di zavorra venivano letti come se la macchina ti
 * avesse aiutato di 20 kg. Il conto era esattamente il contrario del vero.
 *
 * Il file con gli esercizi è giusto, ma gli esercizi stanno in IndexedDB e
 * sul dispositivo sono già dentro con la convenzione sbagliata: cambiare il
 * file da solo non li tocca, e nell'app non c'è modo di correggere un esercizio
 * esistente. Quindi qui una volta sola, al primo avvio dopo l'aggiornamento.
 *
 * LA CONDIZIONE È STRETTISSIMA, per non toccare l'esercizio che invece è
 * assistenza vera:
 *   - la convenzione deve essere "assistenza";
 *   - il nome deve essere uno di quelli che si fanno col peso del corpo più
 *     zavorra;
 *   - la nota personale deve dire "zavorra".
 *   Serve tutto e tre. Il "One Arm Overhead Tricep Extension", che al cavo
 *   è assistenza vera, non ha nessuna delle tre condizioni e resta com'è.
 *
 * NON si tocca nessun numero: solo l'etichetta di che cosa misuri. Le serie,
 * i kg e i record restano esattamente dove erano.
 */
const MIGRATI_ZAVORRI = 'zavorri-non-assistenza';
async function sistemaZavorriComeZavorri() {
  let fatti;
  try {
    fatti = localStorage.getItem(MIGRATI_ZAVORRI);
  } catch {
    fatti = null;
  }
  if (fatti) return [];

  const NOMI_ZAVORRA = /\b(pull.?ups?|trazion|chin.?ups?|dips?|dip\b|zugbar|auzubars|pull.?up)\b/i;
  const cambiati = [];
  for (const e of (V.esercizi || [])) {
    if (!e || e.convenzione !== 'assistenza') continue;
    const nome = String(e.nome || '');
    const nota = String(e.nota_permanente || '');
    if (!NOMI_ZAVORRA.test(nome)) continue;
    if (!/zavorra/i.test(nota)) continue;
    // sicuro: il numero NON si tocca
    await db.salva('esercizi', { ...e, convenzione: 'zavorri', tipo: 'zavorre' });
    cambiati.push(nome);
  }
  try {
    localStorage.setItem(MIGRATI_ZAVORRI, '1');
  } catch { /* se localStorage non c'è, si rifà al prossimo avvio: non è grave */ }
  if (cambiati.length) {
    avviso(`${cambiati.join(' e ')}: adesso l'app conta i kg come zavorri, non come assistenza. I tuoi numeri non sono cambiati.`, { tipo: 'ok' });
  }
  return cambiati;
}

/**
 * CORREGGE ONE ARM OVERHEAD TRICEP EXTENSION.
 *
 * Era rimasto salvato come "assistenza" da una vecchia classificazione,
 * anche se è un normale esercizio al cavo: così il motore mostrava un Rank
 * ma non poteva valutare i kg. Riporta l'esercizio a cavo e recupera i carichi
 * eventualmente salvati nel vecchio campo dell'assistenza. Non sovrascrive
 * mai un peso già presente.
 */
async function correggiOneArmTricepExtension() {
  const ID = 'ex-bodyweight-overhead-tricep';
  const esercizio = (V.esercizi || []).find((e) => e && e.id === ID);
  if (!esercizio) return false;

  let cambiato = false;
  const aggiornato = {
    ...esercizio,
    convenzione: CONVENZIONI.CAVO,
    carrucola: esercizio.carrucola || CONVENZIONI.CARRUCOLA_DOPPIA,
  };
  if (esercizio.convenzione !== aggiornato.convenzione
      || esercizio.carrucola !== aggiornato.carrucola) {
    await db.salva('esercizi', aggiornato, { segna: false });
    cambiato = true;
  }

  for (const serie of (V.serie || [])) {
    if (!serie || serie.esercizio_id !== ID) continue;
    const pesoVecchio = serie.peso_assistenza;
    if ((serie.peso === null || serie.peso === undefined)
        && pesoVecchio !== null && pesoVecchio !== undefined && pesoVecchio !== '') {
      await db.salva('serie', { ...serie, peso: pesoVecchio, peso_assistenza: null });
      cambiato = true;
    }
  }
  return cambiato;
}

/**
 * Riallinea il catalogo esercizi del dispositivo con quello ufficiale.
 *
 * Ste (07/10/2026): "vedi perché mi spariscono alcuni esercizi dal rank".
 *
 * Prima qui c'era un se/else: il catalogo veniva riempito SOLO se la tabella era
 * vuota, cioe' solo alla prima installazione. Ogni esercizio aggiunto dopo
 * andava nella scheda ma non nella tabella, e siccome la lista dei Rank gira sul
 * CATALOGO (recordAccount fa `for (const e of esercizi)`), quegli esercizi non
 * avevano una card: sparivano in silenzio, senza nessun avviso.
 *
 * Adesso si aggiungono i MANCANTI a ogni avvio, e solo quelli:
 *  - aggiungere È sicuro, sono righe nuove;
 *  - NON si riscrivono quelle che ci sono già, perchÈ su un dispositivo possono
 *    essere arrivate dal server o essere state corrette, e riscriverle ogni volta
 *    perderebbe dati (che È la cosa peggiore che possa succedere).
 */
async function riallineaCatalogo(gi) {
  const mancanti = eserciziMancanti(gi);
  for (const e of mancanti) await db.salva('esercizi', e, { segna: false });
  if (mancanti.length) {
    // i campi del carico (carrucola, attrezzatura, bracciaIndipendenti) li
    // rimette già risistemaCampiCarico, ma solo sugli esercizi che già c'erano:
    // quindi va rilanciato anche sui nuovi, altrimenti restano senza quei campi
    await risistemaCampiCarico([...(gi || []), ...mancanti]);
  }
  return mancanti;
}


/**
 * Unisce la vecchia voce Face Pull doppia nella voce unica configurabile.
 * Sposta lo storico serie/note e mette la voce duplicata nel cestino, così
 * non si perde lo storico e non compare due volte nel catalogo.
 */
async function unificaFacePullDoppia() {
  let cambiato = false;
  let unico = await db.prendi('esercizi', 'ex-face-pull');
  if (!unico) return false;
  if (unico.nome !== 'Face Pull') {
    unico = await db.salva('esercizi', { ...unico, nome: 'Face Pull', gruppo: 'Face Pull' });
    cambiato = true;
  }
  const vecchio = await db.prendi('esercizi', 'ex-face-pull-doppia');
  if (!vecchio || vecchio.eliminata) return cambiato;

  const serieVecchie = (await db.tutti('serie')).filter((r) => r.esercizio_id === vecchio.id);
  const noteVecchie = (await db.tutti('note')).filter((r) => r.esercizio_id === vecchio.id);
  for (const r of serieVecchie) {
    await db.salva('serie', { ...r, esercizio_id: unico.id });
  }
  for (const r of noteVecchie) {
    await db.salva('note', { ...r, esercizio_id: unico.id });
  }

  // Se esisteva uno storico registrato nella variante doppia, mantieni quel
  // rapporto come scelta iniziale, senza sovrascrivere una scelta già manuale.
  if (serieVecchie.length && !unico.configurazioneCavoPersonalizzata
      && vecchio.carrucola) {
    await db.salva('esercizi', {
      ...unico,
      carrucola: vecchio.carrucola,
      configurazioneCavoPersonalizzata: true,
    });
  }
  await db.cestino('esercizi', vecchio.id);
  return true;
}

async function seminaSeVuoto() {
  const gia = await db.tutti('esercizi');
  await riallineaCatalogo(gia);
  await sistemaNomeScheda();
  await risistemaCampiCarico(await db.tutti('esercizi'));
  await seminaPersona();
}

/**
 * Rimette i tre campi che dicono come si registra il carico, dal catalogo.
 *
 * Ste (06/10/2026): "e' il buco più serio di tutti quelli trovati finora,
 * perchÈ perde dati invece di sbagliare un numero".
 *
 * Il database non ha le colonne carrucola / attrezzatura / bracciaIndipendenti,
 * quindi i campi che tornano dal server non le contengono: senza questo passaggio
 * restano persi per sempre, e l'app conta il carrello del doppio carrucola invece
 * del peso che senti. Cinque esercizi su venti diventavano OLYMPIAN e il Cable Fly
 * scendeva a GOLD: cinque su cinque erano cavi a doppia carrucola.
 *
 * Si fa qui, all'avvio, perchÈ il catalogo (ESERCIZI) È l'unico posto dove quei
 * tre campi sono scritti per bene: il database non deve decidere come si registra
 * il carico. E non si rimette in coda di sincronizzazione, perchÈ il server
 * quella coda non la può ricevere.
 */
async function risistemaCampiCarico(righe) {
  const daScrivere = riallineaEsercizi(ESERCIZI, righe);
  for (const r of daScrivere) await db.salva('esercizi', r, { segna: false });
  return daScrivere.length;
}

/**
 * Le persone che su QUESTO dispositivo si possono usare.
 *
 * Ste e Andrea ci sono sempre (sono le due schede scritte a mano). Chi si registra
 * col link cÈ solo se È lui ad averlo fatto su questo telefono: mettere in lista
 * dieci amici che non sono qui sarebbe una lista di nomi che non cambiano niente,
 * e lascerebbe l'impressione di poter passare a una scheda che non esiste.
 */
function personeDiQuestaApp() {
  const persone = [];
  const presenti = new Set();
  for (const profilo of (V.profili || [])) {
    if (!profilo || !profilo.id || !profilo.scheda_id) continue;
    const id = String(profilo.id).replace(/^account-/, '');
    const statica = PERSONE.find((p) => accountId(p.id) === profilo.id);
    persone.push({
      ...(statica || {}),
      id,
      accountId: profilo.id,
      nome: profilo.username || (statica && statica.nome) || 'Amico',
      username: profilo.username || (statica && statica.username) || 'Amico',
      nomeScheda: (statica && statica.nomeScheda) || ('Palestra di ' + (profilo.username || 'Amico')),
      schedaId: profilo.scheda_id,
      amministratore: !!profilo.amministratore,
      avatar: profilo.avatar_id || (statica && statica.avatar) || 'vuoto',
      amici: Array.isArray(profilo.amici) ? profilo.amici : [],
      colore: profilo.colore || '#7c5cff',
      creata: !statica,
    });
    presenti.add(profilo.id);
  }
  const io = personaAttiva();
  const mioId = accountAttivo();
  if (!presenti.has(mioId)) persone.push({ ...io, accountId: mioId });
  return persone;
}

/**
 * Il link di una persona: `?p=1` / `?p=2` per quelle scritte a mano,
 * `?n=nome&k=chiave` per chi si registra col link. La chiave ci mette dentro
 * appena come nel link che manda lui: È quella che tiene separata la sua scheda
 * da quella di un omonimo.
 */
function linkPersona(p) {
  const base = window.location.pathname;
  if (p.creata && p.chiave) {
    return base + '?n=' + encodeURIComponent(p.nome) + '&k=' + encodeURIComponent(p.chiave);
  }
  return base + '?p=' + p.id;
}

/**
 * Ogni persona deve avere la sua scheda. Alla prima visita creo la scheda e la
 * versione 1 se non ci sono ancora: NON tocco i dati di nessuno, e la scheda
 * dell'altro parte come punto di partenza (gli esercizi sono gli stessi, poi
 * ognuno la modifica come vuole).
 *
 * MA chi si registra col link parte da una copia SENZA le serie. Ste (06/10/2026):
 * "fai una copia della mia e loro la modificano... pero' non deve trovarsi dentro
 * 35 kg alla chest press come se fossero suoi". Le due persone scritte a mano
 * (Ste e Andrea) invece partono con i dati del catalogo, che sono la base su cui
 * sono costruite e hanno senso come esempio.
 */
async function seminaPersona() {
  const p = personaAttiva();
  const gia = await db.prendi('schede', p.schedaId);
  if (gia) {
    await seminaProfilo(p);
    return;
  }
  const versioneId = 'ver-' + p.schedaId + '-1';
  await db.salva('versioni', {
    id: versioneId, scheda_id: p.schedaId, numero: 1,
    snapshot: costruisciSnapshot({ conSerie: !p.creata }),
    nota: 'Versione iniziale: punto di partenza, poi ognuno la modifica come vuole.',
  }, { segna: false });
  await db.salva('schede', {
    id: p.schedaId, nome: p.nomeScheda,
    versione_corrente: versioneId,
  }, { segna: false });
  await seminaProfilo(p);
}

/**
 * Il profilo di ogni account: username, avatar, privacy e amici.
 * Nasce già compilato, ma i campi si possono cambiare dopo dal Profilo:
 * quello che finisce nel database È l'ID dell'avatar, non l'immagine, quindi
 * lo stesso avatar si vede su tutti i dispositivi.
 */
async function seminaProfilo(p) {
  const id = accountId(p.id);
  const gia = await db.prendi('profili', id);
  if (gia) {
    if (gia.scheda_id !== p.schedaId) {
      await db.salva('profili', { ...gia, scheda_id: p.schedaId }, { segna: false });
    }
    return;
  }
  await db.salva('profili', {
    id,
    scheda_id: p.schedaId,
    username: p.username || p.nome,
    avatar_id: p.avatar || 'vuoto',
    amministratore: !!p.amministratore,
    amici: Array.isArray(p.amici) ? p.amici.map((n) => accountId(n)) : [],
    privacy: { ...PRIVACY_PREDEFINITE },
    colore: p.colore || '#7c5cff',
  }, { segna: false });
}

/** Ripristina su un dispositivo nuovo il profilo già legato all'account online. */
async function riapriProfiloOnline(profiloServer) {
  const id = String((profiloServer && profiloServer.id) || '');
  let memoria;
  const url = new URL(window.location.href);
  if (id === 'account-1' || id === 'account-2') {
    const p = id === 'account-1' ? '1' : '2';
    memoria = { p: Number(p) };
    url.searchParams.set('p', p);
    url.searchParams.delete('n');
    url.searchParams.delete('k');
  } else {
    const chiave = id.replace(/^account-/, '');
    if (!chiave || id === chiave || !profiloServer.scheda_id || profiloServer.scheda_id !== 'scheda-' + chiave) {
      return false;
    }
    memoria = { n: profiloServer.username || 'Amico', k: chiave };
    url.searchParams.delete('p');
    url.searchParams.set('n', memoria.n);
    url.searchParams.set('k', chiave);
  }
  await db.scriviMeta('persona', memoria);
  // Conserva l'eventuale invito: dopo il cambio profilo lo stesso link viene
  // accettato una volta sola con l'identità corretta.
  url.hash = '#/profilo';
  window.location.replace(url.pathname + url.search + url.hash);
  return true;
}

/** Pubblica la scheda iniziale del nuovo account prima di accettare un invito. */
async function preparaAccountOnline() {
  const utente = await sb.utenteCorrente();
  const idProfilo = accountAttivo();
  const idScheda = schedaAttivaId();

  // Su un telefono nuovo può mancare la memoria locale del profilo, anche se
  // l'utente ha già un account. Non creare un secondo profilo: riapri quello
  // appartenente all'UUID autenticato e conserva il token d'invito nell'URL.
  const profiliServer = await sb.leggi('profili');
  const profiloServerCorrente = (profiliServer || []).find((p) => p && p.id === idProfilo);
  if (!profiloServerCorrente && (profiliServer || []).length) {
    const destinazione = profiliServer.find((p) => p && p.id === 'account-1')
      || profiliServer.find((p) => p && p.id === 'account-2')
      || profiliServer[0];
    if (destinazione && destinazione.id !== idProfilo && await riapriProfiloOnline(destinazione)) {
      return false; // la pagina ricarica sul profilo remoto corretto
    }
  }
  const profilo = await db.prendi('profili', idProfilo);
  const schedaLocale = await db.prendi('schede', idScheda);
  if (!profilo || !schedaLocale) {
    throw new Error('Non trovo il profilo o la scheda locale. Ricarica la pagina e riprova.');
  }

  const remotoProfilo = await sb.leggiUno('profili', idProfilo);
  if (!remotoProfilo || remotoProfilo.scheda_id !== idScheda) {
    await db.salva('profili', { ...profilo, scheda_id: idScheda }, { segna: true });
  }

  const remotoScheda = await sb.leggiUno('schede', idScheda);
  if (!remotoScheda) await db.salva('schede', schedaLocale, { segna: true });

  const versioneId = schedaLocale.versione_corrente;
  const versioneLocale = versioneId ? await db.prendi('versioni', versioneId) : null;
  if (versioneLocale && !(await sb.leggiUno('versioni', versioneId))) {
    await db.salva('versioni', versioneLocale, { segna: true });
  }

  // Il vecchio profilo di Andrea può avere allenamenti solo nell'IndexedDB
  // del suo dispositivo. Dopo il claim controllo una volta se mancano sul server.
  const chiaveStoricoAndrea = 'account-2-storico-caricato-v1';
  const controllaStoricoAndrea = idProfilo === 'account-2'
    && !(await db.leggiMeta(chiaveStoricoAndrea, false));
  if (controllaStoricoAndrea) {
    await accodaDatiAndreaMancanti(await datiLocaliSchedaDaTrasferire(idScheda, idProfilo));
  }

  const risultato = await sync.sincronizza();
  if (risultato && risultato.errori) {
    throw new Error(risultato.messaggio || 'Non sono riuscito a sincronizzare la scheda iniziale.');
  }
  if (controllaStoricoAndrea) await db.scriviMeta(chiaveStoricoAndrea, true);
  return utente;
}

/** Raccoglie i dati locali legati alla vecchia scheda di Andrea prima del claim. */
async function datiLocaliSchedaDaTrasferire(schedaId, idProfilo) {
  const versioni = (await db.tutti('versioni', { includiEliminati: true }))
    .filter((r) => r && r.scheda_id === schedaId);
  const versioniId = new Set(versioni.map((r) => r.id));
  const sedute = (await db.tutti('sedute', { includiEliminati: true }))
    .filter((r) => r && (r.scheda_id === schedaId || versioniId.has(r.versione_id)));
  const seduteId = new Set(sedute.map((r) => r.id));
  const serie = (await db.tutti('serie', { includiEliminati: true }))
    .filter((r) => r && seduteId.has(r.seduta_id));
  const serieId = new Set(serie.map((r) => r.id));
  const note = (await db.tutti('note', { includiEliminati: true }))
    .filter((r) => r && (seduteId.has(r.seduta_id) || serieId.has(r.serie_id)));
  const profilo = await db.prendi('profili', idProfilo);
  const schedaLocale = await db.prendi('schede', schedaId);

  const eserciziUsati = new Set(serie.map((r) => r.esercizio_id).filter(Boolean));
  for (const versione of versioni) {
    for (const giorno of (versione.snapshot && versione.snapshot.giorni) || []) {
      for (const esercizio of giorno.esercizi || []) {
        const id = esercizio.esercizio_id || esercizio.esercizioId || esercizio.id;
        if (id) eserciziUsati.add(id);
      }
    }
  }
  const esercizi = (await db.tutti('esercizi', { includiEliminati: true }))
    .filter((r) => r && eserciziUsati.has(r.id)
      && !String(r.id).startsWith('ex-') && r.globale !== true);
  const missioni = (await db.tutti('missioni', { includiEliminati: true }))
    .filter((r) => r && r.account_id === idProfilo);
  const ricompense = (await db.tutti('ricompense', { includiEliminati: true }))
    .filter((r) => r && r.account_id === idProfilo);
  const pesi = (await db.tutti('pesi', { includiEliminati: true }))
    .filter((r) => r && r.account_id === idProfilo);

  return {
    profilo: profilo ? [{ ...profilo, scheda_id: schedaId }] : [],
    schede: schedaLocale ? [schedaLocale] : [],
    versioni, esercizi, sedute, serie, note, missioni, ricompense, pesi,
  };
}

/**
 * Il claim sposta sul server la vecchia scheda se esiste già. Se Andrea aveva
 * allenamenti solo in IndexedDB (mai sincronizzati), li carico ora senza
 * sovrascrivere quelli che il server ha già trasferito.
 */
async function accodaDatiAndreaMancanti(dati) {
  const ordine = ['profili', 'schede', 'versioni', 'esercizi', 'sedute', 'serie', 'note', 'missioni', 'ricompense', 'pesi'];
  let accodate = 0;
  // Un solo download per tabella evita centinaia di richieste quando lo storico
  // contiene molte serie. Le righe già presenti sul server restano intatte.
  const presenti = new Map();
  for (const tabella of ordine) {
    try {
      const remote = await sb.leggi(tabella);
      presenti.set(tabella, new Set((remote || []).map((r) => r && r.id).filter(Boolean)));
    } catch (e) {
      throw new Error('Non riesco a controllare la tabella ' + tabella + ': ' + e.message);
    }
  }
  for (const tabella of ordine) {
    const idsRemoti = presenti.get(tabella) || new Set();
    for (const riga of (dati[tabella] || [])) {
      if (idsRemoti.has(riga.id)) continue;
      const locale = await db.prendi(tabella, riga.id);
      if (locale && ['da_salvare', 'in_corso', 'errore', 'conflitto'].includes(locale.sync)) continue;
      await db.salva(tabella, { ...riga, ...(tabella === 'profili' ? { scheda_id: schedaAttivaId() } : {}) }, { segna: true });
      accodate++;
    }
  }
  return accodate;
}

/** Accetta il link una sola volta e ricarica i dati condivisi da entrambi. */
async function completaInvitoPendente() {
  const token = invitoPendente();
  if (!token || !sb.collegato()) return false;

  const idProfilo = accountAttivo();
  const trasferimentoAndrea = idProfilo === 'account-2';
  const datiAndrea = trasferimentoAndrea
    ? await datiLocaliSchedaDaTrasferire(schedaAttivaId(), idProfilo)
    : null;

  // Per il profilo storico di Andrea il database trasferisce i dati già online.
  // Quelli presenti solo sul telefono vengono aggiunti dopo il claim.
  if (!trasferimentoAndrea && await preparaAccountOnline() === false) return false;

  const esito = await sb.accettaInvitoAmico(token, idProfilo);
  consumaInvitoPendente();
  if (datiAndrea) await accodaDatiAndreaMancanti(datiAndrea);

  const mioProfilo = await sb.leggiUno('profili', idProfilo);
  if (mioProfilo) {
    await db.salva('profili', { ...mioProfilo, sync: 'pulito', base_rev: Number(mioProfilo.rev || 0) }, { segna: false });
  }

  if (trasferimentoAndrea) {
    const miaScheda = await sb.leggiUno('schede', schedaAttivaId());
    if (miaScheda) {
      await db.salva('schede', { ...miaScheda, sync: 'pulito', base_rev: Number(miaScheda.rev || 0) }, { segna: false });
      if (miaScheda.versione_corrente) {
        const versione = await sb.leggiUno('versioni', miaScheda.versione_corrente);
        if (versione) await db.salva('versioni', { ...versione, sync: 'pulito', base_rev: Number(versione.rev || 0) }, { segna: false });
      }
    }
  }

  const syncDopoInvito = await sync.sincronizza();
  if (syncDopoInvito && syncDopoInvito.errori) {
    throw new Error(syncDopoInvito.messaggio || 'Invito accettato, ma la sincronizzazione deve essere riprovata.');
  }
  if (trasferimentoAndrea) await db.scriviMeta('account-2-storico-caricato-v1', true);
  await ricaricaTutto();
  avviso(trasferimentoAndrea
    ? 'Profilo storico di Andrea trasferito: ora appartiene al suo account personale.'
    : 'Amicizia attivata. Ora potete vedere gli allenamenti che avete condiviso.', { tipo: 'ok', durata: 7000 });
  return esito || true;
}

function urlInvito(token, trasferisciAndrea = false) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('inv', token);
  if (trasferisciAndrea) url.searchParams.set('p', '2');
  url.hash = '#/profilo';
  return url.href;
}

async function creaECopiaInvito(trasferisciAndrea = false) {
  if (!sb.collegato()) {
    avviso('Prima accedi o crea il tuo account nella sezione qui sotto.', { tipo: 'errore' });
    return;
  }
  try {
    const risultato = await sb.creaInvitoAmico(accountAttivo(), trasferisciAndrea);
    const link = urlInvito(risultato.token, trasferisciAndrea);
    try {
      await navigator.clipboard.writeText(link);
      avviso(trasferisciAndrea
        ? 'Link per trasferire la scheda di Andrea copiato.'
        : 'Link invito copiato. Creane uno diverso per ogni amico.', { tipo: 'ok', durata: 6000 });
    } catch {
      window.prompt('Copia questo link da mandare al tuo amico:', link);
    }
  } catch (e) {
    avviso('Non sono riuscito a creare l’invito: ' + e.message, { tipo: 'errore', durata: 9000 });
  }
}

/** Accesso/registrazione visibili dal Profilo, senza configurare manualmente il database. */
function bloccoAccountOnlineProfilo() {
  const box = el('section', { class: 'blocco' });
  box.appendChild(el('h2', { testo: 'Account online' }));
  box.appendChild(el('p', {
    class: 'nota',
    testo: 'Accedi per sincronizzare gli allenamenti tra dispositivi e collegarti agli amici. Ogni persona usa il proprio account.',
  }));

  const s = sb.sessione();
  if (s && s.access_token) {
    const email = s.user && s.user.email ? s.user.email : 'account collegato';
    box.appendChild(el('p', { class: 'nota', testo: 'Connesso come ' + email }));
    const invito = invitoPendente();
    if (invito) {
      box.appendChild(bottone('Accetta invito in sospeso', {
        onClick: async () => {
          try {
            const pronto = await completaInvitoPendente();
            if (pronto === false) return;
            await ricaricaTutto();
            disegna();
          } catch (e) {
            avviso('Invito non completato: ' + e.message, { tipo: 'errore', durata: 10000 });
          }
        },
        classe: 'principale',
      }));
    }
    box.appendChild(bottone('Esci dall’account online', {
      onClick: async () => {
        await sb.esci();
        avviso('Sei uscito dall’account online.');
        disegna();
      },
      classe: 'fantasma',
    }));
    return box;
  }

  const mail = el('input', { type: 'email', class: 'campo-testo', placeholder: 'La tua email', autocomplete: 'email' });
  const pass = el('input', { type: 'password', class: 'campo-testo', placeholder: 'Password (almeno 6 caratteri)', autocomplete: 'current-password' });
  box.appendChild(el('div', { class: 'campi-account' }, [mail, pass]));

  box.appendChild(el('div', { class: 'riga-pulsanti' }, [
    bottone('Accedi', {
      onClick: async () => {
        if (!mail.value.trim() || !pass.value) {
          avviso('Inserisci email e password.', { tipo: 'errore' });
          return;
        }
        try {
          await sb.accedi(mail.value.trim(), pass.value);
          const pronto = invitoPendente()
            ? await completaInvitoPendente()
            : await preparaAccountOnline();
          if (pronto === false) return;
          await ricaricaTutto();
          avviso('Accesso riuscito e dati sincronizzati.', { tipo: 'ok' });
          disegna();
        } catch (e) {
          avviso('Accesso non completato: ' + e.message, { tipo: 'errore', durata: 10000 });
        }
      },
      classe: 'principale',
    }),
    bottone('Crea account', {
      onClick: async () => {
        const email = String(mail.value || '').trim();
        const password = String(pass.value || '');
        if (!email || !password) {
          avviso('Inserisci email e password per creare l’account.', { tipo: 'errore' });
          return;
        }
        if (password.length < 6) {
          avviso('La password deve contenere almeno 6 caratteri.', { tipo: 'errore' });
          return;
        }
        try {
          const risultato = await sb.registrati(email, password);
          if (risultato && risultato.access_token) {
            const pronto = invitoPendente()
              ? await completaInvitoPendente()
              : await preparaAccountOnline();
            if (pronto === false) return;
            await ricaricaTutto();
            avviso('Account creato e dati sincronizzati.', { tipo: 'ok', durata: 7000 });
            disegna();
          } else {
            avviso('Registrazione inviata. Conferma l’email dal messaggio ricevuto; poi torna al link e premi Accedi.', { tipo: 'ok', durata: 10000 });
          }
        } catch (e) {
          avviso('Registrazione non completata: ' + e.message, { tipo: 'errore', durata: 10000 });
        }
      },
      classe: 'fantasma',
    }),
  ]));
  return box;
}

/**
 * Ste ha chiesto di chiamare l'app "Palestra". La scheda già installata aveva
 * dentro il nome vecchio ("gym 3"), quindi lo correggo una volta sola: se un
 * giorno cambiera' di nuovo nome, qui non viene più toccato niente.
 */
const NOMI_SCHEDA_VECCHI = ['gym 3', 'Gym 3', 'GYM 3'];
async function sistemaNomeScheda() {
  const s = await db.prendi('schede', SCHEDA_ID);
  if (!s) return;
  const nome = String(s.nome || '').trim();
  if (NOMI_SCHEDA_VECCHI.indexOf(nome) === -1) return;
  await db.salva('schede', { ...s, nome: SCHEDA_NOME }, { segna: false });
}

function scheda() { return V.schede.find((s) => s.id === schedaAttivaId()) || null; }

function versioneCorrente() {
  const s = scheda();
  if (!s) return null;
  const mie = versioniDellaPersona();
  return V.versi.find((v) => v.id === s.versione_corrente) || mie[0] || null;
}

function esercizioPerId(id) { return V.esercizi.find((e) => e.id === id) || null; }

/* ===================== navigazione ===================== */

function vai(percorso) { window.location.hash = percorso; }

// La rotta disegnata l'ultima volta: serve per capire se `disegna` aggiorna la stessa
// pagina o ne apre una nuova (e quindi se lo scroll si ripristina o torna a zero).
let rottaDisegnata = null;

function disegna() {
  const zona = document.getElementById('app');
  if (!zona) return;
  // IL PUNTO IN CUI SEI, PER SAPERE SE RIAGGIORNARE O RICOMINCIARE (Ste, 18/10/2026)
  //
  // Prima la posizione di scroll veniva rimessa SEMPRE, anche cambiando pagina. Il risultato
  // era quello che ha descritto Ste: "quando io premo rank e premo dettagli esercizio, apre
  // la schermata come se fossi andato in basso, tipo che nell'immagine fossi sceso giu col
  // dito". Aveva ragione: lui era a meta' della pagina Rank, e la pagina nuova apriva a
  // meta' schermo, sul contenuto sbagliato.
  //
  // Il ripristino serve invece quando la STESSA pagina si ridisegna (salvi un numero, il
  // contatore si aggiorna): lì tornare su non deve saltare il campo che stai scrivendo.
  // Quindi: stessa rotta si ripristina, rotta diversa si parte dall'alto.
  const rottaOra = (window.location.hash || '#/').replace(/^#/, '');
  const stessaRotta = rottaOra === rottaDisegnata;
  const scrollPrima = stessaRotta && typeof window.scrollY === 'number' ? window.scrollY : 0;
  rottaDisegnata = rottaOra;
  svuota(zona);
  // IL `try/catch` QUI NON COPRIVA LE VISTE ASYNC. Era un buco vero, e grosso.
  //
  // `disegnaDentro` non È async ma dentro di lei quattro viste lo sono
  // (`vistaSeduta`, `vistaSedutaPassata`, `vistaEsercizio`, `vistaProfilo`): quelle
  // restituiscono una Promise, e un errore sollevato DOPO un `await` dentro una
  // funzione async viene gestito dalla Promise, NON dal `try` del chiamante.
  // Quindi `disegnaDentro` tornava subito, il `try` passava, e un errore in
  // arrivo dal database dentro una vista async sfuggiva completamente: pagina a
  // meta' disegnata e nessun messaggio. Il caso reale È `vistaProfilo`, che fa
  // `await controlloPeso()` DOPO aver già disegnato testa e barra del livello: se
  // il database È bloccato da un'altra scheda aperta, l'app si ferma a meta' del
  // Profilo con l'aria, lo XP e il livello già scritti, e senza il blocco del
  // peso e senza spiegare perchÈ.
  //
  // La correzione: `Promise.resolve(...)` chiama `disegnaDentro` SUBITO (nessun
  // ritardo, nessuno sfarfallio: la pagina si disegna nel medesimo momento di
  // prima) e restituisce la sua Promise, quindi il `.catch` prende anche gli
  // errori sollevati dopo un `await`. Gli errori SINCRONI arrivano comunque al
  // `try`, quindi le due protezioni restano entrambe.
  let ancoraQui = true;
  const alErrore = (errore) => {
    // se nel frattempo la schermata È stata ridisegnata, l'errore È vecchio e
    // non deve cancellare la pagina nuova
    if (!ancoraQui) return;
    ancoraQui = false;
    console.error('Disegno non riuscito:', errore);
    svuota(zona);
    mostraErrore(zona, errore);
  };
  try {
    Promise.resolve(disegnaDentro(zona))
      .then(() => { ancoraQui = false; animaNumeriCambiati(zona); })
      .catch(alErrore);
  } catch (errore) {
    alErrore(errore);
    return;
  }
// la pagina parte dall'alzo quando cambi rotta, e torna dov'era quando si ridisegna
  if (scrollPrima > 0 && typeof window.scrollTo === 'function') {
  try { window.scrollTo(0, scrollPrima); } catch { /* in qualche browser non si può */ }
  } else if (typeof window.scrollTo === 'function') {
  try { window.scrollTo(0, 0); } catch { /* in qualche browser non si può */ }
  }
}

/**
 * Fa lampeggiare i numeri che sono appena cambiati.
 *
 * Ste (10/10/2026): "metti più animazioni, sembra non essere cambiato nulla".
 *
 * Serve a una cosa sola: quando guardi il numero della streak dopo aver allenato,
 * vuoi sapere se è quello nuovo o quello di prima. Un colore diverso non basta a
 * chi non nota le sfumature, e un movimento piccolo lo dice a tutti.
 *
 * Per farlo senza animare tutto ogni volta, confronto il numero di adesso con
 * quello del disegno precedente: se è cambiato, pulsa. Se è uguale, non succede
 * niente. Il primo disegno non pulsa mai: non c'è un "prima" con cui confrontare.
 */
const numeriMostrati = new Map();
function animaNumeriCambiati(zona) {
  if (!zona || typeof zona.querySelectorAll !== 'function') return;
  for (const nodo of zona.querySelectorAll('.fuoco')) {
    const chiave = nodo.dataset ? nodo.dataset.giorni : null;
    if (chiave === null || chiave === undefined) continue;
    const prima = numeriMostrati.get(nodo.id || 'fuoco');
    numeriMostrati.set(nodo.id || 'fuoco', chiave);
    // senza un valore precedente non c'è un cambiamento da mostrare
    if (prima !== undefined && prima !== chiave) numeroCambiato(nodo);
  }
}


/* ===================== Aura Shop ===================== */
const OGGETTI_AURA = [
  {id:'titolo-cardio',nome:'Cardio? Denunciami',tipo:'Titolo',rarita:'Comune',prezzo:1600,icona:'💀',descrizione:'La resistenza è un’opinione.'},
  {id:'titolo-tecnica',nome:'Tecnica discutibile',tipo:'Titolo',rarita:'Raro',prezzo:2400,icona:'🫠',descrizione:'Il peso sale. La forma… anche no.'},
  {id:'titolo-ego',nome:'Ego da 200 kg',tipo:'Titolo',rarita:'Epico',prezzo:3400,icona:'🗿',descrizione:'Il bilanciere pesa meno della tua autostima.'},
  {id:'titolo-riposo',nome:'Campione del giorno di riposo',tipo:'Titolo',rarita:'Epico',prezzo:3900,icona:'🛌',descrizione:'Prestazioni eccezionali nel non fare niente.'},
  {id:'titolo-specchio',nome:'Sotto contratto con lo specchio',tipo:'Titolo',rarita:'Leggendario',prezzo:4800,icona:'🪞',descrizione:'Una serie ogni tre selfie.'},
  {id:'titolo-panca',nome:'Panca e basta',tipo:'Titolo',rarita:'Raro',prezzo:2200,icona:'🏋️',descrizione:'Le gambe sono contenuto bonus.'},
  {id:'effetto-ambra',nome:'Scintille d’ambra',tipo:'Effetto',rarita:'Comune',prezzo:4500,icona:'✨',descrizione:'Particelle calde intorno al personaggio.'},
  {id:'effetto-ombra',nome:'Fumo d’ombra',tipo:'Effetto',rarita:'Raro',prezzo:5900,icona:'🌫️',descrizione:'Una scia scura, discreta e cattiva.'},
  {id:'effetto-fulmine',nome:'Scarica viola',tipo:'Effetto',rarita:'Epico',prezzo:7200,icona:'⚡',descrizione:'Lamp i viola e scariche elettriche'.replace('Lamp i','Lampi')},
  {id:'effetto-nebula',nome:'Nebulosa cosmica',tipo:'Effetto',rarita:'Leggendario',prezzo:8900,icona:'🌌',descrizione:'Una piccola galassia personale.'},
  {id:'armatura-guerriero-braci',nome:'Custode delle Braci',tipo:'Armatura',rarita:'Epico',prezzo:9200,classe:'guerriero',icona:'🛡️',descrizione:'Piastre roventi e mantello da prima linea.'},
  {id:'armatura-guerriero-abisso',nome:'Re dell’Abisso',tipo:'Armatura',rarita:'Leggendario',prezzo:13500,classe:'guerriero',icona:'👑',descrizione:'Armatura pesante con dettagli abissali.'},
  {id:'armatura-assassino-notte',nome:'Velo della Notte',tipo:'Armatura',rarita:'Epico',prezzo:9400,classe:'assassino',icona:'🥷',descrizione:'Corazza leggera, lame e cappuccio.'},
  {id:'armatura-assassino-spettro',nome:'Spettro Cremisi',tipo:'Armatura',rarita:'Leggendario',prezzo:13800,classe:'assassino',icona:'🩸',descrizione:'Silhouette furtiva con bagliori rossi.'},
  {id:'armatura-berserker-rabbia',nome:'Rabbia Antica',tipo:'Armatura',rarita:'Epico',prezzo:9800,classe:'berserker',icona:'🪓',descrizione:'Corna, metallo grezzo e furia pura.'},
  {id:'armatura-berserker-apocalisse',nome:'Ultimo Giorno',tipo:'Armatura',rarita:'Leggendario',prezzo:14500,classe:'berserker',icona:'🔥',descrizione:'Un set enorme che sembra uscito dalla fine del mondo.'},
  {id:'skin-mitica',nome:'Astrale — forma mitica',tipo:'Skin',rarita:'Mitico',prezzo:22000,icona:'🌠',descrizione:'Aspetto cosmico raro, solo estetico.'},
];
const CLASSE_AURA = {guerriero:'Guerriero',assassino:'Assassino',berserker:'Berserker'};

/**
 * Livello grafico dei cosmetici dello shop: si sovrappone all'illustrazione
 * originale, così l'armatura acquistata cambia davvero l'aspetto senza
 * sostituire o rovinare gli stati di progressione. Nessuna ala: le sagome sono
 * armature, mantelli, piastre e particelle attorno al personaggio.
 */
function svgCosmeticiRpg(armaturaId, effettoId, skinId) {
  const armature = {
    'armatura-guerriero-braci':
      '<g class="shop-armor-braci">' +
      '<path d="M275 354 L335 323 L407 350 L450 386 L493 350 L565 323 L625 354 L590 426 L535 410 L520 575 L478 620 L422 620 L380 575 L365 410 L310 426 Z" fill="#6b2417" fill-opacity=".76" stroke="#fb923c" stroke-width="13" stroke-linejoin="round"/>' +
      '<path d="M335 353 L394 373 L408 440 L370 421 Z M565 353 L506 373 L492 440 L530 421 Z" fill="#f97316" fill-opacity=".58" stroke="#fed7aa" stroke-width="7"/>' +
      '<path d="M410 388 L450 414 L490 388 L482 480 L450 513 L418 480 Z" fill="#7c2d12" stroke="#fbbf24" stroke-width="9"/>' +
      '<path d="M450 423 L460 449 L485 453 L466 470 L471 494 L450 481 L429 494 L434 470 L415 453 L440 449 Z" fill="#fde68a" stroke="#fff7ed" stroke-width="4"/>' +
      '<path d="M392 532 L420 560 L410 640 L374 628 Z M508 532 L480 560 L490 640 L526 628 Z" fill="#9a3412" fill-opacity=".78" stroke="#fb923c" stroke-width="8"/>' +
      '<path d="M300 385 L350 407 M600 385 L550 407 M420 535 L450 552 L480 535" fill="none" stroke="#fed7aa" stroke-width="8"/>' +
      '</g>',
    'armatura-guerriero-abisso':
      '<g class="shop-armor-abisso">' +
      '<path d="M270 357 L337 315 L405 348 L450 380 L495 348 L563 315 L630 357 L592 433 L535 413 L522 588 L480 630 L420 630 L378 588 L365 413 L308 433 Z" fill="#17142c" fill-opacity=".88" stroke="#a78bfa" stroke-width="13" stroke-linejoin="round"/>' +
      '<path d="M300 359 L348 340 L398 372 L375 423 L319 415 Z M600 359 L552 340 L502 372 L525 423 L581 415 Z" fill="#312e81" stroke="#c4b5fd" stroke-width="8"/>' +
      '<path d="M400 386 L450 408 L500 386 L486 499 L450 526 L414 499 Z" fill="#0f172a" stroke="#818cf8" stroke-width="10"/>' +
      '<path d="M450 425 L463 450 L491 453 L470 473 L476 501 L450 486 L424 501 L430 473 L409 453 L437 450 Z" fill="#c4b5fd"/>' +
      '<path d="M385 522 L420 550 L407 643 L369 625 Z M515 522 L480 550 L493 643 L531 625 Z" fill="#1e1b4b" stroke="#818cf8" stroke-width="8"/>' +
      '<path d="M359 334 L380 285 L400 348 M541 334 L520 285 L500 348 M415 362 L450 337 L485 362" fill="none" stroke="#ddd6fe" stroke-width="9" stroke-linejoin="round"/>' +
      '</g>',
    'armatura-assassino-notte':
      '<g class="shop-armor-velo">' +
      '<path d="M340 155 Q450 65 560 155 L535 295 L500 335 L400 335 L365 295 Z" fill="#11101d" fill-opacity=".84" stroke="#a78bfa" stroke-width="11"/>' +
      '<path d="M365 335 L418 320 L450 353 L482 320 L535 335 L510 474 L490 552 L450 583 L410 552 L390 474 Z" fill="#211b39" fill-opacity=".85" stroke="#8b5cf6" stroke-width="12"/>' +
      '<path d="M322 365 L380 342 L412 408 L390 488 L330 448 Z M578 365 L520 342 L488 408 L510 488 L570 448 Z" fill="#181426" fill-opacity=".82" stroke="#7c3aed" stroke-width="9"/>' +
      '<path d="M450 365 L474 410 L450 466 L426 410 Z" fill="#6d28d9" fill-opacity=".72" stroke="#ddd6fe" stroke-width="7"/>' +
      '<path d="M400 498 L423 535 L405 670 L378 630 Z M500 498 L477 535 L495 670 L522 630 Z" fill="#161323" stroke="#7c3aed" stroke-width="8"/>' +
      '<path d="M373 220 L410 250 M527 220 L490 250 M395 310 L450 330 L505 310" fill="none" stroke="#c4b5fd" stroke-width="7"/>' +
      '</g>',
    'armatura-assassino-spettro':
      '<g class="shop-armor-spettro">' +
      '<path d="M330 155 Q450 45 570 155 L537 293 L500 335 L400 335 L363 293 Z" fill="#350e1c" fill-opacity=".9" stroke="#f43f5e" stroke-width="13"/>' +
      '<path d="M365 337 L414 316 L450 355 L486 316 L535 337 L512 478 L490 558 L450 590 L410 558 L388 478 Z" fill="#4c1023" fill-opacity=".88" stroke="#fb7185" stroke-width="12"/>' +
      '<path d="M320 360 L378 335 L414 406 L386 495 L324 450 Z M580 360 L522 335 L486 406 L514 495 L576 450 Z" fill="#7f1d32" stroke="#fda4af" stroke-width="9"/>' +
      '<path d="M450 365 L482 425 L450 485 L418 425 Z" fill="#991b1b" stroke="#fecdd3" stroke-width="8"/>' +
      '<path d="M386 495 L420 535 L399 688 L370 638 Z M514 495 L480 535 L501 688 L530 638 Z" fill="#260813" stroke="#f43f5e" stroke-width="9"/>' +
      '<path d="M380 183 L412 220 M520 183 L488 220 M350 435 L386 465 M550 435 L514 465" stroke="#fecdd3" stroke-width="8" fill="none"/>' +
      '</g>',
    'armatura-berserker-rabbia':
      '<g class="shop-armor-rabbia">' +
      '<path d="M260 360 L324 300 L403 337 L450 380 L497 337 L576 300 L640 360 L598 438 L535 410 L522 585 L480 630 L420 630 L378 585 L365 410 L302 438 Z" fill="#29241a" fill-opacity=".86" stroke="#d6a84f" stroke-width="14" stroke-linejoin="round"/>' +
      '<path d="M306 352 L347 325 L402 364 L382 432 L318 421 Z M594 352 L553 325 L498 364 L518 432 L582 421 Z" fill="#66502b" stroke="#f5d078" stroke-width="9"/>' +
      '<path d="M310 335 L275 282 L340 315 M590 335 L625 282 L560 315" fill="#4b3a22" stroke="#f5d078" stroke-width="12" stroke-linejoin="round"/>' +
      '<path d="M404 382 L450 408 L496 382 L487 500 L450 530 L413 500 Z" fill="#44351f" stroke="#eabf5d" stroke-width="11"/>' +
      '<path d="M450 428 L464 455 L490 458 L470 477 L475 503 L450 488 L425 503 L430 477 L410 458 L436 455 Z" fill="#f5d078"/>' +
      '<path d="M385 520 L420 548 L408 644 L370 625 Z M515 520 L480 548 L492 644 L530 625 Z" fill="#282319" stroke="#d6a84f" stroke-width="9"/>' +
      '<path d="M359 405 L385 428 M541 405 L515 428 M409 563 L450 585 L491 563" fill="none" stroke="#fef3c7" stroke-width="7"/>' +
      '</g>',
    'armatura-berserker-apocalisse':
      '<g class="shop-armor-apocalisse">' +
      '<path d="M250 358 L322 292 L406 338 L450 377 L494 338 L578 292 L650 358 L603 445 L535 410 L524 594 L480 638 L420 638 L376 594 L365 410 L297 445 Z" fill="#160d0b" fill-opacity=".93" stroke="#f97316" stroke-width="14" stroke-linejoin="round"/>' +
      '<path d="M302 350 L345 318 L405 365 L381 433 L315 424 Z M598 350 L555 318 L495 365 L519 433 L585 424 Z" fill="#431407" stroke="#fb923c" stroke-width="10"/>' +
      '<path d="M315 328 L272 255 L343 306 M585 328 L628 255 L557 306 M373 330 L400 285 L420 348 M527 330 L500 285 L480 348" fill="#29100b" stroke="#fdba74" stroke-width="12" stroke-linejoin="round"/>' +
      '<path d="M402 381 L450 404 L498 381 L486 508 L450 537 L414 508 Z" fill="#2b100c" stroke="#f97316" stroke-width="11"/>' +
      '<path d="M450 410 L434 451 L458 465 L438 496 M474 432 L458 465 L480 488" fill="none" stroke="#fb923c" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M383 520 L420 550 L404 650 L368 628 Z M517 520 L480 550 L496 650 L532 628 Z" fill="#1c0c09" stroke="#ea580c" stroke-width="10"/>' +
      '</g>',
  };
  const effetti = {
    'effetto-ambra':
      '<g class="shop-fx-ambra" fill="#fdba74" stroke="#fb923c" stroke-width="5">' +
      '<path d="M164 270 l10 22 l22 10 l-22 10 l-10 22 l-10 -22 l-22 -10 l22 -10 Z"/><path d="M720 390 l8 18 l18 8 l-18 8 l-8 18 l-8 -18 l-18 -8 l18 -8 Z"/><path d="M205 660 l7 15 l15 7 l-15 7 l-7 15 l-7 -15 l-15 -7 l15 -7 Z"/><path d="M690 735 l7 15 l15 7 l-15 7 l-7 15 l-7 -15 l-15 -7 l15 -7 Z"/>' +
      '</g>',
    'effetto-ombra':
      '<g class="shop-fx-ombra" fill="#17142e" fill-opacity=".6"><path d="M110 450 Q180 390 220 470 T185 570 Q130 545 110 450Z"/><path d="M790 520 Q720 455 690 540 T725 640 Q775 615 790 520Z"/><path d="M120 810 Q190 760 220 835 T170 920 Q130 885 120 810Z"/><path d="M780 840 Q710 770 680 850 T730 930 Q770 900 780 840Z"/></g>',
    'effetto-fulmine':
      '<g class="shop-fx-fulmine" fill="none" stroke="#c4b5fd" stroke-width="13" stroke-linejoin="round" stroke-linecap="round"><path d="M185 250 L150 350 L195 340 L160 435"/><path d="M720 455 L680 545 L725 535 L690 625"/><path d="M220 800 L190 865 L225 860 L195 930"/><path d="M690 225 L660 292 L695 287 L670 360"/></g>',
    'effetto-nebula':
      '<g class="shop-fx-nebula" fill="#e9d5ff"><circle cx="178" cy="210" r="8"/><circle cx="720" cy="265" r="6"/><circle cx="150" cy="520" r="5"/><circle cx="745" cy="640" r="9"/><circle cx="190" cy="850" r="6"/><circle cx="700" cy="930" r="5"/><path d="M252 300 l9 20 l20 9 l-20 9 l-9 20 l-9 -20 l-20 -9 l20 -9 Z"/><path d="M650 790 l7 16 l16 7 l-16 7 l-7 16 l-7 -16 l-16 -7 l16 -7 Z"/></g>',
  };
  const skin = skinId === 'skin-mitica'
    ? '<g class="shop-skin-astrale" fill="none" stroke="#c4b5fd" stroke-width="6"><circle cx="450" cy="515" r="245" stroke-opacity=".34" stroke-dasharray="14 22"/><circle cx="450" cy="515" r="285" stroke-opacity=".19" stroke-dasharray="3 26"/><path d="M450 245 L465 282 L505 285 L475 310 L485 350 L450 328 L415 350 L425 310 L395 285 L435 282 Z" fill="#c4b5fd" fill-opacity=".5"/><path d="M280 480 l9 20 l20 9 l-20 9 l-9 20 l-9 -20 l-20 -9 l20 -9 Z M620 590 l8 17 l17 8 l-17 8 l-8 17 l-8 -17 l-17 -8 l17 -8 Z" fill="#e9d5ff"/></g>'
    : '';
  const contenuto = (armature[armaturaId] || '') + (effetti[effettoId] || '') + skin;
  if (!contenuto) return null;
  const div = el('div', { class: 'personaggio-cosmetici-overlay', aria: { hidden: 'true' } });
  div.innerHTML = '<svg class="personaggio-cosmetici-svg" viewBox="0 0 900 1350" preserveAspectRatio="none" aria-hidden="true" focusable="false">' + contenuto + '</svg>';
  return div;
}

function apriAnteprimaAura(oggetto, profilo, st) {
  const overlay = el('div', { class: 'aura-preview-overlay', role: 'dialog', aria: { modal: 'true', label: 'Anteprima ' + oggetto.nome } });
  const pannello = el('section', { class: 'aura-preview-panel' }, [
    el('div', { class: 'aura-preview-heading' }, [
      el('div', {}, [
        el('span', { class: 'aura-shop-kicker', testo: 'ANTEPRIMA · ' + oggetto.rarita.toUpperCase() }),
        el('h2', { testo: oggetto.nome }),
      ]),
      bottone('✕', { classe: 'fantasma aura-preview-close', titolo: 'Chiudi anteprima', onClick: () => overlay.remove() }),
    ]),
    el('p', { class: 'nota', testo: oggetto.descrizione }),
    el('div', { class: 'aura-preview-showcase' }, [
      el('span', { class: 'aura-preview-icon', testo: oggetto.icona }),
      el('strong', { testo: oggetto.tipo }),
      el('small', { testo: oggetto.classe ? CLASSE_AURA[oggetto.classe] : 'Cosmetico per il tuo personaggio' }),
    ]),
  ]);
  const personaggio = bloccoPersonaggio(profilo, st);
  personaggio.classList.add('aura-preview-character');
  const grafica = personaggio.querySelector('.personaggio-scena-grafica');
  const eq = { ...(profilo.equipaggiamento_aura || {}) };
  const slot = oggetto.tipo === 'Armatura' ? 'Armatura' : oggetto.tipo;
  if (oggetto.tipo === 'Titolo') {
    const titolo = personaggio.querySelector('.personaggio-titolo-equipaggiato');
    if (titolo) titolo.textContent = oggetto.icona + ' ' + oggetto.nome;
    else personaggio.querySelector('.personaggio-scena')?.appendChild(el('span', {
      class: 'personaggio-titolo-equipaggiato',
      testo: oggetto.icona + ' ' + oggetto.nome,
    }));
  } else if (grafica) {
    // La scheda del personaggio ha già il cosmetico attualmente equipaggiato:
    // rimuoviamo il vecchio SVG prima di disegnare la combinazione d'anteprima.
    grafica.querySelector('.personaggio-cosmetici-overlay')?.remove();
    if (oggetto.tipo === 'Armatura') {
      if (oggetto.classe === profilo.classe_rpg) grafica.classList.add('shop-' + oggetto.id);
      else pannello.appendChild(el('p', { class: 'aura-preview-warning', testo: 'Questa armatura è per ' + CLASSE_AURA[oggetto.classe] + '. Cambia classe per indossarla.' }));
    } else if (oggetto.tipo === 'Effetto' || oggetto.tipo === 'Skin') {
      grafica.classList.add('shop-' + oggetto.id);
    }
    const armatura = oggetto.tipo === 'Armatura' ? oggetto.id : eq.Armatura;
    const effetto = oggetto.tipo === 'Effetto' ? oggetto.id : eq.Effetto;
    const skin = oggetto.tipo === 'Skin' ? oggetto.id : eq.Skin;
    const overlaySvg = svgCosmeticiRpg(armatura, effetto, skin);
    if (overlaySvg) grafica.appendChild(overlaySvg);
  }
  pannello.appendChild(personaggio);
  pannello.appendChild(el('div', { class: 'aura-preview-footer' }, [
    el('span', { class: 'aura-shop-price', testo: '✧ ' + formattaAura(oggetto.prezzo) + ' Aura' }),
    bottone('Chiudi', { classe: 'fantasma', onClick: () => overlay.remove() }),
  ]));
  overlay.appendChild(pannello);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
  document.addEventListener('keydown', function chiudiAnteprima(event) {
    if (event.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', chiudiAnteprima);
    }
  }, { once: true });
  document.body.appendChild(overlay);
}

function vistaAuraShop(zona, soloInventario = false) {
  const st = statoMio();
  const profilo = profiloAttivo();
  const classe = String(profilo.classe_rpg || '').toLowerCase();
  const nomeClasse = CLASSE_AURA[classe] || 'Scegli una classe';
  // Inventario ricavato dalle spese registrate nel database ricompense:
  // così segue l'account e non resta legato soltanto al browser del telefono.
  const idAccountShop = accountAttivo();
  const posseduti = [...new Set((V.ricompense || [])
    .filter(r => r && r.account_id === idAccountShop && r.tipo === 'spesa_aura')
    .map(r => String(r.fonte || '').split(':')[1])
    .filter(Boolean))];
  const streak = Math.max(0, Number(st.fuoco && st.fuoco.giorni) || 0);
  if (!soloInventario) zona.appendChild(el('section',{class:'aura-shop-hero'},[
    el('div',{class:'aura-shop-kicker',testo:'✦ FORGE / COSMETICI ✦'}),
    el('h1',{testo:'Aura Shop'}),
    el('p',{class:'nota',testo:'La tua Aura, il tuo stile. Solo estetica: nessun vantaggio ai Rank.'}),
    el('div',{class:'aura-shop-wallet'},[
      el('span',{testo:'✧ AURA DISPONIBILE'}),
      el('strong',{testo:formattaAura(st.aura)}),
      el('small',{testo:'Classe: '+nomeClasse}),
    ]),
  ]));
  if (!soloInventario) {
    // L'anteprima usa la stessa figura del Profilo e aggiorna l'aspetto equipaggiato.
    const anteprimaShop = el('section', { class: 'aura-shop-character-preview' }, [
      el('div', { class: 'aura-shop-section-head' }, [
        el('div', {}, [
          el('h2', { testo: 'Anteprima del personaggio' }),
          el('p', { class: 'nota', testo: 'Equipaggia o togli un oggetto e guarda subito il risultato.' }),
        ]),
      ]),
    ]);
    anteprimaShop.appendChild(bloccoPersonaggio(profilo, st));
    zona.appendChild(anteprimaShop);
  }

  const mitica = el('section',{class:'aura-streak-mitica'+(streak>=80?' sbloccata':'' )},[
    el('div',{class:'aura-mitica-sigil',testo:'✹'}),
    el('div',{},[
      el('span',{class:'aura-shop-kicker',testo:'RICOMPENSA ESCLUSIVA · NON IN VENDITA'}),
      el('h2',{testo:'Corona dell’Infinito'}),
      el('p',{testo:'L’aura più rara: anello cosmico, particelle stellari e bagliore che pulsa attorno al personaggio.'}),
      el('strong',{testo:streak>=80?'✦ SBLOCCATA · 80 giorni raggiunti':Math.min(80,streak)+' / 80 giorni di streak'}),
      el('div',{class:'aura-shop-progress'},[el('span',{style:'width:'+Math.min(100,streak/80*100)+'%'})]),
      el('small',{testo:streak>=80?'Questa ricompensa resta tua: non serve comprarla.':'Allenati con costanza per sbloccare la più bella aura del gioco.'}),
    ]),
  ]);
  if (!soloInventario) zona.appendChild(mitica);
  const inventario=el('section',{class:'aura-shop-inventory',id:'mio-inventario'},[
    el('div',{class:'aura-shop-section-head'},[
      el('div',{},[el('h2',{testo:'Mio Inventario'}),el('p',{class:'nota',testo:posseduti.length+' oggetti acquistati'})]),
    ]),
    el('div',{class:'aura-shop-owned-grid'}),
  ]);
  const ownedGrid=inventario.querySelector('.aura-shop-owned-grid');
  const oggettiPosseduti=OGGETTI_AURA.filter(o=>posseduti.includes(o.id));
  // Equipaggiamento persistente sul profilo: equipaggiare non consuma né elimina l'oggetto.
  const equipaggiamento = { ...(profilo.equipaggiamento_aura || {}) };
  const slotOggetto = (o) => o.tipo === 'Armatura' ? 'Armatura' : o.tipo;
  const salvaEquipaggiamento = async (slot, id) => {
    const profiloCorrente = profiloAttivo();
    const prossimo = { ...(profiloCorrente.equipaggiamento_aura || {}) };
    if (id) prossimo[slot] = id; else delete prossimo[slot];

    // Aggiorna subito il profilo in memoria e IndexedDB: il testo del pulsante
    // non deve dipendere da una sincronizzazione remota o da un vecchio render.
    profiloCorrente.equipaggiamento_aura = prossimo;
    await db.salva('profili', { ...profiloCorrente, equipaggiamento_aura: prossimo });
    await ricaricaTutto();

    // Alcuni pull remoti possono restituire per un istante il profilo precedente.
    // Ripristina la scelta appena salvata nella vista locale e ridisegna la scheda.
    const profiloAggiornato = profiloAttivo();
    if (profiloAggiornato) profiloAggiornato.equipaggiamento_aura = prossimo;
    disegna();
  };
  if(!oggettiPosseduti.length) ownedGrid.appendChild(el('p',{class:'nota',testo:'Ancora vuoto. Scegli un oggetto qui sotto per iniziare la collezione.'}));
  for(const o of oggettiPosseduti) {
    const slot = slotOggetto(o);
    const indossato = equipaggiamento[slot] === o.id;
    const riga = el('div',{class:'aura-shop-owned'+(indossato?' equipaggiato':'' )},[
      el('span',{testo:o.icona}),el('strong',{testo:o.nome}),
      el('small',{testo:o.tipo+(o.classe?' · '+CLASSE_AURA[o.classe]:'')}),
      el('small',{class:'equip-status',testo:indossato?'✓ Equipaggiato':'Nella collezione'}),
      el('div',{class:'aura-shop-card-actions'},[
        bottone('Anteprima',{
          classe:'fantasma aura-shop-preview-btn',
          onClick:()=>apriAnteprimaAura(o, profiloAttivo(), statoMio()),
        }),
        bottone(indossato?'Disequipaggia':'Equipaggia',{
          classe:indossato?'fantasma':'principale',
          onClick:async()=>{
            const nuovoStato = equipaggiamento[slot] !== o.id;
            const pulsante = riga.querySelector('button:last-child');
            if (pulsante) { pulsante.textContent = nuovoStato ? 'Disequipaggia' : 'Equipaggia'; pulsante.classList.toggle('principale', nuovoStato); pulsante.classList.toggle('fantasma', !nuovoStato); }
            const status = riga.querySelector('.equip-status');
            if (status) status.textContent = nuovoStato ? '✓ Equipaggiato' : 'Nella collezione';
            riga.classList.toggle('equipaggiato', nuovoStato);
            if (nuovoStato) equipaggiamento[slot] = o.id; else delete equipaggiamento[slot];
            try { await salvaEquipaggiamento(slot, nuovoStato ? o.id : null); }
            catch(err) { avviso('Non sono riuscito a salvare l’equipaggiamento. Riprova con internet attivo.',{tipo:'errore'}); }
          }
        })
      ])
    ]);
    ownedGrid.appendChild(riga);
  }
  if (soloInventario) {
    zona.appendChild(inventario);
    return;
  }
  const filtri=el('div',{class:'aura-shop-filters'});
  const catalogo=el('section',{class:'aura-shop-catalogo'});
  zona.appendChild(el('div',{class:'aura-shop-section-head',id:'aura-shop-catalogo'},[
    el('div',{},[el('h2',{testo:'La collezione'}),el('p',{class:'nota',testo:'Prezzi alti il giusto: risparmia per i pezzi leggendari.'})])
  ]));
  const griglia=el('div',{class:'aura-shop-grid'});
  catalogo.appendChild(griglia);
  let filtro='Tutti';
  for(const f of ['Tutti','Titolo','Effetto','Armatura','Skin']){
    filtri.appendChild(bottone(f,{classe:'fantasma aura-shop-filter'+(filtro===f?' attivo':''),onClick:()=>{
      filtro=f;
      for(const b of filtri.querySelectorAll('button')) b.classList.toggle('attivo',b.textContent===f);
      disegnaOggetti();
    }}));
  }
  zona.appendChild(filtri); zona.appendChild(catalogo);
  function disegnaOggetti(){
    svuota(griglia);
    const elenco=OGGETTI_AURA.filter(o=>(filtro==='Tutti'||o.tipo===filtro)&&(!o.classe||o.classe===classe));
    if(!elenco.length) griglia.appendChild(el('p',{class:'nota',testo:'Per vedere le armature di questa classe, selezionala nella sezione personaggio del Profilo.'}));
    for(const o of elenco){
      const owned=posseduti.includes(o.id);
      const card=el('article',{class:'aura-shop-card rarita-'+o.rarita.toLowerCase()},[
        el('div',{class:'aura-shop-card-top'},[
          el('span',{class:'aura-shop-item-icon',testo:o.icona}),
          el('span',{class:'aura-shop-rarity',testo:o.rarita}),
        ]),
        el('span',{class:'aura-shop-item-type',testo:o.tipo+(o.classe?' · '+CLASSE_AURA[o.classe]:'')}),
        el('h3',{testo:o.nome}),
        el('p',{class:'nota',testo:o.descrizione}),
        el('div',{class:'aura-shop-price',testo:'✧ '+formattaAura(o.prezzo)+' Aura'}),
        el('div',{class:'aura-shop-card-actions'},[
          bottone('Anteprima',{
            classe:'fantasma aura-shop-preview-btn',
            onClick:()=>apriAnteprimaAura(o, profiloAttivo(), statoMio()),
          }),
          bottone(owned?'✓ Già acquistato':(Number(st.aura)<o.prezzo?'Aura insufficienti':'Acquista'),{
          classe:owned?'fantasma':'principale',
          disabled:owned||Number(st.aura)<o.prezzo,
          onClick:async()=>{
            if(posseduti.includes(o.id)) return;
            if(Number(st.aura)<o.prezzo){avviso('Non hai abbastanza Aura.',{tipo:'errore'});return;}
            const conferma=await chiediConferma('Comprare '+o.nome+'?','Spenderai '+formattaAura(o.prezzo)+' Aura. L’acquisto non si ripete e l’oggetto resta nell’inventario.');
            if(!conferma) return;
            // Le spese sono registrate come righe negative nella tabella ricompense:
            // il saldo mostrato dall'app resta la fonte di verità, senza inventare Aura.
            const account=accountAttivo();
            const fonte='shop:'+o.id+':'+Date.now();
            try{
              const spesa={id:'spesa-'+fonte,account_id:account,tipo:'spesa_aura',fonte,aura:-o.prezzo,xp:0,descrizione:'Aura Shop: '+o.nome,data:new Date().toISOString()};
              await db.salva('ricompense',spesa);
              if (Array.isArray(V.ricompense)) V.ricompense.push(spesa);
              posseduti.push(o.id);
              avviso(o.nome+' acquistato! Aura spesa: '+formattaAura(o.prezzo),{tipo:'ok'});
              disegna();
            }catch(e){console.error(e);avviso('Acquisto non salvato: riprova quando la connessione è stabile.',{tipo:'errore'});}
          },
          }),
        ]),
      ]);
      griglia.appendChild(card);
    }
  }
  disegnaOggetti();
}

function disegnaDentro(zona) {
  zona.appendChild(cornice());
  const contenuto = el('main', { class: 'contenuto', id: 'contenuto' });
  zona.appendChild(contenuto);
  disegnaStatoSalvataggio();

  const rotta = (window.location.hash || '#/').replace(/^#/, '');
  if (rotta === '/' || rotta === '') vistaHome(contenuto);
  else if (rotta === '/casa') vistaCasa(contenuto);
  else if (rotta === '/rank' || rotta === '/ranki') vistaRank(contenuto);
  else if (rotta.startsWith('/esercizio/')) vistaEsercizio(contenuto, rotta.split('/')[2]);
  else if (rotta === '/amici') vistaAmici(contenuto);
  else if (rotta === '/aura-shop') vistaAuraShop(contenuto, false);
  else if (rotta === '/aura-shop/inventario') vistaAuraShop(contenuto, true);
  else if (rotta.startsWith('/amico/')) vistaAmico(contenuto, rotta.split('/')[2]);
  else if (rotta === '/profilo') vistaProfilo(contenuto);
  else if (rotta.startsWith('/giorno/')) vistaGiorno(contenuto, rotta.split('/')[2]);
  else if (rotta.startsWith('/seduta/')) vistaSeduta(contenuto, rotta.split('/')[2]);
  else if (rotta === '/scheda') vistaScheda(contenuto);
  else if (rotta === '/storico') vistaStorico(contenuto);
  else if (rotta.startsWith('/storico/')) vistaSedutaPassata(contenuto, rotta.split('/')[2]);
  else if (rotta === '/progressi') vistaProgressi(contenuto);
  else if (rotta === '/impostazioni') vistaImpostazioni(contenuto);
  else vistaHome(contenuto);
}

function cornice() {
  const rotta = (window.location.hash || '#/').replace(/^#/, '');
  // la voce del menu in cui ti trovi viene accesa: così sai sempre dove sei
  const voceAttiva = (percorso) => {
    if (percorso === '/') return rotta === '/' || rotta === '' || rotta.startsWith('/giorno') || rotta.startsWith('/seduta') || rotta.startsWith('/scheda');
    return rotta === percorso || rotta.startsWith(percorso + '/');
  };
  const voce = (href, etichetta, percorso) => el('a', {
    href: '#' + percorso,
    class: 'voce-menu' + (voceAttiva(percorso) ? ' attiva' : ''),
  }, [
    el('span', {
      class: 'icona-menu',
      html: ICONE_MENU[chiaveIcona(percorso)]
        ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONE_MENU[chiaveIcona(percorso)] + '</svg>'
        : '',
    }),
    el('span', { class: 'parola-menu', testo: etichetta }),
  ]);

  // LE ICONE DEL MENU (22/10/2026).
  //
  // Ste ha mandato la foto della barra che vuole: ogni voce ha la sua icona
  // SOPRA la parola. Le icone sono disegnate qui (linee, non immagini): si
  // colorano con il colore della voce, quindi la voce attiva si accende
  // tutta, e non c’è nessun file da caricare.
  const ICONE_MENU = {
    allenamento: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
    rank: '<path d="M12 3l7 2.8v5.4c0 4.2-2.9 7.6-7 9.4-4.1-1.8-7-5.2-7-9.4V5.8L12 3z"/><path d="M12 9.2l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5 1.5-3z"/>',
    storico: '<path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1"/><path d="M3.2 4.4v4.2h4.2"/><path d="M12 7.6V12l3 1.8"/>',
    casa: '<path d="M3.6 11.2L12 4l8.4 7.2"/><path d="M5.6 10v9.6h12.8V10"/><path d="M10 19.6v-5.4h4v5.4"/>',
    profilo: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.2c0-3.7 3.2-5.6 7.2-5.6s7.2 1.9 7.2 5.6"/>',
  };

  /** Quale icona mettere a una voce, dal suo percorso. */
  function chiaveIcona(percorso) {
    if (percorso === '/') return 'allenamento';
    if (percorso === '/rank') return 'rank';
    if (percorso === '/storico') return 'storico';
    if (percorso === '/casa') return 'casa';
    if (percorso === '/profilo') return 'profilo';
    return '';
  }

  // La barra in basso: cinque voci, e sono le cinque schermate per cui Ste apre
// l'app. Prima c'erano Allenamento, Casa, Rank, Amici e Profilo: lo STORICO non
// c'era, ed è la schermata che lui apre di meno ("andare a trovare lo storico è
// un'impresa", 07/10/2026). Quindi Storico entra e Amici esce dalla barra: non
// sparisce, è nelle scorciatoie di Casa e Profilo (senza quei link sarebbe
// irraggiungibile, perché nella lista amici si arriva solo da lì).
//
// L'ordine è per quanto si usa: allenarsi, vedere quanto sei forte, rivedere
// cosa hai fatto, il gioco, e il tuo profilo.
if (rotta === '/aura-shop' || rotta === '/aura-shop/inventario') {
    const isInventario = rotta === '/aura-shop/inventario';
    const voceIndietro = el('a', {
      href: '#/profilo',
      class: 'voce-menu voce-menu-indietro',
      'aria-label': 'Torna al profilo',
      title: 'Torna al profilo',
    }, [
      el('span', { class: 'icona-menu', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' }),
      el('span', { class: 'parola-menu', testo: 'Indietro' }),
    ]);
    const voceShop = el('a', {
      href: '#/aura-shop',
      class: 'voce-menu' + (!isInventario ? ' attiva' : ''),
    }, [
      el('span', { class: 'icona-menu', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18l-2 13H5L3 7Z"/><path d="M8 7a4 4 0 0 1 8 0"/></svg>' }),
      el('span', { class: 'parola-menu', testo: 'Shop' }),
    ]);
    const voceInventario = el('a', {
      href: '#/aura-shop/inventario',
      class: 'voce-menu' + (isInventario ? ' attiva' : ''),
    }, [
      el('span', { class: 'icona-menu', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13a1.5 1.5 0 0 1-1.5-1.5v-13Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>' }),
      el('span', { class: 'parola-menu', testo: 'Inventario' }),
    ]);
    return el('div', { class: 'basso' }, [
      el('nav', { class: 'menu-basso menu-aura-shop', 'aria-label': 'Navigazione Aura Shop' }, [voceIndietro, voceShop, voceInventario]),
    ]);
  }

  const resto = el('div', { class: 'basso' }, [
    el('nav', { class: 'menu-basso' }, [
      voce('/', 'Allenamento', '/'),
      voce('/rank', 'Rank', '/rank'),
      voce('/storico', 'Storico', '/storico'),
      voce('/casa', 'Casa', '/casa'),
      voce('/profilo', 'Profilo', '/profilo'),
    ]),
    // LA VERSIONE, SEMPRE VISIBILE.
    //
    // Ste (10/10/2026): "ma non è cambiato nulla", e quattro volte in due giorni.
    // In tutti e quattro i casi la copia giusta era online e il telefono mostrava
    // quella di prima: senza un numero a vista non c'è modo di accorgersene, e ogni
    // volta si rifaceva la stessa conversazione.
    //
    // È un numero piccolo e spento nell'angolo, sopra la barra: non distrae e basta
    // guardarlo. Se dice 105 e tu vedi il personaggio di prima, il problema è la copia
    // vecchia e lo dice subito.
    el('div', { class: 'versione-app', testo: 'v' + (window.PALESTRA_VERSIONE || '?') }),
  ]);
  return resto;
}

/**
 * Misura la barra di stato in alto e dice al CSS quanto È alta.
 *
 * Senza questo, tutto quello che sta "appiccicato" sotto (il cronometro della
 * seduta) finiva sotto la barra o la tagliava: la barra cresce quando il
 * messaggio va a capo, e a seconda del telefono cresce di più o di meno.
 * Quindi invece di indovinare un numero fisso nei CSS, lo calcolo qui.
 */
function misuraBarraInAlto(barra) {
  if (!barra) return;
  const applica = () => {
    const h = Math.ceil(barra.getBoundingClientRect ? barra.getBoundingClientRect().height : 0);
    if (h <= 0) return;
    document.documentElement.style.setProperty('--altezza-barra-in-alto', h + 'px');
    // anche il contenuto deve scendere di altrettanto, altrimenti il primo
    // titolo finisce sotto la barra
    const app = document.getElementById('app');
    if (app) app.classList.toggle('sotto-barra-alta', h > 34);
  };
  applica();
  if (typeof ResizeObserver === 'function') {
    try {
      if (!barra.__osservato) {
        barra.__osservato = new ResizeObserver(applica);
        barra.__osservato.observe(barra);
      }
    } catch { /* se il browser non collabora, resta il valore del primo giro */ }
  }
}

function disegnaStatoSalvataggio() {
  const contenitore = document.getElementById('stato-salvataggio');
  if (!contenitore) return;
  sync.stato().then((s) => {
    svuota(contenitore);
    contenitore.appendChild(el('span', { class: 'pallino-stato pallino-' + s.colore }));
    contenitore.appendChild(el('span', { class: 'testo-stato', testo: s.testo }));
    // la versione sempre in vista: se non cambia, il telefono ha la copia vecchia
    contenitore.appendChild(el('span', { class: 'versione-app', testo: 'v' + (window.PALESTRA_VERSIONE || '?'), title: 'Se la spunta non ti parte, chiudi l\'app e la riapri' }));
    contenitore.title = s.dettaglio;
    disegnaBarraGioco(contenitore);
    misuraBarraInAlto(contenitore);
  });
  const conflitti = document.getElementById('avviso-conflitti');
  if (conflitti) {
    if (V.conflitti.length) {
      const n = V.conflitti.length;
      svuota(conflitti).appendChild(
        el('a', {
          href: '#/impostazioni', class: 'tape-conflitti',
          testo: `${n} ${n === 1 ? 'conflitto da' : 'conflitti da'} scegliere`,
        }),
      );
    } else {
      svuota(conflitti);
    }
  }
}
async function aggiornaStatoSalvataggio() {
  V.conflitti = await sync.conflittiDaScegliere();
  disegnaStatoSalvataggio();
}

/* ===================== vista: home ===================== */

function vistaHome(zona) {
  const v = versioneCorrente();
  if (!v) {
    zona.appendChild(el('p', { testo: 'Nessuna scheda trovata.' }));
    return;
  }
  const giorni = (v.snapshot && v.snapshot.giorni) || [];

  // La scheda ha un ordine: mostra quale giorno viene dopo l'ultima seduta
  // completata nella versione attuale, senza cambiare l'ordine o avviare nulla.
  const seduteCompletate = seduteDellaPersona()
    .filter((s) => s && !s.eliminata && s.stato === 'completata' && s.versione_id === v.id)
    .sort((a, b) => String(b.ora_fine || b.data || '').localeCompare(String(a.ora_fine || a.data || '')));
  const ultimaGiornataId = seduteCompletate[0] && seduteCompletate[0].giorno_id;
  const indiceUltimaGiornata = giorni.findIndex((g) => g.id === ultimaGiornataId);
  const indiceProssimaGiornata = giorni.length
    ? (indiceUltimaGiornata < 0 ? 0 : (indiceUltimaGiornata + 1) % giorni.length)
    : -1;

  zona.appendChild(el('div', { id: 'zona-avviso' }));

  // Ogni persona usa il proprio link: non mostrare un selettore che fa sembrare
  // l'account di Andrea parte del profilo di Stefano. Gli amici si aprono da Amici.
  
  // Se cÈ una seduta aperta, questa È la cosa più importante della schermata:
  // la metto in cima, grossa, prima ancora del titolo. Se chiudi l'app a meta'
  // allenamento la trovi subito e la riprendi.
  // Solo la seduta di QUESTA persona, per lo stesso motivo di `iniziaAllenamento`.
  const vCorrente = versioneCorrente();
  db.sedutaInCorso(vCorrente && vCorrente.id).then((attiva) => {
    const avvisoSeduta = document.getElementById('zona-avviso');
    if (!attiva || !avvisoSeduta) return;
    const quante = V.serie.filter((x) => x.seduta_id === attiva.id && !x.eliminata).length;
    const fatte = V.serie.filter((x) => x.seduta_id === attiva.id && !x.eliminata && eFatta(x)).length;
    svuota(avvisoSeduta).appendChild(el('div', { class: 'tape tape-viola tape-grande' }, [
      el('div', { class: 'cresci' }, [
        el('strong', { testo: 'Allenamento in corso' }),
        el('div', { class: 'nota', testo: `${attiva.nome_giorno || 'Seduta'} del ${dataLeggibile(attiva.data)} · iniziato alle ${oraLocale(attiva.ora_inizio)}` }),
        el('div', { class: 'nota nota-chiaro', testo: quante ? `${fatte} serie fatte su ${quante}` : 'Nessuna serie ancora' }),
      ]),
      bottone('Riprendi', { onClick: () => vai('/seduta/' + attiva.id), classe: 'principale grande' }),
    ]));
  });

  zona.appendChild(el('div', { class: 'riga-titoli' }, [
    el('h1', { testo: scheda() ? scheda().nome : 'Palestra' }),
    bottone('Modifica scheda', { onClick: () => vai('/scheda'), classe: 'fantasma' }),
  ]));
  zona.appendChild(el('p', { class: 'nota', testo: `Versione della scheda numero ${v.numero}. Se la modifichi le sedute passate non cambiano mai.` }));

  for (const g of giorni) {
    const ultimo = ultimaSedutaDelGiorno(g.id);
    const opzionali = (g.esercizi || []).filter((e) => e.opzionale).length;
    const serie = (g.esercizi || []).reduce((a, e) => a + (e.serie ? e.serie.length : 0), 0);
    const griglia = el('div', { class: 'griglia-esercizi' });
    for (const es of (g.esercizi || [])) {
      const e = esercizioPerId(es.esercizio_id);
      if (!e) continue;
      griglia.appendChild(el('div', { class: 'pillola-esercizio' }, [
        el('img', { src: e.foto, alt: '', class: 'foto-esercizio', loading: 'lazy' }),
        // il muscolo sta nel nome: qui lo spazio è una pillola col cerchietto da 30 px,
        // e la foto da sola fa leggere il disegno al contrario (vedi `muscoliDiEsercizio`)
        el('span', { testo: nomeConMuscolo(e, { soloPrincipale: true }) }),
        es.opzionale ? el('span', { class: 'tag-opzionale', testo: 'opzionale' }) : null,
      ]));
    }
    zona.appendChild(el('section', { class: 'scheda-giorno' }, [
      el('div', { class: 'riga-titoli' }, [
        // il nome del giorno si può toccare per vedere la scheda senza allenarsi
        el('a', { href: '#/giorno/' + g.id, class: 'titolo-collegabile', testo: g.nome }),
        indiceProssimaGiornata >= 0 && giorni[indiceProssimaGiornata].id === g.id
          ? el('span', { class: 'tag-prossimo-giorno', testo: 'Prossimo nel giro' })
          : null,
        el('span', { class: 'conteggio', testo: `${g.esercizi.length} esercizi · ${serie} serie` + (opzionali ? ` · ${opzionali} opzionali` : '') }),
      ]),
      griglia,
      el('div', { class: 'riga-pulsanti' }, [
        bottone('Inizia allenamento', { onClick: () => iniziaAllenamento(g), classe: 'principale grande' }),
        el('a', { href: '#/giorno/' + g.id, class: 'bottone-guarda', testo: 'Vedi la scheda del giorno' }),
      ]),
      el('div', { class: 'riga-pulsanti piccolo' }, [
        el('span', { class: 'nota', testo: ultimo ? `Ultima volta: ${dataLeggibile(ultimo.data)}` : 'Non hai ancora allenato questo giorno.' }),
      ]),
    ]));
  }
}

function ultimaSedutaDelGiorno(giornoId) {
  // filtrata sulla persona: i giorni si chiamano "giorno-1" per tutti, quindi
  // senza questo filtro si vedrebbe anche la seduta dell'altra persona
  const proprie = seduteDellaPersona().filter((s) => s.giorno_id === giornoId && s.stato === 'completata' && !s.eliminata);
  if (!proprie.length) return null;
  return proprie.sort((a, b) => String(b.data).localeCompare(String(a.data)))[0];
}

async function iniziaAllenamento(giorno) {
  // Solo la seduta di QUESTA persona: una sessione lasciata aperta da un altro
  // profilo sullo stesso dispositivo non deve bloccare l'allenamento.
  const v = versioneCorrente();
  const attiva = await db.sedutaInCorso(v && v.id);
  if (attiva) {
    const ok = await chiediConferma(
      'C\'e\' gia\' un allenamento in corso',
      'Puoi tenere una sola seduta aperta per volta. Vuoi continuare quella di prima?',
      { testoOk: 'Continua quella', testoAnnulla: 'Annulla' },
    );
    if (ok) vai('/seduta/' + attiva.id);
    return;
  }
  const versione = versioneCorrente();
  const seduta = await apriSeduta({ scheda_id: schedaAttivaId(), versione, giorno });
  // IMPORTANTISSIMO: senza questo ricaricamento le serie appena create non
  // sarebbero a schermo, e "+ Aggiungi serie" calcolerebbe l'ordine sbagliato.
  await ricaricaTutto();
  vai('/seduta/' + seduta.id);
}

/* ===================== il nome del muscolo, da mettere OVUNQUE c'è la foto
   ===================== */

/**
 * Ste, 15/10/2026: "nei dips c'è segnato evidenziato nella foto l'avambraccio, non
 * il tricipite" e "nei pull ups ci sono segnati anche tricipiti". Aveva ragione nel
 * modo peggiore: la foto non può essere sbagliata e basta, perché qualcuno la legge e
 * ci fa su un giudizio.
 *
 * IL FATTO. Le foto sono illustrazioni di pixel e NON hanno un sistema di
 * evidenziazione del muscolo: il pezzo chiaro che si vede è l'illuminazione del
 * disegno, e cade dove capita. Su 27 foto una sola (`incline-single-arm-pulldown`) ha
 * la sagoma chiara disegnata apposta: il set è fatto a pezzi. Quindi la foto non
 * può essere la fonte, e non si può correggere toccando una riga di codice.
 *
 * LA SCELTA. Il nome del muscolo va scritto VICINO alla foto, in ogni schermata in cui
 * compare, così la foto smette di essere ambigua anche quando è sola in una lista. Il
 * posto naturale è il nome dell'esercizio, che c'è già in tutte e sei le viste.
 *
 * LE ETICHETTE sono i GRUPPI ('tricipite', 'petto'), non le frasi dei pezzi ('tricipite:
 * sopra il gomito'): quelle si leggono bene nella scheda e non stanno in una riga.
 * E un secondario il cui nome è già dentro quello del principale viene scartato
 * ('dorso' dentro 'dorso centrale'), altrimenti si legge "dorso centrale + dorso".
 */

/** I gruppi come li chiama Ste, non come li chiama il codice. */
const MUSCOLO_ETICHETTA = {
  petto: 'petto',
  dorsale: 'dorso',
  // I romboidi sono centro schiena, non lombari.
  romboidi: 'centro schiena',
  trapezio: 'trapezi',
  deltoide_fronte: 'deltoide',
  deltoide_posteriore: 'deltoide dietro',
  bicipite: 'bicipiti',
  tricipite: 'tricipiti',
  // il brachiale e il brachioradiale non avevano un'etichetta: sulla scheda quegli
  // esercizi comparivano col nome e nient'altro (Ste, 21/10/2026)
  brachiale: 'brachiale',
  brachioradiale: 'brachioradiale',
  avambraccio: 'avambraccio',
  quadricipite: 'quadricipiti',
  femorale: 'femorali',
  polpaccio: 'polpacci',
  glutei: 'glutei',
  addome: 'addome',
};

function etichettaMuscolo(gruppo) {
  return MUSCOLO_ETICHETTA[gruppo] || null;
}

/**
 * LE ETICHETTE CHE ARRIVANO DAL PEZZO, non dal gruppo (Ste, 21/10/2026).
 *
 * I tre deltoidi stanno nello stesso gruppo (quello davanti), ma sono tre muscoli
 * diversi: senza questo il filtro ne mostrava uno solo. E i trapezi hanno il loro nome.
 */
const ETICHETTE_PARTE = {
  dorso_basso: 'bassa schiena (lombari)',
  spalle_frontali: 'deltoide avanti',
  spalle_laterali: 'deltoide laterale',
  spalle_posteriori: 'deltoide dietro',
  dorso_alto: 'trapezi',
};

/**
 * Il pezzo di muscolo di un esercizio, come stringa breve.
 * `soloPrincipale` serve dove lo spazio è poco (la pillola col cerchietto da 30 px).
 */
function muscoliDiEsercizio(e, { soloPrincipale = false } = {}) {
  const parte = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
  if (!parte || !parte.trovata) return '';
  const principale = etichettaMuscolo(parte.gruppoPrincipale);
  if (!principale) return '';
  if (soloPrincipale) return principale;
  const secondari = [];
  for (const s of (parte.ancheDettaglio || [])) {
    const g = etichettaMuscolo(s.gruppo);
    if (!g) continue;
    if (g === principale || g.includes(principale) || principale.includes(g)) continue;
    if (secondari.includes(g)) continue;
    secondari.push(g);
  }
  return secondari.length ? `${principale} + ${secondari.join(', ')}` : principale;
}

/** Il nome dell'esercizio con il muscolo, da mettere accanto alla foto. */
function nomeConMuscolo(e, opts) {
  const muscoli = muscoliDiEsercizio(e, opts);
  return muscoli ? `${e.nome} · ${muscoli}` : e.nome;
}

async function creaSerie(sedutaId, esercizioId, ordine, esercizio, prevista = {}) {
  return db.salva('serie', nuovaSerie({ seduta_id: sedutaId, esercizio_id: esercizioId, ordine, esercizio, prevista }));
}

/* ===================== vista: giorno ===================== */

/* ===================== vista: giorno ===================== */

// id del giorno che sto modificando dalla pagina del giorno, oppure null
let giornoInModifica = null;

function vistaGiorno(zona, giornoId) {
  const v = versioneCorrente();
  if (!v) { zona.appendChild(el('p', { testo: 'Giorno non trovato.' })); return; }

  // Ste ha chiesto di poter modificare la scheda anche da questa schermata
  // ("quando apro soltanto la scheda posso anche modificarla"). Uso la stessa
  // bozza e lo stesso "salva come nuova versione" della vista di modifica:
  // le sedute già fatte restano intatte, non si riscrive mai la storia.
  // La pagina parte SEMPRE da sola lettura: si entra in modifica solo se lo
  // chiede lui con il bottone.
  const inModifica = giornoInModifica === giornoId;
  const bozza = inModifica ? prendiBozza() : null;
  const g = inModifica
    ? ((bozza.giorni || []).find((x) => x.id === giornoId))
    : ((v && v.snapshot && v.snapshot.giorni) || []).find((x) => x.id === giornoId);
  if (!g) { zona.appendChild(el('p', { testo: 'Giorno non trovato.' })); return; }
  const ultimo = ultimaSedutaDelGiorno(giornoId);
  const opzionali = (g.esercizi || []).filter((x) => x.opzionale).length;
  const totaleSerie = (g.esercizi || []).reduce((a, x) => a + ((x.serie || []).length), 0);

  zona.appendChild(el('a', { href: '#/', class: 'indietro', testo: '← tutti i giorni' }));
  zona.appendChild(el('h1', { testo: g.nome }));

  // SE DUE ESERCIZI FANNO LO STESSO LAVORO. Ste: "ci sono esercizi che per
  // esempio servono per la parte alta e altri esercizi che servono per la
  // parte bassa del petto". È anche vero il contrario: due esercizi spesso
  // finiscono per lavorare lo stesso pezzo di muscolo. Se è il caso te lo
  // dico, così non scopri dopo due mesi che era tutto lo stesso.
  const pezzi = (g.esercizi || [])
    .map((es) => {
      const e2 = esercizioPerId(es.esercizio_id);
      if (!e2) return null;
      const p = parteDiMuscolo({ nome: e2.nome, descrizione: e2.nota_permanente || '' });
      return p.trovata ? { nome: e2.nome, parte: p } : null;
    })
    .filter(Boolean);
  const doppioni = [];
  for (let i = 0; i < pezzi.length; i++) {
    for (let j = i + 1; j < pezzi.length; j++) {
      if (stessoLavoro(pezzi[i].parte, pezzi[j].parte)) {
        doppioni.push([pezzi[i].nome, pezzi[j].nome, pezzi[i].parte.nome]);
      }
    }
  }
  if (doppioni.length) {
    zona.appendChild(el('div', { class: 'tape-duplicati' }, [
      el('strong', { testo: 'Attenzione: due esercizi fanno lo stesso lavoro' }),
      el('p', {}, doppioni.map((d) => `${d[0]} e ${d[1]} lavorano entrambi: ${d[2]}.`)),
      el('p', { class: 'nota nota-piccola', testo: AVVERTIMENTO_PARTI }),
    ]));
  }
  // Ste: "deve capire cosa lavora quell'esercizio e quindi capire se È
  // difficile o facile". Ecco il secondo pezzo: se due esercizi sono sullo
  // stesso muscolo, l'app li mette in fila dal facile al duro. Serve più
  // del livello, perchÈ il livello dice "isolamento" e non dice quale dei
  // due ti fa sudare di più.
  const ordini = ordinePerMuscolo(g.esercizi);
  if (ordini.length) {
    zona.appendChild(el('div', { class: 'tape-duplicati' }, [
      el('strong', { testo: 'Dal piu\' facile al piu\' duro' }),
      el('p', {}, ordini.map((o) => o.frase)),
      el('p', {
        class: 'nota nota-piccola',
        testo: 'Il muscolo e\' piccolo e instabile? La difficolta\' sale anche con poco peso.',
      }),
    ]));
  }
  // finisci l'esercizio di tutte le serie con gli stessi esercizi di un mese
  // prima, fai questa cosa per giorno 1 giorno 2 giorno 3 e giorno 4".
  // Vale per tutti e quattro i giorni: qui mostro quello di questo giorno.
  const sedutaDelGiorno = ultimaSedutaDelGiorno(giornoId);
  if (sedutaDelGiorno && sedutaDelGiorno.stato === 'completata') {
    const mensile = confrontoGiorno({
      seduta: sedutaDelGiorno,
      serie: serieMie(),
      esercizi: V.esercizi,
      sedute: seduteMie(),
      peso: pesoCorporeoOra(),
    });
    if (mensile) {
      zona.appendChild(el('section', { class: 'blocco blocco-mensile' }, [
        el('h2', { testo: `Un mese fa (${dataLeggibile(mensile.dataRiferimento)})` }),
        el('p', { class: 'nota', testo: mensile.frase }),
        ...mensile.righe.map((r) => el('div', { class: 'riga-mensile' + (r.meglio ? ' meglio' : (r.peggio ? ' peggio' : '')) }, [
          el('span', { class: 'nota', testo: r.nome }),
          el('span', { class: 'cresci', testo: `${r.prima.testo} → ${r.ora.testo}` }),
          el('span', {
            class: 'nota',
            testo: r.stessa ? 'uguale' : (r.meglio ? '+' + r.differenzaLegibile : r.differenzaLegibile),
          }),
        ])),
      ]));
    }
  }
  zona.appendChild(el('div', { class: 'riga-titoli' }, [
    el('p', { class: 'nota', testo: [
      `${g.esercizi.length} esercizi · ${totaleSerie} serie`,
      opzionali ? `${opzionali} opzionali` : null,
      `versione scheda numero ${v.numero}`,
    ].filter(Boolean).join(' · ') }),
    inModifica
      ? bottone('Ho finito di modificare', {
        onClick: () => { giornoInModifica = null; disegna(); },
        classe: 'fantasma',
      })
      : bottone('Modifica questa scheda', {
        onClick: () => { giornoInModifica = giornoId; disegna(); },
        classe: 'principale',
      }),
  ]));
  if (!inModifica) {
    zona.appendChild(el('p', { class: 'nota nota-chiaro', testo: 'Stai solo guardando: non parte nessun allenamento e il cronometro non si avvia.' }));
  } else {
    zona.appendChild(el('div', { class: 'tape tape-viola' }, [
      el('div', { class: 'cresci' }, [
        el('strong', { testo: 'Stai modificando la scheda' }),
        el('div', { class: 'nota', testo: 'Cambia i kg, le rip e aggiungi o togli serie. Quando sei pronto salvi: nasce una versione nuova e le sedute gia\' fatte restano come sono.' }),
      ]),
    ]));
  }

  const griglia = el('div', { class: 'griglia-esercizi' });
  for (const es of (g.esercizi || [])) {
    const e = esercizioPerId(es.esercizio_id);
    if (!e) continue;
    const assistito = !convenzioneMisuraCarico(e.convenzione);
    const chiave = assistito ? 'peso_assistenza' : 'peso';

    // In modifica ogni serie diventa un campo scrivibile; senza modifica resta
    // come prima, cioe' solo da leggere.
    const seriePreviste = (es.serie || []).map((x, i) => {
      const rigaPrevista = el('span', { class: 'prevista' + (x.spotter ? ' prevista-spotter' : '') }, [
        el('span', { class: 'prevista-n', testo: String(i + 1) }),
      ]);
      if (inModifica) {
        const campoPeso = campoNumero(x[chiave], {
          etichetta: 'kg',
          onCambio: (val) => {
            const n = val === null || val === '' ? null : Number(String(val).replace(',', '.'));
            x[chiave] = Number.isFinite(n) ? n : null;
          },
        });
        campoPeso.classList.add('mini-campo');
        const campoRip = campoNumero(x.ripetizioni, {
          etichetta: 'rip',
          onCambio: (val) => {
            const n = val === null || val === '' ? null : Number(String(val).replace(',', '.'));
            x.ripetizioni = Number.isFinite(n) ? n : null;
          },
        });
        campoRip.classList.add('mini-campo');
        rigaPrevista.appendChild(campoPeso);
        rigaPrevista.appendChild(el('span', { class: 'prevista-x', testo: '×' }));
        rigaPrevista.appendChild(campoRip);
        rigaPrevista.appendChild(el('span', { class: 'sotto-campo', testo: assistito ? 'ZAVORRA' : 'KG / RIP' }));
        rigaPrevista.appendChild(bottone('×', {
          onClick: () => { es.serie.splice(i, 1); disegna(); },
          classe: 'passo passo-rosso',
          titolo: 'Togli questa serie dalla scheda',
        }));
      } else {
        const p = assistito ? x.peso_assistenza : x.peso;
        rigaPrevista.appendChild(el('span', { testo: `${formattaNumero(p)} kg` }));
        rigaPrevista.appendChild(el('span', { class: 'prevista-x', testo: '×' }));
        rigaPrevista.appendChild(el('span', { testo: `${formattaNumero(x.ripetizioni)} rip` }));
      }
      if (x.dropset) rigaPrevista.appendChild(el('span', { class: 'tag-dropset', testo: 'dropset' }));
      // Ste: "deve spuntarmi pure se ho fatto delle rip con lo spotter".
      if (x.spotter) rigaPrevista.appendChild(el('span', { class: 'tag-spotter', testo: '✓ spotter' }));
      return rigaPrevista;
    });

    griglia.appendChild(el('div', { class: 'scheda-esercizio' }, [
      el('img', { src: e.foto, alt: '', class: 'foto-esercizio grande' }),
      el('div', { class: 'cresci' }, [
        el('div', { class: 'riga-convenzione' }, [
          el('h3', { testo: e.nome }),
          es.opzionale ? el('span', { class: 'tag-opzionale', testo: 'opzionale' }) : null,
        ]),
        // QUI C'È SPAZIO PER I SECONDARI, e la foto da sola non basta: il nome del
        // muscolo va detto anche quando la foto è unaillustrazione senza evidenza.
        (() => {
          const m = muscoliDiEsercizio(e);
          return m ? el('div', { class: 'riga-muscolo' }, [el('span', { class: 'muscolo-etichetta', testo: m })]) : null;
        })(),
        // la convenzione sta su una riga sua: non si attacca al nome
        el('div', { class: 'riga-convenzione' }, [
          el('span', { class: 'badge-conv', testo: ETICHETTE_CONVENZIONE[e.convenzione] || '' }),
        ]),
        el('div', { class: 'serie-previste' }, seriePreviste),
        inModifica
          ? el('div', { class: 'riga-pulsanti piccolo' }, [
            bottone('+ Aggiungi serie', {
              onClick: () => {
                const ultimoS = (es.serie || [])[(es.serie || []).length - 1] || {};
                es.serie.push({
                  peso: ultimoS.peso === undefined ? null : ultimoS.peso,
                  peso_assistenza: ultimoS.peso_assistenza === undefined ? null : ultimoS.peso_assistenza,
                  ripetizioni: ultimoS.ripetizioni === undefined ? null : ultimoS.ripetizioni,
                  spotter: false,
                  dropset: false,
                });
                disegna();
              },
              classe: 'fantasma piccolo-b',
            }),
          ])
          : null,
        e.nota_permanente ? el('p', { class: 'nota-permanente', testo: e.nota_permanente }) : null,
      ]),
    ]));
  }
  zona.appendChild(griglia);

  if (inModifica) {
    zona.appendChild(el('div', { class: 'riga-pulsanti' }, [
      bottone('Salva la scheda (nuova versione)', {
        onClick: async () => {
          const ok = await chiediConferma(
            'Salvare la nuova scheda?',
            'Le sedute che hai gia\' fatto restano intatte: loro conservano la versione con cui sono state fatte. Le prossime useranno questa nuova.',
            { testoOk: 'Salva' },
          );
          if (!ok) return;
          const nuova = pulisciOrdini(bozza);
          const nuovoNumero = Math.max(0, ...versioniDellaPersona().map((x) => Number(x.numero) || 0)) + 1;
          const nuovaVersioneId = 'ver-' + nuovoId();
          await db.salva('versioni', {
            id: nuovaVersioneId, scheda_id: schedaAttivaId(), numero: nuovoNumero,
            snapshot: JSON.parse(JSON.stringify(nuova)),
            nota: `Modificata a mano il ${schedaEvento()}.`,
          });
          await db.salva('schede', { ...scheda(), versione_corrente: nuovaVersioneId });
          scartaBozza();
          giornoInModifica = null;
          await ricaricaTutto();
          avviso(`Scheda salvata. Ora sei alla versione ${nuovoNumero}.`, { tipo: 'ok' });
          vai('/');
        },
        classe: 'principale grande',
      }),
      bottone('Butta le modifiche', {
        onClick: () => { giornoInModifica = null; scartaBozza(); disegna(); },
        classe: 'fantasma',
      }),
    ]));
    // IL BOTTONE LARGO IN FONDO (22/10/2026): nella foto di Ste c’è un solo
    // bottone, largo, e dice "Salva come nuova versione": così si capisce
    // che premendolo nasce una versione nuova e quella vecchia resta nel numero.
    zona.appendChild(bottone('Salva come nuova versione', {
      onClick: () => { giornoInModifica = null; disegna(); },
      classe: 'principale grande largo-tutto',
    }));
    return;
  }

  zona.appendChild(el('div', { class: 'riga-pulsanti fisso' }, [
    bottone('Inizia allenamento', { onClick: () => iniziaAllenamento(g), classe: 'principale grande' }),
    el('span', { class: 'nota', testo: ultimo ? `Ultima volta: ${dataLeggibile(ultimo.data)}` : 'Non hai ancora allenato questo giorno.' }),
  ]));
}

/* ===================== vista: seduta in corso ===================== */

let timerSeduta = null;
// Timer di recupero tra le serie: parte quando segni una serie e si azzera alla successiva.
let inizioRecuperoSerie = null;


/**
 * Configurazione rapida della macchina/esecuzione, direttamente dalla scheda.
 * La carrucola e il numero di braccia sono due scelte separate.
 */
function configuraCaricoEsercizio(e) {
  if (!e || e.convenzione !== 'cavo_totali') return;
  const box = el('div', { class: 'sfondo-dialogo' });
  const dialogo = el('div', { class: 'dialogo dialogo-largo' }, [
    el('h3', { testo: 'Configura ' + e.nome }),
    el('p', { class: 'nota', testo: 'Questa scelta vale per questo esercizio e modifica anche il calcolo del Rank.' }),
  ]);
  const carrucola = el('select', { class: 'selettore' }, [
    el('option', { value: '', testo: 'Non so il rapporto: non dimezzare' }),
    el('option', { value: 'carrucola_mono', testo: 'Mono / rapporto 1:1' }),
    el('option', { value: 'carrucola_doppia', testo: 'Doppia / rapporto 2:1' }),
  ]);
  carrucola.value = e.carrucola || '';
  const usoBraccia = el('select', { class: 'selettore' }, [
    el('option', { value: '', testo: 'Non specificato' }),
    el('option', { value: 'un_braccio', testo: 'Uso un braccio alla volta' }),
    el('option', { value: 'due_braccia', testo: 'Uso due braccia insieme' }),
  ]);
  usoBraccia.value = e.usoBraccia || '';

  const spiegazione = el('div', { class: 'nota nota-piccola' }, [
    el('p', { testo: 'MONO 1:1: il numero sulla pila è quello che consideri. Se la pila segna 20 kg, conti 20.' }),
    el('p', { testo: 'DOPPIA 2:1: il meccanismo riduce a circa la metà il carico al cavo. Se la pila segna 20 kg, conti 10.' }),
    el('p', { testo: 'Uno o due bracci indica come fai il movimento, non il rapporto della carrucola. Puoi usare due mani anche con un cavo 1:1.' }),
    el('p', { testo: 'Se non conosci il rapporto, lascia “Non so”: l’app non dimezza il peso. Controlla l’etichetta della macchina o chiedi in palestra.' }),
  ]);
  spiegazione.hidden = true;
  const spiega = bottone('Spiegami in modo semplice', {
    classe: 'fantasma',
    onClick: () => { spiegazione.hidden = !spiegazione.hidden; },
  });
  dialogo.append(
    el('label', { class: 'nota', testo: 'Che rapporto ha la carrucola?' }), carrucola,
    el('label', { class: 'nota', testo: 'Usi un braccio o due?' }), usoBraccia,
    spiega,
    spiegazione,
    el('div', { class: 'dialogo-azioni' }, [
      bottone('Annulla', { onClick: () => box.remove(), classe: 'fantasma' }),
      bottone('SALVA', { onClick: async () => {
        const aggiornato = {
          ...e,
          carrucola: carrucola.value || null,
          usoBraccia: usoBraccia.value || null,
          configurazioneCavoPersonalizzata: true,
        };
        await db.salva('esercizi', aggiornato);
        await ricaricaTutto();
        box.remove();
        disegna();
        avviso('Configurazione salvata: il Rank userà questa scelta.', { tipo: 'ok' });
      }, classe: 'principale' }),
    ]),
  );
  box.appendChild(dialogo);
  box.addEventListener('click', (ev) => { if (ev.target === box) box.remove(); });
  document.body.appendChild(box);
}

async function vistaSeduta(zona, sedutaId) {
  if (timerSeduta) { clearInterval(timerSeduta); timerSeduta = null; }
  const s = V.sedute.find((x) => x.id === sedutaId);
  if (!s) {
    const r = await db.prendi('sedute', sedutaId);
    if (!r) { zona.appendChild(el('p', { testo: 'Seduta non trovata.' })); return; }
    V.sedute.push(r);
    disegna();
    return;
  }
  if (s.stato !== 'in_corso') { vai('/storico/' + s.id); return; }

  // Se non ho ancora in memoria le serie di questa seduta (per esempio se la
  // schermata viene aperta dopo un salvataggio fatto altrove), le carico:
  // senza questo le righe delle serie non verrebbero disegnate.
  const hoLeSerie = V.serie.some((x) => x.seduta_id === s.id);
  if (!hoLeSerie) V.serie = await db.tutti('serie');

  zona.appendChild(el('a', { href: '#/', class: 'indietro', testo: '← tutti i giorni' }));

  const cronometro = el('div', { class: 'cronometro', id: 'cronometro', testo: '00:00' });
  // quante serie hai spuntato: sta sempre in alto, così vedi a che punto sei
  const avanzamento = el('div', { class: 'avanzamento', id: 'avanzamento-serie', testo: '' });
  zona.appendChild(el('div', { class: 'banda-cronometro' }, [
    el('div', {}, [
      el('div', { class: 'etichetta-crono', testo: 'Allenamento iniziato alle ' + oraLocale(s.ora_inizio) }),
      cronometro,
      // Recupero sempre visibile nella banda sticky mentre scorri gli esercizi.
      el('div', { class: 'timer-recupero recupero-in-alto', id: 'cronometro-recupero-alto', testo: 'Recupero 00:00' }),
      avanzamento,
      el('div', { class: 'nota', id: 'totale-sedute', testo: '' }),
    ]),
  ]));

  // LA BARRA IN FONDO (22/10/2026).
  //
  // Ste: "per terminare l'allenamento metti solo questo quando scorri verso il
  // basso così da occupare meno spazio". Nella foto che ha mandato il
  // bottone è una barra stretta in fondo, con il cronometro e il contatore
  // delle serie a sinistra e il bottone rosso a destra.
  //
  // Prima il bottone era grosso e stava in alto, nella banda del cronometro:
  // occupava mezza schermata e restava lontano dal pollice mentre scorrevi.
  // Ora è in fondo, compatto, e la banda in alto ha solo il cronometro.
  const barraFine = el('div', { class: 'barra-fine' }, [
    el('div', { class: 'barra-fine-contatori' }, [
      el('span', { class: 'barra-fine-crono timer-recupero', id: 'cronometro-fine', testo: 'Recupero 00:00' }),
      el('span', { class: 'barra-fine-serie', id: 'avanzamento-fine', testo: '' }),
    ]),
    bottone('Allenamento finito', { onClick: () => finisceAllenamento(s), classe: 'pericolo' }),
  ]);
  zona.appendChild(barraFine);

  const aggiorna = () => {
    const secondi = Math.floor((Date.now() - new Date(s.ora_inizio).getTime()) / 1000);
    const c = document.getElementById('cronometro');
    if (c) c.textContent = formattaCronometro(secondi);
    const t = document.getElementById('totale-sedute');
    if (t) t.textContent = `Durata totale: ${formattaDurata(secondi)} · non si azzera cambiando esercizio`;
    const passati = inizioRecuperoSerie ? Math.max(0, Math.floor((Date.now() - inizioRecuperoSerie) / 1000)) : 0;
    // Aggiorna sia il timer sticky in alto sia quello della barra in fondo.
    for (const recupero of [document.getElementById('cronometro-recupero-alto'), document.getElementById('cronometro-fine')]) {
      if (!recupero) continue;
      recupero.textContent = 'Recupero ' + formattaCronometro(passati);
      recupero.classList.toggle('recupero-attivo', !!inizioRecuperoSerie);
    }
    scriviAvanzamento();
  };
  // Quante serie hai spuntato sul totale di questa seduta. Resta fermo nella
  // banda col cronometro, quindi lo vedi senza scorrere.
  const scriviAvanzamento = () => {
    const box = document.getElementById('avanzamento-serie');
    if (!box) return;
    const mie = V.serie.filter((x) => x.seduta_id === s.id && !x.eliminata);
    const fatte = mie.filter((x) => eFatta(x)).length;
    svuota(box);
    if (!mie.length) return;
    box.appendChild(el('strong', { testo: `${fatte}/${mie.length}` }));
    box.appendChild(el('span', { testo: fatte === mie.length ? 'serie fatte, tutte!' : 'serie fatte' }));
  };

  aggiorna();
  timerSeduta = setInterval(aggiorna, 1000);

  zona.appendChild(el('label', { class: 'nota-seduta' }, ['Note della seduta']));
  const notaSeduta = campoTesto(s.note, {
    segnaposto: 'Come ti sei sentito, cosa hai cambiato...',
    righe: 2,
    // uso aggiornaNotaSeduta e non un salvataggio "grezzo": altrimenti la nota
    // finiva nel database ma non in memoria, e quindi nelle schermate successive
    // (storico, anteprima) risultava ancora vuota finche' non riavvii l'app.
    onCambio: conRitardo((v) => { aggiornaNotaSeduta(s.id, v); }),
  });
  zona.appendChild(notaSeduta);

// Il riepilogo dello spotter è stato tolto da qui.
  //
  // Ste (04/10/2026): "togli questo non ha senso", e poi "ancora spunta
  // quella cosa dello spotter". Aveva ragione due volte: la riga compariva
  // SEMPRE, anche con zero serie fatte con lo spotter, e ripeteva le stesse
  // informazioni che sono già scritte su ogni singola serie (il tag "fatta
  // con lo spotter" e le ripetizioni assistite).
  //
  // Ora ogni serie mostra da sola se è stata fatta con lo spotter e quante
  // ripetizioni sono state assistite: niente da mettere qui sotto.
  // Il conteggio si vede nella pagina dell'esercizio e nei Progressi.

  const snap = (versioneCorrente() || {}).snapshot || { giorni: [] };
  const giorno = (snap.giorni || []).find((g) => g.id === s.giorno_id);
  if (!giorno) { zona.appendChild(el('p', { testo: 'Non trovo il giorno di questa seduta.' })); return; }

  // Non È async: filtra solo l'elenco che hai già in memoria.
  const serieDi = (esercizioId) => V.serie
    .filter((x) => x.seduta_id === s.id && x.esercizio_id === esercizioId && !x.eliminata)
    .sort((a, b) => a.ordine - b.ordine);

  for (const es of (giorno.esercizi || [])) {
    const e = esercizioPerId(es.esercizio_id);
    if (!e) continue;
    const mine = serieDi(es.esercizio_id);
    const ultimo = ultimaSedutaConEsercizio(e.id, s.id);
    const precedenti = ultimo ? V.serie.filter((x) => x.seduta_id === ultimo.id && x.esercizio_id === e.id && !x.eliminata).sort((a, b) => a.ordine - b.ordine) : [];
    const confronto = confrontaEsercizio(mine, precedenti, e, e);

    const blocco = el('section', { class: 'blocco-esercizio' });
    blocco.appendChild(el('div', { class: 'titolo-esercizio' }, [
      el('img', { src: e.foto, alt: '', class: 'foto-esercizio grande' }),
      el('h2', { testo: nomeConMuscolo(e) }),
      // il rank di questo esercizio: record, LP e progressione
      el('a', { href: '#/esercizio/' + e.id, class: 'bottone-guarda piccolo-b', testo: 'Il suo Rank' }),
      e.convenzione === 'cavo_totali' ? bottone('Configura', { onClick: () => configuraCaricoEsercizio(e), classe: 'fantasma piccolo-b' }) : null,
    ]));
    blocco.appendChild(el('div', { class: 'riga-convenzione' }, [
      el('span', { class: 'badge-conv', testo: ETICHETTE_CONVENZIONE[e.convenzione] || '' }),
      e.convenzione === 'cavo_totali' && e.usoBraccia ? el('span', { class: 'nota', testo: e.usoBraccia === 'un_braccio' ? 'un braccio' : e.usoBraccia === 'due_braccia' ? 'due braccia' : e.usoBraccia }) : null,
      e.convenzione === 'cavo_totali' && e.carrucola ? el('span', { class: 'nota', testo: e.carrucola === 'carrucola_doppia' ? 'rapporto carrucola 2:1' : 'monocarrucola / rapporto 1:1' }) : null,
      e.nota_permanente ? el('span', { class: 'nota', testo: 'nota permanente sotto' }) : null,
    ]));

    if (e.nota_permanente) {
      blocco.appendChild(el('details', { class: 'nota-permanente-box' }, [
        el('summary', { testo: 'Nota permanente' }),
        el('p', { testo: e.nota_permanente }),
      ]));
    }

    // nota della seduta per questo esercizio (livello 2)
    const notaEsercizioId = 'nota-' + s.id + '-' + e.id;
    const notaE = V.note.find((n) => n.id === notaEsercizioId);
    blocco.appendChild(el('details', { class: 'nota-seduta-box' }, [
      el('summary', { testo: notaE && notaE.testo ? 'Nota di oggi' : 'Aggiungi una nota per questa seduta' }),
      campoTesto(notaE ? notaE.testo : '', {
        segnaposto: 'Es: oggi il cavo era diverso',
        righe: 2,
        onCambio: conRitardo(async (v) => {
          await db.salva('note', { id: notaEsercizioId, livello: 'esercizio_seduta', esercizio_id: e.id, seduta_id: s.id, testo: v });
        }),
      }),
    ]));

    if (!confronto.disponibile) {
      blocco.appendChild(el('p', { class: 'tape tape-giallo', testo: NON_DISPONIBILE + ': ' + confronto.motivo }));
    } else if (!ultimo) {
      blocco.appendChild(el('p', { class: 'nota', testo: 'Prima volta che registri questo esercizio: niente da confrontare.' }));
    } else if (confronto.assistito) {
      blocco.appendChild(el('p', { class: 'nota', testo: `Ultima volta (${dataLeggibile(ultimo.data)}): ${riassuntoTesto(ultimo, e)} — con gli esercizi assistiti conta la assistenza: meno kg in aiuto significa più lavoro.` }));
    } else {
      blocco.appendChild(el('p', { class: 'nota', testo: `Ultima volta (${dataLeggibile(ultimo.data)}): ${riassuntoTesto(ultimo, e)}` }));
    }

    const tabella = el('div', { class: 'serie' });
    const chiavePrev = convenzioneMisuraCarico(e.convenzione) ? 'peso' : 'peso_assistenza';
    mine.forEach((serie, i) => {
      // il peso della serie precedente: serve al bottone "come sopra"
      const prima = i > 0 ? mine[i - 1][chiavePrev] : null;
      tabella.appendChild(rigaSerie(serie, i + 1, confronto.righe[i], s, prima));
    });
    blocco.appendChild(tabella);
    blocco.appendChild(el('div', { class: 'riga-pulsanti' }, [
      bottone('+ Aggiungi serie', {
        onClick: async () => {
          try {
            const ordine = prossimoOrdine(V.serie, s.id, e.id);
            const nuova = await creaSerie(s.id, e.id, ordine, e, {});
            V.serie = await db.tutti('serie');
            disegna();
            // risposta visibile: Ste deve capire subito che e\' andata
            mettiInEvidenza(nuova.id);
            avviso(`Serie ${ordine} aggiunta a ${e.nome}.`, { tipo: 'ok', durata: 2200 });
          } catch (errore) {
            console.error('Aggiunta serie non riuscita:', errore);
            mostraErroreBreve('Non sono riuscito ad aggiungere la serie: ' + (errore && errore.message ? errore.message : errore));
          }
        },
        classe: 'fantasma',
      }),
    ]));
    zona.appendChild(blocco);
  }
}

function riassuntoTesto(seduta, esercizio) {
  const serie = V.serie.filter((x) => x.seduta_id === seduta.id && x.esercizio_id === esercizio.id && !x.eliminata);
  const r = riassuntoEsercizio(serie, esercizio);
  const parti = [];
  const chiave = convenzioneMisuraCarico(esercizio.convenzione) ? 'pesoMassimo' : 'pesoAssistenzaMassimo';
  const etichetta = convenzioneMisuraCarico(esercizio.convenzione) ? 'carico max' : 'assistenza';
  if (r[chiave] !== null) parti.push(`${etichetta} ${formattaNumero(r[chiave])} kg`);
  if (r.ripetizioniMedie !== null) parti.push(`rip. medie ${formattaNumero(r.ripetizioniMedie)}`);
  if (r.serieConSpotter) parti.push(`${r.serieConSpotter} con spotter`);
  return parti.length ? parti.join(' · ') : 'nessun dato';
}

/** Salva le note di una seduta e le tiene in memoria subito. */
async function aggiornaNotaSeduta(sedutaId, testo) {
  const s = V.sedute.find((x) => x.id === sedutaId);
  if (!s) return;
  // aggiorno l'oggetto DENTRO l'array, invece di sostituirlo: così anche le
  // schermate aperte (che tengono il riferimento vecchio) vedono la nota nuova
  s.note = testo;
  await db.salva('sedute', { ...s, note: testo });
}

function ultimaSedutaConEsercizio(esercizioId, escludiSedutaId) {
  const candidate = seduteDellaPersona().filter((s) => s.stato === 'completata' && s.id !== escludiSedutaId && !s.eliminata);
  for (const s of candidate.sort((a, b) => String(b.data + b.ora_inizio).localeCompare(String(a.data + a.ora_inizio)))) {
    if (V.serie.some((x) => x.seduta_id === s.id && x.esercizio_id === esercizioId && !x.eliminata)) return s;
  }
  return null;
}

// I cardio storici non hanno sempre un'unita' salvata: mostro i vecchi secondi
// convertiti in minuti. Quando il campo viene modificato, salvo da quel momento
// in poi il numero e l'unita' esplicita, così 60 significa davvero 60 minuti.
function valoreMinutiCardioNelCampo(serie) {
  if (!serie || serie.ripetizioni === null || serie.ripetizioni === undefined || serie.ripetizioni === '') return serie && serie.ripetizioni;
  const n = Number(serie.ripetizioni);
  if (!Number.isFinite(n)) return serie.ripetizioni;
  if (!serie.durata_unita && n > 3600) return serie.ripetizioni;
  return minutiDiCardio(n, serie.durata_unita || 'legacy');
}

function rigaSerie(serie, numero, confronto, seduta, pesoRigaSorella = null) {
  const e = esercizioPerId(serie.esercizio_id);
  const assistenza = e && !convenzioneMisuraCarico(e.convenzione);
  const chiave = assistenza ? 'peso_assistenza' : 'peso';

  // SE L'ESERCIZIO È CARDIO, SU UNA SERIE CI SI SCRIVONO SOLO I MINUTI.
  //
  // Ste (09/10/2026): "quando scrivo l'esercizio nella scheda mi spunta che devo
  // mettere anche i kg e che posso mettere i kg se l'ho fatto con lo spotter
  // dropset ecc.. deve segnare solo che posso mettere i minuti non anche altre cose".
  //
  // Su un tapis NON si scrive il carico, non c'è lo spotter e non c'è il dropset:
  // sono tre cose che non esistono in quel contesto. Non basta nasconderle: se il
  // campo del peso resta nel DOM, la scheda continua a chiedere un numero che
  // non devi sapere, e la serie finisce con `peso: null` in tutti i calcoli.
  //
  // Quindi per il cardio la riga si riduce a quattro cose: il numero della serie e
  // la spunta, il campo dei minuti, la nota e "Elimina".
  const serieCardio = eCardio(e);

  const riga = el('div', { class: 'riga-serie' + (serieCardio ? ' riga-serie-cardio' : ''), dati: { serieId: serie.id } });
  if (serie.spotter) riga.classList.add('serie-spotter');
  if (serie.ripetizioni !== null && Number(serie.ripetizioni) % 1 !== 0) riga.classList.add('serie-decimale');
  if (eFatta(serie)) riga.classList.add('serie-fatta');

  const etichettaFatta = el('span', { class: 'etichetta-fatta', testo: '' });
  riga.appendChild(etichettaFatta);

  // la spunta: segna che la serie l'hai fatta. Premendola di nuovo la togli.
  // Nota: cambio l'aspetto SUBITO e con stili scritti direttamente sul nodo,
  // così non dipende dal ridisegno della pagina ne' dai nomi delle classi CSS.
  const spunta = el('button', {
    type: 'button',
    class: 'bottone-spunta' + (eFatta(serie) ? ' attiva' : ''),
    title: eFatta(serie) ? 'Serie fatta: tocca per togliere la spunta' : 'Segna questa serie come fatta',
    'aria-pressed': eFatta(serie) ? 'true' : 'false',
    onClick: (ev) => {
      registra({ cosa: 'spunta premuta', serie: serie.id, ordine: numero, esercizio: e && e.nome });
      const fatta = !eFatta(serie);
      // Ogni nuova serie segnata fa ripartire il timer di recupero da zero.
      inizioRecuperoSerie = fatta ? Date.now() : null;
      const timerRecupero = document.getElementById('cronometro-fine');
      if (timerRecupero) timerRecupero.textContent = 'Recupero 00:00';
      segnaAspettoFatto(riga, spunta, fatta, etichettaFatta);
      if (fatta) pulsa();
      // IL SUONO DELLA SERIA FATTA.
      //
      // È il suono più importante dell'app: in palestra le mani sono occupate e gli
      // occhi guardano il bilanciere, non lo schermo. Un suono breve e secco dice
      // "registrato" senza dover guardare. Toglierla ha un suono diverso, più basso:
      // non è un errore, ma è un'altra azione.
      suona(fatta ? 'serie' : 'togli');
      // L'ACCENDERSI DELLA SERIE.
      // È l'unica animazione che parte da una tua azione e dice cosa è successo:
      // hai premuto la spunta e la riga si illumina per mezzo secondo. Sparisce
      // subito, quindi non resta una decorazione attaccata alla schermata.
      if (fatta) {
        // forza il ricalcolo dell'animazione: senza questo, togliere e rimettere la
        // classe nella stessa sessione non riparte e la seconda volta non si vede.
        // Lo si fa chiedendo al browser un ricalcolo, ma NON con `offsetWidth`:
        // nei test il DOM finto non ce l'ha, e un difetto di layout non deve
        // poter far cadere un test che non c'entra niente. Un ricalcolo di stile è
        // esattamente quello che serve, ed esiste in ogni browser.
        riga.classList.remove('serie-fatta-adesso');
        if (typeof getComputedStyle === 'function' && globalThis.window) {
          try { getComputedStyle(riga); } catch { /* il DOM finto non lo sa fare: pazienza */ }
        }
        riga.classList.add('serie-fatta-adesso');
      }
      const campi = { stato: fatta ? 'fatta' : 'da_fare' };
      // Salvo dentro il peso che avevo quando l'ho fatta: così il record resta
      // legato al peso giusto anche se poi mi peso diversamente.
      if (fatta && pesoCorporeoOra() !== null) campi.peso_corpo = pesoCorporeoOra();
      aggiornaSerie(serie, campi)
        .then((salvata) => {
          registra({ cosa: 'salvataggio ok', stato: salvata && salvata.stato });
          disegna();
        })
        .catch((err) => {
          registra({ cosa: 'salvataggio FALLITO', errore: String((err && err.message) || err) });
          mostraErroreBreve('Non sono riuscito a salvare la spunta: ' + (err && err.message ? err.message : err));
        });
    },
  }, [el('span', { class: 'segno-spunta', testo: eFatta(serie) ? '✓' : '' })]);
  riga.appendChild(spunta);

  // anche il numero della serie si può toccare: area più grande col dito
  riga.appendChild(el('button', {
    type: 'button',
    class: 'numero-serie numero-serie-bottone',
    title: eFatta(serie) ? 'Segnata come fatta: tocca per toglierla' : 'Segna come fatta',
    'aria-pressed': eFatta(serie) ? 'true' : 'false',
    onClick: () => {
      registra({ cosa: 'numero premuto', serie: serie.id });
      const fatta = !eFatta(serie);
      segnaAspettoFatto(riga, spunta, fatta, etichettaFatta);
      if (fatta) pulsa();
      aggiornaSerie(serie, { stato: fatta ? 'fatta' : 'da_fare' })
        .then(() => { registra({ cosa: 'salvataggio ok da numero' }); disegna(); })
        .catch((err) => { registra({ cosa: 'salvataggio FALLITO', errore: String((err && err.message) || err) }); });
    },
  }, [el('span', { testo: String(numero) })]));

// IL PESO. Sul cardio non lo disegno: vedi la spiegazione di `serieCardio` sopra.
  if (!serieCardio) {
    // I ZAVORRI HANNO UN'ETICHETTA DIVERSA.
    //
    // Ste (10/10/2026): "nelle trazioni e dips non sono kg assistiti quelli che metto
    // ma sono zavorrati. quindi quelli più anche quello mio corporeo di peso".
    //
    // Se sotto il campo ci fosse scritto solo "KG", sembrerebbe che 20 kg siano tutto:
    // ma su una trazione con i zavorri stai spostando il tuo corpo PIÙ 20, e
    // nasconderlo vuol dire guardare un numero che è metà della realtà.
    const conZavorri = !!e && convenzioneConCorpo(e.convenzione);
    const corpoOggi = pesoCorporeoOra();
    const totaleConCorpo = conZavorri && corpoOggi !== null
      ? corpoOggi + Number(serie[chiave] || 0)
      : null;
    const peso = campoNumero(serie[chiave], {
      etichetta: conZavorri ? 'kg di zavorri' : (assistenza ? 'kg di assistenza' : 'kg'),
      onCambio: conRitardo((v) => aggiornaSerie(serie, { [chiave]: numeroOppureNull(v) })),
      onInvalido: (v) => avviso('Non riesco a capire il numero "' + v + '". Il campo com\'era com\'era rimane com\'era.', { tipo: 'errore' }),
    });
    peso.classList.add('campo-peso');

    // In palestra non si scrive: si tocca. Ste ha detto che i +/- 2,5 kg non gli
    // servono (li fa a mano), quindi lascio solo "come sopra", che copia il peso
    // della serie precedente: è il caso più comune e non si può fare a mano
    // senza rileggere il numero.
    const scriviPeso = (valore) => {
      const tondo = Math.round(valore * 100) / 100;
      peso.value = String(tondo).replace('.', ',');
      perView[chiave] = tondo;
      aggiornaSerie(serie, { [chiave]: tondo });
    };
    const rigaPeso = el('div', { class: 'gruppo-peso' }, [
      peso,
      el('span', { class: 'sotto-campo', testo: conZavorri ? 'ZAVORRI' : (assistenza ? 'ZAVORRA' : 'KG') }),
      pesoRigaSorella !== null && pesoRigaSorella !== undefined
        ? el('div', { class: 'passi-peso' }, [
          bottone('come sopra', {
            onClick: () => scriviPeso(pesoRigaSorella),
            classe: 'passo passo-largo',
            titolo: `Copia ${formattaNumero(pesoRigaSorella)} kg dalla serie precedente`,
          }),
        ])
        : null,
    ]);
    riga.appendChild(el('label', { class: 'campetto' }, [rigaPeso]));
    if (conZavorri) {
      // IL TOTALE CHE STAI SPOSTANDO. È la riga che dice la verità: il numero che
      // hai scritto più il tuo corpo.
      riga.appendChild(el('p', {
        class: 'nota nota-piccola nota-zavorri',
        testo: corpoOggi === null
          ? 'Zavorri: sono i kg che metti SUL tuo corpo. Metti il tuo peso nel Profilo e l\'app aggiunge anche quello al conto.'
          : `Zavorri: ${formattaNumero(Number(serie[chiave] || 0))} kg + i tuoi ${formattaNumero(corpoOggi)} kg = ${formattaNumero(totaleConCorpo)} kg che stai spostando.`,
      }));
    }
  }

const rip = campoNumero(serieCardio ? valoreMinutiCardioNelCampo(serie) : serie.ripetizioni, {
    etichetta: serieCardio ? 'minuti' : 'ripetizioni',
    onCambio: conRitardo((v) => {
      const ripetizioni = numeroOppureNull(v);
      return aggiornaSerie(serie, serieCardio
        ? { ripetizioni, durata_unita: 'minuti' }
        : { ripetizioni });
    }),
    onInvalido: (v) => avviso('Dev\'essere un numero. Provo a lasciare com\'era.', { tipo: 'errore' }),
  });
  rip.addEventListener('input', () => {
    const v = numeroOppureNull(rip.value);
    if (v === null || Number.isFinite(v)) { perView.ripetizioni = v; scriviBadgeSpotter(); }
  });
  rip.classList.add('campo-rip');
  // SE L'ESERCIZIO È CARDIO, LA ETICHETTA DICE "MIN" E NON "RIP".
  //
  // Ste (09/10/2026): "come segno che faccio tapis roulant?". Il campo si chiama
  // "ripetizioni" anche per il cardio, e su un tapis non ci sono ripetizioni: ci sono
  // minuti. I valori vecchi in secondi si vedono convertiti; i nuovi vengono salvati
  // con l'unita' esplicita, così 60 minuti non si confondono con 60 secondi.
  riga.appendChild(el('label', { class: 'campetto' + (serieCardio ? ' campetto-cardio' : '') }, [
    rip,
    el('span', { class: 'sotto-campo', testo: serieCardio ? 'MIN' : 'RIP' }),
  ]));
  if (serieCardio) {
    riga.appendChild(el('p', {
      class: 'nota nota-piccola nota-cardio',
      testo: 'Scrivi i minuti: 30 per mezz\'ora, 45 per tre quarti. I vecchi valori in secondi sono convertiti.',
    }));
  }

  // lo spotter: resta salvato e si vede chiaramente
  // tengo una copia "di comodo" della serie che aggiorno mentre digito: serve
  // per ricalcolare la scritta dello spotter subito, senza aspettare il
  // salvataggio e senza ridisegnare la pagina (il ridisegno farebbe perdere
  // il posto nel campo dove stai scrivendo).
  const perView = { ...serie };
  const badgeSpotter = el('span', { class: 'badge-spotter' });
  const scriviBadgeSpotter = () => {
    const testo = etichettaSpotterSerie(perView);
    badgeSpotter.textContent = testo ? 'fatta con lo spotter · ' + testo : '';
  };
  scriviBadgeSpotter();

  const botSpotter = bottone(serie.spotter ? '✓ Spotter' : 'Spotter', {
    onClick: async () => {
      const nuovo = !serie.spotter;
      perView.spotter = nuovo;
      await aggiornaSerie(serie, { spotter: nuovo });
      if (nuovo) pulsa();
      disegna();
    },
    classe: serie.spotter ? 'spotter attivo' : 'fantasma',
  });
  // IL SPOTTER, IL DROPSET E LE RIPETIZIONE ASSISTITE: NIENTE SUL CARDIO.
  //
  // Sono tre cose che esistono solo quando c'è un carico da alleggerire. Sul tapis
  // non ci sono: Ste li ha tolti di proposito, perché chiedere "quanto hai usato
  // lo spotter?" su un esercizio a corpo libero è una domanda senza senso, e
  // obbligarlo a rispondere con un numero lo spinge a scrivere "0" dappertutto.
  if (!serieCardio) {
    // I QUATTRO PULSANTI IN UNA RIGA SOLA (22/10/2026).
    //
    // Ste: "spotter dropset nota ed elimina mettili tutti in una riga così da
    // occupare meno spazio". Prima erano quattro figli della riga della serie,
    // e ognuno andava a capo: la riga occupava tre righe di schermo.
    //
    // Ora stanno in un contenitore solo, e il contenitore è una riga: il
    // testo si accorcia se non ci sta (con la regola "flex-wrap: nowrap" e
    // i pulsanti che si restringono).
    const rigaBottoni = el('div', { class: 'riga-bottoni-serie' }, [
      botSpotter,
      pulsanteDropset(serie, { perView }),
      badgeSpotter,
    ]);
    riga.appendChild(rigaBottoni);
  }

  const campiAssistite = el('div', { class: 'gruppo-assistite' });
  if (serie.spotter && !serieCardio) {
    const ass = campoNumero(serie.rip_assistite, {
      etichetta: 'ripetizioni assistite',
      onCambio: conRitardo((v) => aggiornaSerie(serie, { rip_assistite: numeroOppureNull(v) })),
    });
    ass.addEventListener('input', () => {
      const v = ass.value === '' ? null : Number(ass.value.replace(',', '.'));
      if (v === null || Number.isFinite(v)) { perView.rip_assistite = v; scriviBadgeSpotter(); }
    });
    ass.classList.add('piccolo');
    campiAssistite.appendChild(el('label', { class: 'campetto' }, [
      ass, el('span', { class: 'sotto-campo', testo: 'ASSISTITE' }),
    ]));
    // il "non specificato" lo dice già il badge qui accordo alla serie
  }
  riga.appendChild(campiAssistite);

  riga.appendChild(el('div', { class: 'riga-pulsanti piccolo' }, [
    bottone('Nota', {
      onClick: () => {
        const t = prompt('Nota della serie ' + numero + (e ? ' di ' + e.nome : ''), serie.nota || '');
        if (t !== null) aggiornaSerie(serie, { nota: t });
      },
      classe: 'fantasma piccolo-b',
    }),
    bottone('Elimina', {
      onClick: async () => {
        const ok = await chiediConferma('Eliminare la serie?', 'La serie va nel cestino e puoi recuperarla. La seduta non viene toccata.', { testoOk: 'Nel cestino', pericolo: true });
        if (ok) { await db.cestino('serie', serie.id); V.serie = await db.tutti('serie'); disegna(); }
      },
      classe: 'fantasma piccolo-b pericolo-b',
    }),
  ]));

  // dropset: i tre giri extra, ma solo se l'hai acceso col pulsante
  if (serie.dropset && !serieCardio) riga.appendChild(bloccoDropset(serie));

  if (confronto) {
    if (!confronto.haConfronto) {
      riga.appendChild(el('div', { class: 'riga-confronto', testo: confronto.messaggio || NON_DISPONIBILE }));
    } else {
      const pezzi = [];
      if (confronto.differenzaPeso !== null && confronto.differenzaPeso !== undefined) {
        const segno = confronto.differenzaPeso > 0 ? '+' : confronto.differenzaPeso < 0 ? '−' : '=';
        pezzi.push(`${segno}${formattaNumero(Math.abs(confronto.differenzaPeso))} kg`);
        if (confronto.differenzaPesoPerc !== null && confronto.differenzaPesoPerc !== undefined) {
          const ps = confronto.differenzaPesoPerc > 0 ? '+' : '−';
          pezzi.push(`${ps}${formattaNumero(Math.abs(confronto.differenzaPesoPerc))}%`);
        }
      }
      if (confronto.differenzaRip !== null && confronto.differenzaRip !== undefined && confronto.differenzaRip !== 0) {
        const segno = confronto.differenzaRip > 0 ? '+' : '−';
        pezzi.push(`rip ${segno}${formattaNumero(Math.abs(confronto.differenzaRip))}`);
      }
      if (confronto.differenzaAssistenza !== undefined && confronto.differenzaAssistenza !== null) {
        const d = confronto.differenzaAssistenza;
        pezzi.push(d === 0 ? 'assistenza uguale' : d < 0 ? `${formattaNumero(Math.abs(d))} kg di assistenza in meno` : `${formattaNumero(d)} kg di assistenza in più`);
      }
      if (serie.spotter && confronto.attuale && confronto.attuale.spotter === false) {
        pezzi.push('oggi con lo spotter (prima senza)');
      }
      if (serie.rip_assistite !== null && serie.rip_assistite !== undefined) {
        pezzi.push(`${formattaNumero(serie.rip_assistite)} assistite incluse nelle ${formattaNumero(serie.ripetizioni)}`);
      }
      const rigaC = el('div', { class: 'riga-confronto' });
      rigaC.appendChild(el('span', { class: 'prima', testo: 'prima: ' + (confronto.precedente ? descriviSerie(confronto.precedente) : '—') }));
      if (pezzi.length) rigaC.appendChild(el('span', { class: 'dopo', testo: ' · oggi: ' + pezzi.join(' · ') }));
      riga.appendChild(rigaC);
    }
  }
  return riga;
}

/**
 * Il pulsante DROPSET, che mancava.
 *
 * Ste (07/10/2026): "non esiste ancora il pulsante dropset che ti avevo detto
 * tempo fa". Aveva ragione: i tre giri extra esistevano già nel codice
 * (GIRI_DROPSET = 3, e il blocco per riempirli), ma non c'era NULLA che li
 * accendesse. Il campo `dropset` nasceva false e restava false per sempre: quindi
 * quei tre campi non si erano mai visti nella vita dell'app.
 *
 * Perche' un interruttore e non un campo da compilare sempre: il dropset È una
 * TECNICA, non un dato. Nove serie su dieci non lo fanno, e una riga con tre campi
 * in più su ogni serie sarebbe esattamente la riga ingombrante che Ste mi ha
 * chiesto di togliere. Lo accendi quando lo fai, e li' restano i tre giri.
 */
function pulsanteDropset(serie, { perView = null } = {}) {
  const acceso = !!serie.dropset;
  return bottone(acceso ? '✓ Dropset' : 'Dropset', {
    onClick: async () => {
      const nuovo = !serie.dropset;
      if (perView) perView.dropset = nuovo;
      // spento il dropset, i giri in attesa non hanno più senso: se restassero,
      // riaccendendo il pulsante comparirebbero numeri di una serie che nel frattempo
      // è cambiata
      if (!nuovo) ULTIMI_GIRI.delete(serie.id);
      await aggiornaSerie(serie, { dropset: nuovo });
      if (nuovo) pulsa();
      disegna();
    },
    classe: (acceso ? 'dropset-bot attivo' : 'dropset-bot') + ' fantasma',
    titolo: acceso
      ? 'Dropset acceso: tocca per toglierlo'
      : 'Dropset: aggiungi i tre giri a calo dopo la serie',
  });
}

/**
 * I tre giri appena scritti e non ancora arrivati al database.
 *
 * Sta FUORI dalla funzione perché dentro ricreerebbe la mappa a ogni disegno e la
 * cache non servirebbe a niente. Vive solo per la durata dei salvataggi in ritardo:
 * quando il giro viene spento l'entrata sparisce, e la mappa non cresce mai oltre un
 * numero ragionevole di serie.
 */
const ULTIMI_GIRI = new Map();
const MAX_GIRI_IN_ATTESA = 40;

function ricordaGiri(idSerie, giri) {
  if (ULTIMI_GIRI.size >= MAX_GIRI_IN_ATTESA) {
    const primo = ULTIMI_GIRI.keys().next().value;
    ULTIMI_GIRI.delete(primo);
  }
  ULTIMI_GIRI.set(idSerie, giri);
}

/**
 * I tre giri a calo, quando il dropset È acceso.
 *
 * Stessa cosa che c'era già nella riga della scheda, ma tirata fuori in una
 * funzione: adesso c'è anche nello storico, e due copie identiche prima o poi
 * finiscono diverse.
 */
function bloccoDropset(serie) {
  const extra = el('div', { class: 'dropset' });
  extra.appendChild(el('div', { class: 'etichetta-dropset', testo: 'Dropset: aggiungi i giri successivi' }));
  // I giri dropset si salvano UNO PER VOLTA, e ognuno deve partire dall'ultimo
  // salvato (16/10/2026).
  //
  // Ste: "io spungo l'esercizio e i kg e le rep delle serie dropset (2,3,4)
  // spariscono".
  //
  // IL DIFETTO: `giri` veniva letto UNA volta sola quando si disegna la riga, e ogni
  // campo (peso del giro 2, rip del giro 2, peso del giro 3...) ricostruiva l'array da
  // QUELLA copia vecchia. Ogni scrittura salvata conteneva quindi un solo campo
  // modificato e tutti gli altri vuoti, e l'ultima scrittura vinceva: spariscono i
  // valori degli altri giri. Poi, spungendo l'esercizio, la riga si ridisegna e si
  // vede il danno.
  //
  // Il peso e le ripetizioni della serie normale non hanno questo problema, perché
  // ogni campo salva il SUO campo e non un array intero.
function giriVivi(idSerie) {
  const viva = (V.serie || []).find((x) => x && x.id === idSerie);
  const dalDisco = viva && Array.isArray(viva.giri_extra) ? viva.giri_extra : [];
  return sovrapponiGiri(dalDisco, ULTIMI_GIRI.get(idSerie));
}
const giri = giriVivi(serie.id);
  // UN SALVATAGGIO PER TUTTA LA RIGA: il ritardo cancellava il giro precedente,
  // e così sparivano i valori degli altri giri (Ste, 21/10/2026)
  const salvaGiri = conRitardo(() => aggiornaSerie(serie, { giri_extra: giriVivi(serie.id) }));
giri.slice(0, GIRI_DROPSET).forEach((g, idx) => {
  const gp = campoNumero(g.peso, {
    etichetta: 'giro peso',
    onCambio: conRitardo((v) => {
      const prossimi = cambiaGiro(giriVivi(serie.id), idx, 'peso', v);
      ricordaGiri(serie.id, prossimi);
      return aggiornaSerie(serie, { giri_extra: prossimi });
    }),
  });
  const gr = campoNumero(g.ripetizioni, {
    etichetta: 'giro ripetizioni',
    onCambio: conRitardo((v) => {
      const prossimi = cambiaGiro(giriVivi(serie.id), idx, 'ripetizioni', v);
      ricordaGiri(serie.id, prossimi);
      return aggiornaSerie(serie, { giri_extra: prossimi });
    }),
  });
    extra.appendChild(el('div', { class: 'riga-dropset' }, [
      el('span', { class: 'etichetta-giro', testo: `giro ${idx + 2}` }),
      el('label', { class: 'campetto' }, [gp, el('span', { class: 'sotto-campo', testo: 'KG' })]),
      el('label', { class: 'campetto' }, [gr, el('span', { class: 'sotto-campo', testo: 'RIP' })]),
    ]));
  });
  return extra;
}

function descriviSerie(x) {
  const e = esercizioPerId(x.esercizio_id);
  const assistenza = !!(e && !convenzioneMisuraCarico(e.convenzione));
  const valore = assistenza ? x.peso_assistenza : x.peso;
  const pezzi = [`${formattaNumero(valore)} kg`, `${formattaNumero(x.ripetizioni)} rip`];
  if (x.spotter) {
    pezzi.push('spotter');
    if (x.rip_assistite === null || x.rip_assistite === undefined) pezzi.push('assistite non specificate');
    else pezzi.push(`${formattaNumero(x.rip_assistite)} assistite`);
  }
  return pezzi.join(' · ');
}

/** Porta in vista e lampeggia la riga appena creata, così si vede subito. */
function mettiInEvidenza(idSerie) {
  const contenitore = document.getElementById('contenuto');
  if (!contenitore) return;
  // cerco a mano nell'albero: funziona sempre, anche se querySelector manca
  let trovata = null;
  const gira = (nodo) => {
    if (trovata || !nodo || nodo.nodeType !== 1) return;
    if (nodo.dataset && nodo.dataset.serieId === idSerie) { trovata = nodo; return; }
    for (const f of (nodo.figli || nodo.children || [])) gira(f);
  };
  gira(contenitore);
  if (!trovata) return;
  trovata.classList.add('appena-creata');
  if (typeof trovata.scrollIntoView === 'function') {
    try { trovata.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { /* pazienza */ }
  }
  setTimeout(() => { try { trovata.classList.remove('appena-creata'); } catch { /* pazienza */ } }, 1600);
}

/** Errore breve ma sempre visibile: niente più errori che spariscono. */
function mostraErroreBreve(testo) {
  avviso(testo, { tipo: 'errore', durata: 9000 });
  console.error(testo);
}

async function aggiornaSerie(serie, campi) {
  // cambiaSerie rilegge la serie dal database e mette in fila i cambiamenti
  // della stessa serie: È quello che impedisce a un campo salvato in ritardo
  // di cancellare la spunta o lo spotter appena messi.
  const salvata = await cambiaSerie(serie.id, campi);
  const idx = V.serie.findIndex((x) => x.id === serie.id);
  if (idx >= 0) V.serie[idx] = salvata;
  disegnaStatoSalvataggio();
  return salvata;
}

async function finisceAllenamento(s) {
  const secondi = Math.floor((Date.now() - new Date(s.ora_inizio).getTime()) / 1000);
  const ok = await chiediConferma(
    'Allenamento finito?',
    `Durata totale: ${formattaDurata(secondi)}. Salvando non potrai piu\' modificare l\'ora di inizio e fine, ma i dati delle serie restano modificabili.`,
    { testoOk: 'Confermo, allenamento finito', testoAnnulla: 'Continua ad allenarmi' },
  );
  if (!ok) return;
  if (timerSeduta) { clearInterval(timerSeduta); timerSeduta = null; }
  // Aspetto che finiscano i salvataggi ancora in volo: se l\'ultima cosa che
  // ho toccato e\' stato lo spotter (o i kg) e premo subito "Allenamento finito",
  // senza questo la scheda risulterebbe "niente di nuovo" e la conferma di
  // aggiornarla non comparirebbe.
  await aspettaSalvataggi();
  // I Rank di ADESSO, prima che la seduta diventi "completata". Servono per il
  // confronto alla fine: È l'unico modo di sapere se qualcosa È cambiato davvero.
  const rankPrima = mappaRank(V.esercizi, serieMie(), seduteMie());
  // IMPORTANTE: rileggo la seduta dal database invece di usare la copia che
  // avevo in mano. Se nel frattempo hai scritto qualcosa (per esempio le note
  // della seduta), con la copia vecchia verrebbe cancellato: era successo, la
  // nota spariva appena finivi l'allenamento.
  const fresca = (await db.prendi('sedute', s.id)) || s;
  const secondiRivalutati = Math.floor((Date.now() - new Date(fresca.ora_inizio).getTime()) / 1000);
  await db.salva('sedute', {
    ...fresca,
    ora_fine: new Date().toISOString(),
    durata_secondi: secondiRivalutati,
    stato: 'completata',
  });
  s.note = fresca.note;
  await ricaricaTutto();
  // il gioco: record, rank, LP, streak, Aura e traguardi. Tutto calcolato
  // dai dati appena salvati e passato dal database, mai scritto a mano.
  await assegnaRicompense(s.id);
  // Ste (08/10/2026): "sistema appena finisci" e poi "tutto quanto deve farsi
  // automaticamente". Qui l'app ti portava allo storico e basta: finivi l'allenamento
  // e non ti diceva SE avevi fatto un primato o SE eri salito di fascia. Il Rank era
  // già calcolato e già salvato, nessuno lo mostrava.
  annunciaFineSeduta(rankPrima, mappaRank(V.esercizi, serieMie(), seduteMie()));
  // IL SUONO DI FINE ALLENAMENTO.
  //
  // Ste (10/10/2026) ha chiarito che per l'app Palestra l'audio è permesso. Qui è
  // il posto giusto: è l'unico momento della seduta in cui il telefono è in mano e
  // l'orecchio è libero, e la notizia che conta è "hai finito".
  //
  // Suona DOPO l'annuncio, non prima: così non copre la parola. E sta qui, non dentro
  // `annunciaFineSeduta`: lì suonerebbe anche quando l'annuncio non c'è, cioè quando
  // non è successo niente di notevole.
  suona('sessione');
  vai('/storico/' + s.id);
  // adesso la scheda: quello che hai fatto diventa la scheda per la prossima volta
  await proponiAggiornamentoScheda(s.id);
}

/**
 * Il nome leggibile di un esercizio, o il suo id se non lo si trova.
 *
 * Serve alle funzioni che costruiscono i messaggi: quelle possono essere chiamate
 * anche quando il catalogo non È ancora in memoria (i test, e il primo avvio), e
 * un messaggio che spiega cosa È successo non può fallire perchÈ non ha trovato
 * una parola da mettere. Fallire qui significa che l'utente non legge NULLA, che
 * È il caso peggiore: era l'esercizio a non essere pronto, non l'app.
 */
function nomeEsercizio(id) {
  const e = (V && V.esercizi) ? esercizioPerId(id) : null;
  return (e && e.nome) || id;
}

/**
 * I Rank di tutti gli esercizi, per capire cosa È cambiato.
 *
 * Serve al confronto PRIMA/DOPO: se la mappa È la stessa, non È successo niente e
 * non cÈ niente da annunciare. Senza questo, alla fine di ogni seduta comparirebbe
 * un messaggio anche quando non hai migliorato niente, che dopo tre settimane diventa
 * un rumore che non guardi più.
 *
 * Il peso si può passare a mano: serve al confronto del peso corporeo, perchÈ quando
 * calcoliamo il "prima" il peso salvato È già quello nuovo.
 *
 * Esportata perchÈ il confronto merita un test: se sbaglia nel silenzio, l'app smette
 * di dire le cose giuste e nessuno se ne accorge, perchÈ un avviso che manca non fa
 * rumore.
 */
export function mappaRank(esercizi, serie, sedute, peso = null) {
  const m = new Map();
  const record = recordAccount(esercizi, gruppiDaSerie(sedute, serie, esercizi), {
    soloConDati: true,
    pesoAttuale: peso === null || peso === undefined ? pesoCorporeoOra() : peso,
  });
  for (const r of record) {
    if (!r || !r.esercizio || !r.rankId) continue;
    m.set(r.esercizio.id, {
      nome: r.rank.nome, indice: r.indice, lp: r.lp, punteggio: r.punteggio,
    });
  }
  return m;
}

/**
 * Cosa dire alla fine della seduta.
 *
 * Solo cose vere: un Rank salito, un record battuto, un esercizio nuovo sbloccato.
 * Niente complimenti se non È successo niente: un avviso che dice sempre "bravo"
 * smette di dire qualcosa anche quando hai davvero migliorato.
 */
export function annunciaFineSeduta(prima, dopo) {
  const saliti = [];
  const nuovi = [];
  const battuti = [];
  for (const [id, d] of dopo) {
    const p = prima.get(id);
    const nome = nomeEsercizio(id);
    if (!p) {
      // L'esercizio È comparso solo adesso: o era nuovo, o non aveva mai avuto un
      // Rank.
      //
      // IL PRIMO CASE CHE C'ERA BUGGATO: alla PRIMA seduta in assoluto la mappa
      // "prima" È vuota, quindi `prima.size` era 0 e non diceva NIENTE. Ma la
      // prima seduta È la più importante da annunciare: È il momento in cui
      // sblocchi il tuo primo livello su ogni esercizio, e l'app ti lasciava li'
      // come se non fosse successo niente.
      //
      // Ora la regola È semplice e non guarda la mappa: se l'esercizio ha un Rank
      // adesso, e non ne aveva uno prima, È una notizia. Che sia la prima seduta
      // o la centesima, il motivo per cui l'esercizio non c'era prima È che hai
      // appena toccato il tuo Rank.
      nuovi.push(`${nome}: ${d.nome} ${d.lp} LP`);
      continue;
    }
    if (d.indice > p.indice) saliti.push(`${nome}: ${p.nome} - ${d.nome} (${d.lp} LP)`);
    else if (p.indice >= 0 && d.punteggio > p.punteggio + 0.01) {
      battuti.push(`${nome}: nuovo record personale (${formattaNumero(d.punteggio)})`);
    }
  }
  if (!saliti.length && !nuovi.length && !battuti.length) return null;
  const righe = [];
if (saliti.length) righe.push('Sei salito: ' + saliti.join(' · '));
  if (battuti.length) righe.push('Record battuti: ' + battuti.join(' · '));
  if (nuovi.length) righe.push('Primo livello sbloccato: ' + nuovi.join(' · '));
  // il messaggio resta 9 secondi: Ste guarda il telefono in palestra e la schermata
  // del Rank, che si vede meglio, è a un tocco da l'i
  //
  // IL TIPO È "TRAGUARDO", NON "ok".
  //
  // Ste (10/10/2026): "aggiungi più animazioni". Questo è l'unico momento dell'app in
  // cui qualcosa di vero è successo: un Rank salito, un record battuto. Aveva la
  // stessa animazione di "questo esercizio è opzionale" — sale dal basso, sparisce —
  // cioè esattamente l'opposto di quello che è.
  //
  // Il tipo "traguardo" scatta come un pulsante fisico e ha un alone che va via
  // subito. È l'unica animazione dell'app che si prende la scena: tutto il resto
  // resta discreto, e va bene così.
  return avviso(righe.join(' '), { tipo: 'traguardo', durata: 9000 });
}

/**
 * Cosa cambia quando aggiorni il peso corporeo.
 *
 * Non si dice "i Rank sono aggiornati" e basta: si dicono i nomi. Il peso cambia gli
 * ingressi e i tetti di ogni esercizio, quindi gli stessi kg possono valere su due
 * fasce diverse da un giorno all'altro, ed È il punto fragile che Ste aveva già
 * segnalato una volta ("la colonna manca alla prossima mente").
 */
export function annunciaCambioPeso(prima, dopo, nuovoPeso) {
  const saliti = [];
  const scesi = [];
  const comparsi = [];
  for (const [id, d] of dopo) {
    const p = prima.get(id);
    const nome = nomeEsercizio(id);
    if (!p) { comparsi.push(`${nome}: ${d.nome}`); continue; }
    if (d.indice > p.indice) saliti.push(`${nome}: ${p.nome} - ${d.nome}`);
    else if (d.indice < p.indice) scesi.push(`${nome}: ${p.nome} - ${d.nome}`);
  }
  const righe = [`Peso aggiornato: ${formattaNumero(nuovoPeso)} kg.`];
  if (saliti.length) righe.push('Sei salito: ' + saliti.join(' · '));
  if (scesi.length) righe.push('Sei sceso: ' + scesi.join(' · '));
  if (comparsi.length) righe.push('Primo livello sbloccato: ' + comparsi.join(' · '));
  if (!saliti.length && !scesi.length && !comparsi.length) {
    righe.push('Nessun Rank cambia: i tuoi kg sono gli stessi su tutta la scala.');
  }
  return avviso(righe.join(' '), { tipo: 'ok', durata: 9000 });
}

/* ===================== vista: storico ===================== */

/**
 * Le sedute scelte da eliminare, e se la modalita' È aperta.
 *
 * Ste (07/10/2026): "fai un bottone anche che mi fa selezionare nello storico le
 * sedute da eliminare". Prima si eliminava una seduta SOLO aprendo la seduta e
 * cercando il bottone in fondo: con trenta sedute da ripulire era un lavoro.
 *
 * Perche' sta qui fuori e non dentro la schermata: la schermata viene ridisegnata
 * a ogni salvataggio, e se la lista di scelte vivesse qui si perderebbe a ogni
 * ridisegno (e il conteggio "3 selezionate" ripartirebbe da zero).
 */
const selezioneStorico = { attiva: false, ids: new Set() };

function vistaStorico(zona) {
  zona.appendChild(el('h1', { testo: 'Storico' }));
  const completate = seduteDellaPersona().filter((s) => s.stato === 'completata' && !s.eliminata)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  if (!completate.length) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Nessuna seduta registrata. Quando finisci il primo allenamento lo troverai qui.' }));
    return;
  }
  zona.appendChild(el('p', { class: 'nota', testo: `${completate.length} sedute. Nessun dato inventato: qui ci sono solo allenamenti che hai chiuso davvero.` }));

  // Il bottone per scegliere le sedute da togliere. Fuori dalla lista, in alto:
  // se stai in mezzo a trenta sedute e devi cercarlo, è la stessa impresa di prima.
  const rigaComandi = el('div', { class: 'riga-pulsanti' });
  const contaSelezione = el('span', { class: 'nota', testo: '' });
  const scriviConta = () => {
    const n = selezioneStorico.ids.size;
    contaSelezione.textContent = n ? `${n} sedut${n === 1 ? 'a' : 'e'} scelt${n === 1 ? 'a' : 'e'}` : '';
  };
  if (selezioneStorico.attiva) {
    // il conteggio va scritto SUBITO: la schermata viene ridisegnata a ogni
    // tocco (la riga cambia aspetto), e senza questo il numero restava vuoto
    scriviConta();
    const togli = async () => {
      const ids = [...selezioneStorico.ids];
      if (!ids.length) return;
      const ok = await chiediConferma(
        `Eliminare ${ids.length} sedut${ids.length === 1 ? 'a' : 'e'}?`,
        'Le sedute e tutte le loro serie vanno nel cestino. Puoi recuperarle.',
        { testoOk: 'Nel cestino', pericolo: true },
      );
      if (!ok) return;
      for (const id of ids) {
        for (const serie of V.serie.filter((x) => x.seduta_id === id)) await db.cestino('serie', serie.id);
        await db.cestino('sedute', id);
      }
      selezioneStorico.attiva = false;
      selezioneStorico.ids.clear();
      await ricaricaTutto();
      disegna();
      avviso(`Eliminata${ids.length === 1 ? '' : 'e'} ${ids.length} sedut${ids.length === 1 ? 'a' : 'e'}. Nel cestino, se ti serve tornare indietro.`, { tipo: 'ok' });
    };
    rigaComandi.appendChild(contaSelezione);
    rigaComandi.appendChild(bottone('Elimina scelte', {
      onClick: togli,
      classe: 'pericolo-b',
    }));
    rigaComandi.appendChild(bottone('Annulla', {
      onClick: () => {
        selezioneStorico.attiva = false;
        selezioneStorico.ids.clear();
        disegna();
      },
      classe: 'fantasma',
    }));
  } else {
    rigaComandi.appendChild(bottone('Scegli sedute da eliminare', {
      onClick: () => {
        selezioneStorico.attiva = true;
        selezioneStorico.ids.clear();
        disegna();
      },
      classe: 'fantasma piccolo-b',
      titolo: 'Tocca le sedute da togliere, poi Elimina scelte',
    }));
  }
  zona.appendChild(rigaComandi);

  const elenco = el('div', { class: 'elenco-sedute' });
  for (const s of completate) {
    const serie = V.serie.filter((x) => x.seduta_id === s.id && !x.eliminata);
    const dentro = [
      el('img', { src: 'img/logo.png', alt: '', class: 'logo-seduta' }),
      el('div', {}, [
        el('strong', { testo: `${s.nome_giorno || 'Seduta'} — ${dataLeggibile(s.data)}` }),
        el('div', { class: 'nota', testo: `${oraLocale(s.ora_inizio)} → ${oraLocale(s.ora_fine)} · durata ${formattaDurata(s.durata_secondi)} · ${serie.length} serie` }),
        // l'anteprima delle note: così le ritrovi senza aprire ogni seduta
        s.note ? el('div', { class: 'anteprima-nota', testo: '“' + String(s.note).slice(0, 90).replace(/\s+/g, ' ') + '”' }) : null,
      ]),
    ];
    if (selezioneStorico.attiva) {
      // in modalita' scelta la riga NON È un link: un link che contiene la spunta
      // fa due cose con un tocco solo (la seleziona e apre la seduta). Qui il
      // tocco seleziona, e per aprire la seduta si esce dalla modalita'.
      const scelta = selezioneStorico.ids.has(s.id);
      const r = el('button', {
        type: 'button',
        class: 'riga-seduta riga-scelta' + (scelta ? ' scelta' : ''),
        dati: { sedutaId: s.id },
        'aria-pressed': scelta ? 'true' : 'false',
        titolo: scelta ? 'Tocca per toglierla dalla scelta' : 'Tocca per sceglierla',
        onClick: () => {
          if (selezioneStorico.ids.has(s.id)) selezioneStorico.ids.delete(s.id);
          else selezioneStorico.ids.add(s.id);
          disegna();
        },
      }, [el('span', { class: 'spunta-scelta', testo: scelta ? '✓' : '' }), ...dentro]);
      elenco.appendChild(r);
    } else {
      elenco.appendChild(el('a', { href: '#/storico/' + s.id, class: 'riga-seduta' }, dentro));
    }
  }
  zona.appendChild(elenco);
}

async function vistaSedutaPassata(zona, sedutaId) {
  const s = V.sedute.find((x) => x.id === sedutaId) || await db.prendi('sedute', sedutaId);
  if (!s) { zona.appendChild(el('p', { testo: 'Seduta non trovata.' })); return; }
  zona.appendChild(el('a', { href: '#/storico', class: 'indietro', testo: '← storico' }));
  zona.appendChild(el('h1', { testo: `${s.nome_giorno || 'Seduta'} — ${dataLeggibile(s.data)}` }));
  zona.appendChild(el('div', { class: 'riepilogo-seduta' }, [
      el('span', { testo: `Inizio ${oraLocale(s.ora_inizio)}` }),
      el('span', { testo: `Fine ${s.ora_fine ? oraLocale(s.ora_fine) : '—'}` }),
      el('span', { class: 'durata', testo: `Durata ${formattaDurata(s.durata_secondi)}` }),
  ]));

  if (s.stato === 'in_corso') {
    zona.appendChild(el('div', { class: 'tape tape-viola' }, [
      el('span', { testo: 'Questa seduta e\' ancora aperta.' }),
      bottone('Riapri', { onClick: () => vai('/seduta/' + s.id), classe: 'principale' }),
    ]));
  }

  // Le note della seduta: durante l'allenamento le scivi qui, e adesso tornano
  // qui sotto. Prima sparivano: le scrivevi e non le ritrovavi più.
  //
  // IMPORTANTE: rileggo dal database PRIMA di decidere se mostrare la sezione.
  // Prima il controllo veniva prima, quindi se la nota non era ancora in memoria
  // la sezione non compariva affatto e il ricaricamento non arrivava a eseguire.
  let notaMostrata = s.note || '';
  if (!notaMostrata) {
    const fresca = await db.prendi('sedute', s.id);
    if (fresca && fresca.note) {
      notaMostrata = fresca.note;
      const inMemoria = V.sedute.findIndex((x) => x.id === s.id);
      if (inMemoria >= 0) V.sedute[inMemoria] = fresca;
    }
  }
  if (notaMostrata || s.stato === 'in_corso') {
    const boxNote = el('div', { class: 'box-note-seduta' });
    boxNote.appendChild(el('h3', { testo: 'Note della seduta' }));
    if (notaMostrata) boxNote.appendChild(el('p', { class: 'testo-note-seduta', testo: notaMostrata }));
    const campoNote = campoTesto(notaMostrata, {
      segnaposto: 'Come ti sei sentito, cosa hai cambiato...',
      righe: 2,
      onCambio: conRitardo((v) => { aggiornaNotaSeduta(s.id, v); }),
    });
    campoNote.classList.add('campo-note-seduta');
    boxNote.appendChild(el('div', { class: 'nota nota-piccola' , testo: notaMostrata ? 'Puoi correggerle qui sotto.' : 'Non hai scritto niente.' }));
    boxNote.appendChild(campoNote);
    zona.appendChild(boxNote);
  }

  const snap = V.versi.find((v) => v.id === s.versione_id);
  const giorni = (snap && snap.snapshot && snap.snapshot.giorni) || [];
  const g = giorni.find((x) => x.id === s.giorno_id);
  const eserciziDelGiorno = g ? (g.esercizi || []) : [];

  if (eserciziDelGiorno.length) {
    zona.appendChild(el('p', { class: 'nota', testo: `Usata la versione ${snap.numero} della scheda. Le modifiche alla scheda fatte dopo non l'hanno toccata.` }));
  }

  const ordine = eserciziDelGiorno.length ? eserciziDelGiorno.map((x) => x.esercizio_id) : [...new Set(V.serie.filter((x) => x.seduta_id === s.id).map((x) => x.esercizio_id))];
  for (const esercizioId of ordine) {
    const e = esercizioPerId(esercizioId);
    if (!e) continue;
    const serie = V.serie.filter((x) => x.seduta_id === s.id && x.esercizio_id === esercizioId && !x.eliminata).sort((a, b) => a.ordine - b.ordine);
    if (!serie.length) continue;
    const r = riassuntoEsercizio(serie, e);
    const blocco = el('section', { class: 'blocco-esercizio' });
    blocco.appendChild(el('div', { class: 'titolo-esercizio' }, [
      el('img', { src: e.foto, alt: '', class: 'foto-esercizio' }),
      el('h3', { testo: nomeConMuscolo(e) }),
    ]));
    blocco.appendChild(el('div', { class: 'riga-convenzione' }, [
      el('span', { class: 'badge-conv', testo: ETICHETTE_CONVENZIONE[e.convenzione] || '' }),
    ]));
    const chiave = convenzioneMisuraCarico(e.convenzione) ? 'pesoMassimo' : 'pesoAssistenzaMassimo';
    const riq = el('p', { class: 'nota', testo: [
      r[chiave] !== null ? `massimo ${formattaNumero(r[chiave])} kg` : null,
      r.ripetizioniMedie !== null ? `ripetizioni medie ${formattaNumero(r.ripetizioniMedie)}` : null,
      r.volume !== null ? `volume ${formattaNumero(r.volume)} kg` : null,
      r.serieConSpotter ? `${r.serieConSpotter} serie con spotter` : null,
    ].filter(Boolean).join(' · ') });
    blocco.appendChild(riq);
    if (!convenzioneMisuraCarico(e.convenzione)) {
      blocco.appendChild(el('p', { class: 'nota nota-chiaro', testo: 'Esercizio assistito: il numero e\' il peso di assistenza, piu\' basso = piu\' lavoro. Il volume non si calcola.' }));
    }
    const tabella = el('div', { class: 'storico-serie' });
    const chiavePrev = convenzioneMisuraCarico(e.convenzione) ? 'peso' : 'peso_assistenza';
    serie.forEach((unaSerie, i) => {
      const prima = i > 0 ? serie[i - 1][chiavePrev] : null;
      tabella.appendChild(rigaStorico(unaSerie, i + 1, e, s, prima));
    });
    blocco.appendChild(tabella);
    zona.appendChild(blocco);
  }

  zona.appendChild(el('div', { class: 'riga-pulsanti' }, [
    bottone('Scarica questa seduta in CSV', {
      onClick: () => scarica('seduta-' + s.data + '.csv', csvSedute([s])),
      classe: 'fantasma',
    }),
    bottone('Elimina la seduta', {
      onClick: async () => {
        const ok = await chiediConferma('Eliminare tutta la seduta?', 'La seduta e tutte le sue serie vanno nel cestino. Puoi recuperarle.', { testoOk: 'Nel cestino', pericolo: true });
        if (!ok) return;
        for (const serie of V.serie.filter((x) => x.seduta_id === s.id)) await db.cestino('serie', serie.id);
        await db.cestino('sedute', s.id);
        await ricaricaTutto();
        vai('/storico');
      },
      classe: 'fantasma pericolo-b',
    }),
  ]));
}

/** Riga modificabile dello storico: si cambia un numero e si salva da solo. */
function rigaStorico(serie, numero, e, s, pesoRigaSorella = null) {
  const serieCardio = eCardio(e);
  const assistenza = !serieCardio && !convenzioneMisuraCarico(e.convenzione);
  const chiave = assistenza ? 'peso_assistenza' : 'peso';
  const riga = el('div', { class: 'riga-serie', dati: { serieId: serie.id } });
  if (serie.spotter) riga.classList.add('serie-spotter');
  if (serie.ripetizioni !== null && Number(serie.ripetizioni) % 1 !== 0) riga.classList.add('serie-decimale');
  if (eFatta(serie)) riga.classList.add('serie-fatta');

  // copia di comodo: come nella seduta attiva, aggiorno subito quello che
  // vedo e poi salvo. Prima qui non si aggiornava niente, e per questo
  // premendo lo spotter sembrava che si fosse spuntata la serie (e viceversa).
  const perView = { ...serie };
  const etichettaFatta = el('span', { class: 'etichetta-fatta', testo: '' });
  riga.appendChild(etichettaFatta);

  const spunta = el('button', {
    type: 'button',
    class: 'bottone-spunta' + (eFatta(serie) ? ' attiva' : ''),
    title: eFatta(serie) ? 'Segnata come fatta: tocca per toglierla' : 'Segna come fatta',
    'aria-pressed': eFatta(serie) ? 'true' : 'false',
    onClick: () => {
      const fatta = !eFatta(perView);
      perView.stato = fatta ? 'fatta' : 'da_fare';
      segnaAspettoFatto(riga, spunta, fatta, etichettaFatta);
      if (fatta) pulsa();
      aggiornaSerie(serie, { stato: perView.stato })
        .then(() => disegna())
        .catch(() => mostraErroreBreve('Non sono riuscito a salvare la spunta.'));
    },
  }, [el('span', { class: 'segno-spunta', testo: eFatta(serie) ? '✓' : '' })]);
  riga.appendChild(spunta);

  riga.appendChild(el('button', {
    type: 'button',
    class: 'numero-serie numero-serie-bottone',
    title: 'Segna come fatta',
    'aria-pressed': eFatta(serie) ? 'true' : 'false',
    onClick: () => {
      const fatta = !eFatta(perView);
      perView.stato = fatta ? 'fatta' : 'da_fare';
      segnaAspettoFatto(riga, spunta, fatta, etichettaFatta);
      if (fatta) pulsa();
      aggiornaSerie(serie, { stato: perView.stato })
        .then(() => disegna())
        .catch(() => mostraErroreBreve('Non sono riuscito a salvare la spunta.'));
    },
  }, [el('span', { testo: String(numero) })]));

  if (!serieCardio) {
    const peso = campoNumero(serie[chiave], {
      onCambio: conRitardo((v) => aggiornaSerie(serie, { [chiave]: numeroOppureNull(v) })),
    });
    peso.classList.add('campo-peso');
    const scriviPeso = (valore) => {
      const tondo = Math.round(valore * 100) / 100;
      peso.value = String(tondo).replace('.', ',');
      perView[chiave] = tondo;
      aggiornaSerie(serie, { [chiave]: tondo });
    };
    riga.appendChild(el('label', { class: 'campetto' }, [
      el('div', { class: 'gruppo-peso' }, [
        peso,
        el('span', { class: 'sotto-campo', testo: assistenza ? 'ZAVORRA' : 'KG' }),
        pesoRigaSorella !== null && pesoRigaSorella !== undefined
          ? el('div', { class: 'passi-peso' }, [
            bottone('come sopra', {
              onClick: () => scriviPeso(pesoRigaSorella),
              classe: 'passo passo-largo',
              titolo: `Copia ${formattaNumero(pesoRigaSorella)} kg dalla serie precedente`,
            }),
          ])
          : null,
      ]),
    ]));
  }

  const rip = campoNumero(serieCardio ? valoreMinutiCardioNelCampo(serie) : serie.ripetizioni, {
    etichetta: serieCardio ? 'minuti' : 'ripetizioni',
    onCambio: conRitardo((v) => {
      const ripetizioni = numeroOppureNull(v);
      return aggiornaSerie(serie, serieCardio
        ? { ripetizioni, durata_unita: 'minuti' }
        : { ripetizioni });
    }),
  });
  rip.classList.add('campo-rip');
  riga.appendChild(el('label', { class: 'campetto' + (serieCardio ? ' campetto-cardio' : '') }, [
    rip,
    el('span', { class: 'sotto-campo', testo: serieCardio ? 'MIN' : 'RIP' }),
  ]));
  if (serieCardio) {
    riga.appendChild(el('p', {
      class: 'nota nota-piccola nota-cardio',
      testo: 'Scrivi i minuti. I valori storici in secondi sono convertiti.',
    }));
  }

  // lo spotter: come in palestra, si vede subito e si può togliere
  if (!serieCardio) {
    const badgeSpotter = el('span', { class: 'badge-spotter' });
    const scriviBadge = () => {
      const testo = etichettaSpotterSerie(perView);
      badgeSpotter.textContent = testo ? 'fatta con lo spotter · ' + testo : '';
    };
    scriviBadge();
    const botSpotter = bottone(perView.spotter ? '✓ Spotter' : 'Spotter', {
      onClick: async () => {
        const nuovo = !perView.spotter;
        perView.spotter = nuovo;
        await aggiornaSerie(serie, { spotter: nuovo });
        if (nuovo) pulsa();
        disegna();
      },
      classe: perView.spotter ? 'spotter attivo' : 'fantasma',
    });
    riga.appendChild(botSpotter);
    riga.appendChild(pulsanteDropset(serie, { perView }));
    riga.appendChild(badgeSpotter);

    const assistite = el('div', { class: 'gruppo-assistite' });
    if (perView.spotter) {
      const ass = campoNumero(serie.rip_assistite, {
        onCambio: conRitardo((v) => aggiornaSerie(serie, { rip_assistite: numeroOppureNull(v) })),
      });
      ass.classList.add('piccolo');
      assistite.appendChild(el('label', { class: 'campetto' }, [
        ass, el('span', { class: 'sotto-campo', testo: 'ASSISTITE' }),
      ]));
    }
    riga.appendChild(assistite);
    if (serie.dropset) riga.appendChild(bloccoDropset(serie));
  }
  if (serie.nota) riga.appendChild(el('div', { class: 'nota-serie', testo: serie.nota }));
  return riga;
}

/* ===================== vista: scheda ===================== */

/**
 * La scheda in editing vive qui fuori, non dentro la schermata.
 * Prima la ricreavo a ogni ridisegno e così tutto quello che avevi spostato
 * o tolto spariva: le frecce sembravano premute ma non cambiava niente.
 */
let bozzaAttiva = null;

function prendiBozza() {
  const v = versioneCorrente();
  // il controllo su `snapshot` mancava: se manca, `JSON.stringify(undefined)` restituisce
  // `undefined` (non una stringa) e `JSON.parse(undefined)` LANCIA. Il chiamante pensava
  // solo al caso `null`, quindi l'eccezione saliva fuori e la pagina restava a meta'.
  // Uno snapshot mancante È una versione corrotta o un import a meta': meglio dire
  // "non c’è" che far esplodere la schermata.
  if (!v || !v.snapshot) return null;
  if (!bozzaAttiva || bozzaAttiva.versioneId !== v.id) {
    bozzaAttiva = { versioneId: v.id, dati: JSON.parse(JSON.stringify(v.snapshot)) };
  }
  return bozzaAttiva.dati;
}

function scartaBozza() { bozzaAttiva = null; }

function vistaScheda(zona) {
  const v = versioneCorrente();
  // I DUE `return` MUUTI DI QUI ERANO UN BUTO VERO: se la versione o la bozza non
  // ci sono, la schermata restava VUOTA, senza cornice e senza spiegazione. Un
  // utente che preme "modifica scheda" e vede una pagina bianca pensa che l'app sia
  // rotta. Le altre viste già scrivevano un messaggio ("Giorno non trovato"), quindi
  // qui mancava solo quello.
  if (!v) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Non trovo nessuna scheda da modificare. Torna alla home e riprova.' }));
    return;
  }
  const bozza = prendiBozza();
  if (!bozza) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Questa scheda non si puo\' modificare adesso (manca il contenuto). Torna alla home e riprova.' }));
    return;
  }
  zona.appendChild(el('a', { href: '#/', class: 'indietro', testo: '← allenamento' }));
  zona.appendChild(el('h1', { testo: 'Modifica la scheda' }));
  zona.appendChild(el('p', { class: 'nota', testo: `Stai modificando la versione numero ${v.numero}. Quando salvi, nasce una versione nuova: le sedute passate restano esattamente come sono.` }));
  const contenitore = el('div');
  for (const g of bozza.giorni) {
    const sezione = el('section', { class: 'blocco-giorno-modifica' });
    sezione.appendChild(el('h2', { testo: g.nome }));
    g.esercizi.forEach((es, idx) => {
      const e = esercizioPerId(es.esercizio_id);
      if (!e) return;
      const numeroSerie = el('input', { type: 'number', min: '0', max: '12', class: 'campo-serie', value: String(es.serie.length) });
      sezione.appendChild(el('div', { class: 'riga-modifica' }, [
        el('img', { src: e.foto, alt: '', class: 'foto-esercizio' }),
        el('div', { class: 'cresci' }, [
          el('strong', { testo: e.nome }),
          (() => {
            const m = muscoliDiEsercizio(e, { soloPrincipale: true });
            return m ? el('span', { class: 'nota nota-piccola', testo: m }) : null;
          })(),
          el('span', { class: 'nota', testo: ETICHETTE_CONVENZIONE[e.convenzione] || '' }),
        ]),
        el('label', { class: 'campetto' }, [numeroSerie, el('span', { class: 'sotto-campo', testo: 'SERIE' })]),
        bottone('↑', { onClick: () => sposta(bozza, g, idx, -1), classe: 'fantasma piccolo-b' }),
        bottone('↓', { onClick: () => sposta(bozza, g, idx, 1), classe: 'fantasma piccolo-b' }),
        bottone('Togli', {
          onClick: async () => {
            const ok = await chiediConferma('Togliere l\'esercizio?', `"${e.nome}" verra\' tolto da ${g.nome} nelle sedute future. Nello storico resta com\'era.`, { testoOk: 'Togli', pericolo: true });
            if (ok) { g.esercizi.splice(idx, 1); disegna(); }
          },
          classe: 'fantasma piccolo-b pericolo-b',
        }),
      ]));
      numeroSerie.addEventListener('change', () => {
        const n = Math.max(0, Math.min(12, Number(numeroSerie.value) || 0));
        const serie = [];
        for (let i = 0; i < n; i++) serie.push(es.serie[i] || { peso: null, peso_assistenza: null, ripetizioni: null, dropset: false });
        es.serie = serie;
      });
      // NB: qui dentro non si mette mai un riferimento a un elemento della pagina.
      // La bozza viene serializzata per essere salvata: se ci finisce dentro un
      // nodo del DOM, il salvataggio fallisce con "struttura circolare".
    });
    sezione.appendChild(bottone('+ Aggiungi esercizio', { onClick: () => scegliEsercizio(bozza, g), classe: 'fantasma' }));
    contenitore.appendChild(sezione);
  }
  zona.appendChild(contenitore);

  zona.appendChild(el('div', { class: 'riga-pulsanti fisso' }, [
    bottone('Salva come nuova versione', {
      onClick: async () => {
        const ok = await chiediConferma(
          'Salvare la nuova scheda?',
          'Le sedute che hai gia\' fatto restano intatte: loro conservano la versione con cui sono state fatte. Le prossime useranno quella nuova.',
          { testoOk: 'Salva' },
        );
        if (!ok) return;
        const nuova = pulisciOrdini(bozza);
        const nuovoNumero = Math.max(0, ...versioniDellaPersona().map((x) => Number(x.numero) || 0)) + 1;
        const nuovaVersioneId = 'ver-' + nuovoId();
        await db.salva('versioni', {
          id: nuovaVersioneId, scheda_id: schedaAttivaId(), numero: nuovoNumero, snapshot: JSON.parse(JSON.stringify(nuova)),
          nota: 'Modificata a mano.',
        });
        await db.salva('schede', { ...scheda(), versione_corrente: nuovaVersioneId });
        scartaBozza();
        await ricaricaTutto();
        avviso(`Scheda salvata. Ora sei alla versione ${nuovoNumero}.`, { tipo: 'ok' });
        vai('/');
      },
      classe: 'principale grande',
    }),
  ]));

  const storicoVersioni = el('details', { class: 'storico-versioni' }, [el('summary', { testo: 'Versioni della scheda' })]);
  for (const ver of versioniDellaPersona().sort((a, b) => b.numero - a.numero)) {
    const conta = ((ver.snapshot && ver.snapshot.giorni) || []).reduce((a, g) => a + (g.esercizi || []).length, 0);
    storicoVersioni.appendChild(el('p', { testo: `Versione ${ver.numero}: ${conta} esercizi — ${ver.nota || ''}` }));
  }
  zona.appendChild(storicoVersioni);
}

function sposta(bozza, g, idx, dir) {
  const a = idx + dir;
  if (a < 0 || a >= g.esercizi.length) return;
  const tmp = g.esercizi[idx];
  g.esercizi[idx] = g.esercizi[a];
  g.esercizi[a] = tmp;
  disegna();
}

function pulisciOrdini(bozza) {
  for (const g of bozza.giorni) {
    g.esercizi.forEach((e, i) => { e.ordine = i + 1; });
    g.ordine = bozza.giorni.indexOf(g) + 1;
  }
  return bozza;
}

/**
 * I FILTRI GENERALI (Ste, 21/10/2026).
 *
 * "aggiungi anche un filtro per parte muscolare specifico (tricipiti, petto, dorsali,
 * centro schiena, lombari, trapezi, bicipiti, quadricipiti, femorali ecc) e un altro in
 * generale (gambe, braccia, schiena, petto)".
 *
 * I due filtri sono due cose diverse: quello GENERALE dice l'argomento (gambe,
 * braccia, schiena, petto), quello SPECIFICO dice il muscolo (tricipiti, dorsali,
 * centro schiena, trapezi...). Scelto il generale, lo specifico si restringe dentro:
 * non si può chiedere "tricipiti" e "gambe" insieme, che non hanno senso.
 *
 * I nomi sono quelli di Ste, non quelli del codice: l'avambraccio è "braccia", il dorso
 * è "schiena".
 */
const FILTRO_GENERALE = {
  petto: 'petto',
  braccio: 'braccia',
  avambraccio: 'braccia',
  dorso: 'schiena',
  gambe: 'gambe',
  core: 'addome',
  spalle: 'spalle',
};

function scegliEsercizio(bozza, g) {
  const usati = new Set(g.esercizi.map((x) => x.esercizio_id));
  const liberi = V.esercizi.filter((e) => !usati.has(e.id));
  if (!liberi.length) { avviso('In questo giorno ci sono gia\' tutti gli esercizi.'); return; }
  const box = el('div', { class: 'sfondo-dialogo' });
  const lista = el('div', { class: 'dialogo dialogo-largo' }, [el('h3', { testo: 'Aggiungi a ' + g.nome })]);

  // LA RICERCA E I FILTRI (Ste, 21/10/2026)
  //
  // "aggiungi una barra di ricerca nella lista degli esercizi da aggiungere alla scheda
  // perché sono tanti". La lista prima era piatta: con venti esercizi e un telefono in
  // mano, si scorreva per trovare quello giusto.
  //
  // Ogni esercizio sa già quale muscolo lavora (è il classificatore), quindi i filtri
  // non sono un elenco scritto a mano: sono quello che l'app sa davvero.
  const voci = liberi.map((e) => {
    const p = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
    const trovato = !!(p && p.trovata);
    return {
      e,
      // I DELTOIDI SONO TRE (Ste, 21/10/2026): "se premo spalle spunta deltoide
      // dietro e deltoide, ma deve esserci deltoide dietro, avanti, laterale". Il
      // gruppo li aveva tutti insieme, quindi il filtro li mostrava uniti.
      gruppo: trovato ? (ETICHETTE_PARTE[p.parte] || etichettaMuscolo(p.gruppoPrincipale) || '') : '',
      generale: trovato ? (FILTRO_GENERALE[p.muscolo] || '') : '',
      cerca: ((e.nome || '') + ' ' + (trovato && p.nome ? p.nome : '')).toLowerCase(),
    };
  });

  let testoRicerca = '';
  let filtroGenerale = '';
  let filtroGruppo = '';

  const campo = campoTesto('', {
    segnaposto: 'Cerca per nome o per muscolo...',
    onCambio: (v) => { testoRicerca = String(v || '').trim().toLowerCase(); ridisegna(); },
  });
  lista.appendChild(el('div', { class: 'zona-ricerca' }, [campo]));

  const zonaFiltri = el('div', { class: 'zona-filtri' });
  const zonaScelte = el('div', { class: 'lista-scelte' });

  // UN SOLO BOTTONE CHE APRE I FILTRI (Ste, 21/10/2026)
  //
  // "le scelte sono troppo grosse, metti solo un tasto tipo che apre tutti questi
  // filtri". Le due file di pastiglie (argomento e muscolo) erano lunghe e mangiavano
  // mezza schermata: si vedeva la lista solo in fondo. Ora c’è un bottone solo, e
  // i filtri stanno dentro, chiusi, finché non li chiedi.
  //
  // Il bottone dice sempre COME STAI filtrando: "Filtri · petto, tricipiti", così
  // non resti a chiederti perché la lista è corta.
  let filtriAperti = false;
  const bottoneFiltri = bottone('Filtri', {
    onClick: () => { filtriAperti = !filtriAperti; disegnaFiltri(); },
    classe: 'bottone-filtri',
  });
  const rigaFiltri = el('div', { class: 'riga-filtri' });
  lista.appendChild(bottoneFiltri);
  lista.appendChild(rigaFiltri);
  lista.appendChild(zonaFiltri);
  lista.appendChild(zonaScelte);

  const chip = (testo, attivo, onClick) => bottone(testo, {
    onClick,
    classe: 'filtro' + (attivo ? ' filtro-attivo' : ''),
  });

  const disegnaFiltri = () => {
    // il bottone dice come stai filtrando
    const attivi = [filtroGenerale, filtroGruppo].filter(Boolean);
    bottoneFiltri.textContent = attivi.length ? 'Filtri \u00b7 ' + attivi.join(', ') : 'Filtri';
    bottoneFiltri.className = 'bot bottone-filtri' + (attivi.length ? ' filtro-attivo' : '') + (filtriAperti ? ' aperto' : '');
    // il pannello dei filtri: chiuso, si vede solo quando lo chiedi
    if (filtriAperti) zonaFiltri.classList.remove('chiusa');
    else zonaFiltri.classList.add('chiusa');
  };

  const ridisegna = () => {
    svuota(zonaFiltri);
    svuota(zonaScelte);
    disegnaFiltri();

    // il filtro GENERALE: l'argomento
    const generali = [...new Set(voci.map((v) => v.generale).filter(Boolean))];
    if (generali.length > 1) {
      zonaFiltri.appendChild(el('div', { class: 'riga-filtri' }, [
        el('span', { class: 'etichetta-filtro', testo: 'argomento' }),
        chip('tutti', !filtroGenerale, () => { filtroGenerale = ''; filtroGruppo = ''; ridisegna(); }),
        ...generali.map((gr) => chip(gr, filtroGenerale === gr, () => {
          filtroGenerale = filtroGenerale === gr ? '' : gr;
          filtroGruppo = '';
          ridisegna();
        })),
      ]));
    }

    // il filtro SPECIFICO: il muscolo (e si restringe dentro al generale scelto)
    const disponibili = [...new Set(voci
      .filter((v) => !filtroGenerale || v.generale === filtroGenerale)
      .map((v) => v.gruppo)
      .filter(Boolean))];
    if (disponibili.length > 1) {
      zonaFiltri.appendChild(el('div', { class: 'riga-filtri' }, [
        el('span', { class: 'etichetta-filtro', testo: 'muscolo' }),
        chip('tutti', !filtroGruppo, () => { filtroGruppo = ''; ridisegna(); }),
        ...disponibili.map((gr) => chip(gr, filtroGruppo === gr, () => {
          filtroGruppo = filtroGruppo === gr ? '' : gr;
          ridisegna();
        })),
      ]));
    }

    // la lista filtrata
    const filtrate = voci.filter((v) => {
      if (filtroGenerale && v.generale !== filtroGenerale) return false;
      if (filtroGruppo && v.gruppo !== filtroGruppo) return false;
      if (testoRicerca && !v.cerca.includes(testoRicerca)) return false;
      return true;
    });
    if (!filtrate.length) {
      zonaScelte.appendChild(el('p', { class: 'nota', testo: 'Nessun esercizio con questi filtri.' }));
    }
    for (const v of filtrate) {
      const e = v.e;
      zonaScelte.appendChild(bottone('', {
        onClick: () => {
          g.esercizi.push({
            id: 'es-' + nuovoId(), ordine: g.esercizi.length + 1, esercizio_id: e.id,
            opzionale: false, nota: '', serie: [{ peso: null, peso_assistenza: null, ripetizioni: null, dropset: false }],
          });
          box.remove();
          disegna();
        },
        classe: 'voce-scelta',
        figli: [el('img', { src: e.foto, alt: '', class: 'foto-esercizio' }), el('span', { testo: nomeConMuscolo(e, { soloPrincipale: true }) })],
      }));
    }
  };
  ridisegna();

  lista.appendChild(bottone('Annulla', { onClick: () => box.remove(), classe: 'fantasma' }));
  box.appendChild(lista);
  box.addEventListener('click', (ev) => { if (ev.target === box) box.remove(); });
  document.body.appendChild(box);
}

/* ===================== la card "quanto sei migliorato" =====================
 *
 * Ste (22/10/2026): "ordina tutta la pagina dei progressi (e anche del profilo e
 * impostazioni), e' troppo incasinata e troppo lunga e metti che segna che
 * esercizi hai migliorato, in quale sei peggiorato ecc.. come nella foto".
 *
 * Nella foto: tre riquadri con il numero (migliorati, invariati, peggiorati) e
 * sotto la frase che spiega il verdetto. Nient'altro, tutto stretto.
 *
 * La stessa card va in cima alla pagina dei Progressi, del Profilo e delle
 * Impostazioni: e' il riepilogo che si guarda per primo.
 */

/** Le sedute in cui ho fatto un esercizio, in ordine di data. */
function puntiDiEsercizioMio(id) {
  const sedute = (seduteMie() || [])
    .filter((s) => s && !s.eliminata && s.stato === 'completata')
    .sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const punti = [];
  for (const s of sedute) {
    const serie = (V.serie || []).filter((x) => x.seduta_id === s.id && x.esercizio_id === id && !x.eliminata);
    if (!serie.length) continue;
    punti.push({ seduta: s, data: s.data, serie });
  }
  return punti;
}

/** Gli esercizi che ho fatto, con tutto il loro storico. */
function vociEserciziMie() {
  const mie = serieDellaPersona() || [];
  const ids = [...new Set(mie.filter((x) => x && !x.eliminata).map((x) => x.esercizio_id))];
  return ids.map((id) => {
    const punti = puntiDiEsercizioMio(id);
    return {
      nome: (esercizioPerId(id) || {}).nome || id,
      esercizio: esercizioPerId(id),
      punti,
      prevista: null,
    };
  });
}

/** I tre riquadri: quanti esercizi sono andati avanti, quanti fermi, quanti indietro. */
function cardRiepilogoMio() {
  const generale = riepilogoGenerale(vociEserciziMie());
  if (!generale || !generale.analizzati) return null;
  const card = el('div', { class: 'card-riepilogo' });
  card.appendChild(el('p', { class: 'titolo-riepilogo', testo: 'In generale, quanto sei migliorato' }));

  // I TRE RIQUADRI SI APRONO (22/10/2026): Ste "se premo sugli esercizi in cui
  // sono migliorato devono spuntare gli esercizi in cui sono migliorato, stessa
  // cosa su peggiorato e uguale". Premendo un riquadro sotto compare la lista
  // degli esercizi di quel gruppo; premendo un altro, quella lista cambia.
  const dettaglio = el('div', { class: 'dettaglio-riepilogo' });
  const colori = { migliorati: 'verde', indietro: 'rosso', fermi: 'neutro' };
  const aperti = [];
  const quadro = (numero, parola, colore, chiave) => {
    const b = el('button', {
      type: 'button',
      class: 'quadro-riepilogo ' + colore,
      'aria-pressed': 'false',
    }, [
      el('strong', { class: 'numero-riepilogo', testo: String(numero) }),
      el('span', { class: 'parola-riepilogo', testo: parola }),
    ]);
    aperti.push(b);
    b.addEventListener('click', () => {
      const eraAperto = b.getAttribute('aria-pressed') === 'true';
      for (const x of aperti) x.setAttribute('aria-pressed', 'false');
      svuota(dettaglio);
      if (eraAperto) return;
      b.setAttribute('aria-pressed', 'true');
      const voci = (generale.gruppi && generale.gruppi[chiave]) || [];
      if (!voci.length) {
        dettaglio.appendChild(el('p', { class: 'nota', testo: 'Nessun esercizio in questo gruppo.' }));
        return;
      }
      for (const v of voci) {
        dettaglio.appendChild(el('p', { class: 'riga-variazione ' + (colori[chiave] || 'neutro'), testo: v.frase }));
      }
    });
    return b;
  };
  card.appendChild(el('div', { class: 'tre-riquadri' }, [
    quadro(generale.migliorati, 'MIGLIORATI', 'verde', 'migliorati'),
    quadro(generale.fermi, 'INVARIATI', 'neutro', 'fermi'),
    quadro(generale.indietro, 'PEGGIORATI', 'rosso', 'indietro'),
  ]));
  card.appendChild(dettaglio);
  if (generale.linee && generale.linee.length) {
    card.appendChild(el('p', { class: 'nota nota-piccola', testo: generale.linee[0] }));
  }
  return card;
}

/* ===================== vista: progressi ===================== */

/**
 * Le prestazioni di questa persona, per l'esercizio "più forte in generale".
 *
 * Solo i suoi, e solo quelle dove c'è un peso: senza, "in più del tuo corpo" non
 * si può calcolare.
 */
function prestazioniDiQuestaPersona() {
  const peso = pesoCorporeoOra();
  if (!peso) return [];
  const perEsercizio = new Map();
  for (const s of serieDellaPersona()) {
    if (!s || s.eliminata) continue;
    if (!perEsercizio.has(s.esercizio_id)) perEsercizio.set(s.esercizio_id, []);
    perEsercizio.get(s.esercizio_id).push(s);
  }
  const fuori = [];
  for (const [id, serie] of perEsercizio) {
    const e = esercizioPerId(id);
    if (!e) continue;
    fuori.push(prestazione({ esercizio: e, serie, pesoCorporeo: peso, carrucola: e.carrucola || null }));
  }
  return fuori;
}

function vistaProgressi(zona) {
  zona.appendChild(el('h1', { testo: 'Progressi' }));

  // LA CARD COMPATTA PRIMA DI TUTTO (22/10/2026):
  //
  // Ste ha mandato la foto: in alto, tre riquadri con il numero (migliorati,
  // invariati, peggiorati) e sotto la frase con il verdetto. Tutto il resto della
  // pagina viene dopo, e ripiegato dentro sezioni chiuse: la pagina era troppo
  // lunga e troppo incasinata.
  const boxGenerale = el('div', { class: 'spiegazione generale box-riepilogo' });
  const spazioGenerale = el('div', { id: 'riepilogo-generale' });
  boxGenerale.appendChild(el('h3', { testo: 'In generale, quanto sei migliorato' }));
  boxGenerale.appendChild(spazioGenerale);
  zona.appendChild(boxGenerale);
  // LA CARD COMPATTA PRIMA DI TUTTO (22/10/2026): è il riepilogo che si
  // guarda per primo, e sta in alto anche nel Profilo e nelle Impostazioni.
  const cardRiepilogo = cardRiepilogoMio();
  if (cardRiepilogo) zona.appendChild(cardRiepilogo);

  // Ste (04/10/2026): "voglio il rapporto peso potenza quindi in base al peso
  // corporeo". E poi: "con kg intendo il peso che alzo in più rispetto al mio
  // corpo... io peso 66kg e faccio 96 di lat machine, alzo 30kg in più".
  //
  // Va PRIMA di tutto il resto, perchÈ È la domanda vera: "sto migliorando?"
  // I kg da soli non lo dicono, perchÈ se il peso sale le soglie salgono e i
  // kg possono salire senza che tu sia più forte.
  const pesoOraProgressi = pesoCorporeoOra();
  if (pesoOraProgressi) {
    const prestazioniOra = prestazioniDiQuestaPersona();
    const media = mediaPrestazioni(prestazioniOra);
    // La spiegazione lunga sta in una scheda chiusa (22/10/2026): la pagina
    // dei Progressi era troppo lunga e troppo incasinata.
    const boxForza = el('div', { class: 'spiegazione generale' });
      // La spiegazione lunga sta in una SCHEDA CHIUSA (22/10/2026): la pagina dei
      // Progressi era troppo lunga e troppo incasinata. Il titolo si vede, il
      // resto si apre con un tocco.
      const dentroForza = el('div', { class: 'dentro-scheda' });
      boxForza.appendChild(el('details', { class: 'scheda-chiusa' }, [
        el('summary', { class: 'scheda-titolo', testo: 'Quanto stai sollevando in più del tuo corpo' }),
        dentroForza,
      ]));
    if (media.media === null) {
      dentroForza.appendChild(el('p', { class: 'nota', testo: 'Non ci sono ancora esercizi con un peso registrato.' }));
    } else {
      dentroForza.appendChild(el('p', {
        class: 'nota numero-grande',
        testo: `${formattaNumero(media.percentuale)}%`,
      }));
      dentroForza.appendChild(el('p', {
        class: 'nota nota-piccola',
        testo: `La percentuale è quanto hai sollevato rispetto a quello che ci si aspetta `
          + `da una persona forte come te, su quel pezzo. 100% vuol dire che l'hai eguagliato, `
          + `sotto il 100% che ti manca, sopra il 100% che lo hai superato. `
          + `È calcolata sul tuo corpo di ${formattaNumero(pesoOraProgressi)} kg, `
          + `su ${media.conta} esercizi${media.saltate ? ` (ne ho esclusi ${media.saltate})` : ''}.`,
      }));
      dentroForza.appendChild(el('p', {
        class: 'nota nota-piccola',
        testo: 'Sopra il 100% vuol dire che hai superato il livello di chi si allena bene: '
          + 'i numeri di riferimento sono stime prudenti, e se per te sono sbagliati, '
          + 'il numero giusto è quello che dici tu.',
      }));
      dentroForza.appendChild(el('p', {
        class: 'nota nota-piccola',
        testo: 'Le gambe non contano nella media: i loro numeri sono troppo alti e la farebbero saltare. '
          + 'Restano visibili uno per uno, però.',
      }));
    }
    zona.appendChild(boxForza);

    // Ste (04/10/2026): "voglio che dica chi in generale È più forte, facendo
    // una media, e sia che si vedano tutti gli esercizi facendo vedere chi fa di
    // più" e "non voglio solo che si veda chi È il più forte: voglio vedere gli
    // altri".
    //
    // Tutti gli esercizi in elenco, ognuno con i kg e il rapporto, e in alto la
    // media. Una classifica che mostra solo il primo È una pubblicita': qui si vede
    // anche dove hai i numeri più bassi, che È la parte che serve a capire.
    if (prestazioniOra.length) {
      const boxTabella = el('div', { class: 'spiegazione generale' });
      boxTabella.appendChild(el('h3', { testo: 'Ogni esercizio, e quanto vali' }));
      const utili = prestazioniOra.filter((p) => p.percentuale !== null);
      const lista = utili.slice().sort((a, b) => b.percentuale - a.percentuale);
      for (const p of lista) {
        const righe = el('div', { class: 'riga-esercizio-forza' }, [
          el('strong', { testo: p.nome }),
          el('span', { testo: `${formattaNumero(p.kg)} kg` }),
          el('span', { testo: `${formattaNumero(p.rapporto)}× il tuo peso` }),
          el('span', { testo: `${formattaNumero(p.percentuale)}% del livello realistico` }),
        ]);
        if (!p.contaNellaMedia) {
          righe.appendChild(el('span', { class: 'nota nota-piccola', testo: 'non conta nella media: è gamba' }));
        }
        boxTabella.appendChild(righe);
      }
      zona.appendChild(boxTabella);
    }
  }

  // Il riepilogo generale viene PRIMA di tutto il resto: Ste ha detto che coi
  // grafici da solo non capisce, quindi la risposta principale È in parole.
  // Il riquadro vecchio "In generale, quanto sei migliorato" duplicava la card
  // nuova (che sta in cima alla pagina, con i riquadri cliccabili). Ste (22/10/2026):
  // "la cosa dei progressi in quanti sono migliorato peggiorato e uguale".
  // Quindi questo qui sotto si nasconde e resta solo la card.
  zona.appendChild(el('p', { class: 'nota', testo: 'Gli esercizi sono divisi per variante: Chest Press e Chest Press su un\'altra macchina non vengono mai messi a confronto.' }));

  const v = versioneCorrente();
  const eserciziNellaScheda = [];
  for (const g of ((v && v.snapshot && v.snapshot.giorni) || [])) {
    for (const es of (g.esercizi || [])) {
      if (!eserciziNellaScheda.includes(es.esercizio_id)) eserciziNellaScheda.push(es.esercizio_id);
    }
  }
  // solo le serie di questa persona: altrimenti i progressi mescolerebbero
  const mieSerie = serieDellaPersona();
  const conDati = eserciziNellaScheda.filter((id) => mieSerie.some((x) => x.esercizio_id === id && !x.eliminata));
  if (!conDati.length) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Nessun dato registrato. Chiudi un allenamento e qui compaiono i tuoi progressi.' }));
    return;
  }

  let selezionato = conDati[0];
  let periodo = 'tutto';

  const contenitoreGrafici = el('div');
  const contenitoreTesto = el('div');

  const periodi = [
    { k: 'tutto', t: 'Tutto' },
    { k: '30', t: 'Ultimi 30 giorni' },
    { k: '90', t: 'Ultimi 3 mesi' },
    { k: '180', t: 'Ultimi 6 mesi' },
    { k: '365', t: 'Ultimo anno' },
  ];

  const selettoreEsercizio = el('select', { class: 'selettore' },
    conDati.map((id) => el('option', { value: id, testo: (esercizioPerId(id) || {}).nome || id })));
  selettoreEsercizio.addEventListener('change', () => { selezionato = selettoreEsercizio.value; aggiorna(); });

  const selettorePeriodo = el('div', { class: 'chip-scelte' },
    periodi.map((p) => bottone(p.t, {
      onClick: (ev) => {
        periodo = p.k;
        for (const b of selettorePeriodo.children) b.classList.remove('attivo');
        ev.currentTarget.classList.add('attivo');
        aggiorna();
      },
      classe: 'chip' + (p.k === 'tutto' ? ' attivo' : ''),
    })));

  zona.appendChild(el('label', { class: 'nota', testo: 'Esercizio' }));
  zona.appendChild(selettoreEsercizio);
  zona.appendChild(el('div', { class: 'nota', testo: 'Periodo' }));
  zona.appendChild(selettorePeriodo);
  zona.appendChild(contenitoreTesto);
  zona.appendChild(contenitoreGrafici);

  function storicoDi(esercizioId) {
    // ordino per data E per ora d'inizio: se due sedute cadono lo stesso
    // giorno, con la sola data l'ordine era arbitrario e le due sedute
    // potevano risultare scambiate (il peso vecchio e quello nuovo invertiti).
    const seduteRilevanti = seduteDellaPersona()
      .filter((s) => s.stato === 'completata' && !s.eliminata)
      .sort((a, b) => (String(a.data) + ' ' + String(a.ora_inizio || ''))
        .localeCompare(String(b.data) + ' ' + String(b.ora_inizio || '')));
    const punti = [];
    for (const s of seduteRilevanti) {
      const serie = V.serie.filter((x) => x.seduta_id === s.id && x.esercizio_id === esercizioId && !x.eliminata);
      if (!serie.length) continue;
      punti.push({ data: s.data, ora: s.ora_inizio, seduta: s, serie });
    }
    if (periodo !== 'tutto') {
      const limite = new Date();
      limite.setDate(limite.getDate() - Number(periodo));
      const iso = limite.toISOString().slice(0, 10);
      return punti.filter((p) => p.data >= iso);
    }
    return punti;
  }

  function storicoEsercizio() {
    return storicoDi(selezionato);
  }

  // Il peso previsto dalla scheda NEL GIORNO IN CUI HAI ALLENATO.
  //
  // Ste ha fatto così: durante l'allenamento ha alzato di 3 kg e poi ha
  // confermato "Aggiorna la scheda". A quel punto la scheda corrente contiene
  // già 38 kg, quindi confrontare la seduta con lei dava zero e l'esercizio
  // finiva fra i "fermi". Invece va confrontato con la scheda che hai usato
  // mentre allenavi: e quella È ancora salvata, È la versione della seduta.
  function pesoPrevistoPerSessione(esercizioId, seduta) {
    const e = esercizioPerId(esercizioId);
    if (!e || !seduta) return null;
    const assistito = !convenzioneMisuraCarico(e.convenzione);
    const v = V.versi.find((x) => x.id === seduta.versione_id);
    const giorni = (v && v.snapshot && v.snapshot.giorni) || [];
    let massimo = null;
    for (const g of giorni) {
      for (const es of (g.esercizi || [])) {
        if (es.esercizio_id !== esercizioId) continue;
        for (const ser of (es.serie || [])) {
          const p = assistito ? ser.peso_assistenza : ser.peso;
          if (p === null || p === undefined || !Number.isFinite(Number(p))) continue;
          massimo = massimo === null ? Number(p) : Math.max(massimo, Number(p));
        }
      }
    }
    return massimo;
  }

function aggiorna() {
    const e = esercizioPerId(selezionato);
    // L'ESERCIZIO PUÒ NON ESSERCI PIÙ.
    //
    // Centocinquanta righe più su, il costruttore del menu scrive
    // `(esercizioPerId(id) || {}).nome || id`: lì è previsto che l'esercizio manchi.
    // Qui no: `e.nome` con `e === null` solleva un TypeError, e l'interfaccia
    // sostituisce tutta la pagina con la schermata d'errore.
    //
    // Quando succede: importi un backup fatto su un altro dispositivo con
    // "sostituzione", gli esercizi del catalogo che non erano in quel backup finiscono
    // nel cestino, ma restano negli snapshot delle versioni. Apri i Progressi e la
    // pagina non si carica più.
    if (!e) {
      svuota(contenitoreTesto);
      svuota(contenitoreGrafici);
      svuota(spazioGenerale);
      contenitoreTesto.appendChild(el('p', { class: 'nota', testo: 'Questo esercizio non è più nel catalogo, ma le sue serie ci sono ancora. Aggiungilo di nuovo dal catalogo per rivedere i progressi.' }));
      return;
    }
    const punti = storicoEsercizio();
    svuota(contenitoreTesto);
    svuota(contenitoreGrafici);
    svuota(spazioGenerale);

    const descrizionePeriodo = periodo === 'tutto' ? '' : (periodi.find((p) => p.k === periodo) || {}).t.replace('Ultimi ', '').replace('Ultimo ', '');

    // il riepilogo generale: tutti gli esercizi insieme, non uno solo
    const vociEsercizi = conDati.map((id) => {
      const punti = storicoDi(id);
      const ultima = punti.length ? punti[punti.length - 1] : null;
      return {
        nome: (esercizioPerId(id) || {}).nome || id,
        esercizio: esercizioPerId(id),
        punti,
        prevista: pesoPrevistoPerSessione(id, ultima && ultima.seduta),
      };
    });
    const generale = riepilogoGenerale(vociEsercizi);
    if (generale.numeri.length) {
      // I riquadri si toccano: premendo "migliorati" (o "fermi", o "indietro")
      // sotto compare la lista esercizio per esercizio con di quanto È cambiato.
      const dettaglio = el('div', { class: 'dettaglio-riepilogo' });
      const colori = { migliorati: 'verde', indietro: 'rosso', fermi: 'neutro' };
      const riquadri = [];

      const chiudiTutti = () => {
        for (const b of riquadri) b.setAttribute('aria-pressed', 'false');
      };

      const scriviDettaglio = (chiave) => {
        svuota(dettaglio);
        const voci = (generale.gruppi && generale.gruppi[chiave]) || [];
        chiudiTutti();
        for (const b of riquadri) {
          if (b.dataset.gruppo === chiave) b.setAttribute('aria-pressed', 'true');
        }
        if (!voci.length) {
          dettaglio.appendChild(el('p', { class: 'nota', testo: 'Nessun esercizio in questo gruppo.' }));
          return;
        }
        for (const v of voci) {
          dettaglio.appendChild(el('p', { class: 'riga-variazione ' + (colori[chiave] || 'neutro'), testo: v.frase }));
        }
      };

      for (const n of generale.numeri) {
        const b = bottone('', {
          onClick: () => {
            const giaAperto = riquadri.find((x) => x.getAttribute('aria-pressed') === 'true');
            if (giaAperto && giaAperto.dataset.gruppo === n.etichetta) {
              svuota(dettaglio); // secondo tocco: richiudi
              chiudiTutti();
              return;
            }
            scriviDettaglio(n.etichetta);
          },
          classe: 'numero-riepilogo ' + (colori[n.etichetta] || 'neutro'),
        }, [
          el('strong', { testo: String(n.valore) }),
          el('span', { testo: n.etichetta }),
        ]);
        b.dataset.gruppo = n.etichetta;
        b.setAttribute('aria-pressed', 'false');
        riquadri.push(b);
      }

      spazioGenerale.appendChild(el('div', { class: 'numeri-riepilogo' }, riquadri));
      spazioGenerale.appendChild(dettaglio);
      spazioGenerale.appendChild(el('p', { class: 'nota nota-piccola', testo: 'Tocca un riquadro per vedere gli esercizi uno per uno e di quanto sono cambiati.' }));
    }
    for (const riga of generale.linee) {
      spazioGenerale.appendChild(el('p', { class: 'riga-spiegazione', testo: riga }));
    }

    const res = testoProgresso(e.nome, e, punti, descrizionePeriodo);

    const box = el('div', { class: 'spiegazione' });
    box.appendChild(el('h3', { testo: e.nome }));
    box.appendChild(el('p', { class: 'nota', testo: res.convenzione }));
    for (const riga of res.linee) box.appendChild(el('p', { class: 'riga-spiegazione', testo: riga }));
    contenitoreTesto.appendChild(box);

    if (!res.dati.length) return;

    const etichettaBreve = (d) => {
      const x = new Date(d + 'T12:00:00');
      return x.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    };
    const assistito = !convenzioneMisuraCarico(e.convenzione);
    const chiave = assistito ? 'assistenza' : 'pesoMassimo';

    contenitoreGrafici.appendChild(el('h3', { testo: assistito ? 'Andamento del peso di assistenza' : 'Andamento del carico massimo' }));
    contenitoreGrafici.appendChild(graficoLinea(
      res.dati.map((d) => ({ etichetta: etichettaBreve(d.data), ...d })),
      {
        chiaveY: chiave,
        titoloY: assistito ? 'kg di assistenza (meno = meglio)' : 'kg',
        larghezza: 680,
        altezza: 220,
        nota: assistito
          ? 'Con il corpo libero questo numero non e\' un record: piu\' assistenza = lavoro piu\' leggero.'
          : 'Il carico massimo di ogni seduta. Ricorda che piu\' kg non vuol dire automaticamente meglio.',
      },
    ));

    const ripCostanti = serieARipetizioniCostanti(punti, e);
    if (ripCostanti.punti.length >= 2) {
      contenitoreGrafici.appendChild(el('h3', { testo: `Ripetizioni a parita\' di peso (${formattaNumero(ripCostanti.peso)} kg)` }));
      contenitoreGrafici.appendChild(graficoLinea(
        ripCostanti.punti.map((p) => ({ etichetta: etichettaBreve(p.data), ...p })),
        { chiaveY: 'ripetizioniMedie', titoloY: 'ripetizioni medie', larghezza: 680, altezza: 220 },
      ));
    }

    const conVolume = res.dati.filter((d) => d.volume !== null);
    if (!assistito && conVolume.length) {
      contenitoreGrafici.appendChild(el('h3', { testo: 'Volume della seduta' }));
      contenitoreGrafici.appendChild(graficoBarre(
        conVolume.map((d) => ({ etichetta: etichettaBreve(d.data), ...d })),
        { chiaveY: 'volume', titoloY: 'volume (kg)', larghezza: 680, altezza: 220 },
      ));
    }
  }
  aggiorna();
}

/* ===================== vista: impostazioni ===================== */

/**
 * I SUONI.
 *
 * Ste (10/10/2026): per l'app Palestra l'audio è permesso, e insieme alle animazioni
 * mi ha chiesto di migliorare l'app. Così ora l'app suona quando spunti una serie e
 * quando finisci l'allenamento.
 *
 * Però l'interruttore c'è, e per una ragione che non è "per far contenta la regola":
 * sei in una palestra, e ogni tanto qualcuno ha la musica alta. Se non lo puoi
 * spegnere, la prima cosa che fai è togliere l'app dalla home.
 *
 * Il suono che descrive il bottone è lo stesso suono della serie: così capisci cosa
 * stai spegnendo senza doverlo indovinare.
 */
function bloccoSuoni() {
  const box = el('section', { class: 'blocco' });
  box.appendChild(el('h2', { testo: 'Suoni' }));
  box.appendChild(el('p', {
    class: 'nota',
    testo: 'Un suono breve quando spunti una serie e quando finisci l\'allenamento. '
      + 'Sono generati dal telefono, quindi funzionano anche senza rete.',
  }));

  const riga = el('div', { class: 'riga-pulsanti' });
  const disegna = () => {
    svuota(riga);
    const spento = audioSpento();
    riga.appendChild(bottone(spento ? 'Riaccendi i suoni' : 'Spegni i suoni', {
      onClick: () => {
        const nuovo = !audioSpento();
        impostaAudioSpento(nuovo);
        db.leggiMeta('audio_spento', false).then(() => db.scriviMeta('audio_spento', nuovo));
        disegna();
        // se li riaccendi, li senti subito: senza, non sai se funzionano
        if (!nuovo) suona('serie');
      },
      classe: 'fantasma' + (audioSpento() ? '' : ' attivo'),
    }));
    if (!audioSpento()) {
      riga.appendChild(el('span', { class: 'nota nota-piccola', testo: 'Suonano' }));
    }
  };

  // la scelta va ricordata, non rimessa su ogni apertura
  db.leggiMeta('audio_spento', false).then((v) => {
    impostaAudioSpento(!!v);
    disegna();
  });
  riga.appendChild(el('span', { class: 'nota nota-piccola', testo: 'Sto caricando...' }));
  box.appendChild(riga);
  return box;
}

/**
 * Le animazioni: accese, spente, o come le vuole Windows.
 *
 * Ste (10/10/2026): "comunque io le animazioni non le vedo".
 *
 * Non erano un CSS rotto: il CSS ha la regola di accessibilità standard che
 * spegne tutto quando il browser dice `prefers-reduced-motion`, e quel segnale su
 * Windows viene da un interruttore in Impostazioni > Accessibilità > Effetti
 * visivi, che sul suo PC era spento. Quindi le 13 animazioni erano spente apposta,
 * e da un pezzo.
 *
 * Qui si sceglie cosa fare. Il default è "come su Windows", che è la scelta
 * prudente. Ma se le vuoi e Windows le ha spente per un motivo che non c'entra,
 * "sempre accese" mette una classe sul <html> e la regola di accessibilità non
 * scatta più: la tua scelta vale più del segnale del sistema.
 */
function bloccoAnimazioni() {
  const box = el('section', { class: 'blocco' });
  box.appendChild(el('h2', { testo: 'Animazioni' }));
  box.appendChild(el('p', {
    class: 'nota',
    testo: 'I movimenti quando tocchi qualcosa: la spunta di una serie, il dialogo '
      + 'che si apre, i numeri che cambiano. Sono brevi, mezzo secondo. La scelta vale '
      + 'sia sul computer sia sul telefono.',
  }));

  const riga = el('div', { class: 'riga-animazioni' });
  const spiegazione = el('p', { class: 'nota nota-piccola' });
  const disegna = () => {
    svuota(riga);
    for (const s of SCELTE_ANIMAZIONI) {
      riga.appendChild(bottone(s.testo, {
        onClick: () => { impostaSceltaAnimazioni(s.id); disegna(); },
        classe: 'fantasma' + (sceltaAnimazioni() === s.id ? ' scelto' : ''),
      }));
    }
    const scelta = SCELTE_ANIMAZIONI.find((s) => s.id === sceltaAnimazioni());
    spiegazione.textContent = scelta ? scelta.spiegazione : '';
  };
  disegna();
  box.appendChild(riga);
  box.appendChild(spiegazione);

  // cosa sta succedendo davvero, adesso, su questo dispositivo
  const stato = el('p', { class: 'nota nota-piccola' });
  if (sceltaAnimazioni() === 'sempre') {
    stato.textContent = 'Adesso le animazioni sono accese, su questo e sull\'altro '
      + 'dispositivo, anche se il sistema chiede poco movimento.';
  } else if (sceltaAnimazioni() === 'mai') {
    stato.textContent = 'Adesso le animazioni sono spente.';
  } else if (pocoMovimento()) {
    stato.textContent = 'Adesso questo dispositivo chiede poco movimento, quindi le '
      + 'animazioni non si vedono. Scegli "Sempre accese" per vederle comunque.';
  } else {
    stato.textContent = 'Adesso le animazioni si vedono.';
  }
  box.appendChild(stato);

  // IL BOTtone di prova.
  //
  // Ste: "ma io ancora sul telefono non ne vedo animazioni". Da fuori non si può
  // capire perché: può essere il browser che chiede poco movimento, può essere
  // una copia vecchia della pagina, può essere che le animazioni scattano solo
  // quando tocchi qualcosa e lui stava guardando una schermata ferma.
  //
  // Qui si preme un bottone e si vede qualcosa che si muove. Se non si muove,
  // il problema è il CSS o il browser; se si muove, le animazioni funzionano e
  // quelle dell'app erano semplicemente troppo discrete per accorgersene guardando.
  // La pallina viene tenuta in mano invece di andare a cercarla col selettore: il
  // comando serve per riavviare l'animazione, e cercare nel DOM a ogni pressione
  // non serve a niente. Tenere il riferimento è anche più semplice da leggere.
  const pallina = el('div', { class: 'prova-pallina' });
  const prova = el('div', { class: 'prova-animazione' }, [
    pallina,
    el('span', { class: 'nota nota-piccola', testo: 'Premi: se la pallina si muove, le animazioni funzionano.' }),
  ]);
  // IL BOTTONE DEVE ESSERE AGGIUNTO AL BOX.
  //
  // Qui c'era `bottone('PROVA ANIMAZIONE', {...})` senza `box.appendChild`: la
  // funzione costruiva il bottone e buttava via il risultato. Il bottone non
  // esisteva a schermo, e la pallina restava ferma per sempre: sembrava che le
  // animazioni non funzionassero, ma il bottone per accenderle non c'era mai stato.
  //
  // È il motivo per cui qui il bottone si mette dentro il box e non da solo.
  box.appendChild(bottone('PROVA ANIMAZIONE', {
    onClick: () => {
      // si riavvia l'animazione togliendo e rimettendo la classe: senza, un
      // secondo giro sulla stessa classe non riparte e sembra che non funzioni
      pallina.classList.remove('in-corso');
      void pallina.offsetWidth;
      pallina.classList.add('in-corso');
    },
    classe: 'fantasma',
  }));
  box.appendChild(prova);

  // LO STATO VERO, letto dal browser e non indovinato.
  box.appendChild(el('h3', { class: 'titolo-sottosezione', testo: 'Cosa dice questo browser' }));
  const dettaglio = el('div', { class: 'nota nota-piccola' });
  for (const r of righeAnimazioni()) dettaglio.appendChild(el('p', { testo: r }));
  box.appendChild(dettaglio);

  // IL PULSANTE "AGGIORNA ORA".
  //
  // Ste: "ma io ancora sul telefono non ne vedo animazioni". La causa più probabile
  // su un telefono è la COPIA VECCHIA: l'app è già aperta da prima, il service
  // worker ha già la sua copia in cache, e anche se il sito è cambiato da ore
  // quella copia continua a servire il CSS di ieri. Il reload automatico c'è già,
  // ma funziona solo quando il browser si accorge del cambio: se non se ne accorge,
  // non riparte mai.
  //
  // Qui si butta via la cache e si ricarica, senza toccare i dati: l'account, le
  // sedute e i record stanno in IndexedDB, che questa funzione non tocca.
  // I dati NON si toccano: l'account, le sedute e i record stanno in IndexedDB, che
  // questa funzione non guarda. Cancella solo la copia dei FILE (service worker e
  // cache HTTP), cioè il CSS e i moduli vecchi.
  const rigaAggiorna = el('div', { class: 'riga-pulsanti' });
  rigaAggiorna.appendChild(bottone('AGGIORNA ORA', {
    onClick: async () => {
      avviso('Sto cancellando la copia vecchia e ricarico...', { durata: 2500 });
      try {
        if ('serviceWorker' in navigator) {
          const rs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(rs.map((r) => r.unregister()));
        }
        if (window.caches && window.caches.keys) {
          const chiavi = await window.caches.keys();
          await Promise.all(chiavi.map((k) => window.caches.delete(k)));
        }
      } catch (e) { /* pazienza: il reload lo fa comunque */ }
      window.location.reload();
    },
    classe: 'fantasma',
  }));
  box.appendChild(rigaAggiorna);
  box.appendChild(el('p', {
    class: 'nota nota-piccola',
    testo: 'Se le animazioni non cambiano, prova "Aggiorna ora": butta via la copia '
      + 'vecchia della pagina e ricarica. I tuoi dati non si toccano.',
  }));
  return box;
}

/**
 * Lo stato delle animazioni, letto dal browser.
 *
 * Tutto dentro un try: qui si legge il DOM vero (`document.documentElement`,
 * `getComputedStyle`, i `cssRules` dei fogli di stile) e nessuno di questi è
 * garantito. Un pannello che serve a diagnosticare non può essere lui stesso la
 * cosa che rompe l'app, quindi se qualcosa non c'è la riga dice "non disponibile"
 * e l'app va avanti.
 */
function righeAnimazioni() {
  const fuori = [];
  const si = (v) => (v ? 'sì' : 'no');
  const prova = (fn, fallback = 'non disponibile') => {
    try {
      const r = fn();
      return r === undefined || r === null ? fallback : String(r);
    } catch (e) {
      return fallback;
    }
  };
  const root = () => document.documentElement;

  fuori.push('Classe "animazioni-sempre" sul documento: '
    + prova(() => si(root().classList.contains('animazioni-sempre')), 'non disponibile'));
  fuori.push('Il browser chiede poco movimento: '
    + prova(() => si(pocoMovimento()), 'non disponibile'));
  fuori.push('Animazioni dichiarate nel CSS: '
    + prova(() => contaAnimazioniCss()));
  fuori.push('Scelta salvata: ' + prova(() => sceltaAnimazioni()));
  fuori.push('Versione della pagina: ' + prova(() => window.PALESTRA_VERSIONE, 'sconosciuta'));
  return fuori;
}

/** Conta gli @keyframes presenti in un foglio di stile già caricato dal browser. */
function contaAnimazioniCss() {
  let n = 0;
  for (const f of Array.from(document.styleSheets || [])) {
    let regole = null;
    try {
      regole = f.cssRules;
    } catch (e) {
      continue; // foglio di un altro sito: il browser non lo fa leggere
    }
    if (!regole) continue;
    for (const r of Array.from(regole)) {
      if (r.type === CSSRule.KEYFRAMES_RULE) n += 1;
    }
  }
  return n;
}

function vistaImpostazioni(zona) {
  zona.appendChild(el('h1', { testo: 'Impostazioni' }));

  zona.appendChild(bloccoGiorniAllenamento());

  zona.appendChild(bloccoAnimazioni());

  zona.appendChild(bloccoSuoni());

  // LE PAROLE DELL'APP.
  //
  // Ste (10/10/2026): "spiega cosa vuol dire ripetizione isolamento ecc..".
  //
  // Le parole non mancavano: erano sparse in schermate diverse e nessuna spiegava
  // il PROPRIO significato. "Isolamento" e "composto" si leggono nei nomi dei Rank,
  // "ripetizioni" è scritta sotto quasi ogni campo, e "LP" e "Aura" compaiono senza
  // essere mai spiegate una volta.
  //
  // Stanno qui sotto, in un posto solo, e una volta lette non servono più.
  zona.appendChild(bloccoGlossario(el));

  const statoBox = el('section', { class: 'blocco' });
  statoBox.appendChild(el('h2', { testo: 'Salvataggio e sincronizzazione' }));
  const lineaStato = el('p', { class: 'nota', id: 'stato-dettaglio', testo: 'Sto controllando...' });
  statoBox.appendChild(lineaStato);
  statoBox.appendChild(el('div', { class: 'riga-pulsanti' }, [
    bottone('Sincronizza adesso', { onClick: async () => {
      const r = await sync.sincronizza();
      await aggiornaStatoSalvataggio();
      if (r.messaggio) avviso(r.messaggio, { tipo: 'errore' });
      else if (r.motivo === 'non-collegato') avviso('Sincronizzazione online non configurata: i dati restano su questo dispositivo.', { tipo: 'attenzione' });
      else if (r.motivo === 'offline') avviso('Sei offline: i dati restano salvati e verranno sincronizzati al ritorno della rete.', { tipo: 'attenzione' });
      else if (r.motivo === 'gia-in-corso') avviso('Sincronizzazione già in corso.', { tipo: 'attenzione' });
      else if (r.errori) avviso(`Sincronizzazione parziale: ${r.errori} ${r.errori === 1 ? 'errore' : 'errori'}. Le modifiche restano salvate sul dispositivo.`, { tipo: 'errore' });
      else avviso(`Sincronizzazione fatta: ${r.inviati} righe inviate, ${r.ricevuti} righe ricevute${r.conflitti ? `, ${r.conflitti} ${r.conflitti === 1 ? 'conflitto' : 'conflitti'}` : ''}.`, { tipo: 'ok' });
    }, classe: 'fantasma' }),
    bottone('Riprova dopo un errore', { onClick: async () => { await sync.riprovaOra(); await aggiornaStatoSalvataggio(); }, classe: 'fantasma' }),
  ]));
  sync.stato().then((s) => { lineaStato.textContent = `${s.testo} — ${s.dettaglio}`; });
  zona.appendChild(statoBox);

  const conflittiBox = el('section', { class: 'blocco' });
  conflittiBox.appendChild(el('h2', { testo: 'Conflitti fra dispositivi' }));
  if (!V.conflitti.length) {
    conflittiBox.appendChild(el('p', { class: 'nota', testo: 'Nessun conflitto. Se lo stesso esercizio viene modificato su due dispositivi senza che si parlino, qui trovi le due versioni e scegli tu quale tenere.' }));
  } else {
    for (const c of V.conflitti) {
      const riga = el('div', { class: 'riga-conflitto' });
      riga.appendChild(el('p', { class: 'nota', testo: `${c.tabella} · ${c.riga_id} · scelta fatta il ${dataLeggibile(c.creato_il)}` }));
      for (const lato of ['locale', 'remoto']) {
        const v = c[lato];
        const campi = Object.entries(v).filter(([k]) => !k.startsWith('_') && !['rev', 'updated_at', 'device_id', 'tabella', 'base_rev'].includes(k))
          .map(([k, val]) => `${k}: ${val === null ? '—' : val}`).join(', ');
        riga.appendChild(el('div', { class: 'versione-conflitto' }, [
          el('strong', { testo: v._etichetta || lato }),
          el('p', { class: 'nota', testo: campi || '(nessun dato)' }),
          bottone('Teni questa', {
            onClick: async () => {
              await sync.risolvi(c.id, lato);
              await ricaricaTutto();
              disegna();
            },
            classe: 'fantasma',
          }),
        ]));
      }
      conflittiBox.appendChild(riga);
    }
  }
  zona.appendChild(conflittiBox);

  const schedaBox = el('section', { class: 'blocco' });
  schedaBox.appendChild(el('h2', { testo: 'La scheda si aggiorna da sola?' }));
  schedaBox.appendChild(el('p', { class: 'nota', testo: 'Se durante un allenamento fai una ripetizione in piu\' o aumenti i kg, puoi far salire quei numeri nella scheda, cosi\' la prossima volta li trovi gia\' cosi\'. Si aggiorna solo il giorno che hai allenato e le sedute gia\' registrate non cambiano mai.' }));
  const scelteScheda = el('div', { class: 'chip-scelte' });
  const descrizioni = {
    [MODALITA.CHIEDI]: 'Chiedimi',
    [MODALITA.SEMPRE]: 'Sempre, senza chiedere',
    [MODALITA.MAI]: 'Mai, lascia la scheda come sta',
  };
  db.leggiMeta('aggiornamento_scheda', MODALITA.CHIEDI).then((attuale) => {
    scelteScheda.innerHTML = '';
    for (const modo of [MODALITA.CHIEDI, MODALITA.SEMPRE, MODALITA.MAI]) {
      scelteScheda.appendChild(bottone(descrizioni[modo], {
        onClick: async () => {
          await db.scriviMeta('aggiornamento_scheda', modo);
          disegna();
          avviso('Impostazione salvata: ' + descrizioni[modo].toLowerCase() + '.', { tipo: 'ok' });
        },
        classe: 'chip' + (modo === attuale ? ' attivo' : ''),
      }));
    }
  });
  schedaBox.appendChild(scelteScheda);
  schedaBox.appendChild(el('div', { class: 'riga-pulsanti' }, [
    bottone('Aggiorna la scheda con l\'ultima seduta', {
      onClick: () => aggiornaSchedaDaUltimaSeduta(), classe: 'fantasma',
    }),
  ]));
  zona.appendChild(schedaBox);

  const versioneBox = el('section', { class: 'blocco' });
  versioneBox.appendChild(el('h2', { testo: 'Versione dell\'app' }));
  versioneBox.appendChild(el('p', { class: 'nota', testo: `Stai usando la versione v${window.PALESTRA_VERSIONE || '?'}. Se una cosa non ti funziona, prova a scaricare la versione nuova: cancella i file salvati dal browser e ricarica tutto. I tuoi allenamenti NON vengono toccati.` }));
  versioneBox.appendChild(el('div', { class: 'riga-pulsanti' }, [
    bottone('Aggiorna adesso', {
      onClick: async () => {
        // Prima prova il modo pulito: se online cÈ la versione nuova prende
        // quella, senza cancellare niente e senza perdere i dati salvati.
        const trovata = await controllaAggiornamento({ forzato: true });
        if (trovata) {
          avviso(`Aggiorno alla versione ${trovata.remota}...`, { tipo: 'ok' });
          prendiVersioneNuova();
          return;
        }
        await aggiornaDavvero();
      },
      classe: 'principale',
    }),
    bottone('Ho chiuso e riaperto, non cambia niente', { onClick: () => diagnostica(esitoDiagnostica), classe: 'fantasma' }),
  ]));
  const esitoDiagnostica = el('pre', { class: 'testo-errore', testo: '' });
  versioneBox.appendChild(esitoDiagnostica);
  zona.appendChild(versioneBox);

  // La parte tecnica (database online) sta in una sezione CHIUSA: Ste l'ha
  // vista e non ha capito a che cosa serviva, con dentro pure un indirizzo
  // finto. Non serve a niente per usarlo, quindi non la metto in primo piano.
  const accountBox = el('section', { class: 'blocco' });
  accountBox.appendChild(el('h2', { testo: 'Account e database online' }));
  const dentroAccount = el('div');
  accountBox.appendChild(dentroAccount);
  const cfg = sb.leggiConfig();
  if (!cfg.attivo) {
    dentroAccount.appendChild(el('p', { class: 'nota', testo: 'Questa parte serve solo se vuoi gli stessi allenamenti su due dispositivi. Non ti serve: cosi\' com\'e, l\'app funziona tutto e i tuoi dati restano su questo telefono, anche senza rete. Se un giorno la vuoi attivare, si fa con un account Supabase (gratis).' }));
    const url = el('input', { type: 'url', class: 'campo-testo', placeholder: 'indirizzo del database' });
    const chiave = el('input', { type: 'text', class: 'campo-testo', placeholder: 'chiave pubblica' });
    const mail = el('input', { type: 'email', class: 'campo-testo', placeholder: 'la tua email' });
    const pass = el('input', { type: 'password', class: 'campo-testo', placeholder: 'password' });
    dentroAccount.appendChild(el('div', { class: 'campi-account' }, [url, chiave, mail, pass]));
    dentroAccount.appendChild(el('div', { class: 'riga-pulsanti' }, [
      bottone('Collega il database', {
        onClick: () => {
          if (!url.value || !chiave.value) { avviso('Mancano l\'indirizzo del database o la chiave.', { tipo: 'errore' }); return; }
          sb.scriviConfig({ url: url.value.replace(/\/$/, ''), anonKey: chiave.value });
          avviso('Database collegato. Ora accedi.', { tipo: 'ok' });
          disegna();
        },
        classe: 'principale',
      }),
    ]));
  } else {
    const s = sb.sessione();
    dentroAccount.appendChild(el('p', { class: 'nota', testo: s ? `Collegato come ${s.user && s.user.email ? s.user.email : 'account tuo'}.` : 'Database collegato ma non hai ancora fatto l\'accesso.' }));
    if (!s) {
      const mail = el('input', { type: 'email', class: 'campo-testo', placeholder: 'la tua email' });
      const pass = el('input', { type: 'password', class: 'campo-testo', placeholder: 'password' });
      dentroAccount.appendChild(el('div', { class: 'campi-account' }, [mail, pass]));
      dentroAccount.appendChild(el('div', { class: 'riga-pulsanti' }, [
        bottone('Accedi', {
          onClick: async () => {
            try {
              await sb.accedi(mail.value.trim(), pass.value);
              avviso('Accesso riuscito.', { tipo: 'ok' });
              await ricaricaTutto();
              disegna();
            } catch (e) {
              avviso('Accesso non riuscito: ' + e.message, { tipo: 'errore', durata: 8000 });
            }
          },
          classe: 'principale',
        }),
        bottone('Crea account', {
          onClick: async () => {
            const email = String(mail.value || '').trim();
            const password = String(pass.value || '');
            if (!email || !password) {
              avviso('Inserisci email e password per creare l\'account.', { tipo: 'errore' });
              return;
            }
            if (password.length < 6) {
              avviso('La password deve contenere almeno 6 caratteri.', { tipo: 'errore' });
              return;
            }
            try {
              const risultato = await sb.registrati(email, password);
              if (risultato && risultato.access_token) {
                avviso('Account creato e accesso effettuato.', { tipo: 'ok', durata: 7000 });
                await ricaricaTutto();
                disegna();
              } else {
                avviso('Registrazione inviata. Controlla la posta e conferma l\'email, poi torna qui e premi Accedi.', { tipo: 'ok', durata: 10000 });
              }
            } catch (e) {
              avviso('Registrazione non riuscita: ' + e.message, { tipo: 'errore', durata: 10000 });
            }
          },
          classe: 'fantasma',
        }),
      ]));
    } else {
      dentroAccount.appendChild(el('div', { class: 'riga-pulsanti' }, [
        bottone('Esci', {
          onClick: async () => { await sb.esci(); avviso('Sei uscito.'); disegna(); },
          classe: 'fantasma',
        }),
      ]));
    }
  }
  // La configurazione tecnica resta disponibile, ma chiusa di default: non intralcia chi vuole solo allenarsi.
  const accountDettagli = el('details', { class: 'blocco-chiuso' }, [
    el('summary', { testo: 'Opzione avanzata: Account e database online' }),
    accountBox,
  ]);
  zona.appendChild(accountDettagli);

  const backupBox = el('section', { class: 'blocco' });
  backupBox.appendChild(el('h2', { testo: 'Backup' }));
  backupBox.appendChild(el('p', { class: 'nota', testo: 'Il backup e\' un file tuo, salvato dove vuoi tu. E\' separato dalla sincronizzazione: cancellare una cosa dall\'account non cancella il backup.' }));
  backupBox.appendChild(el('p', { class: 'nota nota-chiaro', testo: 'Il backup completo serve per ripristinare e contiene TUTTO, anche i dati dell\'altra persona che usa l\'app su questo telefono. Se invece vuoi mostrare i tuoi dati a qualcuno, scarica il ridotto: tiene solo la tua scheda e lascia fuori tutto il resto.' }));
  backupBox.appendChild(el('div', { class: 'riga-pulsanti' }, [
    bottone('Scarica il backup JSON', { onClick: () => esportaJson(), classe: 'principale' }),
    bottone('Backup solo dei miei dati', {
      onClick: () => esportaJson({ soloMia: true }),
      classe: 'fantasma',
      titolo: 'Per mostrarlo a qualcuno: dentro ci sono solo i tuoi allenamenti, non quelli dell\'altra persona',
    }),
    bottone('Scarica CSV esercizi', { onClick: () => scarica('esercizi.csv', csvEsercizi(V.esercizi)), classe: 'fantasma' }),
    bottone('Scarica CSV sedute', { onClick: () => scarica('sedute.csv', csvSedute(seduteDellaPersona())), classe: 'fantasma' }),
    bottone('Scarica CSV serie', { onClick: () => scarica('serie.csv', csvSerie(serieDellaPersona(), V.esercizi, seduteDellaPersona())), classe: 'fantasma' }),
  ]));
  const fileInput = el('input', { type: 'file', accept: 'application/json', class: 'nascosto' });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    try { await importaJson(f); } catch (e) { avviso('Importazione non riuscita: ' + e.message, { tipo: 'errore', durata: 8000 }); }
    fileInput.value = '';
  });
  backupBox.appendChild(fileInput);
  backupBox.appendChild(el('div', { class: 'riga-pulsanti' }, [
    bottone('Importa un backup JSON', { onClick: () => fileInput.click(), classe: 'fantasma' }),
  ]));
  zona.appendChild(backupBox);

  const zonaPericolo = el('section', { class: 'blocco' });
  zonaPericolo.appendChild(el('h2', { testo: 'Zona pericolosa' }));
  zonaPericolo.appendChild(el('p', { class: 'nota', testo: 'I dati offline non ancora sincronizzati si perdono se cancelli i dati del browser o disinstalli l\'app. Fai un backup prima.' }));
  zonaPericolo.appendChild(el('div', { class: 'riga-pulsanti' }, [
    bottone('Cancella tutto lo storico (la scheda resta)', {
      onClick: async () => {
        const sedute = (await db.tutti('sedute')).filter((s) => !s.eliminata);
        const serie = (await db.tutti('serie')).filter((x) => !x.eliminata);
        const ok = await chiediConferma(
          'Cancellare tutto lo storico?',
          `${sedute.length} sedute e ${serie.length} serie vanno via. La scheda con i tuoi 4 giorni NON viene toccata, e i progressi ripartono da zero. Non si puo\' annullare: se vuoi, scarica prima un backup.`,
          { testoOk: 'Cancella lo storico', testoAnnulla: 'Lascia tutto com\'e\'', pericolo: true },
        );
        if (!ok) return;
        // serie, sedute e note di seduta: la scheda e gli esercizi restano
        for (const x of serie) await db.cestino('serie', x.id);
        for (const x of sedute) await db.cestino('sedute', x.id);
        for (const n of V.note) await db.cestino('note', n.id);
        await db.scriviMeta('aggiornamento_scheda', MODALITA.CHIEDI);
        await ricaricaTutto();
        avviso(`Cancellate ${sedute.length} sedute. La scheda e\' rimasta.`, { tipo: 'ok', durata: 6000 });
        vai('/storico');
        disegna();
      },
      classe: 'pericolo',
    }),
    bottone('Cancella tutti i dati di questo dispositivo', {
      onClick: async () => {
        const ok = await chiediConferma('Cancellare tutto?', 'Tutte le sedute di questo dispositivo vanno via. Fai prima un backup.', { testoOk: 'Cancella tutto', pericolo: true });
        if (!ok) return;
        await db.svuotaTutto();
        localStorage.removeItem('palestra-ultimo-pull');
        location.reload();
      },
      classe: 'pericolo',
    }),
  ]));
  zona.appendChild(zonaPericolo);

  zona.appendChild(el('p', { class: 'nota nota-piccola', testo: `Versione dell'app: ${window.PALESTRA_VERSIONE || '1'} · dispositivo: ${db.idDispositivo().slice(0, 13)}` }));
}

/**
 * Cancella davvero tutto quello che il browser ha salvato dell'app
 * (service worker e cache) e ricarica. Non tocca i dati dei tuoi allenamenti.
 */
async function aggiornaDavvero() {
  avviso('Sto cancellando i file vecchi e ricarico...', { tipo: 'info' });
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      const tutte = await navigator.serviceWorker.getRegistrations();
      for (const r of tutte) await r.unregister();
    }
  } catch { /* pazienza */ }
  try {
    if (typeof caches !== 'undefined' && caches.keys) {
      const chiavi = await caches.keys();
      for (const k of chiavi) await caches.delete(k);
    }
  } catch { /* pazienza */ }
  location.reload();
}

/** Racconta com'e\' messa l'app: se qualcosa non gira, qui lo vedo. */
async function diagnostica(suDove) {
  const righe = [];
  righe.push('versione dichiarata: v' + (window.PALESTRA_VERSIONE || '?'));
  righe.push('indirizzo: ' + (typeof location !== 'undefined' ? location.href : '?'));
  righe.push('online: ' + (typeof navigator !== 'undefined' ? String(navigator.onLine) : '?'));
  righe.push('motore dati: ' + db.MOTORE_SCELTO.tipo);
  righe.push('vibrazione: ' + (typeof navigator !== 'undefined' && navigator.vibrate ? 'si' : 'no'));
  righe.push('service worker: ' + ('serviceWorker' in navigator ? 'presente' : 'assente'));
  try {
    const res = await fetch('./src/sedute.js?t=' + Date.now());
    const testo = await res.text();
    righe.push('codice della spunta presente sul server: '
      + (testo.includes('registra') ? 'SI, sei aggiornato' : 'NO, hai ancora la versione vecchia'));
  } catch (e) {
    righe.push('prova di rete fallita: ' + (e && e.message ? e.message : e));
  }
  righe.push('sessioni aperte: ' + (V.sedute.filter((s) => s.stato === 'in_corso').length));
  righe.push('serie a schermo: ' + (V.serie ? V.serie.length : 0));
  righe.push('ultime azioni (' + REGISTRO.length + '):');
  for (const r of REGISTRO.slice(-12)) righe.push('  ' + r.quando + ' - ' + r.cosa + (r.errore ? ': ' + r.errore : '') + (r.serie ? ' [' + String(r.serie).slice(0, 8) + ']' : '') + (r.stato ? ' -> ' + r.stato : ''));
  if (suDove) suDove.textContent = righe.join('\n');
  console.log('diagnostica:\n' + righe.join('\n'));
  return righe;
}

function scarica(nomeFile, contenuto) {
  const blob = new Blob(['﻿' + contenuto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: nomeFile });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  avviso('File scaricato: ' + nomeFile, { tipo: 'ok' });
}

// IL BACKUP COMPLETO serve per RIPRISTINARE, e deve contenere tutto.
// QUELLO RIDOTTO serve per MOSTRARE i tuoi dati a qualcuno (Ste, 18/10/2026:
// "comunque io non voglio nel mio account anche quello di Andrea"): nel caso normale
// finirebbe nel file anche tutto il resto del database, cioe' le sedute, le serie e i
// pesi corporei dell'altra persona che usa l'app sullo stesso telefono.
//
// Vedi `soloMiaScheda` in backup.js: tiene la catena scheda -> versioni -> sedute ->
// serie, e lascia fuori tutto il resto. Il pulsante completo non si tocca: se il
// telefono si rompe e tu importi il backup ridotto, dell'altra persona non torna
// niente, e un backup che non riporta tutto non è un backup.
async function esportaJson({ soloMia = false } = {}) {
  let dati = await db.esportaTutto();
  let schedaId = null;
  try { schedaId = schedaAttivaId(); } catch { /* niente scheda: resta tutto */ }
  if (soloMia && schedaId) dati = soloMiaScheda(dati, schedaId);
  // IL BACKUP DEVE CONTENERE TUTTO, o non serve a niente (08/10/2026).
  //
  // Qui passavano solo sette tabelle. Manavano tre cose che sono l'APP, non i dati:
  //
  //   - i PROFILI: username, avatar, amici, privacy e i giorni in cui alleni. Su un
  //     altro telefono tornavi con l'account nudo e la streak regola semplice.
  //   - le MISSIONI e le RICOMPENSE: Aura e XP a zero, quindi livello 1 di nuovo.
  //   - i PESI: senza lo storico del peso corporeo tutti i Rank venivano ricalcolati
  //     senza sapere quanto pesi, quindi i numeri erano diversi da quelli che avevi
  //     davanti. Il peso È la cosa che rende i Rank giusti.
  //
  // Verificato prima della correzione: profili 0, missioni 0, ricompense 0, pesi
  // assenti dal pacchetto. Un backup che perde tutto questo non È un backup, È una
  // lista di allenamenti.
  const pacchetto = creaPacchetto({
    esercizi: dati.esercizi, schede: dati.schede, versioni: dati.versioni,
    sedute: dati.sedute, serie: dati.serie, note: dati.note, conflitti: dati.conflitti,
    profili: dati.profili, missioni: dati.missioni, ricompense: dati.ricompense,
    pesi: dati.pesi,
    // le correzioni che hai dato all'app: senza queste, il backup dimentica
    // tutto quello che le hai insegnato (vedi la spiegazione in backup.js)
    appreso: dati.appreso,
  }, { note: 'Backup dell\'app Palestra' });
  const testo = JSON.stringify(pacchetto, null, 2);
  const blob = new Blob([testo], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const nome = `palestra-backup-${schedaEvento()}.json`;
  const a = el('a', { href: url, download: nome });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  avviso('Backup scaricato: ' + nome, { tipo: 'ok' });
}

/** Importazione: valida, mostra anteprima, chiede conferma, protegge i dati. */
async function importaJson(file) {
  const testo = await file.text();
  let oggetto;
  try { oggetto = JSON.parse(testo); }
  catch { avviso('Questo file non e\' un JSON valido.', { tipo: 'errore' }); return; }

  const esito = validaPacchetto(oggetto);
  if (!esito.valido) {
    const box = el('div', { class: 'sfondo-dialogo' }, el('div', { class: 'dialogo' }, [
      el('h3', { testo: 'Questo file non si puo\' importare' }),
      ...esito.problemi.map((p) => el('p', { class: 'testo-dialogo', testo: '• ' + p })),
      bottone('Chiudi', { onClick: () => box.remove(), classe: 'fantasma' }),
    ]));
    document.body.appendChild(box);
    return;
  }
  const a = esito.anteprima;
  const box = el('div', { class: 'sfondo-dialogo' }, el('div', { class: 'dialogo dialogo-largo' }, [
    el('h3', { testo: 'Anteprima importazione' }),
    el('p', { class: 'testo-dialogo', testo: `Esercizi: ${a.esercizi} · Schede: ${a.schede} · Versioni scheda: ${a.versioni} · Sedute: ${a.sedute} (di cui ${a.seduteCompletate} finite) · Serie: ${a.serie} · Note: ${a.note}` }),
    el('p', { class: 'testo-dialogo', testo: a.primaData ? `Periodo: dal ${dataLeggibile(a.primaData)} al ${dataLeggibile(a.ultimaData)}.` : 'Nessuna data nelle sedute.' }),
    el('p', { class: 'testo-dialogo testo-attenzione', testo: 'Scegli "Unione" se vuoi aggiungere a quello che hai gia\' senza perdere niente. Scegli "Sostituzione" solo per un ripristino completo: mette via tutto quello che c\'e\' ora.' }),
    el('div', { class: 'dialogo-azioni' }, [
      bottone('Annulla', { onClick: () => box.remove(), classe: 'fantasma' }),
      bottone('Unione (consigliata)', {
        onClick: async () => {
          await applicaImportazione(oggetto, 'unione');
          box.remove();
        },
        classe: 'principale',
      }),
      bottone('Sostituzione completa', {
        onClick: async () => {
          const ok = await chiediConferma('Sostituzione completa', 'Tutti i dati attuali di questo dispositivo vengono rimpiazzati da quelli del backup. Sei sicuro?', { testoOk: 'Sostituisci tutto', pericolo: true });
          if (!ok) return;
          await esportaJson();
          await applicaImportazione(oggetto, 'sostituzione');
          box.remove();
        },
        classe: 'pericolo',
      }),
    ]),
  ]));
  document.body.appendChild(box);
}

async function applicaImportazione(oggetto, modo) {
  const t = oggetto.tabelle || {};
  // LA LISTA DELLE TABELLE VIENE DAL PACCHETTO, NON È SCRITTA QUI.
  //
  // Prima qui c'era un array scritto a mano con nove tabelle, e quando al backup ho
  // aggiunto i pesi l'elenco È rimasto com'era: quindi i pesi entravano nel backup e
  // non uscivano mai. In "unione" venivano scartati in silenzio, in "sostituzione"
  // non finivano nel cestino e non arrivavano: ti restava uno stato misto mentre
  // l'app ti diceva "sostituzione completa".
  //
  // Derivandola dal pacchetto non può succedere di nuovo: se domani aggiungi una
  // tabella al backup, entra qui dentro senza toccare niente.
  for (const tabella of Object.keys(t)) {
    const righe = t[tabella] || [];
    if (modo === 'sostituzione') {
      // QUELLO CHE MANCAVA, ed era il buco più grave di tutti.
      //
      // Il ramo metteva `eliminata: true` su tutto quello che c'era, e poi NON
      // scriveva MAI `righe`: la variabile era calcolata e buttata via. Verificato:
      // 3 sedute, 1 serie, 1 scheda, 1 versione, 1 profilo, 1 ricompensa sono
      // finite nel cestino e non È entrato NULLA dal backup. Poi compariva
      // "Importazione finita (sostituzione)" come se fosse andata bene, quindi non
      // c'era modo di accorgersene: l'utente pensava di aver ripristinato e in
      // realta' aveva perso tutto.
      //
      // La sostituzione vuol dire "al posto di quello che c'era metti questo", quindi
      // dopo aver messo nel cestino il vecchio, il nuovo va scritto.
      for (const riga of await db.tutti(tabella, { includiEliminati: true })) {
        await db.salva(tabella, { ...riga, eliminata: true });
      }
      for (const riga of righe) {
        await db.salva(tabella, { ...riga, eliminata: false }, { segna: true });
      }
    } else {
      const esito = unisci(await db.tutti(tabella, { includiEliminati: true }), righe, tabella);
      for (const riga of esito.righe) {
        const giaPresente = await db.prendi(tabella, riga.id);
        await db.salva(tabella, riga, { segna: !giaPresente || riga.sync !== 'pulito' });
      }
    }
  }
  await ricaricaTutto();
  avviso(`Importazione finita (${modo}).`, { tipo: 'ok' });
  disegna();
}

/* =====================================================================
   IL GIOCO: rank, LP, streak, Aura, missioni, amici, profilo.
   Tutto appoggiato ai moduli puri (rank.js, streak.js, missioni.js,
   aura.js, sociale.js, gioco.js): qui ci sono solo schermate e bottoni.
   ===================================================================== */

function accountAttivo() { return accountId(personaAttiva().id); }

function profili() { return V.profili || []; }

function profiloDi(idAccount) {
  return profili().find((p) => p && p.id === idAccount) || null;
}

function profiloAttivo() {
  const salvato = profiloDi(accountAttivo());
  const p = personaAttiva();
  return {
    id: accountAttivo(),
    username: (salvato && salvato.username) || p.username || p.nome,
    avatar_id: (salvato && salvato.avatar_id) || p.avatar || 'vuoto',
    amministratore: salvato && salvato.amministratore !== undefined
      ? !!salvato.amministratore
      : !!p.amministratore,
    amici: (salvato && salvato.amici) || (p.amici || []).map((n) => accountId(n)),
    // I giorni in cui questa persona va in palestra. Ognuno ha i suoi, perchÈ
    // Ste (08/10/2026) deve dare l'app anche ai suoi compagni e loro non fanno i
    // suoi stessi giorni: senza questo, la streak di chi allena lun/mar/mer/ven si
    // romperebbe ogni sabato, non avendo saltato niente.
    giorni_allenamento: (salvato && salvato.giorni_allenamento) || null,
    // la classe RPG scelta (guerriero / assassino / berserker). Anche questa È per
    // account, quindi i compagni di Ste non vengono misurati con la sua.
    classe_rpg: (salvato && salvato.classe_rpg) || null,
    // I cosmetici equipaggiati devono sopravvivere a ogni ricostruzione del profilo.
    // Senza questo campo, profiloAttivo() restituiva un oggetto nuovo senza
    // equipaggiamento_aura e il render successivo mostrava subito "Equipaggia".
    equipaggiamento_aura: { ...((salvato && salvato.equipaggiamento_aura) || {}) },
    // Il flag che dice "il personaggio esiste già". Sta SEPARATO da `classe_rpg` per
    // un motivo preciso: se `classe_rpg` tornasse vuoto per un errore di lettura,
    // questo flag continua a dire che la scelta c'è stata e l'app non te la fa
    // rifare. Vedi `personaggio_creato` in src/avatar-stato.js.
    personaggio_creato: !!(salvato && (salvato.personaggio_creato || salvato.classe_rpg)),
    privacy: privacyDi(salvato || {}),
  };
}

function seduteMie() { return seduteDellaPersona(); }
function serieMie() { return serieDellaPersona(); }
function missioniMie() {
  const io = accountAttivo();
  return (V.missioni || []).filter((m) => m && m.account_id === io);
}
function ricompenseMie() {
  const io = accountAttivo();
  return (V.ricompense || []).filter((r) => r && r.account_id === io);
}

/** Le serie di ogni esercizio, per l'account che sta usando l'app. */
function mieiGruppi() {
  return gruppiDaSerie(
    seduteMie().filter((s) => s.stato === 'completata'),
    serieMie(),
    V.esercizi,
  );
}

/** Lo stato di gioco completo, ricalcolato da zero (niente valori salvati a mano). */
function statoMio(oggi = null) {
  return statoAccount({
    account: accountAttivo(),
    sedute: seduteMie(),
    serie: serieMie(),
    esercizi: V.esercizi,
    completamenti: missioniMie(),
    ricompense: ricompenseMie(),
    // il peso corporeo serve ANCHE qui: senza, la lista dei Rank usava soglie
// diverse da quelle della pagina dell'esercizio, e dicevano due cose
  // diverse sullo stesso record (bug trovato provando l'app, non dai test)
  pesoCorporeo: pesoCorporeoOra(),
  // e i giorni in cui alleno: senza, la streak contava i giorni di calendario e
  // chi allena quattro volte su sette non poteva superare quattro (vedi streak.js)
  profilo: profiloAttivo(),
    oggi,
  });
}

/** I record di ogni account che ha allenato qualcosa su questo dispositivo. */
function vociPerClassifica() {
  const voci = [];
  for (const p of personeDiQuestaApp()) {
    const id = p.accountId || accountId(p.id);
    const profilo = profiloDi(id) || {
      id,
      username: p.username || p.nome,
      avatar_id: p.avatar || 'vuoto',
      amici: Array.isArray(p.amici) ? p.amici : [],
      privacy: PRIVACY_PREDEFINITE,
      scheda_id: p.schedaId,
    };
    // I dati che erano stati scaricati restano nascosti anche se questo
    // dispositivo li conserva in cache: la privacy viene controllata a ogni vista.
    const puoLeggerePerformance = id === accountAttivo()
      || privacyDi(profilo).performance === 'pubblico';
    const miei = puoLeggerePerformance ? seduteDellaPersonaPer(p) : [];
    const completate = miei.filter((s) => s && !s.eliminata && s.stato === 'completata');
    const mieiId = new Set(completate.map((s) => s.id));
    const mie = (V.serie || []).filter((x) => x && !x.eliminata && mieiId.has(x.seduta_id));
    const record = recordAccount(V.esercizi, gruppiDaSerie(completate, mie, V.esercizi));
    voci.push({
      account: id,
      username: profilo.username,
      avatar_id: profilo.avatar_id,
      privacy: privacyDi(profilo),
      record,
      sedute: completate,
      serie: mie,
      profilo,
    });
  }
  return voci;
}

/** Le sedute di una persona precisa (non solo di quella attiva). */
function vociConClassificaPubblica() {
  return vociPerClassifica().filter((v) =>
    v.account === accountAttivo() || privacyDi(v.profilo).leaderboard === 'pubblico');
}

function seduteDellaPersonaPer(p) {
  const idScheda = p.schedaId || (profiloDi(p.accountId || accountId(p.id)) || {}).scheda_id;
  const versioni = (V.versi || []).filter((v) => v.scheda_id === idScheda);
  const miei = new Set(versioni.map((v) => v.id));
  return (V.sedute || []).filter((s) => s && (
    s.scheda_id === idScheda || (!s.scheda_id && miei.has(s.versione_id))
  ));
}

/* ---------- mattoni visivi del gioco ---------- */

function badgeRank(rankId, lp, divisione) {
  const r = RANK.find((x) => x.id === rankId);
  if (!r) return el('span', { class: 'badge-rank badge-nessuno', testo: 'SENZA RANK' });
  const secondario = rankId === 'olympian' ? ' #4fc3ff' : '';
  return el('span', {
    class: 'badge-rank badge-' + rankId,
    testo: r.nome + (divisione ? ' ' + divisione.nome : '') + (lp ? ' · ' + lp + ' LP' : ''),
    style: `--rank-colore:${r.colore};--rank-ombra:${r.ombra}${secondario}`,
  });
}

/**
 * La barra degli LP, e che cosa ci scrive dentro.
 *
 * Ste (06/10/2026): "con 3 serie sei al massimo del tuo range e il passo dopo È
 * lontanissimo". Guardando il suo Dumbbell Bench Pull: barra PIENA, scritta
 * "3 LP", e la frase sotto diceva solo "Sei sul rank più alto".
 *
 * Il equivoco È che "3 LP" sembrava una progressione quasi finita dentro un rango,
 * mentre non cÈ nessun rango sopra l'OLYMPIAN: li' gli LP crescono senza tetto, e
 * il conto È semplicemente "(quanto sei sopra la soglia) x 100". Quindi 3 LP vuol
 * dire "3% sopra la soglia dell'OLYMPIAN", non "hai quasi finito".
 *
 * La barra resta piena perchÈ non cÈ niente da riempire: non esiste un passo
 * successivo. Ma l'etichetta deve dirlo, altrimenti una barra piena con "3 LP" a
 * fianco si legge al contrario. Un posto solo per la regola, così la card e la
 * pagina dell'esercizio non possono dire cose diverse.
 */
/**
 * L'avvertenza che va sotto la distanza alla soglia, in UN posto solo.
 *
 * Ste (06/10/2026): "la colonna 'manca alla prossima' mente... quindi 'manca 0,15
 * kg' È una precisione che non esiste. È la stessa cosa che mi hai detto tu: se non
 * lo sai misurarlo, non scriverlo come se fosse misurato".
 *
 * Il numero È una percentuale adesso, non i kg (vedi distanzaAllaSoglia), e la
 * percentuale ha un vantaggio che si vede subito: 1 kg di peso corporeo sposta la
 * soglia di circa l'1,5%, quindi se ti manca lo 0,3% la risposta onesta non È "ti
 * manca così poco", È "non lo so ancora". Questa frase È quella risposta.
 */
const AVVERTIMENTO_STIMA_SOGLIA = 'Numero stimato: il massimale e\' calcolato, non '
  + 'misurato, e il peso corporee muove la soglia. Non fidarti di decimali.';

/** La distanza alla prossima soglia, in percentuale. Vedi distanzaAllaSoglia. */
function distanzaObiettivo(record) {
  if (!record || record.inTop) return null;
  return distanzaAllaSoglia(record.punteggio, (record.prossimoObiettivo || {}).punteggio);
}

function etichettaLp(record) {
  if (!record || !record.rankId) return '';
  if (record.inTop) return `TOP · +${record.lp}% sulla soglia`;
  // Quando il bonus È stato fermato, i LP NON sono la posizione nella fascia: sono
  // il posto dove ti hanno portato dentro. Scrivere "/ 100" accanto a una barra
  // mezza piena È una promessa falsa, quindi l'etichetta non lo promette più.
  if (record.bonusBloccato) return `${record.lp} LP`;
  return `${record.lp} LP / 100`;
}

/**
 * Quanto È piena la barra degli LP: gli LP stessi, divisi per 100.
 *
 * Ste (08/10/2026): "le sbarre del lp sono buggate". Aveva ragione, e il motivo È
 * che la barra veniva riempita con `record.progresso`, che dal giorno in cui la
 * barra È diventata "solo lavoro vero" NON È più la posizione nella fascia.
 *
 * Sono due numeri diversi, e nella stessa riga non possono non coincidere:
 *
 *   1x8  -> "63 LP / 100" ma barra al 63%   (coincide, per caso)
 *   2x8  -> "25 LP / 100" ma barra al 63%   (non coincide: bug)
 *
 * Quindi la barra degli LP si riempie con gli LP. Il numero che dice "quanto mi
 * manca per il Rank dopo" È un'altra barra, e usa `progresso`: sono due domande
 * diverse e non devono stare sulla stessa linea.
 */
function frazioneLp(record) {
  if (!record || !record.rankId) return 0;
  if (record.inTop) return 1; // sul Rank più alto la barra È piena
  return Math.max(0, Math.min(1, (Number(record.lp) || 0) / 100));
}

function barraProgresso(frazione, etichetta) {
  const f = Math.max(0, Math.min(1, Number(frazione) || 0));
  return el('div', { class: 'barra-progresso' }, [
    el('div', { class: 'barra-piena', style: `width:${Math.round(f * 1000) / 10}%` }),
    etichetta ? el('span', { class: 'barra-etichetta', testo: etichetta }) : null,
  ]);
}

/** La barra degli LP: riempita dagli LP, che È quello che l'etichetta promette. */
function barraLp(record) {
  return barraProgresso(frazioneLp(record), etichettaLp(record));
}

function avatarNodo(profilo, { grande = false, dimensione = 46 } = {}) {
  const a = avatarPerId(profilo && (profilo.avatar_id || (profilo.avatar)));
  const nome = (profilo && (profilo.username || profilo.nome)) || '??';
  const stile = `background:${gradienteAvatar(a.id)};width:${dimensione}px;height:${dimensione}px;font-size:${Math.round(dimensione / 3.2)}px`;
  return el('span', { class: 'avatar' + (grande ? ' avatar-grande' : ''), style: stile, titolo: nome }, [
    iniziali(nome),
  ]);
}

/**
 * Il teschio della streak.
 *
 * Ste (07/10/2026): "comunque FUOCO sostituiscilo con STREAK. Poi su Casa cÈ
 * scritto 1 normale 1 giorno, sistema".
 *
 * Cosa non andava, e sono due cose diverse:
 *  1) la parola al centro era il NOME DEL LIVELLO (Normale, Giallo, Arancio...).
 *     Ma il livello È già detto dal colore, e la parola "Normale" accanto al
 *     numero dice "tutto regolare", che non È quello che la streak vuol dire:
 *     vuol dire che hai allenato 1 giorno di fila. Quindi al centro ora cÈ la
 *     parola STREAK, e il livello resta nel colore e nel tooltip;
 *  2) il numero era scritto DUE volte (nel badge e in "1 giorno"): "1" e "1
 *     giorno" nella stessa riga. Ora il numero sta solo nel badge e sotto cÈ
 *     solo il livello. Un numero che compare due volte È rumore, non
 *     informazione: sembra un numero diverso.
 *
 * "FUOCO" come parola È sparito anche dai chip: ora si chiama streak dappertutto
 * (ed È la parola che hai usato tu).
 */
function teschioStreak(st) {
  const f = st.fuoco;
  // TRE STATI, non due.
  //
  // Ste (10/10/2026): "la streak deve spuntare spenta nel giorno in cui dovrei
  // allenarmi dove non mi sono ancora allenato ma deve spuntare che devo andarci per
  // farla aumentare e farla accendere, non che spunta grigia come se l'avessi persa".
  //
  // Prima erano solo "accesa" e "spenta", e il caso intermedio finiva nel grigio:
  // il lunedì mattina, non avendo ancora allenato, la card diceva che avevi perso la
  // streak. Ma la giornata non era finita, e la streak si rompe solo a fine sera.
  // La card diceva una cosa falsa, e una cosa falsa in alto, dove guardi per prima,
  // è la peggiore.
  //
  // Ora: verde se hai allenato, ambra se oggi ti tocca e non l'hai fatto (manca un
  // passo), grigio solo se hai davvero saltato un giorno.
  const stato = f.stato || (f.acceso ? 'acceso' : 'spenta');
  return el('div', {
    class: 'teschio-streak ' + stato,
    style: `--fuoco:${f.colore}`,
    titolo: stato === 'acceso'
      ? `Streak: ${f.giorni} ${f.giorni === 1 ? 'giorno' : 'giorni'} di fila, livello ${f.nome}`
      : (stato === 'da accendere'
        ? `Oggi ti tocca e non hai ancora allenato: ${f.giorni} ${f.giorni === 1 ? 'giorno' : 'giorni'} di fila, oggi la porti a ${f.giorni + 1}`
        : 'Streak spenta: hai saltato un giorno che ti toccava'),
  }, [
    // IL NUMERO GRANDE È UNO SOLO, e la riga sotto non lo ripete.
    //
    // Prima qui c'era il numero grosso nel cerchio del fuoco e la parola "giorno"
    // accanto: si leggeva "STREAKgiorno", cioe' due pezzi attaccati che non
    // formavano una frase. Ste me l'ha fatto vedere con uno screenshot.
    //
    // Il numero grosso resta dov'è, perchè è la cosa che guardi per prima. Sotto,
    // la parola STREAK e la frase intera. Il numero compare UNA volta sola: due
    // volte nella stessa card faceva pensare che fossero due cose diverse, e il
    // test gioco-ui lo segnalava ("qui era 2").
    //
    // E nel caso "da accendere" il numero c’è lo stesso: la tua streak non è
    // sparita, è a un passo dal salire. Mostrare "??" diceva che avevi perso tutto.
    el('span', {
      class: 'fuoco',
      testo: stato === 'spenta' ? '??' : String(f.giorni),
      // Il numero che appena è cambiato pulsa: è l'unico modo per capire se
      // quello che stai guardando è il nuovo o il vecchio, senza leggere due volte.
      dati: { giorni: String(f.giorni), stato },
    }),
    el('div', { class: 'riga-streak' }, [
      el('strong', { class: 'etichetta-streak', testo: 'STREAK' }),
      el('span', {
        class: 'nota',
        testo: stato === 'acceso'
          ? (f.giorni === 1 ? 'un giorno di fila' : 'giorni di fila')
          : (stato === 'da accendere'
            ? `ti tocca oggi: allenati e sale a ${f.giorni + 1}`
            : f.nome),
      }),
    ]),
    // L'AVVISO DEL GIORNO CHE ASPETTA.
    //
    // Ste (10/10/2026): "quando devo allenarmi, spunta streak accesa con lo 0". Aveva
    // ragione: la card sembrava accesa col contatore a zero, che è la cosa più brutta
    // che una card possa dire, perché un contatore acceso sullo zero vuol dire "è
    // rotto".
    //
    // Ma la verità è che in quel momento la streak NON è accesa: è spenta e ti
    // aspetta. Quindi l'unica cosa accesa è questa riga, che è l'unica che deve
    // attirare l'occhio: il resto della card è spenta come una spenta.
    stato === 'da accendere'
      ? el('span', {
        class: 'richiamo-streak',
        testo: f.giorni === 0
          ? '▲ Non è ancora accesa: oggi ti tocca. Allenati e parte da 1.'
          : `▲ Oggi ti tocca: allenati e sale a ${f.giorni + 1}`,
      })
      : null,
  ]);
}

function teschioAura(st) {
  return el('div', { class: 'teschio-aura' }, [
    el('span', { class: 'simbolo', testo: 'AURA' }),
    el('strong', { testo: formattaAura(st.aura) }),
    el('span', { class: 'nota', testo: `livello account ${st.livello.livello} · ${formattaNumero(st.livello.xp)} XP` }),
  ]);
}

/** La card grossa di un esercizio: rank, LP, record e barra verso il prossimo. */
function cardRank(record, { compatta = false } = {}) {
  const r = record;
  const nome = r.esercizio ? r.esercizio.nome : 'esercizio';
  if (!r.valido) {
    return el('div', { class: 'card-rank card-rank-none' }, [
      el('div', { class: 'card-rank-alto' }, [el('strong', { testo: nome })]),
      el('p', { class: 'nota', testo: r.motivo || 'Nessuna prestazione registrata.' }),
      el('a', { href: '#/esercizio/' + (r.esercizio ? r.esercizio.id : ''), class: 'bottone-guarda', testo: 'Vedi il dettaglio' }),
    ]);
  }
  const profilo = r.profilo;

  // Hai allenato, ma sei ancora sotto la soglia del primo rank: non È un
  // errore e non È "nessuna prestazione". Lo dico con le parole giuste e
  // faccio vedere quanto manca, così Ste vede che il Rank funziona e che
  // il prossimo obiettivo È vicino.
  if (r.sottoSoglia) {
    const manca = r.mancaAlPrimo;
    const distanza = distanzaAllaSoglia(r.punteggio, (r.prossimoObiettivo || {}).punteggio || manca);
    return el('div', { class: 'card-rank card-rank-none' }, [
      el('div', { class: 'card-rank-alto' }, [
        el('div', {}, [
          el('span', { class: 'nota', testo: nome }),
          el('strong', { class: 'card-rank-nome', testo: r.testo }),
        ]),
        el('span', { class: 'badge-rank vuoto', testo: '—' }),
      ]),
      el('div', { class: 'card-rank-basso' }, [
        barraProgresso(
          r.sogliaAttuale ? Math.max(0, Math.min(1, (r.punteggio || 0) / r.sogliaAttuale)) : 0,
          (r.prossimoObiettivo || {}).etichetta || 'BRONZE',
        ),
        el('span', {
          class: 'nota',
          testo: !distanza
            ? 'Ti manca ancora un po\' per il primo rank.'
            : (distanza.piccolo
              ? `Sei sul gradino del ${(r.prossimoObiettivo || {}).etichetta || 'BRONZE'}: ti manca pochissimo.`
              : `Ti manca lo ${formattaNumero(distanza.percentuale)}% per il ${(r.prossimoObiettivo || {}).etichetta || 'BRONZE'}.`),
        }),
        el('span', { class: 'nota nota-piccola', testo: AVVERTIMENTO_STIMA_SOGLIA }),
        el('a', { href: '#/esercizio/' + (r.esercizio ? r.esercizio.id : ''), class: 'bottone-guarda', testo: 'Vedi il dettaglio' }),
      ]),
    ]);
  }

  const distanza = distanzaAllaSoglia(r.punteggio, (r.prossimoObiettivo || {}).punteggio);
  // IL NUMERO DA MOSTRARE: I KG CHE TI MANCANO, NON IL PUNTEGGIO.
  //
  // Ste (08/10/2026) guardando la Smith: "di smith machine io faccio 32kg. i rank
  // devono aggiornare i pesi". Qui la riga stampava
  // `prossimoObiettivo.punteggio`, che NON È un peso: È il punteggio interno della
  // prestazione, che contiene anche le ripetizioni pesate e il correttivo di
  // meccanica. Sul suo caso diceva "36,3 kg per GOLD" mentre i kg giusti, calcolati
  // dal motore, erano 34,9. Due numeri diversi per la stessa domanda, e quello
  // sbagliato era in grassetto.
  //
  // Il numero da usare È `distanza.kgNecessari`: È il carico che, alle stesse
  // ripetizioni di oggi, porta alla soglia dopo. Se non cÈ (perchÈ il motore non
  // sa convertire, o perchÈ sei in cima) si dice cosa si sa, senza inventare un peso.
  const prossimoNome = (r.prossimoObiettivo || {}).etichetta || (r.prossimoRank ? r.prossimoRank.nome : null);
  const kgPerIlProssimo = r.distanza && r.distanza.kgNecessari;
  const verso = r.inTop
    ? `Sei nel rank più alto: non cÈ un passo dopo, e ogni LP È un punto di percentuale sopra la soglia dell'OLYMPIAN (+${r.lp}% adesso).`
    : (kgPerIlProssimo
      ? `${formattaNumero(kgPerIlProssimo)} ${profilo.unita} per ${prossimoNome}`
        + (distanza && distanza.inGioco ? `, con le ripetizioni che hai` : '')
      : `${prossimoNome} o ${(r.prossimoObiettivo || {}).etichetta ? 'prossimo livello' : 'prossimo rank'}`
        + (distanza && distanza.inGioco ? ` (ti manca lo ${formattaNumero(distanza.percentuale)}%)` : ''));
  return el('div', { class: 'card-rank card-' + r.rankId + (compatta ? ' compatta' : '') }, [
    el('div', { class: 'card-rank-alto' }, [
      el('div', {}, [
        el('span', { class: 'nota', testo: nome }),
        el('strong', { class: 'card-rank-nome', testo: r.testo }),
      ]),
      badgeRank(r.rankId, r.lp, r.divisione),
    ]),
    // COME È DIFFICILE l'esercizio e QUANTO ho fatto. Ste: "aggiungi un
    // qualcosa che identifica se l'esercizio È facile o difficile e capisce
    // se È tanto quello che fai o poco". Il numero da solo non basta: 12 kg
    // su un isolamento sono tantissimi, su un leg press non sono niente.
    el('div', { class: 'card-rank-alto' }, [
      el('span', {
        class: 'tag-livello piccolo liv-' + (r.profilo.livello || 'composto'),
        testo: (r.profilo.livello || 'composto').toUpperCase(),
      }),
      el('span', { class: 'nota nota-piccola', testo: giudizioPerformanceRecord(r).frase }),
    ]),
el('div', { class: 'card-rank-basso' }, [
      // la barra degli LP si riempie con gli LP (vedi frazioneLp): il numero che dice
    // "quanto mi manca per il Rank dopo" È un'altra barra e sta più in basso
    barraLp(r),
      el('span', { class: 'nota', testo: verso }),
      r.spiegaBonus ? el('span', { class: 'nota nota-piccola', testo: r.spiegaBonus }) : null,
      el('span', { class: 'nota nota-piccola', testo: AVVERTIMENTO_STIMA_SOGLIA }),
      el('a', { href: '#/esercizio/' + (r.esercizio ? r.esercizio.id : ''), class: 'bottone-guarda', testo: 'Dettaglio' }),
    ]),
  ]);
}

/* ---------- azioni ---------- */

/**
 * Salva le ricompense guadagnate dopo un allenamento.
 * Nessun numero viene scritto dal frontend: il motore gioco.js decide cosa È
 * stato guadagnato, qui si salvano solo le righe nuove.
 */
async function assegnaRicompense(sedutaId) {
  try {
    const nuove = ricompenseAllenamento({
      account: accountAttivo(),
      sedutaCorrenteId: sedutaId,
      sedute: seduteMie(),
      serie: serieMie(),
      esercizi: V.esercizi,
      ricompense: ricompenseMie(),
      // anche i premi usano il peso: senza, i Rank calcolati qui non
      // corrispondono a quelli che vedi nella schermata Rank
      pesoCorporeo: pesoCorporeoOra(),
      // E I GIORNI IN CUI ALLENO. Mancheranno faceva usare la regola semplice della
      // streak, quindi qui la streak veniva calcolata DIVERSA da quella mostrata a
      // schermo: sullo stesso allenamento a schermo leggevi 12 e il traguardo dei 10
      // non arrivava mai, perchÈ il conto per i premi ne vedeva solo 3. Non era un
      // numero sbagliato a caso: era una regola applicata in due modi diversi, ed È
      // lo stesso difetto che questo progetto ha già pagato tre volte.
      profilo: profiloAttivo(),
    });
    if (!nuove.length) return [];
    for (const r of nuove) await db.salva('ricompense', { ...r, quando: r.quando || adesso() });
    await ricaricaTutto();
    const aura = nuove.reduce((a, r) => a + (r.aura || 0), 0);
    const xp = nuove.reduce((a, r) => a + (r.xp || 0), 0);
    if (aura > 0 || xp > 0) {
      avviso(`Allenamento finito: +${formattaAura(aura)} Aura, +${formattaNumero(xp)} XP.`, { tipo: 'ok', durata: 6000 });
    }
    return nuove;
  } catch (e) {
    console.error('Ricompense non assegnate:', e);
    return [];
  }
}

/** Completa una missione: una volta sola per giorno o per settimana. */
async function completaMissione(voce) {
  if (!voce || voce.completata) return;
  const ok = await chiediConferma(
    'Missione completata?',
    `${voce.missione.titolo}\n\n${voce.missione.testo}\n\nRicompensa: +${voce.ricompensa.aura} AURA.`,
    { testoOk: 'Sì, l\'ho fatta', testoAnnulla: 'Ancora no' },
  );
  if (!ok) return;
  await salvaMissione(voce, { completata: true });
}

/** Rivela una Secret Mission: resta registrata anche se non la completi. */
async function rivelaMissione(voce) {
  if (!voce || voce.rivelata) return;
  await salvaMissione(voce, { rivelata: true });
}

async function salvaMissione(voce, { completata = false, rivelata = false } = {}) {
  const riga = {
    id: voce.chiave,
    account_id: accountAttivo(),
    missione_id: voce.missione.id,
    categoria: voce.categoria,
    titolo: voce.missione.titolo,
    difficolta: voce.missione.difficolta,
    data: voce.categoria === 'daily' ? schedaEvento() : null,
    settimana: voce.categoria === 'daily' ? null : statoMio().settimana,
    aura: voce.ricompensa.aura,
    xp: voce.ricompensa.xp,
    rivelata: rivelata || voce.rivelata,
    completata_il: completata ? adesso() : null,
  };
  await db.salva('missioni', riga);
  if (completata) {
    await db.salva('ricompense', {
      id: riga.id + ':premio',
      account_id: accountAttivo(),
      tipo: 'missione',
      fonte: riga.missione_id,
      aura: riga.aura,
      xp: riga.xp,
      dettaglio: riga.titolo,
      quando: adesso(),
    });
    await ricaricaTutto();
    avviso(`+${formattaAura(riga.aura)} AURA · ${riga.titolo}`, { tipo: 'ok', durata: 6000 });
  } else {
    await ricaricaTutto();
  }
  disegna();
}

async function salvaProfilo(campi) {
  const attuale = profiloDi(accountAttivo());
  await db.salva('profili', {
    ...(attuale || { id: accountAttivo() }),
    ...campi,
  });
  await ricaricaTutto();
  disegna();
}

/**
 * IL CALENDARIO VERO.
 *
 * Ste (09/10/2026): "il calendario deve essere proprio un calendario, che da ora
 * fino al 2027 ecc...".
 *
 * Due volte gli ho proposto qualcosa di diverso da un calendario e due volte aveva
 * ragione lui. La prima volta sette caselle (una settimana: il giorno che ti serve
 * non c'), la seconda volta una striscia di mesi uno sotto l'altro senza numeri. Un
 * calendario, nel senso di tutti i giorni, è un'altra cosa: è una TABELLA, con i
 * numeri dei giorni, i mesi in fila e l'anno che si cambia con le frecce.
 *
 * Perche' i numeri non si possono togliere: sette quadratini colorati senza numero
 * non dicono quando è successo. Col numero diventa "marte' 6", e la memoria
 * lavora da sola.
 *
 * E perchè si parte dal primo allenamento e non dal 1° gennaio: un calendario che
 * contiene due anni di quadratini vuoti non dice niente, e fa scorrere la pagina per
 * niente.
 */
const statoCalendario = { anno: null, giorno: null };

export function bloccoCalendario(profilo, st) {
  const box = el('section', { class: 'blocco' });
  const previsti = new Set(Array.isArray(profilo.giorni_allenamento) ? profilo.giorni_allenamento : []);
  const giorniFatti = new Set((st.streak && st.streak.giorniAllenati) || []);
  const oggi = isoGiorno(new Date());
  const oggiAnno = Number(oggi.slice(0, 4));
  const anno = statoCalendario.anno === null ? oggiAnno : statoCalendario.anno;

  box.appendChild(el('h2', { testo: 'Il tuo calendario' }));
  box.appendChild(rigaOggi(previsti, giorniFatti, oggi));

  // ---- LA TESTATA: l'anno e le frecce per cambiarlo.
  //
  // Ste: "da ora fino al 2027". Le frecce servono per questo: si parte dall'anno in
  // cui sei e si va avanti di un anno alla volta. Il bottone "a oggi" serve per
  // non perdersi dopo aver girato fino al 2030.
  const cambia = (nuovo) => { statoCalendario.anno = nuovo; disegna(); };
  const testata = el('div', { class: 'calendario-testata' }, [
    bottone('‹', {
      classe: 'fantasma',
      onClick: () => cambia(anno - 1),
      titolo: 'L\'anno prima',
    }),
    el('strong', { class: 'calendario-anno-nome', testo: String(anno) }),
    bottone('›', {
      classe: 'fantasma',
      onClick: () => cambia(anno + 1),
      titolo: 'L\'anno dopo',
    }),
    (anno !== oggiAnno
      ? bottone('A oggi', { classe: 'fantasma', onClick: () => cambia(oggiAnno) })
      : null),
  ]);
  box.appendChild(testata);

// ---- I DODICI MESI.
  //
  // Nell'anno in cui ti trovi si parte dal mese della PRIMA seduta, non da gennaio:
  // altrimenti il calendario di quest'anno avrebbe sei mesi vuoti davanti, e sei
  // mesi vuoti non sono informazione, sono rumore.
  //
  // Negli ANNI DOPO si parte da gennaio: è il futuro, e tu non ci sei ancora allenato.
  //
  // Negli ANNI PRIMA si parte da gennaio PERCHÉ QUELLI SONO LO STORICO. E qui c'era
  // un buco: la condizione era invertita e l'anno scorso partiva dal mese della
  // prima seduta. Il risultato era che andando indietro di un anno (2025, se la
  // prima seduta è di marzo 2026) gennaio e febbraio sparivano dal calendario, e
  // se in quei due mesi ti eri allenato i tuoi giorni verdi non c'erano.
  const primoGiorno = giorniFatti.size ? [...giorniFatti].sort()[0] : oggi;
  const primoMese = Number(primoGiorno.slice(5, 7));
  const meseIniziale = (anno === oggiAnno) ? primoMese : 1;
  const griglia = el('div', { class: 'calendario-anno' });
  for (let m = meseIniziale; m <= 12; m++) {
    griglia.appendChild(bloccoMese(anno, m, previsti, giorniFatti, oggi));
  }
  box.appendChild(griglia);

  // ---- IL DETTAGLIO DEL GIORNO PREMUTO.
  if (statoCalendario.giorno) {
    box.appendChild(dettaglioGiorno(statoCalendario.giorno));
  }

  box.appendChild(el('div', { class: 'legenda-calendario' }, [
    el('span', { class: 'pastiglia legenda-fatto', testo: 'allenato' }),
    el('span', { class: 'pastiglia legenda-saltato', testo: 'saltato' }),
    el('span', { class: 'pastiglia legenda-recupero', testo: 'giorno di recupero' }),
    el('span', { class: 'pastiglia legenda-atteso', testo: 'ti tocca' }),
  ]));
  return box;
}

/** La frase in cima: la risposta a "oggi mi tocca?", prima di tutto il resto. */
function rigaOggi(previsti, giorniFatti, oggi) {
  const NOME = ['Domenica', 'Luned\u00ec', 'Marted\u00ec', 'Mercoled\u00ec', 'Gioved\u00ec', 'Venerd\u00ec', 'Sabato'];
  const oggiDow = new Date(oggi + 'T12:00:00').getDay();
  const fattoOggi = giorniFatti.has(oggi);
  const oggiPrevisto = previsti.has(oggiDow);
  const prossimo = prossimoGiornoPrevisto(previsti, oggi);
  const frase = !previsti.size
    ? 'Non hai ancora scelto i giorni in cui alleni: va in Impostazioni, e il calendario si riempie di verde.'
    : (fattoOggi
      ? 'Oggi hai allenato.'
      : (oggiPrevisto
        ? (prossimo
          ? `Oggi ti tocca e non l'hai ancora fatto. Dopo, il prossimo giorno è ${NOME[prossimo].toLowerCase()}.`
          : 'Oggi ti tocca e non l\'hai ancora fatto.')
        : (prossimo
          ? `Oggi è giorno di recupero: non ti toglie niente. Ti tocca ${NOME[prossimo].toLowerCase()}.`
          : 'Oggi e\' giorno di recupero: non ti toglie niente.')));
  return el('p', { class: 'nota nota-grande', testo: frase });
}

/** Un mese: nome, i sette giorni in testa, e tutti i giorni con il loro numero. */
function bloccoMese(anno, mese, previsti, giorniFatti, oggi) {
  const primoDelMese = new Date(anno, mese - 1, 1, 12);
  const ultimo = new Date(anno, mese, 0, 12);
  const prefisso = `${anno}-${String(mese).padStart(2, '0')}-`;
  const fattiDelMese = [...giorniFatti].filter((g) => g.startsWith(prefisso)).length;

  const box = el('div', { class: 'calendario-mese' });

  box.appendChild(el('h3', { class: 'calendario-mese-nome' }, [
    NOMI_MESCE[mese - 1],
    // IL NUMERO DI ALLENAMENTI DEL MESE, accanto al nome. Un calendario senza
    // questo dice COME è andato il mese solo se lo leggi giorno per giorno:
    // metterlo li' risponde subito a "marzo com'è andato".
    el('span', {
      class: 'calendario-conto',
      testo: `${fattiDelMese} ${fattiDelMese === 1 ? 'giornata' : 'giornate'}`,
    }),
  ]));

  const testata = el('div', { class: 'calendario-coppie calendario-testata-giorni' });
  for (const n of ['lu', 'ma', 'me', 'gi', 've', 'sa', 'do']) {
    testata.appendChild(el('span', { class: 'coppia-giorni', testo: n }));
  }
  box.appendChild(testata);

  const riga = el('div', { class: 'calendario-coppie' });
  // la prima riga parte dal LUNEDI' della settimana che contiene il primo del mese,
  // altrimenti ogni mese sarebbe spostato di una colonna e marte' finirebbe sotto
  // "giovedi".
  const inizio = new Date(primoDelMese);
  inizio.setDate(primoDelMese.getDate() - ((primoDelMese.getDay() + 6) % 7));
  const fine = new Date(ultimo);
  fine.setDate(ultimo.getDate() + (6 - ((ultimo.getDay() + 6) % 7)));

  for (let d = new Date(inizio); d <= fine; d.setDate(d.getDate() + 1)) {
    const isoCell = isoGiorno(d);
    const nelMese = d.getMonth() === mese - 1 && d.getFullYear() === anno;
    if (!nelMese) {
      riga.appendChild(el('span', { class: 'cella-calendario fuori' }));
      continue;
    }
    const previsto = previsti.has(d.getDay());
    const fatto = giorniFatti.has(isoCell);
    const passato = isoCell < oggi;
    // IL SALTATO richiede tre cose insieme: che il giorno ti toccasse, che non ci
    // sei andato, e che sia passato. Oggi non è un giorno saltato: non è ancora
    // successo niente. E un giorno di recupero non è MAI saltato, perchè non ti
    // toccava: saltare il riposo non è colpa di nessuno.
    const saltato = passato && previsto && !fatto;
    const classi = ['cella-calendario'];
    if (fatto) classi.push('fatto');
    else if (saltato) classi.push('saltato');
    else if (!previsto && passato) classi.push('recupero');
    if (previsto && !fatto && !saltato) classi.push('atteso');
    if (isoCell === oggi) classi.push('oggi');
    if (isoCell > oggi) classi.push('futuro');
const aperto = isoCell === statoCalendario.giorno;
    if (aperto) classi.push('aperto');

    riga.appendChild(el('button', {
      type: 'button',
      class: classi.join(' '),
      testo: String(d.getDate()),
      onClick: () => {
        const eraAperto = statoCalendario.giorno === isoCell;
        statoCalendario.giorno = eraAperto ? null : isoCell;
        disegna();
        // LA CASELLA APPENA PREMUTA SI ALLARGA un attimo. Su un calendario di 370
        // caselline il dito finisce dove vuole: senza un segnale non sai quale hai
        // premuto finché non leggi cosa c'è scritto sotto.
        //
        // La classe `aperto` c'è già nel DOM dopo il ridisegno, quindi basta
        // rintrovarla: non serve tenere un riferimento al nodo, che a ogni
        // ridisegno diventa vecchio.
        if (!eraAperto) {
          const celle = document.querySelectorAll
            ? document.querySelectorAll('.cella-calendario.aperto')
            : [];
          for (const c of celle) numeroCambiato(c);
        }
      },
      aria: { label: ariaGiorno(isoCell, d, previsto, fatto, saltato, !previsto) },
      titolo: `${d.getDate()}/${mese}` + (fatto ? ' allenato' : (saltato ? ' saltato' : (previsto ? ' giorno di allenamento' : ' recupero'))),
    }));
  }
  box.appendChild(riga);
  return box;
}

/** Cosa hai fatto in un giorno preciso. */
function dettaglioGiorno(iso) {
  const sedute = seduteDellaPersona().filter((s) => String(s.data || '').slice(0, 10) === iso && s.stato === 'completata');
  const box = el('div', { class: 'spiegazione' });
  const NOME = ['Domenica', 'Luned\u00ec', 'Marted\u00ec', 'Mercoled\u00ec', 'Gioved\u00ec', 'Venerd\u00ec', 'Sabato'];
  const d = new Date(iso + 'T12:00:00');
  box.appendChild(el('h3', { class: 'nota', testo: `${NOME[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` }));

  if (!sedute.length) {
    box.appendChild(el('p', { class: 'nota', testo: 'Qui non hai allenato.' }));
    return box;
  }
for (const s of sedute) {
    // Le serie ELIMINATE non si contano: sono nel cestino, e ogni altra schermata
    // dell'app le filtra via. Qui no, quindi una serie buttata compariva ancora
    // nella lista del giorno.
    const righe = serieDellaPersona().filter((x) => x.seduta_id === s.id && !x.eliminata);
    const voci = righe.map((x) => {
      const e = esercizioPerId(x.esercizio_id);
      // I CHILI ASSISTITI: negli esercizi assistiti il numero che hai scritto sta
      // in `peso_assistenza`, e `peso` è vuoto. Leggendo solo `peso`, l'esercizio
      // compariva senza i kg anche se li avevi scritti.
      const kg = Number(x.peso || x.peso_assistenza || 0);
      const numero = Number(x.ripetizioni || 0);
      const pezzi = [e ? e.nome : 'esercizio'];
      if (kg) pezzi.push(`${String(kg).replace('.', ',')} kg`);
      if (numero) pezzi.push(`${String(numero).replace('.', ',')} ${convenzioneMisuraCarico(e && e.convenzione) ? 'rip' : 'min'}`);
      return pezzi.join(' ');
    });
    box.appendChild(el('p', { class: 'nota', testo: voci.length ? voci.join(' · ') : 'seduta completata' }));
  }
  return box;
}

const NOMI_MESCE = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** Il prossimo giorno della settimana che hai scelto, come indice 0-6. */
function prossimoGiornoPrevisto(previsti, daIso) {
  const d = new Date(daIso + 'T12:00:00');
  for (let i = 1; i <= 8; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    if (previsti.has(x.getDay())) return x.getDay();
  }
  return null;
}

/**
 * IL PERSONAGGIO, che si aggiosta da solo.
 *
 * Ste (09/10/2026): "fai che quando scelgo guerriero ecc... deve aggiornarsi un
 * personaggio che metti dove gli vengono messe cose tipo l'armatura ecc... che si
 * aggiorna automaticamente".
 *
 * La richiesta ha tre parti e tutte e tre hanno una regola dentro:
 *
 *  - si aggiorna da SOLO: nessun bottone "salva", nessuna pagina da ricaricare. Il
 *    personaggio ricalcola tutto dai dati ogni volta che la schermata si disegna,
 *    quindi non può mai essere sbagliato: è quello che hai fatto ieri, non quello che
 *    avevi quando hai premuto l'ultimo bottone.
 *
 *  - le ARMATURE si mettono da sole quando le sblocchi. Non si sceglie: si
 *    sbloccano. E non si tolgono: la sequenza più lunga che hai fatto resta nel
 *    record, quindi saltare una settimana non ti toglie l'armatura (vedi streak.js).
 *
 *  - l'aspetto cambia con la classe: ogni Guerriero, Assassino e Berserker ha un
 *    aspetto proprio, e le armature che hai addosso si vedono sul personaggio. Così
 *    guardi la schermata e capisci a colpo d'occhio a che punto sei.
 *
 * Il riquadro delle armature resta SOTTO, con la lista di tutte e sei: il personaggio
 * è la foto, la lista è la spiegazione. Il personaggio serve a sentirti come un
 * personaggio, la lista serve a sapere cosa ti manca.
 */
function bloccoPersonaggio(profilo, st) {
  const rpg = calcolaAvatar(profilo.classe_rpg, serieMie(), seduteMie(), esercizioPerId, {
    profilo,
  });
  const equipaggiamentoRpg = profilo.equipaggiamento_aura || {};
  const armaturaEquipaggiata = OGGETTI_AURA.find((o) => o.id === equipaggiamentoRpg.Armatura && o.tipo === 'Armatura' && o.classe === (rpg.classe && rpg.classe.id));
  const effettoEquipaggiato = OGGETTI_AURA.find((o) => o.id === equipaggiamentoRpg.Effetto && o.tipo === 'Effetto');
  const skinEquipaggiata = OGGETTI_AURA.find((o) => o.id === equipaggiamentoRpg.Skin && o.tipo === 'Skin');
  const titoloEquipaggiato = OGGETTI_AURA.find((o) => o.id === equipaggiamentoRpg.Titolo && o.tipo === 'Titolo');

  const box = el('section', { class: 'blocco' });
  box.appendChild(el('h2', { testo: 'Il tuo personaggio' }));

// IL PERSONAGGIO.
  //
  // Ste (10/10/2026), dalla foto: qui c'era un quadrato con dentro una spada e un
  // guanto presi dal testo delle emoji. E la richiesta era precisa: "fai un
  // personaggio tipo all'inizio nudo, che mano a mano che sblocchi le cose si riempie
  // di cose. l'assassino ha in mano un coltello, il guerriero uno scudo e il berserker
  // l'ascia. fai una bella grafica".
  //
  // Il disegno è in src/personaggio-svg.js: ogni parte è un pezzo con un nome, quindi
  // si accende quando il premio è sbloccato, e la classe ci mette dentro il colore.
  //
  // `sbloccati` DEVE essere nell'ordine in cui sono arrivati, non in ordine alfabetico:
  // se i pezzi si accendessero dal basso verso l'alto senza ordine, il personaggio
  // sembrerebbe montarsi al contrario.
  const scena = el('div', { class: 'personaggio-scena' });
  const classeId = rpg.classe ? rpg.classe.id : 'nessuna';
  const indosano = rpg.premi.filter((p) => p.sbloccato);
  const idsIndossati = indosano.map((p) => p.id);
  // `personaggio personaggio-<classe>` va anche sul riquadro nuovo: sono due classi
  // diverse che fanno due cose diverse. `personaggio-<classe>` è quella che dà il
  // colore (guerriero oro, assassino viola, berserker verde) e senza quella il
  // personaggio sarebbe tutto grigio. `personaggio` è quella che fa respirare.
  const grafica = el('div', {
    class: 'personaggio-scena-grafica personaggio personaggio-' + classeId,
    aria: { label: `Personaggio ${rpg.classe ? rpg.classe.nome : 'senza classe'}, livello ${rpg.livello}, ${indosano.length} armature su ${rpg.premi.length}` },
  });
  // LA FOTO DELLA CLASSE È IL PERSONAGGIO.
  //
  // Ste (10/10/2026): "se scegli il berserker devi mettere che il tuo personaggio è
  // il berserker trasportando la foto che ti ho mandato nell'app".
  //
  // La foto viene dalle tre schede in Downloads/rpg.png, tagliate in
  // img/personaggi/. È il personaggio vero, quindi sta DAVANTI e grande.
  //
  // Il disegno olografico si vede SOLO quando non hai ancora scelto la classe: lì
  // dice "il tuo personaggio non esiste ancora", che è vero. Con la classe scelta
  // sarebbe un omino di bastoni copritovi addosso una foto vera, e cioè il peggio
  // dei due.
  const classeScelta = !!(rpg.classe && rpg.classe.id);
  // Lo stato visivo si calcola PRIMA del blocco `if`, non dentro.
  //
  // Prima era dichiarato dentro `if (classeScelta) { ... }`, ma più in giù lo riuso
  // anche nella riga sotto il personaggio ("Livello 10 · corazza aperta · ..."), che
  // sta FUORI da quel blocco. In JavaScript un `const` dichiarato dentro le graffe
  // vive solo lì dentro: fuori è come se non esistesse, e la pagina si fermava con
  // "Can't find variable: viso".
  const viso = statoVisivo(rpg.premi);
  // Dichiarata qui fuori perché la riga sotto il personaggio la usa, e quella sta
  // fuori dal blocco `if`. Vedi il commento sopra.
  let rigaStati = null;
  if (classeScelta) {
    // LA FOTO CAMBIA DA SOLA.
    //
    // Ste (11/10/2026): "ogni volta che sblocco qualcosa quell'immagine deve
    // vedersi meglio". Prima c'era una foto fissa più una fila di pezzi sciolti,
    // e quelli non tornavano: erano ritagliati da un'altra scheda, in un'altra
    // posa, e sembravano appiccicati.
    //
    // Adesso c'è una foto per ogni livello di armatura e si sceglie da sola
    // contando quanti premi hai preso. Il numero viene da `statoVisivo`, che
    // guarda il RECORD di streak: se smetti una settimana non ti spogli di dosso
    // quello che ti sei guadagnato.
    // `con-foto` toglie al riquadro qualsiasi altezza: la foto è un elemento nel
    // flusso e l'altezza la decide lei. Senza scatola il browser non può
    // decidere come infilarla e la taglia.
    grafica.classList.add('con-foto');
    // I cosmetici comprati si sovrappongono alla foto senza sostituire la progressione.
    if (armaturaEquipaggiata) grafica.classList.add('shop-' + armaturaEquipaggiata.id);
    if (effettoEquipaggiato) grafica.classList.add('shop-' + effettoEquipaggiato.id);
    if (skinEquipaggiata) grafica.classList.add('shop-' + skinEquipaggiata.id);
    // L'AURA è il sesto premio: non ha un'immagine tutta sua (l'ultima riga è
    // già "tutto addosso"), quindi è una luce che si accende sopra la foto.
    // L'Aura Divina degli 80 giorni ha un'identità visiva distinta: non deve
    // sembrare la normale aura dorata, ma un alone celestiale con anello e raggi.
    const auraDivinaAttiva = Number(st && st.fuoco && st.fuoco.giorni || 0) >= 80;
    if (auraDivinaAttiva) grafica.classList.add('personaggio-aura-divina');
    if (viso.aura || auraDivinaAttiva) {
      grafica.classList.add('personaggio-aura');
      // LE SCINTILLE. La luce, i fazzi, l'anello e il contorno li fa il CSS; le
      // scintille sono elementi veri perché ognuna ha una posizione, una grandezza,
      // una deriva e un momento di partenza tutti diversi. Se fossero uguali salirebbero
      // insieme e sembrerebbero una palla sola che sale.
      //
      // Sei, non quattro: con quattro si leggevano come un corteo regolare. Ogni
      // `deriva` spinge la scintilla di lato mentre sale, così il gruppo si apre
      // invece di restare una colonna.
      grafica.appendChild(el('div', { class: 'aura-colonna', aria: { hidden: 'true' } }));
      const scie = el('div', { class: 'aura-scie', aria: { hidden: 'true' } });
      const posizioni = [20, 31, 41, 50, 59, 68, 79];
      const ritardi = [0, .9, 1.7, 2.4, 3.1, 3.9, 4.6];
      const durate = [4.4, 5.3, 4.8, 5.8, 4.1, 5.0, 4.6];
      const grandezze = [5, 3, 4, 3, 6, 3, 4];
      const derive = [14, -9, 6, -13, 10, -6, 16];
      for (let i = 0; i < posizioni.length; i++) {
        scie.appendChild(el('i', {
          stile: [
            `--x:${posizioni[i]}%`,
            `--ritardo:${ritardi[i]}s`,
            `--durata:${durate[i]}s`,
            `--grandezza:${grandezze[i]}px`,
            `--deriva:${derive[i]}px`,
            // Due su sette sono quasi bianche: una scintilla tutta d'oro fa "oro",
            // una scintilla bianca fa "luce".
            i % 3 === 1 ? '--colore:#fff6d8' : '',
          ].filter(Boolean).join(';'),
        }));
      }
      grafica.appendChild(scie);

      // LE STELLE che scintillano intorno alla figura: cinque, in punti alti e
      // bassi, con tempi diversi. Non stanno ferme: una stella fissa sembra una
      // macchiolina, una stella che si accende e spegne sembra viva.
      const stelle = el('div', { class: 'aura-stelle', aria: { hidden: 'true' } });
      // Nove, non cinque: con cinque la parte alta del riquadro restava vuota, e il
      // vuoto si nota più delle stelle. alternate sono grandi e piccole, così non
      // sembrano una griglia.
      const Stelle = [
        { x: 15, y: 15, g: 8, r: 0, d: 3.2 },
        { x: 34, y: 9, g: 5, r: 1.4, d: 4.3 },
        { x: 62, y: 13, g: 6, r: 2.6, d: 3.8 },
        { x: 84, y: 19, g: 7, r: .8, d: 4.5 },
        { x: 24, y: 33, g: 5, r: 2.0, d: 3.4 },
        { x: 90, y: 38, g: 5, r: 3.1, d: 4.1 },
        { x: 8, y: 49, g: 6, r: 1.1, d: 3.7 },
        { x: 44, y: 44, g: 4, r: 2.9, d: 4.6 },
        { x: 73, y: 47, g: 5, r: .4, d: 3.5 },
        // Ste (12/10/2026): "prova a mettere degli effetti in più che valorizzino
        // arrivare fino a 75 giorni di fila". Da nove a quattordici: le prime nove
        // coprono i bordi, queste cinque stanno dentro e in mezzo, che era la zona
        // rimasta vuota. Nessuna è sulla faccia della figura, così non copre il
        // personaggio. I tempi sono tutti diversi dalle altre, altrimenti si muovono
        // a gruppi e si capisce che sono un effetto unico.
        { x: 52, y: 26, g: 5, r: .9, d: 3.9 },
        { x: 31, y: 22, g: 4, r: 2.2, d: 4.4 },
        { x: 68, y: 30, g: 6, r: 1.7, d: 3.3 },
        { x: 17, y: 40, g: 4, r: 3.6, d: 4.2 },
        { x: 56, y: 56, g: 5, r: 1.2, d: 3.6 },
      ];
      for (const s of Stelle) {
        stelle.appendChild(el('i', {
          stile: `--x:${s.x}%; --y:${s.y}%; --grandezza:${s.g}px; `
            + `--ritardo:${s.r}s; --durata:${s.d}s`,
        }));
      }
      grafica.appendChild(stelle);

      // LE ONDATE DI LUCE e LA CORONA.
      //
      // Ste (12/10/2026): "prova a mettere degli effetti in più che valorizzino
      // arrivare fino a 75 giorni di fila". Un'aura che sta li' e basta dice
      // "questo personaggio è luminoso"; un'aura che ogni tanto SPARA qualcosa dice
      // "appena hai fatto qualcosa di straordinario". Sono due cose diverse e
      // servono entrambe.
      //
      // L'onda parte dalla figura e si allarga finche' sparisce: è il segnale che
      // dice che qualcosa è appena successo. La corona è l'anello che sta fermo
      // sopra la testa e si allarga piano, e quello dice che la luce è sua.
      //
      // Perche' si animano `width`/`height` e NON `scale`: il progetto vieta le scale
      // forti, giustamente, perché deformano il contenuto. Qui pero' un onda che
      // non cresce non è un'onda. Con larghezza e altezza non si deforma niente,
      // perché l'onda è un anello vuoto e dentro non c’è contenuto da stortare.
      const onde = el('div', { class: 'aura-onde', aria: { hidden: 'true' } });
      for (const ritardo of [0, 2.6, 5.2]) {
        onde.appendChild(el('i', { stile: `--ritardo:${ritardo}s` }));
      }
      grafica.appendChild(onde);
      grafica.appendChild(el('div', { class: 'aura-corona', aria: { hidden: 'true' } }));

      // IL BAGLIORE: una banda di luce che attraversa la figura ogni 4,5 secondi.
      // È quella che fa capire che l'armatura è "divina" e non solo colorata: la luce
      // ci passa sopra, davvero, e non è un colore fermo.
      grafica.appendChild(el('div', { class: 'aura-lustro', aria: { hidden: 'true' } }));
    }
    grafica.appendChild(el('img', {
        class: 'personaggio-ritratto',
        src: percorsoStato(classeId, viso.indice),
        alt: `${rpg.classe.nome}: ${viso.stato.riga}`,
        loading: 'lazy',
        decoding: 'async',
      }));
    const overlayCosmetici = svgCosmeticiRpg(
      armaturaEquipaggiata && armaturaEquipaggiata.id,
      effettoEquipaggiato && effettoEquipaggiato.id,
      skinEquipaggiata && skinEquipaggiata.id,
    );
    if (overlayCosmetici) grafica.appendChild(overlayCosmetici);

    // LA FILMSTRIP: sei miniature, una per stato.
    //
    // LA FILA DELLA PROGRESSIONE: una casella per PREMIO, col nome che dice la classe.
    //
    // Ste (12/10/2026): "nelle foto piccole spunta senza armatura, bracciali,
    // corazza, armatura, arma, completo. ma giu' nelle ricompense, dove c’è anche
    // il lucchetto, spunta bracciali di cuoio, vesti leggeri, cintura da assassino,
    // pugnale, armatura leggendaria, arma divina: che sono cose diverse".
    //
    // Aveva ragione, e il difetto era mio. Qui si usavano i nomi degli STATI
    // ("Corazza", "Armatura", "Arma"), un vocabolario inventato, mentre la lista
    // delle ricompense usava i nomi veri della classe. Due elenchi diversi per la
    // stessa cosa: la casella diceva "Corazza" e la ricompensa "Vesti leggere" per
    // lo stesso sblocco, e non si capiva quale dei due fosse quello giusto.
    //
    // Adesso è la stessa lista: una casella per ogni premio di `PREMI`, con il nome
    // di `nomePremio`. Davanti c’è la casella "Senza armatura", che non è una
    // ricompensa ma il punto da cui si parte.
    //
    // Le caselle sono SETTE e le immagini sei: l'ultima casella è "Aura divina", il
    // sesto premio, che non ha una foto tutta sua perché l'ultima riga è già
    // "tutto addosso". Quella mostra l'ultima foto con l'AURA accesa sopra, che è
    // quello che dice `viso.aura`.
    //
    // La striscia si prepara qui dentro, ma si mette a schermo DOPO la foto e il
    // nome. Per questo è `let` e non `const`: il codice che la mette sta sotto,
    // fuori da questo blocco.
    // Gli sblocchi restano (il record), ma il contatore per la prossima ricompensa si
  // conta con la streak di ADESSO: se l'hai persa, ricomincia da capo (Ste, 21/10/2026).
  const caselle = schedaProgressione(rpg.premi, classeId, rpg.recordStreak,
    rpg.streak ? rpg.streak.giorni : null)
      .map((c) => ({ ...c, inCorso: c.immagine === viso.indice && (!c.aura || viso.aura) }));
    rigaStati = el('div', { class: 'riga-pezzi personaggio-' + classeId });
    rigaStati.appendChild(el('p', {
      class: 'nota nota-piccola',
      testo: viso.completo
        ? 'Hai tutto addosso. Continua a tenere la streak e si accende anche l\'aura.'
        : 'Il personaggio si veste da solo con i giorni di fila.',
    }));
    const striscia = el('div', { class: 'striscia-pezzi' });
    for (const c of caselle) {
      striscia.appendChild(el('div', {
        class: 'pezzo' + (c.sbloccato ? ' acceso' : ' spento') + (c.inCorso ? ' adesso' : ''),
        title: c.nome,
      }, [
        // LA SPUNTA. Dice "questo l'hai preso" senza dover leggere la riga sotto, e
        // sta solo dove il premio è davvero sbloccato: è un segno, non una
        // decorazione. Sulle caselle ancora chiuse c’è un puntino, così la fila si
        // legge tutta di un colpo.
        el('span', {
          class: 'pezzo-spunta' + (c.sbloccato ? ' acceso' : ''),
          testo: c.sbloccato ? '\u2713' : '\u00b7',
          aria: { hidden: 'true' },
        }),
        el('img', {
          class: 'pezzo-img' + (c.aura ? ' con-aura' : ''),
          src: percorsoStato(classeId, c.immagine),
          alt: c.sbloccato ? c.nome : `Non ancora sbloccato: ${c.nome}`,
          loading: 'lazy',
          decoding: 'async',
        }),
        el('span', { class: 'pezzo-nome', testo: c.nome }),
        el('span', {
          class: 'pezzo-quando',
          testo: c.sbloccato
            ? (c.inCorso ? 'questo sei tu' : 'sbloccato')
            : (c.chiave === 'niente'
              ? 'da cui parti'
              : `ti mancano ${c.mancano} ${c.mancano === 1 ? 'giorno' : 'giorni'}`),
        }),
      ]));
    }
    rigaStati.appendChild(striscia);
    // La striscia NON viene aggiunta qui: si mette DOPO la foto e dopo il nome.
    // Ste (11/10/2026): "deve esserci il mio attuale più grande". Prima la striscia
    // entrava per prima e, prendendo tutta la riga, spingeva la foto in fondo e
    // piccola. Ora l'ordine è: foto grande, nome, e POI la progressione.
  } else {
    const attesa = el('div', { class: 'persono-ologramma' });
    attesa.innerHTML = personaggioSvg({ classe: classeId, sbloccati: idsIndossati });
    grafica.appendChild(attesa);
  }
scena.appendChild(grafica);
  scena.appendChild(el('div', { class: 'personaggio-dati' }, [
    el('strong', { testo: (rpg.classe ? rpg.classe.nome : 'Scegli una classe') }),
    el('span', {
      class: 'nota',
      // Con la classe scelta si dice anche COME SEI VESTITO, non solo quanti pezzi
      // hai: è la cosa che cambia da sola quando la streak cresce.
      testo: classeScelta
        ? `Livello ${rpg.livello} · ${viso.stato.riga} · ${indosano.length} di ${rpg.premi.length} armature`
: `Livello ${rpg.livello} · ${indosano.length} di ${rpg.premi.length} armature`,
    }),
    ...(titoloEquipaggiato ? [el('span', {
      class: 'personaggio-titolo-equipaggiato',
      testo: titoloEquipaggiato.icona + ' ' + titoloEquipaggiato.nome,
    })] : []),
  ]));
  // E SOLO ADESSO la progressione, sotto tutto il resto. Ste: "deve esserci il mio
  // attuale più grande": la foto grande viene per prima, e la fila degli stati
  // è quello che le sta sotto, non davanti.
  if (rigaStati) scena.appendChild(rigaStati);
  box.appendChild(scena);
  // Mostra sul personaggio quali cosmetici del negozio sono equipaggiati.
  // La collezione resta intatta anche quando si cambia aspetto.
  const oggettiEquipaggiati = OGGETTI_AURA.filter((o) => equipaggiamentoRpg[o.tipo === 'Armatura' ? 'Armatura' : o.tipo] === o.id);
  if (oggettiEquipaggiati.length) {
    box.appendChild(el('div', { class: 'personaggio-equipaggiamento' }, [
      el('strong', { testo: 'Equipaggiato' }),
      ...oggettiEquipaggiati.map((o) => el('span', { class: 'personaggio-equip-tag', testo: o.icona + ' ' + o.nome })),
      el('a', { href: '#/aura-shop', class: 'bottone-guarda', testo: 'Gestisci equipaggiamento' }),
    ]));
  }

// IL PULSANTE CHE SPIEGA. Ste: "metti pure un pulsante che ti spiega come funziona
  // questo rpg". Non un help che ti manda a un altro schermo: un riquadro che si
  // apre qui, sotto il personaggio, e spiega le quattro cose che servono: cosa sono
  // le statistiche, cosa fa la classe, come si sbloccano le armature, e cosa NON
  // conta (che è la parte che ti evita di giocare al numero invece che allenarsi).
  //
  // Il riquadro si mette in fondo al blocco e si apre/chiude da solo: il pulsante
  // cambia etichetta, così non devi indovinare se è aperto o chiuso.
  const spiegazione = spiegazioneRpg();
  spiegazione.hidden = true;
  const btn = bottone('Come funziona questo RPG?', {
    classe: 'fantasma',
    onClick: () => {
      spiegazione.hidden = !spiegazione.hidden;
      btn.textContent = spiegazione.hidden ? 'Come funziona questo RPG?' : 'Chiudi la spiegazione';
    },
  });
  box.appendChild(btn);
  box.appendChild(spiegazione);
  return box;
}

/** Il riquadro di spiegazione dell'RPG. */
function spiegazioneRpg() {
  return el('div', { class: 'spiegazione rpg-spiegazione' }, [
    el('p', { testo: 'Le tre statistiche vengono dagli allenamenti veri, non da un numero che scrivi tu.' }),
    el('ul', {}, [
      el('li', {}, [el('strong', { testo: 'Forza' }), el('span', { testo: ': quanti kg hai spostato in totale sui movimenti grossi (panche, spinte, tirate, gambe pesanti). Ogni 500 kg sono un punto: se hai spostato 5000 kg in tutto, la Forza è 11 (10 punti più quello di partenza).' })]),
      el('li', {}, [el('strong', { testo: 'Agilità' }), el('span', { testo: ': quanti minuti di cardio hai fatto. Ogni 5 minuti sono un punto: mezz\'ora di tapis sono 7 punti (6 più quello di partenza).' })]),
      el('li', {}, [el('strong', { testo: 'Stamina' }), el('span', { testo: ': quanti minuti di cardio hai fatto e in quanti giorni ti sei allenato. Ogni 8 minuti di cardio sono un punto, più un punto ogni 2 giorni di allenamento. È la statistica di chi non fa solo forza.' })]),
      el('li', {}, [el('span', { testo: 'Tutte e tre partono da 1, mai da 0: se hai cominciato adesso, non sei a zero.' })]),
    ]),

    el('h4', { class: 'titolo-sottosezione', testo: 'Come si segna il cardio' }),
    el('p', { testo: 'Il cardio si registra come un esercizio qualsiasi, con una differenza: nel campo sotto il peso scrivi i MINUTI, non le ripetizioni.' }),
    el('ul', {}, [
      el('li', { testo: 'Mezz\'ora sul tapis: scrivi 30. Un\'ora: scrivi 60.' }),
      el('li', { testo: 'Nei vecchi allenamenti 1800 per mezz\'ora era salvato in secondi: ora lo vedi come 30 minuti. Da adesso scrivi sempre i minuti.' }),
      el('li', { testo: 'Se l\'esercizio è nuovo e non lo trovi già nell\'app, crealo e spunta "È cardio": senza quella spunta l\'app non sa che quel movimento è cardio e non te lo conta.' }),
    ]),

    el('h4', { class: 'titolo-sottosezione', testo: 'La classe' }),
    el('p', { testo: 'La classe che scegli dà il +20% a UNA statistica sola: Guerriero alla Forza, Assassino all\'Agilità, Berserker alla Stamina. Non conta per le armature, che si sbloccano con i numeri veri: quindi cambiando classe non ti perdi niente, e puoi cambiare quando ti pare.' }),
    el('p', { testo: 'La scelta dell\'app ("con i tuoi numeri ti verrebbe consigliato il Guerriero") è un\'ipotesi, non un obbligo: consiglia la classe che alza la statistica che hai già più alta.' }),

    el('h4', { class: 'titolo-sottosezione', testo: 'Le armature' }),
    el('p', { testo: 'Si sbloccano con i giorni di fila, e te le restano per sempre: se salti una settimana non le perdi, perché si sbloccano con la sequenza più lunga che hai mai fatto, non con quella di adesso.' }),

    el('p', {}, [el('strong', { testo: 'Cosa NON conta: ' }), el('span', { testo: 'Il livello del personaggio dice quanta pratica hai fatto; il livello account in cima cresce con le ricompense. Nessuno dei due dice quanto sei forte: per quello guarda il Rank.' })]),
  ]);
}

/** L'etichetta per chi non distingue i colori. */
function ariaGiorno(iso, d, previsto, fatto, saltato, recupero) {
  const NOME = ['domenica', 'luned\u00ec', 'marted\u00ec', 'mercoled\u00ec', 'gioved\u00ec', 'venerd\u00ec', 'sabato'];
  return `${NOME[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}: `
    + (fatto ? 'allenato' : (saltato ? 'saltato, giorno che ti toccava' : (previsto ? 'ti tocca' : 'giorno di recupero')));
}

const GIORNI_SETTIMANA = [
  { n: 1, nome: 'Lunedì' }, { n: 2, nome: 'Martedì' }, { n: 3, nome: 'Mercoledì' },
  { n: 4, nome: 'Giovedì' }, { n: 5, nome: 'Venerdì' }, { n: 6, nome: 'Sabato' },
  { n: 0, nome: 'Domenica' },
];

/**
 * I giorni in cui vai in palestra.
 *
 * Ste (08/10/2026): "questa app devo darla pure a dei miei compagni, non tutti
 * fanno i miei stessi giorni, quindi devi mettere nell'app che devo specificare che
 * giorni vado in palestra e automaticamente funziona la streak".
 *
 * PERCHE' SERVE UNA SCELTA E NON UNA REGOLA FISSA. Prima la streak contava i giorni di
 * calendario consecutivi: chi allena quattro volte su sette non poteva MAI superare
 * quattro, e si rompeva a ogni fine settimana dal riposo lungo. Sui numeri veri di
 * Ste l'app diceva "streak di 1 giorno" dopo otto allenamenti in due settimane.
 *
 * Adesso la regola è la sua: la streak si interrompe SOLO se salti un giorno che hai
 * scritto qui sotto, e un allenamento inaspettato conta comunque.
 *
 * IL RIPOSO È PARTE DEL PROGRAMMA. Per questo la casella dice "quando NON alleni
 * non succede niente": è la frase che rende chiara la regola, perché il dubbio che
 * tutti hanno guardando una streak è "ma il riposo me la rompe?".
 */
/**
 * Converte quello che arriva da un campo numerico nel NUMERO giusto, o in `null`.
 *
 * IL BUG CHE QUESTA FUNZIONE RISOLVE.
 *
 * `campoNumero` (ui.js) manda `null` quando il campo è vuoto, non la stringa
 * vuota: è il suo modo di dire "non c'è niente". Ma il codice faceva
 * `Number(String(v).replace(',', '.'))`, e `String(null)` è la parola `"null"`, che
 * `Number` non sa leggere e restituisce `NaN`.
 *
 * Il risultato era questo: SVUOTARE il campo dei kg o delle ripetizioni salvava
 * `NaN` sul database, e al ridisegno il campo mostrava la parola "NaN". Non è un
 * numero che si vede e non si capisce: è un peso perso, perché i Rank scartano i
 * valori che non sono numeri e l'esercizio sparisce dalle classifiche.
 *
 * Tre righe del file avevano una protezione, ma controllavano `v === ''` mentre il
 * campo manda `null`: la condizione non era mai vera, quindi il ramo `NaN` partiva
 * lo stesso. Qui la protezione è una sola e non può sbagliare.
 */
function numeroOppureNull(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const testo = String(v).trim();
  if (testo === '') return null;
  // sostituisce TUTTE le virgole, non solo la prima: "1,234,5" è un numero solo
  // scritto male, e togliere una virgola sola lascerebbe "1.234,5" che non è un numero
  const n = Number(testo.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function bloccoGiorniAllenamento() {
  const profilo = profiloAttivo();
  const salvati = Array.isArray(profilo.giorni_allenamento) ? profilo.giorni_allenamento.slice() : null;

  const box = el('section', { class: 'blocco' });
  box.appendChild(el('h2', { testo: 'I giorni in cui alleni' }));
  box.appendChild(el('p', { class: 'nota', testo: 'La streak conta gli allenamenti, non i giorni di calendario: quando non alleni non succede niente. Si interrompe solo se salti un giorno che hai scritto qui sotto. Se non scegli niente, l\'app conta come una volta sola l\'ultimo allenamento.' }));

  const scelti = new Set(salvati || []);
  const griglia = el('div', { class: 'riga-pulsanti' });
  const riepilogo = el('p', { class: 'nota nota-piccola' });

  const scriviRiepilogo = () => {
    const quanti = scelti.size;
    riepilogo.textContent = quanti === 0
      ? 'Nessun giorno scelto: la streak vale solo se ti alleni oggi o ieri.'
      : `Alleni ${quanti === 1 ? 'solo il' : 'in'} ${[...scelti].map((n) => {
        const g = GIORNI_SETTIMANA.find((x) => x.n === n);
        return (g ? g.nome : String(n)).toLowerCase();
      }).join(', ')}.`;
  };

  for (const g of GIORNI_SETTIMANA) {
    const bottoneGiorno = bottone(g.nome, {
      onClick: async () => {
        if (scelti.has(g.n)) scelti.delete(g.n); else scelti.add(g.n);
        bottoneGiorno.classList.toggle('attivo', scelti.has(g.n));
        scriviRiepilogo();
        const lista = scelti.size ? [...scelti].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) : null;
        await salvaProfilo({ giorni_allenamento: lista });
        avviso(lista
          ? `Giorni aggiornati: ${lista.map((n) => (GIORNI_SETTIMANA.find((x) => x.n === n) || {}).nome).join(', ')}.`
          : 'Giorni svuotati: la streak ora vale solo se ti alleni oggi o ieri.', { tipo: 'ok' });
      },
      // IL PULSANTE HA UNA CLASSE SUA, così lo stile di "giorno scelto" non si
    // confonde con quello degli altri bottoni accesi (spotter, dropset, chip).
    classe: 'fantasma giorno-settimana' + (scelti.has(g.n) ? ' attivo' : ''),
    });
    griglia.appendChild(bottoneGiorno);
  }
  box.appendChild(griglia);
  scriviRiepilogo();
  box.appendChild(riepilogo);
  return box;
}

/**
 * L'AVATAR RPG: classe, statistiche, livello e armature.
 *
 * Sta nel PROFILO, non nei Progressi, per la stessa ragione dell'avatar: È identita'
 * ("chi sei"), mentre i Progressi rispondono a una domanda numerica ("quanto stai
 * sollevando in più del tuo corpo"). Vedi anche il test profilo-avatar.test.js.
 *
 * Il sistema È quello che Ste ha scritto lui (vedi src/avatar-rpg.js, dove sono
 * scritte le tre correzioni fatte e il perchÈ).
 */
/**
 * LE TRE STATISTICHE, spiegate.
 *
 * Ste (09/10/2026), guardando la schermata: "il forza 10 agilità 1 stamina 2 livello
 * 3 cosa indicano?".
 *
 * Un numero senza la sua unità è rumore. "Forza 10" non vuol dire niente se non sai
 * che 10 è "dieci volte 500 kg spostati in totale", cioè 5000 kg. Ogni riga della
 * schermata mostra quindi la soglia che la fa crescere, scritta in parole.
 *
 * Una statistica per riga, con tre cose: il nome, la spiegazione, e il numero. E il
 * numero è quello VERO, non quello con il +20%: la differenza è scritta accanto al
 * nome, perché un numero che cambia a seconda della classe è una domanda.
 */
const SPIEGAZIONE_STAT = {
  forza: {
    nome: 'Forza',
    cosa: 'I kg che hai spostato in totale sui movimenti grossi: 1 punto ogni 500 kg (carico × ripetizioni). Parte da 1.',
  },
  agilita: {
    nome: 'Agilità',
    cosa: 'I minuti di cardio: 1 punto ogni 5 minuti di tapis, corsa o corda. Parte da 1.',
  },
  stamina: {
    nome: 'Stamina',
    cosa: 'Cardio e costanza: 1 punto ogni 8 minuti di cardio, più 1 ogni 2 giorni in cui ti alleni. Parte da 1.',
  },
};

function bloccoAvatarRpg(profilo, st) {
  const box = el('section', { class: 'blocco' });
  const rpg = calcolaAvatar(profilo.classe_rpg, serieMie(), seduteMie(), esercizioPerId, {
    profilo,
  });

  // ---- la classe
  const sceltaClasse = rpg.classe || classeConsigliata(rpg.base);
  box.appendChild(el('h2', { testo: 'Classe e statistiche RPG' }));
  if (!rpg.classe) {
    // "Con i numeri di adesso ti viene il Guerriero" non diceva niente: non WHICH
    // numeri, non PERCHÉ quel Guerriero, non cosa cambia scegliendolo.
    //
    // Ste (09/10/2026): "che vuol dire con i numeri di adesso ti viene il
    // guerriero?". Adesso la frase dice i tre numeri, dice perché viene
    // consigliata quella, e dice che non è un obbligo.
    box.appendChild(el('p', {
      class: 'nota',
      testo: sceltaClasse
        ? `Non hai ancora scelto una classe. Con i tuoi numeri di adesso ti verrebbe `
          + `consigliato il ${sceltaClasse.nome}, perché è la tua statistica più alta `
          + `(${SPIEGAZIONE_STAT[sceltaClasse.bonus].nome.toLowerCase()}) e il suo `
          + `bonus è il +20% su quella. Ma non è un obbligo: se preferisci un'altra, `
          + `premi quella che vuoi e cambia quando ti pare.`
        : 'Scegli la tua classe: è il bonus che alza una statistica su. Prima prova ad allenarci un po\' e i numeri arriveranno.',
    }));
  }
const grigliaClassi = el('div', { class: 'riga-classi' });
  // IL VINCOLO, CORRETTO.
  //
  // Ste (10/10/2026): "una volta che l'utente sceglie la classe, questa scelta è
  // permanente e non può essere modificata".
  //
  // Ste (12/10/2026): "fai in modo che SOLO io possa cambiare la mia classe quando
  // voglio senza ovviamente perdere i progressi dell'altra classe, ma attenzione:
  // devo essere solo io in grado di farlo".
  //
  // Sono due richieste in una, e una corregge l'altra. Il vincolo del 10/10 era
  // giusto nel SUO motivo: all'epoca un premio pretendeva anche una statistica, quindi
  // cambiando classe si ripartiva da capo e il vincolo serviva a evitare di approfittarne.
  // Da allora lo sblocco guarda solo la streak (vedi `calcolaAvatar`), quindi il
  // cambio classe NON costa niente: restano gli stessi giorni e le stesse armature.
  //
  // Però il vincolo non si butta via: diventa una PAROLA SEGRETA. La sceglie Ste
  // (quindi non è scritta da nessuna parte nel codice e la conosce solo lui) e senza
  // quella parola la classe non si tocca. Vedi src/sigillo-classe.js, che spiega
  // anche i limiti di una protezione fatta dal lato del browser.
  //
  // Per cambiare si salva SOLO `classe_rpg`: nient'altro viene toccato, quindi non si
  // può perdere nulla per via. Le tre classi restano comunque tutte raggiungibili in
  // qualunque momento, con lo stesso equipaggiamento.
  const classeGiaScelta = !!(profilo.classe_rpg && rpg.classe);
  // `sbloccatoPerMe` vuol dire: la parola è già stata messa in questa sessione, e
  // quindi i bottoni restano cliccabili senza ridigitarla a ogni tentativo.
  let sbloccatoPerMe = false;
  // `stoCambiando` serve solo per non far partire due dialoghi insieme.
  let stoCambiando = false;

  /** Il dialogo della parola, sia quando la crea sia quando la chiede. */
  const chiediParola = async () => {
    if (haSigillo(profilo)) {
      const parola = await chiediTesto('Cambiare classe',
        'Scrivi la tua parola segreta per cambiare classe. Nessuno la conosce: l\'app '
        + 'non la può leggere e non la vede nessuno.', {
        segnaposto: 'parola segreta',
        testoOk: 'Sblocca',
        tipo: 'password',
      });
      if (!parola) return false;
      if (!(await verificaSigillo(parola, profilo))) {
        avviso('Parola sbagliata: la classe non è cambiata.', { tipo: 'errore' });
        return false;
      }
      sbloccatoPerMe = true;
      return true;
    }
    // La prima volta la parola non c'è: la crea. Due domande, perché una parola
    // sbagliata scritta due volte non lascia il profillo in una situazione da cui
    // non si esce più.
    const avviso1 = await chiediTesto('Scegli la tua parola segreta',
      'Nessuno la vedrà: nel profilo finisce solo la sua impronta, non la parola. '
      + 'Ti servirà per cambiare classe.', {
      segnaposto: 'almeno 4 caratteri', testoOk: 'Avanti', tipo: 'password',
    });
    if (!avviso1) return false;
    const avviso2 = await chiediTesto('Ripetila',
      'Scrivila uguale. Serve per essere sicuri di non sbagliare.', {
      segnaposto: 'ripeti la parola', testoOk: 'Salva', tipo: 'password',
    });
    if (!avviso2) return false;
    if (avviso1.trim() !== avviso2.trim()) {
      avviso('Le due parole non sono uguali: riprova.', { tipo: 'errore' });
      return false;
    }
    let sigillo;
    try {
      sigillo = await creaSigillo(avviso1, new Date().toISOString());
    } catch (e) {
      avviso(String(e.message || e), { tipo: 'errore' });
      return false;
    }
    // `classe_rpg` NON viene toccato qui: si cambia solo quando sceglie davvero.
    await salvaProfilo({ sigillo_classe: sigillo });
    sbloccatoPerMe = true;
    avviso('Parola salvata. Da qui in puoi cambiare classe quando vuoi.', { tipo: 'ok' });
    return true;
  };

  /** Il click su una classe, con il controllo della parola se serve. */
  const scegliClasse = async (c) => {
    if (stoCambiando) return;
    if (classeGiaScelta && !sbloccatoPerMe) {
      stoCambiando = true;
      try {
        const aperto = await chiediParola();
        if (!aperto) { disegna(); return; }
      } finally {
        stoCambiando = false;
      }
    }
    // QUI il salvataggio. Solo `classe_rpg`: il record di streak si ricalcola da
    // solo dalle sedute, quindi l'equipaggiamento resta identico.
    await salvaProfilo({ classe_rpg: c.id, personaggio_creato: true });
    avviso(`Sei un ${c.nome}: +20% di ${c.bonus}. L'armatura che hai è la stessa di prima.`, { tipo: 'ok' });
  };

  for (const c of Object.values(CLASSI)) {
    const scelta = classeGiaScelta && rpg.classe.id === c.id;
    grigliaClassi.appendChild(bottone(scelta ? `${c.icona}  ${c.nome}  ✓` : `${c.icona}  ${c.nome}`, {
      onClick: () => scegliClasse(c),
      classe: 'classe-rpg' + (scelta ? ' attiva' : '') + (classeGiaScelta && !scelta && !sbloccatoPerMe ? ' bloccata' : ''),
      titolo: scelta
        ? `Sei un ${c.nome}: +20% di ${c.bonus}`
        : (classeGiaScelta
          ? `Cambiare in ${c.nome}: serve la tua parola segreta`
          : `Scegli il ${c.nome}: +20% di ${c.bonus}`),
      'aria-pressed': scelta,
      disabilitato: false,
    }));
  }
  box.appendChild(grigliaClassi);
  if (classeGiaScelta) {
    const notaSigillo = haSigillo(profilo)
      ? 'Per cambiarla serve la tua parola segreta. Se te la dimentichi non puoi più '
        + 'cambiarla, ma non perdi n\'altro: la classe non influenza l\'armatura.'
      : 'Non hai ancora una parola segreta: la crei la prima volta che provi a '
        + 'cambiare classe.';
    box.appendChild(el('p', {
      class: 'nota nota-piccola',
      testo: `Sei un ${rpg.classe.nome}. Puoi cambiarlo quando vuoi e non perdi nulla: `
        + 'le armature dipendono dai tuoi giorni di fila, non dalla classe. ' + notaSigillo,
    }));
  }
  // E sotto ogni bottone, cosa ti dà. Un bottone che dice solo il nome costringe a
  // andare a leggere la spiegazione per capire che differenza c'è.
  const rigaBonus = el('div', { class: 'riga-classi riga-bonus' });
  for (const c of Object.values(CLASSI)) {
    rigaBonus.appendChild(el('div', {
      class: 'nota nota-piccola',
      testo: `${c.nome}: ${SPIEGAZIONE_STAT[c.bonus].nome} +20%`,
    }));
  }
  box.appendChild(rigaBonus);

  // ---- le tre statistiche
  //
  // Ste: "il forza 10 agilità 1 stamina 2 livello 3 cosa indicano?".
  //
  // Un numero senza la sua unità è rumore: "Forza 10" non vuol dire niente se non
  // sai che 10 è "10 volte 500 kg spostati in totale". Ogni statistica ha quindi
  // sotto la soglia che la fa crescere, scritta in parole.
  const righe = el('div', { class: 'righe-stat' });
  const etichette = { forza: 'Forza', agilita: 'Agilità', stamina: 'Stamina' };
  for (const chiave of ['forza', 'agilita', 'stamina']) {
    const valore = rpg.st[chiave] || 1;
    const inRilievo = rpg.classe && rpg.classe.bonus === chiave;
    righe.appendChild(el('div', { class: 'riga-stat riga-stat-spiegata' + (inRilievo ? ' rilievo' : '') }, [
      el('div', { class: 'testo-stat' }, [
        el('span', { class: 'nome-stat', testo: etichette[chiave] + (inRilievo ? ' +20%' : '') }),
        el('span', { class: 'nota nota-piccola', testo: SPIEGAZIONE_STAT[chiave].cosa }),
      ]),
      el('strong', { class: 'valore-stat', testo: String(valore) }),
    ]));
  }
  // IL LIVELLO non è "quanto sei forte": è quanto hai allenato in tutto. La
  // frase lo dice, perché è la confusione più probabile: si vede "Livello 3" accanto
  // a "Forza 10" e sembrano la stessa cosa misurata due volte.
  righe.appendChild(el('div', { class: 'riga-stat riga-stat-spiegata' }, [
    el('div', { class: 'testo-stat' }, [
      el('span', { class: 'nome-stat', testo: 'Livello' }),
      el('span', {
        class: 'nota nota-piccola',
        testo: 'È il livello del personaggio: Quanta pratica hai fatto in tutto, non quanto sei forte. Sale con i kg '
          + 'spostati e i minuti di cardio. Per misurare quanto sei forte, guarda il Rank.',
      }),
    ]),
    el('strong', { class: 'valore-stat', testo: String(rpg.livello) }),
  ]));
  box.appendChild(righe);
  box.appendChild(el('div', { class: 'blocco-progresso-livello' }, [
    barraProgresso(rpg.progressoLivello, `personaggio: livello ${rpg.livello} → ${rpg.livello + 1}`),
    el('span', {
      class: 'nota',
      testo: `${formattaNumero(rpg.xpNelLivello)} di ${formattaNumero(rpg.xpPerLivello)} punti esperienza · ne mancano ${formattaNumero(rpg.xpMancanti)} al prossimo livello`,
    }),
  ]));

  // ---- le armature
  box.appendChild(el('h3', { class: 'titolo-sottosezione', testo: 'Armature e armi' }));
  // Il NOME dipende dalla classe, non dal premio generico.
  //
  // Ste (10/10/2026), dalla scheda delle tre classi: il secondo pezzo è "armatura di
  // cuoio" per il guerriero, "pelo e pelliccia" per il berserker e "vesti leggeri" per
  // l'assassino. Qui si mostrava sempre "Armatura di ferro" anche al berserker, che di
  // ferro non ha niente.
  const classePerIpremi = rpg.classe ? rpg.classe.id : null;
  const listaPremi = el('div', { class: 'lista-premi' });
  for (const p of rpg.premi) {
    listaPremi.appendChild(el('div', { class: 'premio' + (p.sbloccato ? ' sbloccato' : '') }, [
      el('span', { class: 'icona-premio', testo: p.sbloccato ? p.icona : '🔒' }),
      el('div', { class: 'testo-premio' }, [
        el('span', { class: 'nome-premio', testo: nomePremio(p.id, classePerIpremi) }),
        el('span', { class: 'nota nota-piccola', testo: p.perche }),
      ]),
    ]));
  }
  box.appendChild(listaPremi);
  return box;
}

/* ---------- schermate ---------- */

// LA RIGA DELLE PILLOLE (22/10/2026).
//
// Ste ha mandato la foto: in alto, una riga sola con il cerchietto con le
// iniziali, la streak, l'Aura e il livello. "in alto invece inserisci anche
// queste che in questo modo è più carino".
//
// Sono le stesse informazioni delle schede grandi che stanno più in basso
// (la streak, l'Aura e il livello), ma compatte: si vedono subito e non
// costringono a scorrere. Le icone sono emoji perché sono le stesse che
// usa già l'app.
function rigaPillole(st, profilo) {
  const iniziali = String((profilo && profilo.username) || '??').slice(0, 2).toUpperCase();
  return el('div', { class: 'riga-pillole' }, [
    el('span', { class: 'pallone-classe', testo: iniziali }),
    el('span', { class: 'pillola pillola-streak', testo: '\u{1F525} ' + st.fuoco.giorni }),
    el('span', { class: 'pillola pillola-aura', testo: '\u2728 ' + formattaAura(st.aura) }),
    el('span', { class: 'pillola pillola-livello', testo: '\u2B21 ' + st.livello.livello }),
  ]);
}

function vistaCasa(zona) {
  const st = statoMio();
  const profilo = profiloAttivo();
  zona.appendChild(rigaPillole(st, profilo));
  zona.appendChild(el('div', { class: 'riga-titoli' }, [
    el('h1', { testo: 'Casa' }),
    el('span', { class: 'conteggio', testo: `${profilo.username} · livello account ${st.livello.livello}` }),
  ]));

  // --- riepilogo: fuoco, aura, livello, rank principale ---
  const riepilogo = el('div', { class: 'riga-teschio' }, [
    teschioStreak(st),
    teschioAura(st),
    el('div', { class: 'teschio-rank' }, [
      el('span', { class: 'simbolo', testo: 'RANK' }),
      st.rankPrincipale
        ? badgeRank(st.rankPrincipale.rankId, st.rankPrincipale.lp, st.rankPrincipale.divisione)
        : el('strong', { testo: '—' }),
      el('span', { class: 'nota', testo: st.rankPrincipale && st.rankPrincipale.esercizio
        ? st.rankPrincipale.esercizio.nome : 'nessun record ancora' }),
    ]),
  ]);
  zona.appendChild(riepilogo);
  zona.appendChild(el('div', { class: 'blocco-progresso-livello' }, [
    barraProgresso(st.livello.progresso, `account: livello ${st.livello.livello} → ${st.livello.livello + 1}`),
    el('span', { class: 'nota', testo: `mancano ${formattaNumero(st.livello.mancano)} XP al livello account ${st.livello.livello + 1}` }),
  ]));

  // --- ultimo allenamento ---
  const finite = seduteMie().filter((s) => s && !s.eliminata && s.stato === 'completata')
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const ultimo = finite[0] || null;
  zona.appendChild(el('section', { class: 'blocco' }, [
    el('h2', { testo: 'Ultimo allenamento' }),
    ultimo
      ? el('div', {}, [
        el('p', { class: 'nota', testo: `${ultimo.nome_giorno || 'Allenamento'} del ${dataLeggibile(ultimo.data)} · ${formattaDurata(ultimo.durata_secondi || 0)}` }),
        el('a', { href: '#/storico/' + ultimo.id, class: 'bottone-guarda', testo: 'Rivedi la seduta' }),
      ])
      : el('p', { class: 'nota', testo: 'Non hai ancora finito un allenamento. La streak parte dal primo.' }),
  ]));

  // --- daily mission ---
  zona.appendChild(el('h2', { testo: 'Daily Mission' }));
  zona.appendChild(el('p', { class: 'nota', testo: 'Una missione al giorno, diversa per ciascuno. Si completa una volta sola.' }));
  zona.appendChild(tesseraMissione(st.missioni.daily));

  // --- weekly ---
  zona.appendChild(el('h2', { testo: `Weekly Missions · ${st.settimana}` }));
  zona.appendChild(el('p', { class: 'nota', testo: 'Diverse per ciascuno, e cambiano ogni settimana. Nessuna sfida ti viene riproposta.' }));
  for (const voce of st.missioni.weekly) zona.appendChild(tesseraMissione(voce));

  // --- record settimanale riscattabile: un solo premio per settimana ---
  const inizioSettimanaRecord = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const giorno = d.getDay() || 7;
    d.setDate(d.getDate() - giorno + 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })();
  // Verifica il record confrontando la miglior serie valida di questa settimana
  // con tutte quelle precedenti. Non dipende dal premio "record" storico, che per
  // design viene registrato una sola volta per esercizio.
  const seduteCompletatePerRecord = seduteMie().filter((s) => s && !s.eliminata && s.stato === 'completata');
  const giornoSedutaRecord = new Map(seduteCompletatePerRecord.map((s) => [s.id, String(s.data || '').slice(0, 10)]));
  const serieCompletatePerRecord = serieMie().filter((s) => s && !s.eliminata && eFatta(s) && giornoSedutaRecord.has(s.seduta_id));
  const eserciziAllenatiQuestaSettimana = new Set(serieCompletatePerRecord
    .filter((s) => (giornoSedutaRecord.get(s.seduta_id) || '') >= inizioSettimanaRecord)
    .map((s) => s.esercizio_id));
  const recordDellaSettimana = [];
  for (const esercizioId of eserciziAllenatiQuestaSettimana) {
    const esercizio = esercizioPerId(esercizioId);
    if (!esercizio) continue;
    const tutteSerieEsercizio = serieCompletatePerRecord.filter((s) => s.esercizio_id === esercizioId);
    const serieQuestaSettimana = tutteSerieEsercizio.filter((s) => (giornoSedutaRecord.get(s.seduta_id) || '') >= inizioSettimanaRecord);
    const seriePrecedenti = tutteSerieEsercizio.filter((s) => (giornoSedutaRecord.get(s.seduta_id) || '') < inizioSettimanaRecord);
    const migliorSettimana = recordEsercizio(serieQuestaSettimana, esercizio, null, pesoCorporeoOra());
    const migliorPrecedente = recordEsercizio(seriePrecedenti, esercizio, null, pesoCorporeoOra());
    if (migliorSettimana && migliorSettimana.valido
      && (!migliorPrecedente || !migliorPrecedente.valido
        || Number(migliorSettimana.punteggio) > Number(migliorPrecedente.punteggio))) {
      recordDellaSettimana.push({ esercizioId, nome: esercizio.nome, punteggio: migliorSettimana.punteggio });
    }
  }
  const chiaveRiscattoRecord = 'record-settimanale:' + accountAttivo() + ':' + st.settimana;
  const premioRecordGiaRiscattato = ricompenseMie().some((r) => r && r.id === chiaveRiscattoRecord);
  const sfidaRecord = el('section', { class: 'blocco sfida-record-settimanale' }, [
    el('div', { class: 'sfida-record-kicker', testo: 'SFIDA SETTIMANALE' }),
    el('h2', { testo: 'Supera un tuo record' }),
    el('p', { class: 'nota', testo: 'Migliora il tuo record personale in almeno un esercizio questa settimana. Quando il nuovo record viene registrato, puoi riscattare il premio una sola volta.' }),
    el('div', { class: 'sfida-record-premio' }, [
      el('span', { testo: '✦ +250 Aura' }),
      el('span', { testo: '⚡ +150 XP' }),
    ]),
  ]);
  if (premioRecordGiaRiscattato) {
    sfidaRecord.appendChild(el('span', { class: 'tag-fatto', testo: 'PREMIO RISCATTATO QUESTA SETTIMANA' }));
  } else if (recordDellaSettimana.length) {
    sfidaRecord.appendChild(el('p', { class: 'nota', testo: 'Record nuovi registrati: ' + recordDellaSettimana.length }));
    sfidaRecord.appendChild(bottone('Riscatta premio settimanale', { classe: 'principale', onClick: async () => {
      if (ricompenseMie().some((r) => r && r.id === chiaveRiscattoRecord)) return;
      const premio = { id: chiaveRiscattoRecord, account_id: accountAttivo(), tipo: 'record_settimanale_riscattato', fonte: st.settimana, aura: 250, xp: 150, descrizione: 'Sfida settimanale: record personale', quando: adesso() };
      try {
        await db.salva('ricompense', premio);
        await ricaricaTutto();
        avviso('Premio riscattato: +250 Aura e +150 XP!', { tipo: 'ok', durata: 6000 });
        disegna();
      } catch (err) {
        avviso('Non sono riuscito a riscattare il premio. Riprova con internet attivo.', { tipo: 'errore' });
      }
    }}));
  } else {
    sfidaRecord.appendChild(el('p', { class: 'nota', testo: 'Non hai ancora battuto un record questa settimana. Il premio si sblocca quando registri un nuovo record.' }));
  }
  zona.appendChild(sfidaRecord);

  // --- secret ---
  zona.appendChild(el('h2', { testo: 'Secret Missions' }));
  zona.appendChild(el('p', { class: 'nota', testo: 'Coperti finche\' non li riveli. Valgono di piu\'.' }));
  for (const voce of st.missioni.secret) zona.appendChild(tesseraMissione(voce));

  // --- cronologia delle sfide fatte ---
  // Ste l'ha chiesto: comÈ che si fa a vedere tutte le sfide che hai
  // finito? Prima i dati c'erano (st.storicoMissioni) ma non erano mostrati.
  const finiteSfide = (st.storicoMissioni || []).filter((v) => v && v.missione);
  zona.appendChild(el('section', { class: 'blocco' }, [
    el('h2', { testo: 'Cronologia sfide' }),
    finiteSfide.length
      ? el('p', { class: 'nota', testo: `${finiteSfide.length} sfide fatte in tutto.` })
      : el('p', { class: 'nota', testo: 'Qui vedrai tutte le sfide che finisci, giorno per giorno.' }),
  ]));
  if (finiteSfide.length) {
    const listaCronologia = el('div', { class: 'cronologia-sfide' });
    let quanti = 10;
    const disegnaCronologia = () => {
      // uso svuota() e non replaceChildren(): replaceChildren non esiste nel
      // DOM finto dei test e faceva esplodere l'app intera
      svuota(listaCronologia);
      for (const voce of finiteSfide.slice(0, quanti)) listaCronologia.appendChild(rigaCronologiaMissione(voce));
      if (finiteSfide.length > quanti) {
        listaCronologia.appendChild(bottone(`Vedi tutte (${finiteSfide.length})`, {
          onClick: () => { quanti = finiteSfide.length; disegnaCronologia(); },
          classe: 'fantasma',
        }));
      }
    };
    disegnaCronologia();
    zona.appendChild(listaCronologia);
  }

  // --- dove mettere il peso corporeo ---
  // Ste: "dove si mette il peso?". Il peso sta già nel Profilo, ma non si
  // capiva. Qui lo dico con parole chiare e ci metto il link per andarlo a
  // mettere, così si trova in due secondi.
  const pesoOra = pesoCorporeoOra();
  zona.appendChild(el('section', { class: 'blocco' }, [
    el('h2', { testo: 'Il tuo peso corporeo' }),
    el('p', { class: 'nota', testo: pesoOra
      ? 'Il Rank usa il tuo peso per capire quanto sei forte davvero, non solo i kg che sollevi. Vuoi cambiarlo?'
      : 'Il Rank usa il tuo peso per capire quanto sei forte davvero, non solo i kg che sollevi. Non l\'hai ancora messo.' }),
    el('a', { href: '#/profilo', class: 'bottone-guarda', testo: pesoOra
      ? `Vai nel Profilo (ora ${formattaNumero(pesoOra)} kg)`
      : 'Metti il peso nel Profilo' }),
  ]));

  // --- scorciatoie verso quello che c\'era già ---
  // Ste (07/10/2026): "andare a trovare lo storico è un'impresa". Lo storico
  // adesso è anche nella barra in basso, ma queste scorciatoie restano: qui si
  // arriva senza sapere dov'è la barra, e dalla barra non si vede tutto quello
  // che c'è. Amici è qui per lo stesso motivo: dalla barra non c'è più, e senza
  // questo link la lista amici diventerebbe irraggiungibile.
  zona.appendChild(el('h2', { testo: 'Allenamento e storico' }));
  zona.appendChild(el('div', { class: 'riga-pulsanti' }, [
    el('a', { href: '#/', class: 'bot fantasma', testo: 'Allenamento' }),
    el('a', { href: '#/storico', class: 'bot fantasma', testo: 'Storico' }),
    el('a', { href: '#/progressi', class: 'bot fantasma', testo: 'Progressi' }),
    el('a', { href: '#/amici', class: 'bot fantasma', testo: 'Amici' }),
    el('a', { href: '#/impostazioni', class: 'bot fantasma', testo: 'Impostazioni' }),
  ]));

  // --- solo per l'amministratore ---
  if (profilo.amministratore) {
    zona.appendChild(el('section', { class: 'bloco' }, [
      el('h2', { testo: 'Amministratore' }),
      el('p', { class: 'nota', testo: 'Gli esercizi che crei qui sono globali: valgono per tutti gli account, non solo per il tuo.' }),
      bottone('+ CREA ESERCIZIO', { onClick: () => finestraCreaEsercizio(), classe: 'principale grande' }),
    ]));
  }
}

/** Come si chiama ogni tipo di sfida, in italiano semplice. */
const ETICHETTE_CATEGORIA = {
  daily: 'Daily',
  weekly: 'Settimanale',
  secret: 'Segreta',
};

/**
 * Una riga della cronologia sfide: quando l'hai fatta, quale, quanto ti ha
 * dato di Aura e quanto era difficile.
 */
function rigaCronologiaMissione(voce) {
  const d = voce.missione.difficolta;
  const quando = voce.quando ? String(voce.quando) : '';
  const giorno = quando.slice(0, 10);
  return el('div', { class: 'riga-cronologia' }, [
    el('span', { class: 'tag-difficolta piccolo', style: `--diff:${d.colore}`, testo: d.nome }),
    el('div', { class: 'riga-cronologia-alto' }, [
      el('strong', { testo: voce.titolo }),
      el('span', { class: 'nota', testo: `${dataLeggibile(giorno)} · ${ETICHETTE_CATEGORIA[voce.categoria] || voce.categoria}` }),
    ]),
    el('span', { class: 'aura-premio piccolo', testo: '+' + formattaNumero(voce.aura) }),
  ]);
}

function tesseraMissione(voce) {
  if (!voce) return el('p', { class: 'nota', testo: 'Missione non disponibile.' });
  const d = voce.ricompensa.difficolta;
  const secretCoverta = voce.segreta && !voce.rivelata;
  const box = el('div', { class: 'tessera-missione' + (voce.completata ? ' fatta' : '') + (secretCoverta ? ' coperta' : '') });
  box.appendChild(el('div', { class: 'missione-alto' }, [
    el('span', { class: 'tag-difficolta', style: `--diff:${d.colore}`, testo: d.nome }),
    el('strong', { testo: secretCoverta ? 'SECRET MISSION' : voce.missione.titolo }),
    el('span', { class: 'aura-premio', testo: '+' + voce.ricompensa.aura + ' AURA' }),
  ]));
  box.appendChild(el('p', {
    class: 'missione-testo',
    testo: secretCoverta
      ? 'Questa missione richiede coraggio.'
      : voce.missione.testo,
  }));
  if (secretCoverta && !voce.completata) {
    box.appendChild(bottone('[ REVEAL ]', { onClick: () => rivelaMissione(voce), classe: 'fantasma' }));
  } else if (voce.completata) {
    box.appendChild(el('span', { class: 'tag-fatto', testo: 'COMPLETATA' }));
  } else {
    box.appendChild(bottone('L\'ho fatta', { onClick: () => completaMissione(voce), classe: 'principale' }));
  }
  return box;
}

function vistaRank(zona) {
  const st = statoMio();
  zona.appendChild(el('h1', { testo: 'Rank' }));
  const contenitore = el('div');
  zona.appendChild(contenitore);
  let scheda = 'miei';

  const bottoni = el('div', { class: 'chip-scelte' });
  const voci = [
    ['miei', 'MY RANKS'],
    ['classifica', 'LEADERBOARD'],
    ['amici', 'FRIENDS'],
    ['prova', 'PROVA UN ESERCIZIO'],
  ];
  for (const [k, t] of voci) {
    bottoni.appendChild(bottone(t, {
      onClick: (ev) => {
        scheda = k;
        for (const b of bottoni.children) b.classList.remove('attivo');
        ev.currentTarget.classList.add('attivo');
        disegnaSezione();
      },
      classe: 'chip' + (k === scheda ? ' attivo' : ''),
    }));
  }
  zona.appendChild(bottoni);

  function disegnaSezione() {
    svuota(contenitore);
    if (scheda === 'miei') sezioneMieiRank(st);
    else if (scheda === 'classifica') sezioneClassifica(st);
    else if (scheda === 'prova') sezioneProvaRank(st);
    else sezioneConfronto(st);
  }


  /**
   * PROVA UN ESERCIZIO E VEDI IL RANK (Ste, 21/10/2026)
   *
   * "aggiungi anche un opzione per cercare un esercizio in cui metto un esercizio il
   * peso le rep e il mio peso corporeo e mi dice il rank senza bisogno di averlo per
   * forza nella scheda"
   *
   * Cerchi l'esercizio, metti il peso e le ripetizioni, e l'app ti dice che Rank
   * avresti. Serve per capire se un esercizio che hai visto da un altro ti conviene,
   * PRIMA di metterlo in schedina.
   *
   * Il Rank e' quello vero: si chiama la stessa funzione che usa la schermata dei Rank
   * (recordEsercizio), quindi la risposta e' identica a quella che vedresti allenandoti.
   */
  function sezioneProvaRank(stato) {
    contenitore.appendChild(el('p', {
      class: 'nota',
      testo: 'Cerca un esercizio, metti il peso e le ripetizioni, e l\'app ti dice che Rank '
        + 'avresti, senza doverlo mettere nella scheda. Il peso corporeo e\' il tuo: '
        + 'cambialo se ti sei pesato di nuovo.',
    }));

    // LA RICERCA (Ste, 21/10/2026)
    //
    // "quando scrivo le scelte non devono apparire li ma è come una barra di ricerca:
    // se scrivo la s spuntano quelli che iniziano con la s, se dopo la s scrivo t mi
    // spuntano quelli che iniziano con st"
    //
    // Quindi niente l'elenco del browser (quello che spuntava sotto, con la barretta
    // "Inserisci info"): qui sotto c’è una lista mia, che si accorcia mentre scrivi.
    const cerca = el('input', {
      type: 'text', class: 'campo-testo',
      placeholder: 'Cerca l\'esercizio (per nome)...', autocomplete: 'off',
    });
    const scelte = el('div', { class: 'lista-scelte-suggerite' });
    contenitore.appendChild(el('div', { class: 'riga-campo' }, [cerca]));
    contenitore.appendChild(scelte);

    // I CAMPI: con l'etichetta VISTA (il peso, le ripetizioni, il peso corporeo)
    const pesoCampo = campoNumero(null, { etichetta: 'PESO', onCambio: () => { } });
    const repCampo = campoNumero(null, { etichetta: 'REPS', onCambio: () => { } });
    const corpCampo = campoNumero(pesoCorporeoOra() || 66, { etichetta: 'PESO CORPOREO', onCambio: () => { } });
    const campo = (nodo, etichetta) => el('div', { class: 'campo-prova' }, [
      nodo, el('span', { class: 'etichetta-prova', testo: etichetta }),
    ]);
    contenitore.appendChild(el('div', { class: 'riga-campi-prova' }, [
      campo(pesoCampo, 'KG'), campo(repCampo, 'REPS'), campo(corpCampo, 'PESO CORPOREO'),
    ]));

    const esito = el('div');
    contenitore.appendChild(esito);

    let scelto = null;
    const disegnaScelte = () => {
      svuota(scelte);
      const testo = (cerca.value || '').trim().toLowerCase();
      const nomi = (V.esercizi || []).map((e) => e.nome);
      // comincia per quello che scrivi: se scrivi "st", spuntano quelli che iniziano con "st"
      // e se non hai scritto niente non spunta NESSUN esercizio (Ste, 21/10/2026)
      const trovati = testo
        ? nomi.filter((n) => n.toLowerCase().startsWith(testo))
        : [];
      if (testo && !trovati.length) {
        scelte.appendChild(el('p', { class: 'nota', testo: 'Nessun esercizio comincia cosi.' }));
        return;
      }
      if (!testo) return;
      for (const n of trovati.slice(0, 12)) {
        scelte.appendChild(bottone(n, {
          onClick: () => {
            cerca.value = n;
            scelto = (V.esercizi || []).find((x) => x.nome === n) || null;
            svuota(scelte);
          },
          classe: 'voce-scelta voce-suggerita',
        }));
      }
    };
    cerca.addEventListener('input', () => { scelto = null; disegnaScelte(); });
    disegnaScelte();

    // IL RANK A TUTTO SCHERMO (Ste, 21/10/2026)
    //
    // "quando faccio calcola il rank deve farmi un animazione bella e farmi spunta il
    // rank a tutto schermo"
    const calcola = () => {
      svuota(esito);
      const e = scelto
        || (V.esercizi || []).find((x) => x.nome.toLowerCase() === (cerca.value || '').trim().toLowerCase());
      if (!e) {
        esito.appendChild(el('p', { class: 'nota', testo: 'Scegli un esercizio dall\'elenco.' }));
        return;
      }
      const peso = Number(pesoCampo.value);
      const rip = Number(repCampo.value);
      const corp = Number(corpCampo.value);
      if (!(peso > 0) || !(rip > 0)) {
        esito.appendChild(el('p', { class: 'nota', testo: 'Metti il peso e le ripetizioni.' }));
        return;
      }
      const serie = [{ peso, ripetizioni: rip, stato: 'fatta', ordine: 1 }];
      const record = recordEsercizio(serie, e, null, corp > 0 ? corp : null);
      const rango = record && record.rank ? record.rank : null;
      const divisione = record && record.divisione ? record.divisione : null;
      const kgReali = record && record.caricoReale !== null && record.caricoReale !== undefined
        ? record.caricoReale : peso;
      // IL PUNTEGGIO DI FORZA (22/10/2026): la serie vera divisa per il peso
      // corporeo elevato a 0,67. Il Rank non passa pi\u00f9 da un massimale
      // stimato: contano i kg e le ripetizioni che hai fatto davvero.
      //
      // IL NUMERO VIENE DAL MOTORE, non da qui: rank-v3 conta il corpo nei dip
      // e nelle trazioni e applica la curva delle ripetizioni. Prima questa riga
      // si calcolava da sola, con la formula scritta a mano, e su un esercizio
      // col peso del corpo guardava i kg aggiunti invece del carico vero: era un
      // secondo calcolo del numero, e la regola del progetto e' che il numero ha
      // UN posto solo.
      const corpPerForza = (record && record.pesoCorporeo) || (corp > 0 ? corp : null);
      const forzaRelativa = record && record.forzaRelativa !== undefined && record.forzaRelativa !== null
        ? record.forzaRelativa
        : null;
      const testo = [
          forzaRelativa !== null
            ? 'forza relativa ' + (Math.round(forzaRelativa * 10) / 10)
              + ' (' + kgReali + ' kg x ' + rip + ' rip su ' + corpPerForza + ' kg^0,67)'
            : '',
        e.nome,
        peso + ' kg x ' + rip + (corp > 0 ? ' | peso corporeo ' + corp + ' kg' : ''),
        rango ? rango.nome + (divisione ? ' ' + divisione.nome : '') : (record && record.motivo ? record.motivo : 'Non valutabile'),
        record && record.lp ? 'LP: ' + Math.round(record.lp) : '',
        kgReali !== peso ? 'il peso che conta è ' + kgReali + ' kg' : '',
        record && record.testo ? record.testo : '',
        record && record.sogliaAttuale !== undefined && record.sogliaSuccessiva
          ? 'la prossima soglia è a ' + record.sogliaSuccessiva + ' kg' : '',
      ].filter(Boolean);

      // il pannello a tutto schermo, con l’animazione che c’è già per i dialoghi
      const sfondo = el('div', { class: 'sfondo-prova' });
      const pannello = el('div', { class: 'pannello-prova' }, [
        el('div', { class: 'pannello-prova-titolo', testo: rango ? rango.nome + (divisione ? ' ' + divisione.nome : '') : 'Non valutabile' }),
        ...testo.slice(1).map((t) => el('p', { class: 'nota', testo: t })),
        bottone('Chiudi', { onClick: () => sfondo.remove(), classe: 'principale grande' }),
      ]);
      sfondo.appendChild(pannello);
      sfondo.addEventListener('click', (ev) => { if (ev.target === sfondo) sfondo.remove(); });
      document.body.appendChild(sfondo);
    };
    contenitore.appendChild(el('div', { class: 'riga-pulsanti' }, [
      bottone('Calcola il Rank', { onClick: calcola, classe: 'principale' }),
    ]));
  }

  function sezioneMieiRank(stato) {
    contenitore.appendChild(el('p', { class: 'nota', testo: 'Il rank di ogni esercizio e\' tuo e basta: le soglie sono diverse per ogni esercizio, quindi 50 kg di una cosa non valgono 50 kg di un\'altra.' }));
    // LE SERIE DI UNA SEDUTA APERTA NON CONTANO NEI RANK, E ADESSO LO DICE (16/10/2026).
  //
  // Ste, sui dip: "di dip ho fatto 40 kg, ho aggiornato oggi, ma non spuntano
  // aggiornati nei rank, anche gli altri esercizi". Il calcolo era giusto: 40 kg di
  // zavorri più il suo corpo a 8 ripetizioni davano OLYMPIAN 10 LP. Il problema è
  // che la pagina glielo nascondeva.
  //
  // IL DIFETTO: la spiegazione ("Hai un allenamento APERTO, le serie contano solo
  // quando finisci la seduta") stava dentro `if (!stato.record.length)`, cioè compariva
  // SOLO se non avevi nessun Rank. Chi ha già dei Rank da altri esercizi non vedeva
  // nulla: la lista restava quella vecchia e sembrava che l'app ignorasse il peso.
  //
  // La regola è giusta e si tiene: le serie contano solo da seduta `completata`
  // (`gruppiDaSerie` filtra, e filmano anche i Rank personali che la classifica degli
  // amici: è la stessa cosa, quindi non è un bug di calcolo). Quello che mancava
  // era l'avviso.
  //
  // Nota: qui si vede anche perché il difetto era invisibile. I dip hanno `movimento`
  // undefined e passano dal motore vecchio, quindi hanno nomi di campo diversi
  // (`soglie`, `score`, `caricoReale` non ci sono): ma il Rank lo calcola lo stesso e
  // qui sotto si vede solo il risultato.
  const aperta = seduteMie().find((s) => s && !s.eliminata && s.stato !== 'completata');
  if (aperta) {
    const serieAperte = (V.serie || []).filter((x) => x && !x.eliminata && x.seduta_id === aperta.id);
    const box = el('div', { class: 'tape tape-viola' });
    box.appendChild(el('span', { testo: serieAperte.length
      ? `Hai un allenamento APERTO (${aperta.nome_giorno || 'in corso'}) con ${serieAperte.length} serie scritte: non contano ancora nei Rank.`
      : `Hai un allenamento APERTO (${aperta.nome_giorno || 'in corso'}). I Rank si aggiornano quando lo finisci.` }));
    box.appendChild(bottone('Vai e chiudilo', { onClick: () => vai('/seduta/' + aperta.id), classe: 'principale' }));
    contenitore.appendChild(box);
  }

  if (!stato.record.length) {
      // Ste: "non ho capito perchÈ non spunta niente se ho già messo il mio
      // peso". Il peso NON c'entra: un rank compare solo quando la seduta È
      // stata CHIUSA. Prima era scritto solo "chiudi un allenamento", che non
      // diceva che il peso È già salvato e che quindi il problema È un
      // altro. Ora lo spiego per bene e dico subito cosa fare.
      const finite = seduteMie().filter((s) => s && !s.eliminata && s.stato === 'completata').length;
      const peso = pesoCorporeoOra();

      const box = el('div', { class: 'blocco' });
      if (aperta) {
        box.appendChild(el('p', { class: 'nota', testo: `Hai un allenamento APERTO (${aperta.nome_giorno || 'in corso'}). Le serie contano solo quando finisci la seduta con "Allenamento finito".` }));
        box.appendChild(el('a', { href: '#/', class: 'bottone-guarda', testo: 'Vai e chiudi l\'allenamento' }));
      } else if (finite > 0) {
        box.appendChild(el('p', { class: 'nota', testo: `Hai ${finite} allenamenti finiti, ma nessuna serie valida. Probabilmente le serie sono fatte col solo spotter: quelle non contano come record, perché non è una prestazione tua.` }));
        box.appendChild(el('a', { href: '#/storico', class: 'bottone-guarda', testo: 'Controlla lo storico' }));
      } else {
        box.appendChild(el('p', { class: 'nota', testo: 'Non hai ancora finito un allenamento. Appena ne finisci uno, i rank di ogni esercizio spuntano qui.' }));
        box.appendChild(el('a', { href: '#/', class: 'bottone-guarda', testo: 'Inizia ad allenarti' }));
      }

      // Il peso corporeo: confermiamo che l\'ha già messo, cos\'e\' non
      // continua a pensare che il Rank dipenda da quello.
      box.appendChild(el('p', { class: 'nota nota-chiaro', testo: peso
        ? `Il tuo peso corporeo e\' gia\' salvato (${formattaNumero(peso)} kg) e\' gia\' usato per i Rank: non e\' quello che manca.`
        : 'Il peso corporeo non l\'hai ancora messo nel Profilo, ma non e\' quello che manca: i Rank funzionano anche senza.' }));
      contenitore.appendChild(box);
      return;
    }
    for (const r of stato.record) contenitore.appendChild(cardRank(r, { compatta: true }));
  }

  function sezioneClassifica(stato) {
    contenitore.appendChild(el('p', { class: 'nota', testo: 'Una classifica per esercizio: si confrontano SOLO numeri dello stesso esercizio, mai pesi di muscoli diversi.' }));
    const classifiche = classifichePerEsercizio(vociConClassificaPubblica(), V.esercizi);
    if (!classifiche.length) {
      contenitore.appendChild(el('p', { class: 'nota', testo: 'Nessuna classifica ancora: servono almeno due account con un record sullo stesso esercizio.' }));
      return;
    }
    let selezionato = classifiche[0].esercizio_id;
    const lista = el('div');
    const selettore = el('select', { class: 'selettore' },
      classifiche.map((c) => el('option', { value: c.esercizio_id, testo: c.esercizio.nome })));
    selettore.addEventListener('change', () => { selezionato = selettore.value; disegnaLista(); });
    contenitore.appendChild(el('label', { class: 'nota', testo: 'Esercizio' }));
    contenitore.appendChild(selettore);
    contenitore.appendChild(lista);

    function disegnaLista() {
      svuota(lista);
      const c = classifiche.find((x) => x.esercizio_id === selezionato);
      if (!c) return;
      const profilo = profiloEsercizio(c.esercizio);
      const ordinata = classificaEsercizio(
        c.voci.map((v) => ({ ...v, punteggioCalcolato: v.punteggio, testo: v.testo })),
        profilo,
      );
      const privata = ordinata.filter((v) => {
        const profiloAltro = (vociPerClassifica().find((x) => x.account === v.account) || {}).profilo;
        return !profiloAltro || privacyDi(profiloAltro).leaderboard === 'pubblico';
      });
      if (!privata.length) {
        lista.appendChild(el('p', { class: 'nota', testo: 'Nessuno ha reso pubblica la classifica di questo esercizio.' }));
        return;
      }
      for (const v of privata) {
        const mio = v.account === accountAttivo();
        lista.appendChild(el('div', { class: 'riga-classifica' + (mio ? ' mia' : '') }, [
          el('span', { class: 'posizione', testo: v.posizione + '.' }),
          el('div', { class: 'cresci' }, [
            el('strong', { testo: v.username + (mio ? ' (tu)' : '') }),
            el('span', { class: 'nota', testo: v.testo }),
          ]),
          badgeRank(v.rankId, v.lp, v.divisione),
        ]));
      }
    }
    disegnaLista();
  }

  function sezioneConfronto(stato) {
    contenitore.appendChild(el('p', { class: 'nota', testo: 'Il tuo conto con quello degli amici, esercizio per esercizio.' }));
    const amici = amiciDi(profiloAttivo(), vociPerClassifica().map((v) => ({ ...v.profilo, id: v.account })));
    if (!amici.length) {
      contenitore.appendChild(el('p', { class: 'nota', testo: 'Non hai ancora amici. Vai su Amici per aggiungerne.' }));
      return;
    }
    for (const a of amici) {
      contenitore.appendChild(el('a', { href: '#/amico/' + a.id, class: 'riga-amico' }, [
        avatarNodo(a),
        el('div', { class: 'cresci' }, [
          el('strong', { testo: a.username }),
          el('span', { class: 'nota', testo: 'Confronta i miei rank con i suoi' }),
        ]),
      ]));
    }
  }

  disegnaSezione();
}

async function vistaEsercizio(zona, esercizioId) {
  const e = esercizioPerId(esercizioId);
  if (!e) { zona.appendChild(el('p', { testo: 'Esercizio non trovato.' })); return; }
  // LE SERIE SONO DI CHI STA USANDO L'APP, NON DI TUTTI.
  //
  // Qui si leggeva `V.serie` grezzo, cioè le serie di TUTTE le persone sul
  // dispositivo. Tutte le altre schermate usano `serieDellaPersona()`: questa era
  // l'unica che leggeva la tabella intera.
  //
  // Il danno è silenzioso e quindi il peggiore: tu fai chest press 40 kg × 8 e
  // Andrea 65 kg × 8 sullo stesso esercizio; aprendo "il suo Rank" vedevi il record
  // di Andrea, con le sue LP e la sua fascia, e l'avviso sul peso corporeo era
  // calcolato sulla prestazione di Andrea. Numeri giusti, ma non tuoi.
  const serie = serieDellaPersona().filter((x) => x && !x.eliminata && x.esercizio_id === e.id);
  // il peso corporeo di adesso serve per le prestazioni che non hanno ancora
  // un peso salvato dentro; quelle vecchie mantengono il loro
  const pesoOggi = pesoCorporeoOra();
  const record = recordEsercizio(serie, e, null, pesoOggi);
  const profilo = record.profilo || profiloEsercizio(e);

  zona.appendChild(el('a', { href: '#/rank', class: 'indietro', testo: 'Torna ai Rank' }));
  zona.appendChild(el('h1', { testo: e.nome }));

  // COME È DIFFICILE questo esercizio. Ste: "aggiungi un qualcosa che
  // identifica se l'esercizio È facile o difficile". Il numero da solo non
  // dice niente: 12 kg su un isolamento sono tanti, su un leg press sono niente.
  zona.appendChild(el('div', { class: 'riga-livello' }, [
    el('span', { class: 'tag-livello liv-' + (profilo.livello || 'composto'), testo: descrizioneLivello(profilo.livello) }),
  ]));

  // QUALE PEZZO DI MUSCOLO. Ste: "il petto come il bicipite e le altre parti
  // sono formati da diverse fibre muscolari e ci sono esercizi che servono
  // per la parte alta e altri per la parte bassa del petto".
  //
  // (Con un aggiustamento: non sono fibre diverse ma capi diversi dello stesso
  // muscolo. Infatti qui sotto cÈ l'avvertimento, che spiega la cosa come si
  // sta davvero invece di dirgli una cosa che non È vera.)
  const parte = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
  if (parte.trovata) {
    // L'OMINO. Ste (13/10/2026): "voglio che spunti questo omino con il muscolo
    // allenato colorato di viola se possibile, non di giallo".
    //
    // Sta SOPRA la riga "DOVE LAVORA", non dopo: prima l'immagine, poi le
    // parole. E si accende solo il pezzo che quell'esercizio lavora, perché
    // un omino tutto acceso non dice niente.
    zona.appendChild(el('div', { class: 'riga-omino' }, [
      el('div', { class: 'omino' }, [
        el('div', { class: 'omino-immagine', html: disegnoOmino(parte.parte, parte.livelli, parte.anatomia) }),
        el('div', { class: 'omino-comandi' }, [
          bottone('⤢ Ingrandisci fronte e retro', {
            classe: 'fantasma',
            onClick: () => apriOminoZoom(parte.parte, parte.livelli, parte.anatomia),
          }),
        ]),
        el('div', { class: 'omino-legenda', 'aria-label': 'Legenda dei muscoli evidenziati' }, [
          el('span', {}, [el('i', { class: 'omino-punto principale', 'aria-hidden': 'true' }), 'Principale']),
          el('span', {}, [el('i', { class: 'omino-punto supporto', 'aria-hidden': 'true' }), 'Muscolo di supporto']),
        ]),
        el('div', { class: 'omino-credit' }, [
          'Disegno anatomico: ',
          el('a', { href: 'https://www.figma.com/community/file/1320468164820924031', target: '_blank', rel: 'noopener noreferrer' }, 'Ryan Graves'),
          ' · ',
          el('a', { href: 'https://creativecommons.org/licenses/by/4.0/', target: '_blank', rel: 'noopener noreferrer' }, 'CC BY 4.0'),
        ]),
      ]),
      el('div', { class: 'omino-didascalia' }, [
        el('span', { class: 'omino-sopratitolo', testo: 'MUSCOLO PRINCIPALE' }),
        el('strong', { testo: parte.nome }),
        el('span', { class: 'nota nota-piccola', testo: parte.nota }),
      ]),
    ]));

    zona.appendChild(el('div', { class: 'riga-giudizio giud-parte' }, [
      el('strong', { testo: 'DOVE LAVORA' }),
      el('span', { testo: parte.nome }),
      el('span', { class: 'nota nota-piccola', testo: parte.nota }),
      el('span', { class: 'nota nota-piccola', testo: AVVERTIMENTO_PARTI }),
    ]));

    // I muscoli che stanno accanto. Ste (15/10/2026): "i dips non fanno anche
    // tricipiti?". Sulla figura sono accesi e più chiari, ma anche scritti:
    // altrimenti si vede il viola e non si capisce perché.
    if (parte.anche && parte.anche.length) {
      zona.appendChild(el('div', { class: 'riga-giudizio giud-parte' }, [
        el('strong', { testo: 'LAVORA ANCHE' }),
        el('span', { testo: parte.anche.join(', ') }),
        el('span', { class: 'nota nota-piccola', testo: 'Accesi sulla figura ma più chiari: il pieno è solo il muscolo di sopra.' }),
      ]));
    }

    // Ste: "deve capire cosa lavora quell'esercizio e quindi capire se È
    // difficile o facile". Sapere il muscolo serve proprio a questo: un
    // carico bassissimo sul deltoide laterale È piu duro di uno medio sul
    // quadricipite, e senza saperlo l'app darebbe un giudizio sbagliato.
    const conMuscolo = livelloConMuscolo({
      nome: e.nome,
      descrizione: e.nota_permanente || '',
      livelloDalMovimento: riconosciEsercizio({ nome: e.nome }).livello,
    });
    zona.appendChild(el('div', { class: 'riga-giudizio giud-parte' }, [
      el('strong', { testo: 'PERCHE\' E\' DIFFICILE' }),
      el('span', { testo: conMuscolo.frase }),
    ]));
  }

  // Il peso corporeo non sposta più le soglie: entra nel punteggio (1RM / peso^0,67).
  // Quindi la riga deve dire che il punteggio e' rapportato al corpo, non che le
  // soglie cambiano, altrimenti sembra che il Rank sia tarato sul peso di oggi.
  const rigaSoglie = [ETICHETTE_MISURA[profilo.misura]];
  if (profilo.pesoConsiderato) {
    rigaSoglie.push(`prestazione rapportata al tuo peso: ${formattaNumero(profilo.pesoCorporeo)} kg`);
  } else if (profilo.misura === 'kg_reps' || profilo.misura === 'kg_tempo') {
    rigaSoglie.push('metti il tuo peso nel profilo: senza, il punteggio non tiene conto del tuo corpo');
  }
// LA RIGA MOSTRA LE SOGLIE CHE TI DANNO IL RANK, TRADOTTE IN PESI CHE SI CARICANO
  // (16/10/2026).
  //
  // Qui c'era un disaccordo grosso, e lo ha trovato Ste guardando il preacher curl
  // ("i pesi di 23,2 kg non esistono"). La riga usava `profilo.soglie`, che viene da
  // `profiloEsercizio` (la configurazione, la scala vecchia): sul suo corpo finiva
  // con OLYMPIAN a 24,2 kg. Il Rank invece lo dava `record.soglie`, che viene dal motore
  // `rank-v2` e finisce con OLYMPIAN a 33,3 kg. Leggere "PLATINUM da 17,9" e poi prendere
  // ORO non si spiega in nessun modo.
  //
  // E poi le soglie sono in PUNTEGGIO, non in kg. Il punteggio a 8 ripetizioni è
  // `kg x meccanica`, e la meccanica cambia da esercizio a esercizio; sui CAVI c’è di
  // più, perché la soglia è per lato mentre il peso registrato è quello del
  // carrello. Per questo NON si calcola il peso corrispondente: si chiede al motore che
  // punteggio dà ogni peso caricabile e si prende il primo che raggiunge la soglia. Il
  // numero è verificato, e quello che leggi è quello che il motore fa.
  const soglieDelMotore = Array.isArray(record.soglie) && record.soglie.length === RANK.length
    ? record.soglie
    : profilo.soglie;
  // il punteggio del motore VECCHIO: serve solo per il ripiego (gli esercizi che
  // il modello nuovo non sa valutare)
  const punteggioDi = (kg) => {
    const s = scoreSerie({ peso: kg, ripetizioni: 8, esercizio: e });
    return Number(s && s.score !== undefined ? s.score : s) || 0;
  };
  // LE SOGLIE LEGGIBILI VENGONO DAL MOTORE NUOVO (22/10/2026).
  //
  // Prima qui la traduzione la faceva `soglieLegibili` con `scoreSerie` del
  // motore VECCHIO: le soglie del record sono nel punteggio del modello nuovo
  // (1RM normalizzato) e il punteggio del motore vecchio era un'altra unita',
  // quindi i pesi che uscivano erano sbagliati. E' il caso che la stessa richiesta
  // segnala: "evita che rimangano vecchi calcoli in altre schermate".
  //
  // Ora la traduzione la fa il modello stesso: si chiede al motore che
  // punteggio da' ogni peso caricabile e si prende il primo che raggiunge la
  // soglia. Il numero e' verificato, e quello che leggi e' quello che il motore
  // fa.
  const soglieDaLeggere = (record.motore === 'nuovo' && record.cfg)
    ? soglieLegibiliNuove(soglieDelMotore, {
      esercizio: e,
      pesoCorporeo: record.pesoCorporeo || pesoCorporeoOra(),
      cfg: record.cfg,
      passo: passoCaricabile(e),
    })
    : soglieLegibili(soglieDelMotore, punteggioDi, passoCaricabile(e));
  // LE SOGLIE SI SCRIVONO COI PESI CHE HAI DAVVERO (Ste, 18/10/2026).
  //
  // Tre risposte in un giorno, e la terza è quella giusta: "vanno di 5kg in su, 5 10 15
  // 20 25 ecc" (la pila ha i dischi da 5), "il minimo di pesi che ho sono 1" (i dischi
  // da 1), "anche nei macchinari posso metterci sopra i pesi piccoli tipo 2kg 1kg 3kg o
  // anche 4kg".
  //
  // Un piatto da 1 sopra uno da 5 fa esistere quel numero: quindi 1 kg alla volta si
  // arriva su tutto, macchine comprese. Sotto i 50 kg vale la lista dei manubri.
  zona.appendChild(el('p', { class: 'nota', testo: `${rigaSoglie.join(' · ')}. Soglie: ${soglieDaLeggere.map((s, i) => `${RANK[i].nome} da ${formattaNumero(s)}`).join(' · ')}` }));

  // L'AVVISO DEL PESO. Ste (07/10/2026): "il peso corporeo È l'ultima cosa
  // fragile: È l'unico numero digitato a mano che muove tutti i Rank".
  //
  // Va qui, subito sotto la riga delle soglie, perchÈ È la stessa cosa: quelle
  // soglie sono state costruite con quel peso. E appare SOLO se il peso È vecchio:
  // se È fresco l'avviso sarebbe solo rumore, e decideslo lo fa serveAggiornare
  // (non un controllo nuovo fatto qui, vedi avviso-peso.js).
  const avvisoPeso = await avvisoPesoEsercizio({ serie, esercizio: e, account: accountAttivo() });
  if (avvisoPeso) {
    zona.appendChild(el('div', { class: 'box-avviso-peso' }, [
      ...avvisoPeso.righe.map((riga) => el('p', { class: 'nota nota-piccola', testo: riga })),
    ]));
  }

  // Ste: "deve capire ancora meglio i rank e le difficolta'". Ora il muscolo
  // entra nella soglia, e se non lo dico l'app ti chiede solo perchÈ la tua
  // soglia È più bassa di quanto ti aspettavi: la spiegazione cÈ, ma
  // invisibile. Peggio: sembrerebbe un errore.
  const spiegazione = rapportoDifficolta(e).spiegazione;
  if (spiegazione) {
    zona.appendChild(el('p', { class: 'nota nota-piccola', testo: `La soglia è più bassa perché ${spiegazione}.` }));
  }

  if (!record.valido) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Nessuna prestazione registrata su questo esercizio: ancora nessun rank.' }));
    return;
  }

  // QUANTO HO FATTO, in parole. Ste: "capisce se È tanto quello che fai o
  // poco". Il giudizio tiene conto anche del livello di difficolta'.
  //
  // IL GIUDIZIO ESCE DAL RECORD (22/10/2026): le sue soglie sono quelle del
  // motore che ha deciso il Rank, quindi il giudizio e il Rank non possono
  // dire cose diverse. Prima veniva calcolato con la scala del profilo (quella
  // vecchia) e il punteggio del motore: due unita' diverse.
  const giudizio = giudizioPerformanceRecord(record);
  if (giudizio.valido) {
    zona.appendChild(el('div', { class: 'riga-giudizio giud-' + giudizio.giudizio }, [
      el('strong', { testo: 'QUANTO HAI FATTO' }),
      el('span', { testo: giudizio.frase }),
    ]));
  }

  // QUANTO È PESANTE PER TE. Il giudizio qui sopra guarda il NOME
  // dell'esercizio; questo guarda il TUO numero: se spingi 40 kg in chest press
  // e 4 kg qui, per te questo esercizio È leggero anche se il nome sembra duro.
  const perTe = quantoEPesantePerTe({
    serie: serieMie(), esercizi: V.esercizi, esercizioId: e.id, peso: pesoCorporeoOra(),
  });
  if (perTe && perTe.scelto) {
    zona.appendChild(el('div', { class: 'riga-giudizio giud-personale' }, [
      el('strong', { testo: 'QUANTO È PESANTE PER TE' }),
      el('span', { testo: perTe.scelto.frase }),
      el('span', { class: 'nota nota-piccola', testo: `Il tuo massimo è su ${perTe.nomeMassimo}.` }),
    ]));
  }

  // LE TUE CORREZIONI. Se il livello è sbagliato, lo correggi tu e vale per
  // sempre: non devi più aspettare che io metta una parola chiave.
  zona.appendChild(el('div', { class: 'box-correzione' }, [
    el('p', { class: 'nota nota-piccola', testo: 'L\'app ha riconosciuto questo esercizio. Se ha sbagliato, correggilo qui e non lo chiederà più.' }),
    (() => {
      const riga = el('div', { class: 'riga-livelli' });
      for (const [id, testo] of [['grande', 'GRANDE'], ['composto', 'COMPOSTO'], ['isolamento', 'ISOLAMENTO'], ['assistito', 'RIPETIZIONI']]) {
        riga.appendChild(bottone(testo, {
          onClick: async () => {
            await correggiLivello(accountAttivo(), e.id, id);
            await caricaLivelliImparati();
            avviso(`Ok: ${testo}. Da ora questo esercizio è così.`, { tipo: 'ok' });
            disegna();
          },
          classe: 'chip' + (profilo.livello === id ? ' attivo' : ''),
        }));
      }
      return riga;
    })(),
  ]));

  if (record.pesoCorporeo) {
    zona.appendChild(el('p', { class: 'nota nota-chiaro', testo: `Questa prestazione l'hai fatta quando pesavi ${formattaNumero(record.pesoCorporeo)} kg.` }));
  }

  zona.appendChild(el('div', { class: 'card-rank card-' + record.rankId + ' card-grande' }, [
    el('div', { class: 'card-rank-alto' }, [
      el('div', {}, [
        el('span', { class: 'nota', testo: record.inTop ? 'Record personale · rank massimo' : 'Record personale' }),
        el('strong', { class: 'card-rank-nome', testo: record.testo }),
      ]),
      badgeRank(record.rankId, record.lp, record.divisione),
    ]),
    el('div', { class: 'card-rank-basso' }, [
      barraLp(record),
      el('span', {
        class: 'nota',
        testo: record.inTop
          ? `Sei sul rank più alto: non cÈ un passo dopo, e ogni LP È un punto di percentuale sopra la soglia dell'OLYMPIAN (+${record.lp}% adesso).`
          // gli stessi KG GIUSTI della card (vedi la spiegazione li' sopra): il
          // punteggio interno non È un peso e non va mostrato come se lo fosse
          : (record.distanza && record.distanza.kgNecessari
            ? `${formattaNumero(record.distanza.kgNecessari)} ${profilo.unita} per ${(record.prossimoObiettivo || {}).etichetta || (record.prossimoRank ? record.prossimoRank.nome : 'il prossimo rank')}, con le ripetizioni che hai`
            : `Prossimo obiettivo: ${(record.prossimoObiettivo || {}).etichetta || (record.prossimoRank ? record.prossimoRank.nome : 'il prossimo rank')}`
              + (distanzaObiettivo(record) ? ` (ti manca lo ${formattaNumero(distanzaObiettivo(record).percentuale)}%)` : '')),
      }),
      el('span', { class: 'nota nota-piccola', testo: AVVERTIMENTO_STIMA_SOGLIA }),
      record.spiegaBonus ? el('span', { class: 'nota nota-piccola', testo: record.spiegaBonus }) : null,
    ]),
  ]));

  // posizione nella classifica di questo esercizio
  const classifiche = classifichePerEsercizio(vociConClassificaPubblica(), V.esercizi);
  const mia = classifiche.find((c) => c.esercizio_id === e.id);
  if (mia) {
    const profiloPrivacy = privacyDi(profiloAttivo());
    if (profiloPrivacy.leaderboard === 'pubblico') {
      const ordinata = classificaEsercizio(mia.voci.map((v) => ({ ...v, punteggioCalcolato: v.punteggio })), profilo);
      const posizione = ordinata.find((v) => v.account === accountAttivo());
      zona.appendChild(el('section', { class: 'blocco' }, [
        el('h2', { testo: 'Nella classifica di questo esercizio' }),
        el('p', { class: 'nota', testo: posizione ? `Sei ${posizione.posizione}o su ${ordinata.length}.` : 'Non compari in classifica.' }),
        el('a', { href: '#/rank', class: 'bottone-guarda', testo: 'Vedi la classifica' }),
      ]));
    }
  }

  // storico dei miglioramenti
  const tappe = storicoMiglioramenti(serie, e, seduteMie());
  zona.appendChild(el('section', { class: 'blocco' }, [
    el('h2', { testo: 'Storico dei miglioramenti' }),
    tappe.length
      ? el('div', {}, tappe.slice().reverse().map((t) => el('div', { class: 'riga-tappa' }, [
        el('span', { class: 'nota', testo: dataLeggibile(t.data) }),
        el('span', { class: 'cresci', testo: t.testoSerie }),
        badgeRank(t.rankId, t.lp),
      ])))
      : el('p', { class: 'nota', testo: 'Ancora nessun miglioramento registrato.' }),
  ]));

  // confronto con gli amici su questo esercizio
  const amici = amiciDi(profiloAttivo(), vociPerClassifica().map((v) => ({ ...v.profilo, id: v.account })));
  if (amici.length) {
    const box = el('section', { class: 'blocco' }, [el('h2', { testo: 'Con gli amici' })]);
    for (const a of amici) {
      const voce = vociPerClassifica().find((v) => v.account === a.id);
      const suo = voce ? voce.record.find((r) => r.esercizio && r.esercizio.id === e.id) : null;
      if (!suo || !suo.valido) continue;
      if (privacyDi(voce.profilo).performance !== 'pubblico') continue;
      box.appendChild(el('div', { class: 'riga-confronto' }, [
        el('span', { class: 'nota', testo: a.username }),
        el('span', { class: 'cresci', testo: suo.testo }),
        record.valido && suo.punteggio > record.punteggio
          ? el('span', { class: 'nota', testo: 'ti precede' })
          : el('span', { class: 'nota', testo: 'sei davanti' }),
      ]));
    }
    if (box.children.length > 1) zona.appendChild(box);
  }

  zona.appendChild(el('p', { class: 'nota nota-piccola', testo: `Le soglie sono calcolate sul riferimento di questo esercizio (${descriviPunteggio(profilo, profilo.riferimento)} = PLATINUM), non su quelle degli altri.` }));
  // QUI SI DICE CHE IL NUMERO È UNA STIMA, e non È una pigna.
  //
  // Ste (06/10/2026): "18.86 viene da un massimale stimato su 5 rip con un
  // movimento corto, e quindi È una stima dentro una stima... se ti sembra troppo, il
  // numero da cambiare È la base della percentuale, non questo riferimento".
  //
  // Ha ragione: il riferimento È un numero scelto e va bene così. Il fragile È il
  // massimale, che qui È stimato dai kg e dalle ripetizioni con una formula (Epley
  // fino a 10 rip, Brzycki sopra). È un calcolo fatto con una regola, non una
  // misura, e su un movimento corto con poche ripetizioni È il caso peggiore: il
  // peso sul cavo finisce prima che il muscolo ceda, quindi la stima sbaglia verso
  // l'alto. Per questo su un isolamento il Rank qui È indicativo: la stessa serie
  // può valere mezzo rank di più o di meno a seconda di quanto hai indovinato.
  //
  // Non ci scrivo "stimato" nel numero perchÈ Ste (04/10/2026) ha chiesto
  // esplicitamente "scrivi massimale non stima": la parola che preferisce lui resta,
  // e l'avvertenza sta qui, dove si spiega da dove viene il numero.
  zona.appendChild(el('p', {
    class: 'nota nota-piccola',
    testo: 'Attenzione: il massimale qui e\' stimato dai kg e dalle ripetizioni, non '
      + 'misurato. Sui movimenti corti con poche ripetizioni (un fly al cavo, una '
      + 'scrollata) la stima sbaglia verso l\'alto, quindi su quegli esercizi il rank '
      + 'e\' indicativo.',
  }));
}

function vistaAmici(zona) {
  zona.appendChild(el('h1', { testo: 'Amici' }));

  // Tutto ciò che riguarda inviti, condivisione e accesso online sta qui,
  // non in cima al Profilo: il Profilo deve aprirsi sui dati personali.
  const profilo = profiloAttivo();
  const boxLink = el('section', { class: 'blocco' }, [
    el('h2', { testo: 'Amici e condivisione' }),
    el('p', {
      class: 'nota',
      testo: 'Crea un link diverso per ogni amico. Quando lo apre, crea il suo account e accetta l’invito; poi potete vedere i vostri allenamenti condivisi. Non mandare mai a nessuno la tua password.',
    }),
    bottone('Crea link invito per un amico', {
      onClick: () => creaECopiaInvito(false),
      classe: 'principale',
    }),
    el('p', {
      class: 'nota nota-piccola',
      testo: 'Accettando l’invito, profilo e allenamenti diventano visibili tra voi. Puoi cambiare la visibilità in qualsiasi momento nella sezione Privacy.',
    }),
  ]);
  if (accountAttivo() === 'account-1' && profilo.amministratore) {
    boxLink.appendChild(bottone('Invita Andrea e trasferisci la sua vecchia scheda', {
      onClick: () => creaECopiaInvito(true),
      classe: 'fantasma',
      titolo: 'Invito speciale: trasferisce una sola volta la scheda storica Palestra A al suo account personale.',
    }));
  }
  zona.appendChild(boxLink);
  zona.appendChild(bloccoAccountOnlineProfilo());

  const voci = vociPerClassifica();
  const amici = amiciDi(profilo, voci.map((v) => ({ ...v.profilo, id: v.account })));

  zona.appendChild(el('p', { class: 'nota', testo: 'Vedi solo gli account che hai autorizzato. Ognuno vede solo quello che ha deciso di mostrare.' }));

  if (!amici.length) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Non hai ancora amici. Crea un link invito qui sopra e mandalo alla persona che vuoi aggiungere.' }));
  } else {
    for (const a of amici) {
      const voce = voci.find((v) => v.account === a.id);
      const suoStato = voce ? statoAccount({
        account: voce.account,
        sedute: voce.sedute,
        serie: (V.serie || []).filter((x) => x && new Set(voce.sedute.map((s) => s.id)).has(x.seduta_id)),
        esercizi: V.esercizi,
        completamenti: [],
        ricompense: (V.ricompense || []).filter((r) => r && r.account_id === voce.account),
        // i giorni in cui allena LUI, non i miei: senza, la streak di un amico che
        // va in palestra in giorni diversi dalla tua veniva calcolata con la regola
        // sbagliata, e gli facevi vedere una streak che non era la sua
        profilo: voce.profilo || null,
      }) : null;
      zona.appendChild(el('div', { class: 'riga-amico' }, [
        avatarNodo(a, { dimensione: 54 }),
        el('div', { class: 'cresci' }, [
          el('strong', { testo: a.username }),
          el('span', { class: 'nota', testo: suoStato
            ? `livello account ${suoStato.livello.livello} · ${formattaAura(suoStato.aura)} Aura · ${suoStato.streak.attiva ? suoStato.streak.giorni + ' giorni di fila' : 'streak spenta'}`
            : 'nessun allenamento registrato' }),
          el('span', { class: 'nota', testo: suoStato && suoStato.rankPrincipale
            ? 'rank migliore: ' + suoStato.rankPrincipale.rank.nome : '' }),
        ]),
        el('a', { href: '#/amico/' + a.id, class: 'bottone-guarda', testo: 'Confronta' }),
      ]));
    }
  }


}

function vistaAmico(zona, idAmico) {
  const voci = vociPerClassifica();
  const voce = voci.find((v) => v.account === idAmico);
  if (!voce) { zona.appendChild(el('p', { testo: 'Account non trovato.' })); return; }
  const amico = { ...voce.profilo, id: voce.account };

  zona.appendChild(el('a', { href: '#/amici', class: 'indietro', testo: 'Torna agli amici' }));
  if (!puoVedereAmico(profiloAttivo(), amico)) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Questo amico ha reso privato il proprio profilo.' }));
    return;
  }
  if (privacyDi(amico).performance !== 'pubblico') {
    zona.appendChild(el('h1', { testo: amico.username }));
    zona.appendChild(el('p', { class: 'nota', testo: 'Gli allenamenti di questa persona sono privati. Non mostro dati salvati in precedenza su questo dispositivo.' }));
    return;
  }

  // Ste (04/10/2026): "elimina il codice 030226, quel codice serve solo per
  // modificare la scheda che non è propria, ma non penso servi".
  //
  // Quindi qui non c'è più nessuna porta: il profilo dell'amico e la sua
  // scheda si vedono come prima, e la privacy normale (privato o pubblico)
  // decide cosa è nascosto. Il confronto resta sempre qui sotto.
  zona.appendChild(el('div', { class: 'testa-amico' }, [
    avatarNodo(amico, { grande: true, dimensione: 84 }),
    el('div', {}, [
      el('h1', { testo: amico.username }),
      el('p', { class: 'nota', testo: `${voce.sedute.length} allenamenti finiti · ${voce.record.filter((r) => r.valido).length} esercizi con record` }),
    ]),
  ]));

  // --- i suoi allenamenti: senza codice, quindi semplicemente qui ---
  zona.appendChild(el('section', { class: 'blocco' }, [
    el('h2', { testo: 'I suoi allenamenti' }),
    voce.sedute.length
      ? el('ul', { class: 'lista-sedute-amico' }, voce.sedute.slice(0, 20).map((s) => {
        // IL NUMERO DI SERIE VA CONTATO, non letto da un campo che non esiste.
        //
        // Qui c'era `s.serie_fatte || 0`: quel campo non è scritto da nessuna parte
        // dell'app (le serie stanno in un'altra tabella, collegate da `seduta_id`), e
        // quindi la pagina dell'amico diceva SEMPRE "0 serie". Non un numero sbagliato:
        // un numero che non era mai esistito. Ora si contano davvero.
        const n = (voce.serie || []).filter((x) => x && x.seduta_id === s.id && !x.eliminata).length;
        return el('li', {
          testo: `${s.nome_giorno || 'Allenamento'} · ${s.data} · ${n} serie`,
        });
      }))
      : el('p', { class: 'nota', testo: 'Nessun allenamento finito.' }),
  ]));

  // --- il confronto: sempre aperto ---
  const confronto = confronta(
    profiloAttivo(),
    amico,
    recordAccount(V.esercizi, mieiGruppi()),
    voce.record,
  );
  zona.appendChild(el('p', { class: 'nota', testo: `Essercizio per esercizio: vince ${confronto.vinti}, ne perdi ${confronto.persi}, pari ${confronto.pari}.` }));
  for (const r of confronto.righe) {
    if (!r.mio && !r.suo) continue;
    zona.appendChild(el('div', { class: 'riga-confronto' + (r.esito === 'mio' ? ' mia' : r.esito === 'suo' ? ' sua' : '') }, [
      el('span', { class: 'nota', testo: r.nome }),
      el('span', { class: 'cresci', testo: (r.mio ? r.mio.testo : '—') }),
      el('span', { class: 'nota', testo: (r.suo ? r.suo.testo : '—') }),
    ]));
  }
}

function puoVedereAmico(mio, altro) {
  const privacy = privacyDi(altro);
  if (privacy.profilo === 'pubblico') return true;
  return !!(mio && altro && mio.id === altro.id);
}

// ---------------------------------------------------------------------------
// (Il codice 030226 è stato tolto il 04/10/2026: serviva solo per modificare
// una scheda che non era sua e non gli serviva. Qui ora non c'è nessuna porta
// segreta: la privacy normale decide cosa è nascosto.)

async function vistaProfilo(zona) {
  const st = statoMio();
  const profilo = profiloAttivo();
  zona.appendChild(el('h1', { testo: 'Profilo' }));
  zona.appendChild(el('a',{href:'#/aura-shop',class:'aura-shop-open'},[el('span',{testo:'✦'}),el('span',{},[el('strong',{testo:'AURA SHOP'}),el('small',{testo:'Armature · effetti · titoli'})]),el('span',{testo:'→'})]));

  // l'avatar grande e centrale, come nei giochi
  const testa = el('div', { class: 'testa-profilo' }, [
    avatarNodo(profilo, { grande: true, dimensione: 120 }),
    el('h2', { testo: profilo.username }),
    ...(OGGETTI_AURA.find(o => o.tipo === 'Titolo' && o.id === (profilo.equipaggiamento_aura || {}).Titolo) ? [el('span', { class: 'titolo-profilo-equipaggiato', testo: (() => { const t = OGGETTI_AURA.find(o => o.tipo === 'Titolo' && o.id === (profilo.equipaggiamento_aura || {}).Titolo); return t.icona + ' ' + t.nome; })() })] : []),
    el('p', { class: 'nota', testo: `Livello account ${st.livello.livello} · ${formattaAura(st.aura)} Aura` }),
    el('div', { class: 'riga-teschio piccolo' }, [teschioStreak(st)]),
  ]);
  zona.appendChild(testa);

  // ---- il calendario: i giorni che alleni, fatti e saltati, insieme.
  // Va subito sotto la testa e non in fondo, perchÈ la domanda che ti fai guardando
  // il Profilo È "oggi mi tocca?", e la risposta sta nella riga sopra le caselle.
  zona.appendChild(bloccoCalendario(profilo, st));

  zona.appendChild(el('div', { class: 'blocco-progresso-livello' }, [
    barraProgresso(st.livello.progresso, `account: livello ${st.livello.livello}`),
    el('span', { class: 'nota', testo: `al livello account ${st.livello.livello + 1} mancano ${formattaNumero(st.livello.mancano)} XP` }),
  ]));

  // ---- il peso corporeo: serve al Rank, quindi sta in alto ----
  const boxPeso = el('section', { class: 'blocco' });
  boxPeso.appendChild(el('h2', { testo: 'Il tuo peso' }));
  const statoPeso = await controlloPeso();
  if (statoPeso.serve) {
    boxPeso.appendChild(el('div', { class: 'tape tape-giallo' }, [
      el('span', { testo: `${capitalizza(statoPeso.motivo)}. Il Rank lo usa per capire quanto sei forte davvero, non solo i kg che sollevi.` }),
    ]));
  }
  const rigaPeso = el('div', { class: 'riga-peso-profilo' });
  const campoPeso = campoNumero(statoPeso.peso, { etichetta: 'peso corporeo in kg' });
  campoPeso.classList.add('campo-peso-profilo');
  rigaPeso.appendChild(campoPeso);
  rigaPeso.appendChild(bottone('Salvo il peso', {
    onClick: async () => {
      const n = pesoCorporeoValido(campoPeso.value);
      if (n === null) {
        avviso('Scrivi un peso fra 25 e 300 kg.', { tipo: 'errore' });
        return;
      }
      // Ste (08/10/2026): "i rank devono aggiornare i pesi" e poi "tutto quanto deve
      // farsi automaticamente". Il messaggio diceva già "i Rank sono aggiornati",
      // ma non diceva QUANTO: era una promessa, non un'informazione.
      //
      // Qui il Rank viene calcolato DUE volte, col peso di prima e con quello nuovo,
      // e si dicono i nomi che cambiano. Il peso corporeo sposta gli ingressi e i
      // tetti di ogni esercizio, quindi gli stessi kg possono stare in due fasce
      // diverse: senza questo messaggio non lo vedi, e ti resta il dubbio se il
      // numero sia giusto.
      const primaDelPeso = mappaRank(V.esercizi, serieMie(), seduteMie());
      await segnaPeso(n, { account: accountAttivo() });
      await aggiornaPesoInMemoria();
      annunciaCambioPeso(primaDelPeso, mappaRank(V.esercizi, serieMie(), seduteMie()), n);
      disegna();
    },
    classe: 'principale',
  }));
  boxPeso.appendChild(rigaPeso);
  if (statoPeso.peso) {
    boxPeso.appendChild(el('p', { class: 'nota', testo: `Ultima misurazione: ${formattaNumero(statoPeso.peso)} kg (${statoPeso.durata}). Ti si ricorda di aggiornarlo almeno una volta alla settimana.` }));
  }
  const pesi = await pesiCronologici(accountAttivo());
  if (pesi.length) {
    const ultimi = pesi.slice(-8).reverse();
    const lista = el('div', { class: 'storico-pesi' });
    for (const p of ultimi) {
      lista.appendChild(el('div', { class: 'riga-peso' }, [
        el('span', { class: 'nota', testo: dataLeggibile(p.data) }),
        el('strong', { testo: `${formattaNumero(p.kg)} kg` }),
        bottone('×', {
          onClick: async () => { await togliPeso(p.id); await aggiornaPesoInMemoria(); disegna(); },
          classe: 'passo passo-rosso',
          titolo: 'Togli questa misurazione',
        }),
      ]));
    }
    // IL TITOLO DELLO STORICO ERA UNA "nota" DENTRO LA CARD DEL PESO, e si leggeva
    // come se fosse un blocco a se' finito. Ste me l'ha fatto vedere: dopo "Ti si
    // ricorda di aggiornarlo..." compariva "Il tuo storico" dentro la stessa card
    // viola, senza niente che dicesse dove finiva una cosa e cominciava l'altra.
    //
    // Ora È un titolo vero, con una riga sopra che stacca. Non È solo questione
    // di bellezza: uno storico che sembra parte di un'altra scheda È uno storico
    // che non usi, perchÈ non lo vedi come una cosa tua da cui cancellare.
    boxPeso.appendChild(el('h3', { class: 'titolo-sottosezione', testo: 'Il tuo storico' }));
    boxPeso.appendChild(lista);
  }
  zona.appendChild(boxPeso);

  // cambio avatar e username
  const boxAvatar = el('section', { class: 'blocco' }, [
    el('h2', { testo: 'Il tuo avatar' }),
    el('p', { class: 'nota', testo: 'Scegli un avatar: viene salvato con l\'account, quindi lo vedi uguale su un altro dispositivo.' }),
  ]);
  const grigliaAvatar = el('div', { class: 'griglia-avatar' });
  for (const a of elencoAvatar()) {
    grigliaAvatar.appendChild(bottone('', {
      onClick: () => salvaProfilo({ avatar_id: a.id }),
      classe: 'avatar-scelta' + (profilo.avatar_id === a.id ? ' attiva' : ''),
    }, [avatarNodo({ avatar_id: a.id, username: profilo.username }, { dimensione: 52 })]));
  }
  boxAvatar.appendChild(grigliaAvatar);
  const campoNome = campoTesto(profilo.username, {
    segnaposto: 'il tuo nome',
    onCambio: null,
  });
  boxAvatar.appendChild(el('div', { class: 'riga-pulsanti' }, [
    campoNome,
    bottone('Salva il nome', {
      onClick: async () => {
        const valore = String(campoNome.value || '').trim();
        if (!valore) { avviso('Scrivi un nome prima.', { tipo: 'errore' }); return; }
        await salvaProfilo({ username: valore });
        avviso('Nome salvato.', { tipo: 'ok' });
      },
      classe: 'fantasma',
    }),
  ]));
  zona.appendChild(boxAvatar);

  // ---- il personaggio: si aggiorna da solo e ha il pulsante che spiega come funziona.
  // Ste: "deve aggiornarsi un personaggio che metti dove gli vengono messe cose tipo
  // l'armatura ecc... che si aggiorna automaticamente e metti pure un pulsante che ti
  // spiega come funziona questo rpg". Sta SOPRA il dettaglio delle statistiche perchÈ
  // il personaggio È la foto, e la lista sotto È la spiegazione.
  zona.appendChild(bloccoPersonaggio(profilo, st));

  // ---- l'avatar RPG: classe, statistiche, livello e armature
  zona.appendChild(bloccoAvatarRpg(profilo, st));

  // statistiche vere
  zona.appendChild(el('section', { class: 'blocco' }, [
    el('h2', { testo: 'I tuoi numeri' }),
    el('div', { class: 'griglia-numeri' }, [
      numeroGrande('Allenamenti finiti', st.statistiche.seduteCompletate),
      numeroGrande('Giorni diversi', st.statistiche.giorniAllenati),
      numeroGrande('Esercizi con record', st.statistiche.eserciziConRecord),
      numeroGrande('Missioni fatte', st.missioniCompletate),
      numeroGrande('Aura', st.aura),
      numeroGrande('Livello allenamento', st.livello.livello),
    ]),
    el('p', { class: 'nota nota-piccola', testo: SPIEGA_NUMERI }),
  ]));

  // rank principali
  zona.appendChild(el('h2', { testo: 'I tuoi rank' }));
  if (!st.record.length) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Nessun record ancora.' }));
  } else {
    for (const r of st.record.slice(0, 6)) zona.appendChild(cardRank(r, { compatta: true }));
    zona.appendChild(el('a', { href: '#/rank', class: 'bottone-guarda', testo: 'Vedi tutti i Rank' }));
  }

  // medaglie
  zona.appendChild(el('section', { class: 'blocco' }, [
    el('h2', { testo: `Medaglie (${st.medaglieOttenute.length} su ${st.medaglie.length})` }),
    el('div', { class: 'griglia-medaglie' }, st.medaglie.map((m) => el('div', {
      class: 'medaglia' + (m.ottenuta ? ' ottenuta' : ''),
      title: m.descrizione,
    }, [
      el('strong', { testo: m.nome }),
      el('span', { class: 'nota', testo: m.ottenuta ? 'ottenuta' : `mancano ${m.mancano}` }),
    ]))),
  ]));

  // privacy
  const boxPrivacy = el('section', { class: 'blocco' }, [
    el('h2', { testo: 'Privacy' }),
    el('p', { class: 'nota', testo: 'Scegli cosa condividere con gli amici collegati. Quando rendi privato un dato, l\'app smette di mostrarlo e il database blocca i nuovi accessi.' }),
  ]);
  const scelte = el('div', { class: 'chip-scelte' });
  // Due stati, come prima: o si vede da tutti o da nessuno. Il codice 030226
  // è stato tolto, quindi non c'è più lo stato "chiuso" (visibile solo a chi
  // aveva il codice): resta la privacy normale.
  const DOPO_CLIC = { privato: 'pubblico', pubblico: 'privato' };
  const SPIEGA = {
    privato: 'privato: gli amici non lo vedono',
    pubblico: 'pubblico: lo vedono gli amici collegati',
  };
  for (const campo of campiVisibili) {
    const attuale = privacyDi(profiloDi(accountAttivo()))[campo.id];
    scelte.appendChild(bottone(campo.nome, {
      onClick: async () => {
        const nuova = { ...privacyDi(profiloDi(accountAttivo())) };
        nuova[campo.id] = DOPO_CLIC[attuale] || 'pubblico';
        await salvaProfilo({ privacy: nuova });
        avviso(`${campo.nome}: ${SPIEGA[nuova[campo.id]]}.`, { tipo: 'ok' });
      },
      classe: 'chip' + (attuale === 'pubblico' ? ' attivo' : ''),
    }));
  }
  boxPrivacy.appendChild(scelte);
  boxPrivacy.appendChild(el('p', {
    class: 'nota nota-piccola',
    testo: 'Tocca per cambiare: privato (nessuno) o pubblico (tutti).',
  }));
  for (const campo of campiVisibili) {
    boxPrivacy.appendChild(el('p', {
      class: 'nota nota-piccola',
      testo: `${campo.nome}: ${campo.descrizione}${campo.nota ? ' — ' + campo.nota : ''}`,
    }));
  }
  zona.appendChild(boxPrivacy);

  // LE PAROLE CHE L'APP NON CONOSCE. Ste: "implementa una sorta di IA che
  // capisce bene... fai qualcosa che capisca che esercizio è". Qui l'app
  // guarda i nomi di tutti i tuoi esercizi, trova le parole che nel suo
  // vocabolario non compaiono e te le chiede UNA volta sola. Dopo non te le
  // chiede più, e quei nomi li capisce da soli.
  const SPIEGA_ETICHETTE = [
    ['grande', 'GRANDE'], ['composto', 'COMPOSTO'],
    ['isolamento', 'ISOLAMENTO'], ['assistito', 'RIPETIZIONI'],
  ];
  const SPIEGA_LIVELLO = {
    grande: {
      voce: 'È un movimento impegnativo: chiede molta forza e molta tecnica insieme. '
        + 'Se il peso ti scappa di mano non è che non sai usarlo: è che è difficile.',
      come: 'Lo fai per primo, con i pesi alti, ed è quello che ti fa sudare.',
    },
    composto: {
      voce: 'È un movimento che lavora su più muscoli insieme: panca, squat, stacco, trazioni.',
      come: 'Vengono per primi, perché scaldano e fanno spendere calorie.',
    },
    isolamento: {
      voce: 'È un movimento che lavora un muscolo solo, lasciando fuori gli altri: curl, french press, leg extension.',
      come: 'Viene dopo i composti, quando quel muscolo è già scaldato e può spingere di più.',
    },
    assistito: {
      voce: 'È un esercizio che si conta in ripetizioni e non in kg: trazioni, dip, e anche le macchine assistite.',
      come: 'Non ci sono dischi da mettere: conta quante volte lo fai. Viene per ultimo.',
    },
  };
  const daChiedere = await paroleDaChiedere(accountAttivo(), V.esercizi);
  if (daChiedere.length) {
    const boxParole = el('div', { class: 'box-parole' }, [
      el('h3', { testo: 'Parole che non conosco' }),
      el('p', {
        class: 'nota nota-piccola',
        testo: 'Sono parole che usano i nomi dei tuoi esercizi e che non mi sono chiare. '
          + 'Scegli sotto quella che ti somiglia di più: te lo chiedo una volta sola e poi non più.',
      }),
    ]);

    // IL RIQUADRO DELLE QUATTRO SPIEGAZIONI, UNA VOLTA SOLA.
    //
    // Prima stava dentro il ciclo delle parole da chiedere, quindi se ne avevi
    // tre ti comparivano tre volte di fila, identiche. La spiegazione è sempre
    // la stessa: una volta basta e avanza.
    const aiuto = el('div', { class: 'aiuto-livelli' }, [
      el('p', { class: 'aiuto-livelli-titolo', testo: 'Cosa vuol dire ciascuna parola' }),
    ]);
    for (const [id, etichetta] of SPIEGA_ETICHETTE) {
      const s = SPIEGA_LIVELLO[id];
      aiuto.appendChild(el('p', { class: 'aiuto-livello' }, [
        el('strong', { testo: etichetta }),
        el('span', { testo: s.voce }),
        el('span', { class: 'aiuto-come', testo: 'Come sceglierla: ' + s.come }),
      ]));
    }
    boxParole.appendChild(aiuto);

    for (const voce of daChiedere) {
      const riga = el('div', { class: 'riga-parola-da-chiedere' }, [
        el('span', { class: 'parola', testo: voce.parole.join(', ') }),
        el('span', { class: 'nota', testo: voce.nome }),
      ]);
      for (const [id, testo] of SPIEGA_ETICHETTE) {
        const spiegazione = SPIEGA_LIVELLO[id];
        // il `title` sul bottone basta sui computer, ma sul telefono non lo vedi:
        // senza un `title` Safari lo legge come stringa vuota. Per quello la
        // spiegazione sta anche in un riquadro sotto i bottoni.
        riga.appendChild(bottone(testo, {
          onClick: async () => {
            for (const parola of voce.parole) await imparaParola(accountAttivo(), parola, id);
            avviso('Ok, imparato. Non te lo chiedo più.', { tipo: 'ok' });
            disegna();
          },
          classe: 'chip' + (voce.livelloIndovinato === id ? ' attivo' : ''),
          titolo: `${testo}. ${spiegazione.voce} Come sceglierlo: ${spiegazione.come}`,
        }));
      }
      boxParole.appendChild(riga);
    }
    zona.appendChild(boxParole);
  }

  zona.appendChild(el('div', { class: 'riga-pulsanti' }, [
    el('a', { href: '#/storico', class: 'bot fantasma', testo: 'Storico' }),
    el('a', { href: '#/progressi', class: 'bot fantasma', testo: 'Progressi' }),
    el('a', { href: '#/amici', class: 'bot fantasma', testo: 'Amici' }),
    el('a', { href: '#/impostazioni', class: 'bot fantasma', testo: 'Impostazioni' }),
  ]));
  if (profilo.amministratore) {
    zona.appendChild(el('div', { class: 'riga-pulsanti' }, [
      bottone('+ CREA ESERCIZIO', { onClick: () => finestraCreaEsercizio(), classe: 'principale' }),
    ]));
  }
}

/**
 * I due figurini, davanti e dietro, con acceso il pezzo di muscolo che questo
 * esercizio lavora.
 *
 * Ste (13/10/2026): "voglio che spunti questo omino con il muscolo allenato
 * colorato di viola se possibile, non di giallo".
 *
 * E (15/10/2026) anche QUANTO: "la parte che lavora di più deve essere più
 * evidenziata, la parte che lavora di meno deve essere evidenziata più chiara.
 * tipo il dip qua segna tutto il petto che e' giusto ma allena principalmente la
 * parte bassa". Per questo `livelli` dice quanto lavora ogni pezzo: il petto dei
 * dip si accende tutto, ma la parte bassa pieno e quella alta appena accennata.
 *
 * Se una fascia profonda non ha un contorno visibile nella tavola, non la
 * sostituiamo con un muscolo vicino: il brachiale e i romboidi restano indicati
 * nel testo, mentre l'omino mostra soltanto le fasce superficiali disegnate.
 */
function disegnoOmino(parteId, livelli, anatomia) {
  const etichette = ETICHETTE_OMINO
    .map((e) => '<text class="vista-label" x="' + e.x + '" y="' + e.y + '" text-anchor="middle">'
      + e.testo + '</text>')
    .join('');
  return '<svg class="omino-svg" viewBox="0 0 ' + FOTO_L + ' ' + FOTO_A
    + '" role="img" aria-label="Il corpo di fronte e di dietro, con il muscolo allenato colorato di viola">'
    + figurinoMuscolo(parteId, livelli, anatomia) + etichette + '</svg>';
}

/** Ingrandisce la stessa mappa frontale/posteriore, senza cambiare l'omino originale. */
function apriOminoZoom(parteId, livelli, anatomia) {
  const sfondo = el('div', { class: 'sfondo-dialogo omino-zoom-sfondo', role: 'dialog', aria: { label: 'Mappa muscolare ingrandita' } });
  const dialogo = el('div', { class: 'dialogo omino-zoom-dialogo' });
  dialogo.appendChild(el('div', { class: 'omino-zoom-intestazione' }, [
    el('div', {}, [
      el('h2', { testo: 'Mappa muscolare' }),
      el('p', { class: 'nota', testo: 'Fronte e retro · Viola intenso: muscolo principale · Viola chiaro: supporto' }),
    ]),
    bottone('Chiudi', { classe: 'fantasma', onClick: () => sfondo.remove() }),
  ]));
  dialogo.appendChild(el('div', { class: 'omino-zoom-immagine', html: disegnoOmino(parteId, livelli, anatomia) }));
  sfondo.appendChild(dialogo);
  sfondo.addEventListener('click', (ev) => { if (ev.target === sfondo) sfondo.remove(); });
  document.body.appendChild(sfondo);
}

/** Il pezzo di muscolo da accendere, o null se l'app non lo conosce. */
function zonaOmino(parteId) {
  return idZonaDaParte(parteId);
}

/** Cosa vuol dire ognuno dei sei numeri grandi del Profilo. */
const SPIEGA_NUMERI = 'Allenamenti finiti: quante sedute hai chiuso. '
  + 'Giorni diversi: quanti giorni distinti ti sei allenato, quindi se in un giorno fai due volte '
  + 'conta come uno. Esercizi con record: quanti esercizi hanno un tuo record personale. '
  + 'Missioni fatte: quante sfide hai completato. Aura: i punti che guadagni allenandoti. '
  + 'Livello allenamento: la tua crescita nell\'app, che non c\'entra con il Livello personaggio, '
  + 'quello che sblocca le armature.';

function numeroGrande(nome, valore) {
  return el('div', { class: 'numero-grande' }, [
    el('strong', { testo: typeof valore === 'number' ? formattaNumero(valore) : String(valore) }),
    el('span', { class: 'nota', testo: nome }),
  ]);
}

/* ---------- la finestra dell'amministratore per creare un esercizio ---------- */

function finestraCreaEsercizio() {
  if (!profiloAttivo().amministratore) {
    avviso('Questa sezione e\' solo per l\'amministratore.', { tipo: 'errore' });
    return;
  }
  const nome = campoTesto('', { segnaposto: 'Nome' });
  const descrizione = campoTesto('', { segnaposto: 'Descrizione' });
  const tipo = el('select', { class: 'selettore' }, [
    el('option', { value: 'kg_reps', testo: 'KG + REPS' }),
    el('option', { value: 'solo_reps', testo: 'SOLO REPS' }),
    el('option', { value: 'tempo', testo: 'TEMPO' }),
    el('option', { value: 'distanza', testo: 'DISTANZA' }),
    el('option', { value: 'kg_tempo', testo: 'KG + TEMPO' }),
  ]);
  const convenzione = el('select', { class: 'selettore' }, [
    el('option', { value: 'macchina', testo: 'kg piastre macchina' }),
    el('option', { value: 'cavo_totali', testo: 'kg totali del cavo' }),
    el('option', { value: 'per_manubrio', testo: 'kg per manubrio' }),
    el('option', { value: 'dischi', testo: 'kg dischi' }),
    el('option', { value: 'bilanciere', testo: 'kg bilanciere' }),
    el('option', { value: 'corpo_libero', testo: 'corpo libero' }),
    el('option', { value: 'assistenza', testo: 'kg di assistenza (la macchina ti aiuta)' }),
    // Senza questa voce non potevi scegliere i zavorri quando creavi un esercizio
    // nuovo: il menu offriva solo "kg di assistenza", che è il contrario esatto.
    el('option', { value: 'zavorri', testo: 'kg di zavorri SOPRA il tuo corpo (trazioni, dips)' }),
  ]);
  // Ste (04/10/2026): "metti che si può decidere quando fai un nuovo esercizio se
  // È monocarrucola o doppia carrucola".
  //
  // Prima questi tre fatti stavano SOLO scritti dentro il file: se creavi un
  // esercizio al cavo non potevi dirgli mono o doppia, e l'app sbagliava di 2 sul
  // Rank. Nessuno ci deve pensare da solo, e Ste non deve dipendere da me.
  // LA CARRUCOLA.
//
// Ste (10/10/2026): "fai che devo segnare se è doppia o mono carrucola". La scelta
// c'era già, ma le due voci dicevano solo "mono carrucola" e "doppia carrucola", che
// non spiegano niente: se non sai cosa sia non sai quale scegliere, e se sbagli il
// Rank è sbagliato.
//
// Qui sotto ogni voce dice cosa SENTI e cosa cambia nel conto, che è l'unica cosa che
// serve per decidere.
const carrucola = el('select', { class: 'selettore' }, [
    el('option', { value: '', testo: 'non è un cavo' }),
    el('option', { value: 'carrucola_mono', testo: 'MONO / rapporto 1:1 — non dimezzare il numero' }),
    el('option', { value: 'carrucola_doppia', testo: 'DOPPIA carrucola (rapporto 2:1) — selezionala solo se il carico effettivo al cavo è metà del numero sulla pila' }),
  ]);
  const spiegazioneCarrucola = el('p', { class: 'nota nota-piccola nota-zavorri' });
  const scriviSpiegazioneCarrucola = () => {
    svuota(spiegazioneCarrucola);
    if (carrucola.value === 'carrucola_mono') {
      spiegazioneCarrucola.appendChild(el('span', { testo: 'Mono / rapporto 1:1: 50 sulla pila corrispondono a 50 nominali al cavo; non dimezzare.' }));
    } else if (carrucola.value === 'carrucola_doppia') {
      spiegazioneCarrucola.appendChild(el('span', { testo: 'Rapporto 2:1: con 50 sulla pila, al cavo arrivano circa 25. Non dipende dal fatto che usi uno o due bracci: conta il rapporto della macchina. Se non sai il rapporto, non scegliere doppia per supposizione.' }));
    }
  };
  carrucola.addEventListener('change', () => { scriviSpiegazioneCarrucola(); aggiornaAnteprima(); });
  scriviSpiegazioneCarrucola();

  const attrezzatura = el('select', { class: 'selettore' }, [
    el('option', { value: '', testo: 'non è una macchina' }),
    el('option', { value: 'macchina_dischi', testo: 'macchina a DISCHI veri — li carico io e li metto sui due lati (quindi il numero che scrivi è per lato)' }),
    el('option', { value: 'macchina_stack', testo: 'macchina a STACK — pacco di dischi con la linguetta (il numero che scrivi è già per entrambi i lati)' }),
  ]);
  const spiegazioneAttrezzatura = el('p', { class: 'nota nota-piccola nota-zavorri' });
  const scriviSpiegazioneAttrezzatura = () => {
    svuota(spiegazioneAttrezzatura);
    if (attrezzatura.value === 'macchina_dischi') {
      spiegazioneAttrezzatura.appendChild(el('span', { testo: 'Dischi caricati a mano: per il multipower inserisci i kg di dischi PER LATO e non contare la barra. Per macchine con bracci indipendenti, inserisci il carico per lato/braccio come indicato nella scheda.' }));
    } else if (attrezzatura.value === 'macchina_stack') {
      spiegazioneAttrezzatura.appendChild(el('span', { testo: 'Stack: scegli il numero sulla pila con la linguetta. Di norma registri quel numero senza raddoppiarlo; il rapporto del cavo va verificato sulla macchina specifica.' }));
    }
  };
  attrezzatura.addEventListener('change', () => { scriviSpiegazioneAttrezzatura(); aggiornaAnteprima(); });
  scriviSpiegazioneAttrezzatura();
  const braccia = el('select', { class: 'selettore' }, [
    el('option', { value: '', testo: 'i due bracci vanno insieme' }),
    el('option', { value: 'si', testo: 'braccia indipendenti' }),
  ]);
  const usoBraccia = el('select', { class: 'selettore' }, [
    el('option', { value: '', testo: 'non specificato' }),
    el('option', { value: 'un_braccio', testo: 'uso un braccio alla volta' }),
    el('option', { value: 'due_braccia', testo: 'uso due braccia insieme' }),
  ]);

  // Ste (09/10/2026): "come segno che faccio tapis roulant?".
  //
  // La risposta prima era "basta che il nome contenga tapis", cioè nessuna: se
  // l'esercizio si chiama "Camminata veloce" o "Tapis di casa", l'agilità non
  // contava niente e lui non sapeva perché. Ora si sceglie esplicitamente.
  const cardio = el('select', { class: 'selettore' }, [
    el('option', { value: '', testo: 'no, forza normale' }),
    el('option', { value: 'si', testo: 'sì, è cardio (tapis, corsa, corda...)' }),
  ]);

  // Il riferimento ora si CALCOLA da solo.
  //
  // Ste (04/10/2026): "non si può rendere automatica sta cosa?".
  //
  // Prima doveva scrivere a mano "il punteggio PLATINUM" e non sapeva cosa
  // mettere. Ora il campo è FACOLTATIVO: se lo lascia vuoto l'app sceglie da
  // sola un riferimento sensato in base al tipo di misura, e poi lo scala sul
  // peso corporeo di chi lo usa (un esercizio pesante resta pesante per
  // tutti, ma il livello PLATINUM si alza con il peso della persona).
  //
  // Se invece scrive un numero, quello vince: serve per gli esercizi particolari
  // dove il default non è adatto.
  const riferimento = campoNumero('', { etichetta: 'punteggio PLATINUM (facoltativo)' });
  const anteprimaRiferimento = el('div', { class: 'anteprima-riferimento' });

  // Ste (04/10/2026): "deve riconoscere si, per questo ti ho detto se puoi
  // metterci un ia". Quando scrivi il nome, l'app lo RICONOSCE da sola e ti
  // dice che movimento È e quanto È difficile, e PERCHE'. Se sbaglia, te ne
  // accorgi subito e puoi correggerla a mano.
  const riconosciuto = el('div', { class: 'anteprima-riferimento' });
  const aggiornaRiconoscimento = () => {
    const nomeScritto = String(nome.value || '').trim();
    svuota(riconosciuto);
    if (!nomeScritto) return;
    const r = riconosciEsercizio({
      nome: nomeScritto,
      descrizione: String(descrizione.value || '').trim(),
      convenzione: convenzione.value,
      attrezzatura: attrezzatura.value || null,
      bracciaIndipendenti: braccia.value === 'si',
      usoBraccia: usoBraccia.value || null,
    });
    riconosciuto.appendChild(el('p', { class: 'nota nota-piccola' }, [
      el('span', { class: 'tag-livello piccolo liv-' + r.livello, testo: descrizioneLivello(r.livello) }),
    ]));
    riconosciuto.appendChild(el('p', {
      class: 'nota nota-piccola',
      testo: `Riconosciuto come ${r.movimento.replace(/_/g, ' ')} · gruppo ${r.gruppo} · quanto sono sicuro: ${r.confidenza}`,
    }));
    if (r.motivi && r.motivi.length) {
      riconosciuto.appendChild(el('p', { class: 'nota nota-piccola', testo: 'Perche\': ' + r.motivi.join(' · ') }));
    }
    if (r.confidenza === 'bassa') {
      riconosciuto.appendChild(el('p', { class: 'nota nota-piccola', testo: 'Non sono sicuro: il nome non contiene parole che conosco. Scrivilo come lo chiami in palestra e vediamo.' }));
    }
  };
  nome.addEventListener('input', aggiornaRiconoscimento);
  descrizione.addEventListener('input', aggiornaRiconoscimento);
  convenzione.addEventListener('change', aggiornaRiconoscimento);
  braccia.addEventListener('change', aggiornaRiconoscimento);
  carrucola.addEventListener('change', aggiornaRiconoscimento);
  usoBraccia.addEventListener('change', aggiornaRiconoscimento);
  attrezzatura.addEventListener('change', aggiornaRiconoscimento);
  aggiornaRiconoscimento();

  /** Ricalcola l'anteprima ogni volta che cambia qualcosa. */
  const aggiornaAnteprima = () => {
    const scritto = Number(String(riferimento.value || '').replace(',', '.'));
    const usaQuelloScrittto = Number.isFinite(scritto) && scritto > 0;
    const peso = pesoCorporeoOra();
    const profilo = profiloEsercizio(
      { id: 'ex-nuovo', nome: nome.value || 'Nuovo esercizio', convenzione: convenzione.value, misura: tipo.value, attrezzatura: attrezzatura.value || null, bracciaIndipendenti: braccia.value === 'si', carrucola: carrucola.value || null, usoBraccia: usoBraccia.value || null },
      usaQuelloScrittto ? { riferimento: scritto } : {},
    );
    const conPeso = profiloPerPesoCorporeo(profilo, peso);
    const s = conPeso.soglie;
    svuota(anteprimaRiferimento);
    anteprimaRiferimento.appendChild(el('p', {
      class: 'nota nota-piccola',
      testo: usaQuelloScrittto
        ? 'Stai usando il numero che hai scritto.'
        : (peso
          ? `Numero scelto automaticamente sul tuo peso (${formattaNumero(peso)} kg).`
          : 'Numero scelto automaticamente sul peso di riferimento. Se metti il tuo peso nel Profilo, si ricalcola anche da solo.'),
    }));
    anteprimaRiferimento.appendChild(el('p', {
      class: 'nota nota-piccola scala-anteprima',
      testo: `Bronzo ${formattaNumero(Math.round(s[0] * 10) / 10)} · Silver ${formattaNumero(Math.round(s[1] * 10) / 10)} · Gold ${formattaNumero(Math.round(s[2] * 10) / 10)} · Platinum ${formattaNumero(Math.round(s[3] * 10) / 10)} ${conPeso.unita}`,
    }));
  };
  riferimento.addEventListener('input', aggiornaAnteprima);
  usoBraccia.addEventListener('change', aggiornaAnteprima);
  tipo.addEventListener('change', aggiornaAnteprima);
  convenzione.addEventListener('change', aggiornaAnteprima);
  aggiornaAnteprima();

  // IL BLOCCO DEL CARICO: le quattro domande che hanno senso solo se l'esercizio ha
  // un carico. Va costruito qui e inserito una volta sola nel dialogo.
  const bloccoCarico = el('div', { class: 'blocco-carico' }, [
    el('h4', { class: 'titolo-sottosezione', testo: 'Il carico' }),
    el('label', { class: 'nota', testo: 'Convenzione del carico' }), convenzione,
    el('label', { class: 'nota', testo: 'Il cavo è doppio o singolo?' }), carrucola,
    spiegazioneCarrucola,
    el('label', { class: 'nota', testo: 'La macchina è a dischi veri o a stack?' }), attrezzatura,
    spiegazioneAttrezzatura,
    el('label', { class: 'nota', testo: "Muovi un braccio senza l'altro?" }), braccia,
    el('label', { class: 'nota', testo: 'Usi un braccio o due durante la serie?' }), usoBraccia,
    // IL PUNTEGGIO PLATINUM È UN NUMERO DI CHILI, quindi per il cardio sparisce
    // insieme a tutto il resto: su un tapis non c'è un carico da confrontare con
    // gli altri. L'anteprima della scala viene nascosta insieme.
    el('label', { class: 'nota', testo: 'Punteggio PLATINUM (facoltativo: se lo lasci vuoto lo sceglie l\'app)' }), riferimento,
    anteprimaRiferimento,
  ]);

  // LA SPUNTA COMANDA IL BLOCCO. È l'unico pezzo di logica in questo form che non è
  // "disegna e basta": quando cambia, il blocco del carico sparisce e i campi non
  // vengono salvati, così non resta un "per braccio" fantasma su un tapis.
  // La funzione è definita più avanti, dove `aggiornaAnteprima` esiste già.
  const aggiornaPerCardio = () => {
    const attivo = cardio.value === 'si';
    bloccoCarico.hidden = attivo;
    // e il tipo diventa "solo ripetizioni", che è come si misura un cardio: minuti.
    if (attivo) {
      tipo.value = 'ripetizioni';
      convenzione.value = '';
      carrucola.value = '';
      attrezzatura.value = '';
      braccia.value = '';
      riferimento.value = '';
    }
    aggiornaRiconoscimento();
    aggiornaAnteprima();
  };
  // La spunta cardio chiama le due funzioni definite sopra, quindi il listener va
  // registrato adesso, quando esistono già. E si chiama una volta all'apertura, così
  // un esercizio cardio si apre già con il blocco del carico nascosto.
  cardio.addEventListener('change', aggiornaPerCardio);
  aggiornaPerCardio();

  const immagine = el('input', { type: 'file', accept: 'image/*', class: 'campo-testo' });
  let fotoData = null;
  immagine.addEventListener('change', () => {
    const f = immagine.files && immagine.files[0];
    if (!f) return;
    try {
      const lettore = new FileReader();
      lettore.onload = () => { fotoData = String(lettore.result || ''); };
      lettore.readAsDataURL(f);
    } catch { avviso('Non sono riuscito a leggere l\'immagine.', { tipo: 'errore' }); }
  });

  const box = el('div', { class: 'sfondo-dialogo' }, el('div', { class: 'dialogo dialogo-largo' }, [
    el('h3', { testo: 'Crea un esercizio (per tutti)' }),
    el('p', { class: 'testo-dialogo', testo: 'L\'esercizio viene salvato nel database e diventa disponibile per TUTTI gli account: si potra\' usare nelle schede, negli allenamenti, avere un rank e comparire nelle classifiche.' }),

    // Ste: "fai un tutorial proprio nell'app dove spieghi come funziona
    // questa modalita' amministratore". I due campi che non capiva
    // ("punteggio PLATINUM" e "descrizione") sono spiegati sotto.
    el('details', { class: 'tutorial' }, [
      el('summary', { testo: 'Come funziona (leggi prima)' }),
      el('div', { class: 'tutorial-corpo' }, [
        el('p', { testo: 'Ogni esercizio ha una scala di Rank tutta sua, come i gradini di una scala: Bronzo, Silver, Gold, Platinum, Diamond, Titan, Olympian. Non conta il peso grezzo, conta quanto sei forte in quel movimento.' }),

        el('h4', { testo: 'Il campo "punteggio PLATINUM"' }),
        el('p', { testo: 'Non devi preoccupartene: lo sceglie l\'app al posto tuo. Lascia il campo vuoto e fa tutto da sola.' }),
        el('p', { testo: 'Come funziona: il PLATINUM è il livello di riferimento, e gli altri gradini nascono da lì con questi scarti:' }),
        // La lista dei gradini la LEGGE la configurazione (MOLTIPLICATORI_SOGLIA),
        // non È scritta qui a mano. Prima era scritta qui: diceva Bronzo 55%,
        // Diamond 118%, Titan 145%, Olympian 185%, mentre i numeri veri sono 50,
        // 110, 122 e 135. Quattro numeri sbagliati in un tutorial che Ste legge per
        // capire come funziona il Rank: la classe di errore di sempre, cioe' una
        // copia del numero in un posto dove poi non lo aggiorni.
        el('ul', {}, MOLTIPLICATORI_SOGLIA.map((m, i) => el('li', {
          testo: `${RANK[i].nome} = ${Math.round(m * 100)}%`,
        }))),
        el('p', { testo: 'Sotto la riga del campo vedi già la scala vera che verrà usata, quindi sai cosa aspettarti prima di salvare.' }),
        el('p', { testo: 'Il numero si sceglie in base al tipo di misura che hai messo sopra (kg e ripetizioni, solo ripetizioni, tempo, distanza) e poi si scala sul peso corporeo di chi si allena: se sei più pesante e più forte, il tuo PLATINUM sale. Eccolo per i due casi più comuni:' }),
        el('ul', {}, [
          el('li', { testo: 'Se l\'esercizio si misura in kg e ripetizioni, il numero NON è il peso che alzi: è il massimale stimato, cioè quanto peseresti facendo una ripetizione sola. Se fai 60 kg per 10 ripetizioni, la stima è circa 80.' }),
          el('li', { testo: 'Se l\'esercizio è a sole ripetizioni (trazioni, dip), il numero sono le ripetizioni vere. Se è a tempo, i secondi.' }),
        ]),
        el('p', { testo: 'Quando serve un numero tutto tuo? Solo per esercizi particolari, dove il numero scelto dall\'app non è adatto. In quel caso scrivilo tu e vince quello.' }),

        el('h4', { testo: 'Il campo "Descrizione"' }),
        el('p', { testo: 'È una nota che vede chi usa l\'esercizio, scritta sotto il nome. Serve a spiegare COME si fa, non a descrivere il nome.' }),
        el('p', { testo: 'Esempi giusti: "Panca con bilanciere, scendi con i piedi piatti e senza rimbalzare." Oppure: "Cavo basso, gomiti piegati dietro la schiena, solo avambracci."' }),
        el('p', { testo: 'Se non ti serve, lascialo vuoto: non è obbligatorio.' }),

        el('h4', { testo: 'Il campo "Convenzione del carico"' }),
        el('p', { testo: 'Dice come si leggono i kg che l\'utente scrive.' }),
        // Le voci sono lette da ETICHETTE_CONVENZIONE (numeri.js): anche qui una
        // copia scritta a mano andrebbe out of date, e qui dentro finiva per
        // mancare proprio "kg per braccio", che È la voce da cui dipende meta'
        // del Rank sulle macchine a dischi.
        el('ul', {}, ['per_manubrio', 'per_braccio', 'macchina', 'macchina_dischi', 'macchina_stack', 'cavo_totali', 'bilanciere', 'assistenza'].map((k) => el('li', { testo: ETICHETTE_CONVENZIONE[k] }))),
        el('p', { testo: 'Questo campo non è una nota: il numero del PLATINUM dipende da qui. Un esercizio registrato per braccio ha una scala diversa dallo stesso esercizio registrato in totale, perché 35 kg per braccio non si confrontano con 35 kg in tutto.' }),
      ]),
    ]),

    el('label', { class: 'nota', testo: 'Nome' }), nome,
    riconosciuto,
    el('label', { class: 'nota', testo: 'Immagine' }), immagine,
    // LA SCELTA "È CARDIO" VIENE PRIMA, PERCHÉ È QUELLA CHE CAMBIA TUTTE LE ALTRE.
    //
    // Ste (09/10/2026): "ho creato l'esercizio cardio cioè tapis roulant. prima di
    // tutto nella creazione esercizio se dico che è cardio devono togliersi le altre
    // cose tipo KG a dischi ecc".
    //
    // Le domande sul carico (quali kg, per braccio o in totale, dischi veri o stack,
    // muovi un braccio solo) su un tapis non hanno risposta: non ci sono kg. Non
    // basta scrivere "non applicabile", è una domanda che non va fatta. Per questo
    // la spunta sta SOPRA, e quando è spuntata il blocco del carico sparisce
    // davvero e i campi non vengono salvati.
    el('label', { class: 'nota', testo: 'È cardio?' }), cardio,
    el('p', {
      class: 'nota nota-piccola nota-cardio',
      testo: 'Se è cardio (tapis, corsa, corda, cyclette), spariscono le domande sui '
        + 'chili e sulla scheda si scrive solo per quanti minuti. Ti contano per '
        + 'l\'agilità e la stamina.',
    }),
// IL BLOCCO DEL CARICO, che sparisce quando è cardio.
    bloccoCarico,
    el('label', { class: 'nota', testo: 'Tipo' }), tipo,
    el('label', { class: 'nota', testo: 'Descrizione (come si fa: facoltativa)' }), descrizione,
    el('div', { class: 'dialogo-azioni' }, [
      bottone('Annulla', { onClick: () => box.remove(), classe: 'fantasma' }),
      bottone('CREA ESERCIZIO', {
        onClick: async () => {
          const nomeValore = String(nome.value || '').trim();
          if (!nomeValore) { avviso('Scrivi il nome dell\'esercizio.', { tipo: 'errore' }); return; }
          const id = 'ex-' + nuovoId();
          const misura = tipo.value;
          // Il riferimento si salva solo se Ste lo ha scritto. Se è vuoto non mettiamo
          // nulla: così profiloEsercizio usa il default giusto per il tipo di
          // misura e le soglie si ricalcolano da sole sul peso di chi le usa.
          const scritto = Number(String(riferimento.value || '').replace(',', '.'));
          // I quattro fatti che dicono COME si registra il carico devono stare
          // anche qui, non solo nell'anteprima e non solo nel salvataggio: senza
          // la convenzione e la carrucola la scala non sa se il numero che
          // scriveranno È di un lato, del carrello o del carico intero, e il
          // riferimento salvato È quello sbagliato. Prima la copia passava solo
          // nome e convenzione.
          // SE È CARDIO NON SI SALVA NESSUN CARICO. Un "tapis tondo" salvato con
          // una convenzione del carico farebbe comparire il campo dei kg sulla
          // scheda e il Rank cercherebbe un numero che non esiste.
          const eCardioNuovo = cardio.value === 'si';
          const profilo = profiloEsercizio(
            {
              id,
              nome: nomeValore,
              // e la scala del Rank è calcolata sulla convenzione: per un cardio
              // non c'è convenzione, quindi niente scala di kg da inventare
              convenzione: eCardioNuovo ? '' : convenzione.value,
              misura: eCardioNuovo ? 'ripetizioni' : misura,
              attrezzatura: eCardioNuovo ? null : (attrezzatura.value || null),
              carrucola: eCardioNuovo ? null : (carrucola.value || null),
              bracciaIndipendenti: !eCardioNuovo && braccia.value === 'si',
              usoBraccia: eCardioNuovo ? null : (usoBraccia.value || null),
            },
            (Number.isFinite(scritto) && scritto > 0 && !eCardioNuovo) ? { riferimento: scritto } : {},
          );
          await db.salva('esercizi', {
            id,
            nome: nomeValore,
            gruppo: nomeValore,
            convenzione: eCardioNuovo ? '' : convenzione.value,
            misura: eCardioNuovo ? 'ripetizioni' : misura,
            // I tre fatti che l'app DEVE sapere. Senza questi l'esercizio nasce
            // sbagliato: sul doppio carrucola il Rank È dimezzato, e una macchina
            // a dischi non È una macchina a stack. E valgono anche per la scala,
            // quindi non solo per il Rank.
            // e i tre fatti del carico solo se NON è cardio: sono già azzerati sopra, ma
            // queste righe li riscriverebbero con i valori del form.
            ...(eCardioNuovo ? {} : (carrucola.value ? { carrucola: carrucola.value } : {})),
            ...(eCardioNuovo ? {} : (attrezzatura.value ? { attrezzatura: attrezzatura.value } : {})),
            ...(eCardioNuovo ? {} : (braccia.value === 'si' ? { bracciaIndipendenti: true } : {})),
            ...(eCardioNuovo ? {} : (usoBraccia.value ? { usoBraccia: usoBraccia.value } : {})),
            // Il flag del cardio. Senza questo, un esercizio di cardio si riconosceva
            // solo dal nome ("tapis", "corsa") e ogni altro nome non contava.
            ...(eCardioNuovo ? { cardio: true } : {}),
            tipo: 'standard',
            foto: fotoData || 'img/esercizi/chest-press.png',
            nota_permanente: String(descrizione.value || '').trim(),
            // globale: questo esercizio non appartiene a un solo account
            globale: true,
            creato_da: accountAttivo(),
            amministratore: true,
            soglie_rank: profilo.soglie,
            riferimento: profilo.riferimento,
          });
          box.remove();
          await ricaricaTutto();
          avviso(`Esercizio creato: ${nomeValore}. Ora e\' disponibile per tutti.`, { tipo: 'ok', durata: 7000 });
          disegna();
        },
        classe: 'principale',
      }),
    ]),
  ]));
  box.addEventListener('click', (ev) => { if (ev.target === box) box.remove(); });
  document.body.appendChild(box);
}

/* ---------- la barra in alto con i numeri del giorno ---------- */

function disegnaBarraGioco(contenitore) {
  try {
  const st = statoMio();
  const profilo = profiloAttivo();
  const riga = el('div', { class: 'barra-gioco' }, [
  // IL TUO CERCHIO, IN ALTO A SINISTRA (Ste, 18/10/2026)
  //
  // "in alto è un po' buggata la UI, sistema e fallo più carino, con tipo il cerchio con
  // l'immagine del mio avatar dove premo e mi porta al profilo".
  //
  // Era nell'elenco delle cose da fare da sempre: la foto tua c'era, ma si vedeva solo
  // dentro il Profilo, e in cima c'era solo una riga di numeri. Ora il cerchio sta a
  // sinistra della riga e porta al Profilo: si vede subito con chi sei e si arriva con
  // un tocco.
  el('a', {
  href: '#/profilo', class: 'cerchio-profilo', title: 'Il tuo profilo',
  }, [avatarNodo(profilo, { dimensione: 30 })]),
  el('span', { class: 'chip-gioco', title: 'Streak: giorni di fila', testo: `streak ${st.fuoco.acceso ? st.fuoco.giorni : '0'}` }),
  el('span', { class: 'chip-gioco', testo: `aura ${formattaAura(st.aura)}` }),
  el('span', { class: 'chip-gioco', title: 'Livello account, basato sulle ricompense', testo: `livello account ${st.livello.livello}` }),
  ]);
    riga.children[0].setAttribute('style', `--fuoco:${st.fuoco.colore}`);
    contenitore.appendChild(riga);
  } catch (e) {
    // la barra È un extra: se qualcosa va storto non deve bloccare l'app
    console.warn('Barra del gioco non disegnata:', e);
  }
}

/* ===================== avvio app ===================== */

avvia();

// Esportato solo per i test: serve a riavviare l'app e verificare che le correzioni
// al nome della scheda vengano applicate anche a chi l'ha già installata.
export { avvia, V };
