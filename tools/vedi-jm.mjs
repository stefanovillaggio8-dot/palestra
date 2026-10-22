import { parteDiMuscolo } from '../src/muscoli-parti.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';

console.log('JM Press  ->', JSON.stringify(parteDiMuscolo({ nome: 'JM Press' }).trovata), parteDiMuscolo({ nome: 'JM Press' }).parte);
console.log('classifica ->', JSON.stringify(classificaEsercizio({ nome: 'JM Press' }).movimento));
