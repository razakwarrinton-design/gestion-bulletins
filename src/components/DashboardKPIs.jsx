import React, { useMemo, useState } from 'react';
import {
    LineChart, Line, BarChart, Bar, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    GraduationCap, Users, BookOpen, TrendingUp, TrendingDown,
    Award, AlertTriangle, CheckCircle, Clock, Star,
    BarChart3, Activity, Target, Pencil, FileText,
    CreditCard, ChartBar, UserPlus, Send, Trophy, Flame
} from 'lucide-react';

const fmt = (n) => parseFloat(n || 0).toFixed(2);
const fmtPct = (n) => `${parseFloat(n || 0).toFixed(1)}%`;

const getMention = (v) => {
    const n = parseFloat(v);
    if (n >= 16) return { text: 'Très Bien', color: '#059669', bg: '#dcfce7' };
    if (n >= 14) return { text: 'Bien', color: '#2563eb', bg: '#dbeafe' };
    if (n >= 12) return { text: 'Assez Bien', color: '#7c3aed', bg: '#ede9fe' };
    if (n >= 10) return { text: 'Passable', color: '#d97706', bg: '#fef3c7' };
    if (n >= 8) return { text: 'Insuffisant', color: '#ea580c', bg: '#ffedd5' };
    return { text: 'Très Insuf.', color: '#dc2626', bg: '#fee2e2' };
};

/* ─── KPI Card ─────────────────────────────────────────────── */
function KPICard({ icon: Icon, label, value, sub, color, bg, trend, onClick }) {
    return (
        <div
            onClick={onClick}
            className={`relative rounded-2xl p-5 bg-white border border-blue-50 shadow-sm overflow-hidden transition-all duration-200
                ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-blue-200' : ''}`}
        >
            {/* subtle top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: color }} />

            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full
                        ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(trend).toFixed(1)}%
                    </div>
                )}
            </div>
            <div className="text-2xl font-black text-gray-900 mb-0.5 tracking-tight">{value}</div>
            <div className="text-sm font-semibold text-gray-600">{label}</div>
            {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
        </div>
    );
}

/* ─── Mini progress bar ─────────────────────────────────────── */
function MiniProgress({ value, max = 20, color }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="h-1.5 bg-blue-50 rounded-full overflow-hidden flex-1">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
        </div>
    );
}

/* ─── Section card wrapper ──────────────────────────────────── */
function SectionCard({ title, icon: Icon, iconColor = '#2563eb', action, children }) {
    return (
        <div className="bg-white rounded-2xl border border-blue-50 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />}
                    {title}
                </h3>
                {action}
            </div>
            {children}
        </div>
    );
}

/* ─── Quick action button ───────────────────────────────────── */
function QuickBtn({ icon: Icon, label, iconColor, bg, border, onClick }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2.5 p-3 rounded-xl border text-left w-full transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm"
            style={{ background: bg, borderColor: border }}
        >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'white' }}>
                <Icon className="w-4 h-4" style={{ color: iconColor }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: iconColor }}>{label}</span>
        </button>
    );
}

