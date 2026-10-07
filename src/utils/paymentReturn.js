/**
 * Retour depuis la page de paiement FedaPay.
 *
 * La fonction `payment-initiate` demande à FedaPay de renvoyer l'utilisateur vers
 * `<APP_URL>/?payment=<id>`. Cette fonction lit l'identifiant, retire le paramètre de
 * l'URL (pour ne pas réafficher le message à chaque rechargement) et le renvoie.
 *
 * Le paramètre d'URL n'est PAS une preuve de paiement : le statut réel est celui
 * écrit par le webhook en base. On affiche donc seulement un message d'attente.
 */
export function consumePaymentReturn(
    location = typeof window !== 'undefined' ? window.location : null,
    history = typeof window !== 'undefined' ? window.history : null,
) {
    if (!location) return null;

    const params = new URLSearchParams(location.search);
    const paymentId = params.get('payment');
    if (!paymentId) return null;

    params.delete('payment');
    const query = params.toString();
    const cleaned = `${location.pathname}${query ? `?${query}` : ''}${location.hash || ''}`;
    try {
        history?.replaceState?.(null, '', cleaned);
    } catch {
        // l'URL reste telle quelle : sans conséquence
    }
    return paymentId;
}

export const PAYMENT_RETURN_MESSAGE =
    'Paiement en cours de confirmation. Son statut sera mis à jour dans quelques instants.';
