import { useState, useEffect, useRef } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook de persistance clé/valeur dans la table Supabase `app_data`
 * (repli sur localStorage quand le client Supabase n'est pas configuré).
 *
 * La valeur est stockée sous forme de chaîne JSON dans la colonne jsonb : ce format
 * est conservé tel quel pour rester compatible avec les données existantes.
 *
 * @param {string} key - Clé d'identification des données
 * @param {any} defaultValue - Valeur par défaut si rien n'est stocké
 * @returns {[any, function, boolean]} [valeur, mettreÀJour, enChargement]
 *   mettreÀJour accepte une valeur OU une fonction `(précédent) => suivant`, comme setState.
 *   Si la sauvegarde échoue, la valeur précédente est restaurée.
 */
export function useSupabaseState(key, defaultValue) {
  const [data, setData] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState(null);

  // Dernière valeur connue, toujours à jour (contrairement à `data` dans une closure) :
  // permet d'enchaîner plusieurs mises à jour sans perdre la précédente.
  const latest = useRef(defaultValue);
  // Les écritures partent l'une après l'autre : l'ordre d'arrivée en base est celui des appels.
  const writeQueue = useRef(Promise.resolve());

  const apply = (value) => {
    latest.current = value;
    setData(value);
  };

  // Charger les données depuis Supabase au montage
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        if (!supabase) {
          const localData = localStorage.getItem(key);
          apply(localData ? JSON.parse(localData) : defaultValue);
          return;
        }

        const { data: result, error: err } = await supabase
          .from('app_data')
          .select('value')
          .eq('key', key)
          .single();

        if (err && err.code !== 'PGRST116') {
          throw err; // PGRST116 = pas de lignes
        }

        apply(result ? JSON.parse(result.value) : defaultValue);
      } catch (err) {
        console.error(`Erreur au chargement de ${key}:`, err);
        setError(err);
        apply(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    if (!supabase) {
      return undefined;
    }

    // Changements en temps réel (autres utilisateurs / onglets)
    const channel = supabase
      .channel(`app_data_${key}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data', filter: `key=eq.${key}` },
        (payload) => {
          if (payload.new?.key === key) {
            apply(JSON.parse(payload.new.value));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const updateData = (valueOrUpdater) => {
    const previous = latest.current;
    const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(previous) : valueOrUpdater;

    // Mise à jour immédiate de l'interface (optimiste)
    apply(next);

    const save = async () => {
      try {
        if (!supabase) {
          localStorage.setItem(key, JSON.stringify(next));
          return;
        }
        const { error } = await supabase
          .from('app_data')
          .upsert({ key, value: JSON.stringify(next), updated_at: new Date().toISOString() });
        if (error) throw error;
      } catch (err) {
        console.error(`Erreur lors de la sauvegarde de ${key}:`, err);
        setError(err);
        // Restaurer la valeur précédente, sauf si une mise à jour plus récente est déjà passée
        if (latest.current === next) apply(previous);
      }
    };

    writeQueue.current = writeQueue.current.then(save);
    return writeQueue.current;
  };

  return [data, updateData, isLoading];
}
