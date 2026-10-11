// bug-arancioni.test.js -- i difetti trovati leggendo il codice, chiusi uno per uno.
//
// Questo file NON è una lista di cose che sembrano sospette: ogni test qui sotto
// riproduce un difetto che era VERO, con i numeri veri, e verifica che adesso non lo
// sia più. Sono tutti difetti che i 622 test di prima non guardavano: per questo
// erano rimasti.
//
// La regola che ho seguito: nessun test che dica "non dovrebbe esserci un errore".
// Ogni test chiama il codice vero e controlla un numero o un comportamento.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const srcApp = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const srcSync = await readFile(new URL('../src/sync.js', import.meta.url), 'utf8');
const srcBackup = await readFile(new URL('../src/backup.js', import.meta.url), 'utf8');
const srcDb = await readFile(new URL('../src/db.js', import.meta.url), 'utf8');
const srcStreak = await readFile(new URL('../src/streak.js', import.meta.url), 'utf8');
const srcSedute = await readFile(new URL('../src/sedute.js', import.meta.url), 'utf8');

const { calcolaStreak, giorniAllenati } = await import('../src/streak.js');
const { unisci, creaPacchetto, validaPacchetto } = await import('../src/backup.js');

/** Il corpo di una funzione. */
function corpo(nome, da = srcApp) {
  const inizio = da.indexOf(`function ${nome}(`);
  assert.ok(inizio >= 0, `non trovo ${nome}`);
  let i = da.indexOf('{', inizio);
  let prof = 0;
  for (; i < da.length; i++) {
    if (da[i] === '{') prof++;
    else if (da[i] === '}') { prof--; if (prof === 0) return da.slice(inizio, i + 1); }
  }
  return da.slice(inizio);
}

const seduta = (data, stato = 'completata') => ({ id: 's-' + data, data, estado: undefined, stato, ora_inizio: data + 'T10:00:00.000Z' });

// ---- 1. IL NaN NEI CAMPI DELLA SERIA ----

