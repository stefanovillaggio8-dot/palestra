// Cosmetici aggiuntivi: nessuna scrittura di progressi, inventario o saldo.
const REQUISITI = Object.freeze({
  'armatura-guerriero-braci': [15, 'braci'],
  'armatura-guerriero-abisso': [50, 'abisso'],
  'armatura-assassino-notte': [15, 'notte'],
  'armatura-assassino-spettro': [50, 'cremisi'],
  'armatura-berserker-rabbia': [15, 'rabbia'],
  'armatura-berserker-apocalisse': [50, 'apocalisse'],
  'skin-mitica': [80, 'astrale'],
});

export function requisitoSkin(id) { return REQUISITI[id]?.[0] || 0; }
export function scenarioSkin(id) {
  return REQUISITI[id] ? './img/scenari/' + REQUISITI[id][1] + '.svg' : null;
}
export function accessoSkin(oggetto, stato, classe, posseduto = false) {
  const valore = Number(stato?.streak?.record);
  const record = Number.isFinite(valore) ? Math.max(0, Math.floor(valore)) : 0;
  const richiesto = requisitoSkin(oggetto.id);
  const compatibile = !oggetto.classe || oggetto.classe === classe;
  const streakRaggiunta = record >= richiesto;
  return {
    record, richiesto, mancanti: Math.max(0, richiesto - record),
    streakRaggiunta, compatibile, posseduto,
    equipaggiabile: posseduto && compatibile,
    acquistabile: !posseduto && compatibile && streakRaggiunta && Number(stato?.aura) >= oggetto.prezzo,
  };
}
