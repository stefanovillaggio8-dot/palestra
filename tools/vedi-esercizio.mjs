import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { scalaDerivata } from '../src/scala-auto.js';
import { parteDiMuscolo } from '../src/muscoli-parti.js';
import { livelloEsercizio } from '../src/rank-config.js';
import * as v2 from '../src/rank-v2/index.js';

// la riga COME SARA' nel database dopo la rinomina
const riga = {
  id: 'ex-bodyweight-overhead-tricep',
  nome: 'One Arm Overhead Tricep Extension',
  gruppo: 'One Arm Overhead Tricep Extension',
  convenzione: 'corpo_libero',
  misura: 'solo_reps',
  tipo: 'standard',
};

const c = classificaEsercizio(riga);
const p = parteDiMuscolo({ nome: riga.nome });
const scala = scalaDerivata({ id: riga.id, movimento: c.movimento, livello: c.livello, convenzione: riga.convenzione });
const r = v2.valutaEsercizio({ esercizio: riga, serie: [], pesoCorporeo: 66 });

console.log('ESERCIZIO: ' + riga.nome);
console.log('  livello   : ' + c.livello + '  -> "' + livelloEsercizio(c.livello) + '"');
console.log('  movimento : ' + c.movimento);
console.log('  muscolo   : ' + p.nome);
console.log('  scala kg  : ' + scala + (scala === 0 ? '  (i kg non esistono: si contano le ripetizioni)' : ''));
console.log('  rank      : valido=' + r.valido + '  motivo="' + r.motivo + '"');
