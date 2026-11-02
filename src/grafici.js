// grafici.js -- grafici in SVG scritti a mano.
// Nessuna libreria: così funzionano offline senza scaricare nulla e il
// bundle resta piccolo. Ogni grafico mostra anche i numeri usati per disegnarlo,
// così niente resta nascosto dietro una linea.

import { el } from './ui.js';
import { formattaNumero } from './numeri.js';

const NS = 'http://www.w3.org/2000/svg';

function svgTag(tag, attributi = {}) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attributi)) {
    if (v === null || v === undefined) continue;
    n.setAttribute(k, String(v));
  }
  return n;
}

/** Asse con etichette leggibili anche sul telefono. */
function assi(svg, { larghezza, altezza, margine, punti, chiaveY, titoloY, formatoY, daZero = false }) {
  const valori = punti.map((p) => p[chiaveY]).filter((v) => v !== null && v !== undefined && Number.isFinite(Number(v)));
  if (!valori.length) return { min: 0, max: 1 };
  let min = Math.min(...valori);
  let max = Math.max(...valori);
  if (min === max) { min = min - 1; max = max + 1; }
  const range = max - min;
  min -= range * 0.15;
  max += range * 0.15;
  if (daZero) { min = Math.min(0, ...valori); max = Math.max(1, ...valori) * 1.15; }
  const px = (v) => margine + v * (larghezza - 2 * margine);
  const py = (v) => altezza - 28 - ((v - min) / (max - min)) * (altezza - 28 - 14);

  for (let i = 0; i <= 3; i++) {
    const v = min + ((max - min) * i) / 3;
    const y = py(v);
    svg.appendChild(svgTag('line', { x1: margine, y1: y, x2: larghezza - margine, y2: y, class: 'griglia' }));
    const t = svgTag('text', { x: margine - 5, y: y + 4, 'text-anchor': 'end', class: 'asse-txt' });
    t.textContent = formatoY ? formatoY(v) : formattaNumero(Math.round(v * 100) / 100);
    svg.appendChild(t);
  }
  const etichetta = svgTag('text', { x: larghezza / 2, y: 12, 'text-anchor': 'middle', class: 'asse-titolo' });
  etichetta.textContent = titoloY;
  svg.appendChild(etichetta);
  return { min, max, px, py };
}

/**
 * Grafico a linee con i valori numerici elencati sotto.
 * colori: 'normale' | 'spotter' | 'decimali'
 */
export function graficoLinea(punti, { chiaveY, titoloY, etichette = [], larghezza = 640, altezza = 230, colore = 'normale', nota } = {}) {
  const scatola = el('div', { class: 'grafico' });
  const buoni = punti.filter((p) => p[chiaveY] !== null && p[chiaveY] !== undefined && Number.isFinite(Number(p[chiaveY])));
  if (buoni.length < 1) {
    scatola.appendChild(el('p', { class: 'grafico-vuoto', testo: 'Dati non disponibili per questo grafico.' }));
    return scatola;
  }
  const svg = svgTag('svg', { viewBox: `0 0 ${larghezza} ${altezza}`, class: 'grafico-svg', role: 'img', 'aria-label': titoloY || 'Andamento allenamenti' });
  const a = assi(svg, { larghezza, altezza, margine: 46, punti: buoni, chiaveY, titoloY, formatoY: (v) => formattaNumero(v) });

  const dettaglio = el('p', { class: 'grafico-selezione', role: 'status', testo: 'Tocca un punto per leggere il valore.' });
  const n = buoni.length;
  const puntiXY = buoni.map((p, i) => {
    const x = a.px(n === 1 ? 0.5 : i / (n - 1));
    const y = a.py(Number(p[chiaveY]));
    return { x, y, p };
  });
  if (puntiXY.length > 1) {
    svg.appendChild(svgTag('polyline', {
      points: puntiXY.map((q) => `${q.x},${q.y}`).join(' '),
      class: 'linea-grafico linea-' + colore,
      pathLength: 1,
      fill: 'none',
    }));
  }
  puntiXY.forEach((q, i) => {
    const punto = svgTag('circle', { cx: q.x, cy: q.y, r: 5, tabindex: 0, class: 'punto-grafico punto-' + colore });
    const descrizione = `${q.p.etichetta || ''}: ${formattaNumero(q.p[chiaveY])} ${titoloY || ''}`;
    punto.setAttribute('aria-label', descrizione);
    const titolo = svgTag('title'); titolo.textContent = descrizione; punto.appendChild(titolo);
    punto.addEventListener('click', () => { dettaglio.textContent = descrizione; });
    punto.addEventListener('focus', () => { dettaglio.textContent = descrizione; });
    svg.appendChild(punto);
    if (i === 0 || i === n - 1 || i === Math.floor(n / 2)) {
      const data = svgTag('text', { x: q.x, y: altezza - 8, 'text-anchor': 'middle', class: 'asse-txt' });
      data.textContent = q.p.etichetta || ''; svg.appendChild(data);
    }
    if (etichette[i] !== undefined) {
      const t = svgTag('text', { x: q.x, y: q.y - 11, 'text-anchor': 'middle', class: 'valore-punto' });
      t.textContent = formattaNumero(q.p[chiaveY]);
      svg.appendChild(t);
    }
  });
  scatola.appendChild(svg);
  scatola.appendChild(dettaglio);

  const tabella = el('details', { class: 'grafico-dati' }, [el('summary', { testo: 'Mostra tutti i valori' })]);
  const voci = buoni.map((q) => `${q.etichetta || ''}: ${formattaNumero(q[chiaveY])}`);
  tabella.appendChild(el('p', { class: 'grafico-dati-txt', testo: 'Numeri usati: ' + voci.join(' · ') }));
  if (nota) tabella.appendChild(el('p', { class: 'grafico-nota', testo: nota }));
  scatola.appendChild(tabella);
  return scatola;
}

