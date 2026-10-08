// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const db = vi.hoisted(() => ({ rows: [], inserts: [], selects: 0, insertError: null }));

vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => {
      let mode = 'select';
      let payload = null;
      const q = {
        select: () => q,
        insert: (row) => { mode = 'insert'; payload = row; return q; },
        order: () => q,
        limit: () => q,
        single: () => q,
        then: (resolve) => {
          if (mode === 'insert') {
            db.inserts.push(payload);
            return db.insertError
              ? resolve({ data: null, error: db.insertError })
              : resolve({ data: { id: 100 + db.inserts.length, timestamp: '2026-03-03T10:00:00Z', user_name: 'Awa Kossi', user_role: 'admin', ...payload }, error: null });
          }
          db.selects += 1;
          return resolve({ data: db.rows, error: null });
        },
      };
      return q;
    },
  },
}));

import { useActivityLog } from './useActivityLog';

const admin = { firstName: 'Awa', lastName: 'Kossi', role: 'admin' };

beforeEach(() => {
  db.rows = [{ id: 1, timestamp: '2026-03-01T08:00:00Z', user_name: 'Awa Kossi', user_role: 'admin', action: 'Connexion', details: 'ok' }];
  db.inserts = [];
  db.selects = 0;
  db.insertError = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useActivityLog', () => {
  it('charge les événements récents avec la forme attendue par les écrans', async () => {
    const { result } = renderHook(() => useActivityLog(admin));
    await waitFor(() => expect(result.current.activities).toHaveLength(1));
    expect(result.current.activities[0]).toEqual({
      id: 1, timestamp: '2026-03-01T08:00:00Z', user: 'Awa Kossi', userRole: 'admin', action: 'Connexion', details: 'ok',
    });
  });

  it('ne charge rien pour un parent ou un compte en attente', () => {
    renderHook(() => useActivityLog({ firstName: 'P', lastName: 'Q', role: 'parent' }));
    renderHook(() => useActivityLog({ firstName: 'P', lastName: 'Q', role: 'en_attente' }));
    expect(db.selects).toBe(0);
  });

  it('n\'envoie que l\'action et le détail : l\'auteur et l\'heure viennent de la base', async () => {
    const { result } = renderHook(() => useActivityLog(admin));
    await waitFor(() => expect(result.current.activities).toHaveLength(1));
    act(() => { result.current.logActivity('Ajout de classe', 'Classe "6A" créée'); });
    expect(db.inserts).toEqual([{ action: 'Ajout de classe', details: 'Classe "6A" créée' }]);
  });

  it('affiche tout de suite l\'événement puis le remplace par l\'entrée définitive', async () => {
    const { result } = renderHook(() => useActivityLog(admin));
    await waitFor(() => expect(result.current.activities).toHaveLength(1));
    await act(async () => { result.current.logActivity('Ajout de classe', 'x'); });
    await waitFor(() => expect(result.current.activities[0].id).toBe(101));
    expect(result.current.activities).toHaveLength(2);
  });

  it('retire l\'événement affiché si la base le refuse', async () => {
    db.insertError = { message: 'denied' };
    const { result } = renderHook(() => useActivityLog(admin));
    await waitFor(() => expect(result.current.activities).toHaveLength(1));
    await act(async () => { result.current.logActivity('Ajout de classe', 'x'); });
    await waitFor(() => expect(result.current.activities).toHaveLength(1));
    expect(result.current.activities[0].action).toBe('Connexion');
  });

  it('un parent n\'écrit pas dans le journal', () => {
    const { result } = renderHook(() => useActivityLog({ firstName: 'P', lastName: 'Q', role: 'parent' }));
    act(() => { result.current.logActivity('Connexion', 'ok'); });
    expect(db.inserts).toEqual([]);
  });

  it('conserve 50 événements au plus', async () => {
    db.rows = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, timestamp: '2026-03-01T08:00:00Z', user_name: 'A', user_role: 'admin', action: `a${i}`, details: '' }));
    const { result } = renderHook(() => useActivityLog(admin));
    await waitFor(() => expect(result.current.activities).toHaveLength(50));
    await act(async () => { result.current.logActivity('Nouveau', 'x'); });
    expect(result.current.activities).toHaveLength(50);
    expect(result.current.activities[0].action).toBe('Nouveau');
  });
});
