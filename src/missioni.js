// missioni.js -- Daily, Weekly e Secret Missions.
//
// Tre regole che valgono sempre:
//  1) le WEEKLY e le SECRET sono UGUALI PER TUTTI. Non sono casuali per utente:
//     nascono solo dall'identificatore della settimana (es. 2026-W40), quindi
//     chiunque apra l'app nella stessa settimana vede esattamente lo stesso set.
//  2) la DAILY invece e' diversa per ciascuno (dipende da utente + giorno) e si
//     puo' completare una volta sola al giorno.
//  3) ogni missione completata resta registrata: niente doppi punti.
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

/** Una Secret vale di piu' della stessa missione come Weekly. */
export const MOLTIPLICATORE_SECRET = 1.5;

// ---------------------------------------------------------------------------
// Il pool delle missioni. Tutte qui dentro: aggiungerne una e' una riga.
// ---------------------------------------------------------------------------

const M = (id, titolo, testo, difficolta, extra = {}) => ({
  id, titolo, testo, difficolta, segreta: false, ...extra,
});

export const POOL = [
  M('la-domanda-maledetta', 'LA DOMANDA MALEDETTA',
    'Durante una pausa chiedi con serietà al tuo amico: "Secondo te il pump è reale o siamo noi a crederci?" Non ridere e non spiegare.', 'easy'),
  M('annuncio-ufficiale', 'ANNUNCIO UFFICIALE',
    'Dichiara ad alta voce, prima di iniziare, che oggi è il giorno in cui diventi leggenda. Poi allenati normalmente.', 'easy'),
  M('il-boss-finale', 'IL BOSS FINALE',
    'Prima di iniziare una serie guarda il tuo amico e digli con assoluta serietà: "Finalmente ci incontriamo." Poi fai la serie come se non fosse niente.', 'easy'),
  M('titolo-assurdo', 'IL TITOLO',
    'Dai a un tuo amico un titolo assurdo, tipo "Supremo Custode della Lat Machine". Per i 5 minuti successivi devi chiamarlo solo così.', 'unhinged'),
  M('il-profeta', 'IL PROFETA',
    'Prima che il tuo amico inizi una serie guardalo bene e digli: "Lo sento. Oggi succederà qualcosa." Non spiegare cosa.', 'unhinged'),
  M('il-telecronista', 'IL TELECRONISTA',
    'Commenta una serie del tuo amico come se fosse una finale mondiale. "PARTE!" "PRIMA RIPETIZIONE!" "INCREDIBILE CONTROLLO!"', 'unhinged'),
  M('conferenza-stampa', 'CONFERENZA STAMPA',
    'Dopo una tua serie fai una conferenza stampa di almeno 20 secondi spiegando ai tuoi amici perché quella serie potrebbe cambiare la tua carriera.', 'unhinged'),
  M('il-documentario', 'IL DOCUMENTARIO',
    'Per 30 secondi racconta la storia di un tuo amico come se fosse il protagonista di un documentario. "Era il 2026. Marco non sapeva ancora che quel giorno avrebbe cambiato tutto."', 'insane'),
  M('il-giudice-olimpico', 'IL GIUDICE OLIMPICO',
    'Per un minuto fai il giudice olimpico e assegna voti completamente arbitrari alle serie dei tuoi amici. "8.7. Buona esecuzione. Poco dramma."', 'insane'),
  M('il-ritorno-missione', 'IL RITORNO',
    'Esci per trenta secondi dalla zona in cui ti alleni. Rientra e comportati come se fossi appena tornato da una missione militare. "Non posso raccontarvi cosa è successo là fuori."', 'insane'),
  M('bro-ha-cambiato-vita', 'IL BRO HA CAMBIATO VITA',
    'Dopo una serie normalissima annuncia ai tuoi amici: "Ragazzi, da oggi cambio completamente approccio." Non spiegare assolutamente nulla.', 'easy'),
  M('applauso-inutile', 'APPLAUSO INUTILE',
    'Dopo che un amico completa una serie normalissima, applaudilo lentamente per 5 secondi come se avesse appena stabilito un record mondiale.', 'easy'),
  M('personal-trainer-inutile', 'IL PERSONAL TRAINER',
    'Durante una pausa dai al tuo amico un consiglio palesemente inutile ma con professionalità assoluta. "Devi concentrarti di più sulla forza." Poi vattene senza spiegare.', 'easy'),
  M('aura-check', 'AURA CHECK',
    'Chiedi a tre amici, separatamente: "Da 1 a 100, quanta Aura ho oggi?" Non puoi discutere i risultati e non puoi correggerli.', 'unhinged'),
  M('il-rituale', 'IL RITUALE',
    'Prima di una serie fai un rituale completamente inventato di 10 secondi, come se fosse indispensabile per aumentare la tua forza.', 'unhinged'),
  M('il-rispetto', 'IL RISPETTO',
    'Quando un tuo amico completa una serie, fai un piccolo inchino davanti a lui senza dire nulla e torna ad allenarti.', 'easy'),
  M('la-frase-maledetta', 'LA FRASE MALEDETTA',
    'Durante una conversazione normale devi riuscire a dire, senza riderti: "È esattamente quello che direbbe una persona con 73 Aura."', 'unhinged'),
  M('intervista-post-gara', 'INTERVISTA POST-GARA',
    'Dopo una serie fai finta che i tuoi amici siano giornalisti e rispondi a una domanda inventata sulla tua performance. Resti completamente serio.', 'insane'),
  M('il-campione', 'IL CAMPIONE',
    'Dopo la serie di un amico dagli una medaglia immaginaria e digli "Campione." Poi torna normalmente al tuo allenamento.', 'easy'),
  M('il-pensiero', 'IL PENSIERO',
    'Prima della serie pensa, con serietà, a una persona che si arrende al primo set. Poi inizia.', 'unhinged'),
  M('sguardo-misterioso', 'IL GUARDO MISTERIOSO',
    'Trenta secondi di sguardo intenso e serio verso un amico, senza dire una parola. Solo sguardo.', 'unhinged'),
  M('la-dignita', 'LA DIGNITÀ',
    'Tre serie consecutive senza ridere. Se ridi, ricomincia dal primo esercizio del giorno. Al massimo una volta.', 'unhinged'),
  M('il-piano', 'IL PIANO',
    'Spiega il tuo piano per i prossimi dieci anni come se fosse una partita a scacchi. Con le mosse. Seriamente.', 'unhinged'),
  M('il-nome', 'IL RINOMINATO',
    'Cambia il nome al tuo amico per la durata di una serie, con un nome assurdo. Deve rispondere con quello per tutta la serie.', 'easy'),
  M('la-musica', 'LA MUSICA',
    'Canticchia a bassa voce, senza disturbare nessuno, fino alla fine della serie. Solo la tua serie.', 'easy'),
  M('il-contratto', 'IL CONTRATTO',
    'Proponi un patto assurdo al tuo amico: se arriva a 8 ripetizioni, domani deve chiamarti "maestro". Se sbaglia, vale per tutta la settimana.', 'unhinged'),
  M('il-filosofo', 'IL FILOSOFO',
    'Cita un proverbio sulla forza che non esiste, inventato da te, e spiegolo come se fosse antichissimo.', 'unhinged'),
  M('il-guardiano', 'IL GUARDIANO',
    'Metti la mano sulla pedana o sul bilanciere e poi dici: "Io proteggo questo esercizio. Nessuno lo tocca."', 'easy'),
  M('il-silenzio', 'IL SILENZIO',
    "Una serie intera in silenzio assoluto. Solo l'ultima ripetizione rompe il silenzio, e con una sola parola.", 'easy'),
  M('il-punto', 'IL PUNTO',
    'Segna il punto come se fosse una partita di tennis: fallo con la mano e annuncialo. "PUNTO PER ME."', 'easy'),
  M('la-fisica', 'LA FISICA',
    'Spiega la tua serie come se fosse un fenomeno fisico, con le formule. Tuo amico deve sembrare molto impressionato.', 'insane'),
  M('il-voto-assurdo', 'IL VOTO ASSURDO',
    "Assegna alla serie del tuo amico un voto completamente arbitrario, difendilo con convinzione e non accettare discussioni.", 'unhinged'),
  M('la-presentazione', 'LA PRESENTAZIONE',
    'Presenta il tuo amico agli altri: "Questo e\' il mio migliore allenatore." Lui deve accettare il titolo per tutta la seduta.', 'easy'),
  M('il-timer-dramma', 'IL CRONOMETRO DRAMMATICO',
    'Conta ad alta voce le ripetizioni del tuo amico, con il ritmo di unboxing in diretta.', 'unhinged'),
  M('la-vittoria', 'LA VITTORIA',
    'Festeggia in silenzio la tua ultima serie come se fosse stata una finale di mondiale. Silenzio totale.', 'easy'),
  M('il-consiglio-di-lunedio', 'IL CONSIGLIO DI LUNEDI',
    'Prima di iniziare, dillo con voce seria: "Non allenarti oggi. Allenati domani. Oggi stai solo guardando." Poi allenati comunque.', 'unhinged'),
  M('la-domanda-proibita', 'LA DOMANDA PROIBITA',
    "Fai all'amico una sola domanda imbarazzante ma innocua, guarda l'orologio e non rispondere. Lascialo nel dubbio.", 'legendary'),
  M('il-film', 'IL FILM',
    'Racconta in venti secondi come sarebbe un film sulla tua palestra: titolo, trama, finale. A tutti gli amici.', 'unhinged'),
  M('la-porta-sacra', 'LA PORTA SACRA',
    "Tocca la pedana come fosse una porta sacra, poi entra nell'esercizio con lo stesso rispetto di un pellegrino.", 'easy'),
  M('la-rovescia', 'IL CONTO ALLA ROVESCIA',
    "Conta alla rovescia da dieci per ogni ripetizione del tuo amico, e sullo zero applaudi.", 'unhinged'),
  M('il-carico', 'A CARICO',
    "Prima dell'ultima serie annuncia \"A CARICO!\" come se fosse il titolo di un film, e poi spingi come nel film.", 'easy'),
  M('il-segreto', 'IL SEGRETO',
    "Dici all'amico: \"Ho un segreto. Te lo dico solo se arrivi a 8 ripetizioni.\" Se le arriva, raccontagli che non hai davvero nessun segreto.", 'unhinged'),
  M('l-annuncio-duro', "L'ANNUNCIO DURO",
    "Presentati come \"l'allenatore piu' severo del mondo\". Per tre serie mantieni il personaggio.", 'easy'),
  M('la-preghiera', 'LA PREGHIERA',
    "Prima della serie dell'amico prega per le sue ripetizioni, a voce bassa, con serietà totale. Lui deve continuare.", 'unhinged'),
  M('il-confronto-storico', 'IL CONFRONTO STORICO',
    'Davanti agli amici ricorda il 2019 e spiega che allora eri debolissimo. Poi dimostra il contrario.', 'unhinged'),
  M('la-fotografia', 'LA FOTOGRAFIA',
    'Dopo una serie fai "FREEZE" e resta cinque secondi in posa di vittoria. Nessuno puo\' ridere.', 'easy'),
  M('il-trombone', 'IL TROMBONE',
    'Dieci secondi di trombone SENZA suono, a bocca chiusa, muovendoti. Solo le labbra.', 'easy'),
  M('la-mafia', 'LA MAFIA',
    "Durante tre serie di fila comandi tu: decidi il ritmo, gli amici obbediscono. Poi ti scusi e spieghi che era una fiction.", 'unhinged'),
  M('il-muro', 'IL MURO',
    'Una serie intera senza parlare. Solo alla fine spiega il silenzio, con calma.', 'unhinged'),
  M('il-doppio-ruolo', 'IL DOPPIO RUOLO',
    "In una sola serie fai contemporaneamente l'allenatore e l'atleta: dai ordini a te stesso con due voci diverse.", 'insane'),
  M('la-direttrice', 'LA DIRETTRICE',
    "Dirigi l'esercizio del tuo amico come un coro, indicando l'attacco e il rallentato. Piano con la voce.", 'unhinged'),
  M('il-mistero', 'IL MISTERO',
    'Spiega che hai scoperto una tecnica segreta e insegnala in tre parole. Se funziona davvero, racconta il mistero. Altrimenti no.', 'legendary'),
  M('il-padre', 'IL PADRE',
    'Incoraggia il tuo amico con le frasi piu\' assurde possibili di un padre al debutto in palestra.', 'easy'),
  M('il-dottore', 'IL MEDICO',
    "Conferma con serietà che con 5 kg in piu' starai meglio. Non dare spiegazioni, non ammettere dubbi.", 'unhinged'),
  M('il-mare-verso', 'IL MARE VERSO',
    'Dopo la prima serie porta le mani alla fronte come se guardassi il mare, e annuncia: "Stiamo andando benissimo."', 'easy'),
  M('la-lotta', 'LA LOTTA INTERNA',
    'Dichiara ad alta voce, prima della serie, chi ti sta aspettando al di la\'. Poi vinci.', 'legendary'),

  // ---- segrete: compaiono coperte e valgono di piu' ----
  M('il-patto-segreto', 'IL PATTO',
    'Firma un patto con il tuo amico, a voce, davanti a un altro amico che fa da testimone. Il patto riguarda solo la prossima serie.', 'insane', { segreta: true }),
  M('la-palestra-pirata', 'LA PALESTRA PIRATA',
    "Per un'ora di gioco sei il capitano di una palestra piratesca: comandi, battezio le macchine e chiedi il tributeo (una carezza alla macchina, non alle persone).", 'legendary', { segreta: true }),
  M('il-giornale', 'IL GIORNALE',
    'Fai le pagine di testa di un giornale sportivo con le notizie della settimana, leggendole ad alta voce a tutti.', 'insane', { segreta: true }),
  M('la-grande-palestra', 'LA GRANDE PALESTRA',
    'Per tutta la seduta descrivi la palestra come se fosse un tempio, e i pesi come se fossero statue. Nessuno ride.', 'legendary', { segreta: true }),
  M('il-messaggio-finale', 'IL MESSAGGIO FINALE',
    "Consegna un messaggio importante a un amico che non c'e': una frase sola, drammatica, da ricordare per tutta la settimana.", 'insane', { segreta: true }),
  M('il-grande-giro', 'IL GRANDE GIRO',
    'Fai un giro completo della sala pesi passando da ogni stazione, anche quelle libere, come se fosse una visita ufficiale.', 'legendary', { segreta: true }),
];

