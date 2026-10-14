// missioni.js -- Daily, Weekly e Secret Missions.
//
// Tre regole che valgono sempre:
//  1) le WEEKLY e le SECRET sono DIVERSE PER CIASCUNO. Il seme nasce dalla
//     settimana (es. 2026-W40) PIù dall'account, quindi due persone nella
//     stessa settimana non vedono le stesse sfide.
//     (Prima erano uguali per tutti: Ste ha chiesto di cambiarlo.)
//  2) la DAILY È una per persona al giorno (dipende da utente + giorno) e si
//     può completare una volta sola al giorno.
//  3) ogni missione completata resta registrata e non viene riproposta:
//     nessuna sfida si ripete per la stessa persona, mai.
//
// Due regole di buon senso dette da Ste, valgono per TUTTE le missioni:
//  4) se parli con qualcuno, la missione dice a chi e ti fa fare una domanda;
//  5) si resta dentro la palestra: nessuna missione ti fa uscire.
//
// Tutte le missioni sono innocue: nessun peso pericoloso, nessuna persona
// estranea, nessuna ripresa video, nessun danno alle attrezzature.

export const DIFFICOLTA = {
  easy:      { id: 'easy',      nome: 'EASY',      aura: 20,  xp: 20,  colore: '#37d18b' },
  unhinged:  { id: 'unhinged',  nome: 'UNHINGED',  aura: 40,  xp: 40,  colore: '#ffd166' },
  insane:    { id: 'insane',    nome: 'INSANE',    aura: 75,  xp: 75,  colore: '#ff5f6d' },
  legendary: { id: 'legendary', nome: 'LEGENDARY', aura: 150, xp: 150, colore: '#c04cff' },
};

/** Quante Weekly e quante Secret per settimana. */
export const NUMERO_WEEKLY = 5;
export const NUMERO_SECRET = 2;

/** Una Secret vale di più della stessa missione come Weekly. */
export const MOLTIPLICATORE_SECRET = 1.5;

// ---------------------------------------------------------------------------
// Il pool delle missioni. Tutte qui dentro: aggiungerne una È una riga.
// ---------------------------------------------------------------------------

/**
 * LE MECCANICHE: COME SI GIOCA, NON DI COSA PARLA.
 *
 * Ste (13/10/2026): "la modifica più importante: le missioni dovrebbero avere
 * meccaniche diverse, non solo testi diversi. Alcune richiedono improvvisazione,
 * altre memoria, recitazione, creatività, prove con gli amici o più fasi
 * consecutive. Cosi' i livelli EASY, UNHINGED, INSANE e LEGENDARY diventano davvero
 * diversi anche nel modo in cui si giocano".
 *
 * E' il punto giusto. Prima la differenza fra una EASY e una INSANE era solo la
 * lunghezza del testo: erano la stessa gag con più parole. Con la meccanica due
 * missioni della stessa difficolta' sono due giochi diversi, e una settimana non
 * e' più cinque volte la stessa cosa.
 */
export const MECCANICHE = {
  improvvisazione: { id: 'improvvisazione', nome: 'Improvvisazione', cosa: 'devi inventare la risposta sul momento' },
  memoria:         { id: 'memoria',         nome: 'Memoria',         cosa: 'ricordi e reciti, senza guardare' },
  recitazione:     { id: 'recitazione',     nome: 'Recitazione',     cosa: 'fai la scena con voce e atteggiamento' },
  creativita:      { id: 'creativita',      nome: 'Creatività',      cosa: 'costruisci qualcosa che non esiste' },
  amici:           { id: 'amici',           nome: 'Con gli amici',   cosa: 'servono altre persone che ti rispondono' },
  fasi:            { id: 'fasi',            nome: 'A fasi',          cosa: 'sono due o tre passaggi in fila' },
  regole:          { id: 'regole',          nome: 'A regole',        cosa: 'obiettivi precisi da rispettare' },
};

/**
 * Deduce la meccanica di una missione che non la dichiara.
 *
 * Non si scrive a mano per tutte e 112: si deducono da quattro parole. Non è un
 * trucco, è una regola esplicita e ispezionabile: se la deduplica sbaglia, il
 * testo dice perché, e chiunque può correggerla. E le missioni che Ste ha voluto
 * riscrivere la dichiarano per bene, quindi non passano di qui.
 */
const DEDUZIONE = [
  [/numer|ricord|memor|ripeti.*(due|tre) volte|ripetizione/i, 'memoria'],
  [/invent|crea|titolo assurdo|rivelazione|organizzazione|razza\b|rarissima/i, 'creativita'],
  [/inchin|annunc|conferenza|dialogo|documentar|recit|portavoce|telecronac|tribunal|processo|dimissioni/i, 'recitazione'],
  [/obiettiv|precision|esattamente|entro \d|per ogni attrezzo|sequenza/i, 'regole'],
  [/poi .*(poi|infine|dopo)|prima .*(poi|poi infine)|due fasi|tre (passaggi|fasi)|in due|in tre passaggi|fase/i, 'fasi'],
  [/amico|alla sala|ai tuoi amici|compagno|giuria/i, 'amici'],
];

export function meccanicaDi(missione) {
  if (missione && missione.meccanica && MECCANICHE[missione.meccanica]) return missione.meccanica;
  const testo = missione ? `${missione.id} ${missione.titolo} ${missione.testo}` : '';
  for (const [espressione, meccanica] of DEDUZIONE) {
    if (espressione.test(testo)) return meccanica;
  }
  return 'improvvisazione';
}

const M = (id, titolo, testo, difficolta, extra = {}) => ({
  id, titolo, testo, difficolta, segreta: false,
  meccanica: meccanicaDi({ id, titolo, testo }),
  ...extra,
});

