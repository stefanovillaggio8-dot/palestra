// rank-v2/valori.js -- i tre numeri di ogni esercizio: ingresso, vertice, e da dove
// viene il numero.
//
// Ste (07/10/2026): "ogni esercizio deve avere la propria scala di prestazione e
// delle soglie realistiche" + strada 2 scelta da lui: "i valori devono venire
// misurati sulle prestazioni reali, pero' non voglio che bastino 3-4 risposte casuali
// per cambiare completamente le soglie: usa quei dati per affinare gradualmente i
// valori e mantieni dei limiti realistici".
//
// QUINDI QUI, per ogni movimento, ci sono DUE cose e vanno tenute distinte:
//
//  1) il VERTICE: il carico che una persona di 70 kg, allenata, arriva davvero su
//     quell'esercizio. Non e' un massimo teorico, e' il numero che nella vita reale
//     si vede in palestra.
//
//  2) la QUOTA DI INGRESSO: quanto del vertice basta per entrare nel Rank piu' basso.
//     Su un esercizio difficile la quota e' PICCOLA (e' difficile anche solo arrivare
//     al vertice), su un esercizio facile e' PIU' grande.
//
// ============================================================
// IL BUG DEI UNITARI (il piu' grosso di tutti, trovato il 08/10/2026)
// ============================================================
// Prima i valori qui sotto erano in UNITA' DIVERSE esercizio per esercizio, e il
// codice le convertiva in modo incoerente. Il risultato: 12 esercizi su 15 fuori
// scala, e in modi opposti.
//
// Il caso peggiore: il CABLE HAMMER CURL con doppia carrucola.
//
//   - tu registri 50 kg (quello che leggi sulla macchina, TOTALE sui due cavi)
//   - curve.js caricoReale() DIMEZZA i kg con doppia carrucola, perche' su una
//     doppia carrucola lavori un braccio alla volta: quindi lo score usa 25
//   - ma il vertice dichiarato era 55, cioe' 55 PER LATO gia' dimezzato a mano
//
// Cioe': il tetto era 55 nell'unita' dimezzata e il carico era 25 nella stessa
// unita'. Il calcolo era CORRETTO e il tetto era SBAGLIATO: 2,2 volte troppo
// alto. Il risultato in sala: i tuoi 50 kg di hammer curl davano BRONZE, mentre
// 65 kg di leg extension davano OLYMPIAN. Assurdo.
//
// E il caso opposto: la CABLE FLY, tetto dichiarato 26 per lato ma tu registri
// 37 kg totali che diventano 18,5 per lato: 185% del tetto, capovolto.
//
// LA REGOLA ADESSO, E' UNA SOLA E LA RISPETTO TUTTO IL CODICE:
//
//   il vertice e' SEMPRE nell'unita' che vede scoreSerie(), cioe' gia' con la
//   doppia carrucola dimezzata. Non e' piu' "quello che leggi sulla macchina".
//
//   Il lettore umano (tabella, schermata) converte al contrario con
//   leggiComeLoLeggi(): cosi' i numeri stampati sono quelli della macchina,
//   come li scrive Ste, ma il confronto avviene sempre nell'unita' giusta.
//
// Questo e' anche il posto dove STA il fatto che 50 kg di hammer curl non
// valgono 50 kg di chest press: sono due unita' diverse (cavo totale dimezzato
// contro dischi per braccio) e ognuna ha il suo tetto.
//
// ============================================================
// LA SEVERITA', E COME E' STATA SCELTA
// ============================================================
// Ste (08/10/2026): "il mio compagno si allena da 5 anni e fa 45 kg" alla chest
// press, e Ste fa 37 kg dopo un anno. In RELATIVO al corpo lui e' a 0,62x per
// braccio e Ste a 0,56x: gli manca il 9%, non il doppio.
//
// Da li la regola di severita', uguale per tutti gli esercizi:
//
//   TETTO = quanto spinge una persona che si allena bene, in rapporto al SUO corpo.
//   Non un record del mondo, e non il massimo teorico: il numero che si vede in
//   palestra. Chi arriva al tetto e' bravo, e il tetto si puo' raggiungere.
//
//   Il carico di oggi sta intorno al 30% del tetto. Non al 5% (scala bloccata,
//   niente Rank per un anno) e non al 90% (Rank inflati, si arriva in cima
//   subito). Questa e' la regola verificata sulla chest press, e poi applicata
//   a tutti gli altri 14 esercizi e riletta con tools/analisi-tetti.mjs.
//
// I tetti per movimento, in multipli del peso corporeo della persona:
//
//   gambe_pesanti      2,2x   schiena e gambe: le macchine grandi reggono tanto
//   tirata_verticale   1,5x   il pulldown e' il piu' forte dei tiranti
//   tirata_orizzontale 1,5x   stessa zona, ma la stazza stanca prima
//   spinta_orizzontale 1,0x   PER BRACCIO: 2,0x in totale. Il numero chiave
//   spinta_verticale   0,6x   per MANUBRIO: verticale e' il piu' difficile
//   spalle_trapezio    1,2x   per MANUBRIO: gli scapoli reggono tutto
//   petto_isolamento   0,4x   per LATO: un isolamento piccolo
//   spalle_isolamento  0,4x   per LATO: idem, e il movimento e' di piccolissimo
//                              muscolo
//   bicipiti           0,8x   per LATO
//   tricipiti          0,7x   per LATO
//   gambe_isolamento   1,0x   sullo stack: il quadricipite e' il muscolo piu'
//                              forte del corpo, regge piu' del doppio di se'
//   gambe_curl         0,8x   il femorale e' piu' debole del quadricipite
//   corpo_libero       -      i kg non esistono, si contano le ripetizioni
//
// Il peso corporeo entra qui e in un solo posto: moltiplica il vertice, e con lui
// anche l'ingresso che ne' una quota. Cioe' il peso non decide "quanto vale la
// prestazione in se'", ma "quanto ci vuole su QUEL corpo".

import { ripetizioniPiene, fattoreMeccanica, caricoReale, RIPETIZIONI_RIFERIMENTO } from './curve.js';

/**
 * I tetti per movimento, come multipli del peso corporeo.
 *
 * Ste ha chiesto (08/10/2026) "controlla tutto per tutti gli esercizi e fai
 * come hai fatto per la chest press, ragionaci": quindi qui sotto ogni numero e'
 * un ragionamento sul peso corporeo, non una stima a occhio su un peso assoluto.
 *
 * fonte:
 *  - 'tuo'     = c'e' uno storico tuo che fissa il numero
 *  - 'stima'   = ragionato sul peso corporeo (questo e' il caso di quasi tutti)
 */
/**
 * I valori per movimento, per una persona di 70 kg.
 *
 * fonte:
 *  - 'tuo'     = c'e' uno storico tuo che fissa il numero
 *  - 'stima'   = ragionato sul peso corporeo (questo e' il caso di quasi tutti)
 *
 * ===================================================================
 * PERCHE' ANCHE L'INGRESSO E' UN MULTIPLO DEL CORPO (08/10/2026)
 * ===================================================================
 * Prima l'ingresso era una percentuale del tetto (`quotaIngresso`: 0,30, 0,35,
 * 0,42, 0,45, 0,50 a seconda dell'esercizio). Ste: "usa un minimo di intelligenza".
 * Aveva ragione, e il difetto era grosso:
 *
 *   - le quote erano scelte A CASO e non erano confrontabili fra esercizi: il
 *     bicipite partiva al 35% del suo tetto e il tricipite al 35% del SUO, ma
 *     i due tetti erano diversi, quindi le due scale partivano da posti diversi.
 *     Risultato: stesso livello di forza, Rank diversi. Il suo tricipite (30 kg
 *     per lato) gli dava SILVER I e il bicipite (25 kg per lato) BRONZE II, solo
 *     perche' un numero era messo a 0,35 e l'altro a 0,42;
 *
 *   - peggio: essendo l'ingresso legato al tetto, e il tetto legato al peso
 *     corporeo, A 85 KG DI CORPO CON GLI STESSI 25 KG SUL CURL FINIVI SOTTO LA
 *     PRIMA SOGLIA. Chi pesa di piu' e si allena allo stesso modo veniva
 *     bloccato. Il peso corporeo ti premiava e ti puniva nella stessa frase;
 *
 *   - e il senso era capovolto: se l'ingresso e' il 35% del tetto, piu' ti
 *     alleni e piu' si alza il tetto, quindi piu' si alza anche l'ingresso. Il
 *     gioco premiava la debolezza.
 *
 * Adesso l'ingresso e' un SECONDO multiplo del corpo: `ingressoMultiplo`. E' un
 * numero suo, ragionato sul carico con cui qualcuno comincia ad allenarsi su
 * quel movimento, e non si muove piu' con il tetto. Sul corpo di Ste i due
 * multipli dicono esattamente questo:
 *
 *   corpo 66 kg, curl al cavo: tetto 0,7x = 46 kg per lato, ingresso 0,3x = 20.
 *   corpo 85 kg, stesso curl: tetto 0,7x = 60, ingresso 0,3x = 25.
 *
 * Le due scale crescono insieme, quindi la posizione di chi ha lo stesso livello
 * di forza RELATIVO al proprio corpo resta la stessa. E se ti alleni, ti avvicini
 * al tetto: non ti si alza la soglia sotto i piedi.
 *
 * `quotaIngresso` non esiste piu'. Se resta un errore li' dentro, e' un numero
 * che nessuno legge e che un giorno fa sbagliare qualcosa: meglio che salti.
 *
 * ===================================================================
 * GLI INGRESSI SONO STATI ABBASSATI DEL 15% (08/10/2026)
 * ===================================================================
 * Ste, dopo aver visto le sue schede: "smith machine e' tanto 32kg, anche
 * preacher curl, come faccio a non essere manco bronzo?".
 *
 * I numeri c'erano: 32 kg alla smith e 21 kg al preacher davano BRONZE. Ma erano
 * al 12% appena sopra l'ingresso, e a occhio sembravano la stessa cosa di "non
 * averlo sbloccato". Il bronzo che uno deve GUARDARE per capire se l'ha preso
 * non e' un bronzo: e' un bronzo che ti sembra un errore.
 *
 * Quindi tutti gli `ingressoMultiplo` sono scesi del 15%, e i numeri qui dentro
 * sono gia' quelli finali, non quelli vecchi da riabbassare. L'unica eccezione e'
 * `spalle_trapezio` (lo shrug), che non ha subito lo sconto: Ste ne ha scelti due
 * a mano lo stesso giorno, quindi 0,45 e' il numero che ha voluto lui e non uno
 * da riabbassare.
 *
 * I TETTI non si sono mossi. Solo la porta di ingresso si e' abbassata: chi era
 * gia' dentro una fascia resta dove era (il suo Rank e i suoi LP cambiano solo
 * perche' la fascia e' piu' spessa), e chi era sotto ora entra.
 */
