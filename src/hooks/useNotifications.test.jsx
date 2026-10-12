// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

const db = vi.hoisted(() => ({ result: { data: [], error: null }, calls: 0, updates: [] }));
vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => ({ limit: () => { db.calls += 1; return Promise.resolve(db.result); } }) }),
      update: (values) => ({ in: (col, ids) => ({ is: () => { db.updates.push({ values, ids }); return Promise.resolve({ error: null }); } }) }),
    }),
  },
}));

import { useNotifications, POLL_MS } from './useNotifications';

const row = (id, read_at = null) => ({ id, title: 't', body: 'b', link_view: 'parents', created_at: '2026-10-12T10:00:00Z', read_at });

beforeEach(() => { db.result = { data: [], error: null }; db.calls = 0; db.updates = []; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('useNotifications', () => {
  it('ne demande rien quand le compte ne reçoit pas de notification', async () => {
    const { result } = renderHook(() => useNotifications({ userId: 'u1', enabled: false }));
    await new Promise((r) => setTimeout(r, 20));
    expect(db.calls).toBe(0);
    expect(result.current.available).toBe(false);
  });

  it('charge les notifications et compte les non lues, sans signaler celles déjà présentes', async () => {
    db.result = { data: [row(2), row(1, '2026-10-11T10:00:00Z')], error: null };
    const onArrival = vi.fn();
    const { result } = renderHook(() => useNotifications({ userId: 'u1', onArrival }));
    await waitFor(() => expect(result.current.available).toBe(true));
    expect(result.current.unread).toBe(1);
    expect(onArrival).not.toHaveBeenCalled();
  });

  it('table absente : cloche cachée et plus aucune requête ensuite', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    db.result = { data: null, error: { code: '42P01', message: 'relation "public.notifications" does not exist' } };
    const { result } = renderHook(() => useNotifications({ userId: 'u1' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(result.current.available).toBe(false);
    const callsBefore = db.calls;
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS * 3); });
    expect(db.calls).toBe(callsBefore);
  });

  it('signale une notification apparue après le premier chargement, à la relecture suivante', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    db.result = { data: [row(1)], error: null };
    const onArrival = vi.fn();
    const { result } = renderHook(() => useNotifications({ userId: 'u1', onArrival }));
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(result.current.unread).toBe(1);
    db.result = { data: [row(2), row(1)], error: null };
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS); });
    expect(onArrival).toHaveBeenCalledTimes(1);
    expect(onArrival.mock.calls[0][0].map((n) => n.id)).toEqual([2]);
    expect(result.current.unread).toBe(2);
  });

  it('marquer comme lu met à jour tout de suite et enregistre read_at', async () => {
    db.result = { data: [row(2), row(1)], error: null };
    const { result } = renderHook(() => useNotifications({ userId: 'u1' }));
    await waitFor(() => expect(result.current.unread).toBe(2));
    await act(async () => { await result.current.markAllRead(); });
    expect(result.current.unread).toBe(0);
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].ids).toEqual([2, 1]);
    expect(db.updates[0].values.read_at).toBeTruthy();
  });
});
