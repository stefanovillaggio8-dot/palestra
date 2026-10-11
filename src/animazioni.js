// animazioni.js -- se l'app deve fare le animazioni, o se lascia decidere a Windows.
//
// Ste (10/10/2026): "comunque io le animazioni non le vedo".
//
// IL MOTIVO ERA UNO, E NON ERA UN BUG DEL CSS.
//
// Il CSS ha una regola di accessibilità standard:
//
//   @media (prefers-reduced-motion: reduce) { * { transition-duration: .001ms } }
//
// Il browser la attiva quando il sistema operativo dice all'utente "non voglio le
// animazioni". Su Windows quel segnale è `SPI_GETCLIENTAREAANIMATION`, che sta
// sotto Impostazioni > Accessibilita' > Effetti visivi > Effetti di animazione.
//
// Sul PC di Ste quel valore era 0, cioe' le animazioni SPENTE. Quindi il browser
// diceva "prefers-reduced-motion: reduce", la regola qui sopra scattava, e tutte e
// 13 le animazioni dell'app diventavano istantanee. Non erano rotte: erano spente
// apposta, e da un pezzo.
//
// LA SCELTA.
//
// Il default resta `auto`, cioe' si ubbidisce a Windows come prima: chi ha spento le
// animazioni per il mal di testa o per la batteria continua a non vederle.
//
// Ma se Ste le vuole e Windows le ha spente per un motivo che non c'entra,
// l'app non deve fare la morale: `sempre` mette una classe sul <html> e la regola
// di accessibilità non si applica più. E c'è anche `mai`, per chi le trova
// fastidiose.
//
// Il modulo non decide nulla da solo: espone la scelta, e chi disegna la applica.

const CHIAVE = 'animazioni';

/** Le tre scelte, nell'ordine in cui compaiono nel menù. */
export const SCELTE_ANIMAZIONI = [
  {
    id: 'sempre',
    testo: 'Sempre accese',
    spiegazione: 'Le animazioni si fanno sempre, anche se il telefono o il computer '
      + 'chiedono poco movimento. Sono brevi, mezzo secondo, e si muovono solo quando '
      + 'tocchi qualcosa. È la scelta di default.',
  },
  {
    id: 'auto',
    testo: 'Come sul dispositivo',
    spiegazione: 'Se il telefono o il computer hanno le animazioni spente, l\'app '
      + 'non le fa. Serve se le animazioni ti danno fastidio o il mal di testa, o se '
      + 'vuoi risparmiare la batteria.',
  },
  {
    id: 'mai',
    testo: 'Spente',
    spiegazione: 'Niente animazioni, sempre. L\'app funziona uguale, solo senza i '
      + 'movimenti.',
  },
];

const PREFS = 'palestra-animazioni';

function memoria() {
  // IL DEFAULT È "SEMPRE", E NON "COME SU WINDOWS".
  //
  // Ste (10/10/2026): "le animazioni voglio vederle anche da telefono".
  //
  // Con il default "auto" le animazioni dipendevano dal sistema, e su telefono il
  // sistema le spegne più spesso che sul PC: iPhone con "Riduci movimento" attivo,
  // Android con il risparmio batteria. Quindi le vedeva sul PC (dopo averlo scelto
  // a mano) e non le vedeva da telefono, per un motivo che non aveva niente a che
  // fare con l'app.
  //
  // Il default è "sempre", e le tre scelte restano tre: se le animazioni non ti
  // vanno, "spente" le spegne davvero e l'app funziona uguale, solo senza i
  // movimenti. La scelta viene ricordata anche sul telefono.
  try {
    return window.localStorage.getItem(PREFS) || 'sempre';
  } catch (e) {
    return 'sempre';
  }
}

/** La scelta salvata: 'auto', 'sempre' o 'mai'. */
export function sceltaAnimazioni() {
  const v = memoria();
  return SCELTE_ANIMAZIONI.some((s) => s.id === v) ? v : 'sempre';
}

export function impostaSceltaAnimazioni(id) {
  const v = SCELTE_ANIMAZIONI.some((s) => s.id === id) ? id : 'sempre';
  try {
    window.localStorage.setItem(PREFS, v);
  } catch (e) { /* senza memoria la scelta vale solo per questa sessione */ }
  applicaSceltaAnimazioni();
  return v;
}

/**
 * Mette la classe giusta sul <html>, quella che legge il CSS.
 *
 * `forza` serve a chi non usa il CSS ma decide in JavaScript: se vale true,
 * l'app considera le animazioni attive anche se il sistema dice il contrario.
 */
export function applicaSceltaAnimazioni(forza = false) {
  const scelta = sceltaAnimazioni();
  const root = document.documentElement;
  if (!root) return scelta;
  root.classList.toggle('animazioni-sempre', scelta === 'sempre' || forza === true);
  root.classList.toggle('animazioni-mai', scelta === 'mai' && forza !== true);
  return scelta;
}

/**
 * Se questo browser chiede poco movimento. Serve per decidere in JavaScript.
 *
 * Nota: con la scelta `sempre` si risponde `false` anche se il browser dice
 * `reduce`, perché è l'utente che ha chiesto le animazioni, non il sistema.
 */
export function pocoMovimento() {
  if (sceltaAnimazioni() !== 'auto') return sceltaAnimazioni() === 'mai';
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) {
    return false;
  }
}

/** Va chiamata una volta all'avvio, prima di disegnare qualcosa. */
export function avviaAnimazioni() {
  applicaSceltaAnimazioni();
}