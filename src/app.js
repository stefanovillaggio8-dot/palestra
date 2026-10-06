// app.js -- interfaccia e navigazione.
// Tutto in italiano, tema scuro, pulsanti grandi, fatto per essere usato
// in palestra con le mani occupate.

import * as db from './db.js';
import * as sb from './supabase.js';
import * as sync from './sync.js';
import { el, svuota, campoNumero, campoTesto, bottone, chiediConferma, avviso, schedaEvento, oraLocale, dataLeggibile, conRitardo, bottoneSu } from './ui.js';
import { graficoLinea, graficoBarre } from './grafici.js';
import {
  formattaNumero, formattaPeso, formattaRipetizioni, formattaCronometro, formattaDurata,
  ETICHETTE_CONVENZIONE, CONVENZIONI, convenzioneMisuraCarico, etichettaUnita, campoCarico,
} from './numeri.js';
import { confrontaEsercizio, riassuntoEsercizio, NON_DISPONIBILE } from './confronto.js';
import { prossimoOrdine, apriSeduta, nuovaSerie, seduteFinite, eFatta, commutaFatta, pulsa, segnaAspettoFatto, registra, REGISTRO, cambiaSerie, etichettaSpotterSerie, aspettaSalvataggi } from './sedute.js';
import {
  MODALITA, raccogliPerEsercizio, proposta as propostaAggiornamento, notaSulNumeroSerie,
  riassuntoSpotter,
} from './aggiornamento.js';
import { testoProgresso, serieARipetizioniCostanti, riepilogoGenerale } from './progressi.js';
import { prestazione, mediaPrestazioni, classificaGenerale } from './forza-generale.js';
import { creaPacchetto, validaPacchetto, unisci, csvSerie, csvSedute, csvEsercizi } from './backup.js';
import { ESERCIZI, SCHEDA_ID, SCHEDA_NOME, PERSONE, CONTATTI, accountId, personaDallaUrl, costruisciSnapshot } from './dati-iniziali.js';
import { nuovoId, adesso, TABELLE, riallineaEsercizi } from './sincronizzazione.js';
// --- il gioco: rank, LP, streak, Aura, missioni, amici ---
import { statoAccount, ricompenseAllenamento, gruppiDaSerie } from './gioco.js';
import { recordEsercizio, recordAccount, classificaEsercizio, storicoMiglioramenti, giudizioPerformance, distanzaAllaSoglia } from './rank.js';
import { confrontoGiorno, confrontiMensili, GIORNI_UN_MESE } from './confronto-mensile.js';
import { profiloEsercizio, profiloPerPesoCorporeo, RANK, ETICHETTE_MISURA, descriviPunteggio, descrizioneLivello, livelloEsercizio, impostaLivelliImparati, livelliImparati, rapportoDifficolta, MOLTIPLICATORI_SOGLIA } from './rank-config.js';
import { formattaAura } from './aura.js';
import { elencoAvatar, avatarPerId, gradienteAvatar, iniziali } from './avatar.js';
import { amiciDi, confronta, classifichePerEsercizio, privacyDi, campiVisibili, PRIVACY_PREDEFINITE } from './sociale.js';
import { classificaEsercizio as riconosciEsercizio } from './esercizi-classificatore.js';
import { parteDiMuscolo, AVVERTIMENTO_PARTI, stessoLavoro, livelloConMuscolo, ordinePerMuscolo }
  from './muscoli-parti.js';
import { quantoEPesantePerTe, correggiLivello, dimenticaLivello, livelloImparato, paroleDaChiedere, imparaParola } from './esercizi-personali.js';
import { controllaAggiornamento, applicaAggiornamento as prendiVersioneNuova, registraAggiornamentoRapido } from './update-via-sw.js';
import {
  pesoAttuale, pesiCronologici, segnaPeso, togliPeso, pesoCorporeoValido,
  serveAggiornare, PESO_RIFERIMENTO,
} from './peso-corporeo.js';

// Il peso corporeo sta in una variabile semplice per non rileggerlo dal database
// a ogni schermata: cambia raramente e il Rank lo usa spesso.
let PESO_CACHE = { valore: null, pronto: false };
async function aggiornaPesoInMemoria() {
  // il peso e' DELLA PERSONA che sta usando l'app: senza questo filtro i due
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
const GIRI_DROPSET = 3; // i 3 posti in piu' che ha chiesto Ste

/* ===================== chi sta usando l'app ===================== */

// Ognuno ha la sua scheda e i suoi allenamenti. La scelta sta nel link:
// ?p=2 per la seconda persona, ?p=1 (o niente) per la prima.
// TUTTO quello che segue e' gia' filtrato su questa persona: e' quello che
// evita che gli allenamenti di uno finiscano nei progressi dell'altro.
let persona = null;
function personaAttiva() {
  if (!persona) {
    const ricerca = (typeof window !== 'undefined' && window.location && window.location.search) || '';
    persona = personaDallaUrl(ricerca);
  }
  return persona;
}
function schedaAttivaId() { return personaAttiva().schedaId; }

/** Le versioni della scheda della persona che sta usando l'app. */
function versioniDellaPersona() {
  const id = schedaAttivaId();
  return V.versi.filter((v) => v.scheda_id === id);
}

/** Le sedute della persona che sta usando l'app (le altre non le vede). */
function seduteDellaPersona() {
  const miei = new Set(versioniDellaPersona().map((v) => v.id));
  return V.sedute.filter((s) => miei.has(s.versione_id));
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

async function avvia() {
  const radice = document.getElementById('app');
  installaSpiaErrori();
  svuota(radice);
  radice.appendChild(el('div', { class: 'caricamento', testo: 'Carico i tuoi dati...' }));

  try {
    await db.apriDb();
    await seminaSeVuoto();
    bottoneSu();

    await ricaricaTutto();

    sync.iscriviti(() => { aggiornaStatoSalvataggio(); });
    // il peso corporeo serve al Rank: lo carico in memoria subito all'avvio
    await aggiornaPesoInMemoria();
    // le correzioni che Ste ha fatto ai livelli: il Rank deve usarle subito,
    // altrimenti per qualche secondo mostrerebbe il livello vecchio
    await caricaLivelliImparati();
    sync.avvia();
    window.addEventListener('hashchange', () => disegna());
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* senza service worker funziona lo stesso, solo niente offline */ });
    registraAggiornamentoRapido();
    // se il browser prende una versione nuova mentre l'app e' aperta, lo dico
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
    disegna();

    // Controllo se online c'e' gia' una versione piu' nuova: succede spesso
    // che Ste veda la v20 mentre la v21 e' gia' online da un po'.
    controllaAggiornamento().then((trovata) => {
      if (!trovata) return;
      registraAggiornamentoRapido();
      avviso(`C\'e\' la versione ${trovata.remota}: ti aggiorno.`, { durata: 3500 });
      prendiVersioneNuova();
    }).catch(() => { /* senza rete resta com'e' */ });
    if (db.MOTORE_SCELTO.tipo === 'memoria del browser') {
      avviso('Attenzione: questo browser blocca il database veloce, sto usando la memoria del browser. Tutto funziona, ma esporta un backup ogni tanto.', { durata: 9000 });
    }
  } catch (errore) {
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
 * di nascosto. Le sedute gia' fatte restano quelle che sono.
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
    id: nuovaVersioneId, scheda_id: SCHEDA_ID, numero: nuovoNumero, snapshot: pulita,
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
  V.profili = await db.tutti('profili');
  V.missioni = await db.tutti('missioni');
  V.ricompense = await db.tutti('ricompense');
  V.conflitti = await sync.conflittiDaScegliere();
}

async function seminaSeVuoto() {
  const gia = await db.tutti('esercizi');
  if (gia.length) {
    await sistemaNomeScheda();
    await risistemaCampiCarico(gia);
  } else {
    for (const e of ESERCIZI) await db.salva('esercizi', e, { segna: false });
    await db.scriviMeta('installato_il', adesso());
  }
  await seminaPersona();
}

/**
 * Rimette i tre campi che dicono come si registra il carico, dal catalogo.
 *
 * Ste (06/10/2026): "e' il buco piu' serio di tutti quelli trovati finora,
 * perche' perde dati invece di sbagliare un numero".
 *
 * Il database non ha le colonne carrucola / attrezzatura / bracciaIndipendenti,
 * quindi i campi che tornano dal server non le contengono: senza questo passaggio
 * restano persi per sempre, e l'app conta il carrello del doppio carrucola invece
 * del peso che senti. Cinque esercizi su venti diventavano OLYMPIAN e il Cable Fly
 * scendeva a GOLD: cinque su cinque erano cavi a doppia carrucola.
 *
 * Si fa qui, all'avvio, perche' il catalogo (ESERCIZI) e' l'unico posto dove quei
 * tre campi sono scritti per bene: il database non deve decidere come si registra
 * il carico. E non si rimette in coda di sincronizzazione, perche' il server
 * quella coda non la puo' ricevere.
 */
async function risistemaCampiCarico(righe) {
  const daScrivere = riallineaEsercizi(ESERCIZI, righe);
  for (const r of daScrivere) await db.salva('esercizi', r, { segna: false });
  return daScrivere.length;
}

/**
 * Ogni persona deve avere la sua scheda. Alla prima visita creo la scheda e la
 * versione 1 se non ci sono ancora: NON tocco i dati di nessuno, e la scheda
 * dell'altro parte come punto di partenza (gli esercizi sono gli stessi, poi
 * ognuno la modifica come vuole).
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
    snapshot: costruisciSnapshot(),
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
 * Nasce gia' compilato, ma i campi si possono cambiare dopo dal Profilo:
 * quello che finisce nel database e' l'ID dell'avatar, non l'immagine, quindi
 * lo stesso avatar si vede su tutti i dispositivi.
 */
async function seminaProfilo(p) {
  const id = accountId(p.id);
  const gia = await db.prendi('profili', id);
  if (gia) return;
  await db.salva('profili', {
    id,
    username: p.username || p.nome,
    avatar_id: p.avatar || 'vuoto',
    amministratore: !!p.amministratore,
    amici: Array.isArray(p.amici) ? p.amici.map((n) => accountId(n)) : [],
    privacy: { ...PRIVACY_PREDEFINITE },
    colore: p.colore || '#7c5cff',
  }, { segna: false });
}

/**
 * Ste ha chiesto di chiamare l'app "Palestra". La scheda gia' installata aveva
 * dentro il nome vecchio ("gym 3"), quindi lo correggo una volta sola: se un
 * giorno cambiera' di nuovo nome, qui non viene piu' toccato niente.
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

function disegna() {
  const zona = document.getElementById('app');
  if (!zona) return;
  // Ste sta in palestra con il dito sullo schermo: se dopo ogni salvataggio la
  // pagina torna in cima, sembra che il pulsante non abbia fatto niente.
  const scrollPrima = typeof window.scrollY === 'number' ? window.scrollY : 0;
  svuota(zona);
  try {
    disegnaDentro(zona);
  } catch (errore) {
    console.error('Disegno non riuscito:', errore);
    svuota(zona);
    mostraErrore(zona, errore);
    return;
  }
  if (scrollPrima > 0 && typeof window.scrollTo === 'function') {
    try { window.scrollTo(0, scrollPrima); } catch { /* in qualche browser non si puo' */ }
  }
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
  // la voce del menu in cui ti trovi viene accesa: cosi' sai sempre dove sei
  const voceAttiva = (percorso) => {
    if (percorso === '/') return rotta === '/' || rotta === '' || rotta.startsWith('/giorno') || rotta.startsWith('/seduta') || rotta.startsWith('/scheda');
    return rotta === percorso || rotta.startsWith(percorso + '/');
  };
  const voce = (href, etichetta, percorso) => el('a', {
    href: '#' + percorso,
    class: 'voce-menu' + (voceAttiva(percorso) ? ' attiva' : ''),
    testo: etichetta,
  });

  // La barra in basso e' quella che c'era prima, con tre voci nuove. Storico,
  // Progressi e Impostazioni restano raggiungibili dalla Casa e dal Profilo:
  // niente di quello che c'era e' sparito.
  const resto = el('div', { class: 'basso' }, [
    el('nav', { class: 'menu-basso' }, [
      voce('/', 'Allenamento', '/'),
      voce('/casa', 'Casa', '/casa'),
      voce('/rank', 'Rank', '/rank'),
      voce('/amici', 'Amici', '/amici'),
      voce('/profilo', 'Profilo', '/profilo'),
    ]),
  ]);
  return resto;
}

