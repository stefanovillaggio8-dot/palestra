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
    id: 'auto',
    testo: 'Come su Windows',
    spiegazione: 'Se Windows ha le animazioni spente, l\'app non le fa. È la scelta '
      + 'più prudente, e funziona se le animazioni ti danno fastidio o il mal di testa.',
  },
  {
    id: 'sempre',
    testo: 'Sempre accese',
    spiegazione: 'Le animazioni si fanno anche se Windows le ha spente. Le 13 '
      + 'animazioni dell\'app sono brevi, mezzo secondo, e si muovono solo quando '
      + 'tocchi qualcosa.',
  },
  {
    id: 'mai',
    testo: 'Spente',
    spiegazione: 'Niente animazioni, sempre. Utile se ti danno fastidio.',
  },
];

const PREFS = 'palestra-animazioni';

function memoria() {
  try {
    return window.localStorage.getItem(PREFS) || 'auto';
  } catch (e) {
    return 'auto';
  }
}

/** La scelta salvata: 'auto', 'sempre' o 'mai'. */
export function sceltaAnimazioni() {
  const v = memoria();
  return SCELTE_ANIMAZIONI.some((s) => s.id === v) ? v : 'auto';
}

export function impostaSceltaAnimazioni(id) {
  const v = SCELTE_ANIMAZIONI.some((s) => s.id === id) ? id : 'auto';
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