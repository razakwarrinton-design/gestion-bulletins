// @vitest-environment jsdom
//
// Test d'intégration de l'application complète : connexion simulée, rôles, navigation et chargement à
// la demande des écrans. Le faux Supabase répond avec des listes vides, sauf pour la session et le
// profil de l'utilisateur connecté.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within, act } from '@testing-library/react';

const auth = vi.hoisted(() => ({ session: null, profile: null, signInError: null }));

vi.mock('./config/supabase', () => {
  const query = (table) => {
    const q = new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === 'then') {
          return (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject);
        }
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => Promise.resolve(
            table === 'user_profiles' && auth.profile
              ? { data: auth.profile, error: null }
              : { data: null, error: { code: 'PGRST116', message: 'no rows' } },
          );
        }
        return () => q;
      },
      apply: () => q,
    });
    return q;
  };
  const channel = () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} });
  return {
    supabaseConfigured: true,
    supabase: {
      from: (table) => query(table),
      rpc: () => query('rpc'),
      channel,
      removeChannel() {},
      functions: { invoke: async () => ({ data: null, error: null }) },
      auth: {
        getSession: async () => ({ data: { session: auth.session }, error: null }),
        getUser: async () => ({ data: { user: auth.session?.user ?? null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => (auth.signInError
          ? { data: { user: null }, error: { message: auth.signInError } }
          : { data: {}, error: null }),
        mfa: {
          listFactors: async () => ({ data: { totp: [], all: [] }, error: null }),
          getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }),
        },
      },
    },
  };
});

import App from './App';

// Entrée du menu latéral (un même libellé apparaît aussi dans le titre de page et les cartes du tableau de bord)
const nav = () => within(document.querySelector('nav'));
const waitForNav = () => waitFor(() => expect(document.querySelector('nav')).not.toBeNull());

const profile = (role) => ({
  id: 'u1', email: 'awa@ecole.test', first_name: 'Awa', last_name: 'Kossi', role,
});
const signedIn = (role) => {
  auth.session = { user: { id: 'u1', email: 'awa@ecole.test' } };
  auth.profile = profile(role);
};

