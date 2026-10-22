import { readFileSync } from 'node:fs';
const s = readFileSync('C:/Users/stefa/Documents/Default Project/palestra/src/anatomia-vettoriale.js', 'utf8');
for (const nome of ['ATLANTE_FRONTE', 'ATLANTE_RETRO']) {
  const i = s.indexOf('export const ' + nome + ' = ');
  const chunk = s.slice(i, s.indexOf('\n', i) === -1 ? s.length : s.indexOf('\n', i));
  const ids = [...chunk.matchAll(/id=\\"([a-z0-9_]+)\\"/g)].map((m) => m[1]);
  const doppi = ids.filter((x, k) => ids.indexOf(x) !== k);
  console.log(nome + ': ' + ids.length + ' path con id, duplicati: ' + (doppi.length ? [...new Set(doppi)].join(', ') : 'nessuno'));
  const er = ids.filter((x) => x.includes('erector'));
  console.log('   i lombari: ' + (er.join(', ') || 'nessuno'));
}
