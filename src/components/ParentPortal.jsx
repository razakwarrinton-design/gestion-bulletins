import React, { useState, useEffect } from 'react';
import { useParent } from '../hooks/useParent';
import { supabase } from '../config/supabase';
import PaymentHistory from './PaymentHistory';
import PaymentModal from './PaymentModal';
import {
    GraduationCap, TrendingUp, BookOpen, Award,
    Printer, Lock, AlertTriangle, CheckCircle, CreditCard,
    Trophy, KeyRound, Eye, EyeOff, ChevronDown, ChevronUp,
    Receipt, Wallet, LayoutDashboard, Calendar, UserX, Shield, Clock
} from 'lucide-react';
import ParentDashboard from './ParentDashboard';
// ── Helpers ───────────────────────────────────────────────────────────────────
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
    if (v >= 8) return { text: 'À SUIVRE', color: '#d97706', bg: '#fffbeb' };
    return { text: 'EN DIFFICULTÉ', color: '#dc2626', bg: '#fef2f2' };
};

// Suffixe ordinal français : 1er, 2ème, 3ème...
const ordinal = (n) => n === 1 ? '1er' : `${n}ème`;

// ── Carte résumé enfant ───────────────────────────────────────────────────────
function ChildSummaryCard({ child, trimester, calculateAverage, isSelected, onSelect, paymentStatus, rankData }) {
    const avg = calculateAverage(child.id, trimester);
    const mention = getMention(avg);
    const status = getStatus(avg);
    const paid = paymentStatus[child.id]?.isPaid;
    const rank = rankData[`${child.id}_${trimester}`];

    return (
        <div
            onClick={onSelect}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all ${isSelected
                ? 'border-blue-500 shadow-lg bg-blue-50'
                : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-md'
                }`}
        >
            {/* Avatar + nom */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                    {child.firstName?.[0]}{child.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{child.firstName} {child.lastName}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> {child.className}
                    </p>
                </div>
                {paid !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
                    {rank ? (
                        <>
                            <div className="text-lg font-black text-amber-500">{ordinal(rank.rang)}</div>
                            <div className="text-xs text-gray-400 uppercase font-semibold mt-0.5">/ {rank.total} élèves</div>
                        </>
                    ) : (
                        <>
                            <div className="text-sm font-bold" style={{ color: mention.color }}>{mention.text}</div>
                            <div className="text-xs text-gray-400 uppercase font-semibold mt-0.5">Mention</div>
                        </>
                    )}
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

// ── Bannière accès bulletin ───────────────────────────────────────────────────
function BulletinAccessBanner({ childId, paymentStatus, onPrint, child }) {
    const info = paymentStatus[childId];
    if (!info) return null;

    if (info.isPaid) {
        return (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            {info.noFees ? (
                                <>
                                    <p className="font-bold text-green-800 text-sm">Accès bulletin autorisé</p>
                                    <p className="text-green-600 text-xs mt-0.5">Aucun frais en attente pour cet élève</p>
                                </>
                            ) : (
                                <>
                                    <p className="font-bold text-green-800 text-sm">Frais scolaires réglés</p>
                                    <p className="text-green-600 text-xs mt-0.5">
                                        {info.totalPaid.toLocaleString('fr-FR')} FCFA payés — Bulletin disponible
                                    </p>
                                </>
                            )}
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
            <div className="bg-white rounded-xl p-4 border border-red-100">
                <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-gray-600 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> Situation des frais
                    </span>
                    <span className="text-red-600">{pct}% réglé</span>
                </div>
                <div className="h-2.5 bg-red-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all"
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
                <p className="text-xs text-orange-700">Contactez l'administration pour régulariser votre situation.</p>
            </div>
        </div>
    );
}

// ── Section changement de mot de passe ────────────────────────────────────────
function ChangePasswordSection({ onNotify }) {
    const [open, setOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);

    const handleSubmit = async () => {
        setError('');
        if (newPassword.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        setLoading(true);
        const { error: err } = await supabase.auth.updateUser({ password: newPassword });
        setLoading(false);
        if (err) {
            setError(err.message);
        } else {
            setNewPassword('');
            setConfirmPassword('');
            setOpen(false);
            onNotify('Mot de passe modifié avec succès ! 🔐');
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* En-tête cliquable */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                        <KeyRound className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-gray-800 text-sm">Changer mon mot de passe</p>
                        <p className="text-xs text-gray-400">Modifier votre mot de passe de connexion</p>
                    </div>
                </div>
                {open
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
            </button>

            {/* Formulaire dépliable */}
            {open && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                    {/* Nouveau mot de passe */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Nouveau mot de passe
                        </label>
                        <div className="relative">
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Minimum 6 caractères"
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirmer mot de passe */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Confirmer le mot de passe
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Répétez le mot de passe"
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Indicateur de force */}
                    {newPassword.length > 0 && (
                        <div>
                            <div className="flex gap-1 mb-1">
                                {[1, 2, 3, 4].map(i => {
                                    const strength = newPassword.length >= 10 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword) ? 4
                                        : newPassword.length >= 8 && (/[A-Z]/.test(newPassword) || /[0-9]/.test(newPassword)) ? 3
                                            : newPassword.length >= 6 ? 2 : 1;
                                    return (
                                        <div key={i} className="flex-1 h-1.5 rounded-full"
                                            style={{ background: i <= strength ? (strength >= 4 ? '#059669' : strength >= 3 ? '#2563eb' : strength >= 2 ? '#f59e0b' : '#ef4444') : '#e5e7eb' }}
                                        />
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-400">
                                {newPassword.length < 6 ? 'Trop court' : newPassword.length < 8 ? 'Faible' : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'Fort 💪' : 'Moyen'}
                            </p>
                        </div>
                    )}

                    {/* Erreur */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <p className="text-red-700 text-xs">{error}</p>
                        </div>
                    )}

                    {/* Bouton */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !newPassword || !confirmPassword}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enregistrement...</>
                        ) : (
                            <><KeyRound className="w-4 h-4" /> Enregistrer le nouveau mot de passe</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Évolution trimestrielle ──────────────────────────────────────────────────
function EvolutionTrimestrielle({ child, currentTrimester, calculateAverage, getStudentGrades }) {
    const avgs = ['1', '2', '3'].map(t => ({
        t,
        label: `T${t}`,
        value: parseFloat(calculateAverage(child.id, t)) || 0,
        hasData: parseFloat(calculateAverage(child.id, t)) > 0,
    }));

    const availableTrims = avgs.filter(d => d.hasData);
    if (availableTrims.length < 2) return null; // pas assez de données

    const maxVal = Math.max(...availableTrims.map(d => d.value), 1);

    // Évolution par matière : on compare chaque trimestre disponible
    const subjectEvolution = (() => {
        const subjectMap = {};
        avgs.forEach(({ t, hasData }) => {
            if (!hasData) return;
            const grades = getStudentGrades(child.id, t);
            grades.forEach(g => {
                if (!subjectMap[g.subjectName]) subjectMap[g.subjectName] = {};
                subjectMap[g.subjectName][t] = g.value;
            });
        });
        return Object.entries(subjectMap)
            .map(([name, scores]) => ({ name, scores }))
            .sort((a, b) => a.name.localeCompare(b.name));
    })();

    // Meilleure progression et plus grosse régression
    const progressions = subjectEvolution.map(({ name, scores }) => {
        const vals = avgs.filter(d => d.hasData && scores[d.t] !== undefined).map(d => scores[d.t]);
        if (vals.length < 2) return null;
        return { name, delta: vals[vals.length - 1] - vals[0] };
    }).filter(Boolean);

    const bestProgress = progressions.sort((a, b) => b.delta - a.delta)[0];
    const worstRegress = [...progressions].sort((a, b) => a.delta - b.delta)[0];

    // Tendance globale
    const firstAvg = availableTrims[0].value;
    const lastAvg = availableTrims[availableTrims.length - 1].value;
    const globalDelta = lastAvg - firstAvg;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* En-tête */}
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" /> Évolution trimestrielle
                </h3>
                {/* Tendance globale */}
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${globalDelta > 0.5 ? 'bg-green-100 text-green-700' :
                    globalDelta < -0.5 ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                    {globalDelta > 0.5 ? '↑' : globalDelta < -0.5 ? '↓' : '→'}
                    {globalDelta > 0 ? '+' : ''}{globalDelta.toFixed(2)} pts
                </span>
            </div>

            <div className="p-5 space-y-5">

                {/* ── Graphique barres ── */}
                <div className="flex items-end gap-3">
                    {avgs.map(({ t, label, value, hasData }, i) => {
                        const isCurrent = t === currentTrimester;
                        const h = hasData ? Math.max((value / 20) * 100, 4) : 0;
                        const color = gradeColor(value);
                        const prevVal = i > 0 ? avgs[i - 1].value : null;
                        const delta = prevVal && hasData ? value - prevVal : null;

                        return (
                            <div key={t} className="flex-1 flex flex-col items-center gap-1.5">
                                {/* Delta vs trimestre précédent */}
                                <div className="h-5 flex items-center">
                                    {delta !== null && avgs[i - 1].hasData && (
                                        <span className={`text-xs font-bold ${delta > 0.5 ? 'text-green-600' : delta < -0.5 ? 'text-red-500' : 'text-gray-400'
                                            }`}>
                                            {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                                        </span>
                                    )}
                                </div>

                                {/* Valeur */}
                                {hasData && (
                                    <span className="text-sm font-black" style={{ color }}>{value.toFixed(2)}</span>
                                )}

                                {/* Barre */}
                                <div className="w-full flex flex-col justify-end" style={{ height: 110 }}>
                                    {hasData ? (
                                        <div
                                            className="w-full rounded-t-xl transition-all duration-700 relative"
                                            style={{
                                                height: `${h}%`,
                                                background: isCurrent
                                                    ? `linear-gradient(180deg, ${color}, ${color}bb)`
                                                    : color + '66',
                                                border: isCurrent ? `2px solid ${color}` : 'none',
                                                minHeight: 6,
                                            }}
                                        >
                                            {isCurrent && (
                                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
                                                    style={{ background: color }} />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full rounded-t-xl bg-gray-100 flex items-center justify-center"
                                            style={{ height: 20 }}>
                                            <span className="text-xs text-gray-400">—</span>
                                        </div>
                                    )}
                                </div>

                                {/* Label */}
                                <span className={`text-xs font-bold ${isCurrent ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {label} {isCurrent && '●'}
                                </span>
                                {hasData && (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                        style={{ color, background: color + '18' }}>
                                        {gradeLabel(value)}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── Ligne de repère 10/20 ── */}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="flex-1 border-t border-dashed border-gray-200" />
                    <span>Moyenne minimale : 10/20</span>
                    <div className="flex-1 border-t border-dashed border-gray-200" />
                </div>

                {/* ── Bilan progression ── */}
                {progressions.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        {bestProgress?.delta > 0 && (
                            <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
                                <span className="text-lg">📈</span>
                                <div>
                                    <p className="text-xs font-bold text-green-800">Meilleure progression</p>
                                    <p className="text-xs text-green-700 font-semibold mt-0.5">
                                        {bestProgress.name}
                                        <span className="ml-1 text-green-600">+{bestProgress.delta.toFixed(2)} pts</span>
                                    </p>
                                </div>
                            </div>
                        )}
                        {worstRegress?.delta < 0 && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
                                <span className="text-lg">📉</span>
                                <div>
                                    <p className="text-xs font-bold text-red-800">À surveiller</p>
                                    <p className="text-xs text-red-700 font-semibold mt-0.5">
                                        {worstRegress.name}
                                        <span className="ml-1 text-red-600">{worstRegress.delta.toFixed(2)} pts</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tableau évolution par matière ── */}
                {subjectEvolution.length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                            Détail par matière
                        </p>
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                            {/* En-tête tableau */}
                            <div className="grid bg-gray-50 border-b border-gray-100 px-3 py-2"
                                style={{ gridTemplateColumns: '1fr repeat(3, 64px) 56px' }}>
                                <span className="text-xs font-bold text-gray-500">Matière</span>
                                {avgs.map(({ t, label, hasData }) => (
                                    <span key={t} className={`text-xs font-bold text-center ${t === currentTrimester ? 'text-blue-600' : 'text-gray-400'
                                        } ${!hasData ? 'opacity-40' : ''}`}>
                                        {label}
                                    </span>
                                ))}
                                <span className="text-xs font-bold text-gray-500 text-center">Évol.</span>
                            </div>

                            {/* Lignes matières */}
                            {subjectEvolution.map(({ name, scores }, idx) => {
                                const vals = avgs.filter(d => d.hasData && scores[d.t] !== undefined).map(d => scores[d.t]);
                                const delta = vals.length >= 2 ? vals[vals.length - 1] - vals[0] : null;
                                return (
                                    <div key={name}
                                        className={`grid items-center px-3 py-2.5 border-b border-gray-50 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                        style={{ gridTemplateColumns: '1fr repeat(3, 64px) 56px' }}>
                                        <span className="text-xs font-semibold text-gray-700 truncate pr-2">{name}</span>
                                        {avgs.map(({ t, hasData }) => {
                                            const v = scores[t];
                                            const color = v !== undefined ? gradeColor(v) : '#d1d5db';
                                            return (
                                                <div key={t} className="text-center">
                                                    {v !== undefined ? (
                                                        <span className="text-xs font-black" style={{ color }}>{v.toFixed(1)}</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-300">—</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <div className="text-center">
                                            {delta !== null ? (
                                                <span className={`text-xs font-bold ${delta > 0.5 ? 'text-green-600' :
                                                    delta < -0.5 ? 'text-red-500' :
                                                        'text-gray-400'
                                                    }`}>
                                                    {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}
                                                    {Math.abs(delta).toFixed(1)}
                                                </span>
                                            ) : <span className="text-gray-300 text-xs">—</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

// ── Détail des notes d'un élève ───────────────────────────────────────────────
function ChildGradesDetail({ child, trimester, calculateAverage, getStudentGrades, schoolInfo, paymentStatus, onPrint, rankData }) {
    const avg = calculateAverage(child.id, trimester);
    const mention = getMention(avg);
    const status = getStatus(avg);
    const studentGrades = getStudentGrades(child.id, trimester);
    const rank = rankData[`${child.id}_${trimester}`];


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

                {/* Mention + statut + rang */}
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">{mention.text}</span>
                    {status && (
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">{status.text}</span>
                    )}
                    {rank && (
                        <span className="bg-amber-400/30 border border-amber-300/40 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5" />
                            {ordinal(rank.rang)} / {rank.total} élèves
                        </span>
                    )}
                </div>
            </div>

            {/* Accès bulletin */}
            <BulletinAccessBanner
                childId={child.id}
                paymentStatus={paymentStatus}
                onPrint={onPrint}
                child={child}
            />

            {/* ── Évolution trimestrielle ── */}
            <EvolutionTrimestrielle
                child={child}
                currentTrimester={trimester}
                calculateAverage={calculateAverage}
                getStudentGrades={getStudentGrades}
            />

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

// ── Absences de l'enfant (vue parent) ────────────────────────────────────────
function AbsencesParent({ child }) {
    const [absences, setAbsences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('tous'); // 'tous' | 'absent' | 'retard'

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('absences')
                .select('id, date, type, justified, notes, subjects(name)')
                .eq('student_id', child.id)
                .order('date', { ascending: false });
            setAbsences(data || []);
            setLoading(false);
        };
        fetch();
    }, [child.id]);

    const totalAbsents = absences.filter(a => a.type === 'absent').length;
    const totalRetards = absences.filter(a => a.type === 'retard').length;
    const totalInjust = absences.filter(a => !a.justified).length;

    const filtered = filter === 'tous' ? absences : absences.filter(a => a.type === filter);

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }) : '—';

    if (loading) return (
        <div className="flex items-center justify-center py-12 gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Chargement...</span>
        </div>
    );

    return (
        <div className="space-y-4">

            {/* Résumé */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Absences', value: totalAbsents, icon: '🔴', color: '#dc2626', bg: '#fef2f2', type: 'absent' },
                    { label: 'Retards', value: totalRetards, icon: '🟡', color: '#d97706', bg: '#fffbeb', type: 'retard' },
                    { label: 'Non justifiés', value: totalInjust, icon: '⚠️', color: '#7c3aed', bg: '#f5f3ff', type: null },
                ].map((k, i) => (
                    <button key={i}
                        onClick={() => k.type && setFilter(filter === k.type ? 'tous' : k.type)}
                        className={`rounded-2xl p-4 text-center border-2 transition-all ${filter === k.type ? 'border-current shadow-sm' : 'border-transparent'
                            }`}
                        style={{ background: k.bg, borderColor: filter === k.type ? k.color : 'transparent' }}>
                        <div className="text-xl mb-1">{k.icon}</div>
                        <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
                        <div className="text-xs font-semibold text-gray-500 mt-0.5">{k.label}</div>
                    </button>
                ))}
            </div>

            {/* Alerte si trop d'absences */}
            {totalAbsents >= 5 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-red-800 text-sm">Attention — Nombreuses absences</p>
                        <p className="text-red-600 text-xs mt-0.5">
                            {child.firstName} a {totalAbsents} absence{totalAbsents > 1 ? 's' : ''} enregistrée{totalAbsents > 1 ? 's' : ''}.
                            Contactez l'administration si nécessaire.
                        </p>
                    </div>
                </div>
            )}

            {/* Liste */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        {filter === 'tous' ? 'Toutes les absences & retards' : filter === 'absent' ? 'Absences' : 'Retards'}
                    </h3>
                    {filter !== 'tous' && (
                        <button onClick={() => setFilter('tous')} className="text-xs text-blue-600 hover:underline">
                            Voir tout
                        </button>
                    )}
                </div>

                {filtered.length === 0 ? (
                    <div className="py-10 text-center">
                        <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-green-700">
                            {filter === 'tous' ? 'Aucune absence enregistrée 🎉' : `Aucun${filter === 'retard' ? ' retard' : 'e absence'} enregistré${filter === 'absent' ? 'e' : ''}`}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map(a => (
                            <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                                {/* Type */}
                                <span className="text-xl flex-shrink-0">{a.type === 'absent' ? '🔴' : '🟡'}</span>

                                {/* Infos */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-gray-800 text-sm capitalize">{a.type}</p>
                                        {a.subjects?.name && (
                                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                {a.subjects.name}
                                            </span>
                                        )}
                                    </div>
                                    {a.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{a.notes}"</p>}
                                </div>

                                {/* Date + statut */}
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs font-semibold text-gray-700">{fmtDate(a.date)}</p>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${a.justified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {a.justified ? '✓ Justifié' : 'Non justifié'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function ParentPortal({ currentUser, schoolInfo, onPrint }) {
    const [selectedTrimester, setSelectedTrimester] = useState('1');
    const [selectedChild, setSelectedChild] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState({});
    const [rankData, setRankData] = useState({});
    const [notification, setNotification] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');

    const { children, loading, error, calculateAverage, getStudentGrades } = useParent(currentUser?.id);

    const showLocalNotif = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3500); };

    useEffect(() => {
        console.log('👨‍👩‍👧 ParentPortal: Component mounted');
        console.log('Current user:', currentUser);
        console.log('Loading:', loading);
        console.log('Children:', children);
        console.log('Error:', error);
    }, []);

    useEffect(() => {
        if (children.length > 0 && !selectedChild) setSelectedChild(children[0]);
    }, [children]);

    useEffect(() => {
        if (children.length === 0) return;
        const fetchAccess = async () => {
            const ids = children.map(c => c.id);
            const [{ data: stds }, { data: pays }] = await Promise.all([
                supabase.from('students').select('id, bulletin_access').in('id', ids),
                supabase.from('payments').select('student_id, amount_paid, amount_due').in('student_id', ids),
            ]);
            const status = {};
            ids.forEach(id => {
                const access = stds?.find(s => s.id === id);
                const rows = (pays || []).filter(p => p.student_id === id);
                const totalPaid = rows.reduce((s, p) => s + parseFloat(p.amount_paid || 0), 0);
                const totalDue = rows.reduce((s, p) => s + parseFloat(p.amount_due || 0), 0);
                status[id] = { isPaid: access?.bulletin_access === true, noFees: totalDue === 0, totalPaid, totalDue };
            });
            setPaymentStatus(status);
        };
        fetchAccess();
    }, [children]);

    useEffect(() => {
        if (!selectedChild) return;
        const key = `${selectedChild.id}_${selectedTrimester}`;
        if (rankData[key]) return;
        const fetchRank = async () => {
            const { data: rows } = await supabase
                .from('grades')
                .select('student_id, value, subjects(coefficient), students!inner(class_id)')
                .eq('trimester', selectedTrimester)
                .eq('students.class_id', selectedChild.classId);
            if (!rows) return;
            const byStudent = {};
            rows.forEach(r => {
                const coef = r.subjects?.coefficient || 1;
                if (!byStudent[r.student_id]) byStudent[r.student_id] = { total: 0, coefSum: 0 };
                byStudent[r.student_id].total += (r.value || 0) * coef;
                byStudent[r.student_id].coefSum += coef;
            });
            const sorted = Object.entries(byStudent)
                .map(([id, d]) => ({ id, avg: d.coefSum > 0 ? d.total / d.coefSum : 0 }))
                .sort((a, b) => b.avg - a.avg);
            const idx = sorted.findIndex(e => e.id === selectedChild.id);
            if (idx !== -1) setRankData(prev => ({ ...prev, [key]: { rang: idx + 1, total: sorted.length } }));
        };
        fetchRank();
    }, [selectedChild, selectedTrimester]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">Chargement de l'espace parent...</p>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-red-700 font-semibold">Erreur de chargement</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                    <p className="text-red-500 text-xs mt-2">Console: Consultez les logs du navigateur pour plus de détails (F12)</p>
                </div>
            </div>
        </div>
    );

    if (children.length === 0) return (
        <div className="text-center py-20">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Aucun élève associé</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-4">
                Aucun élève n'est encore lié à votre compte. Contactez l'administration pour associer vos enfants.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-sm mx-auto text-left">
                <p className="text-xs font-semibold text-blue-900 mb-2">ℹ️ Information technique</p>
                <p className="text-xs text-blue-700">Parent ID: {currentUser?.id}</p>
                <p className="text-xs text-blue-700 mt-1">Rôle: {currentUser?.role}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Notification */}
            {notification && (
                <div className="fixed top-4 right-4 z-[100] bg-white border border-green-200 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-800">{notification}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">👨‍👩‍👧 Espace Parents</h2>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Bienvenue, {currentUser?.firstName} — {children.length} élève{children.length > 1 ? 's' : ''} suivi{children.length > 1 ? 's' : ''}
                    </p>
                </div>
                {activeTab === 'notes' && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-medium">Trimestre :</span>
                        {['1', '2', '3'].map(t => (
                            <button key={t} onClick={() => setSelectedTrimester(t)}
                                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${selectedTrimester === t ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}>T{t}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* Sélecteur enfant (si plusieurs) */}
            {children.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {children.map(child => (
                        <button key={child.id} onClick={() => setSelectedChild(child)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${selectedChild?.id === child.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                                }`}>
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                {child.firstName?.[0]}
                            </div>
                            {child.firstName} {child.lastName}
                        </button>
                    ))}
                </div>
            )}

            {/* Onglets */}
            {selectedChild && (
                <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
                    {[
                        { key: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: "Vue d'ensemble" },
                        { key: 'notes', icon: <BookOpen className="w-4 h-4" />, label: 'Notes' },
                        { key: 'paiements', icon: <CreditCard className="w-4 h-4" />, label: 'Paiements' },
                        { key: 'absences', icon: <Calendar className="w-4 h-4" />, label: 'Absences' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}>
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Vue d'ensemble ── */}
            {activeTab === 'dashboard' && selectedChild && (
                <ParentDashboard
                    child={selectedChild}
                    calculateAverage={calculateAverage}
                    paymentStatus={paymentStatus}
                    rankData={rankData}
                    onPrint={onPrint}
                    getStudentGrades={getStudentGrades}
                />
            )}

            {/* ── Notes ── */}
            {activeTab === 'notes' && selectedChild && (
                <ChildGradesDetail
                    child={selectedChild}
                    trimester={selectedTrimester}
                    calculateAverage={calculateAverage}
                    getStudentGrades={getStudentGrades}
                    schoolInfo={schoolInfo}
                    paymentStatus={paymentStatus}
                    onPrint={onPrint}
                    rankData={rankData}
                />
            )}

            {/* ── Paiements ── */}
            {/* ── Paiements ── */}
            {activeTab === 'paiements' && selectedChild && (
                <div className="space-y-6">
                    {/* Bouton Payer */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-blue-900">Payer les frais scolaires</h3>
                                <p className="text-blue-700 text-sm mt-1">Choisissez votre moyen de paiement</p>
                            </div>
                            <button
                                onClick={() => setPaymentModalOpen(true)}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg flex-shrink-0"
                            >
                                <CreditCard className="w-5 h-5" />
                                💳 Payer maintenant
                            </button>
                        </div>
                    </div>

                    {/* Historique des paiements */}
                    <PaymentHistory child={selectedChild} />
                </div>
            )}

            {/* Modal Paiement */}
            <PaymentModal
                isOpen={paymentModalOpen}
                studentId={selectedChild?.id}
                amount={50000}
                description="Frais de scolarité - Trimestre 1"
                onClose={() => setPaymentModalOpen(false)}
                onSuccess={(result) => {
                    console.log('✅ Paiement initié:', result);
                    setNotification(`✅ Paiement initié ! Ref: ${result.reference}`);
                    setTimeout(() => setNotification(null), 5000);
                }}
            />

            {/* ── Absences ── */}
            {activeTab === 'absences' && selectedChild && (
                <AbsencesParent child={selectedChild} />
            )}

            {/* Changer mot de passe */}
            <ChangePasswordSection onNotify={showLocalNotif} />

        </div>
    );
}