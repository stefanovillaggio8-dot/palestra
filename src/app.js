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
import { creaPacchetto, validaPacchetto, unisci, csvSerie, csvSedute, csvEsercizi } from './backup.js';
import { ESERCIZI, SCHEDA_ID, SCHEDA_NOME, costruisciSnapshot } from './dati-iniziali.js';
import { nuovoId, adesso, TABELLE } from './sincronizzazione.js';

const V = {}; // stato dell'app
const GIRI_DROPSET = 3; // i 3 posti in piu' che ha chiesto Ste

/* ===================== avvio ===================== */

async function avvia() {
  const radice = document.getElementById('app');
  installaSpiaErrori();
  svuota(radice);
  radice.appendChild(el('div', { class: 'caricamento', testo: 'Carico i tuoi dati...' }));

  try {
    await db.apriDb();
    await seminaSeVuoto();
    bottoneSu();

    await ricarcaTutto();

    sync.iscriviti(() => { aggiornaStatoSalvataggio(); });
    sync.avvia();
    window.addEventListener('hashchange', () => disegna());
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* senza service worker funziona lo stesso, solo niente offline */ });
    // se il browser prende una versione nuova mentre l'app e' aperta, lo dico
    try {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e && e.data && e.data.tipo === 'aggiornata') {
          disegnaStatoSalvataggio();
          avviso('C\'e\' una versione nuova dell\'app. Chiudi e riapri per prenderla.', { durata: 9000 });
        }
      });
    } catch { /* pazienza */ }
  }
    disegna();
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
  const spotterInfo = riassuntoSpotter(perEsercizio, perId);
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
  const testoSpotter = res.cambiamenti.some((c) => c.spotterCambiato)
    ? 'In questo esercizio hai cambiato lo spotter: la prossima volta la serie te la trovi gia\' segnata.'
    : '';
  const box = el('div', { class: 'sfondo-dialogo' }, el('div', { class: 'dialogo dialogo-largo' }, [
    el('h3', { testo: 'Aggiorno la scheda con quello che hai fatto?' }),
    el('p', { class: 'testo-dialogo', testo: `${res.cambiamenti.length} ${res.cambiamenti.length === 1 ? 'esercizio cambia' : 'esercizi cambiano'} nel ${seduta.nome_giorno || 'giorno'}.` }),
    el('ul', { class: 'lista-cambi' }, righe),
    el('p', { class: 'testo-dialogo legenda-cambi', testo: 'S = fatta con lo spotter · D = dropset' }),
    el('p', { class: 'testo-dialogo riga-spotter' }, [
      el('strong', { testo: 'Con lo spotter: ' }),
      el('span', { testo: spotterInfo.frase }),
    ]),
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
  const nuovoNumero = Math.max(...V.versi.map((x) => Number(x.numero) || 0)) + 1;
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
  await ricarcaTutto();
  avviso(`Scheda aggiornata: ora sei alla versione ${nuovoNumero}.`, { tipo: 'ok' });
  return nuovaVersioneId;
}

async function aggiornaSchedaDaUltimaSeduta() {
  const finite = seduteFinite(V.sedute);
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
async function ricarcaTutto() {
  V.esercizi = await db.tutti('esercizi');
  V.schede = await db.tutti('schede');
  V.versi = await db.tutti('versioni');
  V.sedute = await db.tutti('sedute');
  V.serie = await db.tutti('serie');
  V.note = await db.tutti('note');
  V.conflitti = await sync.conflittiDaScegliere();
}

async function seminaSeVuoto() {
  const gia = await db.tutti('esercizi');
  if (gia.length) { await sistemaNomeScheda(); return; }
  for (const e of ESERCIZI) await db.salva('esercizi', e, { segna: false });
  await db.salva('schede', {
    id: SCHEDA_ID, nome: SCHEDA_NOME, versione_corrente: 'ver-1',
  }, { segna: false });
  await db.salva('versioni', {
    id: 'ver-1', scheda_id: SCHEDA_ID, numero: 1,
    snapshot: costruisciSnapshot(), nota: 'Versione iniziale, trascritta dalla scheda.',
  }, { segna: false });
  await db.scriviMeta('installato_il', adesso());
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

function scheda() { return V.schede.find((s) => s.id === SCHEDA_ID) || V.schede[0] || null; }

function versioneCorrente() {
  const s = scheda();
  if (!s) return null;
  return V.versi.find((v) => v.id === s.versione_corrente) || V.versi[0] || null;
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
    if (percorso === '/') return rotta === '/' || rotta === '' || rotta.startsWith('/giorno') || rotta.startsWith('/seduta');
    return rotta === percorso || rotta.startsWith(percorso + '/');
  };
  const voce = (href, etichetta, percorso) => el('a', {
    href: '#' + percorso,
    class: 'voce-menu' + (voceAttiva(percorso) ? ' attiva' : ''),
    testo: etichetta,
  });

  const resto = el('div', { class: 'basso' }, [
    el('nav', { class: 'menu-basso' }, [
      voce('/', 'Allenamento', '/'),
      voce('/storico', 'Storico', '/storico'),
      voce('/progressi', 'Progressi', '/progressi'),
      voce('/impostazioni', 'Impostazioni', '/impostazioni'),
    ]),
  ]);
  return resto;
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
  const proprie = V.sedute.filter((s) => s.giorno_id === giornoId && s.stato === 'completata' && !s.eliminata);
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
  await ricarcaTutto();
  vai('/seduta/' + seduta.id);
}

async function creaSerie(sedutaId, esercizioId, ordine, esercizio, prevista = {}) {
  return db.salva('serie', nuovaSerie({ seduta_id: sedutaId, esercizio_id: esercizioId, ordine, esercizio, prevista }));
}

/* ===================== vista: giorno ===================== */

function vistaGiorno(zona, giornoId) {
  const v = versioneCorrente();
  const g = ((v && v.snapshot && v.snapshot.giorni) || []).find((x) => x.id === giornoId);
  if (!g) { zona.appendChild(el('p', { testo: 'Giorno non trovato.' })); return; }
  const ultimo = ultimaSedutaDelGiorno(giornoId);
  const opzionali = (g.esercizi || []).filter((x) => x.opzionale).length;
  const totaleSerie = (g.esercizi || []).reduce((a, x) => a + ((x.serie || []).length), 0);

  zona.appendChild(el('a', { href: '#/', class: 'indietro', testo: '← tutti i giorni' }));
  zona.appendChild(el('h1', { testo: g.nome }));
  zona.appendChild(el('p', { class: 'nota', testo: [
    `${g.esercizi.length} esercizi · ${totaleSerie} serie`,
    opzionali ? `${opzionali} opzionali` : null,
    `versione scheda numero ${v.numero}`,
  ].filter(Boolean).join(' · ') }));
  zona.appendChild(el('p', { class: 'nota nota-chiaro', testo: 'Stai solo guardando: non parte nessun allenamento e il cronometro non si avvia.' }));

  const griglia = el('div', { class: 'griglia-esercizi' });
  for (const es of (g.esercizi || [])) {
    const e = esercizioPerId(es.esercizio_id);
    if (!e) continue;
    const assistito = !convenzioneMisuraCarico(e.convenzione);
    const seriePreviste = (es.serie || []).map((x, i) => {
      const p = assistito ? x.peso_assistenza : x.peso;
      return el('span', { class: 'prevista' + (x.spotter ? ' prevista-spotter' : '') }, [
        el('span', { class: 'prevista-n', testo: String(i + 1) }),
        el('span', { testo: `${formattaNumero(p)} kg` }),
        el('span', { class: 'prevista-x', testo: '×' }),
        el('span', { testo: `${formattaNumero(x.ripetizioni)} rip` }),
        x.dropset ? el('span', { class: 'tag-dropset', testo: 'dropset' }) : null,
        // Ste: "deve spuntarmi pure se ho fatto delle rep con lo spotter".
        // Nella scheda la serie che l\'ultima volta hai fatto col spotter resta
        // segnata, cosi\' prima di iniziare lo vedi e sai cosa aspettarti.
        x.spotter ? el('span', { class: 'tag-spotter', testo: '✓ spotter' }) : null,
      ]);
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
        e.nota_permanente ? el('p', { class: 'nota-permanente', testo: e.nota_permanente }) : null,
      ]),
    ]));
  }
  zona.appendChild(griglia);

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

// quante ripetizioni hai fatto con lo spotter: lo vedi mentre alleni.
// Resta sempre visibile, anche quando non hai usato lo spotter: cosi' sai
// che il conteggio c'e' e ti azzera, e non ti chiedi se manca.
const riepilogoSpotter = el('div', { class: 'riga-spotter' });
const scriviRiepilogoSpotter = () => {
  const info = riassuntoSpotter(raccogliPerEsercizio(V.serie, s.id), new Map(V.esercizi.map((e) => [e.id, e])));
  svuota(riepilogoSpotter);
  riepilogoSpotter.appendChild(el('strong', { testo: 'Con lo spotter: ' }));
  riepilogoSpotter.appendChild(el('span', { testo: info.frase }));
};
scriviRiepilogoSpotter();
zona.appendChild(riepilogoSpotter);

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
  const idx = V.sedute.indexOf(s);
  await db.salva('sedute', { ...s, note: testo });
  if (idx >= 0) V.sedute[idx] = { ...s, note: testo };
}

