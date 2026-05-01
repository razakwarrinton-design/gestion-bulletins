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
    BarChart3, Activity, Target
} from 'lucide-react';

const fmt = (n) => parseFloat(n || 0).toFixed(2);
const fmtPct = (n) => `${parseFloat(n || 0).toFixed(1)}%`;

const getMention = (v) => {
    const n = parseFloat(v);
    if (n >= 16) return { text: 'Très Bien', color: '#059669' };
    if (n >= 14) return { text: 'Bien', color: '#2563eb' };
    if (n >= 12) return { text: 'Assez Bien', color: '#7c3aed' };
    if (n >= 10) return { text: 'Passable', color: '#d97706' };
    if (n >= 8) return { text: 'Insuffisant', color: '#ea580c' };
    return { text: 'Très Insuf.', color: '#dc2626' };
};

function KPICard({ icon: Icon, label, value, sub, color, bg, trend, onClick }) {
    return (
        <div onClick={onClick} className={`rounded-2xl p-5 border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(trend).toFixed(1)}%
                    </div>
                )}
            </div>
            <div className="text-2xl font-black text-gray-900 mb-0.5">{value}</div>
            <div className="text-sm font-semibold text-gray-600">{label}</div>
            {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
        </div>
    );
}

function MiniProgress({ value, max = 20, color }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex-1">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
    );
}

export default function DashboardKPIs({ classes, students, subjects, grades, calculateAverage, currentUser, currentYear = '2024-2025', setCurrentView, activities = [] }) {
    const [selectedTrimester, setSelectedTrimester] = useState('1');

    const stats = useMemo(() => {
        const validGrades = grades.filter(g => g.value != null);
        const allAverages = students.map(s => parseFloat(calculateAverage(s.id, selectedTrimester))).filter(a => a > 0 && !isNaN(a));
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

        const topStudents = students.map(s => ({ student: s, avg: parseFloat(calculateAverage(s.id, selectedTrimester)) || 0 })).filter(x => x.avg > 0).sort((a, b) => b.avg - a.avg).slice(0, 5);
        const atRisk = students.map(s => ({ student: s, avg: parseFloat(calculateAverage(s.id, selectedTrimester)) || 0 })).filter(x => x.avg > 0 && x.avg < 10).sort((a, b) => a.avg - b.avg).slice(0, 5);

        const classStats = classes.map(cls => {
            const clsStudents = students.filter(s => (s.classId || s.class_id) === cls.id);
            const clsAvgs = clsStudents.map(s => parseFloat(calculateAverage(s.id, selectedTrimester))).filter(a => a > 0 && !isNaN(a));
            const avg = clsAvgs.length ? clsAvgs.reduce((a, b) => a + b, 0) / clsAvgs.length : 0;
            return { name: cls.name, moyenne: parseFloat(avg.toFixed(2)), effectif: clsStudents.length };
        }).filter(c => c.moyenne > 0);

        const evolution = ['1', '2', '3'].map(t => {
            const avgs = students.map(s => parseFloat(calculateAverage(s.id, t))).filter(a => a > 0 && !isNaN(a));
            const avg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
            return { trimestre: `T${t}`, moyenne: parseFloat(avg.toFixed(2)) };
        });

        const subjectStats = subjects.map(subj => {
            const sg = grades.filter(g => (g.subjectId || g.subject_id) === subj.id && g.trimester === selectedTrimester && g.value != null);
            const avg = sg.length ? sg.reduce((s, g) => s + g.value, 0) / sg.length : 0;
            return { name: subj.name.slice(0, 10), moyenne: parseFloat(avg.toFixed(2)) };
        }).filter(s => s.moyenne > 0);

        return { totalStudents: students.length, totalClasses: classes.length, totalSubjects: subjects.length, totalGrades: validGrades.length, globalAvg, bestAvg, worstAvg, passRate, excellRate, failRate, mentionDist, topStudents, atRisk, classStats, evolution, subjectStats };
    }, [students, classes, subjects, grades, calculateAverage, selectedTrimester]);

    const globalMention = getMention(stats.globalAvg);

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-blue-600" /> Tableau de bord
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Vue d'ensemble — {currentYear}
                        {currentUser && <span className="ml-2 text-blue-600 font-medium">Bienvenue, {currentUser.firstName} 👋</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">Trimestre :</span>
                    {['1', '2', '3'].map(t => (
                        <button key={t} onClick={() => setSelectedTrimester(t)}
                            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${selectedTrimester === t ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            T{t}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs principaux */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard icon={GraduationCap} label="Classes" value={stats.totalClasses} sub={`${stats.totalStudents} élèves`} color="#2563eb" bg="#eff6ff" onClick={() => setCurrentView('classes')} />
                <KPICard icon={Users} label="Élèves" value={stats.totalStudents} sub={`${stats.totalClasses} classes`} color="#059669" bg="#ecfdf5" onClick={() => setCurrentView('students')} />
                <KPICard icon={BookOpen} label="Matières" value={stats.totalSubjects} sub={`${stats.totalGrades} notes saisies`} color="#7c3aed" bg="#f5f3ff" onClick={() => setCurrentView('subjects')} />
                <KPICard icon={Target} label="Moy. générale" value={`${fmt(stats.globalAvg)}/20`} sub={globalMention.text} color={globalMention.color} bg={`${globalMention.color}18`} />
            </div>

            {/* Taux de réussite + Extrêmes + Mentions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4"><CheckCircle className="w-5 h-5 text-green-600" /><h3 className="font-bold text-gray-800">Taux de réussite</h3></div>
                    <div className="space-y-3">
                        {[
                            { label: 'Admis (≥ 10)', val: stats.passRate, color: '#059669' },
                            { label: 'Excellence (≥ 14)', val: stats.excellRate, color: '#2563eb' },
                            { label: 'En difficulté (< 8)', val: stats.failRate, color: '#dc2626' },
                        ].map((item, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{item.label}</span>
                                    <span className="font-bold" style={{ color: item.color }}>{fmtPct(item.val)}</span>
                                </div>
                                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${item.val}%`, background: item.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-blue-600" /><h3 className="font-bold text-gray-800">Extrêmes (T{selectedTrimester})</h3></div>
                    <div className="space-y-3">
                        {[
                            { label: 'Meilleure', val: stats.bestAvg, emoji: '🥇', color: '#059669', bg: '#ecfdf5' },
                            { label: 'Moyenne', val: stats.globalAvg, emoji: '📊', color: '#2563eb', bg: '#eff6ff' },
                            { label: 'Plus basse', val: stats.worstAvg, emoji: '📉', color: '#dc2626', bg: '#fef2f2' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: item.bg }}>
                                <div>
                                    <div className="text-xs font-semibold uppercase" style={{ color: item.color }}>{item.label}</div>
                                    <div className="text-xl font-black" style={{ color: item.color }}>{fmt(item.val)}</div>
                                </div>
                                <span className="text-2xl">{item.emoji}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-yellow-500" /><h3 className="font-bold text-gray-800">Mentions (T{selectedTrimester})</h3></div>
                    {stats.mentionDist.length === 0
                        ? <div className="text-center py-6 text-gray-400 text-sm">Aucune donnée</div>
                        : <div className="space-y-2">
                            {stats.mentionDist.map((m, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                                    <span className="text-xs text-gray-600 flex-1">{m.name}</span>
                                    <span className="text-xs font-bold" style={{ color: m.color }}>{m.value}</span>
                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${(m.value / stats.totalStudents) * 100}%`, background: m.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    }
                </div>
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Évolution sur l'année</h3>
                    {stats.evolution.some(e => e.moyenne > 0) ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={stats.evolution}>
                                <defs>
                                    <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="trimestre" tick={{ fontSize: 11 }} />
                                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => [`${v}/20`, 'Moyenne']} />
                                <Area type="monotone" dataKey="moyenne" stroke="#2563eb" strokeWidth={3} fill="url(#avgGrad)" dot={{ r: 5, fill: '#2563eb' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Données insuffisantes</div>}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-purple-600" /> Moyennes par classe (T{selectedTrimester})</h3>
                    {stats.classStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={stats.classStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => [`${v}/20`, 'Moyenne']} />
                                <Bar dataKey="moyenne" radius={[6, 6, 0, 0]}>
                                    {stats.classStats.map((entry, i) => (
                                        <Cell key={i} fill={entry.moyenne >= 14 ? '#059669' : entry.moyenne >= 10 ? '#2563eb' : '#dc2626'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Aucune donnée</div>}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4 text-green-600" /> Performance par matière (T{selectedTrimester})</h3>
                    {stats.subjectStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <RadarChart data={stats.subjectStats}>
                                <PolarGrid stroke="#f1f5f9" />
                                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <PolarRadiusAxis domain={[0, 20]} tick={{ fontSize: 9 }} />
                                <Radar dataKey="moyenne" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} strokeWidth={2} />
                                <Tooltip formatter={(v) => [`${v}/20`, 'Moyenne']} />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Aucune donnée</div>}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Répartition des mentions (T{selectedTrimester})</h3>
                    {stats.mentionDist.length > 0 ? (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="50%" height={180}>
                                <PieChart>
                                    <Pie data={stats.mentionDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                                        {stats.mentionDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => [v + ' élève(s)']} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                                {stats.mentionDist.map((m, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                                        <span className="text-xs text-gray-600 flex-1">{m.name}</span>
                                        <span className="text-xs font-bold text-gray-800">{m.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Aucune donnée</div>}
                </div>
            </div>

            {/* Top 5 + Élèves en difficulté */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4">🏆 Top 5 élèves (T{selectedTrimester})</h3>
                    {stats.topStudents.length === 0
                        ? <div className="text-center py-6 text-gray-400 text-sm">Aucune donnée</div>
                        : <div className="space-y-3">
                            {stats.topStudents.map((item, i) => {
                                const mention = getMention(item.avg);
                                const medals = ['🥇', '🥈', '🥉'];
                                const cls = classes.find(c => c.id === (item.student.classId || item.student.class_id));
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xl w-8 text-center">{medals[i] || `${i + 1}`}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-semibold text-gray-800 truncate">{item.student.firstName} {item.student.lastName}</span>
                                                <span className="text-sm font-black ml-2 flex-shrink-0" style={{ color: mention.color }}>{item.avg.toFixed(2)}</span>
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
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> Élèves à suivre (T{selectedTrimester})</h3>
                    {stats.atRisk.length === 0
                        ? <div className="text-center py-8"><CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" /><p className="text-sm text-gray-400">Tous les élèves ont la moyenne !</p></div>
                        : <div className="space-y-3">
                            {stats.atRisk.map((item, i) => {
                                const mention = getMention(item.avg);
                                const cls = classes.find(c => c.id === (item.student.classId || item.student.class_id));
                                return (
                                    <div key={i} className="flex items-center gap-3 p-2.5 bg-red-50 rounded-xl border border-red-100">
                                        <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-black text-red-600">{item.avg.toFixed(1)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-gray-800 truncate">{item.student.firstName} {item.student.lastName}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-400">{cls?.name}</span>
                                                <span className="text-xs font-semibold" style={{ color: mention.color }}>{mention.text}</span>
                                            </div>
                                        </div>
                                        <MiniProgress value={item.avg} color={mention.color} />
                                    </div>
                                );
                            })}
                        </div>
                    }
                </div>
            </div>

            {/* Activités récentes */}
            {activities.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /> Activités récentes</h3>
                    <div className="space-y-2">
                        {activities.slice(0, 6).map((activity, i) => (
                            <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-gray-800">{activity.action}</span>
                                    <span className="text-sm text-gray-500 ml-1">— {activity.details}</span>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        {activity.user} · {new Date(activity.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Raccourcis rapides */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { icon: '✍️', label: 'Saisir notes', view: 'grades', color: 'from-orange-500 to-orange-600', roles: ['admin', 'professeur'] },
                    { icon: '📄', label: 'Bulletins', view: 'bulletins', color: 'from-green-500 to-green-600', roles: ['admin', 'professeur', 'secretaire'] },
                    { icon: '💰', label: 'Paiements', view: 'paiements', color: 'from-blue-500 to-blue-600', roles: ['admin', 'secretaire'] },
                    { icon: '📊', label: 'Statistiques', view: 'statistics', color: 'from-purple-500 to-purple-600', roles: ['admin', 'professeur'] },
                ].filter(item => !currentUser || item.roles.includes(currentUser.role)).map((item, i) => (
                    <button key={i} onClick={() => setCurrentView(item.view)}
                        className={`bg-gradient-to-r ${item.color} text-white rounded-2xl p-4 text-left hover:shadow-lg transition-all hover:-translate-y-0.5 shadow-md`}>
                        <div className="text-2xl mb-2">{item.icon}</div>
                        <div className="font-semibold text-sm">{item.label}</div>
                    </button>
                ))}
            </div>

        </div>
    );
}