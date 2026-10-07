import { Printer } from 'lucide-react';

const BulletinsView = ({
    classes, students, selectedClass, setSelectedClass,
    selectedTrimester, setSelectedTrimester,
    calculateAverage, getMention, onPrint,
}) => (
    <div className="space-y-4">
        <h2 className="text-2xl font-bold">Consultation des bulletins</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block text-sm font-medium mb-2">Classe:</label>
                <select
                    value={selectedClass || ''}
                    onChange={(e) => setSelectedClass(e.target.value || null)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Sélectionner une classe</option>
                    {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-2">Trimestre:</label>
                <select
                    value={selectedTrimester}
                    onChange={(e) => setSelectedTrimester(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="1">Trimestre 1</option>
                    <option value="2">Trimestre 2</option>
                    <option value="3">Trimestre 3</option>
                </select>
            </div>
        </div>
        {selectedClass && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.filter(s => s.classId === selectedClass).map(student => {
                    const average = calculateAverage(student.id, selectedTrimester);
                    const mention = getMention(average);
                    return (
                        <div key={student.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4" style={{ borderColor: mention.color }}>
                            <h3 className="text-lg font-bold mb-2 text-gray-800">{student.firstName} {student.lastName}</h3>
                            <div className="mb-3">
                                <p className="text-3xl font-bold text-blue-600">{average}/20</p>
                                <p className="text-sm font-medium mt-1" style={{ color: mention.color }}>{mention.text}</p>
                            </div>
                            <button
                                onClick={() => onPrint(student)}
                                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
                            >
                                <Printer className="w-5 h-5" />
                                <span className="font-medium">Imprimer PDF</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

export default BulletinsView;