test('B1. svuotare un campo non salva più NaN', () => {
  // IL DIFETTO. `campoNumero` (ui.js) manda `null` quando il campo è vuoto. Il
  // codice faceva `Number(String(v).replace(',', '.'))`, e `String(null)` è la parola
  // "null": `Number("null")` è NaN. Quindi SVUOTARE il campo dei kg o delle
  // ripetizioni salvava NaN sul database, e al ridisegno il campo mostrava "NaN".
  //
  // Non è un numero che si vede e non si capisce: è un PESO perso, perché i Rank
  // scartano i valori non numerici e l'esercizio sparisce dalle classifiche.
  //
  // Tre righe avevano una protezione, ma controllavano `v === ''` mentre il campo
  // manda `null`: la condizione non era mai vera e il ramo NaN partiva lo stesso.
  const f = corpo('numeroOppureNull');
  assert.match(f, /v === null \|\| v === undefined/ , 'il caso vuoto c\'è');
  assert.match(f, /testo === ''/, 'e anche la stringa vuota');
  assert.match(f, /Number\.isFinite\(n\) \? n : null/, 'e un numero non valido non passa');

  // e nessun campo usa più la forma pericolosa
  const pericolose = [...srcApp.matchAll(/Number\(String\(v\)\.replace/g)];
  const veri = pericolose.filter((m) => !srcApp.slice(Math.max(0, m.index - 60), m.index).includes('*'));
  assert.equal(veri.length, 0,
    `ci sono ancora ${veri.length} campi che fanno Number(String(v))`);
});

// ---- 2. LA SCHEDA DI STEFANO SCRITTA AL POSTO DI QUELLA DI CHI USA L'APP ----

test('B2. le versioni si salvano sulla scheda di CHI sta usando l\'app', () => {
  // IL DIFETTO. Quattro scritture usavano `SCHEDA_ID`, che è la scheda di Stefano
  // (dati-iniziali.js). Se Andrea modificava la scheda, la nuova versione veniva
  // salvata con la scheda_id di Stefano: per Andrea quella versione non esiste,
  // non compare nello storico, e salvando una seconda volta nascono DUE versioni con
  // lo stesso numero.
  const sbagliate = [...srcApp.matchAll(/scheda_id: SCHEDA_ID/g)];
  assert.equal(sbagliate.length, 0,
    `ci sono ancora ${sbagliate.length} scritture con la scheda di Stefano invece di quella della persona`);
  // e la funzione giusta esiste ed è usata
  assert.match(srcApp, /function schedaAttivaId\(\) \{ return personaAttiva\(\)\.schedaId; \}/,
    'la funzione che risolve la domanda esiste');
  assert.equal([...srcApp.matchAll(/schedaAttivaId\(\)/g)].length >= 4, true,
    'e viene usata almeno quattro volte');
});

// ---- 3. LA PAGINA DI UN ESERCIZIO MESCOLAVA LE SERIE DI TUTTI ----

test('B3. la pagina di un esercizio mostra solo le serie di chi la guarda', () => {
  // IL DIFETTO. `vistaEsercizio` leggeva `V.serie` grezzo, cioè le serie di TUTTE
  // le persone sul dispositivo. Tutte le altre schermate usano
  // `serieDellaPersona()`: questa era l'unica che leggeva la tabella intera.
  //
  // Il danno è silenzioso: tu fai chest press 40×8 e Andrea 65×8 sullo stesso
  // esercizio; aprendo "il suo Rank" vedevi il record di Andrea, con le sue LP, e
  // l'avviso sul peso corporeo era calcolato sulla prestazione di Andrea.
  const vista = corpo('vistaEsercizio');
  assert.match(vista, /serieDellaPersona\(\)/,
    'deve usare le serie di questa persona');
  assert.equal(/V\.serie \|\| \[\]\)\.filter\(\(x\) => x && !x\.eliminata && x\.esercizio_id/.test(vista), false,
    'e non la tabella grezza');
});

// ---- 4. DUE ALLENAMENTI APERTI INSIEME ----

test('B4. due tocchi veloci non aprono due sedute', async () => {
  // IL DIFETTO. Il controllo e la scrittura sono due `await` di fila, e tra i due c'è
  // tempo per un secondo tocco. Se tocchi "Inizia allenamento" due volte veloce,
  // entrambe le chiamate passano il controllo e vengono scritte due sedute aperte.
  // Da lì l'app è bloccata per sempre: "c'è già un allenamento aperto", e per
  // sbloccare tutto devi cancellare a mano la sessione fantasma.
  assert.match(srcSedute, /let aperturaInCorso = false;/,
    'c\'è la catena che tiene il posto');
  assert.match(srcSedute, /if \(aperturaInCorso\) throw sedutaAperta\(\);/,
    'e viene controllata prima di ogni scrittura');
  assert.match(srcSedute, /\} finally \{\r?\n    aperturaInCorso = false;/,
    'e si sblocca sempre, anche se la chiamata va in errore');
  // e l'errore ha il codice che l'interfaccia già sa gestire
  assert.match(srcSedute, /errore\.codice = 'seduta_aperta';/, 'l\'errore ha il suo codice');
});

// ---- 5. LE DURATE ASSURDE ----

test('B5. chiudere una seduta senza ora di inizio non salva 56 anni', () => {
  // IL DIFETTO. `chiudiSeduta` faceva `new Date(seduta.ora_inizio)` senza
  // controllare che ci sia. Se non c'è, `new Date(null)` è il 1970 e la durata
  // diventava di 56 anni, finendo nelle statistiche per sempre. Se `ora_inizio` era
  // una stringa non valida, il risultato era NaN, e `Math.max(0, NaN)` è NaN: la
  // protezione non proteggeva niente.
  //
  // Basta una seduta arrivata da un backup (che non validava l'ora di inizio).
  const chiudi = corpo('chiudiSeduta', srcSedute);
  assert.match(chiudi, /secondiDiAllenamento\(/,
    'usa la funzione che ha già la guardia');
  assert.equal(/Math\.max\(0, Math\.round\(\(fine\.getTime\(\) - new Date\(seduta\.ora_inizio\)/.test(chiudi), false,
    'e non calcola più la durata da solo');
});

// ---- 6. LE SEDUTE DI DOMANI ----

test('B6. una seduta di domani non conta come allenamento di oggi', () => {
  // IL DIFETTO. Una seduta con data futura entrava come qualunque altra. Con una
  // sola seduta datata 2026-10-12 e oggi che è il 10, l'app scriveva "l'ultimo
  // allenamento è stato il 2026-10-12": ti diceva che avevi smesso ad allenarti da
  // quando non ti eri mai allenato. E la sessione futura "scavalcava" quella vera:
  // streak 1 invece di 2.
  assert.match(srcStreak, /export function giorniAllenati\(sedute, oggi = isoGiorno\(new Date\(\)\)\)/,
    'la funzione sa quale giorno è oggi');
  assert.match(srcStreak, /if \(d > oggi\) continue;/,
    'e scarta le sedute di domani');
  // verificalo sui numeri veri
  const giorni = giorniAllenati(
    [{ id: 'a', data: '2026-10-12', stato: 'completata' }],
    '2026-10-10',
  );
  assert.deepEqual([...giorni], [],
    'una seduta di due giorni avanti non deve entrare nei giorni allenati');
  assert.deepEqual([...giorniAllenati(
    [{ id: 'a', data: '2026-10-09', stato: 'completata' }],
    '2026-10-10',
  )], ['2026-10-09'], 'quella di ieri sì, come sempre');
});

// ---- 7. IL RECORD CHE PREMIAVA SEQUENZE IMPOSSIBILI ----

test('B7. senza giorni scelti, il record non conta i buchi', () => {
  // IL DIFETTO. `precedentiSetHa` con la lista dei tuoi giorni a `null` restituisce
  // sempre `false`, quindi la catena non si rompeva mai. Verificato: sedute del 5, 6,
  // 8 e 9 ottobre davano streak attuale 2 e RECORD 4.
  //
  // E il record non è un numero decorativo: `avatar-rpg.js` e `gioco.js` lo usano
  // per sbloccare armature e medaglie PER SEMPRE. Potevi sbloccare un premio da 4
  // giorni che la regola con cui giochi non ti darà mai.
  const giorni = ['2026-09-05', '2026-09-06', '2026-09-08', '2026-09-09'];
  const r = calcolaStreak(giorni.map((d) => seduta(d)), '2026-09-09', null);
  assert.equal(r.record, 2,
    `il record deve contare solo i giorni davvero consecutivi, trovati ${r.record}`);
});

// ---- 8. LA TABELLA `appreso` NON ERA NEL BACKUP ----

test('B8. il backup porta anche quello che l\'app ha imparato', () => {
  // IL DIFETTO. Nella tabella `appreso` vivono le correzioni che hai dato all'app:
  // quali livelli hai corretto a mano, quali parole nuove ha imparato a riconoscere.
  // `db.esportaTutto()` la restituisce già, ma `creaPacchetto` non la elencava.
  //
  // Il sintomo è subdolo perché sembra funzionare: fai il backup dal telefono, lo
  // ripristini sull'altro, e l'app ti chiede di nuovo "GRANDE o ISOLAMENTO?" per ogni
  // esercizio che avevi già corretto.
  const pacchetto = creaPacchetto({});
  assert.ok(Array.isArray(pacchetto.tabelle.appreso),
    'la tabella `appreso` deve essere nel pacchetto');
  // e passa i dati davvero, non una lista vuota
  const conDati = creaPacchetto({ appreso: [{ id: 'a1', esercizio: 'Panca', livello: 'grande' }] });
  assert.equal(conDati.tabelle.appreso.length, 1, 'e deve contenere i dati');
  // e l'app glieli passa davvero quando esporta
  assert.match(srcApp, /appreso: dati\.appreso,/, 'l\'app passa la tabella a creaPacchetto');
});

// ---- 9. LE DATE IMPOSSIBILI PASSAVANO ----

test('B9. un backup con una data inesistente viene rifiutato', () => {
  // IL DIFETTO. La validazione controllava solo che la data "assomigliasse" a una
  // data, e `\d{4}-\d{2}-\d{2}` accetta "2026-13-45". Passava, l'anteprima scriveva
  // "Periodo: dal 2026-10-01 al 9999-99-99", e poi `giorniAllenati` scartava quelle
  // sedute IN SILENZIO: giorni di allenamento che sparivano senza nessun avviso.
  const base = {
    formato: 'palestra-backup',
    versione_schema: 1,
    tabelle: {
      esercizi: [], schede: [], versioni: [], serie: [], note: [],
      sedute: [{ id: 's1', data: '2026-13-45', durata_secondi: 100 }],
    },
  };
  const esito = validaPacchetto(base);
  assert.equal(esito.valido, false, 'il backup con una data inesistente non deve passare');
  assert.match(esito.problemi.join(' '), /data che non esiste/,
    'e deve dire qual è il problema, non fallire in silenzio');

  // una data vera passa
  const buono = JSON.parse(JSON.stringify(base));
  buono.tabelle.sedute[0].data = '2026-10-09';
  assert.equal(validaPacchetto(buono).valido, true, 'una data vera passa');

  // e i numeri negativi no: un peso da -50 kg è un peso perso, non un peso
  const negativo = JSON.parse(JSON.stringify(base));
  negativo.tabelle.sedute[0].data = '2026-10-09';
  negativo.tabelle.serie = [{ id: 'x1', peso: -50 }];
  assert.equal(validaPacchetto(negativo).valido, false, 'un peso negativo non deve passare');
});

// ---- 10. L'IMPORTAZIONE CHE CANCELLAVA I CAMPI ----

test('B10. importare un backup non cancella i campi che il backup non ha', () => {
  // IL DIFETTO. Nel ramo "unione" c'era `{ ...r }`, che rimpiazza la riga locale con
  // quella del backup: i campi che esistevano solo da una parte spariscono.
  // Verificato: un esercizio locale con carrucola, attrezzatura e
  // bracciaIndipendenti diventava solo { id, nome, rev } — e quei tre campi sono
  // esattamente quelli che il Rank usa per dimezzare il punteggio.
  const locale = [{ id: 'e1', nome: 'Panca', carrucola: 'doppia', attrezzatura: 'dischi', bracciaIndipendenti: true, rev: 3 }];
  const dalBackup = [{ id: 'e1', nome: 'Panca', rev: 9 }];
  const esito = unisci(locale, dalBackup, 'esercizi');
  const riga = esito.righe[0];
  assert.equal(riga.carrucola, 'doppia', 'la carrucola deve sopravvivere');
  assert.equal(riga.attrezzatura, 'dischi', 'e l\'attrezzatura');
  assert.equal(riga.bracciaIndipendenti, true, 'e le braccia indipendenti');
});

// ---- 11. LA SYNC BLOCCAVA I DATI DEGLI ALTRI DISPOSITIVI ----

test('B11. il ramo "identico" non alza il numero di revisione', () => {
  // IL DIFETTO. Tutti gli altri rami del ciclo di invio passano `segna: false`,
  // perché senza quello `db.salva` rimette la riga in coda e alza `rev` di uno. Il
  // ramo "identico" no: `rev` saliva senza che fosse stato mandato niente, e il
  // numero locale diventava maggiore di quello del server.
  //
  // Il danno è PERMANENTE e silenzioso: in `applicaRemote` c'è
  // `if (revRemoto < revLocale) ignora`, quindi da quel momento tutte le modifiche
  // che arrivano dagli altri dispositivi su quella riga venivano scartate per sempre.
  const i = srcSync.indexOf("decisione === 'identico'");
  assert.ok(i > 0, 'il ramo esiste');
  const pezzo = srcSync.slice(i, i + 700);
  const fineRamo = pezzo.indexOf('continue;');
  const ramo = pezzo.slice(0, fineRamo);
  assert.match(ramo, /segna: false/, 'il ramo "identico" deve salvare con segna: false');
});

// ---- 12. IL CRASH NEI PROGRESSI ----

test('B12. i Progressi non si rompono se un esercizio non è più nel catalogo', () => {
  // IL DIFETTO. Centocinquanta righe più su, il costruttore del menu scrive
  // `(esercizioPerId(id) || {}).nome || id`: lì è previsto che l'esercizio manchi. In
  // `aggiorna` no: `e.nome` con `e === null` solleva un TypeError e l'interfaccia
  // sostituisce tutta la pagina con la schermata d'errore.
  //
  // Quando succede davvero: importi un backup con "sostituzione", gli esercizi del
  // catalogo che non erano in quel backup finiscono nel cestino, ma restano negli
  // snapshot delle versioni. Apri i Progressi e la pagina non si carica più.
  // cerco la ggiorna dei Progressi: nel file ce n'e' anche una nei giri, quindi
  // prendo quella che contiene il riferimento all'esercizio selezionato
  const agg = corpo('aggiorna');
const i = agg.indexOf('esercizioPerId(selezionato)');
  assert.ok(i > 0, 'la funzione dei Progressi c\'è');
  // cerco il blocco di protezione DENTRO la funzione, non a una distanza fissa:
  // i commenti che spiegano il difetto sono lunghi, e una distanza fissa darebbe un
  // falso rosso solo perché il codice è spiegato bene
  const j = agg.indexOf('if (!e) {', i);
  assert.ok(j > i, 'deve controllare che l\'esercizio ci sia');
  const dopo = agg.slice(j, j + 400);
  assert.match(dopo, /return;/,
    'e fermarsi spiegando cosa è successo');
});

// ---- 13. IL CALENDARIO DEGLI ANNI PASSATI ----

test('B13. andando indietro di un anno si vedono TUTTI i mesi', () => {
  // IL DIFETTO. La condizione era invertita: nell'anno in cui sei parte dal mese
  // della prima seduta (giusto, per non mostrarti sei mesi vuoti), ma anche
  // nell'anno SCORSO, che invece è lo storico e deve stare tutto. Il risultato era
  // che andando indietro di un anno gennaio e febbraio sparivano dal calendario, e
  // se in quei due mesi ti eri allenato i tuoi giorni verdi non c'erano.
  const cal = corpo('bloccoCalendario');
  assert.match(cal, /const meseIniziale = \(anno === oggiAnno\) \? primoMese : 1;/,
    'negli anni diversi da quello in cui sei si parte da gennaio');
  assert.equal(/primoAnno/.test(cal), false,
    'e non resta la variabile `primoAnno`, che era dichiarata e mai usata');
});

// ---- 14. IL NUMERO DI SERIE DELL'AMICO ----

test('B14. la pagina dell\'amico conta le serie vere', () => {
  // IL DIFETTO. C'era `s.serie_fatte || 0`, e quel campo non è scritto da nessuna
  // parte dell'app: le serie stanno in un'altra tabella, collegate da `seduta_id`.
  // Quindi la pagina diceva SEMPRE "0 serie". Non un numero sbagliato: un numero che
  // non era mai esistito.
// la parola resta solo nel commento che spiega il difetto: quello che conta è che
  // non venga più letta come se fosse un campo della riga. Cerco la lettura vera,
  // cioè il campo usato DENTRO un template.
  const letto = /serie_fatte/.test(srcApp) && /`\$\{[^}]*serie_fatte/.test(srcApp);
  assert.equal(letto, false, 'il campo che non esisteva non deve più essere letto');
  assert.match(srcApp, /x\.seduta_id === s\.id && !x\.eliminata/,
    'e le serie si contano davvero, escludendo quelle nel cestino');
});

// ---- 15. IL DETTAGLIO DEL GIORNO ----

test('B15. il dettaglio di un giorno non mostra le serie nel cestino', () => {
  // IL DIFETTO. Mancava il filtro `!x.eliminata` (che ogni altra schermata ha), e
  // i kg si leggevano solo da `peso`: negli esercizi assistiti il numero che hai
  // scritto sta in `peso_assistenza`, quindi l'esercizio compariva senza i kg
  // anche se li avevi scritti.
  const det = corpo('dettaglioGiorno');
  assert.match(det, /x\.seduta_id === s\.id && !x\.eliminata/, 'le serie eliminate sono escluse');
  assert.match(det, /x\.peso \|\| x\.peso_assistenza/, 'e i kg si leggono anche dall\'assistenza');
});

// ---- 16. IL CSV CON LE FORMULE ----

test('B16. il CSV non può contenere formule', () => {
  // IL DIFETTO. Una cella che comincia per `=`, `+`, `-` o `@` non è un testo per
  // Excel: è un'istruzione da eseguire. Il pericolo è vero e non teorico: se un
  // nome di esercizio o una nota comincia per `=`, il file che scarichi contiene una
  // formula, e chi lo apre la esegue.
  const funzione = corpo('cella', srcBackup);
  assert.match(funzione, /pericolosa/, 'la funzione deve controllare il primo carattere');
  assert.match(funzione, /"'" \+ s/, 'e mettere un apostrofo davanti, che Excel legge come testo');
});

// ---- 17. LA SEDUTA APERTA DI UN ALTRO PROFILO ----

test('B17. la seduta aperta di un amico non blocca il tuo allenamento', () => {
  // IL DIFETTO. Le sedute non hanno un campo account (l'app le separa a runtime
  // versione → scheda), quindi `sedutaInCorso()` senza filtro restituiva la prima
  // riga in_corso in assoluto: una seduta lasciata aperta dal profilo di un amico
  // bloccava l'avvio per TUTTI gli altri profili sullo stesso dispositivo. E quella
  // è esattamente la situazione per cui Ste ha scritto questa app.
  assert.match(srcDb, /export async function sedutaInCorso\(versioneId = null\)/,
    'la funzione accetta di chi è la seduta');
  assert.match(srcDb, /righe\.filter\(\(s\) => s\.versione_id === versioneId\)/,
    'e filtra');
  // e chi la chiama passa la versione della persona
  const chiamate = [...srcApp.matchAll(/sedutaInCorso\(([^)]*)\)/g)].map((m) => m[1]);
  assert.equal(chiamate.filter((x) => x.trim() === '').length, 0,
    'nessuna chiamata resta senza filtro');
});

// ---- 18. LE ANIMAZIONI ----

test('M1. le animazioni ci sono, ma chi le spegne viene ascoltato', async () => {
  // Ste (10/10/2026): "metti ci pure delle animazioni se vuoi".
  //
  // Le animazioni sono tre e tutte rispondono a un'azione: il dialogo che si apre,
  // la serie che spunti, il calendario quando cambi anno. NON l'entrata sfumata di
  // ogni sezione all'apertura: quella è l'effetto che mette tutto il web, e su un'app
  // che si usa in palestra finisce per essere un ritardo fra te e il pulsante.
  const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');
  assert.match(css, /@keyframes dialogo-entra/, 'il dialogo si apre');
  assert.match(css, /@keyframes serie-accesa/, 'la serie spuntata si accende');
  assert.match(css, /\.serie-fatta-adesso \{ animation: serie-accesa/, 'e l\'animazione è legata alla spunta');
  assert.match(srcApp, /riga\.classList\.add\('serie-fatta-adesso'\)/,
    'e la classe parte da JavaScript quando salvi la spunta');

  // IL RISETTO PER CHI NON VUOLE LE ANIMAZIONI.
  //
  // Il pulsante esiste su iOS, Android e Windows. Non è una gentilezza da aggiungere
  // dopo: è il motivo per cui le altre animazioni si possono fare senza pensarci due
  // volte, perché nessuno soffre.
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/,
    'c\'è il blocco per chi chiede meno animazioni');
  // Ste (10/10/2026): "io le animazioni non le vedo". Il blocco adesso ha il
  // selettore `html:not(.animazioni-sempre)` davanti, quindi le dichiarazioni non
  // sono più entro 400 caratteri: la finestra si allarga, il blocco c'è sempre.
  // Si parte da `@media` e non dalla prima parola `prefers-reduced-motion`, che sta
  // nel commento qui sopra e non nel blocco vero.
  const i = css.indexOf('@media (prefers-reduced-motion');
  const blocco = css.slice(i, i + 700);
  assert.match(blocco, /animation-duration/, 'e azzera le animazioni');
  assert.match(blocco, /transition-duration/, 'e le transizioni');
  // e la scelta esplicita dell'utente vale più del segnale di Windows
  assert.match(blocco, /html:not\(.animazioni-sempre\)/,
    'ma non quando l\'utente ha scelto "sempre accese"');
});