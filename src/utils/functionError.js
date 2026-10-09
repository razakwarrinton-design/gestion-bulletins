/**
 * Message d'erreur lisible d'une Edge Function : le corps JSON `{ error }` de la réponse HTTP
 * quand il existe, sinon un message précis pour une fonction absente ou injoignable, sinon le message
 * générique de la bibliothèque (« Edge Function returned a non-2xx status code », peu parlant).
 *
 * `functionName` sert à nommer la fonction dans ces deux cas.
 */
export async function readFunctionError(error, fallback = "Erreur du service", functionName = "") {
  const label = functionName ? `La fonction « ${functionName} »` : "La fonction";
  try {
    const response = error?.context;
    if (response && typeof response.json === "function") {
      const body = await response.json().catch(() => null);
      if (body?.error) return body.error;
      // La plateforme répond 404 (sans champ `error`) quand la fonction n'a jamais été déployée.
      if (response.status === 404) return `${label} n'est pas déployée sur ce projet Supabase.`;
    }
  } catch {
    // corps illisible : on retombe sur le message générique
  }
  // Aucune réponse HTTP : fonction absente (la requête préalable CORS échoue) ou réseau coupé.
  if (error?.name === "FunctionsFetchError") {
    return `${label} est injoignable : elle n'est peut-être pas déployée sur ce projet Supabase, ou la connexion est coupée.`;
  }
  return error?.message || fallback;
}