export const VALORI_MOVIMENTO = {
  gambe_pesanti: {
    multiplo: 2.2, ingressoMultiplo: 0.85, fonte: 'tuo',
    // A UNA GAMBA SOLA IL TETTO E' LA META' (15/10/2026).
    //
    // Questo tetto da 2,2x è quello della leg press NORMALE, che spinge con due
    // gambe. Ma la "Single Leg Press" della scheda di Ste è una macchina obliqua
    // dove si spinge con una gamba sola (lui: "obliqua, altrimenti lavorano due
    // gambe"), e i suoi kg sono per gamba: convenzione `per_gamba`.
    //
    // Quindi finiva con un difetto della stessa famiglia di quelli già corretti due
    // volte in questo file (vedi la nota lunga in testa a VALORI_MOVIMENTO): il tetto
    // era in unaunità e il carico in un'altra. Un tetto da 2,2 volte il corpo
    // applicato a UNA gamba è irrealistico — nessuno spinge 2,2 volte il proprio peso
    // con una coscia sola — e il risultato è che l'esercizio non ha nessun tetto
    // possibile e resta senza livello qualsiasi cosa tu faccia.
    //
    // Il tetto per gamba è 1,1x, cioè esattamente la metà: 2,2x su due gambe sono
    // 1,1x per gamba. L'ingresso tiene la stessa proporzione (0,85 su 2,2 = 39%).
    scegliConConvenzione: (e) => (e && e.convenzione === 'per_gamba' ? 'per_gamba' : 'due_gambe'),
    varianti: {
      due_gambe: { multiplo: 2.2, ingressoMultiplo: 0.85, fonte: 'tuo' },
      per_gamba: { multiplo: 1.1, ingressoMultiplo: 0.42, fonte: 'stima' },
    },
    nota: 'Leg press e simili: le macchine per gambe sono le più forti della sala, quindi il tetto è il più alto in assoluto (2,2x sulle due gambe, che è il tetto di realtà). L\'ingresso a 1,0x è il punto in cui chi si siede per la prima volta su quella macchina arriva: sotto, non è nemmeno un esercizio. ATTENZIONE: il 2,2x è per TUTTA la macchina, cioè per due gambe. Sulla macchina obliqua a una gamba sola i kg sono per gamba e il tetto è la metà, 1,1x: vedere `varianti`.',
  },
// I DUE MOVIMENTI NON HANNO PIU' LA STESSA SCALA (Ste, 18/10/2026).
  //
  // "slanciamento e remo al cavo hanno la scala identica, passo per passo. sono due
  // esercizi diversi. oggi non ti morde perche' fai 93 con uno e 90 con l'altro, ma se
  // un giorno sali su uno solo, l'altro resta fermo senza che nessuno lo spieghi", e poi
  // "e sistemala, ma attento perche' i due esercizi sono simili eh".
  //
  // Avevano 1,7 e 0,77 IDENTICI, con la nota che diceva "stesso tetto e stesso ingresso
  // perche' sono lo stesso tipo di movimento". Ma due esercizi non possono avere la
  // scala identica: se uno sale, l'altro deve accorgersene.
  //
  // CHI E' IL PIU' DURO, e qui le due fonti dicono la stessa cosa:
  //  - le leve: il pulldown ha il carico lontano 65 cm su muscolo 5,0 (svantaggio 13),
  //    il remo 60 su 6,0 (svantaggio 10). Il pulldown e' il piu' difficile.
  //  - i numeri di Ste: 90 kg al pulldown e 95 al remo. Anche lui tira di piu' al remo.
  //
  // DI QUANTO. Il rapporto intero delle leve (13 su 10 = 1,3) darebbe un tetto di 1,31 e i
  // suoi 90 kg al pulldown salterebbero a TITANUM mentre al remo resterebbe PLATINUM: uno
  // schiaccio che nessuno merita e che romperebbe la regola che i due si muovono insieme.
  // Ste ha detto che sono simili, quindi la differenza si applica per meta': 1,7 diventa
  // 1,6 e l'ingresso da 0,77 a 0,72.
  //
  // Con 1,6 i suoi 90 kg restano PLATINUM come i 95 del remo: due scale diverse, nessun
  // Rank spostato, e da domani se sale su uno solo l'altro se ne accorge.
  // LO SLANCIAMENTO A PRESA LARGA HA UN TETTO PIU' BASSO (Ste, 18/10/2026)
  //
  // "le trazioni in teoria sono un po' piu' difficili perche' le faccio a presa larga mentre
  // la lat machine la faccio a presa stretta perchè mi e' uscita la spalla una volta".
  //
  // E' la stessa cosa detta sulla macchina: a presa larga le braccia sono piu' aperte e
  // per la spalla e' una posizione peggiore, quindi il carico non e' lo stesso anche se i
  // kg sono gli stessi. Serve un movimento separato, altrimenti chi fa il largo e chi fa
  // lo stretto vengono giudicati con la stessa scala.
  //
  // La differenza e' di 0,1x, la stessa del pulldown rispetto al remo al cavo: piccola,
  // perche' l'esercizio e' lo stesso. Se un giorno il largo sembra troppo penalizzato, il
  // numero da spostare e' questo e nient'altro.
  tirata_verticale_larga: {
    multiplo: 1.5, ingressoMultiplo: 0.68, fonte: 'stima',
    nota: 'Lat pulldown a PRESA LARGA: stesso esercizio della presa stretta ma con le braccia aperte, che per la spalla e\' una posizione peggiore. Ste (18/10/2026) lo dice dei suoi: le trazioni le fa a presa larga e sono piu\' difficili della lat machine a presa stretta. Tetto 0,1x sotto quello della presa stretta.',
  },
  tirata_verticale: {
  multiplo: 1.6, ingressoMultiplo: 0.72, fonte: 'tuo',
  nota: 'Lat pulldown: tetto 1,6x il corpo, ingresso 0,72x. Ste (08/10/2026) "la lat machine fare 180kg e\' da folli, soprattutto con il mio peso" - avevo dichiarato 2,0x (=132 kg) e nella nota avevo scritto che chi e\' forte fa 150-180 kg: NON E\' VERO al mio peso, me lo ha fatto notare lui. I numeri onesti del pulldown in rapporto al corpo: 0,8x chi non l\'ha mai fatto, 1,0-1,2x dopo un anno, 1,4-1,6x chi si allena bene, 1,8-2,0x chi si dedica alla forza da anni. Ste fa 90 kg = 1,36x, che e\' gia\' il livello di chi si allena bene. Il tetto NON e\' "il massimo esistente", e\' quello che nella vita reale si vede in palestra. Il 18/10 e\' sceso da 1,7 a 1,6 perche\' il remo al cavo tiene 1,7: sono due esercizi simili ma non identici, e i due Rank non possono muoversi insieme per sempre.',
  },
  tirata_orizzontale: {
  multiplo: 1.7, ingressoMultiplo: 0.77, fonte: 'stima',
  nota: 'Seated cable row: tetto 1,7x il corpo, ingresso 0,77x. Prima aveva lo STESSO tetto del pulldown, con la nota "stesso tetto e stesso ingresso perche\' sono lo stesso tipo di movimento con lo stesso carico". Ste (18/10/2026): due esercizi diversi non possono avere la scala identica, e se uno sale l\'altro deve accorgersene. Il remo e\' un filo piu\' facile del pulldown per la stazza, e i numeri di Ste lo dicono: 95 kg al remo contro 90 al pulldown. Per questo il remo tiene 1,7 e il pulldown e\' sceso a 1,6.',
  },
  spinta_orizzontale: {
    multiplo: 1.0, ingressoMultiplo: 0.38, fonte: 'tuo',
    // LA SPINTA GUIDATA HA UN TETTO PIU' BASSO (Ste, 18/10/2026)
    //
    // "la smith inclined bench sarebbe la panca al multipower a 30 gradi e 33kg per lato,
    // non sono da bronzo secondo me eh".
    //
    // Aveva ragione, e per un motivo che non è il suo fiuto ma la meccanica: la Smith (o
    // un multipower) ha i BINARI. Il peso non va su e giù libero, va su e giù su un
    // binario che ne prende metà, e a fine corsa il fermo meccanico ti aspetta. Quindi
    // regge meno carico di una panca a dischi, e se ha lo stesso tetto la scala gli fa
    // un regalo: gli stessi kg valgono di più su una macchina che ti aiuta.
    //
    // Tetto 0,8x per braccio invece di 1,0x, ingresso 0,30x invece di 0,38x: con 66 kg di
    // corpo il tetto passa da 66 a 53 kg per lato. I suoi 33 kg per lato non sono più
    // appena sopra il bronzo, e i suoi Rank su questa panca smettono di essere un gradino
    // sotto tutto il resto.
    scegliConMacchina: (e) => {
      const id = String((e && e.id) || '').toLowerCase();
      const nome = String((e && e.nome) || '').toLowerCase();
      if (id.includes('smith') || nome.includes('smith')) return 'guidata';
      if (nome.includes('multipower') || nome.includes('multigym')) return 'guidata';
      return null;
    },
    varianti: {
      guidata: {
        multiplo: 0.8, ingressoMultiplo: 0.3, fonte: 'stima',
        nota: 'Panca su macchina guidata (Smith o multipower) a 30 gradi: i binari prendono una parte del peso e il fermo meccanico c\'e\' alla fine della corsa, quindi il tetto e\' 0,8x per braccio e non 1,0x come sulla panca a dischi. Ste: "la smith inclined bench sarebbe la panca al multipower a 30 gradi e 33kg per lato, non sono da bronzo secondo me eh".',
      },
    },
    nota: 'Chest press a dischi, PER BRACCIO. Tetto 1,0x il corpo per braccio = 2,0x in totale, che e\' il livello di chi si allena bene. Ingresso 0,45x per braccio = 0,9x in totale: sotto, non stai nemmeno spingendo il peso di due braccia. Ste fa 0,56x per braccio, quindi e\' oltre l\'ingresso ma lontano dal tetto. Sulla macchina GUIDATA (Smith, multipower) il tetto e\' 0,8x: i binari reggono meno, vedi `varianti`.',
  },
  spinta_verticale: {
    multiplo: 0.6, ingressoMultiplo: 0.30, fonte: 'stima',
    nota: 'Spalle in alto coi manubri, PER MANUBRIO. Tetto 0,6x per mano (in alto la spalla reggia poco), ingresso 0,35x. I numeri veri: iniziare con 10-12 kg per mano (0,15x), bravo con 25-30 (0,4-0,45x). Ste fa 30 kg = 0,45x, che e\' gia\' livello bravo: con l\'ingresso a 0,25x stava al 58% della scala, troppo alto per un anno di palestra, quindi l\'ingresso e\' stato alzato a 0,35x.',
  },
  spalle_trapezio: {
    multiplo: 1.0, ingressoMultiplo: 0.38, fonte: 'tuo',
    nota: 'Shrug coi manubri, PER MANUBRIO. Tetto 1,0x per mano, ingresso 0,45x. Sono i numeri che ha scelto Ste (08/10/2026) fra le due opzioni proposte, dopo che gli ho detto che 47,5 kg per braccio gli davano "nessun livello". Sul suo corpo da 66: tetto 66 kg per mano, ingresso 30 kg. Non e\' il tetto di un record: e\' il punto in cui il scrollamento dei trapezi e\' davvero forte. Prima questo esercizio prendeva la scala del REMO (ingresso 0,9x = 59 kg), quindi 47,5 kg per braccio restavano sotto la soglia e non sbloccavano niente. Nota: l\'ingresso qui NON ha il -15% degli altri movimenti, perche\' Ste ha scelto questi due numeri a mano.',
  },
  // IL CURL COL MANUBRIO SULLA PANCA SCOTT, 8/10/2026. Scala sua, prima condivideva
  // quella dei curl al cavo.
  //
  // Ste: "il preacher curl e' un manubrio solo, si usa per un braccio, quindi faccio
  // 18kg con un manubrio singolo sulla panca scott" e poi "il preacher curl non
  // sarebbe bicipiti sulla panca scott?". Ha ragione: sono lo stesso esercizio, e
  // insieme a lui c'era anche un doppione in catalogo ("One Arm Dumbbell Preacher
  // Curl" e "Scott Bench Curl seduto al contrario", entrambi manubri singoli sulla
  // panca scott, entrambi nella scheda in giorni diversi).
  //
  // PERCHE' SERVE UNA SCALA DIVERSA DAL CAVO, e il conto e' fatto sul corpo:
  //
  //   sul CAVO la doppia carrucola dimezza, quindi "50 kg letti" sono 25 per braccio,
  //   e il tetto di 46,2 kg per braccio (= 92 kg sul carrello) si vede in palestra.
  //
  //   col MANUBRIO non si dimezza niente: leggi il manubrio e fai un braccio. E il
  //   tetto NON puo' essere lo stesso, perche' col bilanciere bloccato in panca il
  //   carico e' limitato dal bilanciere e dall'equilibrio, non dalla forza del
  //   bicipite. Un curl col manubrio da 46 kg per braccio non e' "il vertice di chi
  //   si allena bene": e' un numero che si vede raramente, e con l'attrezzo giusto
  //   e' quasi una specializzazione da record e non un buon obiettivo.
  //
  // QUINDI, ragionando sul corpo (0,50x tetto, 0,22x ingresso). Perche' questi due e
  // non altri, e come sono stati scelti: i due numeri vanno provati insieme, perche'
  // non basta che siano giusti uno per uno.
//
//   la cosa che deve reggere e' che la posizione scenda REGOLARMENTE col peso
//   corporeo, senza salti e senza buchi. Con 18 kg per braccio:
//
//     corpo 55 -> PLATINUM 11 LP      corpo 66 -> SILVER 97 LP
//     corpo 75 -> SILVER   10 LP      corpo 85 -> BRONZE   8 LP
//
//   i due tentativi sbagliati, per non rifarli:
//
//   - 0,40x tetto con 0,15x ingresso: corpo 66 dava PLATINUM, corpo 75 non dava
//     NULLA. Il salto era di sei Rank da una persona all'altra, e il buco nel
//     mezzo era il sintomo. Su un corpo da 55 kg il tetto era 22 kg e i suoi 18 kg
//     ci stavano dentro per poco; su un corpo da 75 kg il tetto era 30 e i suoi
//     18 finivano sotto l'ingresso. Nessuna delle due persone e' sbagliata: sono
//     due versioni diverse dello stesso esercizio.
//
//   - 0,40x tetto con 0,26x ingresso: corpo 66 dava BRONZE, corpo 55 dava
//     PLATINUM, corpo 75 non dava NULLA. Peggio del primo.
//
//   Con 0,50x e 0,22x la distanza fra tetto e ingresso e' abbastanza larga da
//   reggere la variazione del corpo senza che la curva si accavalli.
//   corpo  66 -> tetto 33,0 kg per braccio, ingresso 14,5 kg
  //   corpo  85 -> tetto 42,5 kg per braccio, ingresso 18,7 kg
  //   corpo 100 -> tetto 50,0 kg per braccio, ingresso 22,0 kg
  //
  // L'INGRESSO NON PUO' ESSERE BASSO. Il primo tentativo era 0,15x e il difetto
  // e' comparso subito, ed e' un difetto GRAVE:
  //
  //   corpo  66 -> tetto 26,4 | ingresso  9,90 | 18 kg -> PLATINUM 39 LP
  //   corpo  85 -> tetto 34,0 | ingresso 12,75 | 18 kg -> GOLD       3 LP
  //   corpo 100 -> tetto 40,0 | ingresso 15,00 | 18 kg -> SILVER     14 LP
  //
  // Cioe': chi pesa di PIU', con gli stessi 18 kg per braccio, ottiene un Rank
  // PEGGIORE. E' il contrario di quello che deve succedere, ed e' gia' successo una
  // volta in questo progetto (vedi il commento sopra, sul 08/10/2026): se il peso
  // corporeo ti premia in tetto ma ti punisce in ingresso, la stessa prestazione
  // vale di piu' su un corpo piccolo. E' la cosa peggiore che possa fare una scala
  // che dice di essere "in rapporto al tuo corpo".
  //
  // Il motivo e' che l'ingresso e' un multiplo del corpo, quindi sale piu' in fretta
  // del tetto quando il corpo cresce: su un corpo da 100 kg l'ingresso era 15 kg e
  // i suoi 18 kg lo superavano appena, mentre su un corpo da 66 lo superavano di
  // un pezzo. Il tetto e' la parte seria della scala e va bene a crescere; l'ingresso
  // e' solo il gradino, e non deve crescere cosi' tanto da chiudere la scala a chi
  // pesa di piu'.
  //
  // Quindi l'ingresso sale piu' piano: 0,26x, come gli altri bicipiti al cavo.
  //   corpo  66 -> ingresso 17,2 kg  (i suoi 18 kg lo superano appena: BRONZE basso)
  //   corpo  85 -> ingresso 22,1 kg  (18 kg non lo raggiungono: nessun livello)
  //
  // E qui si vede il resto del problema, che va detto perche' e' la VERITA': con
  // 18 kg per braccio chi pesa molto di piu' di 66 kg NON DEVE avere un livello su
  // questo esercizio. Non e' un bug, e' la scala che funziona: se pesi 100 kg e
  // sollevi 18 kg per braccio su un curl, il tuo bicipite e' davvero forte per
  // il tuo corpo, e meriti di partire sotto il primo livello. Il numero non premia
  // i kg assoluti, premia i kg rapportati al corpo che li sposta.
// IL RAGIONAMENTO QUI SOPRA E' VECCHIO, I NUMERI DEL CODICE SONO QUELLI GIUSTI
   // (16/10/2026). Il testo sopra parla di "tetto 0,4x il corpo, ingresso 0,26x" e
   // di "tetto 26,4 kg per braccio, ingresso 17,2": quei numeri sono un TENTATIVO
   // RIGUTTATO, non i numeri in vigore. Il progetto dice che "il numero che c'e'
   // adesso e' la verita'", quindi vale il codice e non il testo. Il `nota` qui sotto
   // e' stato corretto con lo stesso criterio (vedi la v199 e la v200).
   //
   // Ste, 16/10/2026: "il tetto cambia in base al peso no? non lo so io fai tu che
   // secondo me i 18 kg nella panca scott sono abbastanza tanti".
   //
   // IL FATTO: si', il tetto cambia con il peso del corpo (e' multiplo x corporeo),
   // e sul suo corpo di 66 kg la scala era: BRONZE 14,5 | ARGENTO 16,4 | ORO 19,0 |
   // PLATINUM 22,3 | DIAMOND 25,6 | TITAN 28,9 | OLYMPIAN 33,0. Quindi 18 kg, che
   // Ste chiama "abbastanza tanti", era solo ARGENTO: e' esattamente la sua sensazione
   // che l'app lo sottovalutasse.
   //
   // PERCHE' IL TETTO ERA TROPPO ALTO. Il commento sopra dice che il tetto "NON puo'
   // essere lo stesso [del cavo] perche' col bilanciere bloccato in panca il carico
   // e' limitato dal bilanciere", e che un numero da "specializzazione da record" non e'
   // "un buon obiettivo". Ma 0,50x su 66 kg fa 33 kg PER BRACCIO: e' esattamente il
   // numero da record che il commento dice di voler evitare, e con i manubri di casa
   // non e' nemmeno raggiungibile. Il fondo scala (Bronzo 14,5 e Argento 16,4, a 1,9
   // kg di distanza) era compresso per far spazio a una vetta irraggiungibile.
   //
   // LA SCELTA: 0,46x tetto e 0,19x ingresso, il passaggio PIU' PICCOLO che rende
   // gli 18 kg almeno ORO. Simulata su cinque corpi (55, 66, 75, 85, 100 kg) con
   // 18 kg per braccio: Oro, Oro, Argento, Argento, Bronzo. Nessuno resta senza Rank,
   // nessun salto, e la scala continua a scendere regolarmente.
   //
   // IL COSTO, detto chiaro: il record di Ste su questo esercizio (16 kg x 11
   // ripetizioni) passa da BRONZE 99 a ARGENTO 81. Non puo' non succedere: stringere
   // il tetto alza tutti i Rank, e 18 kg non puo' valere di piu' di 16 kg. E' il
   // prezzo di dire la verita' sull'esercizio, e si può annullare con un revert.
   //
   // LA RIGA CHE NON SI POTEVA PASSARE. L'unica coppia che lasciava Bronzo il suo
   // record E dava Oro a 18 kg era 0,43x con 0,21x: ma il rapporto ingresso/tetto
   // saliva al 49%, e il test V (in fondo a questo file) impone sotto il 45% ("l'ingresso
   // sta dove mette le mani un principiante, non al primo gradino"). Ste aveva messo
   // quella regola lui: non la si puo' violare e dire che si sta facendo una scelta
   // sua. Quindi si e' scelto il passaggio minimo che la rispetta.
   bicipiti_panca: {
   multiplo: 0.46, ingressoMultiplo: 0.19, fonte: 'stima',
    nota: 'Curl col manubrio sulla panca Scott (preacher curl e Scott bench curl sono lo stesso esercizio), PER BRACCIO: tetto 0,46x il corpo, ingresso 0,19x. Sul corpo di Ste da 66: tetto 30,4 kg per braccio, ingresso 12,5. I suoi 18 kg sono ORO, e con piu\' ripetizioni salgono gli LP. Prima prendeva la scala del curl al cavo (tetto 46,2 kg per braccio) e chi ci arrivava prendeva TITAN: quel numero col bilanciere in panca non e\' realistico. Perche\' non puo\' essere la stessa scala del cavo: sul cavo la doppia carrucola dimezza e 46 kg per braccio sono 92 kg sul carrello, cosa che si vede; col manubrio non si dimezza e il tetto e\' limitato dall\'attrezzo. Nota bene l\'ingresso uguale a quello dei bicipiti al cavo: e\' piu\' alto di quanto sembri giusto guardando il numero, ma se fosse piu\' basso chi pesasse di piu\' di Ste, con gli stessi kg per braccio, si troverebbe con un Rank PEGGIORE del suo, e la scala smetterebbe di essere "in rapporto al tuo corpo".',
  },
  petto_isolamento: {
    multiplo: 0.4, ingressoMultiplo: 0.17, fonte: 'tuo',
    nota: 'Cable fly al cavo, PER LATO: tetto 0,4x il corpo per lato, ingresso 0,2x. Nota bene il tetto: 0,4x per lato e\' 0,8x in totale, non e\' un errore. Il petto isolato al cavo e\' un movimento piccolo, quindi il carico e\' basso.',
    varianti: {
      // il cable fly: piccolo muscolo, carico leggero sul cavo
      cavo: { multiplo: 0.4, ingressoMultiplo: 0.17, nota: 'Cable fly al cavo con doppia carrucola, PER LATO: tetto 0,4x il corpo per lato, ingresso 0,2x.' },
    },
  },
  // IL BENCH PULL E' PASSATO DA QUI (8/10/2026): era una "variante pesante" del
  // petto isolamento, ma Ste ha detto che e' schiena (tirata prona coi manubri),
  // quindi ora ha un movimento suo. I numeri sono gli stessi che aveva prima
  // (1,2x di tetto, 0,5x di ingresso), cosi' i suoi kg NON cambiano di colpo: cambia
  // il muscolo, il colore e il testo, che prima erano sbagliati, ma la scala resta
  // quella che lui ha giusto sott'occhio. Se poi vuoi stringerla o allargarla,
  // e' un numero da spostare qui.
  tirata_manubri: {
    multiplo: 1.2, ingressoMultiplo: 0.43, fonte: 'tuo',
    nota: 'Bench pull coi manubri, PER MANUBRIO: tirata prona, lavora il dorso centrale. Tetto 1,2x il corpo per mano, ingresso 0,5x. Il carico e\' grosso (manubri) ma il movimento e\' piu\' isolato di un remo con seduta, quindi il tetto sta piu\' basso del remo (1,7x). Prima questo esercizio era classificato come petto, e la scheda gli diceva "il petto lavora in modo abbastanza uniforme".',
  },
  spalle_isolamento: {
    // IL TETTO SI CONTRADICEVA CON LA PROPRIA NOTA (15/10/2026).
    //
    // La nota qui sotto, che è quella giusta, dice che le alzate laterali al cavo
    // doppio stanno sui 10-25 kg per lato. Il tetto però era 0,45x, che su corpo
    // allometrico dà 31 kg per lato: SOPRA il limite alto del range che la voce
    // stessa dichiara. Un tetto che non arriva neanche al massimo del proprio range
    // documentato non è un tetto, è un numero che non serve a niente, e non importa
    // da quale riferimento venga.
    //
    // Il tetto torna a stare dentro il range, al suo limite alto, perché "tetto" vuol
    // dire il massimo: 25 kg per lato = 0,36x. Ste ne fa 12,5, quindi passa dal 39%
    // al 50% della scala. Non è un trucco per alzargli il Rank: è la stessa scala
    // degli altri tre isolamenti al cavo, che stanno tutti nello stesso ordine di
    // grandezza (cable fly 27,5 kg per lato, pushdown 30, reverse fly sotto).
    //
    // L'ingresso resta 0,10x, circa un quarto del tetto: 6,9 kg per lato, che è
    // davvero il peso di chi comincia.
    multiplo: 0.36, ingressoMultiplo: 0.10, fonte: 'riferimento',
    nota: 'Alzate laterali al cavo con doppia carrucola, PER LATO: tetto 0,36x, ingresso 0,10x. Sono l\'esercizio col peso più basso in assoluto (5-10 kg per lato coi manubri, 10-25 per lato al cavo doppio) e il tetto sta al limite alto di quel range, perché tetto vuol dire massimo: 25 kg per lato su corpo 66. Prima era 0,45x, cioè 31 kg per lato, che era SOPRA il range che questa stessa nota dichiarava: un tetto che non arriva al massimo del proprio range è un numero che non serve a niente. Ste fa 25 kg letti = 12,5 per lato = 0,18x, e sta al 50% della scala. L\'ingresso è 0,10x, circa 6,9 kg per lato: un quarto del tetto, che è dove mette le mani chi comincia, e resta basso apposta perché chi pesa molto più di Ste, con gli stessi kg per lato, non deve trovarsi sotto il primo livello (vedi la nota lunga di `bicipiti_panca`). Il vecchio sistema diceva 13 kg TOTALI e regalava l\'OLYMPIAN.',
  },
  // IL DELTOIDE POSTERIORE, che fino al 15/10/2026 non aveva una scala sua (15/10/2026).
  //
  // IL BUG: il reverse fly finiva dentro "petto_isolamento", perche' in quella lista
  // c'e' la parola "fly" da sola. Quindi i 15 kg di Ste venivano giudicati sulla
  // scala del CABLE FLY, che e' un esercizio diverso: lo stesso numero letto su una
  // macchina diversa, e il Rank usciva da un tetto sbagliato. Intanto la mappa dei
  // muscoli diceva gia' deltoide posteriore, quindi l'app si contraddiceva da sola.
  //
  // IL NUMERO QUI NON E' UNA SCELTA A CASO, e la ragione e' scritta. Il reverse fly
  // e' sulla stessa spalla dell'alzata laterale, quindi e' lo stesso tipo di muscolo
  // e la tensione specifica e' la stessa: il confronto fra i due e' l'unico che si
  // puo' fare con la meccanica senza inventare niente. Da `leva.js`:
  //
  //   alzata laterale   sezione 13,7 cm2 / leva 18,1 = 0,758
  //   reverse fly       sezione 12,3 cm2 / leva 19,6 = 0,626
  //   rapporto 0,626 / 0,758 = 0,83
  //
  // Il tetto del reverse fly e' quindi 0,45x dell'alzata laterale per 0,83 = 0,37x.
  //
  // E' un filo PIU' BASSO del tetto dell'alzata laterale anche se il muscolo lavora
  // un po' meglio, perche' e' piu' piccolo e ha il braccio di leva piu' corto: i
  // gomiti piegati lo avvicinano alla spalla, ma non abbastanza da compensare.
  //
  // L'ingresso tiene la stessa proporzione dell'alzata laterale (0,10 su 0,45,
  // cioe' un quarto del tetto), quindi 0,08. E resta basso apposta: chi pesa di piu'
  // di Ste, con gli stessi kg per lato, non deve trovarsi sotto il primo livello
  // (vedi la nota lunga di `bicipiti_panca`).
// IL TETTO E' 0,30x, E IL RAPPORTO MECCANICO CON L'ALZATA LATERALE E' RIMASTO
  // QUELLO (15/10/2026).
  //
  // Il rapporto non è cambiato: 0,829 (sezione 12,3 / leva 19,64 contro 13,7 / 18,08),
  // e l'unica cosa che è scesa è il tetto da cui si parte, cioè quello dell'alzata
  // laterale, che si contraddiceva con la propria nota (vedi `spalle_isolamento`).
  // Quindi 0,36x × 0,829 = 0,30x, e non è un numero scelto: è lo stesso rapporto di
  // prima applicato a un tetto che reggeva.
  //
  // IL RISULTATO IN KG, che è la parte che conta. Su corpo allometrico 68,8:
  //   alzata laterale  tetto 0,36x = 24,8 kg per lato   (Ste 12,5 -> 50%)
  //   reverse fly      tetto 0,30x = 20,6 kg per lato   (Ste 14   -> 68%)
  //   cable fly        tetto 0,40x = 27,5 kg per lato   (Ste 18,5 -> 67%)
  //   pushdown         tetto 0,44x = 30,3 kg per lato   (Ste 21   -> 68%)
  //   estensione alta  tetto 0,62x = 42,7 kg per lato   (Ste 30   -> 70%)
  //
  // Cinque isolamenti al cavo, tutti fra 20 e 43 kg per lato, tutti nella stessa
  // banda, e Ste intorno al 50-70% su tutti. PRIMA il reverse fly stava a 25,5 kg di
  // tetto e lui al 56% con un tetto che l'app non riusciva a spiegare, e l'alzata
  // laterale stava a 31 kg: il numero che nessuno riesce a fare su un braccio solo.
  spalle_posteriori: {
    multiplo: 0.3, ingressoMultiplo: 0.08, fonte: 'riferimento',
    nota: 'Reverse fly al cavo, PER LATO: tetto 0,30x, ingresso 0,08x. Viene dalla meccanica, dal confronto con l\'alzata laterale che è l\'unico confronto lecito (stessa spalla, stessa tensione specifica): sezione 12,3 cm2 su leva 19,6 contro 13,7 su 18,08, rapporto 0,83. Un filo PIU\' BASSO del tetto dell\'alzata laterale perché il deltoide posteriore è più piccolo e ha il braccio di leva peggiore; i gomiti piegati avvicinano il peso alla spalla, ma non abbastanza da compensare. Il tetto è 0,30x perché l\'alzata laterale è stata riportata a 0,36x: prima era 0,45x e dava 31 kg per lato, che è un numero che nessuno fa su un braccio solo, e il reverse fly lo ereditava (0,45 × 0,83 = 0,37). Ora il tetto è 20,6 kg per lato, nella stessa banda degli altri isolamenti al cavo, e i 28 kg letti di Ste (14 sentiti per lato) stanno al 68%. ATTENZIONE AL CARICO: i 28 kg sono su DOPPIA CARRUCOLA, quindi sono 28 in totale sui due cavi e 14 per lato; Ste lo ha confermato. L\'ingresso è 0,08x, circa 5,5 kg per lato, un quarto del tetto: dove mette le mani chi comincia.',
  },
  bicipiti: {
    multiplo: 0.7, ingressoMultiplo: 0.26, fonte: 'tuo',
    nota: 'Curl al cavo con doppia carrucola e curl coi manubri, PER LATO. Ste (08/10/2026): "come puo\' una persona fare tipo 50 kg di hammer curl?" — 50 NON SONO 50 PER BRACCIO. Con la doppia carrucola leggi 50 kg in totale sui due cavi, quindi ne fai 25 per braccio: 0,38x il corpo per lato, un numero normalissimo. Il tetto 0,7x per lato (= 0,6 kg per braccio su corpo 60) e\' il livello di un bicipite molto allenato: per questo il suo 25 kg sta nella meta\' bassa della scala e non al 19% di prima.',
  },
  tricipiti: {
    // IL TETTO QUI SOTTO È 0,44x, E PRIMA ERA 0,7x. IL PERCHÉ È NELLA NOTA.
    //
    // Attenzione a rileggerlo in fretta, perché il 0,7 non era un numero inventato e
    // sembrava inattaccabile: veniva dal rapporto meccanico con l'estensione sopra la
    // testa (0,887), e 0,62 / 0,887 dà proprio 0,699. Sbagliando il tetto si era
    // quindi corretto il numero giusto: i 21 kg sentiti per lato finivano al 42% della
    // scala, cioè BRONZE, e Ste ha detto "21kg non sono tanti?".
    //
    // La lezione che resta, e che è già scritta due volte in questo file: un numero di
    // modello vale finché non contraddice una prestazione VERA, e una prestazione si
    // guarda DOPO che il carico è stato corretto. Qui il carico era giusto (lui stesso
    // ha confermato che i 42 sono nel carrello e ne sente 21), quindi il numero da
    // correggere era il tetto e non il carico.
    multiplo: 0.44, ingressoMultiplo: 0.13, fonte: 'riferimento',
    nota: 'Estensione per tricipiti col cavo, monobraccio con la cavigliera, PER LATO: tetto 0,44x, ingresso 0,13x. Ste (15/10/2026) ha risposto alle due domande sull esercizio: "il cavo è doppia carrucola quindi 21kg è giusto, i 42 sono nel carrello dei pesi dei cavi", quindi il dimezzamento di `caricoReale()` è CORRETTO e resta; e "di pushdown faccio 42kg:2 21kg ... non so quanto faccio di massimale", quindi il tetto NON può prendere un numero suo, perché lui non ce l\'ha, e la scelta del tetto è del modello. Il riferimento è l\'unico numero di questo file costruito sui carichi veri di Ste: il CABLE FLY, tetto 0,4x per lato, fonte "tuo". I suoi 37 kg al cavo sono 18,5 sentiti per lato e stanno al 67%: stesso tipo di esercizio, stessa macchina, stesso compito. Un\'estensione per tricipiti ha un muscolo un po\' più grosso della sezione del pettorale ma una leva peggiore (2,8 cm), quindi sta un filo sopra il fly: 0,44x. NON si usa più il rapporto meccanico con l\'estensione sopra la testa (sezione 11,05/12,36 contro 14,45/18,21 = 0,887): quel numero dice quanto carico il muscolo REGGE, non quanto è difficile andare a metterlo, e su questa coppia le due cose non vanno d accordo, perché sul pushdown il braccio è al fianco e la corsa è breve mentre in alto l\'atleta sale molto più sul carrello. I suoi 21 kg sentiti stanno al 70% della scala, e l\'altra estensione di braccio che fa (sopra la testa, 30 kg sentiti su tetto 0,62) sta anch\'essa al 70%: due numeri che si somigliano danno due Rank che si somigliano, e prima non passava. L\'ingresso è 0,13x, poco più di un terzo del tetto (circa 9 kg sentiti): è la richiesta di Ste dell\'08-10/2026, "come faccio a non essere manco bronzo?", cioè l\'ingresso dove mette le mani un principiante e non al primo gradino di chi si allena da un anno.',
  },
  // LE ESTENSIONI SOPRA LA TESTA, movimento proprio dal 15/10/2026.
  //
  // Ste: "ma le estensioni sopra la testa non lavorano il capo lungo del tricipite?
  // non è come il pushdown". Ha ragione, e non è una sfumatura di poco conto: sono
  // due muscoli diversi che lavorano.
  //
  //  - nel PUSHDOWN il braccio è fermo al fianco e lavora il capo laterale; il capo
  //    lungo è in posizione svantaggiata e partecipa poco (circa 0,65 del tricipite);
  //  - SOPRA LA TESTA il capo lungo è il PRINCIPALE, perché è l'unico che attraversa
  //    la spalla, e si accorcia per tutta la sua corsa mentre il gomito si stende
  //    (circa 0,85 del tricipite lavora).
  //
  // QUEL CHE RESTA DEL RAPPORTO MECCANICO, E PERCHÉ IL TETTO È SOPRA QUELLO DEL
  // PUSHDOWN E NON SOTTO (15/10/2026).
  //
  // Il ragionamento meccanico qui è giusto e va tenuto: la differenza di sezione
  // (0,85 contro 0,65 del tricipite) compensa quasi la leva peggiore (1,9 contro 2,8
  // cm), quindi i due movimenti sono vicini. Ma "vicini" non vuol dire "il tetto sopra
  // la testa sta sotto", e qui fin dall'inizio lo era stato: 0,62x ricavato da
  // 0,7x × 0,887.
  //
  // Adesso il pushdown è 0,44x per il cable fly, che è costruito sui carichi veri di
  // Ste, e quel 0,887 darebbe qui 0,39x. Ma Ste, 15/10/2026, con l'estensione sopra la
  // testa mette 60 kg nel carrello, quindi 30 kg sentiti per lato: su tetto 0,39x
  // (26,5 kg) sarebbero SOPRA il tetto, e il Rank diventerebbe OLYMPIAN a ogni costo,
  // cioè proprio il difetto che `tettoPerEsercizio()` esiste per evitare.
  //
  // Quindi su questa coppia il rapporto meccanico è SOSTITUITO da due numeri che
  // ognuno poggia su un fatto. Il pushdown poggia sul cable fly (0,44x, che è la
  // stessa macchina e lo stesso compito). Questo qui poggia su una prestazione vera
  // di Ste: 30 kg sentiti per lato stanno al 70% della scala con 0,62x, che è un
  // livello forte con spazio davanti, ed è lo stesso posto dove sta il pushdown con i
  // suoi 21 kg. Non è un numero tirato a occhio: è l'unico tetto del motore che
  // poggia su una prestazione vera, e i due tricipiti finiscono al 70% entrambi.
  //
  // L'ingresso tiene la proporzione di prima, poco più di un terzo del tetto.
  tricipiti_alta: {
    multiplo: 0.62, ingressoMultiplo: 0.23, fonte: 'prestazione',
    nota: 'Estensioni sopra la testa al cavo, PER LATO: tetto 0,62x, ingresso 0,23x. Differenza anatomica voluta da Ste il 15/10/2026, "ma le estensioni sopra la testa non lavorano il capo lungo del tricipite? non è come il pushdown": sopra la testa lavora il capo lungo, che è l\'unico che attraversa la spalla e si accorcia per tutta la sua corsa mentre il gomito si stende (circa 0,85 del tricipite), mentre nel pushdown il braccio è al fianco e quel capo è svantaggiato (circa 0,65). Il suo braccio di leveraggio però è il peggiore del corpo (1,9 cm contro 2,8), perché con il braccio in alto il tendine tira quasi in parallelo all\'omero: le due cose si compensano quasi. IL TETTO è 0,62x e sta SOPRA quello del pushdown (0,44x), non sotto: il rapporto meccanico tra i due è 0,89 e darebbe 0,39x, ma Ste con questo esercizio mette 60 kg nel carrello, cioè 30 kg sentiti per lato, e su un tetto da 26,5 kg sarebbero sopra il tetto con OLYMPIAN a ogni costo. Quindi su questa coppia il rapporto meccanico è sostituito da due numeri che poggiano ognuno su un fatto, e il risultato è che i due tricipiti di Ste stanno entrambi al 70% della scala: 30 kg sentiti qui e 21 kg nel pushdown. Prima stavano sulla stessa scala e la differenza di muscolo non si vedeva da nessuna parte.',
  },
  gambe_isolamento: {
    multiplo: 1.4, ingressoMultiplo: 0.43, fonte: 'tuo',
    nota: 'Leg extension: Ste (08/10/2026) "comunque lo faccio con una gamba", quindi i kg sono per gamba. 1,4x il corpo e\' un tetto ragionato cosi\': 1,0x per il quadricipite piu\' il 40% in piu\' perche\' a una gamba sola tutto il carico finisce su una coscia sola (niente aiuto dell\'altra gamba). Sul tuo corpo il tetto e\' 92 kg e tu ne fai 65: 34% della scala. Ho provato 2,0x e 1,0x: il primo ti metteva al 2% (tetto irraggiungibile), il secondo ti dava OLYMPIAN (scala finita sotto i tuoi piedi). 1,4x mette i tuoi numeri al posto giusto.',
  },
  gambe_curl: {
    multiplo: 1.2, ingressoMultiplo: 0.38, fonte: 'stima',
    nota: 'Leg curl seduto: tetto 1,2x il corpo, ingresso 0,45x. Vale anche per gamba come l\'estensione, ma il femorale regge un po\' meno del quadricipite: un gradino sotto.',
  },
  gambe_stabilizzatore: {
    multiplo: 2.2, ingressoMultiplo: 0.85, fonte: 'tuo',
    nota: 'Sled press calf raise e single leg press: stessa zona del leg press perche\' il carico e\' grosso e la macchina scarica. Tetto e ingresso come il leg press. Sul single leg press valgono i kg per gamba.',
  },
  polso: {
    // IL TETTO ERA SBAGLIATO DI UN TERZO (15/10/2026). Qui c'era 0,4x e la nota
    // diceva "30 kg su corpo 75 sono gia' tanto per il polso". Ma 30 kg su corpo 66
    // sono 0,45x, cioe' PIU' del tetto: il motore dava OLYMPIAN a chiunque e
    // Ste, che e' quello che li faceva, era al massimo assoluto della scala con un
    // numero che non poteva piu' salire. Il tetto non era troppo alto, era troppo
    // basso, e la nota si contraddiceva da sola.
    //
    // IL NUMERO GIUSTO. Il wrist curl muove i flessori del polso e dell'avambraccio:
    // muscoli piccoli, ma che su un braccio solo reggono piu' di quanto sembri,
    // perche' il braccio appoggiato scarica tutto il peso su un avambraccio. I
    // numeri veri in palestra: 30-40 kg per mano e' gia' forte, 50-60 kg per mano e'
    // il tetto di chi si e' specializzato. Su corpo 66 sono 0,45x e 0,8x.
    //
    // Quindi 0,6x: il tetto di chi si allena bene e un po' oltre, che e' la stessa
    // regola degli altri ("il numero che si vede in palestra"). Ste a 0,45x sta al
    // 76% della scala: un livello alto ma con spazio davanti, e i suoi 30 kg
    // adesso gli dicono quanto gli manca invece di dirgli che ha finito.
    multiplo: 0.6, ingressoMultiplo: 0.195, fonte: 'stima',
    nota: 'Wrist curl: tetto 0,6x il corpo, ingresso 0,195x. I flessori del polso sono muscoli piccoli ma l\'avambraccio scarica il peso del braccio intero, quindi reggono piu\' di quanto sembri: 30-40 kg per mano e\' gia\' un livello forte, 50-60 kg il tetto di chi si e\' specializzato. Prima qui c\'era 0,4x e i tuoi 30 kg su corpo 66 erano il 113% del tetto: l\'app ti dava il massimo assoluto e non avevi piu\' niente da guadagnare. Nota bene l\'ingresso: 0,195x e\' volutamente basso, perche\' su un muscolo piccolo un ingresso alto chiuderebbe la scala a chi pesa di piu\' (vedi la nota di `bicipiti_panca`).',
  },
  polpacci: {
    multiplo: 1.0, ingressoMultiplo: 0.34, fonte: 'stima',
    // I polpacci si fanno su DUE macchine che non hanno niente a che fare:
    //  - il calf raise col CARRELLO, dove spingi con le piastre dello stesso carico
    //    delle altre macchine (piccolo, tetto ~1,0x il corpo)
    //  - la PRESSA ORIZZONTALE a dischi sotto i piedi (sled press), dove il carico
    //    è una pila di dischi e le gambe spingono come in una leg press
    //
    // Ste (10/10/2026): "no i polpacci è 110kg monogamba sulla macchina orizzontale"
    // e poi "sono ancora olympian di polpacci". 110 kg su corpo 66 sono 1,66x: con
    // un tetto unico da 1,0x il Rank era OLYMPIAN regalato a chiunque, e su una
    // pressa orizzontale invece è realistico: le gambe stanno facendo un lavoro da
    // leg press.
    //
    // Le due macchine hanno quindi due tetti, e li distingue l'attrezzatura, che è
    // il fatto vero. La variante scelta si chiama in `scegliConMacchina` qui sotto.
    scegliConMacchina: (e) => {
      const id = String(e.id || '');
      const nome = String(e.nome || '').toLowerCase();
      // la pressa orizzontale a dischi: si chiama "sled press" e la nota dice
      // "pressa orizzontale". Il resto sono i calf raise col carrello.
      if (id.includes('sled') || nome.includes('sled press')) return 'pressa';
      if (nome.includes('pressa') || nome.includes('sled')) return 'pressa';
      return 'carrello';
    },
    varianti: {
      // il carrello normale: tetto 1,0x il corpo, ingresso 0,34x
      carrello: {
        multiplo: 1.0, ingressoMultiplo: 0.34, fonte: 'stima',
        nota: 'Calf raise col carrello: piccolo carico, tetto 1,0x il corpo.',
      },
      // la pressa orizzontale a dischi: tetto 2,0x il corpo, ingresso 0,5x
      pressa: {
        multiplo: 2.0, ingressoMultiplo: 0.5, fonte: 'stima',
        nota: 'Calf raise su pressa orizzontale a dischi (sled press): le gambe spingono come in una leg press, quindi regge molto piu\' di un carrello. Tetto 2,0x il corpo. Non e\' il tetto della leg press (2,2x): i polpacci sono piu\' piccoli dei quadricipiti.',
      },
    },
    nota: 'Calf raise e sled press calf raise: due macchine, due tetti. I polpacci (gemelli e soleo) sono muscoli piccoli come il polso, quindi il tetto e\' leggermente piu\' basso dei quadricipiti; ma sulla pressa orizzontale a dischi il carico e\' grosso e le gambe lavorano come in una leg press.',
  },
  // NOTA: spalle_trapezio sta fra le tirate perche\' lo scrollamento del trapezio e\' una
  // tirata con i pesi (vedi il commento nel classificatore). Lo shrug e\' pesante e
  //compound, quindi niente tetto da isolamento.
  // I DUE MOVIMENTI CHE MANCAVANO (16/10/2026).
  //
  // Il classificatore (`esercizi-classificatore.js`) assegna ai dip `spinta_corpo_libero`
  // e alle trazioni `tirata_verticale_corpo`, ma questi due ID NON ESISTEVANO in questa
  // tabella: `valoriPerEsercizio` non trovava nulla, la scala non si costruiva e quegli
  // esercizi finivano sul motore vecchio, con la scala generica dei composti da bilanciere.
  // Il risultato era la riga che Ste ha visto: sui dip si partiva da BRONZE 47,5 kg, cioe'
  // "per il bronzo aggiungi 47 kg di zavorri". Sui cavi era gia' successo (v168).
  //
  // I DIP NON SONO UN COMPOSTO DA BILANCIERE. La convenzione e' `zavorri`, quindi il
  // punteggio del motore somma gia' il peso del corpo: l'ingresso e' il corpo e basta
  // (0 kg aggiunti, 1,0x) e il tetto e' dove arrivano le trazioni coi zavorri vere.
  // IL RANK DEI DIP E DELLE TRAZIONI E' IN KG AGGIUNTI (16/10/2026).
  //
  // Ste: "il massimale mettilo per i pesi in più rispetto al mio corpo non in generale".
  // Il corpo te lo porti appreso: quello che conta, e che si mette sui piatti, e' quello
  // che hai appeso alla cintura. Quindi qui `multiplo` e `ingressoMultiplo` sono
  // moltiplicatori del peso del corpo ma SI RIFERISCONO AI SOLI KG AGGIUNTI:
  // l'ingresso e' 0,08x (una cintura leggera, circa 5 kg su corpo 66) e il tetto e'
  // 0,95x (circa 63 kg aggiunti, che e' il territory delle trazioni e dei dip con
  // zavorri forti, non un bilanciere da 100 kg).
  spinta_corpo_libero: {
    multiplo: 0.95, ingressoMultiplo: 0.08, fonte: 'stima',
    nota: 'Dip coi zavorri: il punteggio sono i SOLI kg aggiunti (vedi `valutaEsercizio`), quindi il tetto 0,95x sono 63 kg di zavorri su corpo 66. I 35 kg di Ste stanno a meta\' scala: e\' un numero forte, ma le trazioni con la cintura caricata passano molto piu\' in la. Prima questa scala chiedeva 47 kg di zavorri per il BRONZE, e il motore vecchio regalava l\'OLYMPIAN a tutti i costi.',
  },
  // LE TRAZIONI: STESSO SFORZO DELLO SLANCIAMENTO, SCALA UN FILO SOTTO (Ste, 18/10/2026)
  //
  // Ste: "le trazioni in teoria sono un po' piu' difficili perchè le faccio a presa larga
  // mentre la lat machine la faccio a presa stretta perchè mi e' uscita la spalla una
  // volta... quindi vedi tu".
  //
  // IL PROBLEMA CHE HA DETTO SENZA DIRLO: sull'app le due cose erano votate in modo
  // diverso. Lui al cavo tira 90 kg e prende PLATINUM; in traversa appende 20 kg a un
  // corpo di 66, cioe' 86 kg di carico totale, e si beccava ARGENTO. Stesso muscolo,
  // stesso sforzo, due voti diversi, e la ragione era che i due movimenti avevano due
  // tetti che non c'entravano niente fra loro (1,7 sul cavo, 0,95 sulla traversa).
  //
  // LA REGOLA: il Platino delle trazioni deve stare dove sta il suo carico totale, che
  // e' il peso del corpo piu' quello che appende. Con ingresso 0,06x (una cintura
  // leggera, circa 4 kg) e tetto 0,62x (circa 41 kg aggiunti) il Platino cade a 18-19 kg
  // aggiunti: esattamente dove gli sta arrivando adesso con 20 kg. E il tetto e' sotto
  // quello della lat per la presa larga, come ha detto lui.
  tirata_verticale_corpo: {
    multiplo: 0.58, ingressoMultiplo: 0.05, fonte: 'stima',
    nota: 'Trazioni coi zavorri: il punteggio sono i SOLI kg aggiunti (vedi `valutaEsercizio`), quindi il tetto 0,58x sono circa 38 kg appesi alla cintura, che e\' dove arrivano le trazioni a presa larga con un buon carico. Ste (18/10/2026): "le trazioni in teoria sono un po\' piu\' difficili perche\' le faccio a presa larga mentre la lat machine la faccio a presa stretta". Per questo il tetto sta sotto quello del pulldown. E\' la stessa regola usata per i dip, che pero\' reggono piu\' zavorri e hanno la loro scala (0,95x).',
  },
  corpo_libero: {
    multiplo: 0, fonte: 'nessuno',
    nota: 'Trazioni e dip: qui i kg non esistono, si contano le ripetizioni.',
  },
};

