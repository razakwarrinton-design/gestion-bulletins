import { Plus, Trash2 } from 'lucide-react';

const SubjectsView = ({ currentUser, subjects, onAddSubject, onDeleteSubject }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestion des matières</h2>
            {currentUser?.role === 'admin' && (
                <button onClick={onAddSubject} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>Ajouter une matière</span>
                </button>
            )}
        </div>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Matière</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Coefficient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {subjects.map(subject => (
                        <tr key={subject.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{subject.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{subject.coefficient}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {currentUser?.role === 'admin' && (
                                    <button onClick={() => onDeleteSubject(subject)} className="text-red-600 hover:text-red-800 transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export default SubjectsView;
