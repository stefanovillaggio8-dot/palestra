// Mantieni la nuova fotografia del Velo della Notte anche nelle combinazioni
// con Aura Divina e Corona: i vecchi atlanti contengono l'armatura precedente.
// Le altre classi e tutte le altre armature conservano i loro percorsi originali.
export const ARMATURA_VELO_NOTTE_V528 = 'armatura-assassino-notte';

export function usaRitrattoVeloNotteV528(classe, armatura) {
  return classe === 'assassino' && armatura === ARMATURA_VELO_NOTTE_V528;
}

export const CORONA_VELO_NOTTE_V528 = './img/effetti/corona-velo-notte-v528.svg';
