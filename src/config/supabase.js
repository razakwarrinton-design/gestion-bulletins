import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
// IMPORTANT: À CONFIGURER AVEC VOS DONNÉES SUPABASE
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Créer l'instance Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fonctions utilitaires pour la gestion des données
export const getAppData = async (key) => {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('*')
      .eq('key', key)
      .single();
    
    if (error) throw error;
    return data ? JSON.parse(data.value) : null;
  } catch (error) {
    console.error(`Erreur lors de la récupération de ${key}:`, error);
    return null;
  }
};

export const setAppData = async (key, value) => {
  try {
    const { error } = await supabase
      .from('app_data')
      .upsert({ key, value: JSON.stringify(value) });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde de ${key}:`, error);
    return false;
  }
};

// Écouter les changements en temps réel
export const subscribeToAppData = (key, callback) => {
  const subscription = supabase
    .from('app_data')
    .on('*', payload => {
      if (payload.new.key === key) {
        callback(JSON.parse(payload.new.value));
      }
    })
    .subscribe();

  return subscription;
};
