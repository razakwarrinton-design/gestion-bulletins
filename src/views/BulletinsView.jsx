import { Printer, MessageCircle } from 'lucide-react';
import { buildBulletinMessage, buildWhatsappLink } from '../utils/whatsapp';

const BulletinsView = ({
    classes, students, selectedClass, setSelectedClass,
    selectedTrimester, setSelectedTrimester,
    calculateAverage, getMention, getRank, schoolName, onPrint,
}) => {
    const className = classes.find(c => c.id === selectedClass)?.name;
    const classStudents = selectedClass ? students.filter(s => s.classId === selectedClass) : [];

    return (
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
                    {classStudents.map(student => {
                        const average = calculateAverage(student.id, selectedTrimester);
                        const mention = getMention(average);
                        const { rank, outOf } = getRank
                            ? getRank(student.id, selectedTrimester, classStudents)
                            : { rank: 0, outOf: 0 };
                        const whatsappLink = buildWhatsappLink(
                            student.emergencyPhone,
                            buildBulletinMessage({
                                student, className, trimester: selectedTrimester, average,
                                mentionText: mention.text, rank, outOf, schoolName,
                            }),
                        );
                        return (
                            <div key={student.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border-l-4" style={{ borderColor: mention.color }}>
                                <h3 className="text-lg font-bold mb-2 text-gray-800">{student.firstName} {student.lastName}</h3>
                                <div className="mb-3">
                                    <p className="text-3xl font-bold text-blue-600">{average}/20</p>
                                    <p className="text-sm font-medium mt-1" style={{ color: mention.color }}>{mention.text}</p>
                                    {rank > 0 && <p className="text-xs text-gray-500 mt-1">Rang : {rank}/{outOf}</p>}
                                </div>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => onPrint(student)}
                                        className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
                                    >
                                        <Printer className="w-5 h-5" />
                                        <span className="font-medium">Imprimer PDF</span>
                                    </button>
                                    {whatsappLink ? (
                                        <a
                                            href={whatsappLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full border border-green-600 text-green-700 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-green-50 transition-colors text-sm font-medium"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            <span>Envoyer par WhatsApp</span>
                                        </a>
                                    ) : (
                                        <p className="text-xs text-gray-400 text-center" title="Renseignez le contact d'urgence de l'élève (numéro avec indicatif ou 8 chiffres)">
                                            WhatsApp : aucun numéro de contact valide
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BulletinsView;