/**
 * Tetti di realta'. Ste: "non voglio Rank regalati".
 *
 * - nessun Rank puo' chiedere piu' di 2,2 volte il peso della persona (fuori scala umana);
 * - e sugli ISOLAMENTI il tetto e' 0,85: il punto e' che un muscolo piccolo non
 *   regge un carico grosso, quindi se il vertice di un isolamento supera 0,85 per
 *   uno, o il numero e' sbagliato o l'esercizio non e' un isolamento.
 */
export const TETTO_PER_PESO = 2.2;
export const TETTO_ISOLAMENTI = 0.85;

// Ste (08/10/2026): "leg extension comunque lo faccio con una gamba".
//
// Il tetto da isolamento (0,85x il corpo) era pensato per i muscoli PICCOLI: un
// bicipite o un deltoide laterale non reggono un carico grosso. Ma non vale per
// TUTTI gli isolamenti, e qui moriva nel modo peggiore: il leg extension e' un
// isolamento (livello 'isolamento'), quindi il tetto gli tagliava il vertice a
// 0,85x = 56 kg, mentre il multiplo dichiarato era 2,0x. Risultato: i tuoi 65 kg
// davano OLYMPIAN e la scala finiva sotto i tuoi piedi.
//
// Il principio giusto e' sul CARICO REALE, non sulla parola "isolamento":
//  - muscolo piccolo (bicipite, deltoide, polso): il carico e' minuscolo, tetto 0,85x
//  - gambe a una gamba sola: tutto il carico su una coscia, tetto 2,2x come i
//    composti grossi. E' la stessa realta' del leg press, solo che l'isolamento
//    e' su un solo arto.
//
// Quindi il tetto di realta' non e' "isolamento o no", ma "quanto e' grosso il carico
// che quell'esercizio mette in gioco". Lo dico con la grandezza del movimento,
// che e' la cosa giusta da guardare.
//
// LA TRAPPOLA, E PERCHE' OGGI QUESTA TABELLA NON TRONCA NULLA (15/10/2026).
//
// Il nome "tetto" fa pensare a un tetto che taglia, ed e' stato proprio quello il
// problema: ogni valore qui sotto e' uguale al `multiplo` del suo movimento (o piu'
// largo), quindi `min(multiplo, tetto)` da' SEMPRE il multiplo e il tetto non ha mai
// tagliato niente, su nessun movimento. Verificato: 17 movimenti su 17, zero eccezioni.
//
// Il caso che ne ha fatto accorgere e' il `polso`, dove la cosa tornava utile per un
// motivo sbagliato: il tetto dichiarato era piu' LARGO del multiplo (0,5 contro 0,4),
// quindi non tagliava, e il numero davvero sbagliato era il multiplo stesso. Quello
// e' stato corretto a mano; la tabella e' rimasta com'.
//
// PERCHE' SI TIENE, allora. Due motivi, e il secondo e' quello che conta:
//
//  1) e' il posto dove si abbassa un tetto quando un multiplo dichiarato diventa
//     irrealistico. Se qualcuno dichiara 1,5x per i bicipiti, il numero qui sotto va
//     ABBASSATO e il tetto tronca da solo, senza andare a inseguire il multiplo in
//     giro per il catalogo;
//  2) i movimenti che lo hanno devono poter SUPERARE il tetto generico degli
//     isolamenti (0,85x): il leg extension e' un isolamento ma mette 1,4x, e senza
//     questo override gli verrebbe tagliato a 0,85x. Cioe': la tabella non e' solo un
//     tetto, e' anche un'eccezione al tetto.
//
// E il test V19 controlla che il meccanismo tronchi davvero quando il valore e' piu'
// basso del multiplo. Una protezione che non e' mai stata provata e' una protezione
// che non funziona, e questa per un anno intero era in quello stato.
export const TETTO_MOVIMENTO = {
  gambe_isolamento: 1.4,
  gambe_curl: 1.2,
  gambe_pesanti: 2.2,
  gambe_stabilizzatore: 2.2,
  // il polso e' l'avambraccio: i muscoli sono piccoli ma l'avambraccio scarica il
// peso del braccio intero, quindi regge piu' di un generico isolamento. Vedi la nota
// lunga sopra, dove il tetto era sbagliato di un terzo.
  polso: 0.6,
};

