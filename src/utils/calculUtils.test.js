import { describe, it, expect } from 'vitest';
import {
  calculateSubjectAverage,
  calculateTrimesterAverage,
  calculateYearlyAverage,
  calculateStudentRank,
  calculateClassStats,
  getMentionDetails,
  isValidGrade,
  formatGrade,
  isAtRisk,
} from './calculUtils';

const subjects = [
  { id: 'math', coefficient: 4 },
  { id: 'fr', coefficient: 3 },
];

const grade = (studentId, subjectId, value, trimester = '1') => ({
  studentId,
  subjectId,
  trimester,
  value,
});

describe('calculateSubjectAverage', () => {
  it('fait la moyenne des notes de la matière', () => {
    const grades = [grade('s1', 'math', 10), grade('s1', 'math', 15)];
    expect(calculateSubjectAverage(grades, 's1', 'math', '1', subjects)).toBe(12.5);
  });

  it('renvoie 0 sans note', () => {
    expect(calculateSubjectAverage([], 's1', 'math', '1', subjects)).toBe(0);
  });
});

describe('calculateTrimesterAverage', () => {
  it('pondère chaque matière par son coefficient', () => {
    const grades = [grade('s1', 'math', 15), grade('s1', 'fr', 10)];
    // (15*4 + 10*3) / 7 = 12.86
    expect(calculateTrimesterAverage('s1', '1', grades, subjects)).toBe(12.86);
  });

  it('ignore une matière sans note', () => {
    const grades = [grade('s1', 'fr', 10)];
    expect(calculateTrimesterAverage('s1', '1', grades, subjects)).toBe(10);
  });

  it('compte une vraie note de 0 (sinon la moyenne est gonflée)', () => {
    const grades = [grade('s1', 'math', 0), grade('s1', 'fr', 12)];
    // (0*4 + 12*3) / 7 = 5.14
    expect(calculateTrimesterAverage('s1', '1', grades, subjects)).toBe(5.14);
  });

  it('renvoie 0 sans matières', () => {
    expect(calculateTrimesterAverage('s1', '1', [], [])).toBe(0);
  });
});

describe('calculateYearlyAverage', () => {
  it('fait la moyenne des trimestres notés', () => {
    const grades = [
      grade('s1', 'math', 10, '1'),
      grade('s1', 'math', 14, '2'),
    ];
    expect(calculateYearlyAverage('s1', grades, subjects)).toBe(12);
  });

  it('renvoie 0 sans aucune note', () => {
    expect(calculateYearlyAverage('s1', [], subjects)).toBe(0);
  });
});

describe('calculateStudentRank', () => {
  const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const grades = [
    grade('a', 'math', 12),
    grade('b', 'math', 18),
    grade('c', 'math', 8),
  ];

  it('classe les élèves par moyenne décroissante', () => {
    expect(calculateStudentRank('b', '1', students, grades, subjects).rank).toBe(1);
    expect(calculateStudentRank('a', '1', students, grades, subjects).rank).toBe(2);
    expect(calculateStudentRank('c', '1', students, grades, subjects).rank).toBe(3);
  });

  it('donne le nombre d\'élèves classés', () => {
    expect(calculateStudentRank('a', '1', students, grades, subjects).outOf).toBe(3);
  });

  it('ne donne pas de rang ni de centile à un élève sans note', () => {
    const result = calculateStudentRank('zzz', '1', students, grades, subjects);
    expect(result.rank).toBe(0);
    expect(result.percentile).toBeNull();
  });

  it('ne produit jamais NaN quand personne n\'a de note', () => {
    const result = calculateStudentRank('a', '1', students, [], subjects);
    expect(result.outOf).toBe(0);
    expect(Number.isNaN(result.percentile)).toBe(false);
  });
});

describe('calculateClassStats', () => {
  const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('calcule moyenne, médiane, min et max', () => {
    const grades = [
      grade('a', 'math', 10),
      grade('b', 'math', 14),
      grade('c', 'math', 18),
    ];
    const stats = calculateClassStats(students, '1', grades, subjects);
    expect(stats).toMatchObject({ count: 3, mean: 14, median: 14, min: 10, max: 18 });
  });

  it('renvoie null sans aucune note', () => {
    expect(calculateClassStats(students, '1', [], subjects)).toBeNull();
  });
});

describe('getMentionDetails', () => {
  it.each([
    [18, 'Excellent'],
    [16, 'Très bien'],
    [14, 'Bien'],
    [12, 'Assez bien'],
    [10, 'Acceptable'],
    [9.99, 'Insuffisant'],
  ])('moyenne %s → %s', (average, text) => {
    expect(getMentionDetails(average).text).toBe(text);
  });
});

describe('utilitaires de notes', () => {
  it('isValidGrade accepte 0 à 20 uniquement', () => {
    expect(isValidGrade(0)).toBe(true);
    expect(isValidGrade('20')).toBe(true);
    expect(isValidGrade(20.01)).toBe(false);
    expect(isValidGrade(-1)).toBe(false);
    expect(isValidGrade('abc')).toBe(false);
  });

  it('formatGrade affiche 2 décimales, ou "-" sans note', () => {
    expect(formatGrade(15.5)).toBe('15.50');
    expect(formatGrade(0)).toBe('0.00');
    expect(formatGrade(null)).toBe('-');
    expect(formatGrade(undefined)).toBe('-');
  });

  it('isAtRisk est vrai sous 10', () => {
    expect(isAtRisk(9.99)).toBe(true);
    expect(isAtRisk(10)).toBe(false);
  });
});
