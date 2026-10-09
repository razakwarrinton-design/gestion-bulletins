// supabase/functions/generate-appreciation/index.ts
//
// Rédige l'appréciation d'un bulletin avec un service d'IA. Appelée par AIAppreciations.jsx via
// `supabase.functions.invoke('generate-appreciation', { body: { student, grades, subjects, trimester, classAverage } })`.
//
// La clé du service d'IA reste ici : elle ne doit jamais atteindre le navigateur. Seuls les enseignants et
// l'administration peuvent appeler la fonction, et seules les données utiles (prénom, notes par matière,
// moyenne de classe) sont transmises au service tiers : voir _shared/appreciation.ts.
//
// Déploiement : supabase functions deploy generate-appreciation
// Secrets (service compatible avec l'API « chat completions », au choix du client) :
//   supabase secrets set AI_API_KEY=... AI_MODEL=<identifiant du modèle> AI_BASE_URL=<ex. https://api.groq.com/openai/v1>
//   (SUPABASE_URL et SUPABASE_ANON_KEY sont fournis par la plateforme)

import { createClient } from "npm:@supabase/supabase-js@2";
import { handleRequest } from "../_shared/appreciation-handler.ts";

const callerClient = (authHeader: string) =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

Deno.serve((req) =>
  handleRequest(req, {
    env: (name) => Deno.env.get(name),
    fetch: (input, init) => fetch(input, init),
    getUserId: async (authHeader) => {
      const { data: { user }, error } = await callerClient(authHeader).auth.getUser();
      return error || !user ? null : user.id;
    },
    getRole: async (authHeader, userId) => {
      const { data } = await callerClient(authHeader).from("user_profiles").select("role").eq("id", userId).single();
      return data?.role ?? null;
    },
  })
);