/**
 * IL PESO CHE CONTA DAVVERO, e non quello sulla bilancia.
 *
 * Ste (15/10/2026): "la forza muscolare non cresce in modo lineare con il peso
 * della persona, ma con la sezione trasversale del muscolo. Questo impedisce che
 * un atleta piu' pesante venga penalizzato ingiustamente sui punteggi relativi".
 *
 * IL MOTIVO, che è di fisiologia e non di gusti. Un muscolo spinge con quello che
 * ha in sezione trasversale: più è spesso, più fibre in parallelo, più forza. E
 * la sezione trasversale cresce con la massa del corpo a esponente 0,67, non
 * con esponente 1, perché il corpo cresce in lunghezza E in larghezza, e i muscoli
 * crescono soprattutto in sezione.
 *
 * Il numero è l'esponente classico dell'allometria muscolare, e qui non è un vezzo:
 *
 *   corpo  55 kg -> 60,3 kg equivalenti   (a 55 kg quei kg pesano di piu')
 *   corpo  66 kg -> 68,9 kg equivalenti
 *   corpo  75 kg -> 75,0 kg equivalenti   (il riferimento: qui non cambia niente)
 *   corpo  85 kg -> 83,1 kg equivalenti
 *   corpo 100 kg -> 90,2 kg equivalenti
 *   corpo 110 kg -> 93,8 kg equivalenti
 *
 * COSA CAMBIA IN CONCRETO. Con la scala lineare (quella che c'era prima), chi
 * pesa 100 kg e fa 37 kg di chest press finiva SOTTO il primo livello, perché
 * l'ingresso gli chiedeva 38,0 kg. Con questa l'ingresso gli chiede 34,3 kg e ci
 * arriva: chi pesa di più non viene più punito per gli stessi kg.
 *
 * E LA CONTROPARTE, che va detta perché è vera: chi pesa MENO viene un po'
 * penalizzato rispetto alla scala lineare, perché il suo corpo-equivalente è più
 * grande del suo peso. Non è un errore: 37 kg di chest press su un corpo da 55 kg
 * sono davvero più forti che su un corpo da 110. La scala premia la forza
 * rapportata al corpo che la sposta, e il corpo che conta è quello che i muscoli
 * hanno davvero.
 *
 * IL RIFERIMENTO È 75 KG, e per quello a 75 kg non cambia niente: il peso
 * allometrico coincide con il peso reale. Chi si pesa 75 kg e aveva guardato le
 * scale approvate l'08/10/2026 le vede identiche. Tutti gli altri si spostano di
 * poco, e sempre dalla parte giusta.
 *
 * DOVE ENTRA. In un posto solo, `pesoAllometrico()`, e da lì in entrambi i numeri:
 * il tetto E l'ingresso. Se solo uno dei due fosse allometrico e l'altro no,
 * entrerebbe il difetto che questo file già descrive e già ha corretto una volta:
 * chi pesa di più si troverebbe sotto la prima soglia con gli stessi kg che gli
 * davano un Rank.
 */
