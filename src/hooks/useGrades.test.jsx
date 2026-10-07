// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

let rows = [];
const upserts = [];
let upsertError = null;
let selectError = null;

vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: async () => (selectError ? { data: null, error: selectError } : { data: rows, error: null }),
      }),
      upsert: (payload) => ({
        select: () => ({
          single: async () => {
            upserts.push(payload);
            if (upsertError) return { data: null, error: upsertError };
            return { data: { id: 'g1', ...payload }, error: null };
          },
        }),
      }),
    }),
  },
}));

import { useGrades } from './useGrades';

const stored = {
  id: 'g1', student_id: 1, subject_id: 1, trimester: '1', academic_year: '2025-2026',
  value: 15, appreciation: null, interro: 12, devoir: 14, composition: 16, bonus: 1, teacher_name: 'M. Kodjo',
};

const loaded = async () => {
  const hook = renderHook(() => useGrades('2025-2026'));
  await waitFor(() => expect(hook.result.current.grades).toHaveLength(1));
  return hook;
};

beforeEach(() => {
  rows = [{ ...stored }];
  upserts.length = 0;
  upsertError = null;
  selectError = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useGrades', () => {
  it('charge les notes de l\'année avec le bonus', async () => {
    const { result } = await loaded();
    expect(result.current.getGrade(1, 1, '1')).toMatchObject({ studentId: 1, subjectId: 1, bonus: 1, teacherName: 'M. Kodjo' });
  });

  it('enregistre le bonus et renvoie un succès', async () => {
    rows = [];
    const { result } = renderHook(() => useGrades('2025-2026'));
    let outcome;
    await act(async () => {
      outcome = await result.current.updateGrade(2, 3, '1', 16.5, '', { interro: 15, devoir: 16, composition: 17, bonus: 0.5 });
    });
    expect(outcome).toEqual({ success: true });
    expect(upserts[0]).toMatchObject({ student_id: 2, subject_id: 3, academic_year: '2025-2026', value: 16.5, bonus: 0.5 });
  });

  it('conserve sous-notes, bonus et enseignant quand seule l\'appréciation change', async () => {
    const { result } = await loaded();
    await act(async () => { await result.current.updateGrade(1, 1, '1', 15, 'Très bon trimestre'); });
    expect(upserts[0]).toMatchObject({
      appreciation: 'Très bon trimestre', interro: 12, devoir: 14, composition: 16, bonus: 1, teacher_name: 'M. Kodjo',
    });
  });

  it('conserve l\'appréciation existante quand elle n\'est pas fournie (import Excel)', async () => {
    rows = [{ ...stored, appreciation: 'Bon travail' }];
    const { result } = await loaded();
    await act(async () => {
      await result.current.updateGrade(1, 1, '1', 18, undefined, { interro: null, devoir: null, composition: null, bonus: null });
    });
    expect(upserts[0]).toMatchObject({ value: 18, appreciation: 'Bon travail', interro: null, bonus: null, teacher_name: 'M. Kodjo' });
  });

  it('efface un champ quand on passe explicitement null', async () => {
    const { result } = await loaded();
    await act(async () => { await result.current.updateGrade(1, 1, '1', 14, '', { bonus: null }); });
    expect(upserts[0].bonus).toBeNull();
  });

  it('signale l\'échec d\'une sauvegarde sans modifier les notes affichées', async () => {
    const { result } = await loaded();
    upsertError = { message: 'new row violates row-level security policy' };
    let outcome;
    await act(async () => { outcome = await result.current.updateGrade(1, 1, '1', 5, ''); });
    expect(outcome).toEqual({ success: false, error: 'new row violates row-level security policy' });
    expect(result.current.getGrade(1, 1, '1').value).toBe(15);
  });

  it('expose l\'erreur de chargement', async () => {
    selectError = { message: 'column grades.bonus does not exist' };
    const { result } = renderHook(() => useGrades('2025-2026'));
    await waitFor(() => expect(result.current.error).toBe('column grades.bonus does not exist'));
    expect(result.current.grades).toEqual([]);
  });
});
