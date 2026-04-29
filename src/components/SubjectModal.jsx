import React, { useState } from 'react';
import Modal from './Modal';

export default function SubjectModal({ isOpen, onClose, onSave }) {
  const [name, setName]           = useState('');
  const [coefficient, setCoef]    = useState('1');
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Nom de la matière requis';
    const c = parseFloat(coefficient);
    if (isNaN(c) || c <= 0) errs.coefficient = 'Coefficient invalide (ex: 1, 2, 3)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave(name.trim(), parseFloat(coefficient));
      setName(''); setCoef('1'); onClose();
    } catch (e) {
      setErrors({ general: 'Erreur lors de l\'ajout. Réessaie.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName(''); setCoef('1'); setErrors({}); onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ajouter une matière"
      onConfirm={handleSave}
      confirmLabel="Ajouter"
      loading={loading}
      size="sm"
    >
      <div className="space-y-4">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {errors.general}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de la matière <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Ex: Mathématiques, Français, SVT..."
            autoFocus
            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Coefficient <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(c => (
              <button
                key={c}
                onClick={() => setCoef(String(c))}
                className={`w-10 h-10 rounded-lg text-sm font-medium border transition ${coefficient === String(c) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
              >
                {c}
              </button>
            ))}
            <input
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              value={coefficient}
              onChange={(e) => setCoef(e.target.value)}
              className={`w-20 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.coefficient ? 'border-red-400' : 'border-gray-300'}`}
            />
          </div>
          {errors.coefficient && <p className="text-red-500 text-xs mt-1">{errors.coefficient}</p>}
        </div>
      </div>
    </Modal>
  );
}