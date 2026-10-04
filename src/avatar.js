// avatar.js -- il sistema degli avatar.
//
// Come aggiungerne uno (quando Ste manda le immagini):
//  1) metti il file in  img/avatar/  (per esempio  img/avatar/dragon.png )
//  2) aggiungi una riga qui sotto con id, nome, colore e img
//  3) basta: compare subito nella scelta dell'avatar, su questo dispositivo e
//     su tutti gli altri, perche' l'id scelto e' quello che va salvato
//     nell'account (non l'immagine).
//
// Un avatar senza immagine non e' un avatar rotto: viene disegnato con un
// cerchio del suo colore e le iniziali del nome.

export const AVATAR = [
  { id: 'vuoto',      nome: 'Senza volto',  colore: '#2a1f45', colore2: '#3d2f66' },
  { id: 'viola',      nome: 'Viola',       colore: '#7c5cff', colore2: '#4a2fd6' },
  { id: 'ciano',      nome: 'Ciano',       colore: '#00e5ff', colore2: '#0a84c1' },
  { id: 'oro',        nome: 'Oro',         colore: '#ffc93c', colore2: '#b8860b' },
  { id: 'rosso',      nome: 'Rosso',       colore: '#ff4d5e', colore2: '#8f1424' },
  { id: 'verde',      nome: 'Verde',       colore: '#37d18b', colore2: '#12633f' },
  { id: 'fiamma',     nome: 'Fiamma',      colore: '#ff9f45', colore2: '#c74a06' },
  { id: 'fantasma',   nome: 'Fantasma',    colore: '#c3ccdb', colore2: '#5a6478' },
];

export const AVATAR_PER_ID = new Map(AVATAR.map((a) => [a.id, a]));

export function avatarPerId(id) { return AVATAR_PER_ID.get(id) || AVATAR[0]; }
export function elencoAvatar() { return AVATAR.slice(); }

/** Il colore di sfondo dell'avatar, come gradiente CSS. */
export function gradienteAvatar(id) {
  const a = avatarPerId(id);
  return `linear-gradient(140deg, ${a.colore} 0%, ${a.colore2} 100%)`;
}

/** Le iniziali (massimo due lettere) per un nome utente. */
export function iniziali(nome) {
  const s = String(nome || '').trim();
  if (!s) return '??';
  const parti = s.split(/[\s_.-]+/).filter(Boolean);
  if (parti.length >= 2) return (parti[0][0] + parti[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

/** L'avatar di default quando un account non ne ha ancora scelto uno. */
export function avatarPredefinito(username) {
  const iniziali_ = iniziali(username);
  const id = 'colore-' + (iniziali_.charCodeAt(0) % AVATAR.length);
  const esiste = AVATAR_PER_ID.get(id);
  if (esiste) return { ...esiste, iniziali: iniziali_ };
  return { ...AVATAR[0], iniziali: iniziali_ };
}