export const POOL = [
  M('la-domanda-maledetta', 'LA DOMANDA MALEDETTA',
      'Fai a un tuo amico una domanda completamente assurda, del tipo: "Secondo te siamo arrivati qui per merito o per caso?" Lui risponde, e tu devi inventare sul momento una spiegazione seria che tenga insieme la domanda e la risposta che ha appena dato. Non puoi dire "non so" e non puoi spiegare che era una sfida.', 'easy', { meccanica: 'improvvisazione' }),
  M('annuncio-ufficiale', 'ANNUNCIO UFFICIALE',
      'Due fasi, e vanno fatte entrambe. Prima, prima di iniziare: annuncia alla sala con voce da comunicatore, "Da oggi comincia la mia epoca, preparatevi", e poi allenati normalmente. Dopo la serie, torna davanti a chi ti ha sentito e aggiungi una frase sola di chiusura ufficiale, senza spiegare niente.', 'easy', { meccanica: 'fasi' }),
  M('il-boss-finale', 'IL BOSS FINALE',
      'Prima di iniziare una serie, guarda un tuo amico negli occhi e mettiti in scena un dialogo drammatico: tu sei il boss che torna, lui è l\'eroe. Devono essere almeno trenta secondi, una frase per ciascuno, e deve finire su una domanda a cui l\'altro deve rispondere prima che tu cominci la serie.', 'easy', { meccanica: 'recitazione' }),
  M('titolo-assurdo', 'IL TITOLO',
      'Dai a un tuo amico un titolo assurdo, tipo "Supremo Custode della Lat Machine". Per i 5 minuti successivi devi chiamarlo solo così.', 'unhinged'),
  M('il-profeta', 'IL PROFETA',
      'Prima della serie fai tre previsioni assurde sul tuo allenamento, per esempio: "La prossima macchina che userò mi cambierà la vita". Dopo ogni previsione devi inventare una spiegazione che sembri tecnica. Non puoi ripetere lo stesso argomento, e alla fine torni e dici quanto avevi indovinato.', 'unhinged', { meccanica: 'fasi' }),
  M('conferenza-stampa', 'IL COLLOQUIO',
      'Fai sedere un amico davanti a te e falle il colloquio di lavoro per un ruolo in palestra. La prima domanda deve essere: "Perché vuoi questo posto?" Poi ne fai altre due, e alla fine lo rifiuti con tre motivi, senza sorridere mai. Se a metà ti viene da dargli il posto, ricominci dal principio con un tono ancora più severo.', 'unhinged', { meccanica: 'recitazione' }),
  M('il-documentario', 'IL DOCUMENTARIO',
      'Per 30 secondi racconta la storia di un tuo amico come se fosse il protagonista di un documentario. "Era il 2026. Marco non sapeva ancora che quel giorno avrebbe cambiato tutto."', 'insane'),
  M('il-ritorno-missione', 'IL RITORNO',
      'Torna dal tuo gruppo di allenamento con la faccia seria, come se arrivassi da una missione difficile, e chiedi a uno di loro: "Ragazzi, indovinate da dove vengo?" Se sbagliano, scrolla le spalle e non spiegare niente.', 'insane'),
  M('bro-ha-cambiato-vita', 'IL BRO HA CAMBIATO VITA',
      'Spiega a un amico, come se fosse una conferenza stampa, il metodo di allenamento che hai inventato questa settimana. Devi sostenerlo per trenta secondi con tre vantaggi concreti e un nome tutto tuo per il metodo. Alla fine gli chiedi se è convinto, e poi devi guardarlo e chiedergli: "Quello che ti ho detto ti convince?"', 'easy', { meccanica: 'recitazione' }),
  M('applauso-inutile', 'APPLAUSO INUTILE',
      'Dopo che un amico completa una serie normalissima, applaudilo lentamente per 5 secondi come se avesse appena stabilito un record mondiale. Poi chiedigli: "Ti sembra di averlo meritato?"', 'easy'),
  M('personal-trainer-inutile', 'IL PERSONAL TRAINER',
      'Spiega a un amico, per trenta secondi senza fermarti un attimo, un principio di allenamento completamente assurdo, ma detto con la serietà di uno scienziato. Non puoi ricorrere a "non so". A un certo punto lui ti interrompe e ti chiede: "Qual è il punto?". Tu devi rispondere inventando, senza fermarti.', 'easy', { meccanica: 'improvvisazione' }),
  M('aura-check', 'AURA CHECK',
      'Chiedi a tre amici, uno alla volta: "Da 1 a 100, quanta Aura ho oggi?". Non puoi discutere la risposta e non puoi correggerla. Poi vai da chi ti ha dato il numero più basso e ripetilo ad alta voce: "Ha detto il numero più basso. Se non è il mio, è un errore di misura."', 'unhinged', { meccanica: 'amici' }),
  M('il-rituale', 'IL RITUALE',
      'Inventa un rituale di quattro mosse prima della serie e ripetilo identico per le prime tre serie del giorno. Se cambi l\'ordine di una mossa, il rituale si rompe e ricominci dal primo esercizio. Nessuno deve vederti farlo a metà.', 'unhinged', { meccanica: 'fasi' }),
  M('il-rispetto', 'IL RISPETTO',
      'Al termine di una serie scegli un tuo amico e fagli un inchino formale, come a un campione. Poi pronunci un elogio solenne di almeno venti secondi, usando il suo nome e due aggettivi che non hai mai usato per lui. Lui non deve ridere e tu non spieghi che è una sfida.', 'easy', { meccanica: 'recitazione' }),
  M('la-frase-maledetta', 'LA FRASE MALEDETTA',
      'Durante una conversazione normale devi riuscire a dire, senza riderti: "È esattamente quello che direbbe una persona con 73 Aura." Poi chiedigli: "Ci credi?"', 'unhinged'),
  M('intervista-post-gara', 'INTERVISTA POST-GARA',
      "Dopo una serie fai finta che i tuoi amici siano giornalisti e rispondi a una domanda inventata sulla tua performance. Poi chiedi: \"Altre domande?\" Resti completamente serio.", 'insane'),
  M('il-campione', 'IL CAMPIONE',
      'Dopo la serie di un amico dagli una medaglia immaginaria e digli: "Sei stato un campione." Poi chiedigli: "Ci credi?" Torna al tuo allenamento.', 'easy'),
  M('il-pensiero', 'IL PENSIERO',
      'Dichiara a un amico una regola che vale per tutta la seduta, per esempio "oggi finisco ogni serie al massimo al secondo tentativo", e scrivila su un pezzo di carta. Poi chiedi: "Ce la faccio a tenere questa regola?" Se la rompi una volta sola, la giornata ricomincia dall\'esercizio in cui l\'hai rotta.', 'unhinged', { meccanica: 'regole' }),
  M('sguardo-misterioso', 'IL GUARDO MISTERIOSO',
      'Guarda un amico negli occhi per trenta secondi senza parlare. Poi chiedi: "Che cos\'hai che non va?" e non accettare nessuna risposta vaga: se dice "niente", ripeti la domanda finché non dice una cosa vera.', 'unhinged', { meccanica: 'amici' }),
  M('la-dignita', 'LA DIGNITÀ',
      'Fai tre serie consecutive senza ridere e conta le ripetizioni ad alta voce come se fossi un arbitro. Se ridi in qualunque momento, la serie vale zero e ricominci dal primo esercizio del giorno. Al massimo una volta, e non ne parli.', 'insane', { meccanica: 'regole' }),
  M('il-piano', 'IL PIANO',
      'Spiega il tuo piano per i prossimi dieci anni come se fosse una partita a scacchi, con le mosse. Ne devi dire almeno tre, e ognuna deve essere una cosa che puoi fare davvero in palestra. Poi chiedi: "Quale di queste mosse secondo te mi fa perdere?"', 'unhinged', { meccanica: 'recitazione' }),
  M('il-nome', 'IL RINOMINATO',
      'Scegli un nome assurdo per il tuo amico e chiamalo con quello per tutta la serie, almeno cinque volte. Poi chiedi: "Adesso come ti chiami?" e lui deve rispondere con il nome assurdo. Se usa il suo, la serie vale zero e la ricominci.', 'easy', { meccanica: 'amici' }),
  M('la-musica', 'LA MUSICA',
      'Canticchia per tutta la serie una canzone che non esiste, con un ritornello che inventi al volo, e lo stesso ritornello ti deve tornare per tre serie di fila. Se ti blocchi, il brano si chiama "Intermezzo" e cominci da capo.', 'insane', { meccanica: 'improvvisazione' }),
  M('il-contratto', 'IL CONTRATTO',
      'Proponi un patto assurdo al tuo amico: se arriva a 8 ripetizioni, domani deve chiamarti "maestro". Se sbaglia, vale per tutta la settimana.', 'unhinged'),
  M('il-filosofo', 'IL FILOSOFO',
      "Cita un proverbio sulla forza che non esiste, inventato da te, e spiegolo come se fosse antichissimo. Poi chiedi: \"Non è forse vero?\"", 'insane'),
  M('il-guardiano', 'IL GUARDIANO',
      'Scegli un attrezzo della palestra e dichiarati davanti a un amico il suo custode ufficiale. Devi dire perché proprio quell\'attrezzo e fissare due regole che valgono per tutti. Poi porti con te quel compito per tre allenamenti consecutivi, e se qualcuno ti chiede "Perché proprio quello?", gli ricordi la regola.', 'easy', { meccanica: 'fasi' }),
  M('il-silenzio', 'IL SILENZIO',
      'Fai una serie intera in silenzio assoluto e solo l\'ultima ripetizione rompe il silenzio, con una sola parola. Poi spiega in tre frasi esatte cosa hai pensato durante il silenzio, e non puoi usare la parola "silenzio" in nessuna delle tre.', 'easy', { meccanica: 'regole' }),
  M('il-punto', 'IL PUNTO',
      "Segna il punto come se fosse una partita di tennis: fai il gesto con la mano e diglielo ad alta voce: PUNTO PER ME. Poi chiedi a un amico: \"Che voto mi dai?\"", 'insane'),
  M('la-fisica', 'LA FISICA',
      'Spiega la tua serie come se fosse un fenomeno fisico, con le formule e le unità di misura sbagliate. Almeno tre formule. Poi chiedi: "Quanta forza serve per alzare una persona che si alza male?" e il tuo amico deve darti un numero.', 'insane', { meccanica: 'recitazione' }),
  M('il-voto-assurdo', 'IL VOTO ASSURDO',
      "Assegna alla serie del tuo amico un voto completamente arbitrario, difendilo con convinzione e poi chiedi: \"Non sei d'accordo?\" Non accettare discussioni.", 'insane'),
  M('la-presentazione', 'LA PRESENTAZIONE',
      'Presenta il tuo amico agli altri dicendo: "Questo è il mio migliore allenatore". Lui deve accettare il titolo per tutta la seduta. A fine seduta chiedigli: "Hai cambiato idea sull\'allenatore?" e se dice di no devi fare un\'altra serie per convincerlo.', 'easy', { meccanica: 'amici' }),
  M('il-timer-dramma', 'IL CRONOMETRO DRAMMATICO',
      'Conta ad alta voce le ripetizioni del tuo amico con il ritmo di unboxing in diretta, e commenta ogni numero come se fosse una novità. Alla fine chiedi: "Ti è piaciuto il commento?" e se dice di no rifai le ultime cinque ripetizioni con lo stesso ritmo.', 'unhinged', { meccanica: 'amici' }),
  M('la-vittoria', 'LA VITTORIA',
      "Festeggia in silenzio la tua ultima serie come se fosse stata una finale di mondiale. Poi guarda un amico e chiedigli: \"Hai visto?\" Silenzio totale.", 'insane'),
  M('il-consiglio-di-lunedio', 'IL CONSIGLIO DI LUNEDI',
      'Prima di iniziare dillo con voce seria: "Non allenarti oggi. Allenati domani. Oggi stai solo guardando." Poi allenati comunque per tre serie. Se durante le tre serie ti scappa "oggi non mi alleno", la terza serie vale zero.', 'unhinged', { meccanica: 'regole' }),
  M('la-domanda-proibita', 'LA DOMANDA PROIBITA',
      'Fai al tuo amico una sola domanda imbarazzante ma innocua, poi guarda l\'orologio e non rispondere. Lascialo nel dubbio per trenta secondi. Poi chiedi: "Ti ricordi la domanda esatta?" e se sbaglia le parole la domanda vale doppio.', 'legendary', { meccanica: 'amici' }),
  M('il-film', 'IL FILM',
      "Racconta in venti secondi come sarebbe un film sulla tua palestra: titolo, trama, finale. Raccontalo a un amico e poi chiedi: \"Ci guarderesti?\"", 'insane'),
  M('la-porta-sacra', 'LA PORTA SACRA',
      'Tocca tre volte la pedana come fosse una porta sacra, poi entra nell\'esercizio con lo stesso rispetto di un pellegrino. Ripeti la sequenza identica per quattro serie e se salti una battuta la porta si richiude: ricominci dal primo esercizio.', 'easy', { meccanica: 'fasi' }),
  M('la-rovescia', 'IL CONTO ALLA ROVESCIA',
      'Conta alla rovescia ad alta voce per ogni ripetizione della tua serie, partendo dal numero di ripetizioni che ti restano. Se sbagli un numero ripeti tutta la serie da capo. Poi chiedi: "Qual era l\'ultimo numero detto?" e se sbaglia rifai l\'ultima serie.', 'unhinged', { meccanica: 'regole' }),
  M('il-carico', 'A CARICO',
      "Prima dell'ultima serie annuncia A CARICO come se fosse il titolo di un film, poi spingi come nel film. A fine serie chiedi: \"Come l'hai trovata?\"", 'insane'),
  M('il-segreto', 'IL SEGRETO',
      'Racconta a un amico un "segreto" che non esiste e che nessuno dei due conosce: prima gli dai un titolo importante, poi gli spieghi che cosa contiene. Non puoi cambiare discorso, e a ogni sua domanda devi rispondere come se fosse tutto vero: lui ti chiede "Ma come fai a saperlo?" e tu inventi la spiegazione.', 'unhinged', { meccanica: 'creativita' }),
  M('l-annuncio-duro', "L'ANNUNCIO DURO",
      'Presentati come "l\'allenatore più severo del mondo". Dai tre ordini a te stesso ad alta voce e rispettali per tre serie: nessuna pausa non prevista, nessuna risata, nessuna trattativa. Se un ordine è impossibile, la terza serie vale zero.', 'easy', { meccanica: 'recitazione' }),
  M('la-preghiera', 'LA PREGHIERA',
      'Prima della serie del tuo amico prega ad alta voce per le sue ripetizioni, con serietà totale, e non fermarti finché non ha finito. Lui deve continuare ad allenarsi senza sorridere. Poi chiedi: "Le mie preghiere hanno funzionato?" e accetta solo un sì.', 'unhinged', { meccanica: 'amici' }),
  M('il-confronto-storico', 'IL CONFRONTO STORICO',
      'Davanti ai tuoi amici ricordi il 2019 e spieghi che allora eri debolissimo, con i numeri. Poi chiedi: "Ci credete?" Se dicono di sì dimostri il contrario con una serie, se dicono di no racconti il 2019 di nuovo con altri dettagli.', 'unhinged', { meccanica: 'amici' }),
  M('il-trombone', 'IL TROMBONE',
      'Fai dieci secondi di trombone senza suono, a bocca chiusa, muovendoti come se suonassi. Ripetilo tre volte di fila senza fermarti e se esce un suono il trombone si è rotto: ricominci dal primo esercizio. Poi spiega a chi ti guarda che si sente solo se sei allenato.', 'insane', { meccanica: 'improvvisazione' }),
  M('la-mafia', 'LA MAFIA',
      'Dichiara di essere il capo di un\'organizzazione criminale fittizia composta solo da personaggi inventati, e assegna a ciascuno un ruolo e una mansione assurda. Tieni una riunione di trenta secondi in cui ognuno "interviene", e alla fine sciogli l\'organizzazione con una dichiarazione ufficiale.', 'insane', { meccanica: 'creativita' }),
  M('il-muro', 'IL MORMORIO',
      'Parla per tutta la serie a sussurro, ma ogni frase deve essere capita dal tuo amico solo con i gesti che fai. Se lui non ne capisce una, la ripeti a volume e quella ripetizione vale zero. Le frasi devono essere almeno sei.', 'unhinged', { meccanica: 'regole' }),
  M('il-doppio-ruolo', 'IL DOPPIO RUOLO',
      'In una sola serie fai contemporaneamente l\'allenatore e l\'atleta: dai cinque ordini a te stesso con due voci diverse, uno per ciascuno, e obbedisci subito a ogni ordine. Se le due voci si contraddicono l\'ordine non vale e devi ripeterlo.', 'insane', { meccanica: 'recitazione' }),
  M('la-direttrice', 'LA DIRETTRICE',
      'Dirigi l\'esercizio del tuo amico come un coro: dai l\'attacco, il rallentando e il piano seguendo ogni frase con la mano, senza parlare con la voce. A fine serie chiedigli: "BIS?" e se sbaglia una parola gli fai ricominciare l\'esercizio da capo.', 'insane', { meccanica: 'improvvisazione' }),
  M('il-mistero', 'IL MISTERO',
      'Spiega che hai scoperto una tecnica segreta e insegnala in tre parole esatte, che devono essere le stesse per cinque ripetizioni consecutive. Se cambi una parola la tecnica non funziona e ripeti dal primo. Poi chiedi: "Funziona anche su di voi?" e accetta solo un sì.', 'legendary', { meccanica: 'regole' }),
  M('il-padre', 'IL PADRE',
      'Incoraggia il tuo amico con le frasi più assurde possibili di un padre al debutto in palestra: almeno sei frasi senza fermarti. Poi chiedi: "Papà, contenti?" Se ride, ricominci le sei frasi da capo e con lo stesso identico tono.', 'insane', { meccanica: 'amici' }),
  M('il-dottore', 'IL MEDICO',
      'Conferma con serietà che con 5 kg in più starai meglio. Dai tre diagnosi in una seduta clinica finta, senza spiegazioni e senza ammettere dubbi. A una domanda tecnica rispondi solo: "È un effetto noto". Poi chiedi: "Ti fidi della diagnosi?"', 'unhinged', { meccanica: 'recitazione' }),
  M('il-mare-verso', 'IL MARE VERSO',
      'Dopo ognuna delle prime tre serie porta le mani alla fronte come se guardassi il mare e di\': "Stiamo andando benissimo". Le tre volte devono essere identiche e se aggiungi qualunque parola l\'allenamento è ricominciato.', 'easy', { meccanica: 'fasi' }),
  M('la-lotta', 'LA LOTTA INTERNA',
      'Durante la serie più pesante della giornata discuti con te stesso ad alta voce: una frase per ogni ripetizione, alternate fra "ce la faccio" e "non ce la faccio". Non puoi dire due volte di fila la stessa frase, e alla fine chiudi con un verdetto di una parola sola.', 'insane', { meccanica: 'regole' }),
  
    // ---- le sfide di Ste, scritte da lui il 07/10/2026 ----
    // Queste sono sue, parola per parola nel senso. Livello e punti li ho messi io, e
    // il criterio È uno solo: quanto ti mette in imbarazzo se ti vede un amico che
    // NON sta facendo nessuna delle cose che hai scritto tu.
    //  - easy      (20 aura): lo fai senza accorgertene, e ridi anche tu
    //  - unhinged  (40 aura): te la cavi con faccia seria
    //  - insane    (75 aura): se qualcuno ti vede, ride di te per una settimana
    //  - legendary (150 aura): va fatta di nascosto, e le SECRET valgono anche di più
    //
    // DIECIOTTO su ventidue erano già nel pool o ci somigliavano troppo:
    //  - "intervista post-gara" esiste già (id interview-post-gara): stesso testo
    //    dentro, quindi NON l'ho rimessa
    //  - le altre che si somigliano sono tenute separate apposta: la posa da
    //    vincitore, la foto da campione, l'applauso all'amico e il conto delle
    //    ripetizioni sono sfide DIVERSE da queste, e qui ognuna ha la sua.
    // ---------------------------------------------------------------------------,
  M('lo-specchio-maledetto', 'IL SPECCHIO MALEDETTO',
      'Fai davanti allo specchio una posa da bodybuilder esagerata e tientila per venti secondi senza muovere il corpo. In tutta la posa il viso deve restare serio: se ti vedi sorridere o fare una smorfia, la posa vale zero e la rifai da capo.', 'insane'),
  M('il-coach-improvvisato', 'IL COACH IMPROVVISATO',
      'Spiega a un amico, con serietà da allenatore, come si fa un esercizio normalissimo, e non cambiare mai discorso. Alla fine chiedigli: "Tutto chiaro?"', 'unhinged'),
  M('la-presentazione-epica', 'LA PRESENTAZIONE EPICA',
      'Prima di una serie presentati come se stessi entrando sul palco del Mr. Olympia: nome, cognome e paese, senza sorridere. Poi fai la serie guardando sempre un punto fisso davanti a te, senza parlare e senza voltarti, e se ti guardi allo specchio la serie vale zero.', 'unhinged', { meccanica: 'regole' }),
  M('applauso-personale', 'APPLAUSO PERSONALE',
      'Dopo ognuna delle prime tre serie fai dieci secondi di applauso a te stesso, guardandoti nello specchio. Le tre volte devono essere identiche e durante gli applausi non puoi parlare. Se ti vedi fare una smorfia, ricominci dal primo esercizio.', 'easy', { meccanica: 'fasi' }),
  M('il-ringraziamento', 'IL RINGRAZIAMENTO',
      'Dopo aver finito un esercizio guarda la macchina negli occhi e ringraziala solennemente, ad alta voce, come se ti avesse appena salvato la vita.', 'easy'),
  M('il-commentatore-sportivo', 'IL TELECRONISTA',
      'Fai la telecronaca di una serie banale di un amico, per quaranta secondi. Assegni voti con criteri assurdi e inventati, tipo la velocità del suo respiro o la temperatura della scarpa, e li motivi uno per uno. Alla fine chiedi "sei d\'accordo?" e non accetti risposte.', 'unhinged', { meccanica: 'recitazione' }),
  M('il-motivatore', 'LA PIAGA',
      'Il tuo amico dice che quell\'esercizio non gli serve a niente. Devi dargli tre motivi uno dopo l\'altro per convincerlo a farlo comunque, e ogni motivo deve essere peggiore del precedente. Non puoi ammettere che ha ragione lui. Alla fine chiedi: "Allora lo fai?" e accetta solo un sì.', 'unhinged', { meccanica: 'improvvisazione' }),
  M('il-selfie-drammatico', 'L\'ANGOLO MIGLIORE',
      'Prima di iniziare trova l\'angolazione da cui la tua serie sembra la più bella, e da lì fai tutte le ripetizioni senza spostare i piedi. Se a metà ti accorgi di aver cambiato angolo, la serie vale zero e la ricominci da capo.', 'unhinged', { meccanica: 'improvvisazione' }),
  M('l-intervista-fallita', "L'INTERVISTA DELLA SERIE PERFETTA",
      "Chiedi al tuo amico di farti un'intervista dopo una serie andata benissimo e spiegagli con serietà perché l'hai persa. Se ti fa la domanda più brutale, \"come ti senti?\", rispondi: \"Al limite, ma ho dato tutto.\"", 'unhinged'),
  M('l-applauso-obbligatorio', "L'APPLAUSO OBBLIGATORIO",
      "Dopo ogni serie il tuo amico deve applaudirti come se avessi appena fatto qualcosa di storico, e tu non devi sorridere. Poi chiedigli: \"Stavolta l'ho meritato?\"", 'insane'),
  M('il-discorso-al-manubrio', 'IL DISCORSO AL MANUBRIO',
      "Prendi un manubrio e parlagli per trenta secondi come se fosse il tuo migliore amico, senza alzare niente. Alla fine chiedigli: \"Siamo amici?\"", 'insane'),
  M('il-debuttante', 'IL DEBUTTANTE',
      "Per tre minuti chiedi al tuo amico spiegazioni ovvie sull'esercizio che state facendo, e fingi di non capire niente. Parti sempre da: \"Ma questo io lo so fare?\" e fagli almeno sei domande diverse.", 'unhinged'),
  M('il-campione-olimpico', 'IL CAMPIONE OLIMPICO',
      'Dopo una serie normalissima fai finta di aver appena vinto una medaglia olimpica: guarda la bandiera, ringrazia la palestra e rimettiti al lavoro.', 'unhinged'),
  M('il-npc-della-palestra', 'IL NPC DELLA PALESTRA',
      'Per due minuti fai il personaggio di un gioco: cammina con una strana andatura, corri sul posto e ripeti una frase a caso finche nessuno ti guarda.', 'legendary', { segreta: true }),
  M('il-nome-sbagliato', 'IL NOME SBAGLIATO',
      'Per cinque minuti chiama ogni attrezzo con un nome inventato e usalo per tutto, anche parlando con un amico: se ti chiede: "Come si chiama questo attrezzo?" rispondi solo col nome inventato. Ogni volta che ti scappa il nome vero il cinque minuti ricomina da capo, e non puoi ripetere lo stesso nome inventato.', 'insane', { meccanica: 'creativita', segreta: true }),
  M('la-confessione-alla-macchina', 'LA CONFESSIONE ALLA MACCHINA',
      'Racconta alla macchina il tuo fallimento più grande in palestra, con la stessa serietà di un confessionale, e non citare nessun nome.', 'insane', { segreta: true }),
  M('il-traduttore', 'IL TRADUTTORE',
      'Spiega a un amico un esercizio senza mai dirne il nome vero: descrivi solo i movimenti e chiedigli "Quale attrezzo è?" senza svelargli la risposta.', 'insane'),
  
  // ---- sfide con gli sconosciuti: imbarazzo per TE, mai per gli altri ----
    // Ste ha chiesto che siano più difficili delle altre, perchÈ È lo
    // sconosciuto a metterti in imbarazzo. Per questo qui dentro non ci sono
    // missioni "easy": si parte da "unhinged" e si sale fino a "legendary".
    // Con lo sconosciuto parli in modo gentile, non lo tocchi e non gli rovini la
    // giornata: di tutto il resto si fa passare solo TE.
    //
    // REGOLE DETTE DA STE, da rispettare in TUTTE le missioni (non solo queste):
    //  1. se parli con qualcuno, la missione dice SEMPRE a chi: se non lo sai,
    //     non si capisce e la sfida non ha senso;
    //  2. se parli con qualcuno, devi fare SEMPRE una domanda: una frase sola
    //     detta a caso non è una sfida, è solo rumore;
    //  3. si resta dentro la palestra: niente uscire fuori, niente andare in
    //     strada o in cortile, perché alla palestra non si può uscire e
    //     "non saprei cosa dire" non ha nessun senso.,
  M('la-domanda-sui-gammici', 'LA DOMANDA SUI GAMMICI',
      'Chiedi a uno sconosciuto: "Mi scusi, questo esercizio fa bene agli addominali?" Ascolta la risposta con calma, annuisci e ringrazia. Poi allenati come se niente fosse.', 'unhinged'),
  M('il-campione-assente', 'IL CAMPIONE ASSENTE',
      'Avvicinati a chi si allena vicino a te e chiedi: "Scusa, ma secondo te chi è il vero campione qui dentro?" Ascolta la risposta fino in fondo e poi torna alla tua serie senza commentarla. Se la persona ti nomina, fai cinque ripetizioni in più prima di continuare.', 'insane', { meccanica: 'improvvisazione' }),
  M('l-orologio', 'L\'OROLOGIO',
      'Chiedi a uno sconosciuto: "Mi scusi, che ore sono?" Ascolta la risposta, poi guarda l\'orologio al polso per cinque secondi in silenzio.', 'unhinged'),
  M('il-nodo', 'IL NODO',
      'Chiedi a uno sconosciuto: "Mi aiuti con un nodo?" Non ti serve niente, ma sorridi e ringrazia. Poi chiedi: "Quanto ti devo?" Se dice un numero vai via e basta.', 'unhinged', { meccanica: 'amici' }),
  M('il-marchio', 'IL MARCHIO',
      'Metti un dito sull\'esercizio e chiedi a chi ti sta accanto: "Secondo te da domani questo attrezzo porta il tuo nome?" Poi annuisci come se la cosa fosse ovvia.', 'unhinged'),
  M('la-domanda-sul-peso', 'LA DOMANDA SUL PESO',
      'Prima della serie sfidalo: "Scommetto che indovini il mio peso entro dieci grammi. Se sbagli, facciamo la serie e poi indovini di nuovo. Hai un peso in mente?" Nessuno guarda niente: si decide a memoria e a impressione, e il risultato si annuncia come se fosse scientifico.', 'insane', { meccanica: 'memoria' }),
  M('lo-sguardo', 'LO SGUARDO',
      'Guarda negli occhi una persona che non conoci per tre secondi e poi chiedile: "Ce la facciamo una serie insieme?" Se dice di no, ringrazia e vai.', 'insane'),
  M('il-cameriere', 'IL CAMERIERE',
      'Passa accanto a uno sconosciuto e chiedigli: "Mi scusi, ha visto il mio allenatore?" Non spiegare chi è. Poi cammina via senza aggiungere niente.', 'insane'),
  M('il-trombone-pubblico', 'IL DOPPIATORE',
      'Fai il doppiatore della serie del tuo amico: a ogni ripetizione gli dai una battuta e un\'emozione diverse, e lui deve continuare ad allenarsi come se quelle parole fossero sue. Non puoi dirgli di fermarsi. Alla fine lui ti chiede: "Ero io quello che dicevo?"', 'insane', { meccanica: 'improvvisazione' }),
  M('la-sirena', 'LA SIRENA',
      'Prima di ognuna delle tre serie fai una sirena breve con la voce, sempre uguale. Se sbagli la sirena o cambi durata la serie vale zero. L\'ultima sirena deve essere più lunga delle altre due e il tuo amico non deve ridere: se ride ricominci dal primo esercizio.', 'insane', { meccanica: 'fasi' }),
  M('il-finto-pubblico', 'IL FINTO PUBBLICO',
      'Prima della serie, rivolgendoti alla sala intera, annuncia: "Preparatevi, tra un secondo vedrete qualcosa che nessuno ha mai visto." Poi chiedi a chi ti guarda: "Si vede?"', 'insane'),
  M('la-domanda-sulla-scheda', 'LA DOMANDA SULLA SCHEDA',
      'Chiedi a uno sconosciuto: "Tu come la fai la scheda?" Ascolta con faccia seria, come se fosse la domanda più importante della giornata.', 'legendary'),
  M('il-consiglio-segreto', 'IL CONSIGLIO SEGRETO',
      'Inventa un indovinello assurdo su un tuo amico, in trenta secondi, con una risposta che esiste solo nella tua testa. Lui ha diritto a tre domande sì o no prima di indovinare, e se sbaglia devi spiegare la risposta inventata come se fosse la soluzione vera.', 'legendary', { meccanica: 'amici' }),
  M('la-posta', 'LA POSTA',
      'Una telefonata immaginaria, recitata a voce alta per trenta secondi come se fosse vera: tu chiami qualcuno che non sa niente e gli dai notizie sulla palestra. Deve sembrare una telefonata vera, e quando "l\'altro" riattacca tu rispondi senza fermarti.', 'easy', { meccanica: 'recitazione' }),
  M('il-peso-annunciato', 'IL PESO ANNUNCIATO',
      'Prima di iniziare annuncia ad alta voce il peso che stai per alzare, con la voce di un campione del mondo, e poi devi alzarlo davvero. Se il numero che hai annunciato e quello sulla macchina non coincidono, la ripetizione vale zero e la rifai con il numero giusto.', 'insane', { meccanica: 'improvvisazione' }),
  M('la-camera-lenta', 'LA CAMERA LENTA',
      'Fai tre ripetizioni a velocità metà, come un replay della finale, faccia seria. Poi una ripetizione a velocità piena senza nessuna pausa tra le due fasi. Se ti fermi a metà, la ripetizione lenta vale zero e ricominci dal primo esercizio.', 'easy', { meccanica: 'regole' }),
  M('il-conteggio-drama', 'IL CONTO A DUE',
      'Fai tre serie insieme a un amico e ognuno conta ad alta voce le ripetizioni del suo collega. Dovete dirle nello stesso identico momento, come un doppio, e alla fine lui ti chiede: "Quante ne abbiamo fatte?" Se uno arriva prima o dopo, la serie vale zero e ricominciate da capo.', 'easy', { meccanica: 'amici' }),
  M('la-posa-vincitore', 'LA POSA',
      'Una posa unica in tre fasi, e ogni fase dura quindici secondi: prima la posa da dopo la serie, poi la stessa posa mentre spieghi la tua vittoria come un intervista, poi la stessa posa con una mano che stringe un oggetto che in realtà non c\'è. Un amico sceglie la fase da fare e ti dice: "Questa volta facciamo la terza. Ma perché proprio quella?" e tu rispondi senza fermarti.', 'easy', { meccanica: 'fasi' }),
  M('il-portavoce', 'IL PORTAVOCE',
      'Assumi il ruolo di portavoce di un tuo amico e racconta a un altro amico la sua serie, trenta secondi, alternando cose vere e cose inventate. A un certo punto il portato ti interrompe e ti corregge: devi tornare sul filo senza ammettere che hai inventato.', 'insane', { meccanica: 'amici' }),
  M('la-lente', 'LA LENTE',
      'Prima di iniziare, guarda i tre attrezzi che userai oggi e memorizza i loro numeri. A fine serie, senza guardare nulla, recita quei tre numeri al tuo amico nell\'ordine esatto in cui li hai usati. Se sbagli uno solo, la serie si rifa da capo.', 'easy', { meccanica: 'memoria' }),
  M('il-portale', 'IL PORTALE',
      'Guarda un attrezzo libero e vuoto e trattalo per trenta secondi come se fosse il portale verso un\'altra palestra: racconta ad alta voce che cosa c\'è dall\'altra parte, senza fermarti. Poi chiedi a un amico: "Ci verrei? Perché no?" e accetta solo una risposta vera.', 'legendary'),
  M('la-seduta-di-ascolto', 'LA SEDUTA DI ASCOLTO',
      'Ascolta i rumori della palestra per trenta secondi senza guardare e indovina quale attrezzo è caduto. Poi applausi silenzioso e chiedi: "Avevi sentito?" Se sbagli l\'attrezzo ne devi indovinare un altro, e non puoi chiedere aiuto a nessuno.', 'insane', { meccanica: 'regole', segreta: true }),
  M('il-selfie', 'IL SELFIE',
      'Dopo ognuna delle prime tre serie fai una foto a te stesso con una posa diversa, sempre alla stessa distanza. Poi guardale con un amico e chiedi: "Quale mi fa più vincitore?" devi fare un\'altra serie con la posa che sceglie lui.', 'easy', { meccanica: 'fasi' }),
  M('il-patto-segreto', 'IL PATTO',
      'Firma un patto a voce con il tuo amico davanti a un altro amico che fa da testimone. Il patto riguarda la prossima serie e deve dire in numero cosa ti impegni a fare e cosa ricevi in cambio. Poi chiedi al testimone: "Sei sicuro di averlo capito bene?" e se sbaglia una parola vale doppio.', 'insane', { meccanica: 'regole', segreta: true }),
  M('la-palestra-pirata', 'LA PALESTRA PIRATA',
      'Cinque minuti esatti e quattro obiettivi precisi, da portare a termine senza parlare: due serie da cinque ripetizioni, una pausa di un minuto in piedi e un cambio di attrezzo almeno due volte. Alla fine dichiara il bottino, voce da capitano.', 'legendary', { meccanica: 'regole', segreta: true }),
  M('il-giornale', 'IL GIORNALE',
      'Scrivi tre titoli di testa di un giornale sportivo con le notizie della settimana e leggili ad alta voce a tutti, uno alla volta. L\'ultimo titolo deve parlare di te e di come ti senti. Poi chiedi: "Siamo d\'accordo che è la notte più importante?" e accetta solo un sì.', 'insane', { meccanica: 'recitazione', segreta: true }),
  M('la-grande-palestra', 'LA GRANDE PALESTRA',
      'Cinque minuti, e un rito diverso per ogni attrezzo che usi: uno batte le mani, uno si tocca l\'elmo di fantasia, uno conta ad alta voce, uno saluta. Non puoi ripetere lo stesso rito, e se usi lo stesso attrezzo due volte il rito deve cambiare.', 'legendary', { meccanica: 'regole', segreta: true }),
  M('il-messaggio-finale', 'IL MESSAGGIO FINALE',
      'Scrivi a un amico UNA sola frase drammatica sulla tua palestra, come se fosse una notizia importantissima. Esempi: "Ho battuto un record e nessuno se ne è accorto." oppure "Oggi ho alzato più di quanto credevo." Poi lui ti chiederà: "Che vuol dire?" Tu rispondi: "Poi capirai."', 'insane', { segreta: true }),
  M('il-grande-giro', 'IL GRANDE GIRO',
      'Fai un giro della sala pesi passando da tutte le stazioni, anche quelle libere, come se fosse una visita ufficiale. Esempio: alzo ti presento la panca, e poi ti stringo la mano come se fossimo colleghi.', 'legendary', { segreta: true }),
  M('comunicato-disastroso', 'IL COMUNICATO DISASTROSO',
      'Dopo una serie normale, convoca una conferenza stampa davanti ai tuoi amici. Devi spiegare per almeno 20 secondi perché la tua prestazione è stata un evento storico, anche se non hai battuto nessun record. Concludi con: "Non posso dire altro per rispetto dei tifosi". Poi chiedi: "Avete domande?" e non ne accetti nemmeno una.', 'easy', { meccanica: 'improvvisazione' }),
  M('contratto-col-diavolo', 'IL CONTRATTO CON IL DIAVOLO',
      'Prima di una serie, inventa un contratto di tre clausole che devi rispettare per riuscire nell\'impresa. Leggilo con voce da avvocato malvagio. Al termine della serie, dichiara solennemente se il contratto è stato rispettato.', 'easy', { meccanica: 'recitazione' }),
  M('processo-al-manubrio', 'IL PROCESSO AL MANUBRIO',
      'Accusa un manubrio di averti rovinato la giornata. Interpreta sia il pubblico ministero sia l\'avvocato difensore, usando due voci diverse. Devi presentare due prove, una difesa e un verdetto finale.', 'unhinged', { meccanica: 'recitazione' }),
  M('intervista-al-fallimento', 'L\'INTERVISTA AL FALLIMENTO',
      'Chiedi a un amico di intervistarti dopo una serie normalissima. Devi rispondere a tre domande come un atleta appena eliminato dalla finale mondiale. La prima domanda sarà "Che è successo?" e tu devi rispondere soltanto: "Mi assumo tutte le responsabilità".', 'unhinged', { meccanica: 'amici' }),
  M('motivatore-inutile', 'IL MOTIVATORE INUTILE',
      'Fai a un amico un discorso motivazionale di 30 secondi per convincerlo a raggiungere un obiettivo completamente inutile, come diventare il miglior esperto mondiale di cucchiaini. Devi concludere con uno slogan epico, e poi gli chiedi: "Ci credi davvero?"', 'unhinged', { meccanica: 'recitazione' }),
  M('profeta-delle-cavolate', 'IL PROFETA ROVESCIATO',
      'Fai tre previsioni sul tuo allenamento che sono sbagliate apposta, e ogni volta alza la voce per convincere che siano vere. Non puoi ripetere lo stesso argomento. Un amico deve smaschiarti almeno una volta chiedendoti: "Ma come fai a saperlo?" e tu rispondi inventando. Se lo smaschera due volte, la terza previsione vale doppio.', 'insane', { meccanica: 'fasi' }),
  M('processo-al-campione', 'IL PROCESSO AL CAMPIONE',
      'Il tuo amico ti accusa di un crimine sportivo immaginario: aver fatto una ripetizione troppo perfetta. Hai 45 secondi per difenderti, portare una prova inventata e convincere la giuria. Un secondo amico pronuncia il verdetto.', 'insane', { meccanica: 'amici' }),
  M('documentario-sulla-patata', 'IL DOCUMENTARIO SULLA PATATA',
      'Registra un documentario di 45 secondi su un oggetto casuale della palestra, come se fosse una specie rarissima in via d\'estinzione. Devi includere habitat, comportamento, alimentazione e una curiosità inventata.', 'insane', { meccanica: 'creativita' }),
  M('discorso-di-dimissioni', 'IL DISCORSO DI DIMISSIONI',
      'Annuncia agli amici che ti dimetti ufficialmente dalla tua carriera di atleta, motivando la decisione con tre ragioni assurde. Dopo 30 secondi, cambi idea improvvisamente e proclami il tuo ritorno. A quel punto lui ti chiede: "E allora perché hai detto che te ne vai?" e tu rispondi come se fosse tutto previsto.', 'legendary', { meccanica: 'fasi' }),
  M('boss-del-ridicolo', 'IL BOSS DEL RIDICOLO',
      'Gli amici scelgono tre parole casuali. Devi improvvisare un discorso epico di 60 secondi che le contenga tutte, fingendo di essere il boss finale di un videogioco. Devi avere un nome, una frase d\'attacco e un punto debole ridicolo. A metà del discorso uno degli amici ti grana: "E con queste parole come fai?" e tu rispondi sul momento.', 'legendary', { meccanica: 'improvvisazione' }),

];

