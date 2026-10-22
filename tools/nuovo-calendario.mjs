/**
 * IL CALENDARIO VERO.
 *
 * Ste (09/10/2026): "il calendario deve essere proprio un calendario, che da ora
 * fino al 2027 ecc...".
 *
 * Due volte gli ho proposto qualcosa di diverso da un calendario e due volte aveva
 * ragione lui. La prima volta sette caselle (una settimana: il giorno che ti serve
 * non c'), la seconda volta una striscia di mesi uno sotto l'altro senza numeri. Un
 * calendario, nel senso di tutti i giorni, e' un'altra cosa: e' una TABELLA, con i
 * numeri dei giorni, i mesi in fila e l'anno che si cambia con le frecce.
 *
 * Perche' i numeri non si possono togliere: sette quadratini colorati senza numero
 * non dicono quando e' successo. Col numero diventa "marte' 6", e la memoria
 * lavora da sola.
 *
 * E perche' si parte dal primo allenamento e non dal 1° gennaio: un calendario che
 * contiene due anni di quadratini vuoti non dice niente, e fa scorrere la pagina per
 * niente.
 */
let annoCalendario = null;
let giornoApertoCalendario = null;

export function bloccoCalendario(profilo, st) {
  const box = el('section', { class: 'blocco' });
  const previsti = new Set(Array.isArray(profilo.giorni_allenamento) ? profilo.giorni_allenamento : []);
  const giorniFatti = new Set((st.streak && st.streak.giorniAllenati) || []);
  const oggi = isoGiorno(new Date());
  const oggiAnno = Number(oggi.slice(0, 4));
  const anno = annoCalendario === null ? oggiAnno : annoCalendario;

  box.appendChild(el('h2', { testo: 'Il tuo calendario' }));
  box.appendChild(rigaOggi(previsti, giorniFatti, oggi));

  // ---- LA TESTATA: l'anno e le frecce per cambiarlo.
  //
  // Ste: "da ora fino al 2027". Le frecce servono per questo: si parte dall'anno in
  // cui sei e si va avanti di un anno alla volta. Il bottone "a oggi" serve per
  // non perdersi dopo aver girato fino al 2030.
  const cambia = (nuovo) => { annoCalendario = nuovo; disegna(); };
  const testata = el('div', { class: 'calendario-testata' }, [
    bottone('‹', {
      classe: 'fantasma',
      onClick: () => cambia(anno - 1),
      titolo: 'L\'anno prima',
    }),
    el('strong', { class: 'calendario-anno-nome', testo: String(anno) }),
    bottone('›', {
      classe: 'fantasma',
      onClick: () => cambia(anno + 1),
      titolo: 'L\'anno dopo',
    }),
    (anno !== oggiAnno
      ? bottone('A oggi', { classe: 'fantasma', onClick: () => cambia(oggiAnno) })
      : null),
  ]);
  box.appendChild(testata);

  // ---- I DODICI MESI.
  //
  // Nell'anno in cui ti trovi si parte dal mese della PRIMA seduta, non da gennaio:
  // altrimenti il calendario di quest'anno avrebbe sei mesi vuoti davanti, e sei
  // mesi vuoti non sono informazione, sono rumore. Negli anni dopo si parte da
  // gennaio, e l'anno scorso si vede tutto: quello e' lo storico.
  const primoGiorno = giorniFatti.size ? [...giorniFatti].sort()[0] : oggi;
  const primoAnno = Number(primoGiorno.slice(0, 4));
  const primoMese = Number(primoGiorno.slice(5, 7));
  const meseIniziale = (anno === oggiAnno)
    ? primoMese
    : (anno > oggiAnno ? 1 : primoMese);
  const griglia = el('div', { class: 'calendario-anno' });
  for (let m = meseIniziale; m <= 12; m++) {
    griglia.appendChild(bloccoMese(anno, m, previsti, giorniFatti, oggi));
  }
  box.appendChild(griglia);

  // ---- IL DETTAGLIO DEL GIORNO PREMUTO.
  if (giornoApertoCalendario) {
    box.appendChild(dettaglioGiorno(giornoApertoCalendario));
  }

  box.appendChild(el('div', { class: 'legenda-calendario' }, [
    el('span', { class: 'pastiglia legenda-fatto', testo: 'allenato' }),
    el('span', { class: 'pastiglia legenda-saltato', testo: 'saltato' }),
    el('span', { class: 'pastiglia legenda-recupero', testo: 'giorno di recupero' }),
    el('span', { class: 'pastiglia legenda-atteso', testo: 'ti tocca' }),
  ]));
  return box;
}

