import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/supabase';

const RECENT_LIMIT = 50;
const STAFF_ROLES = ['admin', 'professeur', 'secretaire'];

const mapRow = (row) => ({
    id: row.id,
    timestamp: row.timestamp,
    user: row.user_name || 'Anonyme',
    userRole: row.user_role || 'unknown',
    action: row.action,
    details: row.details,
});

/**
 * Journal d'activité (table activities, voir sql/appreciations-activities.sql) : les 50 événements
 * les plus récents. Une ligne par événement ; avant, toute la liste était réécrite à chaque action et
 * deux utilisateurs actifs en même temps s'écrasaient.
 *
 * L'auteur, son rôle et l'heure sont posés par la base à partir de la session : le navigateur n'envoie
 * que l'action et le détail. L'historique complet et infalsifiable est le journal d'audit.
 */
export function useActivityLog(currentUser) {
    const [activities, setActivities] = useState([]);
    const role = currentUser?.role;
    const tempId = useRef(0);

    useEffect(() => {
        // Les parents n'ont pas accès au journal ; un compte en attente non plus
        if (!STAFF_ROLES.includes(role)) return undefined;
        let cancelled = false;
        (async () => {
            const { data, error } = await supabase
                .from('activities')
                .select('id, timestamp, user_name, user_role, action, details')
                .order('timestamp', { ascending: false })
                .limit(RECENT_LIMIT);
            if (!cancelled && !error) setActivities((data || []).map(mapRow));
        })();
        return () => { cancelled = true; };
    }, [role]);

    const logActivity = useCallback((action, details) => {
        // Un parent n'écrit pas dans ce journal (la base le refuserait). Au moment de la connexion le
        // compte n'est pas encore chargé (role vide) : l'écriture est tentée, la base décide.
        if (role === 'parent') return;

        const pendingId = `pending-${tempId.current++}`;
        const entry = {
            id: pendingId,
            timestamp: new Date().toISOString(),
            user: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Anonyme',
            userRole: role || 'unknown',
            action,
            details,
        };
        setActivities(prev => [entry, ...prev].slice(0, RECENT_LIMIT));

        supabase.from('activities').insert({ action, details }).select('id, timestamp, user_name, user_role, action, details').single()
            .then(({ data, error }) => {
                if (error || !data) {
                    console.error('Journal d\'activité : enregistrement impossible', error);
                    setActivities(prev => prev.filter(a => a.id !== pendingId));
                    return;
                }
                // L'entrée définitive (nom, rôle et heure posés par la base) remplace l'entrée provisoire
                setActivities(prev => prev.map(a => (a.id === pendingId ? mapRow(data) : a)));
            });
    }, [currentUser, role]);

    return { activities, logActivity };
}
