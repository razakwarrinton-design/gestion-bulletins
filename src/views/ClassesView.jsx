import { Plus, Trash2 } from 'lucide-react';

const ClassesView = ({ currentUser, classes, students, onAddClass, onDeleteClass }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestion des classes</h2>
            {currentUser?.role === 'admin' && (
                <button onClick={onAddClass} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span>Ajouter une classe</span>
                </button>
            )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => (
                <div key={cls.id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold">{cls.name}</h3>
                            <p className="text-gray-600">{students.filter(s => s.classId === cls.id).length} élève(s)</p>
                        </div>
                        {currentUser?.role === 'admin' && (
                            <button onClick={() => onDeleteClass(cls)} className="text-red-600 hover:text-red-800 transition-colors">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default ClassesView;
