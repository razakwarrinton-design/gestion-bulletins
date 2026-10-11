/**
 * Informations de l'éditeur affichées dans les pages « Confidentialité » et « Conditions d'utilisation ».
 * Chaque déploiement les renseigne par des variables d'environnement (voir .env.example) ; tant qu'une
 * valeur manque, la page affiche « [à renseigner] » bien visible plutôt qu'une information inventée.
 */
const read = (value) => (typeof value === 'string' && value.trim() ? value.trim() : '');

export const LEGAL = {
  operator: read(import.meta.env.VITE_LEGAL_OPERATOR),
  address: read(import.meta.env.VITE_LEGAL_ADDRESS),
  email: read(import.meta.env.VITE_LEGAL_EMAIL),
  hosting: read(import.meta.env.VITE_DATA_HOSTING), // ex : « Supabase, région Europe (Francfort) »
};

export const TODO = '[à renseigner]';