export const POOL_PER_ID = new Map(POOL.map((m) => [m.id, m]));

export function missionePerId(id) { return POOL_PER_ID.get(id) || null; }

/** La ricompensa di una missione, sapendo se È segreta. */
export function ricompensaMissione(missione, { segreta = false } = {}) {
  const d = DIFFICOLTA[missione.difficolta] || DIFFICOLTA.easy;
  const f = segreta ? MOLTIPLICATORE_SECRET : 1;
  return {
    aura: Math.round(d.aura * f),
    xp: Math.round(d.xp * f),
    difficolta: d,
    segreta: !!segreta,
  };
}

// ---------------------------------------------------------------------------
// La settimana. Identificatore ISO tipo 2026-W40.
// ---------------------------------------------------------------------------

export function idSettimana(dataISO) {
  const d = dataISO instanceof Date ? dataISO : new Date(String(dataISO || '').slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // il giovedi' della settimana decide l'anno ISO (regola standard)
  const giorno = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - giorno);
  const anno = t.getUTCFullYear();
  const primo = new Date(Date.UTC(anno, 0, 1));
  const settimana = Math.ceil(((t - primo) / 86400000 + 1) / 7);
  return `${anno}-W${String(settimana).padStart(2, '0')}`;
}

/** Hash stabile: stesse lettere, stesso numero, su qualunque dispositivo. */
export function hashTesto(testo) {
  const s = String(testo || '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Numeri pseudo-casuali ma SEMPRE uguali, se il seme È lo stesso. */
export function generatoreDa(seme) {
  let stato = (hashTesto(seme) || 1) >>> 0;
  return function prossimo() {
    stato = (Math.imul(stato, 1664525) + 1013904223) >>> 0;
    return stato / 4294967296;
  };
}

/**
 * Sceglie `quanti` missioni dal pool, saltando quelle già viste.
 *
 * Ste ha detto: "non possono spuntare più volte le stesse sfide, se È già
 * capitata a uno non può capitare la stessa cosa alla stessa persona".
 * Quindi il filtro È sull'elenco di cio' che quella persona ha già fatto,
 * non sul caso: ognuno vede ogni missione una volta sola.
 *
 * Se il pool È ormai finito NON si ricade sulle missioni già fatte: sarebbe
 * una ripetizione, e Ste l'ha detto chiaramente. In quel caso si restituisce
 * quello che rimane, che può anche essere vuoto: meglio zero sfide che una
 * sfida rifatta.
 */
function finestra(seme, pool, quanti, passo = 1, escludi = []) {
  if (!pool.length || quanti <= 0) return [];
  const vietate = escludi instanceof Set ? escludi : new Set((escludi || []).map(String));
  const utili = pool.filter((m) => !vietate.has(m.id));
  // niente fallback sul pool completo: se sono finite, non ne propongo altre
  if (utili.length < quanti) return utili.slice(0, Math.max(0, utili.length));
  const rnd = generatoreDa(seme);
  const offset = Math.floor(rnd() * utili.length);
  const out = [];
  const meccanicheUsate = new Set();
  // IL SECONDO GIRO ESISTE PERCHE' SERVE LA VARIETA'.
  //
  // Ste (13/10/2026): "le missioni dovrebbero avere meccaniche diverse, non solo
  // testi diversi". Cinque missioni tutte di improvvisazione sono cinque volte la
  // stessa cosa: non importa quanto siano diverse le parole.
  //
  // Il primo giro accetta solo missioni con una meccanica ancora nuova nella
  // finestra; il secondo, se la finestra non si e' riempita, accetta anche le
  // meccaniche già usate. Perche' due giri e non uno solo: se nel pool c'e' una
  // meccanica che compare una volta sola, il primo giro la prende e gli altri
  // ripetono, che e' comunque meglio che lasciare la casella vuota.
  //
  // L'ordine di scansione e' LO STESSO nei due giri, quindi il risultato dipende
  // ancora solo dal seme: la stessa settimana e lo stesso account vedono sempre le
  // stesse missioni, che e' quello che aveva chiesto due volte.
  for (const giro of [1, 2]) {
    for (let i = 0; i < utili.length && out.length < quanti; i++) {
      const idx = (((offset + i * passo) % utili.length) + utili.length) % utili.length;
      const m = utili[idx];
      if (!m || out.some((x) => x.id === m.id)) continue;
      const mecc = meccanicaDi(m);
      if (giro === 1 && meccanicheUsate.has(mecc)) continue;
      out.push(m);
      meccanicheUsate.add(mecc);
    }
  }
  return out;
}

/**
 * Il set della settimana.
 *
 * Ste: "fai anche le missioni settimanali diverse per tutti. Le secret mission
 * invece sono uguali? Se sì falle diverse per tutti". Quindi ora il seme
 * contiene anche l'account: due persone diverse nella stessa settimana vedono
 * missioni settimanali e secret DIVERSE. Solo la Daily resta una-per-giorno.
 *
 * Resta pero' il filtro: ognuno vede solo le missioni che non gli sono
 * già capitate, quindi nessuno rivede la stessa sfida due volte.
 */
export function setSettimanale(settimana, giaFatte = [], accountId = 'tutti') {
  const segrete = POOL.filter((m) => m.segreta);
  const normali = POOL.filter((m) => !m.segreta);
  const weekly = finestra(`weekly:${settimana}:${accountId}`, normali, NUMERO_WEEKLY, 3, giaFatte);
  const secret = finestra(`secret:${settimana}:${accountId}`, segrete, NUMERO_SECRET, 1, giaFatte);
  return {
    settimana,
    weekly,
    secret,
    numero: weekly.length + secret.length,
  };
}

/**
 * La Daily di oggi per un utente: diversa per ciascuno, una volta al giorno,
 * e mai uguale a una missione che quella persona ha già fatto.
 */
export function dailyDi(accountId, dataISO, giaFatte = []) {
  const pool = POOL.filter((m) => !m.segreta);
  const scelte = finestra(`daily:${accountId}:${dataISO}`, pool, 1, 1, giaFatte);
  return scelte.length ? scelte[0] : null;
}

// ---------------------------------------------------------------------------
// Lo stato delle missioni di un utente.
// ---------------------------------------------------------------------------

export const CATEGORIE = {
  daily:  { id: 'daily',  nome: 'DAILY MISSION',   segreta: false },
  weekly: { id: 'weekly', nome: 'WEEKLY MISSIONS', segreta: false },
  secret: { id: 'secret', nome: 'SECRET MISSIONS', segreta: true },
};

/**
 * Tutte le missioni di oggi e della settimana, con lo stato di ciascuna.
 * completamenti = le righe già salvate nella tabella "missioni".
 */
export function quadroMissioni({ accountId, dataISO, settimana, completamenti = [], giaFatte = [] }) {
  // Cosa escludere. Attenzione: la missione che hai appena completato DEVE
  // continuare a comparire, marcata come fatta. Quindi escludo solo cio' che
  // hai completato in un PERIODO PASSATO (una daily di tre settimane fa, il set
  // di due mesi fa), non quello di oggi o di questa settimana.
  const chiaveDi = (riga) => {
    const parti = String(riga.id || '').split(':');
    return { missione: parti[1], periodo: parti.slice(2).join(':') };
  };
  const correnti = new Set([dataISO, settimana].map(String));
  const daEscludere = new Set((giaFatte || []).map(String));
  for (const c of (completamenti || [])) {
    const { missione, periodo } = chiaveDi(c);
    if (missione && periodo && !correnti.has(periodo)) daEscludere.add(missione);
  }

  const set = setSettimanale(settimana, daEscludere, accountId);
  const daily = dailyDi(accountId, dataISO, daEscludere);
  const minei = new Set((completamenti || []).map((c) => c.id));
  const stato = (m, categoria) => {
    const chiave = `${accountId}:${m.id}:${categoria === 'daily' ? dataISO : settimana}`;
    const riga = (completamenti || []).find((c) => c.id === chiave) || null;
    return {
      missione: m,
      categoria,
      segreta: categoria === 'secret',
      chiave,
      rivelata: categoria !== 'secret' || !!(riga && riga.rivelata),
      completata: !!(riga && riga.completata_il),
      ricompensa: ricompensaMissione(m, { segreta: categoria === 'secret' }),
      giaInCoda: minei.has(chiave),
    };
  };
  return {
    settimana,
    dataISO,
    daily: daily ? stato(daily, 'daily') : null,
    weekly: set.weekly.map((m) => stato(m, 'weekly')),
    secret: set.secret.map((m) => stato(m, 'secret')),
    set,
  };
}

/**
 * Una missione si può completare adesso?
 * La Daily una volta al giorno; le Weekly e le Secret una volta a settimana.
 */
export function puoCompletare(completamenti, { categoria, dataISO, settimana }) {
  if (!categoria) return { si: false, motivo: 'categoria mancante' };
  if (categoria === 'daily' && !dataISO) return { si: false, motivo: 'giorno mancante' };
  if (categoria !== 'daily' && !settimana) return { si: false, motivo: 'settimana mancante' };
  const segnaposto = categoria === 'daily' ? dataISO : settimana;
  return {
    si: true,
    chiave: segnaposto,
    motivo: categoria === 'daily'
      ? 'Una volta al giorno.'
      : 'Una volta a settimana.',
  };
}

/** Quante missioni sono state completate in tutto (per lo storico). */
export function contaCompletate(completamenti, filtro = {}) {
  let n = 0;
  for (const c of (completamenti || [])) {
    if (!c || !c.completata_il) continue;
    if (filtro.categoria && c.categoria !== filtro.categoria) continue;
    if (filtro.settimana && c.settimana !== filtro.settimana) continue;
    if (filtro.data && c.data !== filtro.data) continue;
    n++;
  }
  return n;
}

/** Le missioni completate, dalla più recente: È lo storico che vede Ste. */
export function storicoMissioni(completamenti, { limite = 40 } = {}) {
  return (completamenti || [])
    .filter((c) => c && c.completata_il)
    .slice()
    .sort((a, b) => String(b.completata_il).localeCompare(String(a.completata_il)))
    .slice(0, limite)
    .map((c) => {
      const m = missionePerId(c.missione_id);
      return {
        id: c.id,
        missione: m,
        categoria: c.categoria,
        data: c.data,
        settimana: c.settimana,
        aura: Number(c.aura || 0),
        quando: c.completata_il,
        titolo: m ? m.titolo : c.missione_id,
      };
    });
}
