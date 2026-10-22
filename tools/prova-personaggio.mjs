import { personaggioSvg } from '../src/personaggio-svg.js';
import { PREMI } from '../src/avatar-rpg.js';

const ids = (s) => [...s.matchAll(/data-pezzo="([\w-]+)"/g)].map((m) => m[1]);

console.log('premi:', PREMI.map((p) => p.id).join(', '));
console.log('vuoto: ', ids(personaggioSvg({ classe: 'guerriero', sbloccati: [] })).join(', '));
console.log('ferro:  ', ids(personaggioSvg({ classe: 'guerriero', sbloccati: ['ferro'] })).join(', '));
console.log('bracc+ferro:', ids(personaggioSvg({ classe: 'guerriero', sbloccati: ['bracciali', 'ferro'] })).join(', '));
console.log('tutti:  ', ids(personaggioSvg({ classe: 'guerriero', sbloccati: PREMI.map((p) => p.id) })).join(', '));