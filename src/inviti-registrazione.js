// Collegamento robusto dopo conferma email. Non attribuisce mai amicizie
// senza il token: l'accettazione e' verificata dalla RPC autenticata sul server.
const BASE = 'https://stefanovillaggio8-dot.github.io/palestra/index.html?p=1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function preparaRegistrazioneInvitata({ invito = '', persona = null } = {}) {
  const token = UUID.test(String(invito || '')) ? String(invito) : '';
  const p = persona || {};
  const nome = p.creata ? String(p.nome || '').trim().slice(0, 80) : '';
  const chiave = p.creata && /^[a-z0-9]{4,32}$/i.test(String(p.chiave || ''))
    ? String(p.chiave) : '';
  const andrea = !p.creata && Number(p.id) === 2;
  const url = new URL(BASE);
  const data = {};
  if (token) {
    url.searchParams.set('inv', token);
    data.palestra_invito = token;
    if (nome && chiave) {
      url.searchParams.delete('p');
      url.searchParams.set('n', nome);
      url.searchParams.set('k', chiave);
      data.palestra_nome = nome;
      data.palestra_chiave = chiave;
    } else if (andrea) {
      url.searchParams.set('p', '2');
      data.palestra_profilo = 'andrea';
    }
  }
  return { redirectTo: url.toString(), data };
}

export function ripristinaRegistrazioneInvitata(utente) {
  const data = utente && utente.user_metadata && typeof utente.user_metadata === 'object'
    ? utente.user_metadata : {};
  const invito = String(data.palestra_invito || '');
  if (!UUID.test(invito)) return null;
  const nome = String(data.palestra_nome || '').trim();
  const chiave = String(data.palestra_chiave || '');
  let memoria = null;
  if (nome && nome.length <= 80 && /^[a-z0-9]{4,32}$/i.test(chiave)) {
    memoria = { n: nome, k: chiave };
  } else if (data.palestra_profilo === 'andrea') {
    memoria = { p: 2 };
  }
  return { invito, memoria };
}