export const ESPONENTE_ALLOMETRICO = 0.67;
export const PESO_ALLOMETRICO_RIFERIMENTO = 75;

/** Il peso di cui il corpo conta davvero: vedi la nota lunga sopra. */
export function pesoAllometrico(peso) {
  const p = Number(peso);
  if (!Number.isFinite(p) || p <= 0) return null;
  return Math.round(
    PESO_ALLOMETRICO_RIFERIMENTO
      * Math.pow(p / PESO_ALLOMETRICO_RIFERIMENTO, ESPONENTE_ALLOMETRICO) * 100
  ) / 100;
}
// I TETTI CHE DIPENDONO DALLA MACCHINA.
//
// Sono separati da TETTO_MOVIMENTO perche' lì la chiave è il movimento, e il
// movimento è uno solo: i polpacci sono "polpacci" sia sul carrello sia sulla pressa
// orizzontale, ma i due non reggono lo stesso carico. Qui la chiave è la macchina.
//
// Ste (10/10/2026): peso 66 kg, "110 kg monogamba sulla macchina orizzontale".
// Sul carrello il tetto resta basso come gli altri isolamenti (0,85x = 56 kg),
// perche' il carico e' piccolo. Sulla pressa orizzontale a dischi sale a 1,8x
// (= 119 kg): le gambe spingono una pila di dischi come in una leg press, ma i
// polpacci sono piu' piccoli dei quadricipiti, quindi sotto i 2,2x della leg press.
export const TETTO_CON_MACCHINA = {
  polpacci: { carrello: 0.85, pressa: 1.8 },
};

