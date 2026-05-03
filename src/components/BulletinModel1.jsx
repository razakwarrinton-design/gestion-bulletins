/**
 * BULLETIN MODEL 1 — Luxury Academic EdTech
 * Style : Premium SaaS, palette Navy/Or/Blanc
 * Usage : <BulletinModel1 student={...} grades={...} subjects={...} ... />
 */
import React, { useMemo } from 'react';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer
} from 'recharts';

// ─── Données de démo (remplacées par les vraies props en production) ───────────
const DEMO = {
    schoolInfo: { name: 'Lycée International Henri Bergson', tagline: 'Excellence · Savoir · Citoyenneté', address: 'Av. de la République, Lomé', phone: '+228 90 00 00 00', email: 'contact@lihb.tg' },
    schoolLogo: null,
    currentYear: '2025-2026',
    selectedTrimester: '1',
    student: { firstName: 'Aminatou', lastName: 'DIALLO', id: 'EL-2024-0471', gender: 'F', birthDate: '12/03/2009', photo: null },
    className: '3ème A',
    classStats: { rank: 2, effectif: 38, classAverage: 13.4, successRate: 79 },
    discipline: { absJust: 2, absNonJust: 0, retards: 1, conduite: 'Très bien', sanctions: 'Aucune' },
    observations: {
        profPrincipal: 'Élève sérieuse et investie. Des progrès notables en sciences. Continue ainsi !',
        direction: 'Félicitations pour les résultats du trimestre.',
        parent: ''
    },
    subjects: [
        { id: 1, name: 'Mathématiques', coefficient: 4 },
        { id: 2, name: 'Français', coefficient: 4 },
        { id: 3, name: 'Physique-Chimie', coefficient: 3 },
        { id: 4, name: 'SVT', coefficient: 3 },
        { id: 5, name: 'Histoire-Géo', coefficient: 3 },
        { id: 6, name: 'Anglais', coefficient: 3 },
        { id: 7, name: 'Éducation Civique', coefficient: 2 },
        { id: 8, name: 'EPS', coefficient: 2 },
    ],
    gradeRows: [
        { subjectId: 1, devoir: 16, compo: 15, moyenne: 15.5, rang: 3, appreciation: 'Très bien' },
        { subjectId: 2, devoir: 14, compo: 13, moyenne: 13.5, rang: 7, appreciation: 'Assez bien' },
        { subjectId: 3, devoir: 17, compo: 16, moyenne: 16.5, rang: 1, appreciation: 'Excellent' },
        { subjectId: 4, devoir: 15, compo: 14, moyenne: 14.5, rang: 5, appreciation: 'Bien' },
        { subjectId: 5, devoir: 12, compo: 11, moyenne: 11.5, rang: 14, appreciation: 'Passable' },
        { subjectId: 6, devoir: 14, compo: 15, moyenne: 14.5, rang: 6, appreciation: 'Bien' },
        { subjectId: 7, devoir: 18, compo: 17, moyenne: 17.5, rang: 1, appreciation: 'Excellent' },
        { subjectId: 8, devoir: 16, compo: 16, moyenne: 16.0, rang: 2, appreciation: 'Très bien' },
    ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getMention = (avg) => {
    if (avg >= 16) return { label: 'Excellent', color: '#15803d', bg: '#dcfce7' };
    if (avg >= 14) return { label: 'Très bien', color: '#1d4ed8', bg: '#dbeafe' };
    if (avg >= 12) return { label: 'Bien', color: '#6d28d9', bg: '#ede9fe' };
    if (avg >= 10) return { label: 'Passable', color: '#a16207', bg: '#fef9c3' };
    return { label: 'Insuffisant', color: '#dc2626', bg: '#fee2e2' };
};

const getBarColor = (avg) => {
    if (avg >= 16) return '#22c55e';
    if (avg >= 14) return '#3b82f6';
    if (avg >= 12) return '#8b5cf6';
    if (avg >= 10) return '#f59e0b';
    return '#ef4444';
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function BulletinModel1({
    schoolInfo = DEMO.schoolInfo,
    schoolLogo = DEMO.schoolLogo,
    currentYear = DEMO.currentYear,
    selectedTrimester = DEMO.selectedTrimester,
    student = DEMO.student,
    className = DEMO.className,
    classStats = DEMO.classStats,
    discipline = DEMO.discipline,
    observations = DEMO.observations,
    subjects = DEMO.subjects,
    gradeRows = DEMO.gradeRows,
}) {
    // Calculs globaux
    const totalPoints = useMemo(() =>
        gradeRows.reduce((acc, r) => {
            const subj = subjects.find(s => s.id === r.subjectId);
            return acc + (r.moyenne * (subj?.coefficient || 1));
        }, 0), [gradeRows, subjects]);

    const totalCoef = useMemo(() =>
        subjects.reduce((acc, s) => acc + s.coefficient, 0), [subjects]);

    const generalAvg = useMemo(() =>
        totalCoef > 0 ? (totalPoints / totalCoef).toFixed(2) : '—', [totalPoints, totalCoef]);

    const mention = getMention(parseFloat(generalAvg));

    const radarData = subjects.map(s => {
        const row = gradeRows.find(r => r.subjectId === s.id);
        return { subject: s.name.substring(0, 5), value: row?.moyenne || 0, fullMark: 20 };
    });

    const barData = subjects.map(s => {
        const row = gradeRows.find(r => r.subjectId === s.id);
        return { name: s.name.substring(0, 8), avg: row?.moyenne || 0 };
    });

    // ─── Styles inline (compatible print) ──────────────────────────────────────
    const S = {
        page: {
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            background: '#ffffff',
            maxWidth: 900,
            margin: '0 auto',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 20px 80px rgba(15,27,45,.18)',
        },
        header: {
            background: 'linear-gradient(135deg,#0F1B2D 0%,#1e3a5f 60%,#0F1B2D 100%)',
            padding: '32px 40px',
            display: 'flex',
            alignItems: 'center',
            gap: 28,
        },
        logo: {
            width: 76, height: 76, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg,#C9A84C,#e8c96a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34, boxShadow: '0 8px 32px rgba(201,168,76,.5)',
            border: '2px solid rgba(255,255,255,.15)',
        },
        goldBar: { height: 3, background: 'linear-gradient(90deg,#C9A84C,#e8c96a 50%,#C9A84C)' },
        sectionBg: { background: '#f8f9fc', padding: '20px 40px' },
        card: {
            background: '#fff', borderRadius: 14, padding: 20,
            boxShadow: '0 2px 16px rgba(15,27,45,.08)',
            border: '1px solid rgba(15,27,45,.07)',
        },
        sectionTitle: {
            display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: "'Cormorant Garamond','Georgia',serif",
            fontSize: 18, fontWeight: 600, color: '#0F1B2D',
            margin: '28px 0 14px', paddingBottom: 8,
            borderBottom: '2px solid',
            borderImage: 'linear-gradient(90deg,#C9A84C,transparent) 1',
        },
        table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, borderRadius: 12, overflow: 'hidden' },
    };

    return (
        <div style={S.page} className="bulletin-model1">
            {/* ── HEADER ─────────────────────────────────────────────────────────── */}
            <div style={S.header}>
                <div style={S.logo}>
                    {schoolLogo ? <img src={schoolLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} /> : '🎓'}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond','Georgia',serif", fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: .5 }}>
                        {schoolInfo.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#C9A84C', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4, fontWeight: 500 }}>
                        {schoolInfo.tagline || 'Excellence · Savoir · Citoyenneté'}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                        {[['📍', schoolInfo.address], ['📞', schoolInfo.phone], ['✉️', schoolInfo.email]].map(([icon, val], i) => (
                            <span key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {icon} {val}
                            </span>
                        ))}
                    </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, color: '#C9A84C', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                        Bulletin de Notes
                    </div>
                    <div style={{ background: 'rgba(201,168,76,.15)', border: '1px solid rgba(201,168,76,.3)', color: '#e8c96a', fontSize: 11, fontWeight: 600, padding: '4px 14px', borderRadius: 20, display: 'inline-block', marginTop: 6, letterSpacing: .5 }}>
                        Année {currentYear}
                    </div>
                    <div style={{ background: 'linear-gradient(135deg,#C9A84C,#e8c96a)', color: '#0F1B2D', fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 20, display: 'inline-block', marginTop: 8, letterSpacing: .5 }}>
                        Trimestre {selectedTrimester}
                    </div>
                </div>
            </div>
            <div style={S.goldBar} />

            {/* ── ÉLÈVE ─────────────────────────────────────────────────────────── */}
            <div style={S.sectionBg}>
                <div style={{ ...S.card, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    {/* Avatar */}
                    <div style={{ width: 84, height: 84, borderRadius: 14, background: 'linear-gradient(135deg,#0F1B2D,#1e3a5f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, flexShrink: 0, border: '2px solid rgba(201,168,76,.25)' }}>
                        {student.photo ? <img src={student.photo} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} /> : '👤'}
                    </div>
                    {/* Infos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, flex: 1 }}>
                        {[
                            ['Nom & Prénom', `${student.lastName} ${student.firstName}`],
                            ['Matricule', student.id],
                            ['Classe', className],
                            ['Date de naissance', student.birthDate],
                            ['Sexe', student.gender === 'F' ? 'Féminin' : 'Masculin'],
                            ['Effectif', `${classStats.effectif} élèves`],
                            ['Moy. classe', `${classStats.classAverage}/20`],
                            ['Taux réussite', `${classStats.successRate}%`],
                        ].map(([label, val], i) => (
                            <div key={i}>
                                <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 3 }}>{label}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{val}</div>
                            </div>
                        ))}
                    </div>
                    {/* Rang */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0F1B2D,#1e3a5f)', borderRadius: 12, padding: '14px 20px', minWidth: 80, textAlign: 'center', border: '1px solid rgba(201,168,76,.2)', flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 40, fontWeight: 700, color: '#C9A84C', lineHeight: 1 }}>
                            {classStats.rank}
                        </div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>Rang</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>/ {classStats.effectif}</div>
                    </div>
                </div>
            </div>

            {/* ── NOTES ─────────────────────────────────────────────────────────── */}
            <div style={{ padding: '0 40px 8px' }}>
                <div style={S.sectionTitle}>📋 Relevé de Notes</div>
                <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 16px rgba(15,27,45,.09)', border: '1px solid rgba(15,27,45,.08)' }}>
                    <table style={S.table}>
                        <thead>
                            <tr style={{ background: 'linear-gradient(135deg,#0F1B2D,#1e3a5f)' }}>
                                {['Matière', 'Note Devoir', 'Note Compo.', 'Moyenne', 'Coeff.', 'Appréciation', 'Rang'].map((h, i) => (
                                    <th key={i} style={{ padding: '12px 14px', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: .8, textAlign: i === 0 ? 'left' : 'center', whiteSpace: 'nowrap' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.map((subj, idx) => {
                                const row = gradeRows.find(r => r.subjectId === subj.id);
                                if (!row) return null;
                                const m = getMention(row.moyenne);
                                return (
                                    <tr key={subj.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafd', transition: 'background .15s' }}>
                                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#1e293b', borderBottom: '1px solid rgba(15,27,45,.05)' }}>{subj.name}</td>
                                        <td style={{ padding: '11px 14px', fontSize: 13, color: '#334155', textAlign: 'center', borderBottom: '1px solid rgba(15,27,45,.05)' }}>{row.devoir}/20</td>
                                        <td style={{ padding: '11px 14px', fontSize: 13, color: '#334155', textAlign: 'center', borderBottom: '1px solid rgba(15,27,45,.05)' }}>{row.compo}/20</td>
                                        <td style={{ padding: '11px 14px', textAlign: 'center', borderBottom: '1px solid rgba(15,27,45,.05)' }}>
                                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: m.bg, color: m.color }}>
                                                {row.moyenne}/20
                                            </span>
                                        </td>
                                        <td style={{ padding: '11px 14px', fontSize: 13, color: '#334155', textAlign: 'center', borderBottom: '1px solid rgba(15,27,45,.05)', fontWeight: 600 }}>{subj.coefficient}</td>
                                        <td style={{ padding: '11px 14px', fontSize: 11, color: '#64748b', fontStyle: 'italic', textAlign: 'center', borderBottom: '1px solid rgba(15,27,45,.05)' }}>{row.appreciation}</td>
                                        <td style={{ padding: '11px 14px', textAlign: 'center', borderBottom: '1px solid rgba(15,27,45,.05)' }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0F1B2D' }}>#{row.rang}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'linear-gradient(135deg,#0F1B2D,#1e3a5f)' }}>
                                <td colSpan={3} style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#fff' }}>RÉSUMÉ GÉNÉRAL</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                    <span style={{ background: 'linear-gradient(135deg,#C9A84C,#e8c96a)', color: '#0F1B2D', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800, display: 'inline-block' }}>
                                        {generalAvg}/20
                                    </span>
                                </td>
                                <td style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,.6)', textAlign: 'center' }}>{totalCoef}</td>
                                <td style={{ padding: '12px 14px', fontSize: 12, color: '#e8c96a', fontWeight: 700, textAlign: 'center' }}>
                                    {mention.label}
                                </td>
                                <td style={{ padding: '12px 14px', fontSize: 12, color: 'rgba(255,255,255,.6)', textAlign: 'center' }}>#{classStats.rank}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* ── STATISTIQUES ──────────────────────────────────────────────────── */}
            <div style={{ padding: '8px 40px' }}>
                <div style={S.sectionTitle}>📊 Statistiques & Performance</div>
                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
                    {[
                        { label: 'Moyenne Générale', value: `${generalAvg}`, sub: '/ 20', icon: '🎯', accent: '#3b82f6' },
                        { label: 'Total Points', value: `${totalPoints.toFixed(1)}`, sub: `/ ${totalCoef * 20}`, icon: '📌', accent: '#C9A84C' },
                        { label: 'Meilleur Rang', value: `#${classStats.rank}`, sub: `sur ${classStats.effectif}`, icon: '🏆', accent: '#22c55e' },
                        { label: 'Taux Réussite', value: `${classStats.successRate}%`, sub: 'classe', icon: '📈', accent: '#8b5cf6' },
                    ].map((kpi, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '18px 16px', boxShadow: '0 2px 16px rgba(15,27,45,.08)', border: '1px solid rgba(15,27,45,.06)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: -12, right: -12, width: 64, height: 64, borderRadius: '50%', background: kpi.accent, opacity: .08 }} />
                            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{kpi.label}</div>
                            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 700, color: '#0F1B2D', lineHeight: 1.1, marginTop: 4 }}>{kpi.value}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{kpi.sub}</div>
                            <div style={{ position: 'absolute', bottom: 12, right: 14, fontSize: 22, opacity: .35 }}>{kpi.icon}</div>
                        </div>
                    ))}
                </div>
                {/* Charts row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Bar chart */}
                    <div style={{ ...S.card }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#0F1B2D', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .8 }}>Notes par matière</div>
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 20]} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(v) => [`${v}/20`, 'Moyenne']} contentStyle={{ borderRadius: 10, fontSize: 11, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }} />
                                <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                                    {barData.map((entry, i) => (
                                        <Cell key={i} fill={getBarColor(entry.avg)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Radar */}
                    <div style={{ ...S.card }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#0F1B2D', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .8 }}>Radar de compétences</div>
                        <ResponsiveContainer width="100%" height={160}>
                            <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748b' }} />
                                <PolarRadiusAxis domain={[0, 20]} tick={false} axisLine={false} />
                                <Radar name="Notes" dataKey="value" stroke="#C9A84C" fill="#C9A84C" fillOpacity={0.25} strokeWidth={2} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── DISCIPLINE ──────────────────────────────────────────────────────── */}
            <div style={{ padding: '0 40px' }}>
                <div style={S.sectionTitle}>🎖️ Vie Scolaire & Discipline</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
                    {[
                        { label: 'Abs. Justifiées', val: discipline.absJust, icon: '📅', color: '#3b82f6' },
                        { label: 'Abs. Non Justifiées', val: discipline.absNonJust, icon: '⚠️', color: '#ef4444' },
                        { label: 'Retards', val: discipline.retards, icon: '🕐', color: '#f59e0b' },
                        { label: 'Conduite', val: discipline.conduite, icon: '⭐', color: '#22c55e' },
                        { label: 'Sanctions', val: discipline.sanctions, icon: '📝', color: '#8b5cf6' },
                    ].map((d, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 12px', textAlign: 'center', boxShadow: '0 2px 12px rgba(15,27,45,.07)', border: `1px solid ${d.color}22` }}>
                            <div style={{ fontSize: 20, marginBottom: 8 }}>{d.icon}</div>
                            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: d.color, lineHeight: 1 }}>{d.val}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .8, marginTop: 6 }}>{d.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── OBSERVATIONS ────────────────────────────────────────────────────── */}
            <div style={{ padding: '0 40px 32px' }}>
                <div style={S.sectionTitle}>💬 Observations</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                    {[
                        { label: 'Professeur Principal', val: observations.profPrincipal, icon: '👨‍🏫' },
                        { label: 'Direction', val: observations.direction, icon: '🏫' },
                        { label: 'Signature Parents', val: observations.parent || 'Lu et approuvé le : ___________', icon: '👨‍👩‍👧' },
                    ].map((obs, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(15,27,45,.07)', border: '1px solid rgba(15,27,45,.06)', minHeight: 100 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#0F1B2D', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>{obs.icon}</span> {obs.label}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', lineHeight: 1.6 }}>
                                {obs.val || '—'}
                            </div>
                            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed #e2e8f0', fontSize: 10, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                <span>Signature</span>
                                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
            <div style={S.goldBar} />
            <div style={{ background: 'linear-gradient(135deg,#0F1B2D,#1e3a5f)', padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', letterSpacing: .5 }}>
                    Document généré le {new Date().toLocaleDateString('fr-FR')} · {schoolInfo.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C' }} />
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>Bulletin officiel · Trimestre {selectedTrimester}</div>
                </div>
            </div>
        </div>
    );
}