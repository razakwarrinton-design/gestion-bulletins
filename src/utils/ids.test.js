import { describe, it, expect } from 'vitest';
import { resolveId, sameId } from './ids';

describe('resolveId', () => {
  const numeric = [{ id: 1, name: '6ème A' }, { id: 2, name: '5ème B' }];
  const textual = [{ id: 'a1b2', name: '6ème A' }, { id: 'c3d4', name: '5ème B' }];

  it('renvoie l\'identifiant numérique d\'origine pour une valeur de <select> (texte)', () => {
    expect(resolveId(numeric, '2')).toBe(2);
  });

  it('renvoie l\'identifiant texte d\'origine (UUID…)', () => {
    expect(resolveId(textual, 'c3d4')).toBe('c3d4');
  });

  it.each([null, undefined, '', '99', 'inconnu'])('renvoie null pour %s', (value) => {
    expect(resolveId(numeric, value)).toBeNull();
  });

  it('le résultat est comparable en === avec les identifiants des élèves', () => {
    const students = [{ id: 10, classId: 1 }, { id: 11, classId: 2 }];
    const selected = resolveId(numeric, '1');
    expect(students.filter(s => s.classId === selected).map(s => s.id)).toEqual([10]);
  });
});

describe('sameId', () => {
  it('compare un nombre et son texte', () => {
    expect(sameId(1, '1')).toBe(true);
    expect(sameId('abc', 'abc')).toBe(true);
    expect(sameId(1, '2')).toBe(false);
  });

  it('ne confond pas « pas de valeur » avec un identifiant', () => {
    expect(sameId(null, 'null')).toBe(false);
    expect(sameId(undefined, undefined)).toBe(false);
    expect(sameId('', '')).toBe(true); // deux chaînes vides sont identiques, mais jamais un identifiant réel
  });
});
