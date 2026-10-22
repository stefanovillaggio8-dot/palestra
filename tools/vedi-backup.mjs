import { readFileSync } from 'node:fs';

const f = process.env.USERPROFILE + '/Downloads/palestra-backup-2026-10-19.json';
const b = JSON.parse(readFileSync(f, 'utf8'));
console.log('chiavi:', Object.keys(b).join(', '));
const T = b.tabelle || b;
const sedute = T.sedute || [];
console.log('sedute nel backup: ' + sedute.length);
const ordinate = [...sedute].sort((a, c) => String(a.data).localeCompare(String(c.data)));
console.log('\nle ultime 12 sedute:');
for (const s of ordinate.slice(-12)) {
  console.log('  ' + String(s.data) + '  ' + String(s.nome_giorno || '-').padEnd(22)
    + ' eliminata=' + s.eliminata + '  stato=' + s.stato + '  durata=' + s.durata_secondi
    + '  id=' + String(s.id).slice(0, 12));
}
console.log('\nle date in uniq: ' + [...new Set(ordinate.map((s) => s.data))].slice(-12).join(', '));
