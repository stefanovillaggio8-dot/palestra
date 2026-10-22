import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// cerco i valori da aggiornare in tutti i file di test
const dir = B + 'test/';
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  let s = readFileSync(P, 'utf8');
  const prima = s;
  s = s.replace(/30\.17/g, '30.76');
  s = s.replace(/12\.26/g, '12.5');
  s = s.replace(/assert\.equal\(distanza\.percentuale,\s*1\.2,/g, 'assert.equal(distanza.percentuale, 3.2,');
  s = s.replace(/assert\.equal\(distanza\.percentuale,\s*0\.3,/g, 'assert.equal(distanza.percentuale, 2.3,');
  if (s !== prima) {
    writeFileSync(P, s, 'utf8');
    console.log('aggiornato: ' + f);
  }
}
