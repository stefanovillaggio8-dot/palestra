// audio.js -- i suoni dell'app.
//
// Ste (10/10/2026): per l'app Palestra l'audio è permesso e utile. Prima era scritto
// il contrario, ma quella regola valeva per un altro programma (quello della guardia)
// e lui me l'ha chiarito due volte.
//
// PERCHÉ SUONI SINTETIZZATI E NON FILE
//
// Un suono qui non è un file .mp3: è un'onda che il telefono genera al momento. Tre
// motivi, in ordine di importanza:
//
//  1. l'app DEVE funzionare SENZA RETE. Un suono scaricato dal server la prima volta
//     e poi tenuto in cache è fragile: se la cache si pulisce, l'app è muta e non c'è
//     nessun errore che ti dica perché. Un'onda generata sul momento non può mancare;
//  2. NESSUN file da caricare e nessun consumo di rete. 300 byte di codice invece di
//     un file da scaricare a ogni sessione;
//  3. si può fare un suono SU MISURA. I suoni qui sono brevissimi e hanno una forma
//     precisa: un "tocco" per la serie fatta, due note per l'allenamento finito. Un
//     file registrato would be più lungo e meno adatto.
//
// IL SUONO È BREVE DI PROPOSITO
//
// In palestra il telefono è in tasca e tu hai le mani occupiate. Un suono lungo
// diventa una cosa da spegnere, e una cosa da spegnere è un rumone che spegni anche
// quando arriva qualcosa che conta. Qui nessun suono dura più di mezzo secondo.
//
// IL VOLUME È BASSO DI PROPOSITO
//
// Sono segnali di conferma, non musica. Restano sotto la musica e sotto il rumore
// della palestra: devono arrivare sopra il rumore, non sopra la musica.
//
// IL CONTESTO VA ATTIVATO DA UN TOCCO
//
// Safari e Chrome sui telefoni non fanno suonare niente se l'audio non è stato
// "sbloccato" da un gesto tuo. Per questo `sbloccaAudio()` va chiamata al primo tocco
// su un pulsante: non è una cortesia, senza quello l'app è muta e sembra rotta.

let contesto = null;
let sbloccato = false;
let spento = false;

/** Il suono è spento? Lo legge e lo imposta. */
export function audioSpento() { return spento; }
export function impostaAudioSpento(v) { spento = !!v; return spento; }

/**
 * Sblocca l'audio. Va chiamata dentro un gesture (un tocco), altrimenti il
 * browser lascia il contesto sospeso e non esce nessun suono.
 *
 * Non fa male se lo si chiama più volte: il contesto viene creato una volta sola e
 * le chiamate dopo la prima sono un no-op.
 */
export function sbloccaAudio() {
  if (sbloccato) {
    // Riprendere un contesto sospeso: succede quando il browser lo mette in pausa
    // (schermo spento, app nel fondo) e al ritorno nessun suono esce.
    if (contesto && contesto.state === 'suspended') contesto.resume().catch(() => {});
    return;
  }
  try {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    contesto = new AC();
    sbloccato = true;
    // Alcuni browser restano sospesi finché non si richiede un suono: si parte con
    // un silenzio di mezzo secondo, che non si sente ma apre il contesto.
    if (contesto.state === 'suspended') contesto.resume().catch(() => {});
  } catch {
    contesto = null;
  }
}

/**
 * Un suono.
 *
 * @param freq        frequenza in Hz (più alto = più acuto)
 * @param quando      secondi da adesso
 * @param durata      secondi
 * @param volume      0..1
 * @param tipo        'seno', 'triangolo' o 'quadrato'
 */
function nota(freq, quando, durata, volume, tipo = 'seno') {
  if (!contesto || spento) return;
  try {
    const t0 = contesto.currentTime + quando;
    const osc = contesto.createOscillator();
    const gain = contesto.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t0);
    // IL VOLUME SCENDE PRIMA, non di colpo.
    // Un suono che parte forte e sparisce male: si sente lo "scatto" all'inizio.
    // Un suono che sale e poi scende piano si sente come una nota.
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durata);
    osc.connect(gain);
    gain.connect(contesto.destination);
    osc.start(t0);
    osc.stop(t0 + durata + 0.02);
  } catch {
    // Un suono che non parte non deve mai fermare l'azione che lo aveva chiamato:
    // spuntare una serie funziona anche se il suono fallisce.
  }
}

/**
 * I suoni dell'app.
 *
 * `serie`   : la spunta della serie. Un tocco secco e breve.
 * `sessione`: l'allenamento finito. Due note che salgono: è l'unico suono un po'
 *             più lungo, perché è l'unico che segnala qualcosa di finito.
 * `record`  : un nuovo record personale. Tre note, la più acuta ultima.
 * `avviso`  : un errore o qualcosa che non è andato. Due note che scendono.
 */
export function suona(quale) {
  if (spento || !contesto) return;
  switch (quale) {
    case 'serie':
      // Tocco secco, acuto ma non stridente.
      nota(880, 0, 0.09, 0.12, 'triangolo');
      break;
    case 'togli':
      // Tocco basso, quando togli la spunta: non è un errore, ma è diverso.
      nota(440, 0, 0.08, 0.09, 'triangolo');
      break;
    case 'sessione':
      // Due note che salgono: finita, e va bene.
      nota(523, 0, 0.16, 0.16, 'seno');   // Do
      nota(784, 0.11, 0.24, 0.16, 'seno'); // Sol
      break;
    case 'record':
      // Tre note, la più acuta ultima: è una cosa che capita poche volte.
      nota(523, 0, 0.12, 0.14, 'seno');
      nota(659, 0.09, 0.12, 0.14, 'seno');
      nota(1047, 0.18, 0.3, 0.15, 'seno');
      break;
    case 'avviso':
      // Due note che scendono: qualcosa non è andato.
      nota(392, 0, 0.12, 0.12, 'quadrato');
      nota(294, 0.1, 0.2, 0.12, 'quadrato');
      break;
    default:
      break;
  }
}

/** Il suono di conferma più recente, per i test e per il debug. */
export function statoAudio() {
  return { sbloccato, spento, haContesto: !!contesto };
}