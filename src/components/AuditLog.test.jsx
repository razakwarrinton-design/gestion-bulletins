// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const state = vi.hoisted(() => ({ rows: [], total: 0, calls: [], error: null }));

vi.mock('../config/supabase', () => ({
  supabase: {
    from: (table) => {
      const q = {
        select: (_cols, options) => { q.counting = Boolean(options?.count); return q; },
        eq: (column, value) => { state.calls.push({ table, op: 'eq', column, value }); return q; },
        gte: (column, value) => { state.calls.push({ table, op: 'gte', column, value }); return q; },
        lte: (column, value) => { state.calls.push({ table, op: 'lte', column, value }); return q; },
        in: () => q,
        order: () => q,
        range: (from, to) => { state.calls.push({ table, op: 'range', from, to }); return q; },
        limit: () => q,
        then: (resolve) => {
          if (table === 'user_profiles') {
            return resolve({ data: [{ id: 'u1', first_name: 'Awa', last_name: 'Kossi', email: 'awa@ecole.test' }], error: null });
          }
          if (state.error) return resolve({ data: null, count: 0, error: { message: state.error } });
          return resolve({ data: state.rows, count: state.total, error: null });
        },
      };
      return q;
    },
  },
}));

import AuditLog from './AuditLog';

const entry = (over = {}) => ({
  id: 1, created_at: '2026-01-15T10:00:00Z', actor_id: 'u1', actor_role: 'professeur', action: 'UPDATE',
  table_name: 'grades', record_id: 'g1', old_value: { value: 12 }, new_value: { value: 15 }, ...over,
});

afterEach(cleanup);

beforeEach(() => {
  state.rows = [entry(), entry({ id: 2, action: 'DELETE', table_name: 'students', record_id: '7', actor_id: null, actor_role: 'system', old_value: { first_name: 'Koffi' }, new_value: null })];
  state.total = 2;
  state.calls = [];
  state.error = null;
});

describe('AuditLog', () => {
  it('affiche les entrées avec leur auteur, leur table et ce qui a changé', async () => {
    render(<AuditLog />);
    expect(await screen.findByText('Awa Kossi · professeur')).toBeTruthy();
    expect(screen.getAllByText('Notes').length).toBeGreaterThan(1); // option du filtre + entrée
    expect(screen.getAllByText('Modification').length).toBeGreaterThan(1); // option du filtre + entrée
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getByText('Système · system')).toBeTruthy();
    expect(screen.getAllByText('Suppression').length).toBeGreaterThan(1); // option du filtre + entrée
    expect(screen.getByText('2 entrées')).toBeTruthy();
  });

  it('applique les filtres de table, d\'action et de dates côté base, et revient à la première page', async () => {
    render(<AuditLog />);
    await screen.findByText('Awa Kossi · professeur');
    state.calls = [];
    fireEvent.change(screen.getByLabelText('Table'), { target: { value: 'grades' } });
    await waitFor(() => expect(state.calls).toContainEqual({ table: 'audit_logs', op: 'eq', column: 'table_name', value: 'grades' }));
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'DELETE' } });
    await waitFor(() => expect(state.calls).toContainEqual({ table: 'audit_logs', op: 'eq', column: 'action', value: 'DELETE' }));
    fireEvent.change(screen.getByLabelText('Du'), { target: { value: '2026-01-01' } });
    await waitFor(() => expect(state.calls).toContainEqual({ table: 'audit_logs', op: 'gte', column: 'created_at', value: '2026-01-01T00:00:00' }));
    expect(state.calls.at(-1)).toMatchObject({ op: 'range', from: 0, to: 49 });
  });

  it('pagine par 50 entrées', async () => {
    state.total = 120;
    render(<AuditLog />);
    await screen.findByText('Page 1 / 3');
    fireEvent.click(screen.getByLabelText('Page suivante'));
    await screen.findByText('Page 2 / 3');
    expect(state.calls.at(-1)).toMatchObject({ op: 'range', from: 50, to: 99 });
    expect(screen.getByLabelText('Page précédente').disabled).toBe(false);
  });

  it('indique quand rien ne correspond', async () => {
    state.rows = [];
    state.total = 0;
    render(<AuditLog />);
    expect(await screen.findByText('Aucune entrée pour ces filtres')).toBeTruthy();
    expect(screen.getByText('Exporter en CSV').closest('button').disabled).toBe(true);
  });

  it('signale une erreur de chargement', async () => {
    state.error = 'permission denied';
    render(<AuditLog />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Impossible de charger/);
  });
});
