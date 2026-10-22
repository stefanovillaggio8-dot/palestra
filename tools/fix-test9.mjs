import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const dir = B + 'test/';

// Cerco le asserzioni dal MESSAGGIO (che e' unico) e cambio il valore che
// c'era dentro. La scala e' cambiata (ora e' allometrica), quindi i numeri
// attesi nei test cambiano: e' la cosa voluta.
const CAMBIA = [
  [/a 65 kg lo stesso punteggio e' platino/, "'platinum'", "'gold'"],
  [/Chest Press: il riferimento e' cambiato \(era 50\)/, '50', '48.07'],
];

for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  let s = readFileSync(P, 'utf8');
  const prima = s;
  for (const [msg, vecchio, nuovo] of CAMBIA) {
    const re = new RegExp('assert[^\\n]*' + msg.source + '[^\\n]*');
    s = s.replace(re, (riga) => riga.replace(vecchio, nuovo));
  }
  if (s !== prima) {
    writeFileSync(P, s, 'utf8');
    console.log('aggiornato: ' + f);
  }
}
