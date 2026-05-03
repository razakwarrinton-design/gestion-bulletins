import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { supabase } from '../lib/supabaseClient';

export default function ParentAssignModal({ isOpen, onClose, students, classes, showNotification }) {
    const [tab, setTab] = useState('assign');
    const [parents, setParents] = useState([]);
    const [selectedParent, setParent] = useState('');
    const [selectedStudent, setStudent] = useState('');
    const [selectedClass, setClass] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Champs création
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [linkStudent, setLinkStudent] = useState('');
    const [linkClass, setLinkClass] = useState('');

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

    const filteredStudentsCreate = linkClass
        ? students.filter(s => (s.classId || s.class_id) === linkClass)
        : students;

    // ── Créer compte parent via Edge Function ────────────────────────────────
    const handleCreateParent = async () => {
        if (!firstName || !lastName || !email || !password) {
            setError('Tous les champs obligatoires doivent être remplis'); return;
        }
        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères'); return;
        }
        setLoading(true); setError('');
        try {
            const { data, error: fnError } = await supabase.functions.invoke('create-parent-account', {
                body: {
                    firstName, lastName, email, password,
                    studentId: linkStudent || null
                }
            });

            if (fnError) throw fnError;
            if (data?.error) throw new Error(data.error);

            showNotification(`✅ Compte parent créé : ${firstName} ${lastName}`);
            setFirstName(''); setLastName(''); setEmail(''); setPassword('');
            setLinkStudent(''); setLinkClass('');
            await fetchParents();
            setTab('assign');
            onClose();
        } catch (e) {
            setError('Erreur : ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Lier un élève à un parent existant ───────────────────────────────────
    const handleAssign = async () => {
        if (!selectedParent || !selectedStudent) {
            setError('Sélectionnez un parent et un élève'); return;
        }
        setLoading(true); setError('');
        try {
            const { error } = await supabase
                .from('parent_students')
                .insert({ parent_id: selectedParent, student_id: selectedStudent });

            if (error) {
                if (error.code === '23505') {
                    setError('Cet élève est déjà lié à ce parent');
                } else throw error;
            } else {
                const parent = parents.find(p => p.id === selectedParent);
                const student = students.find(s => s.id === selectedStudent);
                showNotification(`✅ ${student?.firstName} ${student?.lastName} lié(e) à ${parent?.first_name} ${parent?.last_name}`);
                setParent(''); setStudent(''); setError('');
                onClose();
            }
        } catch (e) {
            setError('Erreur : ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setError('');
        setFirstName(''); setLastName(''); setEmail(''); setPassword('');
        setParent(''); setStudent('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Gestion des comptes parents" size="md">

            {/* Onglets */}
            <div className="flex gap-2 mb-5">
                <button onClick={() => { setTab('assign'); setError(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'assign' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    🔗 Lier un élève
                </button>
                <button onClick={() => { setTab('create'); setError(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'create' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    ➕ Créer un parent
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* ── Onglet Assigner ──────────────────────────────────────────────── */}
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
                                <select value={selectedParent} onChange={e => setParent(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">Sélectionner un parent</option>
                                    {parents.map(p => (
                                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par classe</label>
                                <select value={selectedClass} onChange={e => setClass(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">Toutes les classes</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Élève <span className="text-red-500">*</span></label>
                                <select value={selectedStudent} onChange={e => setStudent(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">Sélectionner un élève</option>
                                    {filteredStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                                    ))}
                                </select>
                            </div>
                            <button onClick={handleAssign} disabled={!selectedParent || !selectedStudent || loading}
                                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🔗'}
                                Associer l'élève au parent
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ── Onglet Créer ─────────────────────────────────────────────────── */}
            {tab === 'create' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom <span className="text-red-500">*</span></label>
                            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                                placeholder="Ex: Marie" autoFocus
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
                            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                                placeholder="Ex: Diallo"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="parent@gmail.com ou tout autre email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe <span className="text-red-500">*</span></label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="Minimum 6 caractères"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    {/* Lier directement à un élève */}
                    <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Lier à un élève (optionnel)</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Classe</label>
                                <select value={linkClass} onChange={e => setLinkClass(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">Toutes</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Élève</label>
                                <select value={linkStudent} onChange={e => setLinkStudent(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">Aucun</option>
                                    {filteredStudentsCreate.map(s => (
                                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                        💡 Le parent pourra se connecter avec n'importe quel email valide (Gmail, Yahoo, etc.)
                    </div>

                    <button onClick={handleCreateParent}
                        disabled={!firstName || !lastName || !email || !password || loading}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '✅'}
                        Créer le compte parent
                    </button>
                </div>
            )}
        </Modal>
    );
}