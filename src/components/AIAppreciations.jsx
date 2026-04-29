import React, { useState, useCallback } from 'react';
import { Sparkles, RefreshCw, Copy, Check, ChevronDown, ChevronUp, BookOpen, TrendingUp, AlertTriangle, Star } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const gradeColor = (v) => v >= 15 ? '#059669' : v >= 10 ? '#2563eb' : v >= 8 ? '#d97706' : '#dc2626';
const getMentionText = (v) => {
    if (v >= 16) return 'Très Bien';
    if (v >= 14) return 'Bien';
    if (v >= 12) return 'Assez Bien';
    if (v >= 10) return 'Passable';
    if (v >= 8) return 'Insuffisant';
    return 'Très Insuffisant';
};

// ── Appel API Claude ──────────────────────────────────────────────────────────
async function generateAppreciation(student, grades, subjects, trimester, classAverage, schoolInfo) {
    const avg = parseFloat(grades.reduce((sum, g) => {
        const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
        return sum + (g.value || 0) * (subj?.coefficient || 1);
    }, 0) / Math.max(grades.reduce((sum, g) => {
        const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
        return sum + (subj?.coefficient || 1);
    }, 0), 1)).toFixed(2);

    const sortedGrades = [...grades]
        .filter(g => g.value != null)
        .sort((a, b) => b.value - a.value);

    const strengths = sortedGrades.slice(0, 3).map(g => ({
        name: subjects.find(s => s.id === (g.subjectId || g.subject_id))?.name || '?',
        value: g.value
    }));

    const weaknesses = sortedGrades.slice(-3).reverse().map(g => ({
        name: subjects.find(s => s.id === (g.subjectId || g.subject_id))?.name || '?',
        value: g.value
    }));

    const prompt = `Tu es un directeur pédagogique d'une école africaine. Génère une appréciation scolaire courte, bienveillante et professionnelle pour le bulletin scolaire d'un élève.

INFORMATIONS SUR L'ÉLÈVE :
- Nom : ${student.firstName} ${student.lastName}
- Classe : ${student.className || 'N/A'}
- Trimestre : ${trimester}
- Moyenne générale : ${avg}/20 (${getMentionText(parseFloat(avg))})
- Moyenne de la classe : ${classAverage}/20

POINTS FORTS :
${strengths.map(s => `- ${s.name} : ${s.value}/20`).join('\n')}

POINTS À AMÉLIORER :
${weaknesses.map(s => `- ${s.name} : ${s.value}/20`).join('\n')}

INSTRUCTIONS :
- Rédige une appréciation de 2-3 phrases maximum
- Ton bienveillant, encourageant, professionnel
- Mentionne les points forts et encourage l'amélioration
- Adapte le niveau d'encouragement selon la moyenne (faible = beaucoup d'encouragement, élevé = félicitations)
- Ne commence PAS par "Félicitations" si la moyenne est en dessous de 12
- Écris directement l'appréciation, sans introduction ni explication
- Utilise le prénom de l'élève`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || '';
    if (!text) throw new Error('Réponse vide de l\'IA');
    return text.trim();
}

