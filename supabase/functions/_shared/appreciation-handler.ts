// Traitement d'une requête generate-appreciation, séparé de Deno et de Supabase pour être testé avec de
// fausses dépendances (appreciation-handler.test.ts). index.ts ne fait que brancher les vraies.
import {
  APPRECIATION_ALLOWED_ROLES,
  buildMessages,
  buildProviderRequest,
  parseCompletion,
  parseRequest,
} from "./appreciation.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface HandlerDeps {
  /** Secrets de la fonction (AI_API_KEY, AI_MODEL, AI_BASE_URL). */
  env: (name: string) => string | undefined;
  /** Compte de l'appelant d'après son jeton, ou null. */
  getUserId: (authHeader: string) => Promise<string | null>;
  /** Rôle du compte dans user_profiles, ou null. */
  getRole: (authHeader: string, userId: string) => Promise<string | null>;
  fetch: typeof fetch;
}

const TIMEOUT_MS = 20000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handleRequest(req: Request, deps: HandlerDeps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    const apiKey = deps.env("AI_API_KEY");
    const model = deps.env("AI_MODEL");
    const baseUrl = deps.env("AI_BASE_URL");
    if (!apiKey || !model || !baseUrl) {
      console.error("generate-appreciation : AI_API_KEY, AI_MODEL ou AI_BASE_URL non configuré");
      return json({ error: "La génération d'appréciations n'est pas configurée" }, 503);
    }

    const userId = await deps.getUserId(authHeader);
    if (!userId) return json({ error: "Non authentifié" }, 401);
    const role = await deps.getRole(authHeader, userId);
    if (!role || !APPRECIATION_ALLOWED_ROLES.includes(role)) {
      return json({ error: "Action non autorisée pour votre rôle" }, 403);
    }

    const body = await req.json().catch(() => null);
    const parsed = parseRequest(body);
    if (!parsed.ok) return json({ error: parsed.error }, 400);

    const { url, init } = buildProviderRequest({ apiKey, model, baseUrl }, buildMessages(parsed.input));
    let response: Response;
    try {
      response = await deps.fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      // ni le contenu de la requête ni la réponse ne sont journalisés (données d'élèves)
      console.error("generate-appreciation : fournisseur injoignable", (err as Error)?.name);
      return json({ error: "Le service de rédaction est injoignable, réessayez dans un instant" }, 502);
    }

    if (!response.ok) {
      console.error("generate-appreciation : refus du fournisseur", response.status);
      return json({ error: "Le service de rédaction a refusé la demande" }, 502);
    }

    const payload = await response.json().catch(() => null);
    const appreciation = parseCompletion(payload);
    if (!appreciation) return json({ error: "Le service de rédaction a renvoyé une réponse vide" }, 502);
    return json({ appreciation });
  } catch (err) {
    console.error("generate-appreciation : erreur inattendue", (err as Error)?.name);
    return json({ error: "Erreur interne" }, 500);
  }
}
