// Infos de l'établissement (frais, règles) : fonctions pures, voir sql/announcements.sql.

export const CATEGORIES = [
  { key: 'frais', label: 'Frais', hint: 'Un montant à payer (relevé de notes, documents, inscription…)' },
  { key: 'reglement', label: 'Règlement', hint: 'Une règle nouvelle ou rappelée (uniforme, horaires, discipline…)' },
  { key: 'autre', label: 'Autre info', hint: 'Toute autre information aux familles' },
];

export const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label ?? 'Info';

export const TITLE_MAX = 150;
export const BODY_MAX = 4000;

/** Table absente : sql/announcements.sql n'a pas encore été exécuté (fonction non installée). */
export function isAbsentAnnouncements(error) {
  return ['42P01', 'PGRST205'].includes(error?.code) || /announcements/i.test(String(error?.message ?? '')) && /not find|does not exist/i.test(String(error?.message ?? ''));
}

/** « 1 500 FCFA » (espace insécable fine entre les milliers). */
export function formatFcfa(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')} FCFA`;
}

/** Publiée il y a moins de `days` jours (pastille « Nouveau »). */
export function isRecent(iso, days = 7, now = Date.now()) {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && now - time < days * 86400000 && now - time >= -60000;
}

/** Date limite : « à régler avant le 15 novembre 2026 », « échéance dépassée », ou null. */
export function deadlineText(deadline, now = new Date()) {
  if (!deadline) return null;
  const [y, m, d] = String(deadline).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const label = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return date < today ? { text: `Échéance dépassée (${label})`, late: true } : { text: `À régler avant le ${label}`, late: false };
}

/** Message d'erreur du formulaire, ou null si valide. */
export function validateAnnouncement({ title, body, category, amount }) {
  if (!String(title ?? '').trim()) return 'Le titre est obligatoire.';
  if (String(title).trim().length > TITLE_MAX) return `Le titre est trop long (${TITLE_MAX} caractères maximum).`;
  if (!String(body ?? '').trim()) return 'Le texte est obligatoire.';
  if (String(body).trim().length > BODY_MAX) return `Le texte est trop long (${BODY_MAX} caractères maximum).`;
  if (amount !== '' && amount != null) {
    if (category !== 'frais') return 'Un montant ne se renseigne que pour un frais.';
    if (!/^\d+$/.test(String(amount).replace(/\s/g, ''))) return 'Le montant doit être un nombre entier de FCFA, sans virgule.';
    if (Number(String(amount).replace(/\s/g, '')) > 100000000) return 'Le montant est trop élevé.';
  }
  return null;
}

/** Ligne à envoyer à la base à partir du formulaire (la base fixe l'auteur et les dates). */
export function toRow({ title, body, category, amount, deadline, classId }) {
  const cleanAmount = amount === '' || amount == null || category !== 'frais' ? null : Number(String(amount).replace(/\s/g, ''));
  return {
    title: String(title).trim(),
    body: String(body).trim(),
    category,
    amount_fcfa: cleanAmount,
    deadline: deadline || null,
    class_id: classId === '' || classId == null ? null : classId,
  };
}

/** Qui peut modifier : l'administrateur, ou le professeur auteur (la base applique la même règle). */
export function canEdit(user, item) {
  return user?.role === 'admin' || (user?.role === 'professeur' && item.author_id === user.id);
}
