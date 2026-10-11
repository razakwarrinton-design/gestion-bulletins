import { useState } from 'react';
import { Bug } from 'lucide-react';
import { supabase } from '../config/supabase';

const SOURCES = { window: 'Erreur de page', promise: 'Opération échouée', boundary: 'Écran en panne' };
const formatDate = (iso) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });

/** Table absente : le script sql/client-errors.sql n'a pas encore été exécuté. */
const isMissingTable = (error) =>
    ['42P01', 'PGRST205'].includes(error?.code) || /client_errors/.test(String(error?.message ?? ''));

/**
 * Incidents rencontrés par les utilisateurs (administrateur uniquement) : les 50 plus récents.
 * Les rapports sont écrits par l'application elle-même (utils/errorReporter.js), sans service tiers.
 */
export default function ErrorLogPanel({ showNotification }) {
    const [state, setState] = useState({ status: 'idle', rows: [], message: '' });

    const load = async () => {
        setState(s => ({ ...s, status: 'loading', message: '' }));
        const { data, error } = await supabase.from('client_errors')
            .select('id, created_at, source, route, message, stack')
            .order('created_at', { ascending: false }).limit(50);
        if (error) {
            setState({
                status: 'error', rows: [],
                message: isMissingTable(error)
                    ? "Le journal des incidents n'est pas encore installé : exécutez sql/client-errors.sql dans l'éditeur SQL de Supabase."
                    : `Impossible de lire les incidents : ${error.message}`,
            });
            return;
        }
        setState({ status: 'ready', rows: data ?? [], message: '' });
    };

    const purge = async () => {
        const { data, error } = await supabase.rpc('purge_client_errors', { p_older_than_days: 30 });
        if (error) { showNotification?.(`Purge impossible : ${error.message}`); return; }
        showNotification?.(`${data ?? 0} incident(s) de plus de 30 jours supprimé(s)`);
        load();
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-2 flex items-center">
                <Bug className="w-6 h-6 mr-2 text-red-500" />
                Incidents de l'application
            </h3>
            <p className="text-sm text-gray-600 mb-4">
                Erreurs rencontrées par les utilisateurs (message et écran concernés, jamais de notes ni de noms d'élèves).
                Utile pour comprendre un « ça ne marche pas ».
            </p>
            <div className="flex gap-3">
                <button type="button" onClick={load} disabled={state.status === 'loading'}
                    className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold disabled:opacity-50">
                    {state.status === 'ready' ? 'Actualiser' : 'Afficher les incidents récents'}
                </button>
                {state.status === 'ready' && state.rows.length > 0 && (
                    <button type="button" onClick={purge} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">
                        Supprimer ceux de plus de 30 jours
                    </button>
                )}
            </div>

            {state.status === 'error' && <p role="alert" className="mt-3 text-sm text-red-600">{state.message}</p>}
            {state.status === 'ready' && state.rows.length === 0 && (
                <p className="mt-3 text-sm text-green-700">Aucun incident enregistré.</p>
            )}
            {state.rows.length > 0 && (
                <ul className="mt-4 divide-y text-sm">
                    {state.rows.map(row => (
                        <li key={row.id} className="py-2">
                            <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                                <span>{formatDate(row.created_at)}</span>
                                <span>{SOURCES[row.source] ?? row.source}</span>
                                {row.route && <span>écran « {row.route} »</span>}
                            </div>
                            <div className="font-mono break-words">{row.message}</div>
                            {row.stack && (
                                <details className="text-xs text-gray-500">
                                    <summary className="cursor-pointer">Détail technique</summary>
                                    <pre className="whitespace-pre-wrap break-words">{row.stack}</pre>
                                </details>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