/**
 * Misura la barra di stato in alto e dice al CSS quanto e' alta.
 *
 * Senza questo, tutto quello che sta "appiccicato" sotto (il cronometro della
 * seduta) finiva sotto la barra o la tagliava: la barra cresce quando il
 * messaggio va a capo, e a seconda del telefono cresce di piu' o di meno.
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

  zona.appendChild(el('div', { id: 'zona-avviso' }));

  // Cambio persona: ogniuno ha il suo link. Non serve alcun account, e i dati
  // non si mescolano: sono schede e storico separati.
  if (PERSONE.length > 1) {
    const boxPersone = el('div', { class: 'scelta-persona' });
    boxPersone.appendChild(el('span', { class: 'nota', testo: 'Stai usando:' }));
    const scelte = el('div', { class: 'chip-scelte' });
    for (const p of PERSONE) {
      const attiva = p.id === personaAttiva().id;
      scelte.appendChild(bottone(p.nome, {
        onClick: () => {
          if (attiva) return;
          try { window.location.href = window.location.pathname + '?p=' + p.id + window.location.hash; }
          catch { vai('/'); }
        },
        classe: 'chip' + (attiva ? ' attivo' : ''),
      }));
    }
    boxPersone.appendChild(scelte);
    zona.appendChild(boxPersone);
  }

  // Se c'e' una seduta aperta, questa e' la cosa piu' importante della schermata:
  // la metto in cima, grossa, prima ancora del titolo. Se chiudi l'app a meta'
  // allenamento la trovi subito e la riprendi.
  db.sedutaInCorso().then((attiva) => {
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
        el('span', { testo: e.nome }),
        es.opzionale ? el('span', { class: 'tag-opzionale', testo: 'opzionale' }) : null,
      ]));
    }
    zona.appendChild(el('section', { class: 'scheda-giorno' }, [
      el('div', { class: 'riga-titoli' }, [
        // il nome del giorno si puo' toccare per vedere la scheda senza allenarsi
        el('a', { href: '#/giorno/' + g.id, class: 'titolo-collegabile', testo: g.nome }),
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
  const attiva = await db.sedutaInCorso();
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
  const seduta = await apriSeduta({ scheda_id: SCHEDA_ID, versione, giorno });
  // IMPORTANTISSIMO: senza questo ricaricamento le serie appena create non
  // sarebbero a schermo, e "+ Aggiungi serie" calcolerebbe l'ordine sbagliato.
  await ricaricaTutto();
  vai('/seduta/' + seduta.id);
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
  // le sedute gia' fatte restano intatte, non si riscrive mai la storia.
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
  // parte bassa del petto". E' anche vero il contrario: due esercizi spesso
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
  // Ste: "deve capire cosa lavora quell'esercizio e quindi capire se e'
  // difficile o facile". Ecco il secondo pezzo: se due esercizi sono sullo
  // stesso muscolo, l'app li mette in fila dal facile al duro. Serve piu'
  // del livello, perche' il livello dice "isolamento" e non dice quale dei
  // due ti fa sudare di piu'.
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
        rigaPrevista.appendChild(el('span', { class: 'sotto-campo', testo: assistito ? 'ASSISTENZA' : 'KG / RIP' }));
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
            id: nuovaVersioneId, scheda_id: SCHEDA_ID, numero: nuovoNumero,
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
    return;
  }

  zona.appendChild(el('div', { class: 'riga-pulsanti fisso' }, [
    bottone('Inizia allenamento', { onClick: () => iniziaAllenamento(g), classe: 'principale grande' }),
    el('span', { class: 'nota', testo: ultimo ? `Ultima volta: ${dataLeggibile(ultimo.data)}` : 'Non hai ancora allenato questo giorno.' }),
  ]));
}

/* ===================== vista: seduta in corso ===================== */

