import { describe, it, expect } from 'vitest';
import { calculateAverage, getMention } from './grades';

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
