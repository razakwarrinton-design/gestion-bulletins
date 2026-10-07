import { describe, it, expect } from 'vitest';
import { calculateAverage, getMention, getClassRank } from './grades';

const subjects = [
  { id: 'math', coefficient: 4 },
  { id: 'fr', coefficient: 3 },
  { id: 'sport', coefficient: 1 },
];

const grade = (subjectId, value, studentId = 's1', trimester = '1') => ({
  studentId,
  subjectId,
  trimester,
  value,
});

describe('calculateAverage', () => {
  it('calcule la moyenne pondérée par les coefficients', () => {
    const grades = [grade('math', 15), grade('fr', 10), grade('sport', 20)];
    // (15*4 + 10*3 + 20*1) / 8 = 110 / 8 = 13.75
    expect(parseFloat(calculateAverage('s1', '1', grades, subjects))).toBe(13.75);
  });

  it('renvoie 0 quand l\'élève n\'a aucune note', () => {
    expect(calculateAverage('s1', '1', [], subjects)).toBe(0);
  });

  it('ne mélange pas les trimestres', () => {
    const grades = [grade('math', 18, 's1', '1'), grade('math', 6, 's1', '2')];
    expect(parseFloat(calculateAverage('s1', '1', grades, subjects))).toBe(18);
    expect(parseFloat(calculateAverage('s1', '2', grades, subjects))).toBe(6);
  });

  it('ne mélange pas les élèves', () => {
    const grades = [grade('math', 18, 's1'), grade('math', 4, 's2')];
    expect(parseFloat(calculateAverage('s1', '1', grades, subjects))).toBe(18);
  });

  it('compte une vraie note de 0 dans la moyenne', () => {
    const grades = [grade('math', 0), grade('fr', 12)];
    // (0*4 + 12*3) / 7 = 5.14
    expect(parseFloat(calculateAverage('s1', '1', grades, subjects))).toBe(5.14);
  });

  it('ignore une note vide (non saisie) au lieu de la compter comme 0', () => {
    const grades = [grade('math', ''), grade('fr', 12)];
    expect(parseFloat(calculateAverage('s1', '1', grades, subjects))).toBe(12);
  });

  it('ignore une note null ou absente', () => {
    const grades = [grade('math', null), grade('fr', undefined), grade('sport', 14)];
    expect(parseFloat(calculateAverage('s1', '1', grades, subjects))).toBe(14);
  });

  it('ignore une note dont la matière n\'existe plus', () => {
    const grades = [grade('inconnue', 20), grade('fr', 10)];
    expect(parseFloat(calculateAverage('s1', '1', grades, subjects))).toBe(10);
  });

  it('accepte une note stockée sous forme de texte', () => {
    const grades = [grade('math', '16.5')];
    expect(parseFloat(calculateAverage('s1', '1', grades, subjects))).toBe(16.5);
  });
});

describe('getMention', () => {
  it.each([
    [20, 'Félicitations'],
    [16, 'Félicitations'],
    [15.99, "Tableau d'honneur"],
    [14, "Tableau d'honneur"],
    [13.99, 'Encouragements'],
    [12, 'Encouragements'],
    [11.99, 'Passable'],
    [10, 'Passable'],
    [9.99, 'Insuffisant'],
    [0, 'Insuffisant'],
  ])('moyenne %s → %s', (average, text) => {
    expect(getMention(average).text).toBe(text);
  });

  it('accepte une moyenne en texte (ex: "12.50")', () => {
    expect(getMention('12.50').text).toBe('Encouragements');
  });

  it('renvoie N/A pour une valeur non numérique', () => {
    expect(getMention('abc').text).toBe('N/A');
    expect(getMention(undefined).text).toBe('N/A');
  });
});

describe('getClassRank', () => {
  const classmates = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const grades = [
    grade('math', 18, 'a'),
    grade('math', 12, 'b'),
    grade('math', 12, 'c'),
    // d : aucune note
  ];

  it('classe par moyenne décroissante', () => {
    expect(getClassRank('a', '1', classmates, grades, subjects)).toEqual({ rank: 1, outOf: 3 });
  });

  it('donne le même rang aux ex æquo', () => {
    expect(getClassRank('b', '1', classmates, grades, subjects).rank).toBe(2);
    expect(getClassRank('c', '1', classmates, grades, subjects).rank).toBe(2);
  });

  it("ne classe pas un élève sans note, et ne le compte pas dans l'effectif", () => {
    expect(getClassRank('d', '1', classmates, grades, subjects)).toEqual({ rank: 0, outOf: 3 });
  });

  it('ignore les notes vides (non saisies)', () => {
    const withBlank = [...grades, grade('fr', '', 'd')];
    expect(getClassRank('d', '1', classmates, withBlank, subjects).rank).toBe(0);
  });

  it('un vrai 0 est classé (dernier)', () => {
    const withZero = [...grades, grade('math', 0, 'd')];
    expect(getClassRank('d', '1', classmates, withZero, subjects)).toEqual({ rank: 4, outOf: 4 });
  });

  it('classe par trimestre', () => {
    const t2 = [...grades, grade('math', 20, 'b', '2')];
    expect(getClassRank('b', '2', classmates, t2, subjects)).toEqual({ rank: 1, outOf: 1 });
  });
});
