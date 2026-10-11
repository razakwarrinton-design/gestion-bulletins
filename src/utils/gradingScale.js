/**
 * Barème de l'établissement : la seule source des seuils de mention et de décision.
 *
 * Seuls les seuils sont réglables (jamais les libellés : ils sont insérés dans les bulletins). Ils sont
 * enregistrés avec les informations de l'école (`schoolInfo.gradingScale`) et appliqués au chargement
 * par `applyGradingScale`. Un barème invalide ou absent retombe sur le barème par défaut.
 *
 * Valeurs par défaut : « Excellent » dès 18 et « Très Bien » de 16 à 17,99 (échelle annoncée pour les
 * examens nationaux du Togo en mai 2026) ; les autres seuils sont l'usage courant, sans texte officiel.
 */

/** Seuils des cinq mentions les plus hautes, de la plus haute à la plus basse (Excellent … Passable). */
export const DEFAULT_SCALE = Object.freeze({
  cutoffs: Object.freeze([18, 16, 14, 12, 10]),
  /** En dessous : « Très Insuffisant » / « EN DIFFICULTÉ ». */
  difficulty: 8,
  /** À partir de : « ADMIS(E) ». */
  admission: 12,
});

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

/** Renvoie un message d'erreur en français, ou null si le barème est utilisable. */
export function validateScale(scale) {
  if (!scale || !Array.isArray(scale.cutoffs) || scale.cutoffs.length !== DEFAULT_SCALE.cutoffs.length) {
    return 'Le barème doit contenir cinq seuils de mention.';
  }
  const all = [...scale.cutoffs, scale.difficulty, scale.admission];
  if (!all.every(isNumber)) return 'Chaque seuil doit être un nombre.';
  if (!all.every((v) => v >= 0 && v <= 20)) return 'Les seuils doivent être compris entre 0 et 20.';
  for (let i = 1; i < scale.cutoffs.length; i += 1) {
    if (scale.cutoffs[i] >= scale.cutoffs[i - 1]) return 'Les seuils de mention doivent être strictement décroissants.';
  }
  if (scale.difficulty >= scale.cutoffs[scale.cutoffs.length - 1]) {
    return 'Le seuil « en difficulté » doit être inférieur au seuil « Passable ».';
  }
  if (scale.difficulty >= scale.admission) return 'Le seuil d\'admission doit être supérieur au seuil « en difficulté ».';
  return null;
}

/** Barème utilisable à partir d'une valeur enregistrée (nombres lus dans du texte compris) ; sinon le défaut. */
export function normalizeScale(input) {
  if (!input || typeof input !== 'object') return DEFAULT_SCALE;
  const toNumber = (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : v);
  const scale = {
    cutoffs: Array.isArray(input.cutoffs) ? input.cutoffs.map(toNumber) : null,
    difficulty: toNumber(input.difficulty),
    admission: toNumber(input.admission),
  };
  return validateScale(scale) ? DEFAULT_SCALE : scale;
}

let active = DEFAULT_SCALE;

/** Barème en vigueur. */
export const getScale = () => active;

/** Applique le barème enregistré de l'école (ou le défaut s'il est absent ou invalide). */
export function applyGradingScale(stored) {
  const next = normalizeScale(stored);
  if (next !== active) active = next;
  return active;
}