/* ─── Main component ────────────────────────────────────────── */
export default function DashboardKPIs({
    classes, students, subjects, grades,
    calculateAverage, currentUser,
    currentYear = '2024-2025',
    setCurrentView, activities = []
}) {
    const [selectedTrimester, setSelectedTrimester] = useState('1');

    /* ── all stats logic unchanged ── */
    const stats = useMemo(() => {
        const validGrades = grades.filter(g => g.value != null);
        const allAverages = students
            .map(s => parseFloat(calculateAverage(s.id, selectedTrimester)))
            .filter(a => a > 0 && !isNaN(a));

        const globalAvg = allAverages.length ? allAverages.reduce((a, b) => a + b, 0) / allAverages.length : 0;
        const bestAvg = allAverages.length ? Math.max(...allAverages) : 0;
        const worstAvg = allAverages.length ? Math.min(...allAverages) : 0;
        const passRate = allAverages.length ? (allAverages.filter(a => a >= 10).length / allAverages.length) * 100 : 0;
        const excellRate = allAverages.length ? (allAverages.filter(a => a >= 14).length / allAverages.length) * 100 : 0;
        const failRate = allAverages.length ? (allAverages.filter(a => a < 8).length / allAverages.length) * 100 : 0;

        const mentionDist = [
            { name: 'Très Bien', value: allAverages.filter(a => a >= 16).length, color: '#059669' },
            { name: 'Bien', value: allAverages.filter(a => a >= 14 && a < 16).length, color: '#2563eb' },
            { name: 'Assez Bien', value: allAverages.filter(a => a >= 12 && a < 14).length, color: '#7c3aed' },
            { name: 'Passable', value: allAverages.filter(a => a >= 10 && a < 12).length, color: '#d97706' },
            { name: 'Insuffisant', value: allAverages.filter(a => a >= 8 && a < 10).length, color: '#ea580c' },
            { name: 'Très Insuf.', value: allAverages.filter(a => a < 8).length, color: '#dc2626' },
        ].filter(m => m.value > 0);

        const topStudents = students
            .map(s => ({ student: s, avg: parseFloat(calculateAverage(s.id, selectedTrimester)) || 0 }))
            .filter(x => x.avg > 0)
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 5);

        const atRisk = students
            .map(s => ({ student: s, avg: parseFloat(calculateAverage(s.id, selectedTrimester)) || 0 }))
            .filter(x => x.avg > 0 && x.avg < 10)
            .sort((a, b) => a.avg - b.avg)
            .slice(0, 5);

        const classStats = classes.map(cls => {
            const clsStudents = students.filter(s => (s.classId || s.class_id) === cls.id);
            const clsAvgs = clsStudents
                .map(s => parseFloat(calculateAverage(s.id, selectedTrimester)))
                .filter(a => a > 0 && !isNaN(a));
            const avg = clsAvgs.length ? clsAvgs.reduce((a, b) => a + b, 0) / clsAvgs.length : 0;
            return { name: cls.name, moyenne: parseFloat(avg.toFixed(2)), effectif: clsStudents.length };
        }).filter(c => c.moyenne > 0);

        const evolution = ['1', '2', '3'].map(t => {
            const avgs = students
                .map(s => parseFloat(calculateAverage(s.id, t)))
                .filter(a => a > 0 && !isNaN(a));
            const avg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
            return { trimestre: `T${t}`, moyenne: parseFloat(avg.toFixed(2)) };
        });

        const subjectStats = subjects.map(subj => {
            const sg = grades.filter(g =>
                (g.subjectId || g.subject_id) === subj.id &&
                g.trimester === selectedTrimester && g.value != null
            );
            const avg = sg.length ? sg.reduce((s, g) => s + g.value, 0) / sg.length : 0;
            return { name: subj.name.slice(0, 10), moyenne: parseFloat(avg.toFixed(2)) };
        }).filter(s => s.moyenne > 0);

        return {
            totalStudents: students.length, totalClasses: classes.length,
            totalSubjects: subjects.length, totalGrades: validGrades.length,
            globalAvg, bestAvg, worstAvg,
            passRate, excellRate, failRate,
            mentionDist, topStudents, atRisk, classStats, evolution, subjectStats
        };
    }, [students, classes, subjects, grades, calculateAverage, selectedTrimester]);

    const globalMention = getMention(stats.globalAvg);

    /* ── quick actions filtered by role ── */
    const quickActions = [
        { icon: Pencil, label: 'Saisir notes', view: 'grades', iconColor: '#d97706', bg: '#fef3c7', border: '#fde68a', roles: ['admin', 'professeur'] },
        { icon: FileText, label: 'Bulletins', view: 'bulletins', iconColor: '#059669', bg: '#dcfce7', border: '#bbf7d0', roles: ['admin', 'professeur', 'secretaire'] },
        { icon: CreditCard, label: 'Paiements', view: 'paiements', iconColor: '#2563eb', bg: '#dbeafe', border: '#bfdbfe', roles: ['admin', 'secretaire'] },
        { icon: BarChart3, label: 'Statistiques', view: 'statistics', iconColor: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe', roles: ['admin', 'professeur'] },
    ].filter(item => !currentUser || item.roles.includes(currentUser.role));

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Tableau de bord
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Vue d'ensemble — {currentYear}
                        {currentUser && (
                            <span className="ml-2 text-blue-500 font-semibold">
                                Bienvenue, {currentUser.firstName} 👋
                            </span>
                        )}
                    </p>
                </div>
                {/* Trimester selector */}
                <div className="flex items-center gap-1.5 bg-blue-50 p-1 rounded-xl border border-blue-100">
                    {['1', '2', '3'].map(t => (
                        <button
                            key={t}
                            onClick={() => setSelectedTrimester(t)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150
                                ${selectedTrimester === t
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-blue-400 hover:text-blue-600'}`}
                        >
                            T{t}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard icon={GraduationCap} label="Classes" value={stats.totalClasses} sub={`${stats.totalStudents} élèves`} color="#2563eb" bg="#eff6ff" onClick={() => setCurrentView('classes')} />
                <KPICard icon={Users} label="Élèves" value={stats.totalStudents} sub={`${stats.totalClasses} classes`} color="#059669" bg="#f0fdf4" onClick={() => setCurrentView('students')} />
                <KPICard icon={BookOpen} label="Matières" value={stats.totalSubjects} sub={`${stats.totalGrades} notes saisies`} color="#7c3aed" bg="#faf5ff" onClick={() => setCurrentView('subjects')} />
                <KPICard icon={Target} label="Moy. générale" value={`${fmt(stats.globalAvg)}/20`} sub={globalMention.text} color={globalMention.color} bg={globalMention.bg} />
            </div>

            {/* ── Taux de réussite + Extrêmes + Mentions ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                <SectionCard title="Taux de réussite" icon={CheckCircle} iconColor="#059669">
                    <div className="space-y-4">
                        {[
                            { label: 'Admis (≥ 10)', val: stats.passRate, color: '#059669' },
                            { label: 'Excellence (≥ 14)', val: stats.excellRate, color: '#2563eb' },
                            { label: 'En difficulté (< 8)', val: stats.failRate, color: '#dc2626' },
                        ].map((item, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-gray-500 font-medium">{item.label}</span>
                                    <span className="font-bold" style={{ color: item.color }}>{fmtPct(item.val)}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${item.val}%`, background: item.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard title={`Extrêmes (T${selectedTrimester})`} icon={Activity} iconColor="#2563eb">
                    <div className="space-y-2">
                        {[
                            { label: 'MEILLEURE', val: stats.bestAvg, color: '#059669', bg: '#f0fdf4', icon: Award },
                            { label: 'MOYENNE', val: stats.globalAvg, color: '#2563eb', bg: '#eff6ff', icon: BarChart3 },
                            { label: 'PLUS BASSE', val: stats.worstAvg, color: '#dc2626', bg: '#fef2f2', icon: TrendingDown },
                        ].map(({ label, val, color, bg, icon: Ic }, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: bg }}>
                                <div>
                                    <div className="text-xs font-black tracking-wider" style={{ color }}>{label}</div>
                                    <div className="text-2xl font-black leading-none mt-0.5" style={{ color }}>{fmt(val)}</div>
                                </div>
                                <Ic className="w-7 h-7 opacity-30" style={{ color }} />
                            </div>
                        ))}
                    </div>
                </SectionCard>

                <SectionCard title={`Mentions (T${selectedTrimester})`} icon={Award} iconColor="#d97706">
                    {stats.mentionDist.length === 0
                        ? <div className="text-center py-6 text-gray-300 text-xs">Aucune donnée</div>
                        : <div className="space-y-2">
                            {stats.mentionDist.map((m, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                                    <span className="text-xs text-gray-500 flex-1">{m.name}</span>
                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full"
                                            style={{ width: `${(m.value / stats.totalStudents) * 100}%`, background: m.color }} />
                                    </div>
                                    <span className="text-xs font-bold w-4 text-right" style={{ color: m.color }}>{m.value}</span>
                                </div>
                            ))}
                        </div>
                    }
                </SectionCard>
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                <SectionCard title="Évolution sur l'année" icon={TrendingUp} iconColor="#2563eb">
                    {stats.evolution.some(e => e.moyenne > 0) ? (
                        <ResponsiveContainer width="100%" height={190}>
                            <AreaChart data={stats.evolution}>
                                <defs>
                                    <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f5ff" />
                                <XAxis dataKey="trimestre" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 20]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 10, border: '1px solid #dbeafe', fontSize: 12 }}
                                    formatter={(v) => [`${v}/20`, 'Moyenne']}
                                />
                                <Area type="monotone" dataKey="moyenne" stroke="#2563eb" strokeWidth={2.5}
                                    fill="url(#avgGrad)" dot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: 'white' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Données insuffisantes</div>}
                </SectionCard>

                <SectionCard title={`Moyennes par classe (T${selectedTrimester})`} icon={GraduationCap} iconColor="#7c3aed">
                    {stats.classStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={190}>
                            <BarChart data={stats.classStats} barCategoryGap="35%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f5ff" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 20]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 10, border: '1px solid #dbeafe', fontSize: 12 }}
                                    formatter={(v) => [`${v}/20`, 'Moyenne']}
                                />
                                <Bar dataKey="moyenne" radius={[8, 8, 0, 0]}>
                                    {stats.classStats.map((entry, i) => (
                                        <Cell key={i} fill={
                                            entry.moyenne >= 14 ? '#059669' :
                                                entry.moyenne >= 10 ? '#2563eb' : '#dc2626'
                                        } />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Aucune donnée</div>}
                </SectionCard>

                <SectionCard title={`Performance par matière (T${selectedTrimester})`} icon={BookOpen} iconColor="#059669">
                    {stats.subjectStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={190}>
                            <RadarChart data={stats.subjectStats}>
                                <PolarGrid stroke="#e0e7ff" />
                                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <PolarRadiusAxis domain={[0, 20]} tick={{ fontSize: 9, fill: '#cbd5e1' }} />
                                <Radar dataKey="moyenne" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 10, border: '1px solid #dbeafe', fontSize: 12 }}
                                    formatter={(v) => [`${v}/20`, 'Moyenne']}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Aucune donnée</div>}
                </SectionCard>

                <SectionCard title={`Répartition des mentions (T${selectedTrimester})`} icon={Star} iconColor="#d97706">
                    {stats.mentionDist.length > 0 ? (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="50%" height={175}>
                                <PieChart>
                                    <Pie data={stats.mentionDist} cx="50%" cy="50%"
                                        innerRadius={42} outerRadius={72}
                                        dataKey="value" paddingAngle={3}>
                                        {stats.mentionDist.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: 10, border: '1px solid #dbeafe', fontSize: 12 }}
                                        formatter={(v) => [v + ' élève(s)']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                                {stats.mentionDist.map((m, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                                        <span className="text-xs text-gray-500 flex-1">{m.name}</span>
                                        <span className="text-xs font-bold" style={{ color: m.color }}>{m.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">Aucune donnée</div>}
                </SectionCard>
            </div>

            {/* ── Top 5 + Élèves à suivre ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                <SectionCard title={`Top 5 élèves (T${selectedTrimester})`} icon={Trophy} iconColor="#d97706">
                    {stats.topStudents.length === 0
                        ? <div className="text-center py-6 text-gray-300 text-xs">Aucune donnée</div>
                        : <div className="space-y-3">
                            {stats.topStudents.map((item, i) => {
                                const mention = getMention(item.avg);
                                const cls = classes.find(c => c.id === (item.student.classId || item.student.class_id));
                                const medals = [
                                    <span key="g" className="text-lg">🥇</span>,
                                    <span key="s" className="text-lg">🥈</span>,
                                    <span key="b" className="text-lg">🥉</span>,
                                ];
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-7 text-center flex-shrink-0">
                                            {medals[i] || <span className="text-xs font-bold text-gray-400">{i + 1}</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-semibold text-gray-800 truncate">
                                                    {item.student.firstName} {item.student.lastName}
                                                </span>
                                                <span className="text-sm font-black ml-2 flex-shrink-0" style={{ color: mention.color }}>
                                                    {item.avg.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <MiniProgress value={item.avg} color={mention.color} />
                                                <span className="text-xs text-gray-400 flex-shrink-0">{cls?.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    }
                </SectionCard>

                <SectionCard title={`Élèves à suivre (T${selectedTrimester})`} icon={AlertTriangle} iconColor="#dc2626">
                    {stats.atRisk.length === 0
                        ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Tous les élèves ont la moyenne !</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {stats.atRisk.map((item, i) => {
                                    const mention = getMention(item.avg);
                                    const cls = classes.find(c => c.id === (item.student.classId || item.student.class_id));
                                    return (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-black text-red-600">{item.avg.toFixed(1)}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-gray-800 truncate">
                                                    {item.student.firstName} {item.student.lastName}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-gray-400">{cls?.name}</span>
                                                    <span className="text-xs font-bold" style={{ color: mention.color }}>
                                                        · {mention.text}
                                                    </span>
                                                </div>
                                            </div>
                                            <MiniProgress value={item.avg} color={mention.color} />
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    }
                </SectionCard>
            </div>

            {/* ── Activités récentes ── */}
            {activities.length > 0 && (
                <SectionCard title="Activités récentes" icon={Clock} iconColor="#64748b">
                    <div className="space-y-1">
                        {activities.slice(0, 6).map((activity, i) => (
                            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-blue-50 last:border-0">
                                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-700">
                                        <span className="font-semibold">{activity.action}</span>
                                        <span className="text-gray-400 ml-1">— {activity.details}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {activity.user} · {new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* ── Quick actions ── */}
            {quickActions.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickActions.map((item, i) => (
                        <QuickBtn
                            key={i}
                            icon={item.icon}
                            label={item.label}
                            iconColor={item.iconColor}
                            bg={item.bg}
                            border={item.border}
                            onClick={() => setCurrentView(item.view)}
                        />
                    ))}
                </div>
            )}

        </div>
    );
}