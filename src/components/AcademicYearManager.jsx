import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Calendar } from 'lucide-react';

/**
 * Composant: Gestion des années scolaires
 * Permet à l'admin de créer et gérer plusieurs années scolaires
 * 
 * Structure: 
 * - année scolaire (ex: 2024-2025)
 * - dates de début/fin
 * - périodes de trimestres
 * - statut (active, archived)
 */
export default function AcademicYearManager({
  academicYears = [],
  setAcademicYears,
  currentYear,
  setCurrentYear,
  showNotification
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    year: '',
    startDate: '',
    endDate: '',
    t1Start: '',
    t1End: '',
    t2Start: '',
    t2End: '',
    t3Start: '',
    t3End: '',
    isActive: true
  });

  const handleAdd = () => {
    // Validation
    if (!formData.year || !formData.startDate || !formData.endDate) {
      showNotification('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newYear = {
      id: Date.now(),
      year: formData.year,
      startDate: formData.startDate,
      endDate: formData.endDate,
      trimesters: [
        {
          number: 1,
          startDate: formData.t1Start,
          endDate: formData.t1End
        },
        {
          number: 2,
          startDate: formData.t2Start,
          endDate: formData.t2End
        },
        {
          number: 3,
          startDate: formData.t3Start,
          endDate: formData.t3End
        }
      ],
      isActive: formData.isActive,
      createdAt: new Date().toISOString()
    };

    setAcademicYears([...academicYears, newYear]);
    showNotification(`Année scolaire ${formData.year} créée avec succès`);
    
    if (formData.isActive) {
      setCurrentYear(newYear.year);
    }
    
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer cette année scolaire ?')) {
      setAcademicYears(academicYears.filter(y => y.id !== id));
      showNotification('Année scolaire supprimée');
    }
  };

  const handleSetActive = (year) => {
    setCurrentYear(year.year);
    setAcademicYears(academicYears.map(y => ({
      ...y,
      isActive: y.year === year.year
    })));
    showNotification(`Année ${year.year} définie comme active`);
  };

  const resetForm = () => {
    setFormData({
      year: '',
      startDate: '',
      endDate: '',
      t1Start: '',
      t1End: '',
      t2Start: '',
      t2End: '',
      t3Start: '',
      t3End: '',
      isActive: true
    });
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-purple-600" />
          <span>Gestion des années scolaires</span>
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter année</span>
          </button>
        )}
      </div>

      {/* Formulaire d'ajout */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="font-bold mb-4">Nouvelle année scolaire</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Année (ex: 2024-2025)</label>
              <input
                type="text"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="2024-2025"
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Statut</label>
              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="active">Active</option>
                <option value="inactive">Archive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Début de l'année</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Fin de l'année</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Trimestres */}
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h5 className="font-bold mb-4">Définir les trimestres</h5>
            
            {[1, 2, 3].map(trim => (
              <div key={trim} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Trimestre {trim} - Début</label>
                  <input
                    type="date"
                    value={formData[`t${trim}Start`]}
                    onChange={(e) => setFormData({ ...formData, [`t${trim}Start`]: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Trimestre {trim} - Fin</label>
                  <input
                    type="date"
                    value={formData[`t${trim}End`]}
                    onChange={(e) => setFormData({ ...formData, [`t${trim}End`]: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-2 mt-6">
            <button
              onClick={handleAdd}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Créer
            </button>
            <button
              onClick={resetForm}
              className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des années */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {academicYears.map(year => (
          <div
            key={year.id}
            className={`rounded-lg shadow-md p-6 border-l-4 transition-all ${
              year.isActive
                ? 'bg-gradient-to-br from-green-50 to-white border-green-500'
                : 'bg-gray-50 border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-lg font-bold">{year.year}</h4>
                <p className="text-xs text-gray-500">
                  {new Date(year.startDate).toLocaleDateString('fr-FR')} - {new Date(year.endDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
              {year.isActive && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                  Active
                </span>
              )}
            </div>

            {/* Trimestres */}
            <div className="space-y-2 mb-4 text-sm">
              {year.trimesters?.map(t => (
                <div key={t.number} className="bg-white rounded p-2">
                  <p className="font-semibold text-xs">Trimestre {t.number}</p>
                  <p className="text-xs text-gray-600">
                    {t.startDate && t.endDate
                      ? `${new Date(t.startDate).toLocaleDateString('fr-FR')} - ${new Date(t.endDate).toLocaleDateString('fr-FR')}`
                      : 'Non défini'}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              {!year.isActive && (
                <button
                  onClick={() => handleSetActive(year)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700"
                >
                  Activer
                </button>
              )}
              <button
                onClick={() => handleDelete(year.id)}
                className="px-3 py-2 rounded text-xs hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {academicYears.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Aucune année scolaire créée</p>
        </div>
      )}
    </div>
  );
}
