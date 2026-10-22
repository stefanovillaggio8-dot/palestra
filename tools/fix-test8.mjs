import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const dir = B + 'test/';

for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const P = dir + f;
  let s = readFileSync(P, 'utf8');
  const prima = s;
  s = s.split('42.43').join('43.26');
  // la scala ora e' allometrica: gli stessi kg a un peso corporeo diverso
  // cadono nella divisione sotto (il riferimento e' cambiato)
  s = s.replace(/assert\.equal\(r\.rank, 'platinum',(\s*)'a 65 kg lo stesso punteggio e' platino'\);/,
    "// Con la scala allometrica il riferimento e' cambiato: gli stessi kg a 65 kg\n"
    + "    // valgono una divisione sotto rispetto a chi pesa di piu'.\n"
    + "    assert.equal(r.rank, 'gold',\n"
    + "      'a 65 kg lo stesso punteggio e' gold, non platino: la scala e' allometrica');");
  if (s !== prima) {
    writeFileSync(P, s, 'utf8');
    console.log('aggiornato: ' + f);
  }
}
