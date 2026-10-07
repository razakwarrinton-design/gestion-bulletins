import { useState, useEffect } from 'react';
import { Users, Clock } from 'lucide-react';
import { supabase } from '../config/supabase';

const ROLE_LABELS = {
    en_attente: 'En attente',
    secretaire: 'Secrétaire',
    professeur: 'Professeur',
    admin: 'Administrateur',
};

/**
 * Gestion des comptes du personnel (administrateur uniquement).
 *
 * Toute personne peut s'inscrire depuis la page de connexion, mais son compte reste « en attente »
 * et n'accède à aucune donnée tant qu'un administrateur ne lui attribue pas un rôle ici. Les comptes
 * parents se gèrent dans « Gestion parents ». La base refuse de toute façon un changement de rôle
 * venant d'un non-administrateur (RLS + déclencheur).
 */
export default function UsersManager({ currentUser, showNotification }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data, error: loadError } = await supabase
                .from('user_profiles')
                .select('id, email, first_name, last_name, role, created_at')
                .neq('role', 'parent')
                .order('created_at', { ascending: false });
            if (cancelled) return;
            if (loadError) setError('Impossible de charger les utilisateurs.');
            else setUsers(data || []);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, []);

    const changeRole = async (user, role) => {
        if (role === user.role) return;
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
        if (role === 'admin' && !window.confirm(`Donner les droits d'administrateur à ${name} ?`)) return;

        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ role })
            .eq('id', user.id);

        if (updateError) {
            showNotification?.('Erreur : le rôle n\'a pas été modifié');
            return;
        }
        setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, role } : u)));
        showNotification?.(`${name} : ${ROLE_LABELS[role]}`);
    };

    // Les comptes en attente d'abord
    const sorted = [...users].sort((a, b) => (b.role === 'en_attente') - (a.role === 'en_attente'));
    const pendingCount = users.filter(u => u.role === 'en_attente').length;

    if (loading) return <p className="text-sm text-gray-500 py-8 text-center">Chargement des utilisateurs…</p>;
    if (error) return <p className="text-sm text-red-600 py-8 text-center">{error}</p>;

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" /> Utilisateurs
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                    Les nouveaux comptes n'accèdent à rien tant que vous ne leur avez pas attribué un rôle.
                </p>
            </div>

            {pendingCount > 0 && (
                <div role="status" className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    {pendingCount} compte{pendingCount > 1 ? 's' : ''} en attente de validation
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {sorted.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">Aucun utilisateur</p>
                )}
                {sorted.map(user => {
                    const isSelf = user.id === currentUser?.id;
                    return (
                        <div key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-[180px]">
                                <p className="font-medium text-gray-800 text-sm">
                                    {user.first_name} {user.last_name}
                                    {isSelf && <span className="ml-2 text-xs text-gray-400">(vous)</span>}
                                </p>
                                <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                            <select
                                aria-label={`Rôle de ${user.email}`}
                                value={user.role}
                                disabled={isSelf}
                                title={isSelf ? 'Vous ne pouvez pas modifier votre propre rôle' : undefined}
                                onChange={(e) => changeRole(user, e.target.value)}
                                className={`text-sm border rounded-lg px-2 py-1.5 ${user.role === 'en_attente' ? 'border-amber-400 bg-amber-50' : 'border-gray-300'} disabled:opacity-60`}
                            >
                                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
