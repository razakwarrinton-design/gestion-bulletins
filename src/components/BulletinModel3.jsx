/**
 * BULLETIN MODEL 3 — IA Next-Gen EdTech Dashboard
 * Style : Apple + Notion + Stripe · Glassmorphism · Dark Futuriste
 * Usage : <BulletinModel3 student={...} grades={...} subjects={...} ... />
 */
import React, { useMemo, useState } from 'react';
import {
    LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
    ResponsiveContainer, CartesianGrid, Area, AreaChart
} from 'recharts';

// ─── Données démo ──────────────────────────────────────────────────────────────
const DEMO = {
    schoolInfo: { name: 'Smart Academy International', tagline: 'Powered by AI · Driven by Excellence' },
    currentYear: '2025-2026',
    selectedTrimester: '2',
    student: {
        firstName: 'Layla',
        lastName: 'OUÉDRAOGO',
        id: 'SAI-2025-0089',
        gender: 'F',
        birthDate: '18/11/2009',
        photo: null,
        level: 87,
        evolution: [
            { trim: 'T1 2024', avg: 12.4 },
            { trim: 'T2 2024', avg: 13.8 },
            { trim: 'T3 2024', avg: 13.1 },
            { trim: 'T1 2025', avg: 14.6 },
            { trim: 'T2 2025', avg: 15.2 },
        ],
    },
    className: '2nde S',
    classStats: { rank: 3, effectif: 35, successRate: 83, classAverage: 13.8 },
    subjects: [
        { id: 1, name: 'Mathématiques', coefficient: 5 },
        { id: 2, name: 'Physique-Chimie', coefficient: 4 },
        { id: 3, name: 'SVT', coefficient: 3 },
        { id: 4, name: 'Français', coefficient: 3 },
        { id: 5, name: 'Histoire-Géo', coefficient: 3 },
        { id: 6, name: 'Anglais', coefficient: 3 },
        { id: 7, name: 'Philosophie', coefficient: 2 },
        { id: 8, name: 'EPS', coefficient: 2 },
    ],
    gradeRows: [
        { subjectId: 1, moyenne: 15.5, prevMoyenne: 14.0, maitrise: 78, recommendation: 'Consolider les équations différentielles', trend: 'up' },
        { subjectId: 2, moyenne: 14.0, prevMoyenne: 14.5, maitrise: 70, recommendation: 'Retravailler l\'optique géométrique', trend: 'down' },
        { subjectId: 3, moyenne: 17.0, prevMoyenne: 15.5, maitrise: 85, recommendation: 'Excellent niveau, continuer ainsi', trend: 'up' },
        { subjectId: 4, moyenne: 12.5, prevMoyenne: 12.0, maitrise: 62, recommendation: 'Travailler la rédaction et l\'argumentation', trend: 'stable' },
        { subjectId: 5, moyenne: 13.5, prevMoyenne: 14.0, maitrise: 67, recommendation: 'Renforcer la géopolitique contemporaine', trend: 'down' },
        { subjectId: 6, moyenne: 16.0, prevMoyenne: 14.5, maitrise: 80, recommendation: 'Très bon niveau oral, travailler l\'écrit', trend: 'up' },
        { subjectId: 7, moyenne: 11.5, prevMoyenne: 11.0, maitrise: 57, recommendation: 'Revoir les auteurs fondamentaux', trend: 'stable' },
        { subjectId: 8, moyenne: 17.5, prevMoyenne: 16.0, maitrise: 87, recommendation: 'Excellent, potentiel sportif remarquable', trend: 'up' },
    ],
    aiInsights: {
        successPrediction: 92,
        strengths: ['Sciences', 'EPS', 'Anglais'],
        weaknesses: ['Philosophie', 'Français'],
        advice: [
            '📚 Consacrer 30 min/jour aux exercices de philosophie pour améliorer la maîtrise des concepts.',
            '✍️ Pratiquer l\'écriture analytique en français 3× par semaine.',
            '🎯 Objectif atteignable : dépasser 14/20 en Philosophie d\'ici le trimestre 3.',
            '🚀 Votre progression en Mathématiques est remarquable — préparez-vous aux olympiades.',
        ],
    },
    parentDashboard: {
        notifications: 2,
        derniereConnexion: 'Il y a 3 jours',
        engagementScore: 74,
        messagesNonLus: 1,
    },
    discipline: { absJust: 1, absNonJust: 0, comportement: 'Excellent', ponctualite: 98 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getMention = (avg) => {
    if (avg >= 16) return { label: 'Excellent', color: '#10b981' };
    if (avg >= 14) return { label: 'Très bien', color: '#3b82f6' };
    if (avg >= 12) return { label: 'Bien', color: '#8b5cf6' };
    if (avg >= 10) return { label: 'Passable', color: '#f59e0b' };
    return { label: 'Insuffisant', color: '#ef4444' };
};

const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <span style={{ color: '#10b981', fontSize: 14 }}>↗</span>;
    if (trend === 'down') return <span style={{ color: '#ef4444', fontSize: 14 }}>↘</span>;
    return <span style={{ color: '#94a3b8', fontSize: 14 }}>→</span>;
};

const GlassCard = ({ children, style = {}, accent = false }) => (
    <div style={{
        background: accent
            ? 'linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.1))'
            : 'rgba(255,255,255,.05)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${accent ? 'rgba(139,92,246,.3)' : 'rgba(255,255,255,.08)'}`,
        borderRadius: 16,
        padding: 20,
        ...style,
    }}>
        {children}
    </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────
export default function BulletinModel3({
    schoolInfo = DEMO.schoolInfo,
    currentYear = DEMO.currentYear,
    selectedTrimester = DEMO.selectedTrimester,
    student = DEMO.student,
    className = DEMO.className,
    classStats = DEMO.classStats,
    subjects = DEMO.subjects,
    gradeRows = DEMO.gradeRows,
    aiInsights = DEMO.aiInsights,
    parentDashboard = DEMO.parentDashboard,
    discipline = DEMO.discipline,
}) {
    const [activeTab, setActiveTab] = useState('notes');

    const totalCoef = useMemo(() => subjects.reduce((a, s) => a + s.coefficient, 0), [subjects]);
    const totalPoints = useMemo(() => gradeRows.reduce((a, r) => {
        const s = subjects.find(x => x.id === r.subjectId);
        return a + r.moyenne * (s?.coefficient || 1);
    }, 0), [gradeRows, subjects]);
    const generalAvg = useMemo(() => totalCoef > 0 ? (totalPoints / totalCoef).toFixed(2) : '—', [totalPoints, totalCoef]);
    const mention = getMention(parseFloat(generalAvg));

    const radarData = subjects.map(s => {
        const row = gradeRows.find(r => r.subjectId === s.id);
        return { subject: s.name.substring(0, 5), value: ((row?.maitrise || 0) / 100) * 20, fullMark: 20 };
    });

    const heatmapData = subjects.map(s => {
        const row = gradeRows.find(r => r.subjectId === s.id);
        const pct = row ? (row.moyenne / 20) : 0;
        const color = pct >= .8 ? '#10b981' : pct >= .7 ? '#3b82f6' : pct >= .5 ? '#f59e0b' : '#ef4444';
        return { name: s.name, value: row?.moyenne || 0, color };
    });

    // QR code simulé (grid de carrés)
    const qrPattern = Array.from({ length: 7 }, (_, r) =>
        Array.from({ length: 7 }, (_, c) => {
            if (r < 3 && c < 3) return true;
            if (r < 3 && c > 3) return true;
            if (r > 3 && c < 3) return true;
            return Math.random() > .5;
        })
    );

    const S = {
        page: {
            fontFamily: "'DM Sans','Inter','Segoe UI',sans-serif",
            background: 'linear-gradient(135deg,#0a0e1a 0%,#0d1b35 50%,#0a0e1a 100%)',
            minHeight: '100vh',
            color: '#e2e8f0',
            padding: 0,
            maxWidth: 960,
            margin: '0 auto',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 40px 120px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.05)',
        },
        header: {
            background: 'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.1))',
            borderBottom: '1px solid rgba(255,255,255,.08)',
            padding: '24px 36px',
        },
        sectionTitle: {
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: '#94a3b8',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        },
        pill: (color) => ({
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: `${color}20`, border: `1px solid ${color}40`,
            color: color, fontSize: 11, fontWeight: 600,
        }),
        tab: (active) => ({
            padding: '8px 20px', borderRadius: 10, cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: active ? 'rgba(99,102,241,.3)' : 'transparent',
            border: active ? '1px solid rgba(99,102,241,.5)' : '1px solid transparent',
            color: active ? '#a5b4fc' : '#64748b',
            transition: 'all .2s',
        }),
    };

    return (
        <div style={S.page}>
            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <div style={S.header}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 8px 24px rgba(99,102,241,.4)' }}>
                            🧠
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{schoolInfo.name}</div>
                            <div style={{ fontSize: 11, color: '#6366f1', letterSpacing: 1.5, marginTop: 2 }}>{schoolInfo.tagline}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={S.pill('#6366f1')}>⚡ AI-Powered Bulletin</div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <span style={S.pill('#10b981')}>📅 {currentYear}</span>
                            <span style={S.pill('#f59e0b')}>T{selectedTrimester}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* ── PROFIL ÉLÈVE ─────────────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
                    {/* Carte profil */}
                    <GlassCard accent style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, border: '3px solid rgba(99,102,241,.4)', boxShadow: '0 0 0 6px rgba(99,102,241,.1)' }}>
                            {student.photo ? <img src={student.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : '👤'}
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{student.lastName} {student.firstName}</div>
                            <div style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>{student.id}</div>
                            <div style={{ marginTop: 6, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <span style={S.pill('#8b5cf6')}>{className}</span>
                                <span style={S.pill('#64748b')}>Né(e) {student.birthDate}</span>
                            </div>
                        </div>
                        {/* Level ring */}
                        <div style={{ position: 'relative', width: 90, height: 90 }}>
                            <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
                                <circle cx="45" cy="45" r="38" fill="none" stroke="url(#levelGrad)" strokeWidth="8"
                                    strokeDasharray={`${2 * Math.PI * 38 * (student.level / 100)} ${2 * Math.PI * 38}`}
                                    strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="levelGrad" x1="0%" y1="0%" x2="100%">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#10b981" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{student.level}</div>
                                <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Niveau</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,.06)' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>#{classStats.rank}</div>
                                <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, textTransform: 'uppercase' }}>Rang</div>
                            </div>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,.06)' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#6366f1' }}>{generalAvg}</div>
                                <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, textTransform: 'uppercase' }}>Moy./20</div>
                            </div>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid rgba(255,255,255,.06)' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{classStats.successRate}%</div>
                                <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, textTransform: 'uppercase' }}>Réussite</div>
                            </div>
                        </div>
                    </GlassCard>

                    {/* Évolution */}
                    <GlassCard style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={S.sectionTitle}>📈 Évolution des Performances</div>
                        <ResponsiveContainer width="100%" height={130}>
                            <AreaChart data={student.evolution} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                                <defs>
                                    <linearGradient id="evoGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                                <XAxis dataKey="trim" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis domain={[8, 20]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    formatter={(v) => [`${v}/20`, 'Moyenne']}
                                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, fontSize: 11, color: '#e2e8f0' }}
                                />
                                <Area type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2.5} fill="url(#evoGrad)" dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                        {/* Tags forces/faiblesses */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>💪 Forces :</div>
                            {aiInsights.strengths.map((s, i) => (
                                <span key={i} style={S.pill('#10b981')}>{s}</span>
                            ))}
                            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginLeft: 8 }}>⚠️ À renforcer :</div>
                            {aiInsights.weaknesses.map((s, i) => (
                                <span key={i} style={S.pill('#f59e0b')}>{s}</span>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* ── TABS ────────────────────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[['notes', '📋 Notes & IA'], ['analytics', '📊 Analytics'], ['parents', '👨‍👩‍👧 Parents'], ['signature', '🔏 Validation']].map(([k, label]) => (
                        <button key={k} style={S.tab(activeTab === k)} onClick={() => setActiveTab(k)}>{label}</button>
                    ))}
                </div>

                {/* ── TAB: NOTES ──────────────────────────────────────────────── */}
                {activeTab === 'notes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <GlassCard>
                            <div style={S.sectionTitle}>📋 Tableau des Notes Intelligent</div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                                            {['Matière', 'Moyenne', 'Progression', 'Tendance', 'Maîtrise', 'Recommandation IA'].map((h, i) => (
                                                <th key={i} style={{ padding: '10px 12px', fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, textAlign: i === 0 ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjects.map((subj, idx) => {
                                            const row = gradeRows.find(r => r.subjectId === subj.id);
                                            if (!row) return null;
                                            const m = getMention(row.moyenne);
                                            const diff = (row.moyenne - row.prevMoyenne).toFixed(1);
                                            const diffColor = parseFloat(diff) >= 0 ? '#10b981' : '#ef4444';
                                            return (
                                                <tr key={subj.id} style={{ borderBottom: '1px solid rgba(255,255,255,.05)', transition: 'background .15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '12px 12px', fontWeight: 600, color: '#e2e8f0' }}>{subj.name}</td>
                                                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                                                        <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, background: `${m.color}20`, border: `1px solid ${m.color}40`, color: m.color, fontSize: 12, fontWeight: 700 }}>
                                                            {row.moyenne}/20
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 12px', textAlign: 'center', color: diffColor, fontWeight: 600, fontSize: 13 }}>
                                                        {parseFloat(diff) >= 0 ? '+' : ''}{diff}
                                                    </td>
                                                    <td style={{ padding: '12px 12px', textAlign: 'center' }}><TrendIcon trend={row.trend} /></td>
                                                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                                            <div style={{ flex: 1, maxWidth: 60, height: 5, borderRadius: 4, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', borderRadius: 4, width: `${row.maitrise}%`, background: `linear-gradient(90deg,${row.maitrise >= 70 ? '#10b981' : '#f59e0b'},${row.maitrise >= 70 ? '#3b82f6' : '#ef4444'})` }} />
                                                            </div>
                                                            <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{row.maitrise}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 12px', fontSize: 10.5, color: '#64748b', fontStyle: 'italic', maxWidth: 180 }}>{row.recommendation}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid rgba(99,102,241,.3)', background: 'rgba(99,102,241,.08)' }}>
                                            <td style={{ padding: '12px', fontWeight: 700, color: '#a5b4fc', fontSize: 12 }}>MOYENNE GÉNÉRALE</td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 800 }}>
                                                    {generalAvg}/20
                                                </span>
                                            </td>
                                            <td colSpan={4} style={{ padding: '12px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                                                Rang : <strong style={{ color: '#e2e8f0' }}>#{classStats.rank}</strong> · Mention : <strong style={{ color: mention.color }}>{mention.label}</strong>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </GlassCard>

                        {/* Conseils IA */}
                        <GlassCard accent>
                            <div style={S.sectionTitle}>🤖 Recommandations Pédagogiques IA</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                                {aiInsights.advice.map((tip, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,.06)', fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                                        {tip}
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 12, padding: '12px 16px' }}>
                                <div style={{ fontSize: 24 }}>🎯</div>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 2 }}>Prédiction de réussite IA</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Basée sur les tendances actuelles, Layla a une probabilité de <strong style={{ color: '#10b981' }}>{aiInsights.successPrediction}%</strong> de réussir avec mention ce trimestre.</div>
                                </div>
                                <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: `conic-gradient(#10b981 ${aiInsights.successPrediction * 3.6}deg,rgba(255,255,255,.08) 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#10b981' }}>
                                        {aiInsights.successPrediction}%
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* ── TAB: ANALYTICS ──────────────────────────────────────────── */}
                {activeTab === 'analytics' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <GlassCard>
                                <div style={S.sectionTitle}>🕸️ Radar Compétences</div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                                        <PolarGrid stroke="rgba(255,255,255,.08)" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748b' }} />
                                        <PolarRadiusAxis domain={[0, 20]} tick={false} axisLine={false} />
                                        <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={.2} strokeWidth={2} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </GlassCard>
                            <GlassCard>
                                <div style={S.sectionTitle}>📊 Performance par Matière</div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={heatmapData} margin={{ top: 4, right: 4, bottom: 4, left: -22 }} layout="vertical">
                                        <XAxis type="number" domain={[0, 20]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                                        <Tooltip formatter={(v) => [`${v}/20`]} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, fontSize: 11, color: '#e2e8f0' }} />
                                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                            {heatmapData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </GlassCard>
                        </div>
                        {/* Heatmap simulée */}
                        <GlassCard>
                            <div style={S.sectionTitle}>🌡️ Heatmap Résultats</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {subjects.map(s => {
                                    const row = gradeRows.find(r => r.subjectId === s.id);
                                    const pct = row ? row.moyenne / 20 : 0;
                                    const color = pct >= .8 ? '#10b981' : pct >= .7 ? '#3b82f6' : pct >= .5 ? '#f59e0b' : '#ef4444';
                                    return (
                                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 130, fontSize: 11, color: '#94a3b8', flexShrink: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{s.name}</div>
                                            <div style={{ flex: 1, height: 18, borderRadius: 6, background: 'rgba(255,255,255,.05)', overflow: 'hidden', position: 'relative' }}>
                                                <div style={{ position: 'absolute', inset: 0, width: `${pct * 100}%`, borderRadius: 6, background: `linear-gradient(90deg,${color}99,${color})`, transition: 'width .8s ease' }} />
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>{row?.moyenne.toFixed(1)}/20</span>
                                                </div>
                                            </div>
                                            <div style={{ width: 30, textAlign: 'right', fontSize: 10, color: color, fontWeight: 700 }}>{Math.round(pct * 100)}%</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* ── TAB: PARENTS ─────────────────────────────────────────────── */}
                {activeTab === 'parents' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <GlassCard>
                            <div style={S.sectionTitle}>👨‍👩‍👧 Tableau de Bord Parents</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { label: 'Notifications', value: parentDashboard.notifications, icon: '🔔', color: '#f59e0b' },
                                    { label: 'Messages non lus', value: parentDashboard.messagesNonLus, icon: '✉️', color: '#6366f1' },
                                    { label: 'Dernière connexion', value: parentDashboard.derniereConnexion, icon: '🕐', color: '#10b981' },
                                    { label: 'Score engagement', value: `${parentDashboard.engagementScore}%`, icon: '📊', color: '#8b5cf6' },
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(255,255,255,.06)' }}>
                                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 11, color: '#64748b' }}>{item.label}</div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: item.color, marginTop: 1 }}>{item.value}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                        <GlassCard>
                            <div style={S.sectionTitle}>🎖️ Assiduité & Discipline</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { label: 'Abs. Justifiées', val: discipline.absJust, color: '#3b82f6', icon: '📅' },
                                    { label: 'Abs. Non Just.', val: discipline.absNonJust, color: '#ef4444', icon: '⚠️' },
                                    { label: 'Comportement', val: discipline.comportement, color: '#10b981', icon: '⭐' },
                                    { label: 'Ponctualité', val: `${discipline.ponctualite}%`, color: '#8b5cf6', icon: '🕐' },
                                ].map((d, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '14px 12px', textAlign: 'center', border: `1px solid ${d.color}20` }}>
                                        <div style={{ fontSize: 22, marginBottom: 6 }}>{d.icon}</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: d.color }}>{d.val}</div>
                                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: .8 }}>{d.label}</div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* ── TAB: SIGNATURE ──────────────────────────────────────────── */}
                {activeTab === 'signature' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                        <GlassCard>
                            <div style={S.sectionTitle}>✍️ Validation & Signatures</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                                {[
                                    { title: 'Professeur Principal', icon: '👨‍🏫' },
                                    { title: 'Censeur / Proviseur', icon: '🏫' },
                                    { title: 'Signature Parents', icon: '👨‍👩‍👧' },
                                ].map((sig, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '16px 12px', textAlign: 'center', border: '1px solid rgba(255,255,255,.06)', minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div style={{ fontSize: 22 }}>{sig.icon}</div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, marginTop: 6 }}>{sig.title}</div>
                                        <div style={{ borderTop: '1px dashed rgba(255,255,255,.12)', marginTop: 12, paddingTop: 8, fontSize: 10, color: 'rgba(255,255,255,.2)' }}>
                                            Signature
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: 14, background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.15)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 16 }}>✅</span>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>Document vérifié & authentifié</div>
                                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>Signature numérique · Hash SHA-256 · {new Date().toLocaleDateString('fr-FR')}</div>
                                </div>
                            </div>
                        </GlassCard>
                        {/* QR Code */}
                        <GlassCard style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <div style={S.sectionTitle}>📱 QR Vérification</div>
                            <div style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
                                <svg width="100" height="100" viewBox="0 0 7 7">
                                    {qrPattern.map((row, r) =>
                                        row.map((cell, c) => cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0a0e1a" /> : null)
                                    )}
                                </svg>
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', lineHeight: 1.6 }}>
                                Scanner pour vérifier<br />l'authenticité du bulletin
                            </div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.2)', fontFamily: 'monospace', textAlign: 'center', letterSpacing: .5 }}>
                                {student.id} · T{selectedTrimester} · {currentYear}
                            </div>
                        </GlassCard>
                    </div>
                )}

            </div>

            {/* ── FOOTER ─────────────────────────────────────────────────────── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '14px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)' }}>
                    Généré le {new Date().toLocaleDateString('fr-FR')} · {schoolInfo.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1' }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)' }}>Powered by AI · Bulletin sécurisé</span>
                </div>
            </div>
        </div>
    );
}