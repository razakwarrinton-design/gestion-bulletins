import React, { useState, useEffect } from 'react';
import { useParent } from '../hooks/useParent';
import { supabase } from '../config/supabase';
import {
    GraduationCap, TrendingUp, BookOpen, Award,
    Printer, Lock, AlertTriangle, CheckCircle, CreditCard
} from 'lucide-react';

// ── Helpers couleurs/mentions ─────────────────────────────────────────────────
const gradeColor = (v) => v >= 15 ? '#059669' : v >= 10 ? '#2563eb' : v >= 8 ? '#d97706' : '#dc2626';
const gradeLabel = (v) => v >= 16 ? 'Très Bien' : v >= 14 ? 'Bien' : v >= 12 ? 'Assez Bien' : v >= 10 ? 'Passable' : v >= 8 ? 'Insuffisant' : 'Très Insuffisant';

const getMention = (avg) => {
    const v = parseFloat(avg);
    if (isNaN(v) || v === 0) return { text: '—', color: '#9ca3af' };
    if (v >= 16) return { text: 'Très Bien', color: '#059669' };
    if (v >= 14) return { text: 'Bien', color: '#2563eb' };
    if (v >= 12) return { text: 'Assez Bien', color: '#7c3aed' };
    if (v >= 10) return { text: 'Passable', color: '#d97706' };
    return { text: 'Insuffisant', color: '#dc2626' };
};

const getStatus = (avg) => {
    const v = parseFloat(avg);
    if (isNaN(v)) return null;
    if (v >= 12) return { text: 'ADMIS(E)', color: '#059669', bg: '#ecfdf5' };
    if (v >= 8)  return { text: 'À SUIVRE', color: '#d97706', bg: '#fffbeb' };
    return { text: 'EN DIFFICULTÉ', color: '#dc2626', bg: '#fef2f2' };
};

// ── Carte résumé enfant ───────────────────────────────────────────────────────
function ChildSummaryCard({ child, trimester, calculateAverage, isSelected, onSelect, paymentStatus }) {
    const avg = calculateAverage(child.id, trimester);
    const mention = getMention(avg);
    const status = getStatus(avg);
    const paid = paymentStatus[child.id]?.isPaid;

    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all ${
                isSelected ? 'border-blue-500 shadow-lg bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-md'
            }`}
        >
            {/* Avatar + nom */}
            <div className="flex items-center gap-3 mb-4">
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
                >
                    {child.firstName?.[0]}{child.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{child.firstName} {child.lastName}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> {child.className}
                    </p>
                </div>
                {/* Badge paiement */}
                {paid !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {paid ? '✓ Payé' : '⚠ Dû'}
                    </span>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black" style={{ color: mention.color }}>{avg}</div>
                    <div className="text-xs text-gray-400 uppercase font-semibold mt-0.5">Moyenne T{trimester}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-sm font-bold" style={{ color: mention.color }}>{mention.text}</div>
                    <div className="text-xs text-gray-400 uppercase font-semibold mt-0.5">Mention</div>
                </div>
            </div>

            {status && (
                <div className="mt-3 text-center py-1.5 rounded-lg text-xs font-bold"
                    style={{ color: status.color, background: status.bg }}>
                    {status.text}
                </div>
            )}
        </div>
    );
}

// ── Bannière accès bulletin (payé ou bloqué) ──────────────────────────────────
function BulletinAccessBanner({ childId, paymentStatus, onPrint, child, trimester }) {
    const info = paymentStatus[childId];

    // Pas encore chargé
    if (!info) return null;

    // ✅ Frais réglés → bouton PDF
    if (info.isPaid) {
        return (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-bold text-green-800 text-sm">Frais scolaires réglés</p>
                            <p className="text-green-600 text-xs mt-0.5">
                                {info.totalPaid.toLocaleString('fr-FR')} FCFA payés — Bulletin disponible
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onPrint(child)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm flex-shrink-0"
                    >
                        <Printer className="w-4 h-4" />
                        Imprimer le bulletin
                    </button>
                </div>
            </div>
        );
    }

    // ❌ Frais non réglés → bulletin bloqué
    const resteAPayer = info.totalDue - info.totalPaid;
    const pct = info.totalDue > 0 ? Math.round((info.totalPaid / info.totalDue) * 100) : 0;

    return (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lock className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-red-800 text-sm">Bulletin non disponible</p>
                    <p className="text-red-600 text-xs mt-0.5">
                        Le bulletin sera débloqué une fois les frais scolaires entièrement réglés.
                    </p>
                </div>
            </div>

            {/* Barre de progression paiement */}
            <div className="bg-white rounded-xl p-4 border border-red-100">
                <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-gray-600 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> Situation des frais
                    </span>
                    <span className="text-red-600">{pct}% réglé</span>
                </div>
                <div className="h-2.5 bg-red-100 rounded-full overflow-hidden mb-3">
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${pct}%`,
                            background: pct >= 75 ? '#f59e0b' : pct >= 50 ? '#f97316' : '#ef4444'
                        }}
                    />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                        <p className="text-xs text-gray-400">Total dû</p>
                        <p className="font-bold text-gray-700 text-sm">{info.totalDue.toLocaleString('fr-FR')} F</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Payé</p>
                        <p className="font-bold text-green-600 text-sm">{info.totalPaid.toLocaleString('fr-FR')} F</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Reste à payer</p>
                        <p className="font-bold text-red-600 text-sm">{resteAPayer.toLocaleString('fr-FR')} F</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <p className="text-xs text-orange-700">
                    Contactez l'administration pour régulariser votre situation.
                </p>
            </div>
        </div>
    );
}

