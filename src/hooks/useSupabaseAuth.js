import { useState, useEffect } from 'react';
import { supabase, supabaseConfigured } from '../config/supabase';

/**
 * Hook personnalisé pour gérer l'authentification Supabase
 * Remplace le système d'authentification localStorage
 */
export function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // `loading` : une opération est en cours (connexion, inscription…). `initializing` : la session
  // enregistrée dans le navigateur n'a pas encore été relue, seul moment où l'application affiche
  // un écran de chargement. Sans cette distinction, l'écran de chargement remplaçait la page de
  // connexion pendant chaque tentative, et son message d'erreur disparaissait avec elle.
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);

  // Charger la session au montage du composant
  useEffect(() => {
    if (!supabaseConfigured) {
      setError('Supabase non configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
      setLoading(false);
      setInitializing(false);
      return;
    }

    // Récupérer la session actuelle
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Erreur de lecture de la session:', err);
      setLoading(false);
    }).finally(() => setInitializing(false));

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Charger le profil utilisateur
  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      return { ok: true };
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      setError(err.message);
      return { ok: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Connexion avec email/mot de passe
  // Connexion avec email/mot de passe
  const signIn = async (email, password) => {
    if (!supabaseConfigured) {
      const message = 'Supabase non configuré. Impossible de se connecter.';
      setError(message);
      return { success: false, error: message };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Charge le profil immédiatement. Un compte de connexion sans profil ne donnerait aucun accès :
      // on le dit, au lieu de laisser la page de connexion sans explication.
      if (data.user) {
        const loaded = await loadUserProfile(data.user.id);
        if (!loaded.ok) {
          await supabase.auth.signOut();
          throw new Error(`Connexion réussie, mais le profil de ce compte est introuvable (${loaded.error}). Contactez l'administrateur.`);
        }
      }

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Inscription avec email/mot de passe
  // Note sécurité : le rôle n'est jamais choisi ici. Le profil (avec le rôle
  // 'secretaire' forcé côté base) est créé automatiquement par le trigger SQL
  // handle_new_user() — voir sql/supabase-security-rls.sql. Un admin doit ensuite
  // élever le rôle manuellement si nécessaire.
  const signUp = async (email, password, firstName, lastName) => {
    if (!supabaseConfigured) {
      const message = 'Supabase non configuré. Impossible de s\'inscrire.';
      setError(message);
      return { success: false, error: message };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await loadUserProfile(data.user.id);
      }

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Erreur d\'inscription:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Déconnexion
  const signOut = async () => {
    if (!supabaseConfigured) {
      const message = 'Supabase non configuré. Impossible de se déconnecter.';
      setError(message);
      return { success: false, error: message };
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Erreur de déconnexion:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Réinitialiser le mot de passe
  const resetPassword = async (email) => {
    if (!supabaseConfigured) {
      const message = 'Supabase non configuré. Impossible de réinitialiser le mot de passe.';
      setError(message);
      return { success: false, error: message };
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Erreur de réinitialisation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour le profil
  const updateProfile = async (updates) => {
    if (!supabaseConfigured) {
      const message = 'Supabase non configuré. Impossible de mettre à jour le profil.';
      setError(message);
      return { success: false, error: message };
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return { success: true, profile: data };
    } catch (err) {
      console.error('Erreur de mise à jour du profil:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Vérifier les permissions
  const hasPermission = (action) => {
    if (!profile) return false;

    const permissions = {
      admin: ['all'],
      professeur: ['viewGrades', 'editGrades', 'viewStudents', 'viewSubjects', 'editAppreciations'],
      secretaire: ['viewBulletins', 'printBulletins'],
    };

    return (
      permissions[profile.role]?.includes(action) ||
      permissions[profile.role]?.includes('all')
    );
  };

  // Formater l'utilisateur pour compatibilité avec l'ancien système
  const currentUser = profile
    ? {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.role,
    }
    : null;

  return {
    user,
    profile,
    currentUser, // Format compatible avec l'ancien système
    loading,
    initializing,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    hasPermission,
    isAuthenticated: !!user,
  };
}
