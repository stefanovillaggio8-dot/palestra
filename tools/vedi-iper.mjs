import { parteDiMuscolo } from '../src/muscoli-parti.js';
import { MOVIMENTI } from '../src/muscoli-parti.js';

const p = parteDiMuscolo({ nome: 'Hyperextension' });
console.log('--- l\'iperextensione ---');
console.log('parte (il principale):', p.parte, '| muscolo:', p.muscolo);
console.log('secondari:', JSON.stringify(p.anche || []));
console.log('anatomia:', JSON.stringify(p.anatomia || {}));

// il movimento che contiene la parola
const mv = MOVIMENTI.find((m) => (m.parole || []).some((w) => 'hyperextension'.includes(w) || w.includes('hyperextension')));
console.log('\n--- il movimento ---');
console.log('id:', mv && mv.id);
console.log('secondari:', mv ? JSON.stringify(mv.secondari) : 'nessuno');
console.log('parole:', mv ? mv.parole.filter((w) => w.includes('hyper') || w.includes('glute') || w.includes('back ext')).join(', ') : '');