/** La frase in cima: la risposta a "oggi mi tocca?", prima di tutto il resto. */
function rigaOggi(previsti, giorniFatti, oggi) {
  const NOME = ['Domenica', 'Luned\u00ec', 'Marted\u00ec', 'Mercoled\u00ec', 'Gioved\u00ec', 'Venerd\u00ec', 'Sabato'];
  const oggiDow = new Date(oggi + 'T12:00:00').getDay();
  const fattoOggi = giorniFatti.has(oggi);
  const oggiPrevisto = previsti.has(oggiDow);
  const prossimo = prossimoGiornoPrevisto(previsti, oggi);
  const frase = !previsti.size
    ? 'Non hai ancora scelto i giorni in cui alleni: va in Impostazioni, e il calendario si riempie di verde.'
    : (fattoOggi
      ? 'Oggi hai allenato.'
      : (oggiPrevisto
        ? (prossimo
          ? `Oggi ti tocca e non l'hai ancora fatto. Dopo, il prossimo giorno e' ${NOME[prossimo].toLowerCase()}.`
          : 'Oggi ti tocca e non l\'hai ancora fatto.')
        : (prossimo
          ? `Oggi e' giorno di recupero: non ti toglie niente. Ti tocca ${NOME[prossimo].toLowerCase()}.`
          : 'Oggi e\' giorno di recupero: non ti toglie niente.')));
  return el('p', { class: 'nota nota-grande', testo: frase });
}

/** Un mese: nome, i sette giorni in testa, e tutti i giorni con il loro numero. */
function bloccoMese(anno, mese, previsti, giorniFatti, oggi) {
  const primoDelMese = new Date(anno, mese - 1, 1, 12);
  const ultimo = new Date(anno, mese, 0, 12);
  const prefisso = `${anno}-${String(mese).padStart(2, '0')}-`;
  const fattiDelMese = [...giorniFatti].filter((g) => g.startsWith(prefisso)).length;

  const box = el('div', { class: 'calendario-mese' });

  box.appendChild(el('h3', { class: 'calendario-mese-nome' }, [
    NOMI_MESCE[mese - 1],
    // IL NUMERO DI ALLENAMENTI DEL MESE, accanto al nome. Un calendario senza
    // questo dice COME e' andato il mese solo se lo leggi giorno per giorno:
    // metterlo li' risponde subito a "marzo com'e' andato".
    el('span', {
      class: 'calendario-conto',
      testo: `${fattiDelMese} ${fattiDelMese === 1 ? 'giornata' : 'giornate'}`,
    }),
  ]));

  const testata = el('div', { class: 'calendario-coppie calendario-testata-giorni' });
  for (const n of ['lu', 'ma', 'me', 'gi', 've', 'sa', 'do']) {
    testata.appendChild(el('span', { class: 'coppia-giorni', testo: n }));
  }
  box.appendChild(testata);

  const riga = el('div', { class: 'calendario-coppie' });
  // la prima riga parte dal LUNEDI' della settimana che contiene il primo del mese,
  // altrimenti ogni mese sarebbe spostato di una colonna e marte' finirebbe sotto
  // "giovedi".
  const inizio = new Date(primoDelMese);
  inizio.setDate(primoDelMese.getDate() - ((primoDelMese.getDay() + 6) % 7));
  const fine = new Date(ultimo);
  fine.setDate(ultimo.getDate() + (6 - ((ultimo.getDay() + 6) % 7)));

  for (let d = new Date(inizio); d <= fine; d.setDate(d.getDate() + 1)) {
    const isoCell = isoGiorno(d);
    const nelMese = d.getMonth() === mese - 1 && d.getFullYear() === anno;
    if (!nelMese) {
      riga.appendChild(el('span', { class: 'cella-calendario fuori' }));
      continue;
    }
    const previsto = previsti.has(d.getDay());
    const fatto = giorniFatti.has(isoCell);
    const passato = isoCell < oggi;
    // IL SALTATO richiede tre cose insieme: che il giorno ti toccasse, che non ci
    // sei andato, e che sia passato. Oggi non e' un giorno saltato: non e' ancora
    // successo niente. E un giorno di recupero non e' MAI saltato, perche' non ti
    // toccava: saltare il riposo non e' colpa di nessuno.
    const saltato = passato && previsto && !fatto;
    const classi = ['cella-calendario'];
    if (fatto) classi.push('fatto');
    else if (saltato) classi.push('saltato');
    else if (!previsto && passato) classi.push('recupero');
    if (previsto && !fatto && !saltato) classi.push('atteso');
    if (isoCell === oggi) classi.push('oggi');
    if (isoCell > oggi) classi.push('futuro');
    const aperto = isoCell === giornoApertoCalendario;
    if (aperto) classi.push('aperto');

    riga.appendChild(el('button', {
      type: 'button',
      class: classi.join(' '),
      testo: String(d.getDate()),
      onClick: () => {
        giornoApertoCalendario = (giornoApertoCalendario === isoCell) ? null : isoCell;
        disegna();
      },
      aria: { label: ariaGiorno(isoCell, d, previsto, fatto, saltato, !previsto) },
      titolo: `${d.getDate()}/${mese}` + (fatto ? ' allenato' : (saltato ? ' saltato' : (previsto ? ' giorno di allenamento' : ' recupero'))),
    }));
  }
  box.appendChild(riga);
  return box;
}

