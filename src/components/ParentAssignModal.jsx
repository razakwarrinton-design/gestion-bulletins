import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { supabase } from '../lib/supabaseClient';

/**
 * Modal permettant à l'admin de :
 * 1. Créer un compte parent
 * 2. Lier un parent existant à un élève
 */
export default function ParentAssignModal({ isOpen, onClose, students, classes, showNotification }) {
    const [tab, setTab] = useState('assign'); // 'assign' | 'create'
    const [parents, setParents] = useState([]);
    const [selectedParent, setParent] = useState('');
    const [selectedStudent, setStudent] = useState('');
    const [selectedClass, setClass] = useState('');
    const [loading, setLoading] = useState(false);

    // Champs création compte parent
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (isOpen) fetchParents();
    }, [isOpen]);

    const fetchParents = async () => {
        const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('role', 'parent')
            .order('last_name');
        setParents(data || []);
    };

    const filteredStudents = selectedClass
        ? students.filter(s => (s.classId || s.class_id) === selectedClass)
        : students;

    // ── Créer un compte parent ──────────────────────────────────────────────────
    const handleCreateParent = async () => {
        if (!firstName || !lastName || !email || !password) return;
        setLoading(true);
        try {
            // 1. Créer le compte auth
            const { data: authData, error: authError } = await supabase.auth.admin
                ? await supabase.auth.signUp({ email, password })
                : await supabase.auth.signUp({ email, password });

            if (authError) throw authError;

            const userId = authData.user?.id;
            if (!userId) throw new Error('Compte non créé');

            // 2. Créer le profil
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    id: userId,
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    role: 'parent',
                });

            if (profileError) throw profileError;

            showNotification(`Compte parent créé : ${firstName} ${lastName}`);
            setFirstName(''); setLastName(''); setEmail(''); setPassword('');
            await fetchParents();
            setTab('assign'); // basculer vers l'onglet assignation
        } catch (err) {
            showNotification('Erreur : ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Assigner un élève à un parent ───────────────────────────────────────────
    const handleAssign = async () => {
        if (!selectedParent || !selectedStudent) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('parent_students')
                .insert({ parent_id: selectedParent, student_id: selectedStudent });

            if (error) {
                if (error.code === '23505') {
                    showNotification('Cet élève est déjà lié à ce parent');
                } else throw error;
            } else {
                const parent = parents.find(p => p.id === selectedParent);
                const student = students.find(s => s.id === selectedStudent);
                showNotification(`${student?.firstName} ${student?.lastName} lié(e) à ${parent?.first_name} ${parent?.last_name}`);
                setParent(''); setStudent('');
                onClose();
            }
        } catch (err) {
            showNotification('Erreur : ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Gestion des comptes parents"
            size="md"
        >
            {/* Onglets */}
            <div className="flex gap-2 mb-5">
                <button
                    onClick={() => setTab('assign')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'assign' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    🔗 Lier un élève
                </button>
                <button
                    onClick={() => setTab('create')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'create' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    ➕ Créer un parent
                </button>
            </div>

            {/* Onglet : Assigner */}
            {tab === 'assign' && (
                <div className="space-y-4">
                    {parents.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                            <p className="text-sm">Aucun compte parent existant.</p>
                            <button onClick={() => setTab('create')} className="text-blue-600 text-sm font-semibold mt-1 hover:underline">
                                Créer un compte parent →
                            </button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Parent <span className="text-red-500">*</span></label>
                                <select
                                    value={selectedParent}
                                    onChange={e => setParent(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Sélectionner un parent</option>
                                    {parents.map(p => (
                                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par classe</label>
                                <select
                                    value={selectedClass}
                                    onChange={e => setClass(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Toutes les classes</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Élève <span className="text-red-500">*</span></label>
                                <select
                                    value={selectedStudent}
                                    onChange={e => setStudent(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Sélectionner un élève</option>
                                    {filteredStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleAssign}
                                disabled={!selectedParent || !selectedStudent || loading}
                                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🔗'}
                                Associer l'élève au parent
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Onglet : Créer compte parent */}
            {tab === 'create' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom <span className="text-red-500">*</span></label>
                            <input
                                type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                                placeholder="Ex: Marie" autoFocus
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
                            <input
                                type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                                placeholder="Ex: Diallo"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                        <input
                            type="email" value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="parent@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe <span className="text-red-500">*</span></label>
                        <input
                            type="password" value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="Minimum 6 caractères"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                        💡 Le parent pourra se connecter avec cet email et mot de passe sur l'appli.
                    </div>
                    <button
                        onClick={handleCreateParent}
                        disabled={!firstName || !lastName || !email || !password || loading}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '✅'}
                        Créer le compte parent
                    </button>
                </div>
            )}
        </Modal>
    );
}