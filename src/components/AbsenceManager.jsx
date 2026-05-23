import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabase';
import {
    ClipboardList, Plus, Check, X, Search, Filter,
    AlertTriangle, Clock, UserX, ChevronDown, RefreshCw,
    CheckCircle, BookOpen, Trash2, Shield
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Composant principal ───────────────────────────────────────────────────────
export default function AbsenceManager({ classes, students, subjects, currentUser }) {
    const [activeTab, setActiveTab] = useState('saisie');
    const [absences, setAbsences] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notification, setNotif] = useState('');

    // ── Filtres historique ──
    const [filterClass, setFilterClass] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterSearch, setFilterSearch] = useState('');

    // ── Formulaire saisie ──
    const [formClass, setFormClass] = useState('');
    const [formDate, setFormDate] = useState(today());
    const [formSubject, setFormSubject] = useState('');
    const [formNotes, setFormNotes] = useState('');
    // Map studentId → { selected, type: 'absent'|'retard', justified: false }
    const [formEntries, setFormEntries] = useState({});

    const showNotif = (msg) => { setNotif(msg); setTimeout(() => setNotif(''), 3000); };

    // ── Élèves de la classe sélectionnée ──
    const classStudents = useMemo(() =>
        formClass ? students.filter(s => (s.classId || s.class_id) === formClass) : []
        , [formClass, students]);

    // Init entries quand la classe change
    useEffect(() => {
        const entries = {};
        classStudents.forEach(s => { entries[s.id] = { selected: false, type: 'absent', justified: false }; });
        setFormEntries(entries);
    }, [formClass]);

    // ── Charger les absences ──
    const fetchAbsences = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('absences')
            .select(`
                id, date, type, justified, notes,
                students ( id, first_name, last_name, class_id, classes ( name ) ),
                subjects ( name ),
                user_profiles!recorded_by ( first_name, last_name )
            `)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(500);
        setAbsences(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAbsences(); }, [fetchAbsences]);

    // ── Sauvegarder les absences saisies ──
    const handleSave = async () => {
        const selected = Object.entries(formEntries).filter(([, e]) => e.selected);
        if (selected.length === 0) { showNotif('Sélectionne au moins un élève'); return; }
        setSaving(true);
        const rows = selected.map(([studentId, e]) => ({
            student_id: studentId,
            date: formDate,
            type: e.type,
            justified: e.justified,
            subject_id: formSubject || null,
            notes: formNotes || null,
            recorded_by: currentUser?.id || null,
        }));
        const { error } = await supabase.from('absences').insert(rows);
        setSaving(false);
        if (error) { showNotif('Erreur lors de la sauvegarde'); return; }
        showNotif(`✅ ${rows.length} absence${rows.length > 1 ? 's' : ''} enregistrée${rows.length > 1 ? 's' : ''}`);
        // Reset sélections
        setFormEntries(prev => {
            const next = { ...prev };
            selected.forEach(([id]) => { next[id] = { ...next[id], selected: false }; });
            return next;
        });
        setFormNotes('');
        fetchAbsences();
    };

    // ── Justifier une absence ──
    const toggleJustify = async (id, current) => {
        await supabase.from('absences').update({ justified: !current }).eq('id', id);
        setAbsences(prev => prev.map(a => a.id === id ? { ...a, justified: !current } : a));
    };

    // ── Supprimer une absence ──
    const deleteAbsence = async (id) => {
        await supabase.from('absences').delete().eq('id', id);
        setAbsences(prev => prev.filter(a => a.id !== id));
        showNotif('Absence supprimée');
    };

    // ── Absences filtrées ──
    const filteredAbsences = useMemo(() => absences.filter(a => {
        const name = `${a.students?.first_name} ${a.students?.last_name}`.toLowerCase();
        if (filterClass && a.students?.class_id !== filterClass) return false;
        if (filterType && a.type !== filterType) return false;
        if (filterDate && a.date !== filterDate) return false;
        if (filterSearch && !name.includes(filterSearch.toLowerCase())) return false;
        return true;
    }), [absences, filterClass, filterType, filterDate, filterSearch]);

    // ── Statistiques par élève ──
    const statsParEleve = useMemo(() => {
        const map = {};
        absences.forEach(a => {
            const sid = a.students?.id;
            if (!sid) return;
            if (!map[sid]) map[sid] = {
                name: `${a.students.first_name} ${a.students.last_name}`,
                className: a.students.classes?.name || '—',
                absents: 0, retards: 0, injustifies: 0,
            };
            if (a.type === 'absent') map[sid].absents++;
            if (a.type === 'retard') map[sid].retards++;
            if (!a.justified) map[sid].injustifies++;
        });
        return Object.values(map).sort((a, b) => b.absents + b.retards - (a.absents + a.retards));
    }, [absences]);

    const totalAbsents = absences.filter(a => a.type === 'absent').length;
    const totalRetards = absences.filter(a => a.type === 'retard').length;
    const totalInjust = absences.filter(a => !a.justified).length;

    const selectAll = () => setFormEntries(prev => { const n = { ...prev }; classStudents.forEach(s => { n[s.id] = { ...n[s.id], selected: true }; }); return n; });
    const deselectAll = () => setFormEntries(prev => { const n = { ...prev }; classStudents.forEach(s => { n[s.id] = { ...n[s.id], selected: false }; }); return n; });

    return (
        <div className="space-y-6">

            {/* Notification */}
            {notification && (
                <div className="fixed top-4 right-4 z-[100] bg-white border border-green-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="text-sm font-medium text-gray-800">{notification}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-blue-600" /> Gestion des absences
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">Saisie et suivi des absences et retards</p>
                </div>
                <button onClick={fetchAbsences} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Absences', value: totalAbsents, icon: <UserX className="w-5 h-5" />, color: '#dc2626', bg: '#fef2f2' },
                    { label: 'Retards', value: totalRetards, icon: <Clock className="w-5 h-5" />, color: '#d97706', bg: '#fffbeb' },
                    { label: 'Non justifiés', value: totalInjust, icon: <AlertTriangle className="w-5 h-5" />, color: '#7c3aed', bg: '#f5f3ff' },
                ].map((k, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: k.bg, color: k.color }}>
                            {k.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
                            <p className="text-xs text-gray-400 font-medium">{k.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Onglets */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
                {[
                    { key: 'saisie', icon: <Plus className="w-4 h-4" />, label: 'Saisie rapide' },
                    { key: 'historique', icon: <ClipboardList className="w-4 h-4" />, label: 'Historique' },
                    { key: 'stats', icon: <UserX className="w-4 h-4" />, label: 'Par élève' },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Onglet Saisie rapide ── */}
            {activeTab === 'saisie' && (
                <div className="space-y-4">
                    {/* Filtres du formulaire */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
                        <h3 className="font-bold text-gray-800 text-sm">📋 Paramètres de la saisie</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Classe *</label>
                                <select value={formClass} onChange={e => setFormClass(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Sélectionner une classe</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date *</label>
                                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Matière (optionnel)</label>
                                <select value={formSubject} onChange={e => setFormSubject(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">— Toutes matières</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
                                <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)}
                                    placeholder="Raison, observations..."
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Liste élèves */}
                    {formClass && classStudents.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-800 text-sm">
                                        Élèves — {classes.find(c => c.id === formClass)?.name}
                                    </h3>
                                    <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                                        {Object.values(formEntries).filter(e => e.selected).length} sélectionné{Object.values(formEntries).filter(e => e.selected).length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={selectAll} className="text-xs text-blue-600 hover:underline font-medium">Tout sélectionner</button>
                                    <span className="text-gray-300">|</span>
                                    <button onClick={deselectAll} className="text-xs text-gray-500 hover:underline font-medium">Désélectionner</button>
                                </div>
                            </div>

                            <div className="divide-y divide-gray-50">
                                {classStudents.map(student => {
                                    const entry = formEntries[student.id] || { selected: false, type: 'absent', justified: false };
                                    return (
                                        <div key={student.id}
                                            className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${entry.selected ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => setFormEntries(prev => ({ ...prev, [student.id]: { ...entry, selected: !entry.selected } }))}
                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${entry.selected ? 'bg-red-500 border-red-500' : 'border-gray-300 hover:border-red-400'
                                                    }`}>
                                                {entry.selected && <Check className="w-3 h-3 text-white" />}
                                            </button>

                                            {/* Avatar + nom */}
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                    {student.firstName?.[0] || student.first_name?.[0]}
                                                    {student.lastName?.[0] || student.last_name?.[0]}
                                                </div>
                                                <span className="font-semibold text-gray-800 text-sm truncate">
                                                    {student.firstName || student.first_name} {student.lastName || student.last_name}
                                                </span>
                                            </div>

                                            {/* Type + Justifié (visible si sélectionné) */}
                                            {entry.selected && (
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    {/* Type */}
                                                    <div className="flex gap-1">
                                                        {['absent', 'retard'].map(t => (
                                                            <button key={t} onClick={() => setFormEntries(prev => ({ ...prev, [student.id]: { ...entry, type: t } }))}
                                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${entry.type === t
                                                                        ? t === 'absent' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                                                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                                    }`}>
                                                                {t === 'absent' ? '🔴 Absent' : '🟡 Retard'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Justifié */}
                                                    <button onClick={() => setFormEntries(prev => ({ ...prev, [student.id]: { ...entry, justified: !entry.justified } }))}
                                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${entry.justified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                            }`}>
                                                        <Shield className="w-3 h-3" />
                                                        {entry.justified ? 'Justifié' : 'Justifier?'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Bouton sauvegarder */}
                            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                                <button onClick={handleSave} disabled={saving || Object.values(formEntries).every(e => !e.selected)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                                    {saving ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enregistrement...</>
                                    ) : (
                                        <><ClipboardList className="w-4 h-4" /> Enregistrer les absences</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {formClass && classStudents.length === 0 && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                            <p className="text-gray-400 text-sm">Aucun élève dans cette classe</p>
                        </div>
                    )}

                    {!formClass && (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">Sélectionne une classe pour commencer la saisie</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Onglet Historique ── */}
            {activeTab === 'historique' && (
                <div className="space-y-4">
                    {/* Filtres */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input type="text" value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
                                    placeholder="Rechercher un élève..."
                                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                                className="border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Toutes les classes</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                className="border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Absent + Retard</option>
                                <option value="absent">Absences seulement</option>
                                <option value="retard">Retards seulement</option>
                            </select>
                            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                                className="border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    {/* Tableau */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 text-sm">Historique des absences</h3>
                            <span className="text-xs text-gray-400">{filteredAbsences.length} enregistrement{filteredAbsences.length > 1 ? 's' : ''}</span>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-10 gap-3">
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-gray-400">Chargement...</span>
                            </div>
                        ) : filteredAbsences.length === 0 ? (
                            <div className="py-10 text-center">
                                <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Aucune absence enregistrée</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {filteredAbsences.map(a => (
                                    <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                                        {/* Type badge */}
                                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${a.type === 'absent' ? 'bg-red-100' : 'bg-amber-100'
                                            }`}>
                                            {a.type === 'absent' ? '🔴' : '🟡'}
                                        </span>

                                        {/* Infos */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 text-sm">
                                                {a.students?.first_name} {a.students?.last_name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-xs text-gray-400">{a.students?.classes?.name}</span>
                                                {a.subjects?.name && (
                                                    <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                                                        {a.subjects.name}
                                                    </span>
                                                )}
                                                {a.notes && <span className="text-xs text-gray-400 italic">"{a.notes}"</span>}
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs font-semibold text-gray-700">{fmtDate(a.date)}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {a.user_profiles ? `${a.user_profiles.first_name} ${a.user_profiles.last_name}` : 'Système'}
                                            </p>
                                        </div>

                                        {/* Justifié + Actions */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => toggleJustify(a.id, a.justified)}
                                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${a.justified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-green-50'
                                                    }`}>
                                                <Shield className="w-3 h-3" />
                                                {a.justified ? 'Justifié' : 'À justifier'}
                                            </button>
                                            {(currentUser?.role === 'admin') && (
                                                <button onClick={() => deleteAbsence(a.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Onglet Stats par élève ── */}
            {activeTab === 'stats' && (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-800 text-sm">Récapitulatif par élève</h3>
                    </div>
                    {statsParEleve.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-sm text-gray-400">Aucune donnée disponible</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {statsParEleve.map((s, i) => {
                                const total = s.absents + s.retards;
                                const risk = s.absents >= 5 || s.injustifies >= 3;
                                return (
                                    <div key={i} className={`flex items-center gap-4 px-5 py-3.5 ${risk ? 'bg-red-50/50' : 'hover:bg-gray-50'} transition-colors`}>
                                        {/* Rang */}
                                        <div className="w-6 text-center text-xs font-bold text-gray-400 flex-shrink-0">{i + 1}</div>

                                        {/* Avatar + nom */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${risk ? 'bg-red-500' : 'bg-blue-500'}`}>
                                                {s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-800 text-sm truncate">{s.name}</p>
                                                <p className="text-xs text-gray-400">{s.className}</p>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400">Absences</p>
                                                <p className={`font-black text-sm ${s.absents >= 5 ? 'text-red-600' : 'text-gray-700'}`}>{s.absents}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400">Retards</p>
                                                <p className={`font-black text-sm ${s.retards >= 5 ? 'text-amber-600' : 'text-gray-700'}`}>{s.retards}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400">Injustifiés</p>
                                                <p className={`font-black text-sm ${s.injustifies >= 3 ? 'text-purple-600' : 'text-gray-700'}`}>{s.injustifies}</p>
                                            </div>
                                            {risk && (
                                                <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">⚠️ À surveiller</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}