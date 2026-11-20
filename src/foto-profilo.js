// Foto personali del profilo: distinte dal personaggio RPG e dagli avatar a colori.
// Il database conserva solo un piccolo identificatore, mai i byte della foto.

export const BUCKET_FOTO_PROFILO = 'palestra-foto-profilo';
export const DIMENSIONE_FOTO_PROFILO = 256;
export const MASSIMO_FOTO_ORIGINALE = 15 * 1024 * 1024;
export const MASSIMO_FOTO_COMPRESSA = 200 * 1024;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const PERCORSO = new RegExp(`^foto:(${UUID})\/(${UUID})\\.webp$`, 'i');

/** Non interpretare un ID profilo come URL arbitrario o HTML. */
export function percorsoFotoProfilo(avatarId) {
  const match = PERCORSO.exec(String(avatarId || ''));
  return match ? `${match[1].toLowerCase()}/${match[2].toLowerCase()}.webp` : null;
}

export function urlFotoProfilo(avatarId, urlSupabase) {
  const percorso = percorsoFotoProfilo(avatarId);
  if (!percorso) return null;
  try {
    const base = new URL(urlSupabase);
    if (base.protocol !== 'https:') return null;
    return `${base.origin}/storage/v1/object/public/${BUCKET_FOTO_PROFILO}/${percorso}`;
  } catch { return null; }
}

export function validaFileFotoProfilo(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0 || file.size > MASSIMO_FOTO_ORIGINALE) {
    throw new Error('Scegli una foto di massimo 15 MB.');
  }
  const tipo = String(file.type || '').toLowerCase();
  const nome = String(file.name || '').toLowerCase();
  const formati = new Set(['image/jpeg', 'image/png', 'image/webp',
    'image/heic', 'image/heif', 'image/avif']);
  if (tipo ? !formati.has(tipo) : !/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(nome)) {
    throw new Error('Il file deve essere una foto.');
  }
}

/** Ritaglio centrale quadrato: leggero su iPhone e uguale su ogni dispositivo. */
export async function comprimiFotoProfilo(file) {
  validaFileFotoProfilo(file);
  if (typeof Image === 'undefined' || typeof document === 'undefined'
      || typeof URL.createObjectURL !== 'function') {
    throw new Error('Questo dispositivo non supporta la preparazione delle foto.');
  }
  const url = URL.createObjectURL(file);
  let foto;
  try {
    foto = await new Promise((resolve, reject) => {
      const immagine = new Image();
      immagine.onload = () => resolve(immagine);
      immagine.onerror = () => reject(new Error('Non riesco ad aprire questa foto. Prova con JPG o PNG.'));
      immagine.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
  const larghezza = foto.naturalWidth || foto.width;
  const altezza = foto.naturalHeight || foto.height;
  if (!(larghezza > 0 && altezza > 0)) throw new Error('La foto non ha dimensioni valide.');
  const canvas = document.createElement('canvas');
  canvas.width = DIMENSIONE_FOTO_PROFILO;
  canvas.height = DIMENSIONE_FOTO_PROFILO;
  const contesto = canvas.getContext('2d');
  if (!contesto) throw new Error('Non riesco a preparare la foto su questo dispositivo.');
  const lato = Math.min(larghezza, altezza);
  contesto.drawImage(foto, (larghezza - lato) / 2, (altezza - lato) / 2,
    lato, lato, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.8));
  if (!blob || blob.type !== 'image/webp' || blob.size <= 0 || blob.size > MASSIMO_FOTO_COMPRESSA) {
    throw new Error('Non riesco a comprimere questa foto. Prova con un’altra immagine.');
  }
  return blob;
}
