// Supabase (PostgREST) ne renvoie qu'un nombre limité de lignes par requête (1000 par défaut), sans erreur ni avertissement :
// au-delà, les lignes en trop manquent simplement. Ce chargeur lit la table page par page jusqu'à épuisement.

export const PAGE_SIZE = 1000;
// Garde-fou : un serveur qui ignorerait `.range()` renverrait toujours les mêmes lignes ; on s'arrête plutôt que de boucler
const MAX_PAGES = 500;

/**
 * `buildQuery` renvoie une requête neuve (from/select/filtres), SANS `.range()` ; elle doit être triée sur une
 * colonne unique (par ex. `.order('id')`), sinon deux pages peuvent se recouvrir ou sauter des lignes.
 * On avance du nombre de lignes réellement reçues : si le serveur plafonne sous PAGE_SIZE, aucune ligne n'est sautée.
 * Renvoie { data, error } comme une requête Supabase.
 */
export async function fetchAllRows(buildQuery, pageSize = PAGE_SIZE) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await buildQuery().range(rows.length, rows.length + pageSize - 1);
    if (error) return { data: null, error };
    if (!data || data.length === 0) return { data: rows, error: null };
    rows.push(...data);
  }
  return { data: null, error: { message: 'Chargement interrompu : trop de pages de résultats' } };
}
