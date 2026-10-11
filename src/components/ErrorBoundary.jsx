import React from 'react';
import { isStaleChunkError } from '../utils/staleChunk';
import { reportError } from '../utils/errorReporter';

export { isStaleChunkError };

/**
 * Garde-fou d'affichage : une erreur dans un écran ne doit pas laisser une page blanche.
 * `resetKey` (par exemple l'écran affiché) remet le garde-fou à zéro quand il change : on peut ainsi
 * quitter l'écran en panne par le menu.
 */
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erreur d\'affichage :', error, info?.componentStack);
    reportError(error, 'boundary');
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stale = isStaleChunkError(error);
    return (
      <div role="alert" className="text-center py-12 px-4 space-y-4">
        <p className="text-lg font-bold text-gray-900">
          {stale ? 'Une nouvelle version de l\'application est disponible' : 'Cet écran a rencontré une erreur'}
        </p>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          {stale
            ? 'Rechargez la page pour continuer : vos données enregistrées ne sont pas perdues.'
            : 'Vos données enregistrées ne sont pas perdues. Rechargez la page ; si l\'erreur revient, notez ce que vous faisiez et prévenez l\'administrateur.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
          >
            Recharger la page
          </button>
          {!stale && (
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold"
            >
              Réessayer
            </button>
          )}
        </div>
      </div>
    );
  }
}
