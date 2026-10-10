// sincronizzazione.js -- regole di sincronizzazione, isolate dal database.
// Qui non cÈ nessuna chiamata di rete: solo decisioni, così sono testabili.

export const TABELLE = ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note',
  'profili', 'missioni', 'ricompense', 'pesi'];

/** Campi che non vengono mai scritti sul server (sono solo del dispositivo). */
export const CAMPI_LOCALI = ['sync', 'base_rev', 'ultimo_errore', 'tentativi', 'in_flight'];

export function chiave(tabella, id) { return tabella + ':' + id; }

export function nuovoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // riserva: nessun crypto.randomUUID (vecchi browser)
  const buf = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
  else for (let i = 0; i < 16; i++) buf[i] = Math.floor(Math.random() * 256);
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const hex = [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function adesso() { return new Date().toISOString(); }

/** Prepara la riga per il server: toglie i campi locali e la clona. */
export function rigaPerInvio(riga) {
  const out = {};
  for (const k of Object.keys(riga)) {
    if (CAMPI_LOCALI.includes(k)) continue;
    if (riga[k] === undefined) continue;
    out[k] = riga[k];
  }
  return out;
}

/**
 * Cosa fare con una riga locale rispetto a quella remota?
 * Restituisce 'identico' | 'crea' | 'aggiorna' | 'conflitto'.
 *
 * 'conflitto' vuol dire: un altro dispositivo ha già scritto questa riga dopo
 * l'ultima sincronizzazione riuscita. In quel caso NON si sovrascrive niente:
 * si conservano entrambe le versioni e si chiede a Ste quale tenere.
 */
export function decidiPush(locale, remoto) {
  if (!locale) return 'ignora';
  if (!remoto) return 'crea';
  const revLocale = Number(locale.base_rev || 0);
  const revRemoto = Number(remoto.rev || 0);
  if (Number(locale.rev || 0) === Number(remoto.rev || 0)
      && locale.updated_at === remoto.updated_at) {
    return 'identico';
  }
  if (revRemoto > revLocale) return 'conflitto';
  return 'aggiorna';
}

/** Applica un invio riuscito: la riga locale diventa pulita e la base avanza. */
export function dopoInvioRiuscito(locale, nuovoRev) {
  return {
    ...locale,
    rev: nuovoRev,
    base_rev: nuovoRev,
    sync: 'pulito',
    ultimo_errore: null,
    tentativi: 0,
    in_flight: false,
  };
}

/** Segna la riga come da salvare e incrementa la revisione locale. */
export function segnaDaSalvare(locale) {
  return {
    ...locale,
    rev: Number(locale.rev || 0) + 1,
    updated_at: adesso(),
    sync: 'da_salvare',
    ultimo_errore: null,
  };
}

/**
 * Una riga remota va applicata in locale?
 * No se la riga locale ha modifiche non ancora inviate: in quel caso È un conflitto.
 */
export function applicaRemote(locale, remoto) {
  if (!locale) {
    return { azione: 'applica', riga: { ...remoto, sync: 'pulito', base_rev: Number(remoto.rev || 0) } };
  }
  const inCoda = locale.sync === 'da_salvare' || locale.sync === 'in_corso' || locale.sync === 'errore';
  const base = Number(locale.base_rev || 0);
  const revLocale = Number(locale.rev || 0);
  const revRemoto = Number(remoto.rev || 0);
  if (inCoda) {
    // base_rev È la revisione remota che conoscevamo all'ultimo sync riuscito.
    // Se da allora il remoto È andato avanti, un altro dispositivo ha scritto
    // la stessa riga: conflitto, e NON si sovrascrive niente.
    if (revRemoto > base) return { azione: 'conflitto', riga: remoto };
    return { azione: 'ignora', riga: locale };
  }
  if (revRemoto < revLocale) return { azione: 'ignora', riga: locale };
  if (revRemoto === revLocale && remoto.updated_at === locale.updated_at) {
    return { azione: 'ignora', riga: locale };
  }
  // UNISCE, non sostituisce. Ste (06/10/2026): "quando arriva una riga dal server
  // si prendono i campi che quella riga ha davvero, e quelli che non ha restano.
  // Cosi' un server con meno colonne non può più cancellare niente, oggi e per
  // qualunque campo aggiungerai domani".
  //
  // Prima qui c'era { ...remoto } e basta: la riga remota SOSTITUIVA la locale, e
  // siccome il server non ha le colonne carrucola / attrezzatura /
  // bracciaIndipendenti, quei tre campi venivano CANCELLATI. Non ignorati:
  // cancellati. E il catalogo si semina solo se la tabella È vuota, quindi non
  // tornavano più.
  //
  // Vince il valore che il server HA, anche se È null (null È "l'ho tolto", non
  // "non lo so"). Vincono i campi che ha; quelli che non ha restano come sono.
  return {
    azione: 'applica',
    riga: { ...locale, ...remoto, sync: 'pulito', base_rev: revRemoto, ultimo_errore: null },
  };
}

/**
 * I tre campi che dicono COME si registra il carico di un esercizio.
 *
 * Ste (06/10/2026): "e' il buco più serio di tutti quelli trovati finora,
 * perchÈ perde dati invece di sbagliare un numero".
 *
 * Sono tre campi piccoli e decisivi: la carrucola (mono o doppia), l'attrezzatura
 * (dischi veri o stack) e se i due braccia sono indipendenti. Se uno di questi
 * sparisce, l'app non sbaglia un numero: conta il carrello invece del peso che
 * senti, e sceglie la scala del carico intero invece di quella per lato.
 *
 * Perche' sono in una lista e non scritti a mano in tre posti: sono tre, ma
 * domani potrebbero essere cinque, e il punto del fix È che la lista sia il posto
 * dove si guarda.
 */
export const CAMPI_CARICO = ['carrucola', 'attrezzatura', 'bracciaIndipendenti'];

/**
 * Rimette i tre campi dal catalogo, per ogni esercizio che li perse.
 *
 * Serve perchÈ la tabella `esercizi` del database non ha queste colonne: la riga
 * che torna dal server non le contiene, e quindi non basta che il server non le
 * cancelli, i campi sul dispositivo possono essere già spariti. Il CATALOGO È
 * l'unico posto dove sono scritti per bene, quindi all'avvio si rileggono e si
 * rimettono.
 *
 * Restituisce solo le righe da scrivere, e solo se qualcosa cambia davvero: non
 * riscrive tutte le righe a ogni avvio per il piacere di farlo.
 *
 * NON mette in coda di sincronizzazione (niente sync: 'da_salvare'): il server non
 * ha le colonne, quindi rimandargli la riga non serve a niente e lascerebbe
 * l'app con una coda che non si svuota mai. E non cancella un campo che il
 * catalogo non dichiara: se domani un esercizio non ha carrucola, qui non si
 * tocca la sua, anche se per errore ne avesse una.
 *
 * Non crea righe: un esercizio che non cÈ ancora lo crea il semina.
 */
export function riallineaEsercizi(catalogo, righeLocali) {
  const perId = new Map((righeLocali || []).map((r) => [r && r.id, r]));
  const daScrivere = [];
  for (const e of catalogo || []) {
    if (!e || !e.id) continue;
    const locale = perId.get(e.id);
    if (!locale) continue;
    const corretti = {};
    let cambia = false;
    for (const campo of CAMPI_CARICO) {
      const voluto = e[campo];
      if (voluto === undefined) continue; // il catalogo non lo dichiara: non si tocca
      if (locale[campo] !== voluto) {
        corretti[campo] = voluto;
        cambia = true;
      }
    }
    if (cambia) daScrivere.push({ ...locale, ...corretti });
  }
  return daScrivere;
}

/** Costruisce il record di conflitto da mostrare a Ste. */
export function costruisciConflitto(id, tabella, locale, remoto) {
  return {
    id,
    tabella,
    riga_id: locale.id,
    stato: 'da_scegliere',
    creato_il: adesso(),
    locale: { ...rigaPerInvio(locale), _etichetta: 'Questo dispositivo' },
    remoto: { ...rigaPerInvio(remoto), _etichetta: 'L\'altro dispositivo' },
  };
}

/** Il conflitto si risolve scegliendo un lato; l'altro resta nel record. */
export function risolviConflitto(conflitto, scelta) {
  const scelto = scelta === 'remoto' ? conflitto.remoto : conflitto.locale;
  const perso = scelta === 'remoto' ? conflitto.locale : conflitto.remoto;
  return {
    riga: {
      ...scelto,
      rev: Math.max(Number(conflitto.locale.rev || 0), Number(conflitto.remoto.rev || 0)) + 1,
      updated_at: adesso(),
      sync: 'da_salvare',
      base_rev: Math.max(Number(conflitto.locale.base_rev || 0), Number(conflitto.remoto.rev || 0)),
    },
    perso: { ...perso, _scartato: true },
  };
}

/**
 * Backoff per i ritentativi. Nessuna dipendenza da Date.now: restituisce i
 * millisecondi da aspettare, così resta testabile.
 */
export function attesaRiprovo(tentativo) {
  const t = Math.max(1, Number(tentativo) || 1);
  const base = [5000, 30000, 120000, 600000];
  if (t <= base.length) return base[t - 1];
  return base[base.length - 1];
}

/** Quante modifiche restano da sincronizzare. */
export function contaDaSincronizzare(outbox) {
  return (outbox || []).filter((r) => r.sync === 'da_salvare' || r.sync === 'errore').length;
}

/** Lo stato mostrato in alto nell'app. */
export function statoSalvataggio({ online, configurato, coda, errori, inCorso }) {
  if (!configurato) {
    return { testo: 'Solo su questo dispositivo', colore: 'neutro', dettaglio: 'Il database online non e\' ancora collegato: i dati si salvano qui e basta.' };
  }
  if (!online) {
    return {
      testo: coda > 0 ? `Offline / da sincronizzare (${coda})` : 'Offline',
      colore: 'attenzione',
      dettaglio: 'Niente rete: i dati sono al sicuro su questo dispositivo e partono al ritorno della connessione.',
    };
  }
  if (inCorso) return { testo: 'Salvataggio...', colore: 'attesa', dettaglio: 'Sto inviando le modifiche al database.' };
  if (errori > 0) {
    return { testo: `Errore (${errori})`, colore: 'errore', dettaglio: 'Qualcosa non e\' andato. Le modifiche sono al sicuro, riprovo fra un po\'.' };
  }
  if (coda > 0) return { testo: `Salvataggio... (${coda})`, colore: 'attesa', dettaglio: 'Manca ancora qualche modifica.' };
  return { testo: 'Salvato online', colore: 'ok', dettaglio: 'Il database ha confermato il salvataggio.' };
}