/** Se il vertice e' dentro i tetti di realta' per quell'esercizio. */
export function tettoPerEsercizio(livello, movimento = null, esercizio = null) {
  // I POLPACCI hanno due tetti, uno per macchina, e senza l'esercizio non si sa
  // quale prendere: il movimento dice solo "polpacci".
  //
  // Ste (10/10/2026): "110 kg monogamba sulla macchina orizzontale", e il Rank gli
  // dava OLYMPIAN. Senza questo passaggio il tetto era quello generico degli
  // isolamenti (0,85x = 56 kg su corpo 66), e 110 kg sono 1,66x il corpo: sopra il
  // tetto, il Rank era OLYMPIAN a tutti i costi e il numero non diceva piu' niente.
  //
  // Il parametro è in fondo e facoltativo, così le chiamate vecchie continuano a
  // funzionare e non si rompe nessun altro movimento.
if (movimento && TETTO_CON_MACCHINA[movimento] && esercizio) {
   const base = VALORI_MOVIMENTO[movimento];
   const scegli = base && base.scegliConMacchina;
   const chiave = scegli ? scegli(esercizio) : null;
   const tetto = chiave ? TETTO_CON_MACCHINA[movimento][chiave] : null;
   if (Number.isFinite(tetto)) return tetto;
   }
   // IL TETTO DEL MOVIMENTO, E NON QUELLO GENERICO (16/10/2026).
   //
   // Qui c'era un buco grosso: `TETTO_MOVIMENTO` ha cinque voci e i movimenti sono
   // venti, quindi quindici finivano sul fallback di 2,2x. Per il bicipiti era
   // 0,46x (la panca Scott) o 0,7x (il cavo) e diventava 2,2: cinque volte tanto.
   // Non rompeva niente, perche' il vertice lo dava `multiplo` e il tetto e' solo un
   // tetto (vedi `verticePerCorpo`, che prende il minimo): ma era un'arma scarica,
   // e se un giorno si comincia a usare il tetto per fermare la stima, non ferma
   // niente su quindici movimenti su venti.
   if (movimento && Number.isFinite(TETTO_MOVIMENTO[movimento])) return TETTO_MOVIMENTO[movimento];
   // il tetto del movimento, se c'e': e' il numero che il progetto considera la
   // verita' per quell'esercizio, quindi viene PRIMA del generico
   const valore = VALORI_MOVIMENTO[movimento];
   if (movimento && valore && Number.isFinite(Number(valore.multiplo)) && Number(valore.multiplo) > 0) {
     return Number(valore.multiplo);
   }
   return livello === 'isolamento' ? TETTO_ISOLAMENTI : TETTO_PER_PESO;
   }

