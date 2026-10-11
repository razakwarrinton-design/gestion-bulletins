import { getScale } from './gradingScale';

export function calculateAverage(studentId, trimester, grades, subjects) {
  const studentGrades = grades.filter(g => g.studentId === studentId && g.trimester === trimester);
  if (studentGrades.length === 0) return 0;

  let totalPoints = 0;
  let totalCoef = 0;

  studentGrades.forEach(grade => {
    const subject = subjects.find(s => s.id === grade.subjectId);
    const value = parseFloat(grade.value);
    // Une note non saisie (vide, null) ne doit pas compter comme 0
    if (subject && !Number.isNaN(value)) {
      totalPoints += value * (subject.coefficient || 0);
      totalCoef += subject.coefficient || 0;
    }
  });

  return totalCoef > 0 ? (totalPoints / totalCoef).toFixed(2) : 0;
}

/** L'élève a-t-il au moins une note saisie (0 compris) pour ce trimestre ? Une note vide ne compte pas. */
export function hasGrade(studentId, trimester, grades) {
  return grades.some(g =>
    g.studentId === studentId &&
    g.trimester === trimester &&
    g.value !== '' && g.value !== null && g.value !== undefined &&
    !Number.isNaN(parseFloat(g.value))
  );
}

/** Distinctions du conseil de classe, de la plus haute (Excellent) à Passable ; sous le dernier seuil : « Insuffisant ». */
const DISTINCTIONS = [
  { text: 'Excellent', color: '#ca8a04' },
  { text: 'Félicitations', color: '#10b981' },
  { text: "Tableau d'honneur", color: '#3b82f6' },
  { text: 'Encouragements', color: '#8b5cf6' },
  { text: 'Passable', color: '#f59e0b' },
];

/**
 * Distinction du conseil de classe affichée sur le bulletin (moyenne générale).
 * Mêmes seuils que l'échelle de mentions de utils/mentions.js, lus dans le barème de l'école.
 */
export function getMention(average) {
  const avg = parseFloat(average);
  if (isNaN(avg)) return { text: 'N/A', color: '#6b7280' };
  const { cutoffs } = getScale();
  const i = cutoffs.findIndex((min) => avg >= min);
  return i >= 0 ? { ...DISTINCTIONS[i] } : { text: 'Insuffisant', color: '#ef4444' };
}

/** Décision selon la moyenne générale : admis dès le seuil d'admission, en difficulté sous le seuil de difficulté. */
export function decisionFor(average) {
  const { admission, difficulty } = getScale();
  if (average >= admission) return { text: 'ADMIS(E)', color: '#059669', bg: '#ecfdf5' };
  if (average >= difficulty) return { text: 'À SUIVRE', color: '#d97706', bg: '#fffbeb' };
  return { text: 'EN DIFFICULTÉ', color: '#dc2626', bg: '#fef2f2' };
}

/**
 * Rang d'un élève parmi ses camarades pour un trimestre, avec la même moyenne que le
 * bulletin (calculateAverage). Seuls les élèves ayant au moins une note saisie ce
 * trimestre sont classés ; les ex æquo partagent le même rang.
 * Renvoie { rank: 0, outOf } si l'élève n'a pas de note.
 */
export function getClassRank(studentId, trimester, classmates, grades, subjects) {
  const ranked = classmates
    .filter(s => hasGrade(s.id, trimester, grades))
    .map(s => ({ id: s.id, average: parseFloat(calculateAverage(s.id, trimester, grades, subjects)) || 0 }));

  const me = ranked.find(r => r.id === studentId);
  if (!me) return { rank: 0, outOf: ranked.length };

  return { rank: 1 + ranked.filter(r => r.average > me.average).length, outOf: ranked.length };
}