// ── Carte d'un élève avec appréciation ────────────────────────────────────────
function StudentAppreciationCard({
    student, grades, subjects, trimester, classAverage,
    schoolInfo, onSave
}) {
    const [appreciation, setAppreciation] = useState(
        grades.find(g => g.value != null)?.appreciation || ''
    );
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    const avg = parseFloat(grades.filter(g => g.value != null).reduce((sum, g) => {
        const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
        return sum + (g.value || 0) * (subj?.coefficient || 1);
    }, 0) / Math.max(grades.filter(g => g.value != null).reduce((sum, g) => {
        const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
        return sum + (subj?.coefficient || 1);
    }, 0), 1)) || 0;

    const mention = getMentionText(avg);
    const color = gradeColor(avg);
    const hasGrades = grades.filter(g => g.value != null).length > 0;

    const handleGenerate = async () => {
        if (!hasGrades) { setError('Aucune note disponible pour cet élève'); return; }
        setLoading(true); setError(''); setSaved(false);
        try {
            const result = await generateAppreciation(student, grades.filter(g => g.value != null), subjects, trimester, classAverage, schoolInfo);
            setAppreciation(result);
        } catch (e) {
            setError('Erreur IA : ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(appreciation);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        if (!appreciation || !onSave) return;
        try {
            await onSave(student.id, appreciation, trimester);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            setError('Erreur sauvegarde : ' + e.message);
        }
    };

    return (
        <div className={`bg-white rounded-2xl border-2 transition-all ${expanded ? 'border-blue-200 shadow-lg' : 'border-gray-100 hover:border-gray-200'}`}>
            {/* En-tête carte */}
            <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
                >
                    {student.firstName?.[0]}{student.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate">{student.firstName} {student.lastName}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold" style={{ color }}>{avg.toFixed(2)}/20</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs" style={{ color }}>{mention}</span>
                        {appreciation && (
                            <>
                                <span className="text-xs text-gray-400">·</span>
                                <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> Appréciation générée
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {!expanded && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
                            disabled={loading || !hasGrades}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-40 flex items-center gap-1"
                        >
                            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            {loading ? 'IA...' : 'Générer'}
                        </button>
                    )}
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </div>

            {/* Contenu expandé */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-gray-50 pt-4 space-y-4">
                    {/* Notes rapides */}
                    {hasGrades && (
                        <div className="grid grid-cols-3 gap-2">
                            {grades.filter(g => g.value != null).slice(0, 6).map((g, i) => {
                                const subj = subjects.find(s => s.id === (g.subjectId || g.subject_id));
                                const color = gradeColor(g.value);
                                return (
                                    <div key={i} className="bg-gray-50 rounded-lg px-2 py-1.5 flex items-center justify-between">
                                        <span className="text-xs text-gray-600 truncate">{(subj?.name || '?').slice(0, 8)}</span>
                                        <span className="text-xs font-black ml-1 flex-shrink-0" style={{ color }}>{g.value.toFixed(1)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!hasGrades && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2 text-amber-700 text-sm">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            Aucune note disponible pour générer une appréciation
                        </div>
                    )}

                    {/* Zone appréciation */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                            Appréciation du conseil de classe
                        </label>
                        <textarea
                            value={appreciation}
                            onChange={e => setAppreciation(e.target.value)}
                            rows={3}
                            placeholder="Cliquez sur 'Générer avec IA' pour créer une appréciation automatique, ou écrivez directement..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                        />
                    </div>

                    {/* Erreur */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleGenerate}
                            disabled={loading || !hasGrades}
                            className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {loading
                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Génération en cours...</>
                                : <><Sparkles className="w-4 h-4" /> Générer avec IA</>}
                        </button>
                        {appreciation && (
                            <>
                                <button onClick={handleCopy} title="Copier" className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition">
                                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                                {onSave && (
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition flex items-center gap-1.5"
                                    >
                                        {saved ? <><Check className="w-4 h-4" /> Sauvegardé</> : '💾 Sauvegarder'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function AIAppreciations({
    students, classes, grades, subjects,
    selectedClass, selectedTrimester,
    calculateAverage, showNotification,
    updateGrade
}) {
    const [filterClass, setFilterClass] = useState(selectedClass || '');
    const [generating, setGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState(0);

    const classStudents = filterClass
        ? students.filter(s => (s.classId || s.class_id) === filterClass)
        : students;

    // Calcul de la moyenne de classe
    const classAverages = classStudents.map(s => parseFloat(calculateAverage(s.id, selectedTrimester)) || 0).filter(v => v > 0);
    const classAverage = classAverages.length
        ? (classAverages.reduce((a, b) => a + b, 0) / classAverages.length).toFixed(2)
        : '0';

    // Notes d'un élève pour ce trimestre
    const getStudentGrades = useCallback((studentId) => {
        return grades.filter(g =>
            (g.studentId || g.student_id) === studentId &&
            g.trimester === selectedTrimester
        );
    }, [grades, selectedTrimester]);

    // Sauvegarder l'appréciation
    const handleSaveAppreciation = async (studentId, appreciation, trimester) => {
        const studentGrades = getStudentGrades(studentId);
        for (const g of studentGrades) {
            await updateGrade(studentId, g.subjectId || g.subject_id, trimester, g.value, appreciation);
        }
        showNotification('Appréciation sauvegardée !');
    };

    // Générer toutes les appréciations d'un coup
    const handleGenerateAll = async () => {
        if (!filterClass) { showNotification('Sélectionnez une classe d\'abord'); return; }
        const eligibleStudents = classStudents.filter(s => getStudentGrades(s.id).some(g => g.value != null));
        if (eligibleStudents.length === 0) { showNotification('Aucun élève avec des notes'); return; }

        setGenerating(true);
        setGenProgress(0);
        let done = 0;

        for (const student of eligibleStudents) {
            try {
                const studentGrades = getStudentGrades(student.id).filter(g => g.value != null);
                const enrichedStudent = {
                    ...student,
                    className: classes.find(c => c.id === (student.classId || student.class_id))?.name || ''
                };
                const appreciation = await generateAppreciation(
                    enrichedStudent, studentGrades, subjects,
                    selectedTrimester, classAverage, {}
                );
                // Sauvegarder sur le premier grade
                if (studentGrades.length > 0) {
                    const g = studentGrades[0];
                    await updateGrade(student.id, g.subjectId || g.subject_id, selectedTrimester, g.value, appreciation);
                }
                done++;
                setGenProgress(Math.round((done / eligibleStudents.length) * 100));
                // Petite pause pour ne pas surcharger l'API
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {
                console.error('Erreur pour', student.firstName, e);
            }
        }

        setGenerating(false);
        showNotification(`✅ ${done} appréciations générées !`);
    };

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                        IA Appréciations
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Génération automatique avec Claude AI — Trimestre {selectedTrimester}
                    </p>
                </div>
                <button
                    onClick={handleGenerateAll}
                    disabled={generating || !filterClass}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                    {generating
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> {genProgress}% en cours...</>
                        : <><Sparkles className="w-4 h-4" /> Tout générer</>}
                </button>
            </div>

            {/* Barre de progression globale */}
            {generating && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex justify-between text-sm font-semibold text-purple-700 mb-2">
                        <span>🤖 Claude génère les appréciations...</span>
                        <span>{genProgress}%</span>
                    </div>
                    <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
                            style={{ width: `${genProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Sélecteur classe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                    <select
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="">Toutes les classes</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                {filterClass && (
                    <div className="flex items-end">
                        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2 text-sm">
                            <span className="text-purple-600 font-semibold">{classStudents.length} élève{classStudents.length > 1 ? 's' : ''}</span>
                            <span className="text-purple-400 mx-2">·</span>
                            <span className="text-purple-600 font-semibold">Moy. classe : {classAverage}/20</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Info IA */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-purple-800">Comment ça marche ?</p>
                    <p className="text-xs text-purple-600 mt-0.5 leading-relaxed">
                        Claude analyse les notes, points forts, points faibles et la moyenne de classe de chaque élève pour générer une appréciation personnalisée, bienveillante et professionnelle. Vous pouvez ensuite modifier et sauvegarder chaque appréciation.
                    </p>
                </div>
            </div>

            {/* Liste des élèves */}
            {classStudents.length === 0 ? (
                <div className="text-center py-16">
                    <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400">
                        {filterClass ? 'Aucun élève dans cette classe' : 'Sélectionnez une classe pour commencer'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {classStudents.map(student => {
                        const enrichedStudent = {
                            ...student,
                            className: classes.find(c => c.id === (student.classId || student.class_id))?.name || ''
                        };
                        return (
                            <StudentAppreciationCard
                                key={student.id}
                                student={enrichedStudent}
                                grades={getStudentGrades(student.id)}
                                subjects={subjects}
                                trimester={selectedTrimester}
                                classAverage={classAverage}
                                schoolInfo={{}}
                                onSave={handleSaveAppreciation}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}