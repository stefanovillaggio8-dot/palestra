import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js';
let s = readFileSync(P, 'utf8');

// 1. via i path presi dal "minimal" (non combaciavano con la figura)
const re = /<g transform=\\"(?:scale\(0\.88102,0\.94143\)|translate\(596,0\) scale\(-0\.88102,0\.94143\))\\">\s*<path id=\\"erector_spinae_[lr]\\" d=\\"[^"]+\\" fill=\\"#BDBDBD\\" \/><\/g>\s*/g;
if (!re.test(s)) { console.log('non ci sono i path da togliere'); }
s = s.replace(re, '');

// 2. la striscia dei lombari, disegnata da me sulla figura giusta
//    (la colonna sta a x=298: i trapezi bassi finiscono a y=340, i glutei
//     cominciano a y=454. I lombari stanno in mezzo, ai due lati della spine.)
const sx = 'M287,336 L285,372 L280,424 L277,456 L297,456 L297,336 Z';
const dx = 'M309,336 L311,372 L316,424 L319,456 L299,456 L299,336 Z';
const gruppo = '<g>\n'
  + '  <path id=\\"erector_spinae_l\\" d=\\"' + sx + '\\" fill=\\"#BDBDBD\\" />\n'
  + '  <path id=\\"erector_spinae_r\\" d=\\"' + dx + '\\" fill=\\"#BDBDBD\\" />\n'
  + '</g>';

// lo metto nel RETRO, dopo i trapezi alti
const iR = s.indexOf('export const ATLANTE_RETRO = ');
const retro = s.slice(iR);
const ancora = 'id=\\"trapezius_upper_r\\"';
const pos = retro.indexOf(ancora);
const fine = retro.indexOf('/>', pos) + 2;
const nuovoRetro = retro.slice(0, fine) + '\n' + gruppo + retro.slice(fine);
s = s.slice(0, iR) + nuovoRetro;
writeFileSync(P, s, 'utf8');
console.log('ok: la striscia dei lombari disegnata sulla figura (x 277-319, y 336-456)');

// 3. la sagoma (per la foto) aggiornata alla zona giusta
{
  const M = 'C:/Users/stefa/Documents/Default Project/palestra/src/mappa-muscoli.js';
  let t = readFileSync(M, 'utf8');
  const V = '    sagoma: [[262,465],[334,465],[340,490],[336,552],[300,558],[264,552],[258,490]],';
  const N = '    sagoma: [[277,336],[319,336],[319,456],[277,456]],';
  if (t.includes(V)) {
    t = t.replace(V, N);
    writeFileSync(M, t, 'utf8');
    console.log('ok: la sagoma dei lombari');
  }
}
