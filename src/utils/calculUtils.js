/**
 * Calcul des moyennes et statistiques
 * Logique documentée pour transparence
 */

/**
 * Calcule la moyenne d'un élève pour une matière et trimestre
 * Formule: Σ(note × coefficient) / Σ(coefficient)
 * 
 * @param {Array} grades - Notes de l'élève
 * @param {number} studentId - ID de l'élève
 * @param {string} subjectId - ID de la matière
 * @param {string} trimester - Trimestre (1, 2, ou 3)
 * @param {Array} subjects - Liste des matières avec coefficients
 * @returns {number} Moyenne (0-20)
 */
export const calculateSubjectAverage = (grades, studentId, subjectId, trimester, subjects) => {
  const subjectGrades = grades.filter(g =>
    g.studentId === studentId &&
    g.subjectId === subjectId &&
    g.trimester === trimester
  );

  if (subjectGrades.length === 0) return 0;

  const sum = subjectGrades.reduce((acc, grade) => acc + grade.value, 0);
  return Math.round((sum / subjectGrades.length) * 100) / 100; // 2 décimales
};

/**
 * Calcule la moyenne générale d'un trimestre pour un élève
 * Formule: Σ(moyenne_matière × coefficient_matière) / Σ(coefficient_matière)
 * 
 * @param {number} studentId - ID de l'élève
 * @param {string} trimester - Trimestre
 * @param {Array} grades - Toutes les notes
 * @param {Array} subjects - Matières avec coefficients
 * @returns {number} Moyenne générale (0-20)
 */
export const calculateTrimesterAverage = (studentId, trimester, grades, subjects) => {
  if (!subjects || subjects.length === 0) return 0;

  let totalWeightedScore = 0;
  let totalCoefficient = 0;

  subjects.forEach(subject => {
    const subjectAverage = calculateSubjectAverage(grades, studentId, subject.id, trimester, subjects);
    const coefficient = subject.coefficient || 1;

    if (subjectAverage > 0) {
      totalWeightedScore += subjectAverage * coefficient;
      totalCoefficient += coefficient;
    }
  });

  if (totalCoefficient === 0) return 0;
  
  return Math.round((totalWeightedScore / totalCoefficient) * 100) / 100;
};

/**
 * Calcule la moyenne générale annuelle
 * Formule: (T1 + T2 + T3) / 3
 * 
 * @param {number} studentId - ID de l'élève
 * @param {Array} grades - Toutes les notes
 * @param {Array} subjects - Matières
 * @returns {number} Moyenne annuelle
 */
export const calculateYearlyAverage = (studentId, grades, subjects) => {
  const avg1 = calculateTrimesterAverage(studentId, '1', grades, subjects);
  const avg2 = calculateTrimesterAverage(studentId, '2', grades, subjects);
  const avg3 = calculateTrimesterAverage(studentId, '3', grades, subjects);

  const validAverages = [avg1, avg2, avg3].filter(a => a > 0);
  
  if (validAverages.length === 0) return 0;
  
  return Math.round(
    (validAverages.reduce((a, b) => a + b, 0) / validAverages.length) * 100
  ) / 100;
};

/**
 * Détermine la mention basée sur la moyenne
 * - Excellent: ≥18
 * - Très bien: ≥16
 * - Bien: ≥14
 * - Assez bien: ≥12
 * - Acceptable: ≥10
 * - Insuffisant: <10
 * 
 * @param {number} average - La moyenne
 * @returns {Object} {text, color, icon}
 */
export const getMentionDetails = (average) => {
  const mentions = [
    { min: 18, text: 'Excellent', color: '#10b981', icon: '🌟', bg: '#d1fae5' },
    { min: 16, text: 'Très bien', color: '#06b6d4', icon: '⭐', bg: '#cffafe' },
    { min: 14, text: 'Bien', color: '#3b82f6', icon: '👍', bg: '#dbeafe' },
    { min: 12, text: 'Assez bien', color: '#f59e0b', icon: '👌', bg: '#fef3c7' },
    { min: 10, text: 'Acceptable', color: '#ef4444', icon: '⚠️', bg: '#fee2e2' },
    { min: 0, text: 'Insuffisant', color: '#dc2626', icon: '❌', bg: '#fecaca' }
  ];

  return mentions.find(m => average >= m.min);
};

