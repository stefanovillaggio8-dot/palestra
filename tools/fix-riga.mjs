import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js';
let s = readFileSync(P, 'utf8');

// il blocco inserito ha dei newline VERI dentro la stringa: li metto come \n
const re = /<g>\n\s*<path id=\\"erector_spinae_l\\" d=\\"([^"]+)\\" fill=\\"#BDBDBD\\" \/>\n\s*<path id=\\"erector_spinae_r\\" d=\\"([^"]+)\\" fill=\\"#BDBDBD\\" \/>\n\s*<\/g>/;
const m = s.match(re);
if (!m) { console.log('non trovo il blocco rotto'); process.exit(1); }
const blocco = '<g>\\n  <path id=\\"erector_spinae_l\\" d=\\"' + m[1] + '\\" fill=\\"#BDBDBD\\" />\\n'
  + '  <path id=\\"erector_spinae_r\\" d=\\"' + m[2] + '\\" fill=\\"#BDBDBD\\" />\\n</g>';
s = s.replace(m[0], blocco);
writeFileSync(P, s, 'utf8');
console.log('ok: il blocco dei lombari ora sta sulla stessa riga (stringa a pezzi)');
