// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const calls = [];
const data = {
  parent_students: [{
    student_id: 1,
    students: { id: 1, first_name: 'Koffi', last_name: 'Mensah', class_id: 7, classes: { id: 7, name: '6ème A' } },
  }],
  grades: [
    { student_id: 1, subject_id: 1, trimester: '1', academic_year: '2025-2026', value: 15 },
    { student_id: 1, subject_id: 2, trimester: '1', academic_year: '2025-2026', value: 10 },
    { student_id: 1, subject_id: 2, trimester: '2', academic_year: '2025-2026', value: null },
  ],
  subjects: [{ id: 1, name: 'Maths', coefficient: 4 }, { id: 2, name: 'Français', coefficient: 3 }],
};

vi.mock('../config/supabase', () => ({
  supabase: {
    from: (table) => {
      const q = {
        select: () => q,
        eq: (column, value) => { calls.push({ table, column, value }); return q; },
        in: () => q,
        order: () => q,
        then: (resolve) => resolve({ data: data[table], error: null }),
      };
      return q;
    },
  },
}));

import { useParent } from './useParent';

beforeEach(() => { calls.length = 0; });

describe('useParent', () => {
  it('ne charge les notes que de l\'année scolaire demandée', async () => {
    const { result } = renderHook(() => useParent('parent-1', '2025-2026'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls).toContainEqual({ table: 'grades', column: 'academic_year', value: '2025-2026' });
  });

  it('attend de connaître l\'année scolaire avant de charger', () => {
    const { result } = renderHook(() => useParent('parent-1', null));
    expect(calls).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('calcule la moyenne comme le bulletin : pondérée par les coefficients', async () => {
    const { result } = renderHook(() => useParent('parent-1', '2025-2026'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // (15 × 4 + 10 × 3) / 7 = 12.86
    expect(result.current.calculateAverage(1, '1')).toBe('12.86');
  });

  it('affiche « — » quand le trimestre n\'a aucune note saisie', async () => {
    const { result } = renderHook(() => useParent('parent-1', '2025-2026'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.calculateAverage(1, '2')).toBe('—'); // note vide
    expect(result.current.calculateAverage(1, '3')).toBe('—'); // aucune ligne
  });
});
