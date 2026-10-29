/** Ordine ufficiale dell'Aura Shop: dall'oggetto più comune al più raro.
 * Non modifica l'elenco originale, i prezzi, le proprietà o gli sblocchi.
 */
export const ORDINE_RARITA_AURA = Object.freeze(['Comune','Raro','Epico','Leggendario','Mitico']);
export function ordinaPerRaritaAura(oggetti=[]) {
  const rango=Object.fromEntries(ORDINE_RARITA_AURA.map((r,i)=>[r,i]));
  return [...oggetti].sort((a,b)=>
    (rango[a.rarita]??99)-(rango[b.rarita]??99) ||
    (Number(a.prezzo)||0)-(Number(b.prezzo)||0) ||
    String(a.nome||'').localeCompare(String(b.nome||''),'it')
  );
}

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
  // Per gli acquisti conta la Streak CORRENTE: dopo una giornata prevista
  // saltata torna a zero, anche se il record storico era molto alto.
  // L'inventario già acquistato rimane invece equipaggiabile per sempre.
  const valore = Number(stato?.streak?.giorni);
  const streakAttuale = Number.isFinite(valore) ? Math.max(0, Math.floor(valore)) : 0;
  const richiesto = requisitoSkin(oggetto.id);
  const compatibile = !oggetto.classe || oggetto.classe === classe;
  const streakRaggiunta = streakAttuale >= richiesto;
  return {
    streakAttuale, richiesto, mancanti: Math.max(0, richiesto - streakAttuale),
    streakRaggiunta, compatibile, posseduto,
    equipaggiabile: posseduto && compatibile,
    acquistabile: !posseduto && compatibile && streakRaggiunta && Number(stato?.aura) >= oggetto.prezzo,
  };
}


// La Corona è una ricompensa gratuita, distinta da Skin, Armatura, Effetto
// e Titolo. Il valore 'nessuna' conserva la scelta di disequipaggiarla,
// anche dopo che si sono raggiunti gli 80 giorni.
export const CORONA_INFINITO_ID = 'corona-infinito';
export function statoCoronaInfinito(equipaggiamento, record, anteprima = false) {
  const giorni = Math.max(0, Number(record) || 0);
  const sbloccata = giorni >= 80;
  const scelta = equipaggiamento?.Corona;
  return {
    giorni, sbloccata,
    equipaggiata: sbloccata && (scelta === undefined || scelta === CORONA_INFINITO_ID),
    visibile: Boolean(anteprima || (sbloccata && (scelta === undefined || scelta === CORONA_INFINITO_ID))),
  };
}
export function cambiaCoronaInfinito(equipaggiamento, equipaggia, record) {
  if (equipaggia && Math.max(0, Number(record) || 0) < 80) {
    throw new Error('La Corona dell’Infinito richiede 80 giorni di record Streak.');
  }
  return { ...(equipaggiamento || {}), Corona: equipaggia ? CORONA_INFINITO_ID : 'nessuna' };
}
