/**
 * Journal d'audit : libellés, lecture des modifications et export CSV.
 * Les entrées viennent de la table audit_logs (voir sql/audit-log.sql).
 */

export const AUDIT_TABLES = {
    grades: 'Notes',
    students: 'Élèves',
    classes: 'Classes',
    subjects: 'Matières',
    absences: 'Absences',
    user_profiles: 'Comptes utilisateurs',
    parent_students: 'Liens parent-élève',
    payments: 'Paiements',
    app_data: 'Réglages',
};

export const AUDIT_ACTIONS = {
    INSERT: 'Création',
    UPDATE: 'Modification',
    DELETE: 'Suppression',
};

export const tableLabel = (name) => AUDIT_TABLES[name] || name;
export const actionLabel = (action) => AUDIT_ACTIONS[action] || action;

const formatValue = (value) => {
    if (value === null || value === undefined) return '∅';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

/**
 * Modifications d'une entrée sous forme de lignes lisibles :
 * [{ field, before, after }] — `before` absent pour une création, `after` absent pour une suppression.
 */
export function describeChanges(entry) {
    const before = entry?.old_value || {};
    const after = entry?.new_value || {};
    const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    return fields.map((field) => ({
        field,
        before: entry.action === 'INSERT' ? undefined : formatValue(before[field]),
        after: entry.action === 'DELETE' ? undefined : formatValue(after[field]),
    }));
}

/** Nom affiché d'un auteur, à partir de son profil (ou « Système » sans utilisateur). */
export function actorName(entry, profilesById = {}) {
    if (!entry.actor_id) return 'Système';
    const profile = profilesById[entry.actor_id];
    const name = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') : '';
    return name || profile?.email || 'Compte supprimé';
}

const csvCell = (value) => {
    let text = value === null || value === undefined ? '' : String(value);
    // Une cellule commençant par = + - @ serait interprétée comme une formule par Excel
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
};

/** Export CSV (séparateur « ; » et BOM pour qu'Excel lise correctement les accents). */
export function auditToCsv(entries, profilesById = {}) {
    const header = ['Date', 'Auteur', 'Rôle', 'Action', 'Table', 'Enregistrement', 'Modifications'];
    const lines = entries.map((entry) => {
        const changes = describeChanges(entry)
            .map(({ field, before, after }) => {
                if (before === undefined) return `${field} = ${after}`;
                if (after === undefined) return `${field} = ${before}`;
                return `${field} : ${before} → ${after}`;
            })
            .join(' | ');
        return [
            entry.created_at,
            actorName(entry, profilesById),
            entry.actor_role || '',
            actionLabel(entry.action),
            tableLabel(entry.table_name),
            entry.record_id || '',
            changes,
        ].map(csvCell).join(';');
    });
    return `\uFEFF${[header.map(csvCell).join(';'), ...lines].join('\r\n')}`;
}
