import { parteDiMuscolo } from '../src/muscoli-parti.js';
import { righeDaAccendere, figurino, FOTO_L } from '../src/mappa-muscoli.js';

const p = parteDiMuscolo({ nome: 'Hyperextension' });
console.log('principale:', p.parte, '| anche:', JSON.stringify(p.anche), '| anatomia:', JSON.stringify(p.anatomia));

// le righe che il disegno accende, con il loro livello
const righe = righeDaAccendere(p.parte, null, p.anatomia);
console.log('\nrighe accese:');
for (const r of righe) {
  console.log('  ', r.id, '| zona:', (r.zone || []).join(','), '| livello:', r.livello, '| foto:', r.foto || '-');
}
