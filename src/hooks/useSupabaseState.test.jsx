// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const store = new Map();
const upserts = [];
let upsertError = null;

vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (_col, key) => ({
          single: async () =>
            store.has(key)
              ? { data: { value: store.get(key) }, error: null }
              : { data: null, error: { code: 'PGRST116' } },
        }),
      }),
      upsert: async (row) => {
        upserts.push(row);
        if (upsertError) return { error: upsertError };
        store.set(row.key, row.value);
        return { error: null };
      },
    }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel() {},
  },
}));

import { useSupabaseState } from './useSupabaseState';

beforeEach(() => {
  store.clear();
  upserts.length = 0;
  upsertError = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const mount = async (key, defaultValue) => {
  const hook = renderHook(() => useSupabaseState(key, defaultValue));
  await waitFor(() => expect(hook.result.current[2]).toBe(false)); // fin du chargement
  return hook;
};

describe('useSupabaseState', () => {
  it('renvoie la valeur par défaut quand rien n\'est stocké', async () => {
    const { result } = await mount('k', ['défaut']);
    expect(result.current[0]).toEqual(['défaut']);
  });

  it('relit la valeur stockée (format existant : JSON dans la colonne jsonb)', async () => {
    store.set('k', JSON.stringify({ name: 'Collège' }));
    const { result } = await mount('k', {});
    expect(result.current[0]).toEqual({ name: 'Collège' });
  });

  it('enregistre une valeur directe', async () => {
    const { result } = await mount('k', []);
    await act(async () => { await result.current[1](['a']); });
    expect(result.current[0]).toEqual(['a']);
    expect(upserts.at(-1)).toMatchObject({ key: 'k', value: JSON.stringify(['a']) });
  });

  it('accepte une mise à jour fonctionnelle et l\'enregistre vraiment', async () => {
    // Régression : logActivity appelait setActivities(prev => [...]) ; la fonction était
    // envoyée telle quelle à Supabase (JSON.stringify(fn) === undefined) et rien n'était sauvegardé.
    const { result } = await mount('activities', [{ id: 1 }]);
    await act(async () => { await result.current[1](prev => [{ id: 2 }, ...prev]); });

    expect(result.current[0]).toEqual([{ id: 2 }, { id: 1 }]);
    expect(upserts.at(-1).value).toBe(JSON.stringify([{ id: 2 }, { id: 1 }]));
  });

  it('enchaîne deux mises à jour fonctionnelles sans perdre la première', async () => {
    const { result } = await mount('k', []);
    await act(async () => {
      const update = result.current[1];
      await Promise.all([update(prev => [...prev, 'a']), update(prev => [...prev, 'b'])]);
    });
    expect(result.current[0]).toEqual(['a', 'b']);
    expect(upserts.at(-1).value).toBe(JSON.stringify(['a', 'b']));
  });

  it('revient à la valeur précédente quand la sauvegarde échoue', async () => {
    store.set('k', JSON.stringify(['avant']));
    const { result } = await mount('k', []);
    upsertError = new Error('permission refusée');

    await act(async () => { await result.current[1](['après']); });

    expect(result.current[0]).toEqual(['avant']);
  });
});
