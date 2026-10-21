// IL PATH SVG APPPIATTITO: le curve diventano una lista di punti.
//
// Serve per due cose:
//  - misurare il path (i comandi "A" non sono coppie x,y)
//  - DISEGNARLO, per poterlo GUARDARE. Il rollback del pettorale e' nato perché
//    avevo misurato i numeri senza mai guardare la figura.

const NUM = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

export function percorriPath(d) {
  const out = [];
  const RE = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let m;
  while ((m = RE.exec(d)) !== null) {
    const cmd = m[1];
    const args = (m[2].match(NUM) || []).map(Number);
    if (cmd === 'Z' || cmd === 'z') { out.push({ cmd, args: [] }); continue; }
    const quanti = { M: 2, m: 2, L: 2, l: 2, T: 2, t: 2, H: 1, h: 1, V: 1, v: 1, C: 6, c: 6, S: 4, s: 4, Q: 4, q: 4, A: 7, a: 7 }[cmd];
    const gruppi = Math.floor(args.length / quanti);
    for (let g = 0; g < gruppi; g++) {
      out.push({ cmd, args: args.slice(g * quanti, g * quanti + quanti) });
    }
  }
  return out;
}

const bezier = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1],
  ];
};

// Il path diventa una lista di anelli chiusi (uno per ogni "M").
export function anelliPath(d, passo = 6) {
  const tratti = percorriPath(d);
  const anelli = [];
  let corrente = null;
  let cx = 0, cy = 0, start = null;
  const punto = (x, y) => {
    if (!corrente) { corrente = []; anelli.push(corrente); }
    corrente.push([x, y]);
  };
  for (const t of tratti) {
    const a = t.args;
    switch (t.cmd) {
      case 'M': case 'm':
        cx = a[0]; cy = a[1]; start = [cx, cy];
        punto(cx, cy);
        break;
      case 'L': case 'l':
        cx = a[0]; cy = a[1]; punto(cx, cy); break;
      case 'H': case 'h':
        cx = a[0]; punto(cx, cy); break;
      case 'V': case 'v':
        cy = a[0]; punto(cx, cy); break;
      case 'C': case 'c': {
        const p0 = [cx, cy], p1 = [a[0], a[1]], p2 = [a[2], a[3]], p3 = [a[4], a[5]];
        for (let i = 1; i <= passo; i++) punto(...bezier(p0, p1, p2, p3, i / passo));
        cx = p3[0]; cy = p3[1];
        break;
      }
      case 'S': case 's': {
        const p0 = [cx, cy], p1 = [a[0], a[1]], p2 = [a[2], a[3]];
        for (let i = 1; i <= passo; i++) punto(...bezier(p0, p1, p2, [a[2], a[3]], i / passo));
        cx = a[2]; cy = a[3];
        break;
      }
      case 'Q': case 'q': {
        const p0 = [cx, cy], p1 = [a[0], a[1]], p2 = [a[2], a[3]];
        for (let i = 1; i <= passo; i++) {
          const u = 1 - i / passo;
          punto(
            u * u * p0[0] + 2 * u * (i / passo) * p1[0] + (i / passo) * (i / passo) * p2[0],
            u * u * p0[1] + 2 * u * (i / passo) * p1[1] + (i / passo) * (i / passo) * p2[1],
          );
        }
        cx = a[2]; cy = a[3];
        break;
      }
      case 'T': case 't':
        cx = a[0]; cy = a[1]; punto(cx, cy); break;
      case 'A': case 'a':
        // l'arco non e' sui muscoli che ci servono: si prende il punto finale
        cx = a[5]; cy = a[6]; punto(cx, cy); break;
      case 'Z': case 'z':
        if (start) punto(start[0], start[1]);
        corrente = null;
        break;
      default: break;
    }
  }
  return anelli;
}

export function riquadroPath(d, precisione = 1) {
  const anelli = anelliPath(d);
  let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
  for (const anello of anelli) {
    for (const [x, y] of anello) {
      if (x < x1) x1 = x; if (x > x2) x2 = x;
      if (y < y1) y1 = y; if (y > y2) y2 = y;
    }
  }
  if (!Number.isFinite(x1)) return null;
  const ar = (v) => Math.round(v * precisione) / precisione;
  return { x1: ar(x1), x2: ar(x2), y1: ar(y1), y2: ar(y2) };
}
