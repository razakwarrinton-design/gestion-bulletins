import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { isAbsentAnnouncements } from '../utils/announcements';

const COLUMNS = 'id, title, body, category, amount_fcfa, deadline, class_id, author_id, author_name, author_role, created_at, updated_at';

/**
 * Infos de l'établissement (table announcements). La lecture est filtrée par le RLS : un parent ne reçoit que les
 * infos de l'établissement et celles de la classe de ses enfants. `installed` est faux tant que le script SQL n'a pas été
 * exécuté : l'écran l'explique au lieu de rester vide.
 */
export function useAnnouncements({ enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [installed, setInstalled] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error: readError } = await supabase
      .from('announcements').select(COLUMNS).order('created_at', { ascending: false }).limit(100);
    if (readError) {
      if (isAbsentAnnouncements(readError)) setInstalled(false);
      else setError(readError.message || 'Lecture impossible');
    } else {
      setItems(data ?? []);
      setError('');
      setInstalled(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setTimeout(refresh, 0); // différé : pas de mise à jour d'état synchrone dans l'effet
    return () => clearTimeout(timer);
  }, [enabled, refresh]);

  /** Publie ; `notify` prévient ensuite les parents concernés dans leur cloche. Renvoie { id, notified }. */
  const publish = useCallback(async (row, { notify = false } = {}) => {
    const { data, error: insertError } = await supabase.from('announcements').insert(row).select('id').single();
    if (insertError) throw new Error(insertError.message || 'Publication impossible');
    let notified = null;
    if (notify) {
      const { data: result, error: notifyError } = await supabase.rpc('notify_announcement', { p_announcement_id: data.id });
      if (notifyError) {
        await refresh(); // l'info est bien publiée
        throw new Error(`Publiée, mais les parents n'ont pas pu être prévenus : ${notifyError.message}`);
      }
      notified = Number(result?.notified ?? 0);
    }
    await refresh();
    return { id: data.id, notified };
  }, [refresh]);

  const update = useCallback(async (id, row) => {
    const { data, error: updateError } = await supabase.from('announcements').update(row).eq('id', id).select('id');
    if (updateError) throw new Error(updateError.message || 'Modification impossible');
    if (!data?.length) throw new Error("Modification refusée : seul l'auteur ou un administrateur peut modifier cette info.");
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id) => {
    const { data, error: deleteError } = await supabase.from('announcements').delete().eq('id', id).select('id');
    if (deleteError) throw new Error(deleteError.message || 'Suppression impossible');
    if (!data?.length) throw new Error("Suppression refusée : seul l'auteur ou un administrateur peut supprimer cette info.");
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { items, loading, error, installed, refresh, publish, update, remove };
}
