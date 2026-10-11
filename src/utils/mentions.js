import { getScale } from './gradingScale';

/**
 * Échelle de mentions unique de l'application (note ou moyenne sur 20).
 *
 * Avant, chaque écran avait la sienne : seuils 18/16/14/12/10 (« Excellent », « Acceptable ») pour
 * l'analyse de classe, 16/14/12/10/8 (« Très Bien » … « Très Insuffisant ») pour le tableau de bord,
 * la saisie des notes et le portail parents, et « Insuffisant » dès 10 dans les portails parents.
 * Un même élève pouvait donc changer de mention d'un écran à l'autre.
 *
 * Les libellés sont fixes ; les seuils viennent du barème de l'école (utils/gradingScale.js).
 * Les « distinctions du conseil de classe » du bulletin (Félicitations, Tableau d'honneur,
 * Encouragements) restent dans utils/grades.js (`getMention`) : mêmes seuils, autre vocabulaire.
 */
const LEVEL_STYLES = [
  { label: 'Excellent', short: 'Excellent', icon: '🏆', color: '#ca8a04', bg: '#fef9c3' },
  { label: 'Très Bien', short: 'Très Bien', icon: '⭐', color: '#059669', bg: '#dcfce7' },
  { label: 'Bien', short: 'Bien', icon: '👍', color: '#2563eb', bg: '#dbeafe' },
  { label: 'Assez Bien', short: 'Assez Bien', icon: '👌', color: '#7c3aed', bg: '#ede9fe' },
  { label: 'Passable', short: 'Passable', icon: '🆗', color: '#d97706', bg: '#fef3c7' },
  { label: 'Insuffisant', short: 'Insuffisant', icon: '⚠️', color: '#ea580c', bg: '#ffedd5' },
  { label: 'Très Insuffisant', short: 'Très Insuf.', icon: '❌', color: '#dc2626', bg: '#fee2e2' },
];

/** Niveaux de mention du barème en vigueur, du plus haut au plus bas (le dernier n'a pas de minimum). */
export function mentionLevels() {
  const { cutoffs, difficulty } = getScale();
  const mins = [...cutoffs, difficulty, -Infinity];
  return LEVEL_STYLES.map((style, i) => ({ min: mins[i], ...style }));
}

/** Niveau de mention d'une note ou moyenne, ou null si la valeur n'est pas un nombre. */
export function getMentionLevel(value) {
  const v = parseFloat(value);
  if (Number.isNaN(v)) return null;
  return mentionLevels().find((level) => v >= level.min);
}

/** Répartition d'une liste de moyennes par mention : chaque niveau avec son effectif `count`. */
export function countByMention(values) {
  const levels = mentionLevels();
  return levels.map((level, i) => {
    const upper = i === 0 ? Infinity : levels[i - 1].min;
    return { ...level, count: values.filter((v) => v >= level.min && v < upper).length };
  });
}
