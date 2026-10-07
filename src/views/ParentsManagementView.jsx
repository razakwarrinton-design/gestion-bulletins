import { useState, useEffect } from 'react';
import { Plus, Trash2, UserCheck, UsersRound } from 'lucide-react';
import { supabase } from '../config/supabase';

const ParentsManagementView = ({ openConfirm, showNotification, onAddParent }) => {
    const [parentsList, setParentsList] = useState([]);
    const [loadingParents, setLoadingParents] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select(`
                        id, email, first_name, last_name, created_at,
                        parent_students (
                            student_id,
                            students ( id, first_name, last_name, classes ( name ) )
                        )
                    `)
                    .eq('role', 'parent')
                    .order('created_at', { ascending: false });
                if (!cancelled && !error) setParentsList(data || []);
            } finally {
                if (!cancelled) setLoadingParents(false);
            }
        })();
        return () => { cancelled = true; };
    }, [reloadKey]);

    const fetchParents = () => {
        setLoadingParents(true);
        setReloadKey(k => k + 1);
    };

    const handleDeleteParent = (parent) => {
        openConfirm(
            'Supprimer ce parent ?',
            `Le compte de ${parent.first_name} ${parent.last_name} (${parent.email}) sera supprimé ainsi que ses liaisons élèves.`,
            async () => {
                await supabase.from('parent_students').delete().eq('parent_id', parent.id);
                await supabase.from('user_profiles').delete().eq('id', parent.id);
                showNotification('Parent supprimé avec succès');
                fetchParents();
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* ── En-tête ── */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Gestion des parents</h2>
                    <p className="text-sm text-gray-400 mt-0.5">Créez des comptes parents et associez-les à leurs enfants</p>
                </div>
                <button onClick={() => onAddParent()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm font-medium">
                    <Plus className="w-4 h-4" /> Ajouter un parent
                </button>
            </div>

            {/* ── Comment ça marche ── */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <h3 className="font-bold text-blue-800 mb-3 text-sm">📋 Comment ça marche ?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { n: 1, title: 'Créer un compte', desc: 'Cliquez "Ajouter un parent" → onglet "Créer un parent" → renseignez email et mot de passe' },
                        { n: 2, title: 'Lier à un élève', desc: 'Cliquez "Ajouter un parent" → onglet "Lier un élève" → associez le parent à son enfant' },
                        { n: 3, title: 'Le parent se connecte', desc: "Le parent accède à l'appli avec son email/mot de passe et voit les notes de son enfant" },
                    ].map(({ n, title, desc }) => (
                        <div key={n} className="flex items-start gap-3">
                            <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">{n}</div>
                            <div><p className="font-semibold text-blue-800 text-sm">{title}</p><p className="text-blue-600 text-xs mt-0.5">{desc}</p></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Lien à partager ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                    <p className="font-semibold text-gray-800 text-sm">🔗 Lien à partager aux parents</p>
                    <p className="text-xs text-gray-400 mt-0.5">https://gestion-bulletins-rho.vercel.app</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText('https://gestion-bulletins-rho.vercel.app'); showNotification('Lien copié !'); }}
                    className="bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-100 transition-colors font-medium">
                    📋 Copier le lien
                </button>
            </div>

            {/* ── Liste des parents inscrits ── */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <UsersRound className="w-4 h-4 text-blue-600" />
                        <h3 className="font-bold text-gray-800 text-sm">Parents inscrits</h3>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {parentsList.length}
                        </span>
                    </div>
                    <button onClick={fetchParents} className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                        ↻ Actualiser
                    </button>
                </div>

                {loadingParents ? (
                    <div className="flex items-center justify-center py-12 gap-3">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-400">Chargement...</span>
                    </div>
                ) : parentsList.length === 0 ? (
                    <div className="text-center py-12">
                        <UsersRound className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">Aucun parent inscrit pour le moment</p>
                        <button onClick={() => onAddParent()}
                            className="mt-3 text-xs text-blue-600 hover:underline font-medium">
                            + Ajouter le premier parent
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {parentsList.map(parent => {
                            const enfants = parent.parent_students || [];
                            return (
                                <div key={parent.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {parent.first_name?.[0]}{parent.last_name?.[0]}
                                    </div>

                                    {/* Infos parent */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 text-sm">
                                            {parent.first_name} {parent.last_name}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">{parent.email}</p>
                                    </div>

                                    {/* Enfants liés */}
                                    <div className="hidden md:flex flex-col items-start gap-1 min-w-[180px]">
                                        {enfants.length === 0 ? (
                                            <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-medium">
                                                ⚠️ Aucun élève lié
                                            </span>
                                        ) : (
                                            enfants.map(ps => (
                                                <span key={ps.student_id} className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                    👦 {ps.students?.first_name} {ps.students?.last_name}
                                                    {ps.students?.classes?.name && (
                                                        <span className="text-gray-400 ml-1">— {ps.students.classes.name}</span>
                                                    )}
                                                </span>
                                            ))
                                        )}
                                    </div>

                                    {/* Date d'inscription */}
                                    <div className="hidden lg:block text-right flex-shrink-0">
                                        <p className="text-xs text-gray-400">
                                            {new Date(parent.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => onAddParent()}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                            title="Lier un élève"
                                        >
                                            <UserCheck className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteParent(parent)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParentsManagementView;