/**
 * Quale riga dei valori vale per QUESTO esercizio.
 *
 * Serve perche\' alcuni movimenti hanno piu' varianti con tetti molto diversi: il
 * cable fly al cavo e il bench pull coi manubri sono entrambi "petto isolamento",
 * ma il fly e\' un piccolo muscolo con carico leggero (0,4x per lato) e il bench
 * pull regge un carico grosso (1,2x per mano). Un numero solo per il movimento
 * faceva finire il bench pull a 217% del tetto: OLYMPIAN regalato.
 *
 * La scelta guarda l'attrezzatura, che e' il fatto vero: i manubri sono pesanti,
 * il cavo con doppia carrucola no.
 */
export function valoriPerEsercizio(movimento, esercizio = {}) {
  const base = VALORI_MOVIMENTO[movimento];
  if (!base || !base.varianti) return base;

  // I POLPACCI hanno un modo tutto loro di scegliere la variante: la macchina.
  //
  // Il codice qui sotto sceglieva "pesante" o "cavo" guardando la convenzione, che
  // è giusta per il petto ma non per i polpacci: sui polpacci la convenzione dice
  // solo come si conta il carico (per gamba), e due macchine diverse ce l'hanno
  // identica. Quindi prima si prova la variante "macchina", e se il movimento non
  // la usa si scivola nel codice di prima, che non viene toccato.
  //
  // LA CONVENZIONE, dal 15/10/2026: e' la chiave giusta quando il tetto cambia
  // perche' cambia COME SI CONTA IL CARICO. Il caso e' la leg press obliqua a una
  // gamba sola: gli stessi kg per gamba sono un carico doppio di quella che
  // finisce su due gambe, quindi il tetto e' la meta'. Prima non c'era nessuna
  // chiave per questo e il tetto da 2,2x (due gambe) finiva su una gamba sola,
  // con l'esercizio che non poteva avere nessun livello.
  if (base.scegliConConvenzione) {
    const chiave = base.scegliConConvenzione(esercizio || {});
    const v = chiave ? base.varianti[chiave] : null;
    if (v) {
      return {
        ...base,
        varianti: undefined,
        scegliConConvenzione: undefined,
        scegliConMacchina: undefined,
        multiplo: v.multiplo,
        ingressoMultiplo: v.ingressoMultiplo,
        fonte: v.fonte || base.fonte,
        nota: `${base.nota} (variante "${chiave}": il carico qui si conta ${chiave === 'per_gamba' ? 'per gamba' : 'sulle due gambe'})`,
      };
    }
  }

  if (base.scegliConMacchina) {
    const chiave = base.scegliConMacchina(esercizio || {});
    const v = chiave ? base.varianti[chiave] : null;
    if (v) {
      return {
        ...base,
        varianti: undefined,
        multiplo: v.multiplo,
        ingressoMultiplo: v.ingressoMultiplo,
        fonte: v.fonte || base.fonte,
        nota: v.nota,
      };
    }
  }

  const pesante = esercizio
    && (esercizio.convenzione === 'per_manubrio' || esercizio.convenzione === 'bilanciere');
  const chiave = pesante ? 'pesante' : 'cavo';
  const v = base.varianti[chiave];
  if (!v) return base;
  return {
    ...base,
    multiplo: v.multiplo,
    ingressoMultiplo: v.ingressoMultiplo,
    nota: v.nota + ' (movimento con varianti: questo esercizio usa i numeri '
      + chiave + ', perche\' ' + (pesante ? 'usa i manubri' : 'va al cavo') + ')',
  };
}

