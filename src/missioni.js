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

const M = (id, titolo, testo, difficolta, extra = {}) => ({
  id, titolo, testo, difficolta, segreta: false, ...extra,
});

export const POOL = [
  M('la-domanda-maledetta', 'LA DOMANDA MALEDETTA',
    'Durante una pausa chiedi con serietà al tuo amico: "Secondo te il pump è reale o siamo noi a crederci?" Non ridere e non spiegare.', 'easy'),
  M('annuncio-ufficiale', 'ANNUNCIO UFFICIALE',
    'Prima di iniziare, annuncia ad alta voce alla sala intera: "Da oggi comincia la mia epoca, preparatevi." Poi allenati normalmente, senza sorridere.', 'easy'),
  M('il-boss-finale', 'IL BOSS FINALE',
    'Prima di iniziare una serie guarda il tuo amico e digli con assoluta serietà: "Finalmente ci incontriamo." Poi chiedigli: "Ti mancavo?" Fai la serie come se non fosse niente.', 'easy'),
  M('titolo-assurdo', 'IL TITOLO',
    'Dai a un tuo amico un titolo assurdo, tipo "Supremo Custode della Lat Machine". Per i 5 minuti successivi devi chiamarlo solo così.', 'unhinged'),
  M('il-profeta', 'IL PROFETA',
    'Prima che il tuo amico inizi una serie guardalo bene e digli: "Lo sento, oggi succederà qualcosa." Poi chiedigli: "Che cosa?" Non spiegare niente.', 'unhinged'),
  M('il-telecronista', 'IL TELECRONISTA',
    'Commenta la serie di un amico come se fosse una finale mondiale: gridi "PARTE!", "PRIMA RIPETIZIONE!", "INCREDIBILE CONTROLLO!". Poi chiedigli: "Commento tecnico?" e non accettare risposte.', 'unhinged'),
  M('conferenza-stampa', 'CONFERENZA STAMPA',
    'Dopo una tua serie fai una conferenza stampa di almeno 20 secondi spiegando ai tuoi amici perché quella serie potrebbe cambiare la tua carriera. Poi chiedi: "Avete domande?"', 'unhinged'),
  M('il-documentario', 'IL DOCUMENTARIO',
    'Per 30 secondi racconta la storia di un tuo amico come se fosse il protagonista di un documentario. "Era il 2026. Marco non sapeva ancora che quel giorno avrebbe cambiato tutto."', 'insane'),
  M('il-giudice-olimpico', 'IL GIUDICE OLIMPICO',
    "Per un minuto fai il giudice olimpico e assegna voti completamente arbitrari alle serie dei tuoi amici. Dici: 8.7. Buona esecuzione, poco dramma. Poi chiedi: \"Votate come me?\"", 'insane'),
  M('il-ritorno-missione', 'IL RITORNO',
    'Torna dal tuo gruppo di allenamento con la faccia seria, come se arrivassi da una missione difficile, e chiedi a uno di loro: "Ragazzi, indovinate da dove vengo?" Se sbagliano, scrolla le spalle e non spiegare niente.', 'insane'),
  M('bro-ha-cambiato-vita', 'IL BRO HA CAMBIATO VITA',
    'Dopo una serie normalissima, dì ai tuoi amici: "Ragazzi, da oggi cambio completamente approccio." Poi chiedi: "Sembrano convinti?" Non spiegare niente.', 'easy'),
  M('applauso-inutile', 'APPLAUSO INUTILE',
    'Dopo che un amico completa una serie normalissima, applaudilo lentamente per 5 secondi come se avesse appena stabilito un record mondiale. Poi chiedigli: "Ti sembra di averlo meritato?"', 'easy'),
  M('personal-trainer-inutile', 'IL PERSONAL TRAINER',
    'Durante una pausa dai al tuo amico un consiglio palesemente inutile ma con professionalità assoluta. "Devi concentrarti di più sulla forza." Poi vattene senza spiegare.', 'easy'),
  M('aura-check', 'AURA CHECK',
    'Chiedi a tre amici, separatamente: "Da 1 a 100, quanta Aura ho oggi?" Non puoi discutere i risultati e non puoi correggerli.', 'unhinged'),
  M('il-rituale', 'IL RITUALE',
    'Prima di una serie fai un rituale completamente inventato di 10 secondi, come se fosse indispensabile per aumentare la tua forza.', 'unhinged'),
  M('il-rispetto', 'IL RISPETTO',
    'Quando un tuo amico completa una serie, fai un piccolo inchino davanti a lui senza dire nulla e torna ad allenarti.', 'easy'),
  M('la-frase-maledetta', 'LA FRASE MALEDETTA',
    'Durante una conversazione normale devi riuscire a dire, senza riderti: "È esattamente quello che direbbe una persona con 73 Aura." Poi chiedigli: "Ci credi?"', 'unhinged'),
  M('intervista-post-gara', 'INTERVISTA POST-GARA',
    "Dopo una serie fai finta che i tuoi amici siano giornalisti e rispondi a una domanda inventata sulla tua performance. Poi chiedi: \"Altre domande?\" Resti completamente serio.", 'insane'),
  M('il-campione', 'IL CAMPIONE',
    'Dopo la serie di un amico dagli una medaglia immaginaria e digli: "Sei stato un campione." Poi chiedigli: "Ci credi?" Torna al tuo allenamento.', 'easy'),
  M('il-pensiero', 'IL PENSIERO',
    'Prima della serie fermati un secondo e pensa a chi si arrende al primo set. Poi parti con la serie, senza sorridere.', 'unhinged'),
  M('sguardo-misterioso', 'IL GUARDO MISTERIOSO',
    'Trenta secondi di sguardo intenso e serio verso un amico, poi gli chiedi: "Che cos\'hai?" Non spiegare e torna alla tua serie.', 'unhinged'),
  M('la-dignita', 'LA DIGNITÀ',
    "Fai tre serie consecutive senza ridere. Se ridi, ricomincia dal primo esercizio del giorno. Al massimo una volta.", 'insane'),
  M('il-piano', 'IL PIANO',
    'Spiega il tuo piano per i prossimi dieci anni come se fosse una partita a scacchi. Con le mosse. Seriamente.', 'unhinged'),
  M('il-nome', 'IL RINOMINATO',
    'Cambia il nome al tuo amico per la durata di una serie, con un nome assurdo. Deve rispondere con quello per tutta la serie.', 'easy'),
  M('la-musica', 'LA MUSICA',
    "Canticchia a bassa voce, senza disturbare nessuno, fino alla fine della serie. Solo la tua serie.", 'insane'),
  M('il-contratto', 'IL CONTRATTO',
    'Proponi un patto assurdo al tuo amico: se arriva a 8 ripetizioni, domani deve chiamarti "maestro". Se sbaglia, vale per tutta la settimana.', 'unhinged'),
  M('il-filosofo', 'IL FILOSOFO',
    "Cita un proverbio sulla forza che non esiste, inventato da te, e spiegolo come se fosse antichissimo. Poi chiedi: \"Non è forse vero?\"", 'insane'),
  M('il-guardiano', 'IL GUARDIANO',
    'Metti la mano sulla pedana o sul bilanciere e poi dici: "Io proteggo questo esercizio. Nessuno lo tocca."', 'easy'),
  M('il-silenzio', 'IL SILENZIO',
    "Una serie intera in silenzio assoluto. Solo l'ultima ripetizione rompe il silenzio, e con una sola parola.", 'easy'),
  M('il-punto', 'IL PUNTO',
    "Segna il punto come se fosse una partita di tennis: fai il gesto con la mano e diglielo ad alta voce: PUNTO PER ME. Poi chiedi a un amico: \"Che voto mi dai?\"", 'insane'),
  M('la-fisica', 'LA FISICA',
    'Spiega la tua serie come se fosse un fenomeno fisico, con le formule. Tuo amico deve sembrare molto impressionato.', 'insane'),
  M('il-voto-assurdo', 'IL VOTO ASSURDO',
    "Assegna alla serie del tuo amico un voto completamente arbitrario, difendilo con convinzione e poi chiedi: \"Non sei d'accordo?\" Non accettare discussioni.", 'insane'),
  M('la-presentazione', 'LA PRESENTAZIONE',
    'Presenta il tuo amico agli altri: "Questo e\' il mio migliore allenatore." Lui deve accettare il titolo per tutta la seduta.', 'easy'),
  M('il-timer-dramma', 'IL CRONOMETRO DRAMMATICO',
    'Conta ad alta voce le ripetizioni del tuo amico, con il ritmo di unboxing in diretta.', 'unhinged'),
  M('la-vittoria', 'LA VITTORIA',
    "Festeggia in silenzio la tua ultima serie come se fosse stata una finale di mondiale. Poi guarda un amico e chiedigli: \"Hai visto?\" Silenzio totale.", 'insane'),
  M('il-consiglio-di-lunedio', 'IL CONSIGLIO DI LUNEDI',
    'Prima di iniziare, dillo con voce seria: "Non allenarti oggi. Allenati domani. Oggi stai solo guardando." Poi allenati comunque.', 'unhinged'),
  M('la-domanda-proibita', 'LA DOMANDA PROIBITA',
    "Fai all'amico una sola domanda imbarazzante ma innocua, guarda l'orologio e non rispondere. Lascialo nel dubbio.", 'legendary'),
  M('il-film', 'IL FILM',
    "Racconta in venti secondi come sarebbe un film sulla tua palestra: titolo, trama, finale. Raccontalo a un amico e poi chiedi: \"Ci guarderesti?\"", 'insane'),
  M('la-porta-sacra', 'LA PORTA SACRA',
    "Tocca la pedana come fosse una porta sacra, poi entra nell'esercizio con lo stesso rispetto di un pellegrino.", 'easy'),
  M('la-rovescia', 'IL CONTO ALLA ROVESCIA',
    "Conta alla rovescia da dieci per ogni ripetizione del tuo amico, e sullo zero applaudi.", 'unhinged'),
  M('il-carico', 'A CARICO',
    "Prima dell'ultima serie annuncia A CARICO come se fosse il titolo di un film, poi spingi come nel film. A fine serie chiedi: \"Come l'hai trovata?\"", 'insane'),
  M('il-segreto', 'IL SEGRETO',
    "Dici all'amico: \"Ho un segreto. Te lo dico solo se arrivi a 8 ripetizioni.\" Se le arriva, raccontagli che non hai davvero nessun segreto.", 'unhinged'),
  M('l-annuncio-duro', "L'ANNUNCIO DURO",
    "Presentati come \"l'allenatore più severo del mondo\". Per tre serie mantieni il personaggio.", 'easy'),
  M('la-preghiera', 'LA PREGHIERA',
    "Prima della serie dell'amico prega per le sue ripetizioni, a voce bassa, con serietà totale. Lui deve continuare.", 'unhinged'),
  M('il-confronto-storico', 'IL CONFRONTO STORICO',
    'Davanti ai tuoi amici ricordi il 2019 e spieghi che allora eri debolissimo. Poi chiedi: "Ci credete?" Dimostra il contrario.', 'unhinged'),
  M('la-fotografia', 'LA FOTOGRAFIA',
    'Dopo una serie fai "FREEZE" e resta cinque secondi in posa di vittoria. Nessuno puo\' ridere.', 'easy'),
  M('il-trombone', 'IL TROMBONE',
    "Dieci secondi di trombone SENZA suono, a bocca chiusa, muovendoti. Solo le labbra.", 'insane'),
  M('la-mafia', 'LA MAFIA',
    "Durante tre serie di fila comandi tu: decidi il ritmo, gli amici obbediscono. Poi ti scusi con loro e spieghi che era una fiction. Chiedi: \"Perdonato?\"", 'insane'),
  M('il-muro', 'IL MURO',
    'Una serie intera senza parlare. Solo alla fine spiega il silenzio, con calma.', 'unhinged'),
  M('il-doppio-ruolo', 'IL DOPPIO RUOLO',
    "In una sola serie fai contemporaneamente l'allenatore e l'atleta: dai ordini a te stesso con due voci diverse.", 'insane'),
  M('la-direttrice', 'LA DIRETTRICE',
    "Dirigi l'esercizio del tuo amico come un coro, indicando l'attacco e il rallentato. A fine serie chiedigli: \"BIS?\" Piano con la voce.", 'insane'),
  M('il-mistero', 'IL MISTERO',
    'Spiega che hai scoperto una tecnica segreta e insegnala in tre parole. Se funziona davvero, racconta il mistero. Altrimenti no.', 'legendary'),
  M('il-padre', 'IL PADRE',
    "Incoraggia il tuo amico con le frasi più assurde possibili di un padre al debutto in palestra. Poi chiedigli: \"Papà, contenti?\"", 'insane'),
  M('il-dottore', 'IL MEDICO',
    "Conferma con serietà che con 5 kg in più starai meglio. Non dare spiegazioni, non ammettere dubbi.", 'unhinged'),
  M('il-mare-verso', 'IL MARE VERSO',
    'Dopo la prima serie porta le mani alla fronte come se guardassi il mare, e dì: "Stiamo andando benissimo."', 'easy'),
  M('la-lotta', 'LA LOTTA INTERNA',
    "Prima della serie guarda un amico e chiedigli ad alta voce: \"Chi ti sta aspettando dall'altra parte?\" Poi vinci.", 'insane'),

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
  // ---------------------------------------------------------------------------
  M('lo-specchio-maledetto', 'IL SPECCHIO MALEDETTO',
    'Fai davanti allo specchio una posa da bodybuilder esagerata e tientila per venti secondi senza muovere niente. Solo il viso racconta la posa.', 'insane'),
  M('il-coach-improvvisato', 'IL COACH IMPROVVISATO',
    'Spiega a un amico, con serietà da allenatore, come si fa un esercizio normalissimo, e non cambiare mai discorso. Alla fine chiedigli: "Tutto chiaro?"', 'unhinged'),
  M('la-presentazione-epica', 'LA PRESENTAZIONE EPICA',
    'Prima di una serie presentati come se stessi entrando sul palco del Mr. Olympia: nome, cognome e paese, senza sorridere. Poi la affronti in silenzio.', 'unhinged'),
  M('applauso-personale', 'APPLAUSO PERSONALE',
    'Dopo una serie fai dieci secondi di applauso a te stesso, guardandoti nello specchio, come se avessi appena vinto qualcosa.', 'easy'),
  M('il-ringraziamento', 'IL RINGRAZIAMENTO',
    'Dopo aver finito un esercizio guarda la macchina negli occhi e ringraziala solennemente, ad alta voce, come se ti avesse appena salvato la vita.', 'easy'),
  M('il-commentatore-sportivo', 'IL COMMENTATORE SPORTIVO',
    "Racconta ad alta voce la tua prossima serie come una telecronaca, dalla salita a bilanciere fino all'ultima ripetizione. Non ridere mentre parli.", 'unhinged'),
  M('la-posa-casuale', 'LA POSA CASUALE',
    'Ogni volta che qualcuno ti guarda fai una posa da bodybuilding, e poi chiedi a chi ti ha guardato: "Che hai visto?" senza spiegare niente.', 'unhinged'),
  M('il-motivatore', 'IL MOTIVATORE',
    'Fai a un amico un discorso motivazionale di almeno venti secondi, con voce ferma e zero pause. Alla fine chiedigli: "Ora ti senti meglio?"', 'unhinged'),
  M('il-selfie-drammatico', 'IL SELFIE DRAMMATICO',
    "Dopo una serie fai una foto a te stesso con l'espressione di uno che ha appena sofferto moltissimo, anche se non è successo niente. Poi torni al lavoro.", 'unhinged'),
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
  M('la-telecronaca-personale', 'LA TELECRONACA PERSONALE',
    "Racconta ad alta voce ogni tua ripetizione, una alla volta, e non puoi usare due volte la stessa frase: se sbagli il nome dell'esercizio continui come se niente fosse.", 'insane'),
  // Cinque di queste sono SECRET: quelle che faresti solo se nessuno della sala
  // guarda. Le altre si possono fare guardando in faccia, e allora valgono meno.
  M('il-npc-della-palestra', 'IL NPC DELLA PALESTRA',
    'Per due minuti fai il personaggio di un gioco: cammina con una strana andatura, corri sul posto e ripeti una frase a caso finche nessuno ti guarda.', 'legendary', { segreta: true }),
  M('la-foto-criminale', 'LA FOTO CRIMINALE',
    'Fai la foto più tamarra possibile davanti allo specchio, con la luce peggiore che trovi, e non ritoccarla: deve sembrare una prova del reato.', 'legendary', { segreta: true }),
  M('il-nome-sbagliato', 'IL NOME SBAGLIATO',
    'Per cinque minuti chiama ogni attrezzo con un nome inventato e usalo per tutto: manubri, panche, macchine. E se sbagli, sbagli ancora meglio.', 'insane', { segreta: true }),
  M('la-confessione-alla-macchina', 'LA CONFESSIONE ALLA MACCHINA',
    'Racconta alla macchina il tuo fallimento più grande in palestra, con la stessa serietà di un confessionale, e non citare nessun nome.', 'insane', { segreta: true }),
  M('il-doppio-personal-trainer', 'IL DOPPIO PERSONAL TRAINER',
    "Chiedi al tuo amico di farti vedere un esercizio che sta facendo in modo perfetto e spiegagli che deve cambiare tutto. Parti da: \"Ma se è perfetto, cosa correggo?\" Non accettare discussioni.", 'insane', { segreta: true }),
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
  //     "non saprei cosa dire" non ha nessun senso.
  M('la-domanda-sui-gammici', 'LA DOMANDA SUI GAMMICI',
    'Chiedi a uno sconosciuto: "Mi scusi, questo esercizio fa bene agli addominali?" Ascolta la risposta con calma, annuisci e ringrazia. Poi allenati come se niente fosse.', 'unhinged'),
  M('il-campione-assente', 'IL CAMPIONE ASSENTE',
    "Avvicinati a una persona che si allena vicino a te e chiedi: \"Scusa, ma secondo te chi è il vero campione qui dentro?\" Poi ascolta la risposta e torna alla tua serie.", 'insane'),
  M('l-orologio', 'L\'OROLOGIO',
    'Chiedi a uno sconosciuto: "Mi scusi, che ore sono?" Ascolta la risposta, poi guarda l\'orologio al polso per cinque secondi in silenzio.', 'unhinged'),
  M('il-nodo', 'IL NODO',
    'Chiedi a uno sconosciuto: "Mi aiuti con un nodo?" In realtà non ti serve niente. Sorridi, ringrazia e vai.', 'unhinged'),
  M('il-marchio', 'IL MARCHIO',
    'Metti un dito sull\'esercizio e chiedi a chi ti sta accanto: "Secondo te da domani questo attrezzo porta il tuo nome?" Poi annuisci come se la cosa fosse ovvia.', 'unhinged'),
  M('il-consiglio-gratuito', 'IL CONSIGLIO GRATUITO',
    'Avvicinati a uno sconosciuto e digli: "Senti, con quel peso conviene stringere di più. Tu come lo fai?" Poi alleni in silenzio.', 'unhinged'),
  M('la-domanda-sul-peso', 'LA DOMANDA SUL PESO',
    'Chiedi a uno sconosciuto: "Secondo te, quanto dovrei alzare?" Non gli dare consigli. Annuisci e basta.', 'insane'),
  M('lo-sguardo', 'LO SGUARDO',
    'Guarda negli occhi una persona che non conoci per tre secondi e poi chiedile: "Ce la facciamo una serie insieme?" Se dice di no, ringrazia e vai.', 'insane'),
  M('la-lavagna', 'LA LAVAGNA',
    'Spiega a uno sconosciuto come si fa un esercizio, con calma, come se insegnassi. Poi chiedigli: "Provi a farmelo vedere tu?" Lui può anche dire di no.', 'insane'),
  M('il-cameriere', 'IL CAMERIERE',
    'Passa accanto a uno sconosciuto e chiedigli: "Mi scusi, ha visto il mio allenatore?" Non spiegare chi è. Poi cammina via senza aggiungere niente.', 'insane'),
  M('il-trombone-pubblico', 'IL TROMBONISTO',
    'Nel mezzo della sala pesi fai il trombone senza suono per cinque secondi. Solo le labbra. Poi chiedi a chi ti ha guardato: "Che cos\'era?"', 'insane'),
  M('la-sirena', 'LA SIRENA',
    'Prima della tua serie fai una piccola sirena con la voce. Breve. Poi fai la serie come se non fosse successo niente.', 'insane'),
  M('il-finto-pubblico', 'IL FINTO PUBBLICO',
    'Prima della serie, rivolgendoti alla sala intera, annuncia: "Preparatevi, tra un secondo vedrete qualcosa che nessuno ha mai visto." Poi chiedi a chi ti guarda: "Si vede?"', 'insane'),
  M('la-domanda-sulla-scheda', 'LA DOMANDA SULLA SCHEDA',
    'Chiedi a uno sconosciuto: "Tu come la fai la scheda?" Ascolta con faccia seria, come se fosse la domanda più importante della giornata.', 'legendary'),
  M('il-portavoce-sconosciuto', 'IL PORTAVOCE',
    'Avvicinati a uno sconosciuto, annuncia "Sono il nuovo allenatore del lunedì" e poi chiedigli: "Ti fai fare la scheda da me?" Non spiegare niente.', 'legendary'),
  M('la-presentazione-sconosciuto', 'LA PRESENTAZIONE',
    'Presentati a uno sconosciuto con il nome del campione di una finale e poi chiedigli: "Conosci il campione?" Se ti chiede di che parlavi, cambia discorso.', 'legendary'),
  M('il-consiglio-segreto', 'IL CONSIGLIO SEGRETO',
    'Avvicinati a uno sconosciuto, sussurragli un consiglio tecnico assurdo e poi chiedigli: "Vuoi saperlo?" Scuoti la testa e digli che è un segreto. Poi zitto.', 'legendary'),
  M('la-posta', 'LA POSTA',
    'Fai il riscaldamento camminando per la palestra con la faccia seria, come se aspettassi una telefonata importante.', 'easy'),
  M('il-peso-annunciato', 'IL PESO ANNUNCIATO',
    "Prima di iniziare, annuncia ad alta voce il peso che stai per alzare, con la voce di un campione del mondo. Poi chiedi a un amico: \"Quanto dico che faccio?\"", 'insane'),
  M('la-camera-lenta', 'LA CAMERA LENTA',
    'Fai tre ripetizioni a velocità metà, come un replay della finale. Faccia seria.', 'easy'),
  M('il-conteggio-drama', 'IL CONTEGGIO DRAMA',
    'Prima della serie conta le ripetizioni ad alta voce, una alla volta, con la voce di un narratore.', 'easy'),
  M('la-posa-vincitore', 'LA POSA',
    'Fai una posa da vincitore con un bilanciere in mano, come se qualcuno ti stesse fotografando.', 'easy'),
  M('il-portavoce', 'IL PORTAVOCE',
    "Dopo la tua serie alza il pugno in alto come se avessi vinto. Poi chiedi a un amico: \"Che succede?\" Non dire nient'altro.", 'insane'),
  M('la-lente', 'LA LENTE',
    'Fai il riscaldamento con una lente d\'attenzione assurda: conta ogni ripetizione ad alta voce.', 'easy'),
  M('la-locandina', 'LA LOCANDINA',
    'Fai una posa da film. Luce in faccia, pugno chiuso. Resta tre secondi.', 'easy'),
  M('la-conferenza-pubblica', 'LA CONFERENZA PUBBLICA',
    'Prima della serie spiega alla sala intera, in dieci secondi, perché oggi alleni.', 'legendary'),
  M('il-portale', 'IL PORTALE',
    'Prendi un attimo di pausa e guarda un esercizio vuoto come se fosse un portale. Entri nel portale con la mente, ci resti tre secondi e poi torni al lavoro.', 'legendary'),
  M('la-seduta-di-ascolto', 'LA SEDUTA DI ASCOLTO',
    "Ascolta i rumori della palestra e indovina quale attrezzo è caduto. Se indovini, applausi silenzioso e poi chiedi: \"Avevi sentito?\"", 'insane'),
  M('il-selfie', 'IL SELFIE',
    'Fai una foto a te stesso con la posa da campione. Poi torna subito a allenarti.', 'easy'),

  // ---- segrete: compaiono coperte e valgono di più ----
  M('il-patto-segreto', 'IL PATTO',
    'Firma un patto con il tuo amico, a voce, davanti a un altro amico che fa da testimone. Il patto riguarda solo la prossima serie.', 'insane', { segreta: true }),
  M('la-palestra-pirata', 'LA PALESTRA PIRATA',
    "Per un'ora di gioco sei il capitano di una palestra piratesca: comandi, battezio le macchine e chiedi il tributeo (una carezza alla macchina, non alle persone).", 'legendary', { segreta: true }),
  M('il-giornale', 'IL GIORNALE',
    'Fai le pagine di testa di un giornale sportivo con le notizie della settimana, leggendole ad alta voce a tutti.', 'insane', { segreta: true }),
  M('la-grande-palestra', 'LA GRANDE PALESTRA',
    'Per tutta la seduta descrivi la palestra come se fosse un tempio. Esempio: quando prendi un bilanciere di 20 kg devi dire "Signori, avvicinatevi: questo peso ha requiem" e poi inchinarti davanti. Continua cosi\' con ogni macchina che usi.', 'legendary', { segreta: true }),
  M('il-messaggio-finale', 'IL MESSAGGIO FINALE',
    'Scrivi a un amico UNA sola frase drammatica sulla tua palestra, come se fosse una notizia importantissima. Esempi: "Ho battuto un record e nessuno se ne è accorto." oppure "Oggi ho alzato più di quanto credevo." Poi lui ti chiederà: "Che vuol dire?" Tu rispondi: "Poi capirai."', 'insane', { segreta: true }),
  M('il-grande-giro', 'IL GRANDE GIRO',
    'Fai un giro della sala pesi passando da tutte le stazioni, anche quelle libere, come se fosse una visita ufficiale. Esempio: alzo ti presento la panca, e poi ti stringo la mano come se fossimo colleghi.', 'legendary', { segreta: true }),
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
  for (let i = 0; i < utili.length && out.length < quanti; i++) {
    const idx = (((offset + i * passo) % utili.length) + utili.length) % utili.length;
    const m = utili[idx];
    if (m && !out.some((x) => x.id === m.id)) out.push(m);
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
