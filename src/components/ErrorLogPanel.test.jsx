// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const db = vi.hoisted(() => ({ result: { data: [], error: null }, rpc: { data: 0, error: null } }));
vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ order: () => ({ limit: () => Promise.resolve(db.result) }) }) }),
    rpc: vi.fn(() => Promise.resolve(db.rpc)),
  },
}));

import ErrorLogPanel from './ErrorLogPanel';
import { supabase } from '../config/supabase';

beforeEach(() => { db.result = { data: [], error: null }; db.rpc = { data: 0, error: null }; });
afterEach(cleanup);

const open = () => fireEvent.click(screen.getByRole('button', { name: /Afficher les incidents/ }));

describe('ErrorLogPanel', () => {
  it('ne lit rien avant le clic, puis liste les incidents', async () => {
    db.result = { data: [{ id: 1, created_at: '2026-10-11T10:00:00Z', source: 'boundary', route: 'grades', message: 'x is undefined', stack: 'at f' }], error: null };
    render(<ErrorLogPanel />);
    expect(screen.queryByText('x is undefined')).toBeNull();
    open();
    expect(await screen.findByText('x is undefined')).toBeTruthy();
    expect(screen.getByText('Écran en panne')).toBeTruthy();
    expect(screen.getByText(/écran « grades »/)).toBeTruthy();
  });

  it("dit clairement quand la table n'est pas encore installée", async () => {
    db.result = { data: null, error: { code: '42P01', message: 'relation "public.client_errors" does not exist' } };
    render(<ErrorLogPanel />);
    open();
    expect((await screen.findByRole('alert')).textContent).toMatch(/sql\/client-errors\.sql/);
  });

  it('affiche « aucun incident » quand le journal est vide', async () => {
    render(<ErrorLogPanel />);
    open();
    expect(await screen.findByText('Aucun incident enregistré.')).toBeTruthy();
  });

  it('purge les incidents de plus de 30 jours', async () => {
    db.result = { data: [{ id: 1, created_at: '2026-01-01T10:00:00Z', source: 'window', route: null, message: 'm', stack: null }], error: null };
    db.rpc = { data: 3, error: null };
    const notify = vi.fn();
    render(<ErrorLogPanel showNotification={notify} />);
    open();
    fireEvent.click(await screen.findByRole('button', { name: /plus de 30 jours/ }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('3 incident(s) de plus de 30 jours supprimé(s)'));
    expect(supabase.rpc).toHaveBeenCalledWith('purge_client_errors', { p_older_than_days: 30 });
  });
});
