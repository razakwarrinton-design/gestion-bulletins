import { describe, it, expect } from 'vitest';
import { getMentionLevel, countByMention, mentionLevels } from './mentions';
import { getMention } from './grades';

describe('getMentionLevel', () => {
  it.each([
    [20, 'Excellent'],
    [18, 'Excellent'],
    [17.99, 'Très Bien'],
    [16, 'Très Bien'],
    [15.99, 'Bien'],
    [14, 'Bien'],
    [12, 'Assez Bien'],
    [10, 'Passable'],
    [9.99, 'Insuffisant'],
    [8, 'Insuffisant'],
    [7.99, 'Très Insuffisant'],
    [0, 'Très Insuffisant'],
    ['13.50', 'Assez Bien'],
  ])('%s → %s', (value, label) => {
    expect(getMentionLevel(value).label).toBe(label);
  });

  it('renvoie null pour une valeur absente ou non numérique', () => {
    expect(getMentionLevel(null)).toBeNull();
    expect(getMentionLevel(undefined)).toBeNull();
    expect(getMentionLevel('abc')).toBeNull();
  });
});

describe('countByMention', () => {
  it('répartit les moyennes sans en perdre ni en compter deux fois', () => {
    const values = [18, 16, 15, 14, 12.5, 10, 9, 8, 3, 0];
    const result = countByMention(values);
    expect(result.map((l) => [l.label, l.count])).toEqual([
      ['Excellent', 1], ['Très Bien', 1], ['Bien', 2], ['Assez Bien', 1], ['Passable', 1], ['Insuffisant', 2], ['Très Insuffisant', 2],
    ]);
    expect(result.reduce((sum, l) => sum + l.count, 0)).toBe(values.length);
  });
});

describe('cohérence avec les distinctions du bulletin', () => {
  it('Excellent / Félicitations / Tableau d\'honneur / Encouragements tombent aux mêmes seuils (18 / 16 / 14 / 12)', () => {
    const thresholds = mentionLevels().map((l) => l.min);
    expect(thresholds.slice(0, 4)).toEqual([18, 16, 14, 12]);
    for (const average of [18, 16, 14, 12]) {
      expect(getMention(average).text).not.toBe(getMention(average - 0.01).text);
    }
    expect(getMention(10).text).toBe('Passable');
    expect(getMentionLevel(10).label).toBe('Passable');
  });
});
