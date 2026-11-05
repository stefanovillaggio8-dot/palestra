// Classifica personale in tempo reale: include le serie gia' spuntate
// nell'allenamento in corso senza considerarle sedute completate per XP/Aura.
// Non altera mai il database e non anticipa ricompense o streak.
import { gruppiDaSerie } from './gioco.js';

export function gruppiRankInTempoReale(sedute = [], serie = [], esercizi = []) {
  const valide = (sedute || []).filter(s => s && !s.eliminata
    && (s.stato === 'completata' || s.stato === 'in_corso'));
  const aperte = new Set(valide.filter(s => s.stato === 'in_corso').map(s => s.id));
  const normali = valide.map(s => s.stato === 'in_corso'
    ? { ...s, stato: 'completata' } : s);
  const confermate = (serie || []).filter(s => s && !s.eliminata
    && (!aperte.has(s.seduta_id) || s.stato === 'fatta'));
  return gruppiDaSerie(normali, confermate, esercizi);
}

export function haSerieRankProvvisorie(sedute = [], serie = []) {
  const aperte = new Set((sedute || []).filter(s => s
    && !s.eliminata && s.stato === 'in_corso').map(s => s.id));
  return (serie || []).some(s => s && !s.eliminata
    && s.stato === 'fatta' && aperte.has(s.seduta_id));
}