let timerSeduta = null;

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
  // quante serie hai spuntato: sta sempre in alto, cosi' vedi a che punto sei
  const avanzamento = el('div', { class: 'avanzamento', id: 'avanzamento-serie', testo: '' });
  zona.appendChild(el('div', { class: 'banda-cronometro' }, [
    el('div', {}, [
      el('div', { class: 'etichetta-crono', testo: 'Allenamento iniziato alle ' + oraLocale(s.ora_inizio) }),
      cronometro,
      avanzamento,
      el('div', { class: 'nota', id: 'totale-sedute', testo: '' }),
    ]),
    bottone('Allenamento finito', { onClick: () => finisceAllenamento(s), classe: 'pericolo grande' }),
  ]));

  const aggiorna = () => {
    const secondi = Math.floor((Date.now() - new Date(s.ora_inizio).getTime()) / 1000);
    const c = document.getElementById('cronometro');
    if (c) c.textContent = formattaCronometro(secondi);
    const t = document.getElementById('totale-sedute');
    if (t) t.textContent = `Durata totale: ${formattaDurata(secondi)} · non si azzera cambiando esercizio`;
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

  // Non e' async: filtra solo l'elenco che hai gia' in memoria.
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
      el('h2', { testo: e.nome }),
      // il rank di questo esercizio: record, LP e progressione
      el('a', { href: '#/esercizio/' + e.id, class: 'bottone-guarda piccolo-b', testo: 'Il suo Rank' }),
    ]));
    blocco.appendChild(el('div', { class: 'riga-convenzione' }, [
      el('span', { class: 'badge-conv', testo: ETICHETTE_CONVENZIONE[e.convenzione] || '' }),
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
  // aggiorno l'oggetto DENTRO l'array, invece di sostituirlo: cosi' anche le
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

function rigaSerie(serie, numero, confronto, seduta, pesoRigaSorella = null) {
  const e = esercizioPerId(serie.esercizio_id);
  const assistenza = e && !convenzioneMisuraCarico(e.convenzione);
  const chiave = assistenza ? 'peso_assistenza' : 'peso';

  const riga = el('div', { class: 'riga-serie', dati: { serieId: serie.id } });
  if (serie.spotter) riga.classList.add('serie-spotter');
  if (serie.ripetizioni !== null && Number(serie.ripetizioni) % 1 !== 0) riga.classList.add('serie-decimale');
  if (eFatta(serie)) riga.classList.add('serie-fatta');

  const etichettaFatta = el('span', { class: 'etichetta-fatta', testo: '' });
  riga.appendChild(etichettaFatta);

  // la spunta: segna che la serie l'hai fatta. Premendola di nuovo la togli.
  // Nota: cambio l'aspetto SUBITO e con stili scritti direttamente sul nodo,
  // cosi' non dipende dal ridisegno della pagina ne' dai nomi delle classi CSS.
  const spunta = el('button', {
    type: 'button',
    class: 'bottone-spunta' + (eFatta(serie) ? ' attiva' : ''),
    title: eFatta(serie) ? 'Serie fatta: tocca per togliere la spunta' : 'Segna questa serie come fatta',
    'aria-pressed': eFatta(serie) ? 'true' : 'false',
    onClick: (ev) => {
      registra({ cosa: 'spunta premuta', serie: serie.id, ordine: numero, esercizio: e && e.nome });
      const fatta = !eFatta(serie);
      segnaAspettoFatto(riga, spunta, fatta, etichettaFatta);
      if (fatta) pulsa();
      const campi = { stato: fatta ? 'fatta' : 'da_fare' };
      // Salvo dentro il peso che avevo quando l'ho fatta: cosi' il record resta
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

  // anche il numero della serie si puo' toccare: area piu' grande col dito
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

  const peso = campoNumero(serie[chiave], {
    etichetta: assistenza ? 'kg di assistenza' : 'kg',
    onCambio: conRitardo((v) => aggiornaSerie(serie, { [chiave]: Number(String(v).replace(',', '.')) })),
    onInvalido: (v) => avviso('Non riesco a capire il numero "' + v + '". Il campo com\'era com\'era rimane com\'era.', { tipo: 'errore' }),
  });
  peso.classList.add('campo-peso');

  // In palestra non si scrive: si tocca. Ste ha detto che i +/- 2,5 kg non gli
  // servono (li fa a mano), quindi lascio solo "come sopra", che copia il peso
  // della serie precedente: e' il caso piu' comune e non si puo' fare a mano
  // senza rileggere il numero.
  const scriviPeso = (valore) => {
    const tondo = Math.round(valore * 100) / 100;
    peso.value = String(tondo).replace('.', ',');
    perView[chiave] = tondo;
    aggiornaSerie(serie, { [chiave]: tondo });
  };
  const rigaPeso = el('div', { class: 'gruppo-peso' }, [
    peso,
    el('span', { class: 'sotto-campo', testo: assistenza ? 'ASSISTENZA' : 'KG' }),
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

  const rip = campoNumero(serie.ripetizioni, {
    etichetta: 'ripetizioni',
    onCambio: conRitardo((v) => aggiornaSerie(serie, { ripetizioni: Number(String(v).replace(',', '.')) })),
    onInvalido: (v) => avviso('Le ripetizioni dev\'essere un numero. Provo a lasciare com\'era.', { tipo: 'errore' }),
  });
  rip.addEventListener('input', () => {
    const v = rip.value === '' ? null : Number(rip.value.replace(',', '.'));
    if (v === null || Number.isFinite(v)) { perView.ripetizioni = v; scriviBadgeSpotter(); }
  });
  rip.classList.add('campo-rip');
  riga.appendChild(el('label', { class: 'campetto' }, [rip, el('span', { class: 'sotto-campo', testo: 'RIP' })]));

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
  riga.appendChild(botSpotter);
  riga.appendChild(badgeSpotter);

  const campiAssistite = el('div', { class: 'gruppo-assistite' });
  if (serie.spotter) {
    const ass = campoNumero(serie.rip_assistite, {
      etichetta: 'ripetizioni assistite',
      onCambio: conRitardo((v) => aggiornaSerie(serie, { rip_assistite: v === null ? null : Number(String(v).replace(',', '.')) })),
    });
    ass.addEventListener('input', () => {
      const v = ass.value === '' ? null : Number(ass.value.replace(',', '.'));
      if (v === null || Number.isFinite(v)) { perView.rip_assistite = v; scriviBadgeSpotter(); }
    });
    ass.classList.add('piccolo');
    campiAssistite.appendChild(el('label', { class: 'campetto' }, [
      ass, el('span', { class: 'sotto-campo', testo: 'ASSISTITE' }),
    ]));
    // il "non specificato" lo dice gia' il badge qui accordo alla serie
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

  // dropset: 3 giri extra
  if (serie.dropset) {
    const extra = el('div', { class: 'dropset' });
    extra.appendChild(el('div', { class: 'etichetta-dropset', testo: 'Dropset: aggiungi i giri successivi' }));
    const giri = Array.isArray(serie.giri_extra) ? serie.giri_extra.slice() : [];
    while (giri.length < GIRI_DROPSET) giri.push({ peso: null, ripetizioni: null });
    giri.slice(0, GIRI_DROPSET).forEach((g, idx) => {
      const gp = campoNumero(g.peso, {
        etichetta: 'giro peso',
        onCambio: conRitardo((v) => aggiornaSerie(serie, { giri_extra: aggiornaGiro(giri, idx, 'peso', v) })),
      });
      const gr = campoNumero(g.ripetizioni, {
        etichetta: 'giro ripetizioni',
        onCambio: conRitardo((v) => aggiornaSerie(serie, { giri_extra: aggiornaGiro(giri, idx, 'ripetizioni', v) })),
      });
      extra.appendChild(el('div', { class: 'riga-dropset' }, [
        el('span', { class: 'etichetta-giro', testo: `giro ${idx + 2}` }),
        el('label', { class: 'campetto' }, [gp, el('span', { class: 'sotto-campo', testo: 'KG' })]),
        el('label', { class: 'campetto' }, [gr, el('span', { class: 'sotto-campo', testo: 'RIP' })]),
      ]));
    });
    riga.appendChild(extra);
  }

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
        pezzi.push(d === 0 ? 'assistenza uguale' : d < 0 ? `${formattaNumero(Math.abs(d))} kg di assistenza in meno` : `${formattaNumero(d)} kg di assistenza in piu'`);
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

function aggiornaGiro(giri, idx, campo, valore) {
  const copia = giri.map((g) => ({ ...g }));
  copia[idx] = { ...copia[idx], [campo]: valore === '' || valore === null ? null : Number(String(valore).replace(',', '.')) };
  return copia.slice(0, GIRI_DROPSET);
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

/** Porta in vista e lampeggia la riga appena creata, cosi' si vede subito. */
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

/** Errore breve ma sempre visibile: niente piu' errori che spariscono. */
function mostraErroreBreve(testo) {
  avviso(testo, { tipo: 'errore', durata: 9000 });
  console.error(testo);
}

async function aggiornaSerie(serie, campi) {
  // cambiaSerie rilegge la serie dal database e mette in fila i cambiamenti
  // della stessa serie: e' quello che impedisce a un campo salvato in ritardo
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
  vai('/storico/' + s.id);
  // adesso la scheda: quello che hai fatto diventa la scheda per la prossima volta
  await proponiAggiornamentoScheda(s.id);
}

/* ===================== vista: storico ===================== */

function vistaStorico(zona) {
  zona.appendChild(el('h1', { testo: 'Storico' }));
  const completate = seduteDellaPersona().filter((s) => s.stato === 'completata' && !s.eliminata)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  if (!completate.length) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Nessuna seduta registrata. Quando finisci il primo allenamento lo troverai qui.' }));
    return;
  }
  zona.appendChild(el('p', { class: 'nota', testo: `${completate.length} sedute. Nessun dato inventato: qui ci sono solo allenamenti che hai chiuso davvero.` }));
  const elenco = el('div', { class: 'elenco-sedute' });
  for (const s of completate) {
    const serie = V.serie.filter((x) => x.seduta_id === s.id && !x.eliminata);
    const r = el('a', { href: '#/storico/' + s.id, class: 'riga-seduta' }, [
      el('img', { src: 'img/logo.png', alt: '', class: 'logo-seduta' }),
      el('div', {}, [
        el('strong', { testo: `${s.nome_giorno || 'Seduta'} — ${dataLeggibile(s.data)}` }),
        el('div', { class: 'nota', testo: `${oraLocale(s.ora_inizio)} → ${oraLocale(s.ora_fine)} · durata ${formattaDurata(s.durata_secondi)} · ${serie.length} serie` }),
        // l'anteprima delle note: cosi' le ritrovi senza aprire ogni seduta
        s.note ? el('div', { class: 'anteprima-nota', testo: '“' + String(s.note).slice(0, 90).replace(/\s+/g, ' ') + '”' }) : null,
      ]),
    ]);
    elenco.appendChild(r);
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
  // qui sotto. Prima sparivano: le scrivevi e non le ritrovavi piu'.
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
      el('h3', { testo: e.nome }),
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
  const assistenza = !convenzioneMisuraCarico(e.convenzione);
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

  const peso = campoNumero(serie[chiave], {
    onCambio: conRitardo((v) => aggiornaSerie(serie, { [chiave]: v === '' ? null : Number(String(v).replace(',', '.')) })),
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
      el('span', { class: 'sotto-campo', testo: assistenza ? 'ASSISTENZA' : 'KG' }),
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

  const rip = campoNumero(serie.ripetizioni, {
    onCambio: conRitardo((v) => aggiornaSerie(serie, { ripetizioni: v === '' ? null : Number(String(v).replace(',', '.')) })),
  });
  rip.classList.add('campo-rip');
  riga.appendChild(el('label', { class: 'campetto' }, [rip, el('span', { class: 'sotto-campo', testo: 'RIP' })]));

  // lo spotter: come in palestra, si vede subito e si può togliere
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
  riga.appendChild(badgeSpotter);

  const assistite = el('div', { class: 'gruppo-assistite' });
  if (perView.spotter) {
    const ass = campoNumero(serie.rip_assistite, {
      onCambio: conRitardo((v) => aggiornaSerie(serie, { rip_assistite: v === '' ? null : Number(String(v).replace(',', '.')) })),
    });
    ass.classList.add('piccolo');
    assistite.appendChild(el('label', { class: 'campetto' }, [
      ass, el('span', { class: 'sotto-campo', testo: 'ASSISTITE' }),
    ]));
  }
  riga.appendChild(assistite);
  if (serie.nota) riga.appendChild(el('div', { class: 'nota-serie', testo: serie.nota }));
  return riga;
}

/* ===================== vista: scheda ===================== */

/**
 * La scheda in editing vive qui fuori, non dentro la schermata.
 * Prima la ricreavo a ogni ridisegno e cosi' tutto quello che avevi spostato
 * o tolto spariva: le frecce sembravano premute ma non cambiava niente.
 */
let bozzaAttiva = null;

function prendiBozza() {
  const v = versioneCorrente();
  if (!v) return null;
  if (!bozzaAttiva || bozzaAttiva.versioneId !== v.id) {
    bozzaAttiva = { versioneId: v.id, dati: JSON.parse(JSON.stringify(v.snapshot)) };
  }
  return bozzaAttiva.dati;
}

function scartaBozza() { bozzaAttiva = null; }

function vistaScheda(zona) {
  const v = versioneCorrente();
  if (!v) return;
  const bozza = prendiBozza();
  if (!bozza) return;
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
          id: nuovaVersioneId, scheda_id: SCHEDA_ID, numero: nuovoNumero, snapshot: JSON.parse(JSON.stringify(nuova)),
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

function scegliEsercizio(bozza, g) {
  const usati = new Set(g.esercizi.map((x) => x.esercizio_id));
  const liberi = V.esercizi.filter((e) => !usati.has(e.id));
  if (!liberi.length) { avviso('In questo giorno ci sono gia\' tutti gli esercizi.'); return; }
  const box = el('div', { class: 'sfondo-dialogo' });
  const lista = el('div', { class: 'dialogo dialogo-largo' }, [el('h3', { testo: 'Aggiungi a ' + g.nome })]);
  for (const e of liberi) {
    lista.appendChild(bottone('', {
      onClick: () => {
        g.esercizi.push({
          id: 'es-' + nuovoId(), ordine: g.esercizi.length + 1, esercizio_id: e.id,
          opzionale: false, nota: '', serie: [{ peso: null, peso_assistenza: null, ripetizioni: null, dropset: false }],
        });
        box.remove();
        disegna();
      },
      classe: 'voce-scelta',
      figli: [el('img', { src: e.foto, alt: '', class: 'foto-esercizio' }), el('span', { testo: e.nome })],
    }));
  }
  lista.appendChild(bottone('Annulla', { onClick: () => box.remove(), classe: 'fantasma' }));
  box.appendChild(lista);
  box.addEventListener('click', (ev) => { if (ev.target === box) box.remove(); });
  document.body.appendChild(box);
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

  // Ste (04/10/2026): "voglio il rapporto peso potenza quindi in base al peso
  // corporeo". E poi: "con kg intendo il peso che alzo in piu' rispetto al mio
  // corpo... io peso 66kg e faccio 96 di lat machine, alzo 30kg in piu'".
  //
  // Va PRIMA di tutto il resto, perche' e' la domanda vera: "sto migliorando?"
  // I kg da soli non lo dicono, perche' se il peso sale le soglie salgono e i
  // kg possono salire senza che tu sia piu' forte.
  const pesoOraProgressi = pesoCorporeoOra();
  if (pesoOraProgressi) {
    const prestazioniOra = prestazioniDiQuestaPersona();
    const media = mediaPrestazioni(prestazioniOra);
    const boxForza = el('div', { class: 'spiegazione generale' });
    boxForza.appendChild(el('h3', { testo: 'Quanto stai sollevando in più del tuo corpo' }));
    if (media.media === null) {
      boxForza.appendChild(el('p', { class: 'nota', testo: 'Non ci sono ancora esercizi con un peso registrato.' }));
    } else {
      boxForza.appendChild(el('p', {
        class: 'nota numero-grande',
        testo: `${formattaNumero(media.percentuale)}%`,
      }));
      boxForza.appendChild(el('p', {
        class: 'nota nota-piccola',
        testo: `La percentuale è quanto hai sollevato rispetto a quello che ci si aspetta `
          + `da una persona forte come te, su quel pezzo. 100% vuol dire che l'hai eguagliato, `
          + `sotto il 100% che ti manca, sopra il 100% che lo hai superato. `
          + `È calcolata sul tuo corpo di ${formattaNumero(pesoOraProgressi)} kg, `
          + `su ${media.conta} esercizi${media.saltate ? ` (ne ho esclusi ${media.saltate})` : ''}.`,
      }));
      boxForza.appendChild(el('p', {
        class: 'nota nota-piccola',
        testo: 'Sopra il 100% vuol dire che hai superato il livello di chi si allena bene: '
          + 'i numeri di riferimento sono stime prudenti, e se per te sono sbagliati, '
          + 'il numero giusto è quello che dici tu.',
      }));
      boxForza.appendChild(el('p', {
        class: 'nota nota-piccola',
        testo: 'Le gambe non contano nella media: i loro numeri sono troppo alti e la farebbero saltare. '
          + 'Restano visibili uno per uno, però.',
      }));
    }
    zona.appendChild(boxForza);

    // Ste (04/10/2026): "voglio che dica chi in generale e' piu' forte, facendo
    // una media, e sia che si vedano tutti gli esercizi facendo vedere chi fa di
    // piu'" e "non voglio solo che si veda chi e' il piu' forte: voglio vedere gli
    // altri".
    //
    // Tutti gli esercizi in elenco, ognuno con i kg e il rapporto, e in alto la
    // media. Una classifica che mostra solo il primo e' una pubblicita': qui si vede
    // anche dove hai i numeri piu' bassi, che e' la parte che serve a capire.
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
  // grafici da solo non capisce, quindi la risposta principale e' in parole.
  const boxGenerale = el('div', { class: 'spiegazione generale' });
  boxGenerale.appendChild(el('h3', { testo: 'In generale, quanto sei migliorato' }));
  const spazioGenerale = el('div', { id: 'riepilogo-generale' });
  boxGenerale.appendChild(spazioGenerale);
  zona.appendChild(boxGenerale);
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
  // Ste ha fatto cosi': durante l'allenamento ha alzato di 3 kg e poi ha
  // confermato "Aggiorna la scheda". A quel punto la scheda corrente contiene
  // gia' 38 kg, quindi confrontare la seduta con lei dava zero e l'esercizio
  // finiva fra i "fermi". Invece va confrontato con la scheda che hai usato
  // mentre allenavi: e quella e' ancora salvata, e' la versione della seduta.
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
      // sotto compare la lista esercizio per esercizio con di quanto e' cambiato.
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

function vistaImpostazioni(zona) {
  zona.appendChild(el('h1', { testo: 'Impostazioni' }));

  const statoBox = el('section', { class: 'blocco' });
  statoBox.appendChild(el('h2', { testo: 'Salvataggio e sincronizzazione' }));
  const lineaStato = el('p', { class: 'nota', id: 'stato-dettaglio', testo: 'Sto controllando...' });
  statoBox.appendChild(lineaStato);
  statoBox.appendChild(el('div', { class: 'riga-pulsanti' }, [
    bottone('Sincronizza adesso', { onClick: async () => { const r = await sync.sincronizza(); await aggiornaStatoSalvataggio(); avviso(r.messaggio || 'Sincronizzazione fatta.', { tipo: 'ok' }); }, classe: 'fantasma' }),
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
        // Prima prova il modo pulito: se online c'e' la versione nuova prende
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
  const accountBox = el('details', { class: 'blocco blocco-chiuso' });
  accountBox.appendChild(el('summary', {}, [
    el('h2', { testo: 'Sincronizzazione online (opzione avanzata)' }),
  ]));
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
            try { await sb.accedi(mail.value, pass.value); avviso('Accesso riuscito.', { tipo: 'ok' }); await ricaricaTutto(); disegna(); }
            catch (e) { avviso('Accesso non riuscito: ' + e.message, { tipo: 'errore', durata: 8000 }); }
          },
          classe: 'principale',
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
  zona.appendChild(accountBox);

  const backupBox = el('section', { class: 'blocco' });
  backupBox.appendChild(el('h2', { testo: 'Backup' }));
  backupBox.appendChild(el('p', { class: 'nota', testo: 'Il backup e\' un file tuo, salvato dove vuoi tu. E\' separato dalla sincronizzazione: cancellare una cosa dall\'account non cancella il backup.' }));
  backupBox.appendChild(el('div', { class: 'riga-pulsanti' }, [
    bottone('Scarica il backup JSON', { onClick: () => esportaJson(), classe: 'principale' }),
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

async function esportaJson() {
  const dati = await db.esportaTutto();
  const pacchetto = creaPacchetto({
    esercizi: dati.esercizi, schede: dati.schede, versioni: dati.versioni,
    sedute: dati.sedute, serie: dati.serie, note: dati.note, conflitti: dati.conflitti,
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
  const t = oggetto.tabelle;
  for (const tabella of ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note', 'profili', 'missioni', 'ricompense']) {
    const righe = t[tabella] || [];
    if (modo === 'sostituzione') {
      for (const riga of await db.tutti(tabella, { includiEliminati: true })) {
        await db.salva(tabella, { ...riga, eliminata: true });
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
    oggi,
  });
}

/** I record di ogni account che ha allenato qualcosa su questo dispositivo. */
function vociPerClassifica() {
  const voci = [];
  for (const p of PERSONE) {
    const id = accountId(p.id);
    const profilo = profiloDi(id) || { id, username: p.username || p.nome, avatar_id: p.avatar || 'vuoto', amici: (p.amici || []).map((n) => accountId(n)), privacy: PRIVACY_PREDEFINITE };
    const miei = seduteDellaPersonaPer(p);
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
      profilo,
    });
  }
  return voci;
}

/** Le sedute di una persona precisa (non solo di quella attiva). */
function seduteDellaPersonaPer(p) {
  const idScheda = p.schedaId;
  const versioni = (V.versi || []).filter((v) => v.scheda_id === idScheda);
  const miei = new Set(versioni.map((v) => v.id));
  return (V.sedute || []).filter((s) => miei.has(s.versione_id));
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
 * Ste (06/10/2026): "con 3 serie sei al massimo del tuo range e il passo dopo e'
 * lontanissimo". Guardando il suo Dumbbell Bench Pull: barra PIENA, scritta
 * "3 LP", e la frase sotto diceva solo "Sei sul rank piu' alto".
 *
 * Il equivoco e' che "3 LP" sembrava una progressione quasi finita dentro un rango,
 * mentre non c'e' nessun rango sopra l'OLYMPIAN: li' gli LP crescono senza tetto, e
 * il conto e' semplicemente "(quanto sei sopra la soglia) x 100". Quindi 3 LP vuol
 * dire "3% sopra la soglia dell'OLYMPIAN", non "hai quasi finito".
 *
 * La barra resta piena perche' non c'e' niente da riempire: non esiste un passo
 * successivo. Ma l'etichetta deve dirlo, altrimenti una barra piena con "3 LP" a
 * fianco si legge al contrario. Un posto solo per la regola, cosi' la card e la
 * pagina dell'esercizio non possono dire cose diverse.
 */
/**
 * L'avvertenza che va sotto la distanza alla soglia, in UN posto solo.
 *
 * Ste (06/10/2026): "la colonna 'manca alla prossima' mente... quindi 'manca 0,15
 * kg' e' una precisione che non esiste. E' la stessa cosa che mi hai detto tu: se non
 * lo sai misurarlo, non scriverlo come se fosse misurato".
 *
 * Il numero e' una percentuale adesso, non i kg (vedi distanzaAllaSoglia), e la
 * percentuale ha un vantaggio che si vede subito: 1 kg di peso corporeo sposta la
 * soglia di circa l'1,5%, quindi se ti manca lo 0,3% la risposta onesta non e' "ti
 * manca cosi' poco", e' "non lo so ancora". Questa frase e' quella risposta.
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
  // Quando il bonus e' stato fermato, i LP NON sono la posizione nella fascia: sono
  // il posto dove ti hanno portato dentro. Scrivere "/ 100" accanto a una barra
  // mezza piena e' una promessa falsa, quindi l'etichetta non lo promette piu'.
  if (record.bonusBloccato) return `${record.lp} LP`;
  return `${record.lp} LP / 100`;
}

function barraProgresso(frazione, etichetta) {
  const f = Math.max(0, Math.min(1, Number(frazione) || 0));
  return el('div', { class: 'barra-progresso' }, [
    el('div', { class: 'barra-piena', style: `width:${Math.round(f * 1000) / 10}%` }),
    etichetta ? el('span', { class: 'barra-etichetta', testo: etichetta }) : null,
  ]);
}

function avatarNodo(profilo, { grande = false, dimensione = 46 } = {}) {
  const a = avatarPerId(profilo && (profilo.avatar_id || (profilo.avatar)));
  const nome = (profilo && (profilo.username || profilo.nome)) || '??';
  const stile = `background:${gradienteAvatar(a.id)};width:${dimensione}px;height:${dimensione}px;font-size:${Math.round(dimensione / 3.2)}px`;
  return el('span', { class: 'avatar' + (grande ? ' avatar-grande' : ''), style: stile, titolo: nome }, [
    iniziali(nome),
  ]);
}

function teschioStreak(st) {
  const f = st.fuoco;
  // Ste: "sul profilo dove c'e' la streak c'e' scritto 2 2 giorni, ripete il
  // numero 2 volte". Il numero grande e la parola "giorni" dicevano la stessa
  // cosa: "2 giorni" due volte di fila. Ora il numero sta nel badge e la
  // parola nella nota, ma senza ripeterlo.
  const n = f.acceso ? `${f.giorni} ${f.giorni === 1 ? 'giorno' : 'giorni'}` : 'spenta';
  return el('div', {
    class: 'teschio-streak' + (f.acceso ? ' acceso' : ' spenta'),
    style: `--fuoco:${f.colore}`,
  }, [
    el('span', { class: 'fuoco', testo: f.acceso ? String(f.giorni) : '·' }),
    el('div', {}, [
      // nel badge grande il numero non serve (c'e' gia' a sinistra): metto il
      // nome dello stato, cosi' non si ripete
      el('strong', { testo: f.acceso ? f.nome : 'spenta' }),
      el('span', { class: 'nota', testo: n }),
    ]),
  ]);
}

function teschioAura(st) {
  return el('div', { class: 'teschio-aura' }, [
    el('span', { class: 'simbolo', testo: 'AURA' }),
    el('strong', { testo: formattaAura(st.aura) }),
    el('span', { class: 'nota', testo: `livello ${st.livello.livello} · ${formattaNumero(st.livello.xp)} XP` }),
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

  // Hai allenato, ma sei ancora sotto la soglia del primo rank: non e' un
  // errore e non e' "nessuna prestazione". Lo dico con le parole giuste e
  // faccio vedere quanto manca, cosi' Ste vede che il Rank funziona e che
  // il prossimo obiettivo e' vicino.
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
  const verso = r.inTop
    ? `Sei nel rank piu' alto: non c'e' un passo dopo, e ogni LP e' un punto di percentuale sopra la soglia dell'OLYMPIAN (+${r.lp}% adesso).`
    : `${formattaNumero((r.prossimoObiettivo || {}).punteggio)} ${profilo.unita} per ${(r.prossimoObiettivo || {}).etichetta || r.prossimoRank.nome}`
      + (distanza && distanza.inGioco ? ` (ti manca lo ${formattaNumero(distanza.percentuale)}%)` : '');
  return el('div', { class: 'card-rank card-' + r.rankId + (compatta ? ' compatta' : '') }, [
    el('div', { class: 'card-rank-alto' }, [
      el('div', {}, [
        el('span', { class: 'nota', testo: nome }),
        el('strong', { class: 'card-rank-nome', testo: r.testo }),
      ]),
      badgeRank(r.rankId, r.lp, r.divisione),
    ]),
    // COME E' DIFFICILE l'esercizio e QUANTO ho fatto. Ste: "aggiungi un
    // qualcosa che identifica se l'esercizio e' facile o difficile e capisce
    // se e' tanto quello che fai o poco". Il numero da solo non basta: 12 kg
    // su un isolamento sono tantissimi, su un leg press non sono niente.
    el('div', { class: 'card-rank-alto' }, [
      el('span', {
        class: 'tag-livello piccolo liv-' + (r.profilo.livello || 'composto'),
        testo: (r.profilo.livello || 'composto').toUpperCase(),
      }),
      el('span', { class: 'nota nota-piccola', testo: giudizioPerformance(r.profilo, r.punteggio).frase }),
    ]),
el('div', { class: 'card-rank-basso' }, [
      barraProgresso(r.progresso, etichettaLp(r)),
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
 * Nessun numero viene scritto dal frontend: il motore gioco.js decide cosa e'
 * stato guadagnato, qui si salvano solo le righe nuove.
 */
async function assegnaRicompense(sedutaId) {
  try {
    const nuove = ricompenseAllenamento({
      account: accountAttivo(),
      sedute: seduteMie(),
      serie: serieMie(),
      esercizi: V.esercizi,
      ricompense: ricompenseMie(),
      // anche i premi usano il peso: senza, i Rank calcolati qui non
      // corrispondono a quelli che vedi nella schermata Rank
      pesoCorporeo: pesoCorporeoOra(),
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

/* ---------- schermate ---------- */

function vistaCasa(zona) {
  const st = statoMio();
  const profilo = profiloAttivo();
  zona.appendChild(el('div', { class: 'riga-titoli' }, [
    el('h1', { testo: 'Casa' }),
    el('span', { class: 'conteggio', testo: `${profilo.username} · livello ${st.livello.livello}` }),
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
    barraProgresso(st.livello.progresso, `livello ${st.livello.livello} → ${st.livello.livello + 1}`),
    el('span', { class: 'nota', testo: `mancano ${formattaNumero(st.livello.mancano)} XP al livello ${st.livello.livello + 1}` }),
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

  // --- secret ---
  zona.appendChild(el('h2', { testo: 'Secret Missions' }));
  zona.appendChild(el('p', { class: 'nota', testo: 'Coperti finche\' non li riveli. Valgono di piu\'.' }));
  for (const voce of st.missioni.secret) zona.appendChild(tesseraMissione(voce));

  // --- cronologia delle sfide fatte ---
  // Ste l'ha chiesto: com'e' che si fa a vedere tutte le sfide che hai
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
  // Ste: "dove si mette il peso?". Il peso sta gia' nel Profilo, ma non si
  // capiva. Qui lo dico con parole chiare e ci metto il link per andarlo a
  // mettere, cosi' si trova in due secondi.
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
  zona.appendChild(el('h2', { testo: 'Allenamento e storico' }));
  zona.appendChild(el('div', { class: 'riga-pulsanti' }, [
    el('a', { href: '#/', class: 'bot fantasma', testo: 'Allenamento' }),
    el('a', { href: '#/storico', class: 'bot fantasma', testo: 'Storico' }),
    el('a', { href: '#/progressi', class: 'bot fantasma', testo: 'Progressi' }),
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
    else sezioneConfronto(st);
  }

  function sezioneMieiRank(stato) {
    contenitore.appendChild(el('p', { class: 'nota', testo: 'Il rank di ogni esercizio e\' tuo e basta: le soglie sono diverse per ogni esercizio, quindi 50 kg di una cosa non valgono 50 kg di un\'altra.' }));
    if (!stato.record.length) {
      // Ste: "non ho capito perche' non spunta niente se ho gia' messo il mio
      // peso". Il peso NON c'entra: un rank compare solo quando la seduta e'
      // stata CHIUSA. Prima era scritto solo "chiudi un allenamento", che non
      // diceva che il peso e' gia' salvato e che quindi il problema e' un
      // altro. Ora lo spiego per bene e dico subito cosa fare.
      const aperta = seduteMie().find((s) => s && !s.eliminata && s.stato !== 'completata');
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

      // Il peso corporeo: confermiamo che l\'ha gia' messo, cos\'e\' non
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
    const classifiche = classifichePerEsercizio(vociPerClassifica(), V.esercizi);
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

function vistaEsercizio(zona, esercizioId) {
  const e = esercizioPerId(esercizioId);
  if (!e) { zona.appendChild(el('p', { testo: 'Esercizio non trovato.' })); return; }
  const serie = (V.serie || []).filter((x) => x && !x.eliminata && x.esercizio_id === e.id);
  // il peso corporeo di adesso serve per le prestazioni che non hanno ancora
  // un peso salvato dentro; quelle vecchie mantengono il loro
  const pesoOggi = pesoCorporeoOra();
  const record = recordEsercizio(serie, e, null, pesoOggi);
  const profilo = record.profilo || profiloEsercizio(e);

  zona.appendChild(el('a', { href: '#/rank', class: 'indietro', testo: 'Torna ai Rank' }));
  zona.appendChild(el('h1', { testo: e.nome }));

  // COME E' DIFFICILE questo esercizio. Ste: "aggiungi un qualcosa che
  // identifica se l'esercizio e' facile o difficile". Il numero da solo non
  // dice niente: 12 kg su un isolamento sono tanti, su un leg press sono niente.
  zona.appendChild(el('div', { class: 'riga-livello' }, [
    el('span', { class: 'tag-livello liv-' + (profilo.livello || 'composto'), testo: descrizioneLivello(profilo.livello) }),
  ]));

  // QUALE PEZZO DI MUSCOLO. Ste: "il petto come il bicipite e le altre parti
  // sono formati da diverse fibre muscolari e ci sono esercizi che servono
  // per la parte alta e altri per la parte bassa del petto".
  //
  // (Con un aggiustamento: non sono fibre diverse ma capi diversi dello stesso
  // muscolo. Infatti qui sotto c'e' l'avvertimento, che spiega la cosa come si
  // sta davvero invece di dirgli una cosa che non e' vera.)
  const parte = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
  if (parte.trovata) {
    zona.appendChild(el('div', { class: 'riga-giudizio giud-parte' }, [
      el('strong', { testo: 'DOVE LAVORA' }),
      el('span', { testo: parte.nome }),
      el('span', { class: 'nota nota-piccola', testo: parte.nota }),
      el('span', { class: 'nota nota-piccola', testo: AVVERTIMENTO_PARTI }),
    ]));

    // Ste: "deve capire cosa lavora quell'esercizio e quindi capire se e'
    // difficile o facile". Sapere il muscolo serve proprio a questo: un
    // carico bassissimo sul deltoide laterale e' piu duro di uno medio sul
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

  // spiego sempre come sono fatte le soglie di questo esercizio, e dico se il
  // peso corporeo lo sta cambiando
  const rigaSoglie = [ETICHETTE_MISURA[profilo.misura]];
  if (profilo.pesoConsiderato) {
    rigaSoglie.push(`soglie calcolate sul tuo peso: ${formattaNumero(profilo.pesoCorporeo)} kg`);
  } else if (profilo.misura === 'kg_reps' || profilo.misura === 'kg_tempo') {
    rigaSoglie.push('metti il tuo peso nel profilo e le soglie si adattano');
  }
  zona.appendChild(el('p', { class: 'nota', testo: `${rigaSoglie.join(' · ')}. Soglie: ${profilo.soglie.map((s, i) => `${RANK[i].nome} da ${formattaNumero(s)}`).join(' · ')}` }));

  // Ste: "deve capire ancora meglio i rank e le difficolta'". Ora il muscolo
  // entra nella soglia, e se non lo dico l'app ti chiede solo perche' la tua
  // soglia e' piu' bassa di quanto ti aspettavi: la spiegazione c'e', ma
  // invisibile. Peggio: sembrerebbe un errore.
  const spiegazione = rapportoDifficolta(e).spiegazione;
  if (spiegazione) {
    zona.appendChild(el('p', { class: 'nota nota-piccola', testo: `La soglia è più bassa perché ${spiegazione}.` }));
  }

  if (!record.valido) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Nessuna prestazione registrata su questo esercizio: ancora nessun rank.' }));
    return;
  }

  // QUANTO HO FATTO, in parole. Ste: "capisce se e' tanto quello che fai o
  // poco". Il giudizio tiene conto anche del livello di difficolta'.
  const giudizio = giudizioPerformance(profilo, record.punteggio);
  if (giudizio.valido) {
    zona.appendChild(el('div', { class: 'riga-giudizio giud-' + giudizio.giudizio }, [
      el('strong', { testo: 'QUANTO HAI FATTO' }),
      el('span', { testo: giudizio.frase }),
    ]));
  }

  // QUANTO E' PESANTE PER TE. Il giudizio qui sopra guarda il NOME
  // dell'esercizio; questo guarda il TUO numero: se spingi 40 kg in chest press
  // e 4 kg qui, per te questo esercizio e' leggero anche se il nome sembra duro.
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
      barraProgresso(record.progresso, etichettaLp(record)),
      el('span', {
        class: 'nota',
        testo: record.inTop
          ? `Sei sul rank piu' alto: non c'e' un passo dopo, e ogni LP e' un punto di percentuale sopra la soglia dell'OLYMPIAN (+${record.lp}% adesso).`
          : `${formattaNumero((record.prossimoObiettivo || {}).punteggio)} ${profilo.unita} per ${(record.prossimoObiettivo || {}).etichetta || record.prossimoRank.nome}.`
            + (distanzaObiettivo(record) ? ` (ti manca lo ${formattaNumero(distanzaObiettivo(record).percentuale)}%)` : ''),
      }),
      el('span', { class: 'nota nota-piccola', testo: AVVERTIMENTO_STIMA_SOGLIA }),
      record.spiegaBonus ? el('span', { class: 'nota nota-piccola', testo: record.spiegaBonus }) : null,
    ]),
  ]));

  // posizione nella classifica di questo esercizio
  const classifiche = classifichePerEsercizio(vociPerClassifica(), V.esercizi);
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
  // QUI SI DICE CHE IL NUMERO E' UNA STIMA, e non e' una pigna.
  //
  // Ste (06/10/2026): "18.86 viene da un massimale stimato su 5 rip con un
  // movimento corto, e quindi e' una stima dentro una stima... se ti sembra troppo, il
  // numero da cambiare e' la base della percentuale, non questo riferimento".
  //
  // Ha ragione: il riferimento e' un numero scelto e va bene cosi'. Il fragile e' il
  // massimale, che qui e' stimato dai kg e dalle ripetizioni con una formula (Epley
  // fino a 10 rip, Brzycki sopra). E' un calcolo fatto con una regola, non una
  // misura, e su un movimento corto con poche ripetizioni e' il caso peggiore: il
  // peso sul cavo finisce prima che il muscolo ceda, quindi la stima sbaglia verso
  // l'alto. Per questo su un isolamento il Rank qui e' indicativo: la stessa serie
  // puo' valere mezzo rank di piu' o di meno a seconda di quanto hai indovinato.
  //
  // Non ci scrivo "stimato" nel numero perche' Ste (04/10/2026) ha chiesto
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
  const profilo = profiloAttivo();
  const voci = vociPerClassifica();
  const amici = amiciDi(profilo, voci.map((v) => ({ ...v.profilo, id: v.account })));

  zona.appendChild(el('p', { class: 'nota', testo: 'Vedi solo gli account che hai autorizzato. Ognuno vede solo quello che ha deciso di mostrare.' }));

  if (!amici.length) {
    zona.appendChild(el('p', { class: 'nota', testo: 'Non hai ancora amici.' }));
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
      }) : null;
      zona.appendChild(el('div', { class: 'riga-amico' }, [
        avatarNodo(a, { dimensione: 54 }),
        el('div', { class: 'cresci' }, [
          el('strong', { testo: a.username }),
          el('span', { class: 'nota', testo: suoStato
            ? `livello ${suoStato.livello.livello} · ${formattaAura(suoStato.aura)} Aura · ${suoStato.streak.attiva ? suoStato.streak.giorni + ' giorni di fila' : 'streak spenta'}`
            : 'nessun allenamento registrato' }),
          el('span', { class: 'nota', testo: suoStato && suoStato.rankPrincipale
            ? 'rank migliore: ' + suoStato.rankPrincipale.rank.nome : '' }),
        ]),
        el('a', { href: '#/amico/' + a.id, class: 'bottone-guarda', testo: 'Confronta' }),
      ]));
    }
  }

  // amici che ancora non hanno un account con una scheda
  if (CONTATTI && CONTATTI.length) {
    zona.appendChild(el('h2', { testo: 'Persone che puoi aggiungere' }));
    for (const c of CONTATTI) {
      zona.appendChild(el('div', { class: 'riga-amico' }, [
        avatarNodo({ avatar_id: c.avatar, username: c.username }, { dimensione: 44 }),
        el('div', { class: 'cresci' }, [
          el('strong', { testo: c.username }),
          el('span', { class: 'nota', testo: (c.gruppo ? 'Gruppo: ' + c.gruppo + ' · ' : '') + 'Non ha ancora un account con una scheda: appena ne crea uno lo vedrai qui e in classifica.' }),
        ]),
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
      ? el('ul', { class: 'lista-sedute-amico' }, voce.sedute.slice(0, 20).map((s) => el('li', {
        testo: `${s.nome_giorno || 'Allenamento'} · ${s.data} · ${s.serie_fatte || 0} serie`,
      })))
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

  // l'avatar grande e centrale, come nei giochi
  const testa = el('div', { class: 'testa-profilo' }, [
    avatarNodo(profilo, { grande: true, dimensione: 120 }),
    el('h2', { testo: profilo.username }),
    el('p', { class: 'nota', testo: `Livello ${st.livello.livello} · ${formattaAura(st.aura)} Aura` }),
    el('div', { class: 'riga-teschio piccolo' }, [teschioStreak(st)]),
  ]);
  zona.appendChild(testa);

  zona.appendChild(el('div', { class: 'blocco-progresso-livello' }, [
    barraProgresso(st.livello.progresso, `livello ${st.livello.livello}`),
    el('span', { class: 'nota', testo: `al livello ${st.livello.livello + 1} mancano ${formattaNumero(st.livello.mancano)} XP` }),
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
      await segnaPeso(n, { account: accountAttivo() });
      avviso(`Peso salvato: ${formattaNumero(n)} kg. I Rank sono aggiornati.`, { tipo: 'ok' });
      await aggiornaPesoInMemoria();
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
    boxPeso.appendChild(el('div', { class: 'nota', testo: 'Il tuo storico' }));
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

  // statistiche vere
  zona.appendChild(el('section', { class: 'blocco' }, [
    el('h2', { testo: 'Statistiche' }),
    el('div', { class: 'griglia-numeri' }, [
      numeroGrande('Allenamenti', st.statistiche.seduteCompletate),
      numeroGrande('Giorni allenati', st.statistiche.giorniAllenati),
      numeroGrande('Esercizi con record', st.statistiche.eserciziConRecord),
      numeroGrande('Missioni fatte', st.missioniCompletate),
      numeroGrande('Aura', st.aura),
      numeroGrande('Livello', st.livello.livello),
    ]),
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
    el('p', { class: 'nota', testo: 'Scegli cosa gli altri possono vedere. Quando chiudi una cosa, non la vedono piu\': non viene solo nascosta.' }),
  ]);
  const scelte = el('div', { class: 'chip-scelte' });
  // Due stati, come prima: o si vede da tutti o da nessuno. Il codice 030226
  // è stato tolto, quindi non c'è più lo stato "chiuso" (visibile solo a chi
  // aveva il codice): resta la privacy normale.
  const DOPO_CLIC = { privato: 'pubblico', pubblico: 'privato' };
  const SPIEGA = {
    privato: 'privato: non lo vede nessuno',
    pubblico: 'pubblico: lo vede tutto il mondo',
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
  const daChiedere = await paroleDaChiedere(accountAttivo(), V.esercizi);
  if (daChiedere.length) {
    const boxParole = el('div', { class: 'box-parole' }, [
      el('h3', { testo: 'Parole che non conosco' }),
      el('p', { class: 'nota nota-piccola', testo: 'Non ti chiedo niente che già so: solo le parole che mi sfuggono. Rispondi una volta sola e non te lo chiedo più.' }),
    ]);
    for (const voce of daChiedere) {
      const riga = el('div', { class: 'riga-parola-da-chiedere' }, [
        el('span', { class: 'parola', testo: voce.parole.join(', ') }),
        el('span', { class: 'nota', testo: voce.nome }),
      ]);
      for (const [id, testo] of [['grande', 'GRANDE'], ['composto', 'COMPOSTO'], ['isolamento', 'ISOLAMENTO'], ['assistito', 'RIPETIZIONI']]) {
        riga.appendChild(bottone(testo, {
          onClick: async () => {
            for (const parola of voce.parole) await imparaParola(accountAttivo(), parola, id);
            avviso('Ok, imparato. Non te lo chiedo più.', { tipo: 'ok' });
            disegna();
          },
          classe: 'chip' + (voce.livoloIndovinato === id ? ' attivo' : ''),
        }));
      }
      boxParole.appendChild(riga);
    }
    zona.appendChild(boxParole);
  }

  zona.appendChild(el('div', { class: 'riga-pulsanti' }, [
    el('a', { href: '#/storico', class: 'bot fantasma', testo: 'Storico' }),
    el('a', { href: '#/progressi', class: 'bot fantasma', testo: 'Progressi' }),
    el('a', { href: '#/impostazioni', class: 'bot fantasma', testo: 'Impostazioni' }),
  ]));
  if (profilo.amministratore) {
    zona.appendChild(el('div', { class: 'riga-pulsanti' }, [
      bottone('+ CREA ESERCIZIO', { onClick: () => finestraCreaEsercizio(), classe: 'principale' }),
    ]));
  }
}

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
    el('option', { value: 'assistenza', testo: 'kg di assistenza' }),
  ]);
  // Ste (04/10/2026): "metti che si puo' decidere quando fai un nuovo esercizio se
  // e' monocarrucola o doppia carrucola".
  //
  // Prima questi tre fatti stavano SOLO scritti dentro il file: se creavi un
  // esercizio al cavo non potevi dirgli mono o doppia, e l'app sbagliava di 2 sul
  // Rank. Nessuno ci deve pensare da solo, e Ste non deve dipendere da me.
  const carrucola = el('select', { class: 'selettore' }, [
    el('option', { value: '', testo: "non lo so / non è un cavo" }),
    el('option', { value: 'carrucola_mono', testo: 'mono carrucola (cavo singolo)' }),
    el('option', { value: 'carrucola_doppia', testo: "doppia carrucola (senti metà)" }),
  ]);
  const attrezzatura = el('select', { class: 'selettore' }, [
    el('option', { value: '', testo: "non è una macchina" }),
    el('option', { value: 'macchina_dischi', testo: 'macchina a DISCHI veri' }),
    el('option', { value: 'macchina_stack', testo: 'macchina a STACK (linguetta)' }),
  ]);
  const braccia = el('select', { class: 'selettore' }, [
    el('option', { value: '', testo: 'i due bracci vanno insieme' }),
    el('option', { value: 'si', testo: 'braccia indipendenti' }),
  ]);

  // Il riferimento ora si CALCOLA da solo.
  //
  // Ste (04/10/2026): "non si puo' rendere automatica sta cosa?".
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
  // dice che movimento e' e quanto e' difficile, e PERCHE'. Se sbaglia, te ne
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
  aggiornaRiconoscimento();

  /** Ricalcola l'anteprima ogni volta che cambia qualcosa. */
  const aggiornaAnteprima = () => {
    const scritto = Number(String(riferimento.value || '').replace(',', '.'));
    const usaQuelloScrittto = Number.isFinite(scritto) && scritto > 0;
    const peso = pesoCorporeoOra();
    const profilo = profiloEsercizio(
      { id: 'ex-nuovo', nome: nome.value || 'Nuovo esercizio', convenzione: convenzione.value, misura: tipo.value, attrezzatura: attrezzatura.value || null, bracciaIndipendenti: braccia.value === 'si', carrucola: carrucola.value || null },
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
  tipo.addEventListener('change', aggiornaAnteprima);
  convenzione.addEventListener('change', aggiornaAnteprima);
  aggiornaAnteprima();

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
        // non e' scritta qui a mano. Prima era scritta qui: diceva Bronzo 55%,
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
        // mancare proprio "kg per braccio", che e' la voce da cui dipende meta'
        // del Rank sulle macchine a dischi.
        el('ul', {}, ['per_manubrio', 'per_braccio', 'macchina', 'macchina_dischi', 'macchina_stack', 'cavo_totali', 'bilanciere', 'assistenza'].map((k) => el('li', { testo: ETICHETTE_CONVENZIONE[k] }))),
        el('p', { testo: 'Questo campo non è una nota: il numero del PLATINUM dipende da qui. Un esercizio registrato per braccio ha una scala diversa dallo stesso esercizio registrato in totale, perché 35 kg per braccio non si confrontano con 35 kg in tutto.' }),
      ]),
    ]),

    el('label', { class: 'nota', testo: 'Nome' }), nome,
    riconosciuto,
    el('label', { class: 'nota', testo: 'Immagine' }), immagine,
    el('label', { class: 'nota', testo: 'Tipo' }), tipo,
    el('label', { class: 'nota', testo: 'Convenzione del carico' }), convenzione,
    el('label', { class: 'nota', testo: "Com'è fatto il carico? (solo se è un cavo)" }), carrucola,
    el('label', { class: 'nota', testo: "Che macchina è? (dischi veri o stack)" }), attrezzatura,
    el('label', { class: 'nota', testo: "Muovi un braccio senza l'altro?" }), braccia,
    el('label', { class: 'nota', testo: 'Punteggio PLATINUM (facoltativo: se lo lasci vuoto lo sceglie l\'app)' }), riferimento,
    anteprimaRiferimento,
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
          // scriveranno e' di un lato, del carrello o del carico intero, e il
          // riferimento salvato e' quello sbagliato. Prima la copia passava solo
          // nome e convenzione.
          const profilo = profiloEsercizio(
            {
              id,
              nome: nomeValore,
              convenzione: convenzione.value,
              misura,
              attrezzatura: attrezzatura.value || null,
              carrucola: carrucola.value || null,
              bracciaIndipendenti: braccia.value === 'si',
            },
            Number.isFinite(scritto) && scritto > 0 ? { riferimento: scritto } : {},
          );
          await db.salva('esercizi', {
            id,
            nome: nomeValore,
            gruppo: nomeValore,
            convenzione: convenzione.value,
            misura,
            // I tre fatti che l'app DEVE sapere. Senza questi l'esercizio nasce
            // sbagliato: sul doppio carrucola il Rank e' dimezzato, e una macchina
            // a dischi non e' una macchina a stack. E valgono anche per la scala,
            // quindi non solo per il Rank.
            ...(carrucola.value ? { carrucola: carrucola.value } : {}),
            ...(attrezzatura.value ? { attrezzatura: attrezzatura.value } : {}),
            ...(braccia.value === 'si' ? { bracciaIndipendenti: true } : {}),
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
    const riga = el('div', { class: 'barra-gioco' }, [
      el('span', { class: 'chip-gioco', title: 'Streak', testo: `fuoco ${st.fuoco.acceso ? st.fuoco.giorni : '0'}` }),
      el('span', { class: 'chip-gioco', testo: `aura ${formattaAura(st.aura)}` }),
      el('span', { class: 'chip-gioco', testo: `livello ${st.livello.livello}` }),
    ]);
    riga.children[0].setAttribute('style', `--fuoco:${st.fuoco.colore}`);
    contenitore.appendChild(riga);
  } catch (e) {
    // la barra e' un extra: se qualcosa va storto non deve bloccare l'app
    console.warn('Barra del gioco non disegnata:', e);
  }
}

/* ===================== avvio app ===================== */

avvia();

// Esportato solo per i test: serve a riavviare l'app e verificare che le correzioni
// al nome della scheda vengano applicate anche a chi l'ha gia' installata.
export { avvia, V };
