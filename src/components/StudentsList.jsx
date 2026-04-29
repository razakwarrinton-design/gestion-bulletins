import React from 'react';
import { Trash2, Plus, Edit2 } from 'lucide-react';

export default function StudentsList({
  classes,
  students,
  selectedClass,
  setSelectedClass,
  addStudent,
  editStudent,
  deleteStudent,
  currentUser
}) {
  const filtered = students.filter(s => !selectedClass || s.classId === selectedClass);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des élèves</h2>
        {currentUser?.role !== 'secretaire' && (
          <button
            onClick={addStudent}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un élève</span>
          </button>
        )}
      </div>

      {/* Filtre par classe */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Filtrer par classe:</label>
        <select
          value={selectedClass || ''}
          onChange={(e) => setSelectedClass(e.target.value || null)}
          className="w-full md:w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Toutes les classes</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {/* Compteur */}
      <p className="text-sm text-gray-500">
        {filtered.length} élève{filtered.length !== 1 ? 's' : ''}
        {selectedClass ? ` dans ${classes.find(c => c.id === selectedClass)?.name}` : ' au total'}
      </p>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Prénom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Classe</th>
              {currentUser?.role !== 'secretaire' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                  Aucun élève trouvé
                </td>
              </tr>
            ) : (
              filtered.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{student.lastName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.firstName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      {classes.find(c => c.id === student.classId)?.name || '—'}
                    </span>
                  </td>
                  {currentUser?.role !== 'secretaire' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => editStudent(student)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Modifier l'élève"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteStudent(student)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Supprimer l'élève"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}