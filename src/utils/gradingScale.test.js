// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { DEFAULT_SCALE, applyGradingScale, getScale, normalizeScale, validateScale } from './gradingScale';
import { getMention, decisionFor } from './grades';
import { getMentionLevel, countByMention, mentionLevels } from './mentions';
import { isAtRisk } from './calculUtils';
import { scaleLegend } from './bulletin/shared';

afterEach(() => applyGradingScale(null));

// Barème d'une école plus stricte : 15 = « Très Bien », admission à 10
const STRICT = { cutoffs: [19, 17, 15, 12.5, 11], difficulty: 9, admission: 10 };

describe('validateScale', () => {
  it('accepte le barème par défaut et un barème strict', () => {
    expect(validateScale(DEFAULT_SCALE)).toBeNull();
    expect(validateScale(STRICT)).toBeNull();
  });

  it.each([
    ['seuils non décroissants', { ...DEFAULT_SCALE, cutoffs: [18, 16, 16, 12, 10] }],
    ['seuil hors de 0 à 20', { ...DEFAULT_SCALE, cutoffs: [21, 16, 14, 12, 10] }],
    ['seuil absent', { ...DEFAULT_SCALE, cutoffs: [18, 16, 14, 12] }],
    ['texte au lieu d\'un nombre', { ...DEFAULT_SCALE, difficulty: 'huit' }],
    ['difficulté au-dessus de « Passable »', { ...DEFAULT_SCALE, difficulty: 10 }],
    ['admission sous la difficulté', { ...DEFAULT_SCALE, admission: 8 }],
    ['valeur infinie', { ...DEFAULT_SCALE, admission: Infinity }],
  ])('refuse : %s', (_, scale) => {
    expect(typeof validateScale(scale)).toBe('string');
  });
});

describe('normalizeScale', () => {
  it('retombe sur le barème par défaut si la valeur enregistrée est absente ou invalide', () => {
    expect(normalizeScale(undefined)).toBe(DEFAULT_SCALE);
    expect(normalizeScale('n\'importe quoi')).toBe(DEFAULT_SCALE);
    expect(normalizeScale({ cutoffs: [1, 2, 3, 4, 5], difficulty: 0, admission: 3 })).toBe(DEFAULT_SCALE);
  });

  it('lit des nombres enregistrés comme du texte, virgule décimale comprise', () => {
    const scale = normalizeScale({ cutoffs: ['18', '16', '14', '12,5', '10'], difficulty: '8', admission: '12' });
    expect(scale.cutoffs).toEqual([18, 16, 14, 12.5, 10]);
  });
});

describe('barème personnalisé', () => {
  it('change les mentions, la décision, la répartition et le risque de redoublement', () => {
    applyGradingScale(STRICT);
    expect(getScale()).toMatchObject({ admission: 10 });
    expect(getMention(17).text).toBe('Félicitations');
    expect(getMention(16.9).text).toBe('Tableau d\'honneur');
    expect(getMention(10.9).text).toBe('Insuffisant');
    expect(getMentionLevel(15).label).toBe('Bien');
    expect(getMentionLevel(8.9).label).toBe('Très Insuffisant');
    expect(decisionFor(10).text).toBe('ADMIS(E)');
    expect(decisionFor(9).text).toBe('À SUIVRE');
    expect(decisionFor(8.9).text).toBe('EN DIFFICULTÉ');
    expect(isAtRisk(10.9)).toBe(true);
    expect(isAtRisk(11)).toBe(false);
    expect(countByMention([19, 17, 15, 9.5, 3]).map((l) => l.count)).toEqual([1, 1, 1, 0, 0, 1, 1]);
  });

  it('la légende imprimée reprend les seuils du barème (virgule décimale)', () => {
    applyGradingScale(STRICT);
    const legend = scaleLegend({ withSubjectLevels: true });
    expect(legend).toContain('Excellent ≥ 19');
    expect(legend).toContain('Encouragements ≥ 12,5');
    expect(legend).toContain('Passable ≥ 11');
    expect(legend).toContain('Insuffisant &lt; 11');
    expect(legend).toContain('ADMIS(E) ≥ 10');
    expect(legend).toContain('EN DIFFICULTÉ &lt; 9');
    expect(legend).toContain('Très Insuffisant &lt; 9');
  });

  it('un barème invalide enregistré n\'empêche pas l\'application de fonctionner', () => {
    applyGradingScale({ cutoffs: [1], difficulty: 'x', admission: null });
    expect(getScale()).toBe(DEFAULT_SCALE);
    expect(getMention(18).text).toBe('Excellent');
    expect(mentionLevels()).toHaveLength(7);
  });
});
