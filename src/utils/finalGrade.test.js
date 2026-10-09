import { describe, it, expect } from 'vitest';
import { weightedBase, applyBonus, finalGrade, gradeInputProblem } from './finalGrade';

describe('weightedBase', () => {
  it('pondère interrogation ×1, devoir ×2, composition ×3', () => {
    // (10×1 + 12×2 + 16×3) / 6 = 13.67
    expect(weightedBase({ interro: 10, devoir: 12, composition: 16 })).toBeCloseTo(13.667, 3);
  });
  it('ignore les sous-notes vides', () => {
    expect(weightedBase({ interro: '', devoir: 12, composition: null })).toBe(12);
    expect(weightedBase({ interro: '10', devoir: '', composition: '16' })).toBe((10 + 48) / 4);
  });
  it('renvoie null sans aucune sous-note, et compte un vrai 0', () => {
    expect(weightedBase({ interro: '', devoir: null, composition: undefined })).toBeNull();
    expect(weightedBase({ devoir: 0 })).toBe(0);
  });
});

describe('applyBonus', () => {
  it('ajoute le bonus et plafonne à 20', () => {
    expect(applyBonus(15, 1)).toBe(16);
    expect(applyBonus(19.5, 2)).toBe(20);
    expect(applyBonus(15, '')).toBe(15);
    expect(applyBonus('', 1)).toBeNull();
  });
});

describe('finalGrade', () => {
  it('ne compte pas le bonus deux fois : la note enregistrée le contient déjà', () => {
    // GradesForm enregistre value = min(20, base + bonus) = 16 pour une base de 15 et un bonus de 1
    expect(finalGrade({ value: 16, bonus: 1 })).toBe(16);
    expect(finalGrade({ value: 20, bonus: 3 })).toBe(20);
  });
  it('replie sur les sous-notes + bonus quand aucune note n\'est enregistrée', () => {
    expect(finalGrade({ value: null, interro: 14, devoir: 14, composition: 14, bonus: 1 })).toBe(15);
  });
  it('donne le même résultat que la saisie pour une même ligne', () => {
    const row = { interro: 12, devoir: 14, composition: 16, bonus: 1.5 };
    const enteredValue = applyBonus(weightedBase(row), row.bonus); // ce que GradesForm enregistre
    expect(finalGrade({ ...row, value: enteredValue })).toBeCloseTo(enteredValue, 10);
    expect(finalGrade(row)).toBeCloseTo(enteredValue, 10);
  });
  it('renvoie null sans ligne ni donnée', () => {
    expect(finalGrade(null)).toBeNull();
    expect(finalGrade({ value: null })).toBeNull();
  });
});

describe('gradeInputProblem', () => {
  it('accepte des valeurs dans les limites et les champs vides', () => {
    expect(gradeInputProblem({ interro: 12, devoir: '14.5', composition: '', bonus: 5, simple: '' })).toBeNull();
    expect(gradeInputProblem({ interro: 0, devoir: 20, composition: 20, bonus: 0 })).toBeNull();
  });

  it('refuse une note au-dessus de 20, négative ou illisible (la base la refuse aussi)', () => {
    expect(gradeInputProblem({ interro: 21 })).toMatch(/entre 0 et 20/);
    expect(gradeInputProblem({ devoir: 1214 })).toMatch(/entre 0 et 20/);
    expect(gradeInputProblem({ composition: -1 })).toMatch(/entre 0 et 20/);
    expect(gradeInputProblem({ simple: 'abc' })).toMatch(/entre 0 et 20/);
  });

  it('limite le bonus à 5', () => {
    expect(gradeInputProblem({ bonus: 6 })).toMatch(/Bonus hors limites.*entre 0 et 5/);
  });
});
