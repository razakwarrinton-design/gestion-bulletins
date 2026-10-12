import { describe, it, expect } from 'vitest';
import { isAbsentTable, newArrivals, maxId, formatAge, linkTarget } from './notifications';

describe('isAbsentTable', () => {
  it('reconnaît une table non installée', () => {
    expect(isAbsentTable({ code: '42P01', message: 'x' })).toBe(true);
    expect(isAbsentTable({ code: 'PGRST205', message: 'Could not find the table public.notifications' })).toBe(true);
    expect(isAbsentTable({ message: 'relation "public.notifications" does not exist' })).toBe(true);
  });
  it('ne confond pas une autre erreur avec une table absente', () => {
    expect(isAbsentTable({ code: '57014', message: 'canceling statement due to timeout' })).toBe(false);
    expect(isAbsentTable({ message: 'Failed to fetch' })).toBe(false);
    expect(isAbsentTable(null)).toBe(false);
  });
});

describe('newArrivals / maxId', () => {
  const items = [{ id: 5, read_at: null }, { id: 4, read_at: '2026-10-12T08:00:00Z' }, { id: 3, read_at: null }];
  it('ne garde que les non lues plus récentes que la dernière vue', () => {
    expect(newArrivals(items, 3).map((i) => i.id)).toEqual([5]);
    expect(newArrivals(items, 5)).toEqual([]);
    expect(newArrivals(items, 0).map((i) => i.id)).toEqual([5, 3]);
  });
  it('maxId accepte des identifiants texte (bigint renvoyé en chaîne)', () => {
    expect(maxId([{ id: '7' }, { id: 12 }])).toBe(12);
    expect(maxId([])).toBe(0);
  });
});

describe('formatAge', () => {
  const now = Date.parse('2026-10-12T12:00:00Z');
  it.each([
    ['2026-10-12T11:59:40Z', "à l'instant"],
    ['2026-10-12T11:55:00Z', 'il y a 5 min'],
    ['2026-10-12T09:00:00Z', 'il y a 3 h'],
    ['2026-10-11T10:00:00Z', 'hier'],
    ['2026-10-09T10:00:00Z', 'il y a 3 jours'],
  ])('%s → %s', (iso, expected) => { expect(formatAge(iso, now)).toBe(expected); });
  it('date illisible : texte vide', () => { expect(formatAge('pas une date', now)).toBe(''); });
});

describe('linkTarget', () => {
  it("n'ouvre qu'un écran accessible au compte", () => {
    expect(linkTarget({ link_view: 'parents' }, ['parents', 'chat'])).toBe('parents');
    expect(linkTarget({ link_view: 'audit' }, ['parents', 'chat'])).toBeNull();
    expect(linkTarget({ link_view: null }, ['parents'])).toBeNull();
  });
});
