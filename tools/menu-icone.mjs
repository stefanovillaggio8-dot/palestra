import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
let s = readFileSync(B + 'src/app.js', 'utf8');
const fatto = [];

// 1. LE ICONE DEL MENU (22/10/2026). Ste ha mandato la foto: ogni voce ha
//    la sua icona SOPRA la parola.
{
  const V = `  const voce = (href, etichetta, percorso) => el('a', {
    href: '#' + percorso,
    class: 'voce-menu' + (voceAttiva(percorso) ? ' attiva' : ''),
    testo: etichetta,
  });`;
  const N = `  const voce = (href, etichetta, percorso) => el('a', {
    href: '#' + percorso,
    class: 'voce-menu' + (voceAttiva(percorso) ? ' attiva' : ''),
  }, [
    el('span', { class: 'icona-menu', html: ICONE_MENU[chiaveIcona(percorso)] || '' }),
    el('span', { class: 'parola-menu', testo: etichetta }),
  ]);`;
  if (!s.includes(V)) { console.log('NON TROVATO: la voce()'); process.exit(1); }
  s = s.replace(V, N);
  fatto.push('la voce() disegna l\'icona');
}

// 2. LE ICONE: il disegno di ognuna, e la chiave per capire quale mettere.
{
  const V = "  // La barra in basso: cinque voci, e sono le cinque schermate per cui Ste apre";
  const N = `  // LE ICONE DEL MENU (22/10/2026).
  //
  // Ste ha mandato la foto della barra che vuole: ogni voce ha la sua icona
  // SOPRA la parola. Le icone sono disegnate qui (linee, non immagini): si
  // colorano con il colore della voce, quindi la voce attiva si accende
  // tutta, e non c'e' nessun file da caricare.
  const ICONE_MENU = {
    allenamento: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
    rank: '<path d="M12 3l7 2.8v5.4c0 4.2-2.9 7.6-7 9.4-4.1-1.8-7-5.2-7-9.4V5.8L12 3z"/><path d="M12 9.2l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5 1.5-3z"/>',
    storico: '<path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1"/><path d="M3.2 4.4v4.2h4.2"/><path d="M12 7.6V12l3 1.8"/>',
    casa: '<path d="M3.6 11.2L12 4l8.4 7.2"/><path d="M5.6 10v9.6h12.8V10"/><path d="M10 19.6v-5.4h4v5.4"/>',
    profilo: '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.2c0-3.7 3.2-5.6 7.2-5.6s7.2 1.9 7.2 5.6"/>',
  };

  /** Quale icona mettere a una voce, dal suo percorso. */
  function chiaveIcona(percorso) {
    if (percorso === '/') return 'allenamento';
    if (percorso === '/rank') return 'rank';
    if (percorso === '/storico') return 'storico';
    if (percorso === '/casa') return 'casa';
    if (percorso === '/profilo') return 'profilo';
    return '';
  }

  // La barra in basso: cinque voci, e sono le cinque schermate per cui Ste apre`;
  if (!s.includes(V)) { console.log('NON TROVATO: il punto delle icone'); process.exit(1); }
  s = s.replace(V, N);
  fatto.push('le icone del menu');
}

// 3. L'ALLENAMENTO FINITO: una barra compatta in fondo, non un bottone gigante
//    in alto. Ste (22/10/2026): "per terminare l'allenamento metti solo questo
//    quando scorri verso il basso cosi' da occupare meno spazio".
{
  const V = `    bottone('Allenamento finito', { onClick: () => finisceAllenamento(s), classe: 'pericolo grande' }),
  ]));`;
  const N = `  ]));

  // LA BARRA IN FONDO (22/10/2026).
  //
  // Ste: "per terminare l'allenamento metti solo questo quando scorri verso il
  // basso cosi' da occupare meno spazio". Nella foto che ha mandato il
  // bottone e' una barra stretta in fondo, con il cronometro e il contatore
  // delle serie a sinistra e il bottone rosso a destra.
  //
  // Prima il bottone era grosso e stava in alto, nella banda del cronometro:
  // occupava mezza schermata e restava lontano dal pollice mentre scorrevi.
  // Ora e' in fondo, compatto, e la banda in alto ha solo il cronometro.
  const barraFine = el('div', { class: 'barra-fine' }, [
    el('div', { class: 'barra-fine-contatori' }, [
      el('span', { class: 'barra-fine-crono', id: 'cronometro-fine', testo: '00:00' }),
      el('span', { class: 'barra-fine-serie', id: 'avanzamento-fine', testo: '' }),
    ]),
    bottone('Allenamento finito', { onClick: () => finisceAllenamento(s), classe: 'pericolo' }),
  ]);
  zona.appendChild(barraFine);`;
  if (!s.includes(V)) { console.log('NON TROVATO: il bottone Allenamento finito'); process.exit(1); }
  s = s.replace(V, N);
  fatto.push('la barra in fondo con "Allenamento finito"');
}

writeFileSync(B + 'src/app.js', s, 'utf8');
console.log('fatto: ' + fatto.join(', '));
