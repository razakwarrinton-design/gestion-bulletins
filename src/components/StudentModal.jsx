import React, { useState, useEffect } from 'react';
import Modal from './Modal';

export default function StudentModal({ isOpen, onClose, onSave, classes, student = null }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [classId, setClassId]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});

  // Pré-remplir si modification
  useEffect(() => {
    if (student) {
      setFirstName(student.firstName || student.first_name || '');
      setLastName(student.lastName || student.last_name || '');
      setClassId(student.classId || student.class_id || '');
    } else {
      setFirstName(''); setLastName(''); setClassId('');
    }
    setErrors({});
  }, [student, isOpen]);

  const validate = () => {
    const errs = {};
    if (!firstName.trim()) errs.firstName = 'Prénom requis';
    if (!lastName.trim())  errs.lastName  = 'Nom requis';
    if (!classId)          errs.classId   = 'Classe requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave({ firstName: firstName.trim(), lastName: lastName.trim(), classId });
      onClose();
    } catch (e) {
      setErrors({ general: 'Erreur lors de l\'enregistrement. Réessaie.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({}); onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={student ? 'Modifier l\'élève' : 'Ajouter un élève'}
      onConfirm={handleSave}
      confirmLabel={student ? 'Enregistrer' : 'Ajouter'}
      loading={loading}
      size="sm"
    >
      <div className="space-y-4">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Kouassi"
              autoFocus
              className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.firstName ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Diallo"
              className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.lastName ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Classe <span className="text-red-500">*</span>
          </label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.classId ? 'border-red-400' : 'border-gray-300'}`}
          >
            <option value="">Sélectionner une classe</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          {errors.classId && <p className="text-red-500 text-xs mt-1">{errors.classId}</p>}
        </div>
      </div>
    </Modal>
  );
}