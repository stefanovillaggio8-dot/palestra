/** Solo l'accredito validato del proprio profilo autenticato, senza inventare sedute. */
export function validaCreditoStreakOnline(profiloRemoto) {
  const r = profiloRemoto?.privacy?.rettifica_streak;
  if (!r || typeof r !== 'object') return null;
  const giorni=Number(r.giorni), data=String(r.data || '');
  if (!Number.isInteger(giorni) || giorni<1 || giorni>10000 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const anno=Number(data.slice(0,4)),mese=Number(data.slice(5,7)),giorno=Number(data.slice(8,10));
  const verifica=new Date(Date.UTC(anno,mese-1,giorno));
  if(verifica.getUTCFullYear()!==anno || verifica.getUTCMonth()!==mese-1 ||
     verifica.getUTCDate()!==giorno) return null;
  return {data,giorni};
}
export function profiloConCreditoStreak(profilo,credito) {
  if (!credito) return profilo;
  return {...profilo,privacy:{...(profilo?.privacy || {}),rettifica_streak:{...credito}}};
}
