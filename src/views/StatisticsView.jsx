import {
    LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const StatisticsView = ({
    classes, students, subjects, grades,
    selectedClass, setSelectedClass, selectedTrimester, setSelectedTrimester,
    calculateAverage, getMention,
}) => {
    if (!selectedClass) {
        return (
            <div className="text-center p-12">
                <h2 className="text-2xl font-bold mb-4">Statistiques de la classe</h2>
                <p className="text-gray-600 mb-4">Veuillez sélectionner une classe pour voir les statistiques</p>
                <select
                    value={selectedClass || ''}
                    onChange={(e) => setSelectedClass(e.target.value || null)}
                    className="w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                </select>
            </div>
        );
    }

    const classStudents = students.filter(s => s.classId === selectedClass);
    const evolutionData = classStudents.map(student => ({
        name: `${student.firstName} ${student.lastName}`,
        T1: parseFloat(calculateAverage(student.id, '1')) || 0,
        T2: parseFloat(calculateAverage(student.id, '2')) || 0,
        T3: parseFloat(calculateAverage(student.id, '3')) || 0
    }));
    const classMoyenneData = [
        { trimestre: 'T1', moyenne: evolutionData.reduce((sum, s) => sum + s.T1, 0) / (evolutionData.length || 1) },
        { trimestre: 'T2', moyenne: evolutionData.reduce((sum, s) => sum + s.T2, 0) / (evolutionData.length || 1) },
        { trimestre: 'T3', moyenne: evolutionData.reduce((sum, s) => sum + s.T3, 0) / (evolutionData.length || 1) }
    ];
    const radarData = subjects.map(subject => {
        const subjectGrades = grades.filter(g =>
            g.subjectId === subject.id &&
            g.trimester === selectedTrimester &&
            classStudents.some(s => s.id === g.studentId)
        );
        const avg = subjectGrades.length > 0
            ? subjectGrades.reduce((sum, g) => sum + g.value, 0) / subjectGrades.length
            : 0;
        return { matiere: subject.name, moyenne: parseFloat(avg.toFixed(2)) };
    });
    const ranking = classStudents
        .map(student => ({ student, average: parseFloat(calculateAverage(student.id, selectedTrimester)) }))
        .sort((a, b) => b.average - a.average);
    const allAverages = ranking.map(r => r.average).filter(a => a > 0);
    const stats = {
        meilleure: Math.max(...allAverages, 0),
        moins_bonne: Math.min(...allAverages.filter(a => a > 0), 0),
        moyenne_classe: (allAverages.reduce((sum, a) => sum + a, 0) / (allAverages.length || 1)).toFixed(2)
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Statistiques de la classe</h2>
                <select
                    value={selectedClass || ''}
                    onChange={(e) => setSelectedClass(e.target.value || null)}
                    className="w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                </select>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Trimestre:</label>
                <select value={selectedTrimester} onChange={(e) => setSelectedTrimester(e.target.value)} className="w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="1">Trimestre 1</option>
                    <option value="2">Trimestre 2</option>
                    <option value="3">Trimestre 3</option>
                </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg shadow-md p-6 border-l-4 border-green-500">
                    <p className="text-sm text-gray-600">Meilleure moyenne</p>
                    <p className="text-3xl font-bold text-green-600">{stats.meilleure}/20</p>
                </div>
                <div className="bg-blue-50 rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600">Moyenne de classe</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.moyenne_classe}/20</p>
                </div>
                <div className="bg-orange-50 rounded-lg shadow-md p-6 border-l-4 border-orange-500">
                    <p className="text-sm text-gray-600">Moins bonne moyenne</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.moins_bonne > 0 ? stats.moins_bonne : 0}/20</p>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">📈 Évolution de la moyenne de classe</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={classMoyenneData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="trimestre" />
                        <YAxis domain={[0, 20]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="moyenne" stroke="#3b82f6" strokeWidth={3} name="Moyenne classe" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">🎯 Performance par matière (Trimestre {selectedTrimester})</h3>
                <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="matiere" />
                        <PolarRadiusAxis domain={[0, 20]} />
                        <Radar name="Moyenne" dataKey="moyenne" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                        <Tooltip />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">🏆 Classement (Trimestre {selectedTrimester})</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Rang</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Élève</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Moyenne</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mention</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {ranking.map((item, index) => {
                                const mention = getMention(item.average);
                                return (
                                    <tr key={item.student.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <span className="text-2xl font-bold">
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{item.student.firstName} {item.student.lastName}</td>
                                        <td className="px-6 py-4"><span className="text-xl font-bold text-blue-600">{item.average}/20</span></td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{ backgroundColor: mention.color }}>{mention.text}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StatisticsView;
