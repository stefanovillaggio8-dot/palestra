// LE TRE FASI DEL PETTORALE (Ste, 18/10/2026).
//
// Ste: "il petto era diviso in 3, che segnava quando era petto alto, petto basso o petto
// in mezzo", "voglio che si veda la parte muscolare tra le 3 del petto che lavora" e poi
// "rendi più realistici i fasci muscolari, che non fare solo delle linee evidenziate così".
//
// LA FORMA. Nella tavola vettoriale il pettorale e' un tracciato solo per lato, senza parti
// dentro: quindi non si può accendere "la zona giusta", perché il path e' uno solo. Il
// path viene ritagliato in tre fasce, e ogni fascia prende il viola della sua zona.
//
// I TAGLI SONO CURVI, non a forbice. Le fibre del pettorale non vanno in linea retta:
// l'artista le ha disegnate curve, e un taglio dritto sembrava una riga a pennare. I
// bordi delle fasce seguono la curva, e fra una fascia e l'altra c'e' una linea sottile
// del colore del corpo, come le linee anatomiche del disegno.
//
// IL CONFRONTO CON IL VECCHIO APP. Le curve non sono quelle del vecchio disegno (il
// Termininja, col petto a ventaglio): quelle, portate su questo disegno, tagliavano nel
// posto sbagliato e venivano fuori una macchia e due strisce. Qui i bordi nascono dalla
// forma del PEZZO VERO, quindi restano attaccati al suo contorno.
//
// L'ANATOMIA, da Ste (18/10/2026):
//  - FASCIO CLAVICOLARE (alto): sotto la clavicola, fibre obliqui verso il basso e fuori
//  - FASCIO STERNO-COSTALE (medio): il corpo del petto, fibre quasi orizzontali
//  - FASCIO ADDOMINALE (basso): lo "scalino" inferiore del torace, fibre dal basso in su

export const FASCIO = { alto: 0, medio: 1, basso: 2 };

// I due confini, in coordinate locali (u = 0 allo sterno, 1 all'ascella; v = 0 in alto).
// Sono le linee lungo la direzione delle fibre, leggermente curve.
export const CONFINI = [
  { u0: 0.00, v0: 0.17, u1: 1.00, v1: 0.43, arco: -0.05 },
  { u0: 0.00, v0: 0.62, u1: 1.00, v1: 0.86, arco: -0.04 },
];

export const ZONE_PETTO = ['petto_alto', 'petto_centrale', 'petto_basso'];

export function locale(p, riquadro, specchio) {
  const u0 = (p[0] - riquadro.x1) / (riquadro.x2 - riquadro.x1);
  const v = (p[1] - riquadro.y1) / (riquadro.y2 - riquadro.y1);
  return [specchio ? 1 - u0 : u0, v];
}

export function globale(p, riquadro, specchio) {
  const u = specchio ? 1 - p[0] : p[0];
  return [riquadro.x1 + u * (riquadro.x2 - riquadro.x1), riquadro.y1 + p[1] * (riquadro.y2 - riquadro.y1)];
}

const ar = (v) => Math.round(v * 100) / 100;

// La curva di un confine: una quadratica che parte dallo sterno e arriva all'ascella,
// con la punta spostata verso l'alto (le fibre salgono verso l'ascella).
export function curvaConfine(confine, riquadro, specchio) {
  const a = globale([confine.u0, confine.v0], riquadro, specchio);
  const b = globale([confine.u1, confine.v1], riquadro, specchio);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const ctrl = globale([0.5, 0.5 + (confine.arco || 0)], riquadro, specchio);
  return { a, b, ctrl, d: `M${ar(a[0])},${ar(a[1])} Q${ar(ctrl[0])},${ar(ctrl[1])} ${ar(b[0])},${ar(b[1])}` };
}

// La regione di una fascia, come path SVG (la può usare un clipPath).
export function regioneFascia(riquadro, specchio, k) {
  const su = k > 0 ? curvaConfine(CONFINI[k - 1], riquadro, specchio) : null;
  const sotto = k < 2 ? curvaConfine(CONFINI[k], riquadro, specchio) : null;
  const xL = riquadro.x1 - 40;
  const xR = riquadro.x2 + 40;
  const punti = [];
  if (su) punti.push(`M${ar(xL)},${ar(su.a[1])}`, su.d.slice(1));
  else punti.push(`M${ar(xL)},${ar(riquadro.y1)}`);
  if (sotto) {
    punti.push(`L${ar(xR)},${ar(sotto.b[1])}`);
    punti.push(`Q${ar(sotto.ctrl[0])},${ar(sotto.ctrl[1])} ${ar(sotto.a[0])},${ar(sotto.a[1])}`);
  } else {
    punti.push(`L${ar(xR)},${ar(riquadro.y2)}`);
  }
  punti.push(`L${ar(xL)},${ar(su ? su.a[1] : riquadro.y1)}`);
  punti.push('Z');
  return punti.join(' ');
}

// Le linee di separazione fra le fasce, da disegnare sottili.
export function lineeFasce(riquadro, specchio) {
  return CONFINI.map((c) => curvaConfine(c, riquadro, specchio));
}
