/**
 * Message d'erreur lisible d'une Edge Function : le corps JSON `{ error }` de la réponse HTTP
 * quand il existe, sinon le message générique de la bibliothèque.
 */
export async function readFunctionError(error, fallback = "Erreur du service") {
  try {
    const response = error?.context;
    if (response && typeof response.json === "function") {
      const body = await response.json();
      if (body?.error) return body.error;
    }
  } catch {
    // corps illisible : on retombe sur le message générique
  }
  return error?.message || fallback;
}
