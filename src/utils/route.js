/**
 * Adresses de l'application : `#/grades`, `#/classes`… (le « # » évite toute configuration du
 * serveur : un rechargement ou un lien direct ne dépend pas d'une redirection côté hébergeur, et
 * le retour de paiement `/?payment=ID` reste intact).
 */

/** Écran demandé par une adresse (`#/grades?x=1` → 'grades'), ou null. */
export function parseHash(hash) {
    const match = /^#\/([A-Za-z0-9_-]+)/.exec(hash || '');
    return match ? match[1] : null;
}

export function viewToHash(view) {
    return `#/${view}`;
}

/**
 * Écran à afficher : celui demandé s'il est autorisé pour ce compte, sinon l'écran par défaut.
 * Une adresse ne donne jamais accès à un écran absent du menu du compte connecté.
 */
export function resolveView(requested, allowedViews, defaultView) {
    return requested && allowedViews.includes(requested) ? requested : defaultView;
}
