import { useCallback, useState } from 'react';

const CLOSED = { open: false, title: '', message: '', onConfirm: null };

/** État de la boîte de confirmation (suppression, déconnexion…). */
export function useConfirmDialog() {
    const [confirmModal, setConfirmModal] = useState(CLOSED);
    const openConfirm = useCallback((title, message, onConfirm) => {
        setConfirmModal({ open: true, title, message, onConfirm });
    }, []);
    const closeConfirm = useCallback(() => setConfirmModal(CLOSED), []);
    return { confirmModal, openConfirm, closeConfirm };
}