/**
 * Calcule le rang d'un élève dans sa classe
 * 
 * @param {number} studentId - ID de l'élève
 * @param {string} trimester - Trimestre
 * @param {Array} students - Élèves de la classe
 * @param {Array} grades - Toutes les notes
 * @param {Array} subjects - Matières
 * @returns {Object} {rank, outOf, percentile}
 */
export const calculateStudentRank = (studentId, trimester, students, grades, subjects) => {
  const averages = students
    .map(s => ({
      id: s.id,
      average: calculateTrimesterAverage(s.id, trimester, grades, subjects)
    }))
    .filter(a => a.average > 0)
    .sort((a, b) => b.average - a.average);

  const rank = averages.findIndex(a => a.id === studentId) + 1;
  const outOf = averages.length;
  const percentile = Math.round((1 - rank / outOf) * 100);

  return { rank, outOf, percentile };
};

/**
 * Calcule les statistiques globales d'une classe
 * 
 * @param {Array} students - Élèves de la classe
 * @param {string} trimester - Trimestre
 * @param {Array} grades - Notes
 * @param {Array} subjects - Matières
 * @returns {Object} Statistiques
 */
export const calculateClassStats = (students, trimester, grades, subjects) => {
  const averages = students
    .map(s => calculateTrimesterAverage(s.id, trimester, grades, subjects))
    .filter(a => a > 0);

  if (averages.length === 0) return null;

  const sorted = [...averages].sort((a, b) => a - b);
  const sum = averages.reduce((a, b) => a + b, 0);
  const mean = Math.round((sum / averages.length) * 100) / 100;
  const median = averages.length % 2 === 0
    ? (sorted[averages.length / 2 - 1] + sorted[averages.length / 2]) / 2
    : sorted[Math.floor(averages.length / 2)];
  const stdDev = Math.sqrt(
    averages.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / averages.length
  );

  return {
    count: averages.length,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    min: Math.round(Math.min(...averages) * 100) / 100,
    max: Math.round(Math.max(...averages) * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100
  };
};

/**
 * Valide une note (0-20)
 * 
 * @param {number} value - La note
 * @returns {boolean} Valide ou non
 */
export const isValidGrade = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 20;
};

/**
 * Format une note pour affichage (ex: 15.50)
 * 
 * @param {number} value - La note
 * @param {number} decimals - Nombre de décimales
 * @returns {string} Note formatée
 */
export const formatGrade = (value, decimals = 2) => {
  if (!value && value !== 0) return '-';
  return parseFloat(value).toFixed(decimals);
};

/**
 * Détermine si un élève est en situation de redoublement
 * (moyenne générale < 10)
 * 
 * @param {number} yearlyAverage - Moyenne annuelle
 * @returns {boolean}
 */
export const isAtRisk = (yearlyAverage) => {
  return yearlyAverage < 10;
};

/**
 * Génère un résumé de bulletin pour affichage
 * 
 * @param {Object} student - L'élève
 * @param {string} trimester - Trimestre
 * @param {Array} grades - Notes
 * @param {Array} subjects - Matières
 * @returns {Object} Résumé
 */
export const generateBulletinSummary = (student, trimester, grades, subjects) => {
  const average = calculateTrimesterAverage(student.id, trimester, grades, subjects);
  const mention = getMentionDetails(average);
  const yearlyAvg = calculateYearlyAverage(student.id, grades, subjects);

  return {
    student,
    trimester,
    average: formatGrade(average),
    mention,
    yearlyAverage: formatGrade(yearlyAvg),
    atRisk: isAtRisk(yearlyAvg),
    timestamp: new Date().toISOString()
  };
};