/** Cosa hai fatto in un giorno preciso. */
function dettaglioGiorno(iso) {
  const sedute = seduteDellaPersona().filter((s) => String(s.data || '').slice(0, 10) === iso && s.stato === 'completata');
  const box = el('div', { class: 'spiegazione' });
  const NOME = ['Domenica', 'Luned\u00ec', 'Marted\u00ec', 'Mercoled\u00ec', 'Gioved\u00ec', 'Venerd\u00ec', 'Sabato'];
  const d = new Date(iso + 'T12:00:00');
  box.appendChild(el('h3', { class: 'nota', testo: `${NOME[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` }));

  if (!sedute.length) {
    box.appendChild(el('p', { class: 'nota', testo: 'Qui non hai allenato.' }));
    return box;
  }
  for (const s of sedute) {
    const righe = serieDellaPersona().filter((x) => x.seduta_id === s.id);
    const voci = righe.map((x) => {
      const e = esercizioPerId(x.esercizio_id);
      const kg = Number(x.peso || 0);
      return (e ? e.nome : 'esercizio') + (kg ? ` ${String(kg).replace('.', ',')} kg` : '');
    });
    box.appendChild(el('p', { class: 'nota', testo: voci.length ? voci.join(' · ') : 'seduta completata' }));
  }
  return box;
}

const NOMI_MESCE = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** Il prossimo giorno della settimana che hai scelto, come indice 0-6. */
function prossimoGiornoPrevisto(previsti, daIso) {
  const d = new Date(daIso + 'T12:00:00');
  for (let i = 1; i <= 8; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    if (previsti.has(x.getDay())) return x.getDay();
  }
  return null;
}

/** L'etichetta per chi non distingue i colori. */
function ariaGiorno(iso, d, previsto, fatto, saltato, recupero) {
  const NOME = ['domenica', 'luned\u00ec', 'marted\u00ec', 'mercoled\u00ec', 'gioved\u00ec', 'venerd\u00ec', 'sabato'];
  return `${NOME[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}: `
    + (fatto ? 'allenato' : (saltato ? 'saltato, giorno che ti toccava' : (previsto ? 'ti tocca' : 'giorno di recupero')));
}