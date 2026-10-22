import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

/* ============ 1. LA REGOLA NUOVA: migliorato solo con >= 5 rip ============ */
{
  const P = B + 'src/progressi.js';
  let s = readFileSync(P, 'utf8');

  const V = `    // nell'assistenza "meno assistenza" vuol dire meglio: quindi il segno va girato
    const migliore = assistito ? -d : d;
    voci.push({
      nome, esercizio: e, assistito, chiave, contro, dataDa, dataA, sequenza,
      da, a, delta: d, migliore, punti: punti.length,
      serie: punti.length,
    });`;
  const N = `    // nell'assistenza "meno assistenza" vuol dire meglio: quindi il segno va girato
    let migliore = assistito ? -d : d;
    let delta = d;
    if (migliore > 0) {
      // LA REGOLA DI STE (22/10/2026).
      //
      // "sei migliorato soltanto se faccio un peso maggiore a quello precedente
      //  ma delle rep superiori o uguali a 5 col peso nuovo (piu' alto) se
      //  invece aumento il peso ma faccio meno di 5 rep non sono migliorato"
      //
      // Quindi il peso che sale conta come miglioramento solo se con quel peso
      // nuovo hai fatto almeno 5 ripetizioni. Se le ripetizioni sono meno di 5
      // non sei migliorato: e siccome non sei nemmeno andato indietro, resti
      // com'eri (il gruppo degli "invariati").
      const rip = miglioriRipetizioniCon(punti[punti.length - 1].serie, a, assistito);
      if (rip === null || rip < 5) {
        migliore = 0;
        delta = 0;
      }
    }
    voci.push({
      nome, esercizio: e, assistito, chiave, contro, dataDa, dataA, sequenza,
      da, a, delta, migliore, punti: punti.length,
      serie: punti.length,
    });`;
  if (!s.includes(V)) { console.log('NON TROVATO: il confronto in progressi.js'); process.exit(1); }
  s = s.replace(V, N);

  // l'aiuto che serve alla regola
  const V2 = "export function riepilogoGenerale(esercizi) {";
  const N2 = `/**
 * Le ripetizioni migliori fatte con un peso preciso.
 *
 * Serve alla regola di Ste (22/10/2026): il peso che sale conta come
 * miglioramento solo se con quel peso nuovo hai fatto almeno 5 ripetizioni.
 * Quindi di una seduta conta solo il set fatto con il peso migliore, e contano
 * le sue ripetizioni.
 */
function miglioriRipetizioniCon(serie, peso, assistito) {
  if (peso === null || peso === undefined || !Number.isFinite(Number(peso))) return null;
  let max = null;
  for (const s of (serie || [])) {
    if (!s || s.eliminata) continue;
    const p = assistito ? s.peso_assistenza : s.peso;
    if (p === null || p === undefined || !Number.isFinite(Number(p))) continue;
    if (Math.abs(Number(p) - Number(peso)) > 0.01) continue;
    const r = Number(s.ripetizioni);
    if (!Number.isFinite(r)) continue;
    if (max === null || r > max) max = r;
  }
  return max;
}

export function riepilogoGenerale(esercizi) {`;
  if (!s.includes(V2)) { console.log('NON TROVATO: riepilogoGenerale'); process.exit(1); }
  s = s.replace(V2, N2);
  writeFileSync(P, s, 'utf8');
  console.log('ok: la regola dei 5 ripetizioni');
}

