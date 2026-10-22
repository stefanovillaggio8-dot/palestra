import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const dir = B + 'test/';

// i valori che cambiano con la scala allometrica (ogni esercizio ha il suo)
const CAMBIA = { '30.17': '30.76', '12.26': '12.5', '86.74': '88.44', '34.62': '35.3' };

for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  let s = readFileSync(P, 'utf8');
  const prima = s;
  for (const [a, b] of Object.entries(CAMBIA)) {
    s = s.split(a).join(b);
  }
  s = s.replace(/distanza\.percentuale,\s*1\.2/g, 'distanza.percentuale, 3.2');
  s = s.replace(/distanza\.percentuale,\s*0\.3/g, 'distanza.percentuale, 2.3');
  if (s !== prima) {
    writeFileSync(P, s, 'utf8');
    console.log('aggiornato: ' + f);
  }
}
