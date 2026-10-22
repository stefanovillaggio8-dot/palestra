import { personaggioSvg } from '../src/personaggio-svg.js';
import { PREMI, nomePremio } from '../src/avatar-rpg.js';

const ids = (s) => [...s.matchAll(/data-pezzo="([\w-]+)"/g)].map((m) => m[1]);
const tit = (s) => [...s.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]);

for (const c of ['guerriero', 'berserker', 'assassino']) {
  const completo = personaggioSvg({ classe: c, sbloccati: PREMI.map((p) => p.id) });
  console.log(c);
  console.log('  pezzi :', ids(completo).join(' '));
  console.log('  nomi  :', tit(completo).join(' / '));
  console.log('  premi :', PREMI.map((p) => nomePremio(p.id, c)).join(' / '));
  console.log('');
}