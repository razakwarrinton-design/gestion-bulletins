// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHashRoute } from './useHashRoute';

const ALLOWED = ['dashboard', 'grades', 'students'];

const setHash = (hash) => {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
};

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useHashRoute', () => {
  it('affiche l\'écran par défaut quand l\'adresse est vide', () => {
    const { result } = renderHook(() => useHashRoute({ allowedViews: ALLOWED, defaultView: 'dashboard' }));
    expect(result.current[0]).toBe('dashboard');
  });

  it('ouvre directement l\'écran de l\'adresse (lien direct, rechargement)', () => {
    window.history.replaceState(null, '', '/#/grades');
    const { result } = renderHook(() => useHashRoute({ allowedViews: ALLOWED, defaultView: 'dashboard' }));
    expect(result.current[0]).toBe('grades');
  });

  it('navigate change l\'écran et l\'adresse', () => {
    const { result } = renderHook(() => useHashRoute({ allowedViews: ALLOWED, defaultView: 'dashboard' }));
    act(() => result.current[1]('students'));
    expect(window.location.hash).toBe('#/students');
    setHash('#/students');
    expect(result.current[0]).toBe('students');
  });

  it('suit le bouton « précédent » du navigateur', () => {
    const { result } = renderHook(() => useHashRoute({ allowedViews: ALLOWED, defaultView: 'dashboard' }));
    setHash('#/grades');
    expect(result.current[0]).toBe('grades');
    setHash('#/students');
    expect(result.current[0]).toBe('students');
    setHash('#/grades'); // retour
    expect(result.current[0]).toBe('grades');
  });

  it('refuse un écran absent des écrans autorisés : adresse tapée à la main', () => {
    const { result } = renderHook(() => useHashRoute({ allowedViews: ALLOWED, defaultView: 'dashboard' }));
    setHash('#/users');
    expect(result.current[0]).toBe('dashboard');
    // et l'adresse affichée est corrigée, sans garder le chemin interdit
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('navigate ignore un écran interdit', () => {
    const { result } = renderHook(() => useHashRoute({ allowedViews: ALLOWED, defaultView: 'dashboard' }));
    act(() => result.current[1]('users'));
    expect(window.location.hash).toBe('');
    expect(result.current[0]).toBe('dashboard');
  });

  it('applique les nouveaux droits quand le compte change (connexion)', () => {
    window.history.replaceState(null, '', '/#/users');
    const { result, rerender } = renderHook(
      ({ allowedViews }) => useHashRoute({ allowedViews, defaultView: 'dashboard' }),
      { initialProps: { allowedViews: ['dashboard', 'users'] } },
    );
    expect(result.current[0]).toBe('users');
    rerender({ allowedViews: ['dashboard', 'grades'] }); // connexion avec un rôle sans accès à « users »
    expect(result.current[0]).toBe('dashboard');
  });
});
