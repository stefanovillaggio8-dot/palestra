import { readFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const { validaPacchetto } = await import('../src/backup.js');

const f = process.env.USERPROFILE + '/Downloads/palestra-backup-2026-10-22-corretto.json';
const b = JSON.parse(readFileSync(f, 'utf8'));
const v = validaPacchetto(b);
console.log('validazione: ' + JSON.stringify(v).slice(0, 400));
if (v.problemi && v.problemi.length) console.log('problemi: ' + v.problemi.join(' | '));

const T = b.tabelle || b;
const sedute = T.sedute || [];
const previsti = [2, 3, 5, 6];
const vivi = new Set(sedute.filter((s) => !s.eliminata && s.stato === 'completata')
  .map((s) => String(s.data).slice(0, 10)));
const iso = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
let streak = 0;
const giorni = [];
const oggi = new Date();
for (let i = 0; i < 40; i++) {
  const x = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - i);
  if (!previsti.includes(x.getDay())) continue;
  const s = iso(x);
  if (vivi.has(s)) { streak++; giorni.push(s); continue; }
  break;
}
console.log('\nla streak con il backup corretto: ' + streak);
console.log('i giorni: ' + giorni.join(', '));
console.log('la seduta del 20 esiste: ' + (vivi.has('2026-10-20') ? 'si' : 'NO'));
console.log('la seduta del 21 esiste: ' + (vivi.has('2026-10-21') ? 'si' : 'NO'));
