/**
 * Échelle de mentions unique de l'application (note ou moyenne sur 20).
 *
 * Avant, chaque écran avait la sienne : seuils 18/16/14/12/10 (« Excellent », « Acceptable ») pour
 * l'analyse de classe, 16/14/12/10/8 (« Très Bien » … « Très Insuffisant ») pour le tableau de bord,
 * la saisie des notes et le portail parents, et « Insuffisant » dès 10 dans les portails parents.
 * Un même élève pouvait donc changer de mention d'un écran à l'autre.
 *
 * Les « distinctions du conseil de classe » (Félicitations, Tableau d'honneur, Encouragements) du
 * bulletin restent dans utils/grades.js (`getMention`) : mêmes seuils (16 / 14 / 12), autre vocabulaire.
 */
export const MENTION_LEVELS = [
  { min: 16, label: 'Très Bien', short: 'Très Bien', icon: '⭐', color: '#059669', bg: '#dcfce7' },
  { min: 14, label: 'Bien', short: 'Bien', icon: '👍', color: '#2563eb', bg: '#dbeafe' },
  { min: 12, label: 'Assez Bien', short: 'Assez Bien', icon: '👌', color: '#7c3aed', bg: '#ede9fe' },
  { min: 10, label: 'Passable', short: 'Passable', icon: '🆗', color: '#d97706', bg: '#fef3c7' },
  { min: 8, label: 'Insuffisant', short: 'Insuffisant', icon: '⚠️', color: '#ea580c', bg: '#ffedd5' },
  { min: -Infinity, label: 'Très Insuffisant', short: 'Très Insuf.', icon: '❌', color: '#dc2626', bg: '#fee2e2' },
];

/** Niveau de mention d'une note ou moyenne, ou null si la valeur n'est pas un nombre. */
export function getMentionLevel(value) {
  const v = parseFloat(value);
  if (Number.isNaN(v)) return null;
  return MENTION_LEVELS.find((level) => v >= level.min);
}

/** Répartition d'une liste de moyennes par mention : chaque niveau avec son effectif `count`. */
export function countByMention(values) {
  return MENTION_LEVELS.map((level, i) => {
    const upper = i === 0 ? Infinity : MENTION_LEVELS[i - 1].min;
    return { ...level, count: values.filter((v) => v >= level.min && v < upper).length };
  });
}
