import { useState, useEffect } from 'react';
import { supabase, supabaseConfigured } from '../config/supabase';

/**
 * Hook personnalisé pour gérer l'authentification Supabase
 * Remplace le système d'authentification localStorage
 */
export function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger la session au montage du composant
  useEffect(() => {
    if (!supabaseConfigured) {
      setError('Supabase non configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
      setLoading(false);
      return;
    }

    // Récupérer la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

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
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
  const signUp = async (email, password, firstName, lastName, role = 'secretaire') => {
    if (!supabaseConfigured) {
      const message = 'Supabase non configuré. Impossible de créer un compte.';
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
            role: role,
          },
        },
      });

      if (error) throw error;

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
