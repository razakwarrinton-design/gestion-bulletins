import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook personnalisé pour synchroniser les données avec Supabase
 * Remplace useLocalStorageState pour une persistence dans le cloud
 * 
 * @param {string} key - Clé d'identification des données
 * @param {any} defaultValue - Valeur par défaut si pas de données
 * @returns {[any, function, boolean]} - [données, fonction de mise à jour, isLoading]
 */
export function useSupabaseState(key, defaultValue) {
  const [data, setData] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données depuis Supabase au montage
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const { data: result, error: err } = await supabase
          .from('app_data')
          .select('value')
          .eq('key', key)
          .single();

        if (err && err.code !== 'PGRST116') {
          throw err; // PGRST116 = pas de lignes
        }

        if (result) {
          const parsedValue = JSON.parse(result.value);
          setData(parsedValue);
        } else {
          setData(defaultValue);
        }
      } catch (err) {
        console.error(`Erreur au chargement de ${key}:`, err);
        setError(err);
        // Utilise la valeur par défaut en cas d'erreur
        setData(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // S'abonner aux changements en temps réel (nouvelle API Supabase v2)
    const channel = supabase
      .channel(`app_data_${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_data',
          filter: `key=eq.${key}`
        },
        (payload) => {
          if (payload.new?.key === key) {
            const parsedValue = JSON.parse(payload.new.value);
            setData(parsedValue);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [key]);

  // Fonction de mise à jour qui sauvegarde dans Supabase et met à jour l'état local
  const updateData = async (newValue) => {
    try {
      // Mise à jour immédiate de l'état local (optimistic update)
      setData(newValue);

      // Sauvegarde dans Supabase
      const { error } = await supabase
        .from('app_data')
        .upsert({
          key,
          value: JSON.stringify(newValue),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error(`Erreur lors de la sauvegarde de ${key}:`, err);
      setError(err);
      // Revert aux données précédentes en cas d'erreur
      // La vraie synchronisation se fera via le subscription
    }
  };

  return [data, updateData, isLoading];
}

/**
 * Hook alternatif avec localStorage comme fallback
 * En cas d'indisponibilité de Supabase, utilise localStorage
 */
export function useSupabaseStateWithFallback(key, defaultValue) {
  const [data, setData] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [usesFallback, setUsesFallback] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Essayer de charger depuis Supabase
        const { data: result, error } = await supabase
          .from('app_data')
          .select('value')
          .eq('key', key)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (result) {
          setData(JSON.parse(result.value));
        } else {
          // Essayer localStorage comme fallback
          const localData = localStorage.getItem(key);
          if (localData) {
            setData(JSON.parse(localData));
            setUsesFallback(true);
          } else {
            setData(defaultValue);
          }
        }
      } catch (err) {
        console.warn(`Impossible d'accéder à Supabase, utilisation de localStorage pour ${key}`);
        
        // Fallback sur localStorage
        const localData = localStorage.getItem(key);
        if (localData) {
          setData(JSON.parse(localData));
        } else {
          setData(defaultValue);
        }
        setUsesFallback(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [key]);

  const updateData = async (newValue) => {
    setData(newValue);

    // Toujours sauvegarder en local aussi
    localStorage.setItem(key, JSON.stringify(newValue));

    // Essayer de sauvegarder dans Supabase
    try {
      await supabase
        .from('app_data')
        .upsert({
          key,
          value: JSON.stringify(newValue),
          updated_at: new Date().toISOString()
        });
      setUsesFallback(false);
    } catch (err) {
      console.warn(`Synchronisation Supabase échouée pour ${key}, données sauvegardées localement`);
      setUsesFallback(true);
    }
  };

  return [data, updateData, isLoading, usesFallback];
}
