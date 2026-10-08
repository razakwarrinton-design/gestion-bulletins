import { useCallback } from 'react';
import { useSupabaseState } from './useSupabaseState';

const MAX_ACTIVITIES = 200;

/** Journal d'activité (qui a fait quoi), borné aux 200 dernières entrées. */
export function useActivityLog(currentUser) {
    const [activities, setActivities] = useSupabaseState('activities', []);

    const logActivity = useCallback((action, details) => {
        const newActivity = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Anonyme',
            userRole: currentUser?.role || 'unknown',
            action,
            details
        };
        // Borné : sans limite, la valeur stockée (et rechargée à chaque ouverture) grossit sans fin
        setActivities(prev => [newActivity, ...prev].slice(0, MAX_ACTIVITIES));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    return { activities, logActivity };
}
