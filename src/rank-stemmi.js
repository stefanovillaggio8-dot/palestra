// Rank crest assets (v383). Division III is the highest; Olympian is indivisible.
// All rank graphics are pure, offline-capable SVGs in the repository.
export const GRADI_RANK = Object.freeze([
  {id:'bronze',nome:'BRONZE',divisioni:3},
  {id:'silver',nome:'SILVER',divisioni:3},
  {id:'gold',nome:'GOLD',divisioni:3},
  {id:'platinum',nome:'PLATINUM',divisioni:3},
  {id:'diamond',nome:'DIAMOND',divisioni:3},
  {id:'titan',nome:'TITAN',divisioni:3},
  {id:'olympian',nome:'OLYMPIAN',divisioni:0},
]);
const RANKS = new Map(GRADI_RANK.map(r=>[r.id,r]));
export function divisioneStemma(rankId, lp=0, divisione=null) {
  if (rankId==='olympian') return null;
  if (!RANKS.has(rankId)) return null;
  const val=divisione?.id ?? divisione?.nome ?? divisione;
  const roman={I:1,II:2,III:3};
  const parsed=roman[val]||Number(val);
  if (Number.isInteger(parsed)&&parsed>=1&&parsed<=3) return parsed;
  const points=Number(lp)||0;
  return points>=67?3:points>=34?2:1;
}
export function nomeStemma(rankId,divisione=null,lp=0) {
  const r=RANKS.get(rankId);
  if (!r) return 'SENZA RANK';
  const d=divisioneStemma(rankId,lp,divisione);
  return r.nome+(d?' '+['','I','II','III'][d]:'');
}
export function percorsoStemma(rankId,divisione=null,lp=0) {
  if (!RANKS.has(rankId)) return null;
  const d=divisioneStemma(rankId,lp,divisione);
  return './img/rank-stemmi-v383/'+rankId+(d?'-'+d:'')+'.svg?v=383';
}
export function tutteLeGraficheRank() {
  return GRADI_RANK.flatMap(rank=>rank.divisioni
    ? [1,2,3].map(divisione=>({
        id:rank.id,divisione,nome:nomeStemma(rank.id,divisione),src:percorsoStemma(rank.id,divisione),
      }))
    : [{id:rank.id,divisione:null,nome:rank.nome,src:percorsoStemma(rank.id)}]);
}
