// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

let users = [];
let loadError = null;
let updateError = null;
const updates = [];
let lastFilter = null;

vi.mock('../config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        neq: (col, value) => {
          lastFilter = { col, value };
          return { order: async () => ({ data: loadError ? null : users, error: loadError }) };
        },
      }),
      update: (payload) => ({
        eq: async (col, id) => {
          updates.push({ payload, col, id });
          return { error: updateError };
        },
      }),
    }),
  },
}));

import UsersManager from './UsersManager';
import PendingApproval from './PendingApproval';

const admin = { id: 'u-admin', email: 'admin@ecole.test', first_name: 'Awa', last_name: 'Kossi', role: 'admin', created_at: '2025-01-01' };
const prof = { id: 'u-prof', email: 'prof@ecole.test', first_name: 'Yao', last_name: 'Agbo', role: 'professeur', created_at: '2025-01-02' };
const newcomer = { id: 'u-new', email: 'nouveau@mail.test', first_name: 'Inconnu', last_name: 'Web', role: 'en_attente', created_at: '2025-01-03' };

afterEach(cleanup);

beforeEach(() => {
  users = [admin, prof, newcomer];
  loadError = null;
  updateError = null;
  updates.length = 0;
  vi.restoreAllMocks();
});

const mount = async (props = {}) => {
  const showNotification = vi.fn();
  render(<UsersManager currentUser={{ id: admin.id }} showNotification={showNotification} {...props} />);
  await waitFor(() => expect(screen.queryByText(/Chargement/)).toBeNull());
  return { showNotification };
};

describe('UsersManager', () => {
  it('ne charge pas les comptes parents (gérés ailleurs)', async () => {
    await mount();
    expect(lastFilter).toEqual({ col: 'role', value: 'parent' });
  });

  it('signale les comptes en attente et les affiche en premier', async () => {
    await mount();
    expect(screen.getByRole('status').textContent).toContain('1 compte en attente de validation');
    const selects = screen.getAllByRole('combobox');
    expect(selects[0].getAttribute('aria-label')).toBe('Rôle de nouveau@mail.test');
  });

  it('valide un compte en attente en lui attribuant un rôle', async () => {
    const { showNotification } = await mount();
    fireEvent.change(screen.getByLabelText('Rôle de nouveau@mail.test'), { target: { value: 'secretaire' } });
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toEqual({ payload: { role: 'secretaire' }, col: 'id', id: 'u-new' });
    await waitFor(() => expect(showNotification).toHaveBeenCalledWith('Inconnu Web : Secrétaire'));
    expect(screen.queryByRole('status')).toBeNull(); // plus aucun compte en attente
  });

  it('un administrateur ne peut pas modifier son propre rôle', async () => {
    await mount();
    expect(screen.getByLabelText('Rôle de admin@ecole.test').disabled).toBe(true);
  });

  it('demande confirmation avant de nommer un administrateur', async () => {
    await mount();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.change(screen.getByLabelText('Rôle de prof@ecole.test'), { target: { value: 'admin' } });
    expect(confirm).toHaveBeenCalled();
    expect(updates).toHaveLength(0);

    confirm.mockReturnValue(true);
    fireEvent.change(screen.getByLabelText('Rôle de prof@ecole.test'), { target: { value: 'admin' } });
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0].payload).toEqual({ role: 'admin' });
  });

  it('n\'affiche pas un faux succès quand la base refuse le changement', async () => {
    updateError = { message: 'permission refusée' };
    const { showNotification } = await mount();
    fireEvent.change(screen.getByLabelText('Rôle de nouveau@mail.test'), { target: { value: 'professeur' } });
    await waitFor(() => expect(showNotification).toHaveBeenCalled());
    expect(showNotification.mock.calls[0][0]).toMatch(/Erreur/);
    expect(screen.getByLabelText('Rôle de nouveau@mail.test').value).toBe('en_attente'); // inchangé
  });

  it('affiche une erreur si le chargement échoue', async () => {
    loadError = { message: 'boom' };
    render(<UsersManager currentUser={{ id: admin.id }} showNotification={() => {}} />);
    expect(await screen.findByText('Impossible de charger les utilisateurs.')).toBeTruthy();
  });
});

describe('PendingApproval', () => {
  it('explique la situation et propose de vérifier ou de se déconnecter', () => {
    const onRefresh = vi.fn();
    const onSignOut = vi.fn();
    render(<PendingApproval currentUser={{ email: 'nouveau@mail.test' }} onRefresh={onRefresh} onSignOut={onSignOut} />);
    expect(screen.getByText('Compte en attente de validation')).toBeTruthy();
    expect(screen.getByText('nouveau@mail.test')).toBeTruthy();
    fireEvent.click(screen.getByText('Vérifier maintenant'));
    fireEvent.click(screen.getByText('Se déconnecter'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
