// glossario-app.js -- tutte le parole che l'app usa, spiegate in una riga.
//
// Ste (10/10/2026): "spiega cosa vuol dire ripetizione isolamento ecc..".
//
// Il problema non è che le parole non ci sono: è che sono sparse in schermate diverse
// e nessuna spiega il PROPRIO significato. "Isolamento" e "composto" compaiono nei
// nomi dei Rank e nella difficoltà, "ripetizioni" è la parola sotto quasi ogni
// campo, "LP" e "Aura" compaiono senza essere mai spiegate.
//
// Qui sono tutte raccolte, ognuna con una riga che dice che cosa è e perché conta.
// È roba che si legge una volta e poi non si rilegge più, quindi sta in un posto
// solo e non si infila nelle schermate: cosicnonrubba il posto dove allenai.

/** Il glossario: titolo, voci, e un testo per capire come leggerlo. */
export const GLOSSARIO = [
  {
    gruppo: 'I numeri che scrivi',
    voci: [
      {
        termine: 'Ripetizioni',
        cosa: 'Quante volte fai il movimento in una serie.',
        perche: 'È il numero insieme al peso che dice quanto hai fatto. Sulle trazioni '
          + 'con i zavorri il numero che conta è il peso, perché 5 ripetizioni con 20 kg '
          + 'non sono 5 ripetizioni con 10 kg.',
      },
      {
        termine: 'Serie',
        cosa: 'Una volta sola del movimento: un set di ripetizioni, poi ci fermi.',
        perche: '"3 serie da 10" vuol dire tre volte il movimento, con una pausa '
          + 'nel mezzo. È diverso da "30 ripetizioni": stesse ripetizioni, ma la fatica '
          + 'che ti fa non è la stessa.',
      },
      {
        termine: 'Carico',
        cosa: 'I kg che metti. Sul bilanciere sono i dischi, sui manubri sono '
          + 'il numero scritto sul manubrio, sul cavo è quello che segni sul bilanciere.',
        perche: 'Sembra la stessa parola ma non lo è: sui manubri 20 per manubrio sono '
          + '40 in totale, e se l\'app non lo sa il Rank è metà.',
      },
      {
        termine: 'Zavorri',
        cosa: 'Il peso che metti SUL tuo corpo: la catena o il panotto alle '
          + 'trazioni, la fascia ai dip.',
        perche: 'Sulle trazioni stai spostando il tuo corpo più i zavorri. 20 kg di '
          + 'zavorri con 80 kg addosso sono 100 kg, non 20.',
      },
      {
        termine: 'Kg di assistenza',
        cosa: 'Il peso che la macchina ti REGGE, perché non ti regge abbastanza.',
        perche: 'Qui il conto va al contrario: più assistenza è, MENO fatica fai. '
          + 'È l\'opposto esatto dei zavorri, e su questo l\'app ti mette sotto fascia.',
      },
      {
        termine: 'Spotter',
        cosa: 'Ti aiuta a tirare gli ultimi kg di una serie già finita.',
        perche: 'L\'app non lo conta come record: quelle ripetizioni le hai fatte a '
          + 'metà. Ti restano segnate con la spunta, ma il Rank le ignora apposta.',
      },
      {
        termine: 'Dropset',
        cosa: 'Dopo che hai finito la serie, continui con tre serie a cedimento, '
          + 'cioè lasciandoti scendere lentamente.',
        perche: 'Non è una serie normale: conta in un\'altra scala. Anche per queste '
          + 'l\'app non fa record.',
      },
      {
        termine: 'Stacco libero',
        cosa: 'È una serie che hai scritto da solo, senza guardare il bilanciere.',
        perche: 'Vale meno di una serie guardata, ma meglio di niente. È più facile '
          + 'che il record, quindi attenzione: è una scelta, non un trucco.',
      },
      {
        termine: 'Fallimento a cedimento',
        cosa: 'Risolvi in positivo la parte difficile: il peso che esce è più leggero '
          + 'di quello che entra.',
        perche: 'È la fase più difficile di tutti gli esercizi, e con l\'app puoi '
          + 'vedere quanto pesano in entrata e in uscita.',
      },
    ],
  },
  {
    gruppo: 'I tipi di esercizio',
    voci: [
      {
        termine: 'Composto',
        cosa: 'Un movimento grosso che fa lavorare più muscoli insieme: panca, '
          + 'squat, stacco, trazioni.',
        perche: 'Sono i movimenti che fanno crescere la forza. Difficoltà alta non '
          + 'vuol dire impossibile: vuol dire che richiede più tecnica.',
      },
      {
        termine: 'Isolamento',
        cosa: 'Un movimento che lavora un muscolo solo, senza gli altri: '
          + 'curl, french press, leg extension.',
        perche: 'Serve per un muscolo che nel composto resta indietro. Però da solo '
          + 'non cresci molto: l\'app te lo dice nella difficoltà, e ha ragione.',
      },
      {
        termine: 'Pesa',
        cosa: 'Isolamento fatto con i pesi, che lavora il muscolo in accorciamento.',
        perche: 'È la via più onesta per far crescere un muscolo. Sulle trazioni '
          + 'invece si chiama "a stretching", perché il muscolo lavora allungato.',
      },
    ],
  },
  {
    gruppo: 'Le macchine e i cavi',
    voci: [
      {
        termine: 'Macchina a dischi veri',
        cosa: 'I dischi li metti tu, e stanno su ENTRAMBI i lati. È la chest press.',
        perche: 'Se scrivi 20, l\'app capisce che sono 20 per lato e conta 40. '
          + 'Se sbagli questo campo il Rank è metà di quello vero.',
      },
      {
        termine: 'Macchina a stack',
        cosa: 'Un pacco di dischi con una linguetta: infili la spina e il carico '
          + 'è già per entrambi i lati. È la leg press, il lat pulldown, il leg curl.',
        perche: 'Qui 50 sono 50 in tutto e NON vanno dimezzati. È l\'opposto '
          + 'rispetto alla macchina a dischi.',
      },
      {
        termine: 'Mono carrucola',
        cosa: 'Un cavo solo: il numero che segni è il numero che senti.',
        perche: 'Nessuna correzione, quindi il Rank è sul numero che hai scritto.',
      },
      {
        termine: 'Doppia carrucola',
        cosa: 'Due cavi che si dividono il carico: 50 sul bilanciere sono 25 per lato. '
          + 'Su una doppia carrucola si lavora su UN braccio alla volta.',
        perche: 'Senza saperlo, l\'app conta il doppio di quello che stai davvero '
          + 'tirando. È la cosa che fa sbagliare più Rank.',
      },
    ],
  },
  {
    gruppo: 'Il gioco',
    voci: [
      {
        termine: 'Rank',
        cosa: 'La fascia del tuo livello in un esercizio: da Bronzo a Olympian.',
        perche: 'È il numero che dice quanto sei forte in QUEL movimento, non quanto '
          + 'peso tiri in generale. Un movimento buono e uno scarino danno Rank '
          + 'diversi, e va bene così.',
      },
      {
        termine: 'LP',
        cosa: 'Livelli di progressione: quanti scalini hai fatto dentro la tua fascia.',
        perche: 'La fascia dice il livello, gli LP dicono quanto sei vicino al '
          + 'successivo. Serve a capire quanto ti manca.',
      },
      {
        termine: 'Streak',
        cosa: 'I giorni di fila in cui ti alleni nei giorni che hai scelto.',
        perche: 'Non si rompe se salti un giorno di riposo: si rompe solo se salti un '
          + 'giorno che avevi detto che ti allenavi.',
      },
      {
        termine: 'Aura',
        cosa: 'I punti che prendi con gli allenamenti finiti.',
        perche: 'È il totale di quello che hai fatto. Non lo perdi mai.',
      },
      {
        termine: 'Classe (Guerriero, Assassino, Berserker)',
        cosa: 'Un personaggio che dà il +20% a una statistica sola: forza, '
          + 'agilità o stamina.',
        perche: 'È un gioco sopra il Rank, non una misura di quanto sei forte. '
          + 'Cambiarlo non ti fa perdere niente.',
      },
    ],
  },
];

