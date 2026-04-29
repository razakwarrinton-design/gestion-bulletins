import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

/**
 * Modal de confirmation avant suppression
 * Props :
 *   isOpen   : boolean
 *   onClose  : () => void
 *   onConfirm: () => Promise<void>
 *   title    : string  (ex: "Supprimer l'élève ?")
 *   message  : string  (ex: "Kouassi Diallo sera définitivement supprimé.")
 */
export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Confirmer la suppression'}
      onConfirm={handleConfirm}
      confirmLabel="Supprimer"
      confirmClass="bg-red-600 hover:bg-red-700 text-white"
      loading={loading}
      size="sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {message || 'Cette action est irréversible. Veux-tu vraiment continuer ?'}
          </p>
        </div>
      </div>
    </Modal>
  );
}