function ultimaSedutaConEsercizio(esercizioId, escludiSedutaId) {
  const candidate = V.sedute.filter((s) => s.stato === 'completata' && s.id !== escludiSedutaId && !s.eliminata);
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
      aggiornaSerie(serie, { stato: fatta ? 'fatta' : 'da_fare' })
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
  await db.salva('sedute', {
    ...s,
    ora_fine: new Date().toISOString(),
    durata_secondi: secondi,
    stato: 'completata',
  });
  await ricarcaTutto();
  vai('/storico/' + s.id);
  // adesso la scheda: quello che hai fatto diventa la scheda per la prossima volta
  await proponiAggiornamentoScheda(s.id);
}

/* ===================== vista: storico ===================== */

function vistaStorico(zona) {
  zona.appendChild(el('h1', { testo: 'Storico' }));
  const completate = V.sedute.filter((s) => s.stato === 'completata' && !s.eliminata)
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
  // Se in memoria la nota e\' vuota la rileggo dal database: cosi\' la vedi
  // anche se la nota e\' stata salvata da un\'altra schermata.
  if (s.note || s.stato === 'in_corso') {
    let notaMostrata = s.note || '';
    if (!notaMostrata) {
      const fresca = await db.prendi('sedute', s.id);
      if (fresca && fresca.note) {
        notaMostrata = fresca.note;
        const inMemoria = V.sedute.findIndex((x) => x.id === s.id);
        if (inMemoria >= 0) V.sedute[inMemoria] = fresca;
      }
    }
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
        await ricarcaTutto();
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
        const nuovoNumero = Math.max(...V.versi.map((x) => Number(x.numero) || 0)) + 1;
        const nuovaVersioneId = 'ver-' + nuovoId();
        await db.salva('versioni', {
          id: nuovaVersioneId, scheda_id: SCHEDA_ID, numero: nuovoNumero, snapshot: JSON.parse(JSON.stringify(nuova)),
          nota: 'Modificata a mano.',
        });
        await db.salva('schede', { ...scheda(), versione_corrente: nuovaVersioneId });
        scartaBozza();
        await ricarcaTutto();
        avviso(`Scheda salvata. Ora sei alla versione ${nuovoNumero}.`, { tipo: 'ok' });
        vai('/');
      },
      classe: 'principale grande',
    }),
  ]));

  const storicoVersioni = el('details', { class: 'storico-versioni' }, [el('summary', { testo: 'Versioni della scheda' })]);
  for (const ver of V.versi.sort((a, b) => b.numero - a.numero)) {
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

function vistaProgressi(zona) {
  zona.appendChild(el('h1', { testo: 'Progressi' }));

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
  const conDati = eserciziNellaScheda.filter((id) => V.serie.some((x) => x.esercizio_id === id && !x.eliminata));
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
    const seduteRilevanti = V.sedute
      .filter((s) => s.stato === 'completata' && !s.eliminata)
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));
    const punti = [];
    for (const s of seduteRilevanti) {
      const serie = V.serie.filter((x) => x.seduta_id === s.id && x.esercizio_id === esercizioId && !x.eliminata);
      if (!serie.length) continue;
      punti.push({ data: s.data, seduta: s, serie });
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
              await ricarcaTutto();
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
    bottone('Scarica la versione nuova', { onClick: () => aggiornaDavvero(), classe: 'principale' }),
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
            try { await sb.accedi(mail.value, pass.value); avviso('Accesso riuscito.', { tipo: 'ok' }); await ricarcaTutto(); disegna(); }
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
    bottone('Scarica CSV sedute', { onClick: () => scarica('sedute.csv', csvSedute(V.sedute)), classe: 'fantasma' }),
    bottone('Scarica CSV serie', { onClick: () => scarica('serie.csv', csvSerie(V.serie, V.esercizi, V.sedute)), classe: 'fantasma' }),
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
  for (const tabella of ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note']) {
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
  await ricarcaTutto();
  avviso(`Importazione finita (${modo}).`, { tipo: 'ok' });
  disegna();
}

/* ===================== avvio app ===================== */

avvia();

// Esportato solo per i test: serve a riavviare l'app e verificare che le correzioni
// al nome della scheda vengano applicate anche a chi l'ha gia' installata.
export { avvia };
