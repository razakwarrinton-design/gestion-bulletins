// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const db = vi.hoisted(() => ({ rows: [], calls: [], insertError: null, deleteError: null, deleted: [{ id: 1 }], loadError: null }));

vi.mock('../config/supabase', () => ({
  supabase: {
    from: (table) => {
      let mode = 'select';
      let payload = null;
      const q = {
        select: () => q,
        insert: (row) => { mode = 'insert'; payload = row; return q; },
        delete: () => { mode = 'delete'; return q; },
        eq: (column, value) => { db.calls.push({ table, mode, column, value }); return q; },
        order: () => q,
        single: () => q,
        then: (resolve) => {
          if (mode === 'insert') {
            db.calls.push({ table, mode, payload });
            return db.insertError
              ? resolve({ data: null, error: db.insertError })
              : resolve({ data: { id: 99, created_at: '2026-01-01T00:00:00Z', author_id: 'u1', ...payload }, error: null });
          }
          if (mode === 'delete') {
            return db.deleteError ? resolve({ data: null, error: db.deleteError }) : resolve({ data: db.deleted, error: null });
          }
          return db.loadError ? resolve({ data: null, error: db.loadError }) : resolve({ data: db.rows, error: null });
        },
      };
      return q;
    },
  },
}));

import { useAppreciations } from './useAppreciations';

const row = (over = {}) => ({
  id: 1, student_id: 4, subject_id: 2, trimester: '1', academic_year: '2025-2026', type: 'teacher',
  body: 'Bon travail', author_id: 'u1', created_at: '2025-11-02T09:00:00Z', ...over,
});

beforeEach(() => {
  db.rows = [row()];
  db.calls = [];
  db.insertError = null;
  db.deleteError = null;
  db.deleted = [{ id: 1 }];
  db.loadError = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useAppreciations', () => {
  it('charge les appréciations de l\'année demandée', async () => {
    const { result } = renderHook(() => useAppreciations('2025-2026'));
    await waitFor(() => expect(result.current.appreciations).toHaveLength(1));
    expect(result.current.appreciations[0]).toMatchObject({ id: 1, studentId: 4, subjectId: 2, type: 'teacher', text: 'Bon travail' });
    expect(db.calls).toContainEqual({ table: 'appreciations', mode: 'select', column: 'academic_year', value: '2025-2026' });
  });

  it('ne charge rien sans année (écran non affiché)', () => {
    const { result } = renderHook(() => useAppreciations(null));
    expect(db.calls).toEqual([]);
    expect(result.current.appreciations).toEqual([]);
  });

  it('signale un échec de chargement', async () => {
    db.loadError = { message: 'permission denied' };
    const { result } = renderHook(() => useAppreciations('2025-2026'));
    await waitFor(() => expect(result.current.error).toMatch(/Impossible de charger/));
  });

  it('ajoute une appréciation d\'enseignant : une ligne, texte nettoyé, année courante', async () => {
    const { result } = renderHook(() => useAppreciations('2025-2026'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    let outcome;
    await act(async () => {
      outcome = await result.current.add({ studentId: 5, subjectId: 2, trimester: '2', type: 'teacher', text: '  Peut mieux faire  ' });
    });
    expect(outcome).toEqual({ success: true });
    const insert = db.calls.find(c => c.mode === 'insert' && c.payload);
    expect(insert.payload).toEqual({
      student_id: 5, subject_id: 2, trimester: '2', academic_year: '2025-2026', type: 'teacher', body: 'Peut mieux faire',
    });
    expect(result.current.appreciations.at(-1)).toMatchObject({ studentId: 5, text: 'Peut mieux faire' });
  });

  it('une appréciation du conseil n\'a pas de matière', async () => {
    const { result } = renderHook(() => useAppreciations('2025-2026'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.add({ studentId: 5, subjectId: 2, trimester: '3', type: 'council', text: 'Félicitations' });
    });
    expect(db.calls.find(c => c.payload).payload.subject_id).toBeNull();
  });

  it('renvoie l\'échec d\'un ajout sans modifier la liste', async () => {
    const { result } = renderHook(() => useAppreciations('2025-2026'));
    await waitFor(() => expect(result.current.appreciations).toHaveLength(1));
    db.insertError = { message: 'new row violates row-level security policy' };
    let outcome;
    await act(async () => {
      outcome = await result.current.add({ studentId: 5, subjectId: 2, trimester: '1', type: 'teacher', text: 'x' });
    });
    expect(outcome).toEqual({ success: false, error: 'new row violates row-level security policy' });
    expect(result.current.appreciations).toHaveLength(1);
  });

  it('supprime une appréciation', async () => {
    const { result } = renderHook(() => useAppreciations('2025-2026'));
    await waitFor(() => expect(result.current.appreciations).toHaveLength(1));
    let outcome;
    await act(async () => { outcome = await result.current.remove(1); });
    expect(outcome).toEqual({ success: true });
    expect(result.current.appreciations).toEqual([]);
  });

  it('signale une suppression refusée par la base (aucune ligne supprimée) au lieu de la croire réussie', async () => {
    const { result } = renderHook(() => useAppreciations('2025-2026'));
    await waitFor(() => expect(result.current.appreciations).toHaveLength(1));
    db.deleted = []; // RLS : l'appréciation d'un collègue n'est pas supprimable, sans erreur
    let outcome;
    await act(async () => { outcome = await result.current.remove(1); });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(/propres appréciations/);
    expect(result.current.appreciations).toHaveLength(1);
  });
});
