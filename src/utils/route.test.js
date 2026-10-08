import { describe, it, expect } from 'vitest';
import { parseHash, viewToHash, resolveView } from './route';

describe('parseHash', () => {
  it.each([
    ['#/grades', 'grades'],
    ['#/gestion-parents', 'gestion-parents'],
    ['#/grades?class=3', 'grades'],
    ['#/ia-appreciations/extra', 'ia-appreciations'],
  ])('%s → %s', (hash, view) => {
    expect(parseHash(hash)).toBe(view);
  });

  it.each([[''], [null], [undefined], ['#'], ['#grades'], ['#/'], ['#/<script>'], ['/grades']])(
    'ignore %s',
    (hash) => {
      expect(parseHash(hash)).toBeNull();
    },
  );
});

describe('viewToHash', () => {
  it('produit une adresse relue à l\'identique', () => {
    expect(parseHash(viewToHash('admin-payments'))).toBe('admin-payments');
  });
});

describe('resolveView', () => {
  const allowed = ['dashboard', 'grades'];
  it('garde l\'écran demandé quand il est autorisé', () => {
    expect(resolveView('grades', allowed, 'dashboard')).toBe('grades');
  });
  it('retombe sur l\'écran par défaut pour un écran interdit, inconnu ou absent', () => {
    expect(resolveView('users', allowed, 'dashboard')).toBe('dashboard');
    expect(resolveView('inexistant', allowed, 'dashboard')).toBe('dashboard');
    expect(resolveView(null, allowed, 'dashboard')).toBe('dashboard');
  });
});