/* ============ 2. la card: solo nei Progressi, e i riquadri si aprono ============ */
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');

  // 2a. la card coi riquadri cliccabili
  const V = `  const card = el('div', { class: 'card-riepilogo' });
  card.appendChild(el('p', { class: 'titolo-riepilogo', testo: 'In generale, quanto sei migliorato' }));
  const quadro = (numero, parola, colore) => el('div', { class: 'quadro-riepilogo ' + colore }, [
    el('strong', { class: 'numero-riepilogo', testo: String(numero) }),
    el('span', { class: 'parola-riepilogo', testo: parola }),
  ]);
  card.appendChild(el('div', { class: 'tre-riquadri' }, [
    quadro(generale.migliorati, 'MIGLIORATI', 'verde'),
    quadro(generale.fermi, 'INVARIATI', 'neutro'),
    quadro(generale.indietro, 'PEGGIORATI', 'rosso'),
  ]));
  if (generale.linee && generale.linee.length) {
    card.appendChild(el('p', { class: 'nota nota-piccola', testo: generale.linee[0] }));
  }
  return card;`;
  const N = `  const card = el('div', { class: 'card-riepilogo' });
  card.appendChild(el('p', { class: 'titolo-riepilogo', testo: 'In generale, quanto sei migliorato' }));

  // I TRE RIQUADRI SI APRONO (22/10/2026): Ste "se premo sugli esercizi in cui
  // sono migliorato devono spuntare gli esercizi in cui sono migliorato, stessa
  // cosa su peggiorato e uguale". Premendo un riquadro sotto compare la lista
  // degli esercizi di quel gruppo; premendo un altro, quella lista cambia.
  const dettaglio = el('div', { class: 'dettaglio-riepilogo' });
  const colori = { migliorati: 'verde', indietro: 'rosso', fermi: 'neutro' };
  const aperti = [];
  const quadro = (numero, parola, colore, chiave) => {
    const b = el('button', {
      type: 'button',
      class: 'quadro-riepilogo ' + colore,
      'aria-pressed': 'false',
    }, [
      el('strong', { class: 'numero-riepilogo', testo: String(numero) }),
      el('span', { class: 'parola-riepilogo', testo: parola }),
    ]);
    aperti.push(b);
    b.addEventListener('click', () => {
      const eraAperto = b.getAttribute('aria-pressed') === 'true';
      for (const x of aperti) x.setAttribute('aria-pressed', 'false');
      svuota(dettaglio);
      if (eraAperto) return;
      b.setAttribute('aria-pressed', 'true');
      const voci = (generale.gruppi && generale.gruppi[chiave]) || [];
      if (!voci.length) {
        dettaglio.appendChild(el('p', { class: 'nota', testo: 'Nessun esercizio in questo gruppo.' }));
        return;
      }
      for (const v of voci) {
        dettaglio.appendChild(el('p', { class: 'riga-variazione ' + (colori[chiave] || 'neutro'), testo: v.frase }));
      }
    });
    return b;
  };
  card.appendChild(el('div', { class: 'tre-riquadri' }, [
    quadro(generale.migliorati, 'MIGLIORATI', 'verde', 'migliorati'),
    quadro(generale.fermi, 'INVARIATI', 'neutro', 'fermi'),
    quadro(generale.indietro, 'PEGGIORATI', 'rosso', 'indietro'),
  ]));
  card.appendChild(dettaglio);
  if (generale.linee && generale.linee.length) {
    card.appendChild(el('p', { class: 'nota nota-piccola', testo: generale.linee[0] }));
  }
  return card;`;
  if (!s.includes(V)) { console.log('NON TROVATO: la card'); process.exit(1); }
  s = s.replace(V, N);

  // 2b. la card sparisce dal Profilo e dalle Impostazioni
  const V2 = "  // LA CARD COMPATTA ANCHE QUI (22/10/2026): la stessa del Profilo.\n"
    + "  const cardRiepilogo = cardRiepilogoMio();\n"
    + "  if (cardRiepilogo) zona.appendChild(cardRiepilogo);\n";
  const V3 = "  // LA CARD COMPATTA ANCHE QUI (22/10/2026): la stessa dei Progressi e del Profilo.\n"
    + "  const cardRiepilogo = cardRiepilogoMio();\n"
    + "  if (cardRiepilogo) zona.appendChild(cardRiepilogo);\n";
  let tolte = 0;
  if (s.includes(V2)) { s = s.replace(V2, ''); tolte++; }
  if (s.includes(V3)) { s = s.replace(V3, ''); tolte++; }
  console.log('ok: la card tolta da ' + tolte + ' schermate (ora sta solo nei Progressi)');

  writeFileSync(P, s, 'utf8');
}
