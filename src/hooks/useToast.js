import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Message temporaire (toast). Un nouveau message remplace le précédent ET relance le compte à
 * rebours : avant, le minuteur du premier message masquait le second trop tôt.
 */
export function useToast({ initialMessage = '', initialDuration = 6000 } = {}) {
    const [toast, setToast] = useState({ show: Boolean(initialMessage), message: initialMessage });
    const timer = useRef(null);

    const hideAfter = useCallback((duration) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), duration);
    }, []);

    const notify = useCallback((message, duration = 3000) => {
        setToast({ show: true, message });
        hideAfter(duration);
    }, [hideAfter]);

    useEffect(() => {
        if (initialMessage) hideAfter(initialDuration);
        return () => clearTimeout(timer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { showAlert: toast.show, alertMessage: toast.message, notify };
}
