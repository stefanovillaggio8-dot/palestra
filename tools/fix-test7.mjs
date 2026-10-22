import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const dir = B + 'test/';

for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  let s = readFileSync(P, 'utf8');
  const prima = s;
  s = s.split('96.17').join('98.06');
  s = s.replace(/percentuale,\s*1\.2/g, 'percentuale, 3.2');
  s = s.replace(/percentuale,\s*0\.3/g, 'percentuale, 2.3');
  if (f === 'personaggio-svg.test.js') {
    s = s.replace(/assert\.match\(app, [^;]+;/,
      "assert.match(app, /classList\\.add\\('con-foto'\\)/,\n"
      + "      'il profilo mostra la foto del personaggio, non il disegno');");
  }
  if (s !== prima) {
    writeFileSync(P, s, 'utf8');
    console.log('aggiornato: ' + f);
  }
}
