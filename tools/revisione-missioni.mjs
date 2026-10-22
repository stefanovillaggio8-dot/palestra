/**
 * Applica la revisione di Ste (13/10/2026) al pool delle missioni.
 *
 * Non edita il file a pezzi: ricostruisce l'elenco delle voci dentro POOL,
 * sostituendo quelle da cambiare, aggiungendo le nuove e togliendo le doppioni.
 * Poi CONTROLLA che ogni id atteso ci sia, che nessun id sia duplicato e che
 * nessuna voce abbia perso la sua forma: se un controllo fallisce, non scrive.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { POOL } from "../src/missioni.js";

const PERCORSO = new URL("../src/missioni.js", import.meta.url);
// IL FILE PUO' AVERE FINE-RIGA CRLF, e su Windows lo ha quasi sempre: git le
// rimette quando scarica il file. Senza normalizzare, `\n];` non trova niente e lo
// script dice "non ho trovato il blocco POOL" senza spiegare il motivo vero.
const testo = readFileSync(PERCORSO, "utf8").replace(/\r\n/g, "\n");
const INIZIO = "export const POOL = [";
const FINE = "\n];\n";
const i0 = testo.indexOf(INIZIO);
const i1 = testo.indexOf(FINE, i0);
if (i0 < 0 || i1 < 0) { console.error("non ho trovato il blocco POOL"); process.exit(1); }
const corpo = testo.slice(i0 + INIZIO.length, i1);

// le voci sono separate da "\n  M(" all'inizio di riga
const parti = corpo.split(/\n(?=\s*M\()/);
const voci = parti.map((v) => v.trim()).filter((v) => v.startsWith("M("));
console.log("voci lette dal file:", voci.length);

const idDi = (voce) => (voce.match(/^\s*M\(\s*'([^']+)'/) || [])[1];
const mappa = new Map(voci.map((v) => [idDi(v), v]));

// ---------------------------------------------------------------------------
// LE 18 RISCRITTE. L'id resta lo stesso: se cambio anche l'id, chi aveva gia'
// fatto quella missione la vedrebbe ricomparire come nuova.
// ---------------------------------------------------------------------------
const RISCRITTE = [
  ['la-domanda-maledetta', 'LA DOMANDA MALEDETTA', 'easy', 'improvvisazione',
   'Fai a un tuo amico una domanda completamente assurda, del tipo: "Secondo te siamo arrivati qui per merito o per caso?" Lui risponde, e tu devi inventare sul momento una spiegazione seria che tenga insieme la domanda e la risposta che ha appena dato. Non puoi dire "non so" e non puoi spiegare che era una sfida.'],

  ['annuncio-ufficiale', 'ANNUNCIO UFFICIALE', 'easy', 'fasi',
   'Due fasi, e vanno fatte entrambe. Prima, prima di iniziare: annuncia alla sala con voce da comunicatore, "Da oggi comincia la mia epoca, preparatevi", e poi allenati normalmente. Dopo la serie, torna davanti a chi ti ha sentito e aggiungi una frase sola di chiusura ufficiale, senza spiegare niente.'],

  ['il-boss-finale', 'IL BOSS FINALE', 'easy', 'recitazione',
   'Prima di iniziare una serie, guarda un tuo amico negli occhi e mettiti in scena un dialogo drammatico: tu sei il boss che torna, lui è l\'eroe. Devono essere almeno trenta secondi, una frase per ciascuno, e deve finire su una domanda a cui l\'altro deve rispondere prima che tu cominci la serie.'],

  ['bro-ha-cambiato-vita', 'IL BRO HA CAMBIATO VITA', 'easy', 'recitazione',
   'Spiega a un amico, come se fosse una conferenza stampa, il metodo di allenamento che hai inventato questa settimana. Devi sostenerlo per trenta secondi con tre vantaggi concreti e un nome tutto tuo per il metodo. Alla fine gli chiedi se è convinto, e un no non è una risposta ammessa.'],

  ['il-rispetto', 'IL RISPETTO', 'easy', 'recitazione',
   'Al termine di una serie scegli un tuo amico e fagli un inchino formale, come a un campione. Poi pronunci un elogio solenne di almeno venti secondi, usando il suo nome e due aggettivi che non hai mai usato per lui. Lui non deve ridere e tu non spieghi che è una sfida.'],

  ['il-guardiano', 'IL GUARDIANO', 'easy', 'fasi',
   'Scegli un attrezzo della palestra e dichiarati davanti a un amico il suo custode ufficiale. Devi dire perché proprio quell\'attrezzo e fissare due regole che valgono per tutti. Poi porti con te quel compito per tre allenamenti consecutivi, e se qualcuno te lo chiede glielo ricordi.'],

  ['la-posta', 'LA POSTA', 'easy', 'recitazione',
   'Una telefonata immaginaria, recitata a voce alta per trenta secondi come se fosse vera: tu chiami qualcuno che non sa niente e gli dai notizie sulla palestra. Deve sembrare una telefonata vera, e quando "l\'altro" riattacca tu rispondi senza fermarti.'],

  ['la-lente', 'LA LENTE', 'easy', 'memoria',
   'Prima di iniziare, guarda i tre attrezzi che userai oggi e memorizza i loro numeri. A fine serie, senza guardare nulla, recita quei tre numeri al tuo amico nell\'ordine esatto in cui li hai usati. Se sbagli uno solo, la serie si rifa da capo.'],

  ['la-posa-vincitore', 'LA POSA', 'easy', 'fasi',
   'Una posa unica in tre fasi, e ogni fase dura quindici secondi: prima la posa da dopo la serie, poi la stessa posa mentre spieghi la tua vittoria come un intervista, poi la stessa posa con una mano che stringe un oggetto che in realtà non c\'è. Un amico sceglie quale fase fare.'],

  ['personal-trainer-inutile', 'IL PERSONAL TRAINER', 'easy', 'improvvisazione',
   'Spiega a un amico, per trenta secondi senza fermarti un attimo, un principio di allenamento completamente assurdo, ma detto con la serietà di uno scienziato. Non puoi ricorrere a "non so", e se lui ti fa una domanda devi rispondere inventando.'],

  ['il-profeta', 'IL PROFETA', 'unhinged', 'fasi',
   'Prima della serie fai tre previsioni assurde sul tuo allenamento, per esempio: "La prossima macchina che userò mi cambierà la vita". Dopo ogni previsione devi inventare una spiegazione che sembri tecnica. Non puoi ripetere lo stesso argomento, e alla fine torni e dici quanto avevi indovinato.'],

  ['il-segreto', 'IL SEGRETO', 'unhinged', 'creativita',
   'Racconta a un amico un "segreto" che non esiste e che nessuno dei due conosce: prima gli dai un titolo importante, poi gli spieghi che cosa contiene. Non puoi cambiare discorso, e devi rispondere anche alle sue domande come se fosse tutto vero.'],

  ['il-commentatore-sportivo', 'IL TELECRONISTA', 'unhinged', 'recitazione',
   'Fai la telecronaca di una serie banale di un amico, per quaranta secondi. Assegni voti con criteri assurdi e inventati, tipo la velocità del suo respiro o la temperatura della scarpa, e li motivi uno per uno. Alla fine chiedi "sei d\'accordo?" e non accetti risposte.'],

  ['la-domanda-sul-peso', 'LA DOMANDA SUL PESO', 'insane', 'memoria',
   'Prima della serie chiedi a un tuo amico di indovinare il tuo peso entro dieci grammi. Se sbaglia, fate la serie e al termine lui indovina di nuovo. Nessuno guarda niente: si decide a memoria e a impressione, e il risultato si annuncia come se fosse scientifico.'],

  ['il-consiglio-segreto', 'IL CONSIGLIO SEGRETO', 'legendary', 'amici',
   'Inventa un indovinello assurdo su un tuo amico, in trenta secondi, con una risposta che esiste solo nella tua testa. Lui ha diritto a tre domande sì o no prima di indovinare, e se sbaglia devi spiegare la risposta inventata come se fosse la soluzione vera.'],

  ['la-palestra-pirata', 'LA PALESTRA PIRATA', 'legendary', 'regole',
   'Cinque minuti esatti e quattro obiettivi precisi, da portare a termine senza parlare: due serie da cinque ripetizioni, una pausa di un minuto in piedi e un cambio di attrezzo almeno due volte. Alla fine dichiara il bottino, voce da capitano.', { segreta: true }],

  ['la-grande-palestra', 'LA GRANDE PALESTRA', 'legendary', 'regole',
   'Cinque minuti, e un rito diverso per ogni attrezzo che usi: uno batte le mani, uno si tocca l\'elmo di fantasia, uno conta ad alta voce, uno saluta. Non puoi ripetere lo stesso rito, e se usi lo stesso attrezzo due volte il rito deve cambiare.', { segreta: true }],

  ['la-mafia', 'LA MAFIA', 'insane', 'creativita',
   'Dichiara di essere il capo di un\'organizzazione criminale fittizia composta solo da personaggi inventati, e assegna a ciascuno un ruolo e una mansione assurda. Tieni una riunione di trenta secondi in cui ognuno "interviene", e alla fine sciogli l\'organizzazione con una dichiarazione ufficiale.'],
];

// ---------------------------------------------------------------------------
// LE 10 NUOVE, con i testi scritti da Ste.
// ---------------------------------------------------------------------------
const NUOVE = [
  ['comunicato-disastroso', 'IL COMUNICATO DISASTROSO', 'easy', 'improvvisazione',
   'Dopo una serie normale, convoca una conferenza stampa davanti ai tuoi amici. Devi spiegare per almeno 20 secondi perché la tua prestazione è stata un evento storico, anche se non hai battuto nessun record. Concludi con: "Non posso dire altro per rispetto dei tifosi".'],

  ['contratto-col-diavolo', 'IL CONTRATTO CON IL DIAVOLO', 'easy', 'recitazione',
   'Prima di una serie, inventa un contratto di tre clausole che devi rispettare per riuscire nell\'impresa. Leggilo con voce da avvocato malvagio. Al termine della serie, dichiara solennemente se il contratto è stato rispettato.'],

  ['processo-al-manubrio', 'IL PROCESSO AL MANUBRIO', 'unhinged', 'recitazione',
   'Accusa un manubrio di averti rovinato la giornata. Interpreta sia il pubblico ministero sia l\'avvocato difensore, usando due voci diverse. Devi presentare due prove, una difesa e un verdetto finale.'],

  ['intervista-al-fallimento', 'L\'INTERVISTA AL FALLIMENTO', 'unhinged', 'amici',
   'Chiedi a un amico di intervistarti dopo una serie normalissima. Devi rispondere a tre domande come un atleta appena eliminato dalla finale mondiale. Almeno una risposta deve contenere la frase: "Mi assumo tutte le responsabilità".'],

  ['motivatore-inutile', 'IL MOTIVATORE INUTILE', 'unhinged', 'recitazione',
   'Fai a un amico un discorso motivazionale di 30 secondi per convincerlo a raggiungere un obiettivo completamente inutile, come diventare il miglior esperto mondiale di cucchiaini. Devi concludere con uno slogan epico.'],

  ['profeta-delle-cavolate', 'IL PROFETA DELLE CAVOLATE', 'insane', 'fasi',
   'Fai tre previsioni assurde sul tuo prossimo allenamento, per esempio: "La prossima macchina che userò mi cambierà la vita". Dopo ogni previsione devi inventare una spiegazione che sembri scientifica. Non puoi ripetere lo stesso argomento.'],

  ['processo-al-campione', 'IL PROCESSO AL CAMPIONE', 'insane', 'amici',
   'Il tuo amico ti accusa di un crimine sportivo immaginario: aver fatto una ripetizione troppo perfetta. Hai 45 secondi per difenderti, portare una prova inventata e convincere la giuria. Un secondo amico pronuncia il verdetto.'],

  ['documentario-sulla-patata', 'IL DOCUMENTARIO SULLA PATATA', 'insane', 'creativita',
   'Registra un documentario di 45 secondi su un oggetto casuale della palestra, come se fosse una specie rarissima in via d\'estinzione. Devi includere habitat, comportamento, alimentazione e una curiosità inventata.'],

  ['discorso-di-dimissioni', 'IL DISCORSO DI DIMISSIONI', 'legendary', 'fasi',
   'Annuncia agli amici che ti dimetti ufficialmente dalla tua carriera di atleta, motivando la decisione con tre ragioni assurde. Dopo 30 secondi, cambi idea improvvisamente e proclami il tuo ritorno.'],

  ['boss-del-ridicolo', 'IL BOSS DEL RIDICOLO', 'legendary', 'improvvisazione',
   'Gli amici scelgono tre parole casuali. Devi improvvisare un discorso epico di 60 secondi che le contenga tutte, fingendo di essere il boss finale di un videogioco. Devi avere un nome, una frase d\'attacco e un punto debole ridicolo.'],
];

// ---------------------------------------------------------------------------
// LE DOPPIONI CHE STANNO IN UNA SOLA MISSIONE, E QUELLE CHE STANNO FUORI.
// ---------------------------------------------------------------------------
const DA_TOGLIERE = [
  // le pose: sono finite dentro "la-posa-vincitore", che ora ha tre fasi
  'la-posa-casuale', 'la-locandina', 'la-fotografia', 'la-foto-criminale',
  // le telecronache: sono finite dentro "il-commentatore-sportivo"
  'la-telecronaca-personale', 'il-telecronista', 'il-giudice-olimpico',
  // i portavoce: è rimasto solo "il-portavoce", e senza sconosciuti
  'il-portavoce-sconosciuto', 'la-presentazione-sconosciuto', 'la-conferenza-pubblica',
  // via le tre che danno consigli sbagliati o si mettono nei guai con gli altri
  'il-consiglio-gratuito', 'il-doppio-personal-trainer', 'la-lavagna',
];

// il portavoce che resta, riscritto: niente sconosciuti, e meccanica nuova
const RISCRITTE_EXTRA = [
  ['il-portavoce', 'IL PORTAVOCE', 'insane', 'amici',
   'Assumi il ruolo di portavoce di un tuo amico e racconta a un altro amico la sua serie, trenta secondi, alternando cose vere e cose inventate. A un certo punto il portato ti interrompe e ti corregge: devi riprendere il filo senza ammettere che hai inventato.'],
];

// ---------------------------------------------------------------------------
// CONTROLLI PRIMA DI SCRIVERE
// ---------------------------------------------------------------------------
const problemi = [];
for (const [id] of [...RISCRITTE, ...RISCRITTE_EXTRA]) {
  if (!mappa.has(id)) problemi.push(`id da riscrivere che non esiste: ${id}`);
}
for (const [id] of NUOVE) {
  if (mappa.has(id)) problemi.push(`id nuovo che esiste gia': ${id}`);
}
for (const id of DA_TOGLIERE) {
  if (!mappa.has(id)) problemi.push(`id da togliere che non esiste: ${id}`);
}
const nuoviId = [...RISCRITTE, ...RISCRITTE_EXTRA, ...NUOVE].map(([id]) => id);
if (new Set(nuoviId).size !== nuoviId.length) problemi.push("id duplicati fra le modifiche");
if (problemi.length) {
  console.error("NON SCRIVO, controlli falliti:");
  for (const p of problemi) console.error("  - " + p);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// SCRIVERE
// ---------------------------------------------------------------------------
const apici = (s) => `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const costruisci = ([id, titolo, diff, mecc, testo, extra = {}]) => {
  const campi = [`id: '${id}'`];
  for (const [k, v] of Object.entries(extra)) {
    if (k === "segreta") campi.push(`segreta: ${v}`);
  }
  const coda = Object.keys(extra).length ? `{ ${campi.join(", ")} }` : "";
  return `M(${apici(id)}, ${apici(titolo)},\n    ${apici(testo)}, '${diff}', ` +
    `{ meccanica: '${mecc}'${coda ? ", " + coda : ""} })`;
};

const daRiscrivere = new Map([...RISCRITTE, ...RISCRITTE_EXTRA].map((v) => [v[0], v]));
const nuoveVoci = NUOVE.map(costruisci);
const finali = [];
for (const voce of voci) {
  const id = idDi(voce);
  if (DA_TOGLIERE.includes(id)) continue;
  if (daRiscrivere.has(id)) { finali.push(costruisci(daRiscrivere.get(id))); continue; }
  finali.push(voce);
}
finali.push(...nuoveVoci);

const nuovoCorpo = "\n" + finali.map((v) => "  " + v.replace(/\n/g, "\n  ")).join(",\n") + ",\n";
const nuovoTesto = testo.slice(0, i0 + INIZIO.length) + nuovoCorpo + testo.slice(i1);
writeFileSync(PERCORSO, nuovoTesto, "utf8");

console.log(`prima ${voci.length} voci, dopo ${finali.length}`);
console.log(`  riscritte: ${daRiscrivere.size}`);
console.log(`  nuove:     ${NUOVE.length}`);
console.log(`  tolte:     ${DA_TOGLIERE.length}`);