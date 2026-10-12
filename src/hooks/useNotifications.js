import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { isAbsentTable, maxId, newArrivals } from '../utils/notifications';

export const POLL_MS = 60000;
const LIMIT = 30;

/**
 * Notifications du compte connecté (table notifications, lecture limitée à ses propres lignes par le RLS).
 * `enabled` : faux pour les comptes qui n'en reçoivent pas (aucune requête n'est alors envoyée).
 * Relecture toutes les minutes et au retour sur l'onglet ; `onArrival(nouvelles)` est appelée pour les notifications
 * apparues après le premier chargement (pas pour celles déjà en attente à l'ouverture : elles sont visibles sur la cloche).
 * Si la table n'existe pas encore (script SQL non exécuté), `available` reste faux et plus rien n'est demandé.
 */
export function useNotifications({ userId, enabled = true, onArrival } = {}) {
  const [items, setItems] = useState([]);
  const [available, setAvailable] = useState(false);
  const lastSeen = useRef(null); // null tant que le premier chargement n'a pas eu lieu
  const stopped = useRef(false);
  const arrival = useRef(onArrival);
  useEffect(() => { arrival.current = onArrival; });

  const refresh = useCallback(async () => {
    if (!userId || stopped.current) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, link_view, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(LIMIT);
    if (error) {
      if (isAbsentTable(error)) { stopped.current = true; setAvailable(false); }
      return; // autre erreur (réseau coupé…) : on garde l'affichage actuel et on réessaiera
    }
    const rows = data ?? [];
    if (lastSeen.current !== null) {
      const fresh = newArrivals(rows, lastSeen.current);
      if (fresh.length) arrival.current?.(fresh);
    }
    lastSeen.current = Math.max(lastSeen.current ?? 0, maxId(rows));
    setItems(rows);
    setAvailable(true);
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId) return undefined;
    stopped.current = false;
    lastSeen.current = null;
    const first = setTimeout(refresh, 0); // différé : pas de mise à jour d'état synchrone dans l'effet
    const timer = setInterval(refresh, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearTimeout(first); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [enabled, userId, refresh]);

  const markRead = useCallback(async (ids) => {
    const list = (Array.isArray(ids) ? ids : [ids]).filter((id) => id != null);
    if (!list.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((item) => (list.includes(item.id) && !item.read_at ? { ...item, read_at: now } : item)));
    const { error } = await supabase.from('notifications').update({ read_at: now }).in('id', list).is('read_at', null);
    if (error) refresh(); // l'enregistrement a échoué : on réaffiche l'état réel
  }, [refresh]);

  const markAllRead = useCallback(
    () => markRead(items.filter((item) => !item.read_at).map((item) => item.id)),
    [items, markRead],
  );

  const unread = items.filter((item) => !item.read_at).length;
  return { items, unread, available: enabled && available, markRead, markAllRead };
}
