import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js';
let s = readFileSync(P, 'utf8');

const iF = s.indexOf('export const ATLANTE_FRONTE = ');
const iR = s.indexOf('export const ATLANTE_RETRO = ');
const fronte = s.slice(0, iR);
const retro = s.slice(iR);

// 1. tiro fuori i due gruppi dei lombari dal FRONTE
const re = /<g transform=\\"(?:scale\(0\.88102,0\.94143\)|translate\(596,0\) scale\(-0\.88102,0\.94143\))\\">\s*<path id=\\"erector_spinae_[lr]\\" d=\\"[^"]+\\" fill=\\"#BDBDBD\\" \/><\/g>/g;
const trovati = [...fronte.matchAll(re)];
if (!trovati.length) { console.log('non trovo i gruppi dei lombari nel FRONTE'); process.exit(1); }
let nuovoFronte = fronte.replace(re, '');
const blocco = trovati.map((m) => m[0]).join('');

// 2. li metto nel RETRO, dopo i trapezi alti
const ancora = 'id=\\"trapezius_upper_r\\"';
const pos = retro.indexOf(ancora);
if (pos < 0) { console.log('non trovo l\'ancora nel RETRO'); process.exit(1); }
const fine = retro.indexOf('/>', pos) + 2;
let nuovoRetro = retro.slice(0, fine) + '\n' + blocco + retro.slice(fine);

writeFileSync(P, nuovoFronte + nuovoRetro, 'utf8');
console.log('ok: i lombari ora sono nel RETRO (la schiena vista da dietro)');
