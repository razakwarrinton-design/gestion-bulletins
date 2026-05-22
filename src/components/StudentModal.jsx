import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { User, Phone, AlertTriangle, Camera } from 'lucide-react';

const RELATION_OPTIONS = ['Père', 'Mère', 'Tuteur', 'Tutrice', 'Grand-père', 'Grand-mère', 'Oncle', 'Tante', 'Frère', 'Sœur', 'Autre'];

export default function StudentModal({ isOpen, onClose, onSave, classes, student = null }) {
  const [activeTab, setActiveTab] = useState('infos');

  // ── Infos principales ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [classId, setClassId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // ── Contact d'urgence ──
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Pré-remplir si modification
  useEffect(() => {
    if (student) {
      setFirstName(student.firstName || student.first_name || '');
      setLastName(student.lastName || student.last_name || '');
      setClassId(student.classId || student.class_id || '');
      setBirthDate(student.birthDate || student.birth_date || '');
      setGender(student.gender || '');
      setPhotoUrl(student.photoUrl || student.photo_url || '');
      setEmergencyName(student.emergencyName || student.emergency_name || '');
      setEmergencyPhone(student.emergencyPhone || student.emergency_phone || '');
      setEmergencyRelation(student.emergencyRelation || student.emergency_relation || '');
    } else {
      setFirstName(''); setLastName(''); setClassId('');
      setBirthDate(''); setGender(''); setPhotoUrl('');
      setEmergencyName(''); setEmergencyPhone(''); setEmergencyRelation('');
    }
    setErrors({});
    setActiveTab('infos');
  }, [student, isOpen]);

  const validate = () => {
    const errs = {};
    if (!firstName.trim()) errs.firstName = 'Prénom requis';
    if (!lastName.trim()) errs.lastName = 'Nom requis';
    if (!classId) errs.classId = 'Classe requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { setActiveTab('infos'); return; }
    setLoading(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        classId,
        birthDate: birthDate || null,
        gender: gender || null,
        photoUrl: photoUrl || null,
        emergencyName: emergencyName.trim() || null,
        emergencyPhone: emergencyPhone.trim() || null,
        emergencyRelation: emergencyRelation || null,
      });
      onClose();
    } catch (e) {
      setErrors({ general: 'Erreur lors de l\'enregistrement. Réessaie.' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (err) =>
    `w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${err ? 'border-red-400' : 'border-gray-300'}`;

  const tabs = [
    { key: 'infos', icon: <User className="w-3.5 h-3.5" />, label: 'Infos' },
    { key: 'urgence', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Contact urgence' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setErrors({}); onClose(); }}
      title={student ? 'Modifier l\'élève' : 'Ajouter un élève'}
      onConfirm={handleSave}
      confirmLabel={student ? 'Enregistrer' : 'Ajouter'}
      loading={loading}
      size="md"
    >
      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
          {errors.general}
        </div>
      )}

      {/* ── Onglet Infos ── */}
      {activeTab === 'infos' && (
        <div className="space-y-4">

          {/* Nom / Prénom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Kouassi" autoFocus className={inputClass(errors.firstName)} />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Diallo" className={inputClass(errors.lastName)} />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Classe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Classe <span className="text-red-500">*</span>
            </label>
            <select value={classId} onChange={e => setClassId(e.target.value)} className={inputClass(errors.classId)}>
              <option value="">Sélectionner une classe</option>
              {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
            </select>
            {errors.classId && <p className="text-red-500 text-xs mt-1">{errors.classId}</p>}
          </div>

          {/* Date de naissance + Genre */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                className={inputClass(false)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className={inputClass(false)}>
                <option value="">— Non précisé</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>

          {/* Photo URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" /> Photo (URL)
            </label>
            <input type="url" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)}
              placeholder="https://..." className={inputClass(false)} />
            {photoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img src={photoUrl} alt="Aperçu" className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  onError={e => e.target.style.display = 'none'} />
                <span className="text-xs text-gray-400">Aperçu</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Onglet Contact d'urgence ── */}
      {activeTab === 'urgence' && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-700">
              Ces informations seront utilisées pour contacter un proche en cas d'urgence concernant l'élève.
            </p>
          </div>

          {/* Nom du contact */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet du contact</label>
            <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)}
              placeholder="Ex: Amadou Diallo" className={inputClass(false)} />
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> Numéro de téléphone
            </label>
            <input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)}
              placeholder="Ex: +228 90 00 00 00" className={inputClass(false)} />
          </div>

          {/* Relation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relation avec l'élève</label>
            <select value={emergencyRelation} onChange={e => setEmergencyRelation(e.target.value)} className={inputClass(false)}>
              <option value="">— Sélectionner</option>
              {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Récap si rempli */}
          {emergencyName && emergencyPhone && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-xs font-bold text-green-800 mb-1">Contact enregistré :</p>
              <p className="text-xs text-green-700">
                {emergencyName} ({emergencyRelation || 'relation non précisée'}) — {emergencyPhone}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}