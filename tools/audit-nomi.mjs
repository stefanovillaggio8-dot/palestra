import { parteDiMuscolo } from '../src/muscoli-parti.js';

const nomi = [
  'Barbell Curl', 'Curl con bilanciere', 'Bilanciere curl', 'Curl bilanciere',
  'Dumbbell Curl', 'Curl manubri', 'Curl manubri seduto', 'EZ Bar Curl',
  'Preacher Curl', 'Incline Dumbbell Curl', 'Hammer Curl', 'Cable Curl',
  'One Arm Overhead Tricep Extension', 'Overhead Tricep Extension',
  'Panca inclinata manubri', 'Panca piana bilanciere', 'Military Press',
  'Pullover manubri', 'Trazioni presa stretta', 'Lat Machine',
  'Leg Curl', 'Leg Extension', 'Calf Raise', 'Crunch', 'Plank',
  'Face Pull', 'Rematore bilanciere', 'Panca Scott', 'Squat', 'Stacco',
];

for (const nome of nomi) {
  const p = parteDiMuscolo({ nome });
  const segno = p.trovata ? '  ' : '??';
  console.log(segno + ' ' + nome.padEnd(34) + ' -> ' + (p.nome || 'NON RICONOSCIUTO'));
}