export const POOL_PER_ID = new Map(POOL.map((m) => [m.id, m]));

export function missionePerId(id) { return POOL_PER_ID.get(id) || null; }

/** La ricompensa di una missione, sapendo se e' segreta. */
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

/** Numeri pseudo-casuali ma SEMPRE uguali, se il seme e' lo stesso. */
export function generatoreDa(seme) {
  let stato = (hashTesto(seme) || 1) >>> 0;
  return function prossimo() {
    stato = (Math.imul(stato, 1664525) + 1013904223) >>> 0;
    return stato / 4294967296;
  };
}

function finestra(seme, pool, quanti, passo = 1) {
  if (!pool.length || quanti <= 0) return [];
  const rnd = generatoreDa(seme);
  const offset = Math.floor(rnd() * pool.length);
  const out = [];
  for (let i = 0; i < pool.length && out.length < quanti; i++) {
    const idx = (((offset + i * passo) % pool.length) + pool.length) % pool.length;
    const m = pool[idx];
    if (m && !out.some((x) => x.id === m.id)) out.push(m);
  }
  return out;
}

/**
 * Il set della settimana: UGUALE PER TUTTI, perche' dipende solo dalla
 * settimana e dal pool, mai dall'utente.
 */
export function setSettimanale(settimana) {
  const segrete = POOL.filter((m) => m.segreta);
  const normali = POOL.filter((m) => !m.segreta);
  const weekly = finestra(`weekly:${settimana}`, normali, NUMERO_WEEKLY, 3);
  const secret = finestra(`secret:${settimana}`, segrete, NUMERO_SECRET, 1);
  return {
    settimana,
    weekly,
    secret,
    numero: weekly.length + secret.length,
  };
}

/** La Daily di oggi per un utente: diversa per ciascuno, una volta al giorno. */
export function dailyDi(accountId, dataISO) {
  const pool = POOL.filter((m) => !m.segreta);
  const scelte = finestra(`daily:${accountId}:${dataISO}`, pool, 1, 1);
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
 * completamenti = le righe gia' salvate nella tabella "missioni".
 */
export function quadroMissioni({ accountId, dataISO, settimana, completamenti = [] }) {
  const set = setSettimanale(settimana);
  const daily = dailyDi(accountId, dataISO);
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
 * Una missione si puo' completare adesso?
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

/** Le missioni completate, dalla piu' recente: e' lo storico che vede Ste. */
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