/**
 * Rapport des erreurs du navigateur vers la table client_errors (voir sql/client-errors.sql), lisible par les
 * administrateurs dans Paramètres. Sans service tiers.
 *
 * Règles :
 *   - ce code ne lève jamais d'exception (une erreur ici ne doit pas en créer d'autres) ; au premier refus de la base (table absente, trop de rapports, session expirée) il s'arrête
 *     jusqu'au rechargement de la page ;
 *   - une même erreur n'est envoyée qu'une fois, et au plus MAX_REPORTS par chargement de page ;
 *   - on n'envoie que le message et la pile (tronqués), l'écran sans paramètres d'adresse, et le navigateur : jamais
 *     de props, d'état, de notes ni de noms ; adresses e-mail, numéros et jetons sont masqués.
 */
import { supabase } from '../config/supabase';
import { isStaleChunkError } from './staleChunk';
import { parseHash } from './route';

export const MAX_REPORTS = 10;
const MAX_MESSAGE = 300;
const MAX_STACK = 3000;

// Bruit sans intérêt : boucle de ResizeObserver (inoffensive) et erreurs opaques d'un script d'une autre origine
const IGNORED = /ResizeObserver loop|^Script error\.?$/i;

/** Masque ce qui peut identifier une personne et borne la taille. */
export function scrub(text, max) {
  return String(text ?? '')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jeton]')
    .replace(/\b(access_token|refresh_token|token|apikey|key)=[^&\s)]+/gi, '$1=[masqué]')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[e-mail]')
    .replace(/\+?\d[\d\s.-]{6,}\d/g, '[numéro]')
    .slice(0, max);
}

const routeName = (hash) => {
  const view = parseHash(hash);
  return view && /^[a-z0-9_-]{1,40}$/i.test(view) ? view : null;
};

/**
 * Crée un rapporteur. `send(row)` écrit la ligne (rejette si la base refuse), `getUserId()` donne le compte connecté
 * (null : pas de rapport). Les dépendances sont injectées pour les tests.
 */
export function createReporter({ send, getUserId, getHash = () => window.location.hash, getUserAgent = () => navigator.userAgent }) {
  const seen = new Set();
  let sent = 0;
  let stopped = false;

  return async function report(error, source = 'window') {
    if (stopped || sent >= MAX_REPORTS) return;
    try {
      if (isStaleChunkError(error)) return; // simple nouvelle version déployée : rien à corriger
      const message = scrub(error?.message ?? error, MAX_MESSAGE);
      if (!message || IGNORED.test(message)) return;
      const stack = error?.stack ? scrub(error.stack, MAX_STACK) : null;
      const key = `${message}|${(stack ?? '').split('\n')[1] ?? ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      const userId = await getUserId();
      if (!userId) return;
      sent += 1;
      await send({
        user_id: userId, source, message, stack,
        route: routeName(getHash()),
        user_agent: scrub(getUserAgent(), 300),
      });
    } catch {
      stopped = true; // la base refuse (table absente, limite atteinte…) : on arrête jusqu'au rechargement
    }
  };
}

const defaultReport = createReporter({
  getUserId: async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id ?? null;
  },
  send: async (row) => {
    const { error } = await supabase.from('client_errors').insert(row);
    if (error) throw error;
  },
});

/** Signale une erreur (ne lève jamais). */
export function reportError(error, source) {
  if (!supabase) return Promise.resolve();
  return defaultReport(error, source);
}

let installed = false;

/** Branche les erreurs non rattrapées et les promesses rejetées de la page. Sans effet si déjà branché. */
export function installErrorReporting() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (event) => reportError(event.error ?? event.message, 'window'));
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason, 'promise'));
}