/** Barre per il volume, con le serie con spotter evidenziate. */
export function graficoBarre(punti, { chiaveY, titoloY, etichette = [], larghezza = 640, altezza = 230 } = {}) {
  const scatola = el('div', { class: 'grafico' });
  const buoni = punti.filter((p) => p[chiaveY] !== null && p[chiaveY] !== undefined && Number.isFinite(Number(p[chiaveY])));
  if (!buoni.length) {
    scatola.appendChild(el('p', { class: 'grafico-vuoto', testo: 'Dati non disponibili per questo grafico.' }));
    return scatola;
  }
  const svg = svgTag('svg', { viewBox: `0 0 ${larghezza} ${altezza}`, class: 'grafico-svg', role: 'img', 'aria-label': titoloY || 'Volume allenamenti' });
  const a = assi(svg, { larghezza, altezza, margine: 46, punti: buoni, chiaveY, titoloY, daZero: true, formatoY: (v) => formattaNumero(v) });
  const n = buoni.length;
  const larghezzaBarra = (larghezza - 46 - 46) / n * 0.65;
  buoni.forEach((p, i) => {
    const centro = 46 + ((i + 0.5) * (larghezza - 46 - 46)) / n;
    const y = a.py(Number(p[chiaveY]));
    const y0 = a.py(Math.max(a.min, 0));
    const haSpotter = Number(p.spotter) > 0;
    const barra = svgTag('rect', {
      x: centro - larghezzaBarra / 2, y: Math.min(y, y0),
      width: larghezzaBarra, height: Math.max(2, Math.abs(y0 - y)),
      class: 'barra-grafico' + (haSpotter ? ' barra-spotter' : ''),
      tabindex: 0, 'aria-label': `${p.etichetta || ''}: ${formattaNumero(p[chiaveY])} ${titoloY || ''}`,
    });
    const titolo = svgTag('title'); titolo.textContent = barra.getAttribute('aria-label'); barra.appendChild(titolo);
    svg.appendChild(barra);
    const t = svgTag('text', { x: centro, y: altezza - 8, 'text-anchor': 'middle', class: 'asse-txt' });
    t.textContent = String(p.etichetta || '');
    if (n <= 6 || i === 0 || i === n - 1 || i === Math.floor(n / 2)) svg.appendChild(t);
    const v = svgTag('text', { x: centro, y: Math.min(y, y0) - 5, 'text-anchor': 'middle', class: 'valore-punto' });
    v.textContent = formattaNumero(p[chiaveY]);
    if (n <= 8) svg.appendChild(v);
  });
  scatola.appendChild(svg);
  const tabella = el('div', { class: 'grafico-dati' });
  tabella.appendChild(el('p', {
    class: 'grafico-dati-txt',
    testo: 'Numeri usati: ' + buoni.map((p) => `${p.etichetta}: ${formattaNumero(p[chiaveY])}`).join(' · '),
  }));
  const conSpotter = buoni.filter((p) => Number(p.spotter) > 0);
  if (conSpotter.length) {
    tabella.appendChild(el('p', {
      class: 'grafico-nota',
      testo: ' Barre in arancio: in quelle sedute almeno una serie ha avuto lo spotter, quindi il valore non e\' un record pulito.',
    }));
  }
  scatola.appendChild(tabella);
  return scatola;
}
