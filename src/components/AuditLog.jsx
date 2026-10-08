import { useState } from 'react';
import { ScrollText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuditLog, AUDIT_PAGE_SIZE, AUDIT_EXPORT_LIMIT } from '../hooks/useAuditLog';
import {
    AUDIT_TABLES, AUDIT_ACTIONS, tableLabel, actionLabel, describeChanges, actorName, auditToCsv,
} from '../utils/audit';

const ACTION_STYLES = {
    INSERT: 'bg-green-50 text-green-700',
    UPDATE: 'bg-blue-50 text-blue-700',
    DELETE: 'bg-red-50 text-red-700',
};

const formatDate = (iso) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });

/**
 * Journal d'audit (administrateur uniquement) : qui a créé, modifié ou supprimé quoi, et quand.
 * Le journal est tenu par la base (sql/audit-log.sql) : il est en lecture seule et ne dépend pas du navigateur.
 */
export default function AuditLog({ showNotification }) {
    const [filters, setFilters] = useState({ table: '', action: '', from: '', to: '' });
    const [page, setPage] = useState(0);
    const { entries, total, profiles, loading, error, loadForExport } = useAuditLog(filters, page);

    const setFilter = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(0);
    };

    const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

    const exportCsv = async () => {
        try {
            const { entries: all, profiles: allProfiles } = await loadForExport();
            const blob = new Blob([auditToCsv(all, allProfiles)], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            if (total > AUDIT_EXPORT_LIMIT) {
                showNotification?.(`Export limité aux ${AUDIT_EXPORT_LIMIT} entrées les plus récentes : affinez les filtres`);
            }
        } catch {
            showNotification?.('Erreur : export impossible');
        }
    };

    const fieldClass = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ScrollText className="w-5 h-5 text-blue-600" /> Journal d&apos;audit
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Toutes les créations, modifications et suppressions, avec leur auteur. Lecture seule.
                    </p>
                </div>
                <button
                    onClick={exportCsv}
                    disabled={loading || total === 0}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                >
                    <Download className="w-4 h-4" /> Exporter en CSV
                </button>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
                <label className="text-xs font-semibold text-gray-500">
                    Table
                    <select aria-label="Table" className={`${fieldClass} block mt-1`} value={filters.table} onChange={e => setFilter('table', e.target.value)}>
                        <option value="">Toutes</option>
                        {Object.entries(AUDIT_TABLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                <label className="text-xs font-semibold text-gray-500">
                    Action
                    <select aria-label="Action" className={`${fieldClass} block mt-1`} value={filters.action} onChange={e => setFilter('action', e.target.value)}>
                        <option value="">Toutes</option>
                        {Object.entries(AUDIT_ACTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                <label className="text-xs font-semibold text-gray-500">
                    Du
                    <input aria-label="Du" type="date" className={`${fieldClass} block mt-1`} value={filters.from} onChange={e => setFilter('from', e.target.value)} />
                </label>
                <label className="text-xs font-semibold text-gray-500">
                    Au
                    <input aria-label="Au" type="date" className={`${fieldClass} block mt-1`} value={filters.to} onChange={e => setFilter('to', e.target.value)} />
                </label>
            </div>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {loading && <p className="text-sm text-gray-400 text-center py-8">Chargement du journal…</p>}
                {!loading && !error && entries.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">Aucune entrée pour ces filtres</p>
                )}
                {!loading && entries.map(entry => (
                    <div key={entry.id} className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="text-xs text-gray-400 tabular-nums">{formatDate(entry.created_at)}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ACTION_STYLES[entry.action] || 'bg-gray-100 text-gray-600'}`}>
                                {actionLabel(entry.action)}
                            </span>
                            <span className="font-semibold text-gray-800">{tableLabel(entry.table_name)}</span>
                            {entry.record_id && <span className="text-xs text-gray-400">#{entry.record_id}</span>}
                            <span className="ml-auto text-xs text-gray-500">
                                {actorName(entry, profiles)}{entry.actor_role ? ` · ${entry.actor_role}` : ''}
                            </span>
                        </div>
                        <ul className="mt-1.5 space-y-0.5">
                            {describeChanges(entry).map(({ field, before, after }) => (
                                <li key={field} className="text-xs text-gray-600 break-words">
                                    <span className="font-mono text-gray-500">{field}</span>
                                    {' : '}
                                    {before !== undefined && <span className="text-red-600 line-through decoration-red-300">{before}</span>}
                                    {before !== undefined && after !== undefined && ' → '}
                                    {after !== undefined && <span className="text-green-700">{after}</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{total} entrée{total > 1 ? 's' : ''}</span>
                <div className="flex items-center gap-2">
                    <button
                        aria-label="Page précédente"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0 || loading}
                        className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>Page {page + 1} / {pageCount}</span>
                    <button
                        aria-label="Page suivante"
                        onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                        disabled={page >= pageCount - 1 || loading}
                        className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
