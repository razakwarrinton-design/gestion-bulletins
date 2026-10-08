import React, { useState } from 'react';
import { Trash2, MessageSquare } from 'lucide-react';
import { resolveId } from '../utils/ids';

/**
 * Composant: Gestion des appréciations
 * Deux niveaux:
 * 1. Appréciations enseignant (par matière et trimestre)
 * 2. Appréciations conseil de classe (générale)
 *
 * Les appréciations sont des lignes de la table appreciations (une par appréciation, voir
 * useAppreciations) : `onAdd` et `onDelete` renvoient { success, error }.
 */
export default function AppreciationManager({
  students,
  subjects,
  selectedClass,
  selectedTrimester,
  showNotification,
  appreciations = [],
  loading = false,
  error = '',
  onAdd,
  onDelete,
}) {
  const [activeTab, setActiveTab] = useState('teacher'); // 'teacher' ou 'council'
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    subjectId: '',
    trimester: selectedTrimester,
    text: ''
  });

  const classStudents = students.filter(s => s.classId === selectedClass);

  const handleAddAppreciation = async () => {
    const needsSubject = activeTab === 'teacher';
    if (!formData.studentId || !formData.text.trim() || (needsSubject && !formData.subjectId)) {
      showNotification('Veuillez remplir tous les champs');
      return;
    }

    setSaving(true);
    const result = await onAdd({
      // un <select> renvoie du texte : on retrouve l'identifiant d'origine (nombre)
      studentId: resolveId(students, formData.studentId),
      subjectId: needsSubject ? resolveId(subjects, formData.subjectId) : null,
      trimester: formData.trimester,
      type: activeTab,
      text: formData.text,
    });
    setSaving(false);

    if (result?.success === false) {
      showNotification(`Erreur : appréciation non enregistrée (${result.error})`);
      return;
    }
    showNotification('Appréciation enregistrée');
    resetForm();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette appréciation ?')) return;
    const result = await onDelete(id);
    showNotification(result?.success === false ? `Erreur : ${result.error}` : 'Appréciation supprimée');
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      subjectId: '',
      trimester: selectedTrimester,
      text: ''
    });
  };

  // Filtrer les appréciations selon l'onglet actif
  const filteredAppreciations = appreciations.filter(a => a.type === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <MessageSquare className="w-6 h-6 text-blue-600" />
        <h3 className="text-2xl font-bold">Gestion des appréciations</h3>
      </div>

      {/* Onglets */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => { setActiveTab('teacher'); resetForm(); }}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'teacher'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 Appréciations enseignant
        </button>
        <button
          onClick={() => { setActiveTab('council'); resetForm(); }}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'council'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🏛️ Conseil de classe
        </button>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-bold mb-4">
          {activeTab === 'teacher' ? 'Ajouter une appréciation enseignant' : 'Ajouter une appréciation conseil'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Élève */}
          <div>
            <label className="block text-sm font-medium mb-2">Élève</label>
            <select
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">Sélectionner un élève</option>
              {classStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.lastName} {s.firstName}
                </option>
              ))}
            </select>
          </div>

          {/* Matière (enseignant seulement) */}
          {activeTab === 'teacher' && (
            <div>
              <label className="block text-sm font-medium mb-2">Matière</label>
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Sélectionner une matière</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Trimestre */}
          <div>
            <label className="block text-sm font-medium mb-2">Trimestre</label>
            <select
              value={formData.trimester}
              onChange={(e) => setFormData({ ...formData, trimester: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="1">Trimestre 1</option>
              <option value="2">Trimestre 2</option>
              <option value="3">Trimestre 3</option>
            </select>
          </div>
        </div>

        {/* Texte appréciation */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">
            {activeTab === 'teacher' ? 'Appréciation enseignant' : 'Appréciation conseil de classe'}
          </label>
          <textarea
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            placeholder="Entrez l'appréciation..."
            rows="4"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex space-x-2 mt-4">
          <button
            onClick={handleAddAppreciation}
            disabled={saving}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            Enregistrer
          </button>
          <button
            onClick={resetForm}
            className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
          >
            Annuler
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-gray-400 text-center py-4">Chargement des appréciations…</p>}
        {!loading && filteredAppreciations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Aucune appréciation enregistrée</p>
          </div>
        ) : (
          !loading && filteredAppreciations.map(app => {
            const student = students.find(s => s.id === app.studentId);
            const subject = app.subjectId ? subjects.find(s => s.id === app.subjectId) : null;

            return (
              <div key={app.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-sm">
                      {student?.lastName} {student?.firstName}
                      {subject && ` - ${subject.name}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Trimestre {app.trimester} - {new Date(app.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="mt-2 text-sm text-gray-700">
                      {app.text}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(app.id)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
