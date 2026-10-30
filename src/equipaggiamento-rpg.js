// Regole centralizzate: un oggetto per slot, senza perdere oggetti acquistati.
export const ASTRAL_ID='skin-mitica';
export const SLOT_RPG=Object.freeze(['Armatura','Skin','Effetto','Titolo']);
export function slotPerOggettoRpg(oggetto) {
  if(oggetto?.id===ASTRAL_ID)return 'Effetto';
  const tipo=oggetto?.tipo;
  return SLOT_RPG.includes(tipo)?tipo:null;
}
export function equipaggiamentoRpgUnico(raw={}) {
  const input=raw&&typeof raw==='object'?raw:{};
  const out={...input};
  // Il catalogo precedente collocava Astrale negli slot Skin e Astrale.
  // Un effetto normale precedentemente equipaggiato NON va cancellato:
  // rimane la scelta corrente, mentre Astrale resta nell'inventario.
  if(!out.Effetto&&(out.Astrale===ASTRAL_ID||out.Skin===ASTRAL_ID))
    out.Effetto=ASTRAL_ID;
  delete out.Astrale;
  if(out.Skin===ASTRAL_ID)delete out.Skin;
  return out;
}
export function aggiornaEquipaggiamentoRpg(raw,oggetto,attiva=true){
  const slot=slotPerOggettoRpg(oggetto);
  if(!slot)throw new Error('Categoria di equipaggiamento sconosciuta');
  const out=equipaggiamentoRpgUnico(raw);
  if(attiva)out[slot]=oggetto.id;
  else if(out[slot]===oggetto.id)delete out[slot];
  return out;
}
