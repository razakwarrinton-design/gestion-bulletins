import { describe, it, expect } from 'vitest';
import {
  calculateSubjectAverage,
  calculateTrimesterAverage,
  calculateYearlyAverage,
  calculateStudentRank,
  calculateClassStats,
  isValidGrade,
  formatGrade,
  isAtRisk,
} from './calculUtils';
import { calculateAverage } from './grades';

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

describe('cohérence avec les bulletins (utils/grades)', () => {
  const rows = [
    grade('s1', 'math', 15), grade('s1', 'fr', 10),
    grade('s2', 'math', 0), grade('s2', 'fr', 12),
    grade('s3', 'math', null), grade('s3', 'fr', 9),
    grade('s4', 'math', ''),
  ];

  it.each(['s1', 's2', 's3', 's4'])('même moyenne que le bulletin pour %s', (id) => {
    expect(calculateTrimesterAverage(id, '1', rows, subjects))
      .toBe(parseFloat(calculateAverage(id, '1', rows, subjects)) || 0);
  });

  it('une note vide n\'est pas comptée comme 0', () => {
    // seule la note de français compte : 9, pas (0*4 + 9*3) / 7 = 3.86
    expect(calculateTrimesterAverage('s3', '1', rows, subjects)).toBe(9);
    expect(calculateSubjectAverage(rows, 's3', 'math', '1')).toBe(0);
  });

  it('une matière de coefficient 0 ne compte pas (et non coefficient 1)', () => {
    const withZero = [{ id: 'math', coefficient: 0 }, { id: 'fr', coefficient: 3 }];
    expect(calculateTrimesterAverage('s1', '1', rows, withZero)).toBe(10);
  });

  it('les ex æquo partagent le même rang', () => {
    const tied = [grade('a', 'math', 14), grade('b', 'math', 14), grade('c', 'math', 9)];
    const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(calculateStudentRank('a', '1', students, tied, subjects).rank).toBe(1);
    expect(calculateStudentRank('b', '1', students, tied, subjects).rank).toBe(1);
    expect(calculateStudentRank('c', '1', students, tied, subjects).rank).toBe(3);
  });

  it('un élève dont la note est vide n\'est pas classé', () => {
    const students = [{ id: 's1' }, { id: 's4' }];
    expect(calculateStudentRank('s4', '1', students, rows, subjects).rank).toBe(0);
    expect(calculateStudentRank('s1', '1', students, rows, subjects).outOf).toBe(1);
  });

  it('les statistiques de classe excluent les élèves sans note mais gardent une vraie moyenne de 0', () => {
    const students = [{ id: 'z1' }, { id: 'z2' }, { id: 'z3' }];
    const marks = [grade('z1', 'math', 0), grade('z2', 'math', 10)];
    const stats = calculateClassStats(students, '1', marks, subjects);
    expect(stats).toMatchObject({ count: 2, mean: 5, min: 0, max: 10 });
  });

  it('la moyenne annuelle compte un trimestre à 0 mais pas un trimestre vide', () => {
    const marks = [grade('s1', 'math', 0, '1'), grade('s1', 'math', 12, '2')];
    expect(calculateYearlyAverage('s1', marks, subjects)).toBe(6);
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
