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

export function getMention(average) {
  const avg = parseFloat(average);
  if (isNaN(avg)) return { text: 'N/A', color: '#6b7280' };
  if (avg >= 16) return { text: 'Félicitations', color: '#10b981' };
  if (avg >= 14) return { text: "Tableau d'honneur", color: '#3b82f6' };
  if (avg >= 12) return { text: 'Encouragements', color: '#8b5cf6' };
  if (avg >= 10) return { text: 'Passable', color: '#f59e0b' };
  return { text: 'Insuffisant', color: '#ef4444' };
}
