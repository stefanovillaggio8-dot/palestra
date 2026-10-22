import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// 1. gli apostrofi nei commenti (progressi.js)
{
  const P = B + 'src/progressi.js';
  const mappa = { "cosi'": 'così', "piu'": 'più', "perche'": 'perché', "gia'": 'già', "e'": 'è' };
  const righe = readFileSync(P, 'utf8').split('\n');
  let n = 0;
  for (let i = 0; i < righe.length; i++) {
    if (!/^\s*\/\//.test(righe[i])) continue;
    const nuova = righe[i].replace(/\b(cosi'|piu'|perche'|gia'|e')/g, (m) => mappa[m] || m);
    if (nuova !== righe[i]) { righe[i] = nuova; n++; }
  }
  writeFileSync(P, righe.join('\n'), 'utf8');
  console.log('progressi.js: righe sistemate ' + n);
}

// 2. i LOMBARI: la striscia va nel RETRO (la schiena vista da dietro), non nel fronte
{
  const P = B + 'src/anatomia-vettoriale.js';
  let s = readFileSync(P, 'utf8');
  const iF = s.indexOf('export const ATLANTE_FRONTE = ');
  const iR = s.indexOf('export const ATLANTE_RETRO = ');
  const fronte = s.slice(0, iR);
  const retro = s.slice(iR);

  // via dal fronte i due path presi dall'atlante "minimal" (non combaciavano)
  const re = /<g transform=\\"scale\(0\.88102,0\.94143\)\\"><path id=\\"erector_spinae_l\\"[^]*?<\/g>/;
  const re2 = /<g transform=\\"translate\(596,0\) scale\(-0\.88102,0\.94143\)\\"><path id=\\"erector_spinae_r\\"[^]*?<\/g>/;
  let nuovoFronte = fronte.replace(re, '').replace(re2, '');
  if (nuovoFronte !== fronte) console.log('ok: dal fronte spariti i path sbagliati');

  // nel retro, la striscia disegnata da me: la colonna sta a x=298, i trapezzi
  // bassi finiscono a y=340 e i glutei cominciano a y=454, quindi la striscia
  // dei lombari sta in mezzo (y 336-456).
  const sx = 'M287,336 L285,372 L280,424 L277,456 L297,456 L297,336 Z';
  const dx = 'M309,336 L311,372 L316,424 L319,456 L299,456 L299,336 Z';
  const ancora = 'id=\\"trapezius_upper_r\\"';
  const pos = retro.indexOf(ancora);
  if (pos < 0) { console.log('NON TROVATO: il punto nel RETRO'); process.exit(1); }
  const inizio = retro.lastIndexOf('<path', pos);
  const fine = retro.indexOf('/>', pos) + 2;
  const tag = retro.slice(inizio, fine);
  const clona = (id, d) => tag
    .replace('id=\\"trapezius_upper_r\\"', 'id=\\"' + id + '\\"')
    .replace(/\sd=\\"[^"]*\\"/, ' d=\\"' + d + '\\"');
  const blocco = '\\n' + clona('erector_spinae_l', sx) + '\\n' + clona('erector_spinae_r', dx);
  const nuovoRetro = retro.slice(0, fine) + blocco + retro.slice(fine);
  writeFileSync(P, nuovoFronte + nuovoRetro, 'utf8');
  console.log('ok: la striscia dei lombari nel retro');
}