/**
 * Il blocco del glossario, già pronto da mettere in una pagina.
 *
 * `apri` riceve il testo del bottone da usare per chiudere, così il glossario
 * funziona anche se un giorno lo si mette dentro un dialogo.
 */
export function bloccoGlossario(el) {
  const box = el('section', { class: 'blocco' });
  box.appendChild(el('h2', { testo: 'Le parole dell\'app' }));
  box.appendChild(el('p', {
    class: 'nota',
    testo: 'Le parole che l\'app usa, e cosa vuol dire. Una volta sola: poi non '
      + 'serve più rileggerle.',
  }));

  const apri = { stato: null };
  const elenco = el('div', { class: 'glossario' });
  const bottone = el('button', {
    type: 'button',
    class: 'bot fantasma',
    testo: 'Apri il glossario',
  });
  const disegna = () => {
    if (apri.stato === null) {
      // il glossario è lungo: si mostra tutto e basta. Una voce alla volta con un
      // bottone per voce sarebbe venti bottoni da premere per leggere una parola.
      elenco.hidden = true;
      bottone.textContent = 'Apri il glossario';
      return;
    }
    elenco.hidden = false;
    bottone.textContent = 'Chiudi il glossario';
    for (const gruppo of apri.stato) {
      elenco.appendChild(el('h3', { class: 'titolo-sottosezione', testo: gruppo.gruppo }));
      const lista = el('dl', { class: 'lista-glossario' });
      for (const v of gruppo.voci) {
        lista.appendChild(el('dt', { testo: v.termine }));
        lista.appendChild(el('dd', {}, [
          el('span', { class: 'glossario-cosa', testo: v.cosa }),
          // il nome è "motivo" e non "perchè" per due motivi: rende più chiaro che è il
// perché conta, e una classe che finiva in "perche" veniva letta dal controllo
// grammaticale come una parola scritta male, perché nel codice finiva subito
// prima della virgoletta. Era un falso allarme, ma costava un test rosso.
el('span', { class: 'glossario-motivo', testo: 'Perché: ' + v.perche }),
        ]));
      }
      elenco.appendChild(lista);
    }
  };
  bottone.addEventListener('click', () => {
    apri.stato = apri.stato === null ? GLOSSARIO : null;
    while (elenco.firstChild) elenco.removeChild(elenco.firstChild);
    disegna();
  });
  disegna();

  box.appendChild(bottone);
  box.appendChild(elenco);
  return box;
}