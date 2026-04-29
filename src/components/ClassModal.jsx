import React, { useState } from 'react';
import Modal from './Modal';

export default function ClassModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Le nom de la classe est requis'); return; }
    setLoading(true);
    setError('');
    try {
      await onSave(name.trim());
      setName('');
      onClose();
    } catch (e) {
      setError('Erreur lors de l\'ajout. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName(''); setError(''); onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Ajouter une classe"
      onConfirm={handleSave}
      confirmLabel="Ajouter"
      loading={loading}
      size="sm"
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom de la classe <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Ex: 6ème A, CM2 B, Terminale S..."
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}