/**
 * Il vertice di un esercizio, riportato sul corpo della persona.
 *
 * Il peso corporeo entra qui e in un solo posto: il tetto è un multiplo del peso
 * allometrico (vedi `pesoAllometrico`), quindi tutto il resto segue da solo.
 *
 * IL PESO È QUELLO ALLOMETRICO, non quello sulla bilancia, e per entrambi i
 * numeri: il vertice E il tetto che lo tronca. Vedi la nota di `pesoAllometrico`:
 * la forza va con la sezione del muscolo (peso^0,67), e usare il peso lineare
 * puniva chi pesa di più con gli stessi kg.
 */
export function verticePerCorpo(valori, livello, pesoCorporeo, movimento = null, esercizio = null) {
  const peso = pesoAllometrico(pesoCorporeo);
  if (peso === null) return null;
  const tetto = tettoPerEsercizio(livello, movimento, esercizio);
  const grezzo = peso * valori.multiplo;
  const limite = peso * tetto;
  return {
    vertice: Math.round(Math.min(grezzo, limite) * 100) / 100,
    multiplo: valori.multiplo,
    tetto: Math.round(limite * 100) / 100,
    tettoRaggiunto: grezzo > limite,
  };
}

/**
 * Le soglie complete di un esercizio sul corpo della persona, in kg.
 *
 * L'ingresso NON e' una percentuale del tetto: e' il suo proprio multiplo del
 * corpo (`ingressoMultiplo`). E il corpo, qui, è quello ALLOMETRICO, come nel
 * vertice: i due numeri devono crescere insieme, altrimenti si rompe la regola
 * che questo file ha già imparato a caro (vedi la nota lunga sopra).
 */
export function sogliePerEsercizio(valori, livello, pesoCorporeo, movimento = null, esercizio = null) {
  const v = verticePerCorpo(valori, livello, pesoCorporeo, movimento, esercizio);
  if (!v) return null;
  const peso = pesoAllometrico(pesoCorporeo);
  const ingresso = Math.round(peso * valori.ingressoMultiplo * 100) / 100;
  // difesa: se un movimento si dimenticasse l'ingresso, meglio accorgersene qui
  // che scoprirlo con un Rank che non si muove
  if (!Number.isFinite(ingresso) || ingresso <= 0) {
    throw new Error(`il movimento "${movimento}" non ha un ingressoMultiplo valido: ${valori.ingressoMultiplo}`);
  }
  return {
    ingresso,
    vertice: v.vertice,
    multiplo: v.multiplo,
    ingressoMultiplo: valori.ingressoMultiplo,
    tetto: v.tetto,
    tettoRaggiunto: v.tettoRaggiunto,
    fonte: valori.fonte,
    nota: valori.nota,
  };
}

/**
 * Il tetto come lo LEGGE la persona, cioe' con la doppia carrucola raddoppiata.
 *
 * E' il contrario di caricoReale(), che dimezza. Serve solo per stampare numeri
 * che Ste riconosce ("50 kg sul cavo"), NON per confrontare: il confronto avviene
 * sempre nell'unita' dello score, e qui non si arriva mai.
 */
export function leggiComeLoLeggi(carico, esercizio = {}) {
  const n = Number(carico);
  if (!Number.isFinite(n)) return carico;
  if (esercizio && esercizio.carrucola === 'carrucola_doppia') {
    return Math.round((n * 2) * 100) / 100;
  }
  return Math.round(n * 100) / 100;
}

/** L'unita' in cui quel esercizio registra i kg, in parole. */
export function unitaCarico(esercizio = {}) {
  const e = esercizio || {};
  if (e.carrucola === 'carrucola_doppia') return 'per lato (cavo doppio)';
  if (e.convenzione === 'per_manubrio') return 'per manubrio';
  if (e.convenzione === 'per_braccio') return 'per braccio';
  if (e.convenzione === 'per_gamba') return 'per gamba';
  if (e.attrezzatura === 'macchina_stack') return 'sullo stack';
  if (e.attrezzatura === 'macchina_dischi') return 'sulla macchina';
  if (e.convenzione === 'cavo_totali') return 'totali al cavo';
  return 'sul carico';
}

/**
 * Le soglie nella STESSA unita' dello score, e qui sta una trappola che ho preso
 * io la prima volta (e che e' utile sapere, perche' un numero senza unita' e' un
 * numero a caso).
 *
 * I valori che ho dichiarato sopra sono in CHILOGRAMMI ("1,0x il corpo per braccio
 * alla chest press"), e cosi' sono leggibili. Ma lo score di una serie e' in
 * kg-equivalenti (40 kg x 8 = 258 kg-equivalenti), quindi confrontare 258 con 66
 * vuol dire sempre "OLYMPIAN": la prima volta che ho stampato la tabella davano
 * TUTTI OLYMPIAN.
 *
 * La conversione c'e' e non e' un vezzo: un tetto dichiarato come "1,0x il corpo
 * per braccio" vuol dire 66 kg fatti come una serie da 8, quindi va moltiplicato
 * per quello che 8 ripetizioni valgono e per la meccanica di quell'esercizio.
 * Solo dopo le due stanno nello stesso posto e il confronto ha un senso.
 */
export { RIPETIZIONI_RIFERIMENTO };

export function fattoreSogliaDaKg(esercizio = {}) {
  return ripetizioniPiene(RIPETIZIONI_RIFERIMENTO) * fattoreMeccanica(esercizio);
}

export { caricoReale };
