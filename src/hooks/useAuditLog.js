import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

export const AUDIT_PAGE_SIZE = 50;
export const AUDIT_EXPORT_LIMIT = 2000;

const applyFilters = (query, { table, action, from, to }) => {
    let q = query;
    if (table) q = q.eq('table_name', table);
    if (action) q = q.eq('action', action);
    if (from) q = q.gte('created_at', `${from}T00:00:00`);
    if (to) q = q.lte('created_at', `${to}T23:59:59.999`);
    return q;
};

/** Noms des auteurs : un seul appel pour tous les auteurs de la page. */
async function loadProfiles(entries) {
    const ids = [...new Set(entries.map(e => e.actor_id).filter(Boolean))];
    if (ids.length === 0) return {};
    const { data } = await supabase.from('user_profiles').select('id, first_name, last_name, email').in('id', ids);
    return Object.fromEntries((data || []).map(p => [p.id, p]));
}

/**
 * Lecture paginée du journal d'audit (réservée aux administrateurs : la base renvoie une liste
 * vide à tout autre compte).
 * @param {{table?: string, action?: string, from?: string, to?: string}} filters  dates au format AAAA-MM-JJ
 */
export function useAuditLog(filters, page) {
    const [state, setState] = useState({ entries: [], total: 0, profiles: {}, loading: true, error: '' });
    const { table, action, from, to } = filters;

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setState(s => ({ ...s, loading: true, error: '' }));
            const start = page * AUDIT_PAGE_SIZE;
            const { data, count, error } = await applyFilters(
                supabase.from('audit_logs').select('*', { count: 'exact' }),
                { table, action, from, to },
            ).order('created_at', { ascending: false }).range(start, start + AUDIT_PAGE_SIZE - 1);
            if (cancelled) return;
            if (error) {
                setState({ entries: [], total: 0, profiles: {}, loading: false, error: 'Impossible de charger le journal.' });
                return;
            }
            const profiles = await loadProfiles(data || []);
            if (!cancelled) setState({ entries: data || [], total: count ?? 0, profiles, loading: false, error: '' });
        })();
        return () => { cancelled = true; };
    }, [table, action, from, to, page]);

    /** Entrées correspondant aux filtres, pour l'export (les plus récentes, 2000 au maximum). */
    const loadForExport = useCallback(async () => {
        const { data, error } = await applyFilters(
            supabase.from('audit_logs').select('*'),
            { table, action, from, to },
        ).order('created_at', { ascending: false }).limit(AUDIT_EXPORT_LIMIT);
        if (error) throw new Error(error.message);
        return { entries: data || [], profiles: await loadProfiles(data || []) };
    }, [table, action, from, to]);

    return { ...state, loadForExport };
}
