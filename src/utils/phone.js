/**
 * Un numéro Mobile Money doit être saisi avec l'indicatif du pays (+228, +229, +225, +221…) :
 * sans lui, on ne peut pas savoir quel opérateur et quel pays utiliser. Le serveur
 * (payment-initiate) revalide le numéro ; ce contrôle évite seulement un aller-retour inutile.
 */
export const hasInternationalPrefix = (value) =>
    /^\s*(\+|00)\d[\d\s]{8,}$/.test(String(value ?? ''));
