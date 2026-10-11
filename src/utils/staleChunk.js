// Après un redéploiement, un onglet resté ouvert demande des fichiers d'écran qui n'existent plus :
// le chargement à la demande échoue avec l'un de ces messages (selon le navigateur).
const STALE_CHUNK = /dynamically imported module|importing a module script failed|Loading chunk|Loading CSS chunk|error loading dynamically/i;

export const isStaleChunkError = (error) =>
  error?.name === 'ChunkLoadError' || STALE_CHUNK.test(String(error?.message ?? ''));
