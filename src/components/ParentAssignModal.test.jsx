// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const db = vi.hoisted(() => ({ invoke: null }));
vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) }),
    functions: { invoke: (...args) => db.invoke(...args) },
  },
}));

import ParentAssignModal, { parentAccountMessage } from './ParentAssignModal';

afterEach(cleanup);

const httpError = (status, body) => ({ data: null, error: { name: 'FunctionsHttpError', message: 'Edge Function returned a non-2xx status code', context: { status, json: async () => body } } });

async function submit() {
  render(<ParentAssignModal isOpen onClose={() => {}} students={[]} classes={[]} showNotification={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /Créer un parent/ }));
  const inputs = document.querySelectorAll('input');
  const [first, last, email, password] = [...inputs];
  fireEvent.change(first, { target: { value: 'Razak' } });
  fireEvent.change(last, { target: { value: 'Diallo' } });
  fireEvent.change(email, { target: { value: 'parent@example.com' } });
  fireEvent.change(password, { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /Créer le compte parent/ }));
}

describe('création de compte parent : messages d\'erreur', () => {
  it('adresse déjà utilisée : message en français, pas « non-2xx status code »', async () => {
    db.invoke = vi.fn().mockResolvedValue(httpError(400, { error: 'A user with this email address has already been registered' }));
    await submit();
    const alert = await waitFor(() => screen.getByText(/Erreur :/));
    expect(alert.textContent).toMatch(/a déjà un compte/);
    expect(alert.textContent).not.toMatch(/non-2xx/);
  });

  it('fonction non déployée : le dit clairement', async () => {
    db.invoke = vi.fn().mockResolvedValue(httpError(404, {}));
    await submit();
    expect((await waitFor(() => screen.getByText(/Erreur :/))).textContent).toMatch(/n'est pas déployée/);
  });

  it("refus de rôle : transmet le message du serveur", async () => {
    db.invoke = vi.fn().mockResolvedValue(httpError(403, { error: 'Seul un administrateur peut créer un compte parent' }));
    await submit();
    expect((await waitFor(() => screen.getByText(/Erreur :/))).textContent).toMatch(/Seul un administrateur/);
  });
});

describe('parentAccountMessage', () => {
  it('laisse passer les autres messages', () => {
    expect(parentAccountMessage('Champs obligatoires manquants')).toBe('Champs obligatoires manquants');
    expect(parentAccountMessage('Unable to validate email address: invalid format')).toBe("l'adresse e-mail n'est pas valide.");
  });
});
