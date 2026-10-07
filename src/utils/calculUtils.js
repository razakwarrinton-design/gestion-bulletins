/**
 * Statistiques de classe et moyennes numériques.
 *
 * Toutes les moyennes passent par `calculateAverage` de utils/grades.js, la même formule que les
 * bulletins : Σ(note × coefficient) / Σ(coefficient), notes non saisies ignorées, note de 0 comptée.
 * Avant, ce fichier avait sa propre formule : une note vide y comptait comme 0 et un coefficient nul
 * comme 1, donc l'écran « Analyse avancée » pouvait afficher une moyenne différente du bulletin.
 * Voir docs/CALCUL-MOYENNES.md.
 */
import { calculateAverage, getClassRank, hasGrade } from './grades';

const round2 = (n) => Math.round(n * 100) / 100;

/** Notes valides (numériques) d'un élève pour une matière et un trimestre. */
const subjectValues = (grades, studentId, subjectId, trimester) =>
  grades
    .filter(g => g.studentId === studentId && g.subjectId === subjectId && g.trimester === trimester)
    .map(g => parseFloat(g.value))
    .filter(v => !Number.isNaN(v));

/**
 * Moyenne d'un élève dans une matière pour un trimestre (0 si aucune note valide).
 * @returns {number} Moyenne (0-20)
 */
export const calculateSubjectAverage = (grades, studentId, subjectId, trimester) => {
  const values = subjectValues(grades, studentId, subjectId, trimester);
  if (values.length === 0) return 0;
  return round2(values.reduce((sum, v) => sum + v, 0) / values.length);
};

/**
 * Moyenne générale d'un trimestre pour un élève, identique à celle du bulletin.
 * @returns {number} Moyenne générale (0-20), 0 sans note
 */
export const calculateTrimesterAverage = (studentId, trimester, grades, subjects) => {
  if (!subjects || subjects.length === 0) return 0;
  return round2(parseFloat(calculateAverage(studentId, trimester, grades, subjects)) || 0);
};

/**
 * Moyenne annuelle : moyenne des trimestres où l'élève a au moins une note
 * (un trimestre dont la moyenne vaut vraiment 0 compte, un trimestre vide non).
 */
export const calculateYearlyAverage = (studentId, grades, subjects) => {
  const averages = ['1', '2', '3']
    .filter(trimester => hasGrade(studentId, trimester, grades))
    .map(trimester => calculateTrimesterAverage(studentId, trimester, grades, subjects));

  if (averages.length === 0) return 0;
  return round2(averages.reduce((a, b) => a + b, 0) / averages.length);
};

/**
 * Rang d'un élève dans sa classe, avec la règle des bulletins : seuls les élèves ayant une note
 * sont classés et les ex æquo partagent le même rang.
 *
 * @returns {Object} {rank, outOf, percentile} — rank 0 et percentile null si l'élève n'a pas de note
 */
export const calculateStudentRank = (studentId, trimester, students, grades, subjects) => {
  const { rank, outOf } = getClassRank(studentId, trimester, students, grades, subjects);
  const percentile = rank === 0 ? null : Math.round((1 - rank / outOf) * 100);
  return { rank, outOf, percentile };
};

/**
 * Statistiques d'une classe (élèves ayant au moins une note ce trimestre).
 * @returns {Object|null} null si personne n'a de note
 */
export const calculateClassStats = (students, trimester, grades, subjects) => {
  const averages = students
    .filter(s => hasGrade(s.id, trimester, grades))
    .map(s => calculateTrimesterAverage(s.id, trimester, grades, subjects));

  if (averages.length === 0) return null;

  const sorted = [...averages].sort((a, b) => a - b);
  const mean = averages.reduce((a, b) => a + b, 0) / averages.length;
  const median = averages.length % 2 === 0
    ? (sorted[averages.length / 2 - 1] + sorted[averages.length / 2]) / 2
    : sorted[Math.floor(averages.length / 2)];
  const stdDev = Math.sqrt(
    averages.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / averages.length
  );

  return {
    count: averages.length,
    mean: round2(mean),
    median: round2(median),
    min: round2(sorted[0]),
    max: round2(sorted[sorted.length - 1]),
    stdDev: round2(stdDev)
  };
};

/** Valide une note (0-20). */
export const isValidGrade = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 20;
};

/** Formate une note pour l'affichage (ex : 15.50), « - » si absente. */
export const formatGrade = (value, decimals = 2) => {
  if (!value && value !== 0) return '-';
  return parseFloat(value).toFixed(decimals);
};

/** Élève en risque de redoublement (moyenne < 10). */
export const isAtRisk = (yearlyAverage) => {
  return yearlyAverage < 10;
};