beforeEach(() => {
  auth.session = null;
  auth.profile = null;
  auth.signInError = null;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(cleanup);

describe('application : accès selon l\'état du compte', () => {
  it('sans session : affiche la page de connexion', async () => {
    render(<App />);
    expect(await screen.findByText(/Bon retour/)).toBeTruthy();
    expect(screen.queryByText('Classes')).toBeNull();
  });

  it('connexion refusée : la page de connexion reste affichée avec le message d\'erreur', async () => {
    auth.signInError = 'Invalid login credentials';
    render(<App />);
    const email = await screen.findByPlaceholderText('votre@email.com');
    fireEvent.change(email, { target: { value: 'admin@ecole.test' } });
    fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: 'mauvais-mot-de-passe' } });
    fireEvent.click(screen.getByRole('button', { name: /Se connecter/ }));
    expect(await screen.findByText('Invalid login credentials')).toBeTruthy();
    // le formulaire n'a pas été remplacé par l'écran de chargement : la saisie est conservée
    expect(screen.getByPlaceholderText('votre@email.com').value).toBe('admin@ecole.test');
  });

  it('compte de connexion sans profil : le dit au lieu de rester muet', async () => {
    // la connexion réussit côté authentification, mais aucune ligne user_profiles ne correspond
    auth.profile = null;
    const { supabase } = await import('./config/supabase');
    const original = supabase.auth.signInWithPassword;
    supabase.auth.signInWithPassword = async () => ({ data: { user: { id: 'u9' } }, error: null });
    try {
      render(<App />);
      fireEvent.change(await screen.findByPlaceholderText('votre@email.com'), { target: { value: 'orphelin@ecole.test' } });
      fireEvent.change(document.querySelector('input[type="password"]'), { target: { value: 'secret123' } });
      fireEvent.click(screen.getByRole('button', { name: /Se connecter/ }));
      expect(await screen.findByText(/profil de ce compte est introuvable/)).toBeTruthy();
    } finally {
      supabase.auth.signInWithPassword = original;
    }
  });

  it('inscription publique : plus de choix de rôle, et un message d\'attente', async () => {
    render(<App />);
    fireEvent.click((await screen.findAllByText('Créer un compte'))[0]);
    expect(await screen.findByText(/devra être validé par l'administrateur/)).toBeTruthy();
    expect(screen.queryByText('Rôle')).toBeNull();
    expect(screen.queryByText(/Administrateur/)).toBeNull();
  });

  it('compte en attente : écran de validation, aucune navigation', async () => {
    signedIn('en_attente');
    render(<App />);
    expect(await screen.findByText('Compte en attente de validation')).toBeTruthy();
    expect(screen.queryByText('Classes')).toBeNull();
    expect(screen.queryByText('Tableau de bord')).toBeNull();
  });

  it('administrateur : navigation complète, y compris « Utilisateurs »', async () => {
    signedIn('admin');
    render(<App />);
    await waitForNav();
    expect(nav().getByText('Utilisateurs')).toBeTruthy();
    expect(nav().getByText('Paramètres')).toBeTruthy();
    expect(nav().getByText('Classes')).toBeTruthy();
  });

  it('secrétaire : pas d\'accès aux écrans d\'administration', async () => {
    signedIn('secretaire');
    render(<App />);
    await waitForNav();
    expect(nav().getByText('Classes')).toBeTruthy();
    expect(nav().queryByText('Utilisateurs')).toBeNull();
    expect(nav().queryByText('Paramètres')).toBeNull();
    expect(nav().queryByText('Saisir notes')).toBeNull();
  });

  it('professeur : saisie des notes, pas la gestion des classes', async () => {
    signedIn('professeur');
    render(<App />);
    await waitForNav();
    expect(nav().getByText('Saisir notes')).toBeTruthy();
    expect(nav().queryByText('Utilisateurs')).toBeNull();
    expect(nav().queryByText('Classes')).toBeNull();
    expect(nav().queryByText('Matières')).toBeNull();
  });
});

describe('application : navigation par adresse (#/écran)', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/'); });

  it('un lien direct ouvre l’écran demandé après connexion', async () => {
    window.history.replaceState(null, '', '/#/classes');
    signedIn('admin');
    render(<App />);
    expect(await screen.findByText('Gestion des classes', {}, { timeout: 20000 })).toBeTruthy();
  }, 40000);

  it('une adresse ne contourne pas les rôles : un secrétaire ne voit pas « Utilisateurs »', async () => {
    window.history.replaceState(null, '', '/#/users');
    signedIn('secretaire');
    render(<App />);
    await waitForNav();
    expect(screen.queryByText('Aucun utilisateur')).toBeNull();
    expect(window.location.hash).toBe('#/dashboard');
  });

  it('un parent arrive sur son espace même avec une adresse vide, et ne peut pas ouvrir les classes', async () => {
    signedIn('parent');
    render(<App />);
    await waitForNav();
    await waitFor(() => expect(nav().getByText('Espace Parents')).toBeTruthy());
    window.history.replaceState(null, '', '/#/classes');
    await act(async () => { window.dispatchEvent(new HashChangeEvent('hashchange')); });
    await waitFor(() => expect(window.location.hash).toBe('#/parents'));
  });

  it('cliquer sur le menu change l’adresse', async () => {
    signedIn('admin');
    render(<App />);
    await waitForNav();
    fireEvent.click(nav().getByText('Classes'));
    expect(window.location.hash).toBe('#/classes');
  });
});

// Les écrans sont transformés à la demande par Vite : lent quand tous les fichiers de test tournent en parallèle.
const LAZY_TIMEOUT = 40000;

describe('application : écrans chargés à la demande', () => {
  it('ouvre Utilisateurs (chargé à la demande) et la page Classes', async () => {
    signedIn('admin');
    render(<App />);

    await waitForNav();
    fireEvent.click(nav().getByText('Utilisateurs'));
    // le composant est téléchargé à la demande, puis charge la liste (vide ici)
    expect(await screen.findByText('Aucun utilisateur', {}, { timeout: 20000 })).toBeTruthy();

    fireEvent.click(nav().getByText('Classes'));
    expect(await screen.findByText('Gestion des classes', {}, { timeout: 20000 })).toBeTruthy();
  }, LAZY_TIMEOUT);

  it('ouvre les écrans lourds sans plantage (graphiques, import/export, absences)', async () => {
    signedIn('admin');
    render(<App />);
    await waitForNav();
    for (const label of ['Statistiques', 'Import/Export', 'Absences', 'Bulletins', 'Gestion parents', 'Analyse avancée']) {
      fireEvent.click(nav().getByText(label));
      // l'écran est téléchargé à la demande puis s'affiche : le menu reste là, sans page blanche
      await waitFor(() => expect(nav().getByText('Classes')).toBeTruthy(), { timeout: 20000 });
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(document.querySelector('main').textContent.length).toBeGreaterThan(0);
  }, LAZY_TIMEOUT);
});
