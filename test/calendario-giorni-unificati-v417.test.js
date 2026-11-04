import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaStreak } from '../src/streak.js';
import { bloccoCalendario } from '../tools/app-strumenti.mjs';
import { perClasse, montaDom } from './dom-minimo.js';

montaDom();

const oggi = new Date();
const iso = [oggi.getFullYear(),String(oggi.getMonth()+1).padStart(2,'0'),
  String(oggi.getDate()).padStart(2,'0')].join('-');

test('v417: un giorno riconosciuto vale come allenato senza una seduta fittizia', () => {
  const profilo = {
    giorni_allenamento:[oggi.getDay()],
    privacy:{giorni_streak_accreditati:[iso]},
  };
  const stato=calcolaStreak([],iso,profilo);
  assert.deepEqual(stato.giorniAllenati,[iso]);
  assert.equal(stato.giorni,1);
  assert.deepEqual(stato.giorniAccreditati,[iso]);

  const box=bloccoCalendario(profilo,{streak:stato});
  const celle=perClasse(box,'cella-calendario');
  const oggiCella=celle.find(c => c.getAttribute('title')?.startsWith(String(oggi.getDate())+'/')
    && String(c.className).includes('oggi'));
  assert.ok(oggiCella,'la data riconosciuta deve essere visibile nel calendario');
  assert.ok(oggiCella.classList.contains('fatto'),'stesso verde dei giorni allenati');
  assert.ok(!oggiCella.classList.contains('accreditato'),'nessun bordo diverso');
  assert.match(oggiCella.getAttribute('title')||'',/allenato/);
  assert.match(oggiCella.getAttribute('aria-label')||'',/allenato/);
  const conteggi=perClasse(box,'calendario-conto');
  assert.ok(conteggi.some(n=>/1 giornata/.test(n.textContent||'')),'contato nel mese');
  assert.ok(!/giorno accreditato/i.test(box.textContent||''),'niente etichetta separata');
});

test('v417: la legenda e il calendario hanno un solo tipo di giorno allenato',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../stile.css',import.meta.url),'utf8');
  const a=app.indexOf('export function bloccoCalendario(');
  const b=app.indexOf('function dettaglioGiorno(',a);
  const cal=app.slice(a,b);
  assert.ok(a>=0&&b>a);
  assert.match(cal,/const giorniFatti = new Set\(\(st\.streak && st\.streak\.giorniAllenati\) \|\| \[\]\)/);
  assert.match(cal,/bloccoMese\(anno, m, previsti, giorniFatti, oggi\)/);
  assert.match(cal,/dettaglioGiorno\(statoCalendario\.giorno, giorniFatti\)/);
  assert.doesNotMatch(cal,/giorniAccreditati|legenda-accreditato|giorno accreditato|classi\.push\('accreditato'\)/i);
  assert.doesNotMatch(css,/\.cella-calendario\.accreditato|\.legenda-accreditato/);
  assert.match(app,/Giorno allenato\. Non ci sono serie registrate da mostrare\./);
});

test('v417: giorni doppi contati una sola volta, nessuna serie inventata',()=>{
  const profilo={giorni_allenamento:[oggi.getDay()],privacy:{giorni_streak_accreditati:[iso,iso]}};
  const sedute=[{data:iso,stato:'completata',id:'set-originale'}];
  const s=calcolaStreak(sedute,iso,profilo);
  assert.equal(s.giorniAllenati.filter(d=>d===iso).length,1);
  assert.equal(s.giorni,1);
  assert.equal(sedute.length,1);
});

