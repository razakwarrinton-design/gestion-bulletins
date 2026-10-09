/**
 * Note finale d'une matière : une seule définition pour la saisie (GradesForm) et les bulletins.
 *
 * - note de base = moyenne pondérée des sous-notes : interrogation ×1, devoir ×2, composition ×3
 *   (une sous-note vide est ignorée) ;
 * - note finale = note de base + bonus, plafonnée à 20.
 *
 * La note ENREGISTRÉE (`value`) est déjà la note finale, bonus compris. Pour l'afficher il ne faut
 * donc PAS rajouter le bonus une seconde fois : `finalGrade` le garantit.
 */
export const SUBNOTE_WEIGHTS = { interro: 1, devoir: 2, composition: 3 };
export const MAX_GRADE = 20;

const toNumber = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));

export const MAX_BONUS = 5;

/**
 * Valeur saisie hors limites (notes de 0 à 20, bonus de 0 à 5) : la base la refuse, donc on ne l'envoie
 * pas et on le dit. Une saisie vide est permise (note effacée). Renvoie un message, ou null si tout va bien.
 */
export function gradeInputProblem({ interro, devoir, composition, bonus, simple }) {
  const outside = (v, max) => {
    const n = toNumber(v);
    if (v === '' || v == null) return false;
    return n === null || n < 0 || n > max;
  };
  if ([interro, devoir, composition, simple].some((v) => outside(v, MAX_GRADE))) {
    return `Note hors limites : saisissez une valeur entre 0 et ${MAX_GRADE}.`;
  }
  if (outside(bonus, MAX_BONUS)) return `Bonus hors limites : saisissez une valeur entre 0 et ${MAX_BONUS}.`;
  return null;
}

/** Note de base issue des sous-notes, ou null si aucune n'est saisie. */
export function weightedBase({ interro, devoir, composition }) {
  const parts = [
    [toNumber(interro), SUBNOTE_WEIGHTS.interro],
    [toNumber(devoir), SUBNOTE_WEIGHTS.devoir],
    [toNumber(composition), SUBNOTE_WEIGHTS.composition],
  ].filter(([value]) => value !== null);
  if (parts.length === 0) return null;
  const totalWeight = parts.reduce((sum, [, weight]) => sum + weight, 0);
  return parts.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;
}

/** Ajoute le bonus à une note de base (plafonné à 20) ; null si pas de note de base. */
export function applyBonus(base, bonus) {
  const b = toNumber(base);
  if (b === null) return null;
  return Math.min(MAX_GRADE, b + (toNumber(bonus) ?? 0));
}

/**
 * Note finale d'une ligne de la table grades. Si la note enregistrée existe c'est elle (bonus déjà
 * inclus) ; sinon, repli sur les sous-notes + bonus.
 */
export function finalGrade(grade) {
  if (!grade) return null;
  const saved = toNumber(grade.value);
  if (saved !== null) return Math.min(MAX_GRADE, saved);
  return applyBonus(weightedBase(grade), grade.bonus);
}