// ── Détail des notes d'un élève ────────────────────────────────────────────────
function ChildGradesDetail({ child, trimester, calculateAverage, getStudentGrades, schoolInfo, paymentStatus, onPrint }) {
    const avg = calculateAverage(child.id, trimester);
    const mention = getMention(avg);
    const status = getStatus(avg);
    const studentGrades = getStudentGrades(child.id, trimester);

    // Évolution sur 3 trimestres
    const t1 = parseFloat(calculateAverage(child.id, '1')) || 0;
    const t2 = parseFloat(calculateAverage(child.id, '2')) || 0;
    const t3 = parseFloat(calculateAverage(child.id, '3')) || 0;
    const evolData = [
        { label: 'T1', value: t1 },
        { label: 'T2', value: t2 },
        { label: 'T3', value: t3 },
    ].filter(d => d.value > 0);

    if (studentGrades.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">Aucune note disponible pour le Trimestre {trimester}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">

            {/* En-tête élève */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                            {child.firstName?.[0]}{child.lastName?.[0]}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{child.firstName} {child.lastName}</h2>
                            <p className="text-blue-100 text-sm">{child.className} — Trimestre {trimester}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black">{avg}</div>
                        <div className="text-blue-100 text-sm">/ 20</div>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">{mention.text}</span>
                    {status && (
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">{status.text}</span>
                    )}
                </div>
            </div>

            {/* ✅ Accès bulletin (payé ou bloqué) */}
            <BulletinAccessBanner
                childId={child.id}
                paymentStatus={paymentStatus}
                onPrint={onPrint}
                child={child}
                trimester={trimester}
            />

            {/* Évolution graphique */}
            {evolData.length > 1 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" /> Évolution des moyennes
                    </h3>
                    <div className="flex items-end gap-4 h-24">
                        {evolData.map((d, i) => {
                            const h = (d.value / 20) * 80;
                            const color = gradeColor(d.value);
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-xs font-bold" style={{ color }}>{d.value.toFixed(2)}</span>
                                    <div className="w-full rounded-t-lg" style={{ height: h, background: color, minHeight: 4 }} />
                                    <span className="text-xs text-gray-400 font-semibold">{d.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tableau des notes */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" /> Résultats par matière
                    </h3>
                </div>
                <div className="divide-y divide-gray-50 px-5 py-2">
                    {studentGrades.map((g, i) => {
                        const color = gradeColor(g.value);
                        const pct = (g.value / 20) * 100;
                        return (
                            <div key={i} className="py-3">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-800 text-sm">{g.subjectName}</span>
                                        {g.coefficient && (
                                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">×{g.coefficient}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                                            style={{ color, background: color + '18' }}>
                                            {gradeLabel(g.value)}
                                        </span>
                                        <span className="font-black text-lg" style={{ color }}>{g.value.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all"
                                        style={{ width: `${pct}%`, background: color }} />
                                </div>
                                {g.appreciation && (
                                    <p className="text-xs text-gray-400 italic mt-1.5">"{g.appreciation}"</p>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-gray-700">Moyenne générale</span>
                    <span className="text-2xl font-black" style={{ color: mention.color }}>{avg}/20</span>
                </div>
            </div>

            {/* Points forts & faibles */}
            {studentGrades.length >= 2 && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                        <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-1.5">
                            <Award className="w-4 h-4" /> Points forts
                        </h4>
                        {studentGrades.slice(0, 3).map((g, i) => (
                            <div key={i} className="flex justify-between items-center py-1.5 border-b border-emerald-100 last:border-0">
                                <span className="text-sm font-medium text-emerald-700">{g.subjectName}</span>
                                <span className="font-black text-emerald-600">{g.value.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                        <h4 className="font-bold text-red-800 mb-3 flex items-center gap-1.5">
                            ⚠️ À renforcer
                        </h4>
                        {[...studentGrades].reverse().slice(0, 3).map((g, i) => (
                            <div key={i} className="flex justify-between items-center py-1.5 border-b border-red-100 last:border-0">
                                <span className="text-sm font-medium text-red-700">{g.subjectName}</span>
                                <span className="font-black text-red-600">{g.value.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}

// ── Composant principal ParentPortal ──────────────────────────────────────────
export default function ParentPortal({ currentUser, schoolInfo, onPrint }) {
    const [selectedTrimester, setSelectedTrimester] = useState('1');
    const [selectedChild, setSelectedChild] = useState(null);
    // Statut des paiements par enfant : { [studentId]: { isPaid, totalPaid, totalDue } }
    const [paymentStatus, setPaymentStatus] = useState({});

    const {
        children,
        loading,
        error,
        calculateAverage,
        getStudentGrades,
    } = useParent(currentUser?.id);

    // Sélectionner le premier enfant automatiquement
    useEffect(() => {
        if (children.length > 0 && !selectedChild) {
            setSelectedChild(children[0]);
        }
    }, [children]);

    // Charger le statut des paiements pour chaque enfant
    useEffect(() => {
        if (children.length === 0) return;

        const fetchPayments = async () => {
            const ids = children.map(c => c.id);
            const { data, error } = await supabase
                .from('payments')
                .select('student_id, amount_paid, amount_due')
                .in('student_id', ids);

            if (error || !data) return;

            // Agréger par élève
            const status = {};
            ids.forEach(id => {
                const rows = data.filter(p => p.student_id === id);
                const totalPaid = rows.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
                const totalDue  = rows.reduce((s, p) => s + parseFloat(p.amount_due  || 0), 0);
                status[id] = {
                    isPaid: totalDue === 0 ? null : totalPaid >= totalDue,
                    totalPaid,
                    totalDue,
                };
            });
            setPaymentStatus(status);
        };

        fetchPayments();
    }, [children]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500">Chargement de l'espace parent...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <p className="text-red-700 font-semibold">Erreur de chargement</p>
                <p className="text-red-500 text-sm mt-1">{error}</p>
            </div>
        );
    }

    if (children.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Aucun élève associé</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                    Aucun élève n'est encore lié à votre compte. Contactez l'administration pour associer vos enfants.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">👨‍👩‍👧 Espace Parents</h2>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Bienvenue, {currentUser?.firstName} — {children.length} élève{children.length > 1 ? 's' : ''} suivi{children.length > 1 ? 's' : ''}
                    </p>
                </div>
                {/* Sélecteur trimestre */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Trimestre :</span>
                    {['1', '2', '3'].map(t => (
                        <button
                            key={t}
                            onClick={() => setSelectedTrimester(t)}
                            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                                selectedTrimester === t
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            T{t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cartes résumé enfants (si plusieurs) */}
            {children.length > 1 && (
                <div className={`grid gap-4 ${children.length === 2 ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                    {children.map(child => (
                        <ChildSummaryCard
                            key={child.id}
                            child={child}
                            trimester={selectedTrimester}
                            calculateAverage={calculateAverage}
                            isSelected={selectedChild?.id === child.id}
                            onSelect={() => setSelectedChild(child)}
                            paymentStatus={paymentStatus}
                        />
                    ))}
                </div>
            )}

            {/* Détail de l'enfant sélectionné */}
            {selectedChild && (
                <ChildGradesDetail
                    child={selectedChild}
                    trimester={selectedTrimester}
                    calculateAverage={calculateAverage}
                    getStudentGrades={getStudentGrades}
                    schoolInfo={schoolInfo}
                    paymentStatus={paymentStatus}
                    onPrint={onPrint}
                />
            )}

        </div>
    );
}