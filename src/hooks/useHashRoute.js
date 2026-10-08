import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { parseHash, resolveView, viewToHash } from '../utils/route';

const subscribe = (callback) => {
    window.addEventListener('hashchange', callback);
    return () => window.removeEventListener('hashchange', callback);
};
const getSnapshot = () => window.location.hash;
const getServerSnapshot = () => '';

/**
 * Écran courant synchronisé avec l'adresse (`#/écran`) : boutons précédent/suivant du navigateur,
 * liens directs et rechargement fonctionnent.
 *
 * @param {string[]} allowedViews  écrans autorisés pour le compte connecté (ceux de son menu)
 * @param {string} defaultView     écran affiché quand l'adresse est vide, inconnue ou interdite
 * @returns {[string, (view: string) => void]} [écran courant, naviguer]
 */
export function useHashRoute({ allowedViews, defaultView }) {
    const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const requested = parseHash(hash);
    const view = resolveView(requested, allowedViews, defaultView);

    // Adresse de type écran (#/écran) mais inconnue ou interdite : on la remplace par celle de l'écran
    // réellement affiché (sans ajouter d'entrée d'historique, pour que « retour » ne ramène pas sur la
    // mauvaise adresse). Un fragment qui n'est PAS une route — #access_token=…&type=recovery des liens de
    // confirmation et de réinitialisation Supabase, #error=… — n'est jamais touché : le client
    // d'authentification doit pouvoir le lire.
    useEffect(() => {
        if (requested !== null && requested !== view) {
            window.history.replaceState(null, '', viewToHash(view));
        }
    }, [hash, requested, view]);

    const navigate = useCallback((target) => {
        if (!allowedViews.includes(target)) return;
        const next = viewToHash(target);
        if (window.location.hash !== next) window.location.hash = next;
    }, [allowedViews]);

    return [view, navigate];
}
