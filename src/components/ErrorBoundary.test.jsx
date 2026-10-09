// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import ErrorBoundary, { isStaleChunkError } from './ErrorBoundary';

const Boom = ({ message = 'écran cassé' }) => { throw new Error(message); };

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(cleanup);

describe('ErrorBoundary', () => {
  it('affiche le contenu quand tout va bien', () => {
    render(<ErrorBoundary><p>contenu</p></ErrorBoundary>);
    expect(screen.getByText('contenu')).toBeTruthy();
  });

  it('remplace un écran en panne par un message avec un bouton de rechargement', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert').textContent).toMatch(/rencontré une erreur/);
    expect(screen.getByText('Recharger la page')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
  });

  it('reconnaît un fichier d\'écran périmé après un redéploiement', () => {
    render(<ErrorBoundary><Boom message="Failed to fetch dynamically imported module: /assets/Grades-abc.js" /></ErrorBoundary>);
    expect(screen.getByRole('alert').textContent).toMatch(/nouvelle version/);
    expect(screen.queryByText('Réessayer')).toBeNull();
    expect(isStaleChunkError(new Error('Loading chunk 12 failed'))).toBe(true);
    expect(isStaleChunkError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('se remet à zéro quand l\'écran affiché change (menu)', () => {
    const { rerender } = render(<ErrorBoundary resetKey="grades"><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeTruthy();
    rerender(<ErrorBoundary resetKey="classes"><p>autre écran</p></ErrorBoundary>);
    expect(screen.getByText('autre écran')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('recharge la page sur demande', () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { ...original, reload }, writable: true });
    try {
      render(<ErrorBoundary><Boom /></ErrorBoundary>);
      fireEvent.click(screen.getByText('Recharger la page'));
      expect(reload).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', { value: original, writable: true });
    }
  });
});
