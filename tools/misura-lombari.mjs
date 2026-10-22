import { readFileSync } from 'node:fs';

const s = readFileSync('C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js', 'utf8');
const retro = s.slice(s.indexOf('export const ATLANTE_RETRO = ')).replace(/\\"/g, '"').replace(/\\n/g, ' ');

// ogni path: cerco il suo id, poi il suo d
function pathDi(id) {
  const i = retro.indexOf('id="' + id + '"');
  if (i < 0) return null;
  const inizio = retro.lastIndexOf('<path', i);
  const fine = retro.indexOf('>', i);
  const tag = retro.slice(inizio, fine + 1);
  const d = (tag.match(/\sd="([^"]+)"/) || [])[1];
  // il gruppo: cerco il <g ...> piu' vicino prima
  const g = retro.lastIndexOf('<g', inizio);
  const tr = (g >= 0 && retro.indexOf('</g>', g) > inizio) ? (retro.slice(g, retro.indexOf('>', g)).match(/transform="([^"]+)"/) || [])[1] : '';
  return { d, tr: tr || '' };
}

function bbox(d) {
  const pts = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  const cmdRe = /([MmLlHhVvCcSsQqTtZz])([^MmLlHhVvCcSsQqTtZz]*)/g;
  let mm;
  while ((mm = cmdRe.exec(d))) {
    const c = mm[1], rel = c === c.toLowerCase(), abs = c.toUpperCase();
    const a = mm[2].trim() ? (mm[2].match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number) : [];
    if (abs === 'M' || abs === 'L' || abs === 'T') {
      for (let k = 0; k + 1 < a.length; k += 2) {
        x = rel ? x + a[k] : a[k]; y = rel ? y + a[k + 1] : a[k + 1];
        pts.push([x, y]);
        if (abs === 'M' && k === 0) { sx = x; sy = y; }
      }
    } else if (abs === 'H') { for (const v of a) { x = rel ? x + v : v; pts.push([x, y]); } }
    else if (abs === 'V') { for (const v of a) { y = rel ? y + v : v; pts.push([x, y]); } }
    else if (abs === 'C') {
      for (let k = 0; k + 5 < a.length; k += 6) {
        for (let j = 0; j < 6; j += 2) {
          x = rel ? x + a[j] : a[j]; y = rel ? y + a[j + 1] : a[j + 1];
          pts.push([x, y]);
        }
      }
    } else if (abs === 'S' || abs === 'Q') {
      for (let k = 0; k + 3 < a.length; k += 4) {
        for (let j = 0; j < 4; j += 2) {
          x = rel ? x + a[j] : a[j]; y = rel ? y + a[j + 1] : a[j + 1];
          pts.push([x, y]);
        }
      }
    } else if (abs === 'Z') { x = sx; y = sy; pts.push([x, y]); }
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

function applica(b, tr) {
  const n = (tr.match(/-?\d*\.?\d+/g) || []).map(Number);
  if (tr.startsWith('scale(')) return { x0: b.x0 * n[0], x1: b.x1 * n[0], y0: b.y0 * n[1], y1: b.y1 * n[1] };
  if (tr.startsWith('translate(596,0)')) return { x0: 596 - b.x0 * n[1], x1: 596 - b.x1 * n[1], y0: b.y0 * n[2], y1: b.y1 * n[2] };
  return b;
}

console.log('retro: 596 x 1133, la colonna sta a x=298\n');
for (const id of ['trapezius_upper_l', 'trapezius_lower_l', 'erector_spinae_l', 'erector_spinae_r',
  'gluteus_maximus_l', 'latissimus_dorsi_l']) {
  const p = pathDi(id);
  if (!p || !p.d) { console.log(id.padEnd(20) + ': non trovato'); continue; }
  const b = applica(bbox(p.d), p.tr);
  console.log(id.padEnd(20) + ' x ' + String(Math.round(b.x0)).padStart(4) + '-' + String(Math.round(b.x1)).padEnd(5)
    + '  y ' + String(Math.round(b.y0)).padStart(4) + '-' + Math.round(b.y1));
}
