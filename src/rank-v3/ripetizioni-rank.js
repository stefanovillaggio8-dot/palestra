// V422: moltiplicatore delle RIPETIZIONI REALI, senza generare 1RM
// ipotetici. Si confrontano i carichi misurati a pari esercizio rispetto
// alla serie da 8 ripetizioni (moltiplicatore 1).
//
// Nuzzo et al., Sports Medicine 2024, doi:10.1007/s40279-023-01937-7:
// 269 studi, 7289 soggetti: a circa 80% 1RM, media ~8.8 reps sulla
// bench press e ~13.1 sulla leg press. E' una differenza di endurance,
// NON un coefficiente di Rank validato. La correzione 8.8/13.1 qui e'
// una scelta prudenziale del modello, trasparente e testabile.
// Per gli altri movimenti manteniamo l'esponente 0.20 approvato in v420.
// Oltre 12 reps l'evidenza e la variabilita' tecnica non giustificano
// una progressione illimitata: la curva cresce con pendenza attenuata.
export const RIP_RIFERIMENTO_RANK = 8;
export const ESPONENTE_BASE_RANK = 0.20;
export const FATTORE_ENDURANCE_PRESSA = 8.8 / 13.1;
export const ESPONENTE_PRESSA = ESPONENTE_BASE_RANK * FATTORE_ENDURANCE_PRESSA;

const ISOLAMENTI = new Set([
  'bicipiti','bicipiti_panca','tricipiti','tricipiti_alta',
  'petto_isolamento','spalle_isolamento','spalle_posteriori',
  'polso','polpacci','gambe_isolamento','gambe_curl',
  'addome','core',
]);

export function modelloRipetizioniRank(movimento, esercizio = {}, standard = null) {
  const e = esercizio || {};
  const oneArmPreacher = Array.isArray(standard?.soglie1RMPerPeso)
    && /preacher|scott/i.test(String(e.nome || '') + ' ' + String(e.id || ''))
    && (e.id === 'ex-one-arm-preacher-curl' || /one.arm|single.arm/i.test(e.nome || ''));
  if (oneArmPreacher) return {
    tipo:'isolamento_preacher', esponente: ESPONENTE_BASE_RANK,
    massimo:12, oltre12:0, fonte:'curva_conservativa',
    avviso: 'Oltre 12 ripetizioni non vengono dati ulteriori punti: non esistono dati tecnici abbastanza omogenei.',
  };
  const pressaBilateral = movimento === 'gambe_pressa' && e.convenzione !== 'per_gamba';
  if (pressaBilateral) return {
    tipo:'pressa_bilaterale', esponente:ESPONENTE_PRESSA,
    massimo:20, oltre12:0.35, fonte:'meta_regressione_adattata',
    avviso: 'La leg press consente mediamente piu ripetizioni della panca a parita di carico relativo; coefficiente approssimato, non empiricamente validato per la tua macchina.',
  };
  const isolamento = ISOLAMENTI.has(movimento);
  return {
    tipo: isolamento ? 'isolamento_generale' : 'movimento_generale',
    esponente: ESPONENTE_BASE_RANK,
    massimo: isolamento ? 15 : 20,
    oltre12: 0.35,
    fonte:'modello_conservativo',
    avviso:'Dopo 12 ripetizioni il guadagno di punteggio rallenta: il confronto fra serie molto lunghe e molto pesanti e poco preciso.',
  };
}

export function ripetizioniPieneRank(reps, modello = null) {
  const m = modello || modelloRipetizioniRank(null);
  const r = Math.floor(Number(reps));
  if (!Number.isFinite(r) || r < 1) return 0;
  const limite = Number.isFinite(m.massimo) ? Math.min(Math.max(1,m.massimo),40) : 20;
  const rValido = Math.min(r, limite);
  const ex = Number.isFinite(m.esponente) ? m.esponente : ESPONENTE_BASE_RANK;
  if (rValido <= 12) return Math.pow(rValido / RIP_RIFERIMENTO_RANK, ex);
  const base = Math.pow(12 / RIP_RIFERIMENTO_RANK, ex);
  return base * Math.pow(rValido / 12, ex * (m.oltre12 ?? .35));
}
