// supabase/functions/create-parent-account/index.ts
//
// Crée un compte utilisateur (Supabase Auth + user_profiles) avec le rôle "parent",
// et le lie optionnellement à un élève. Appelée par ParentAssignModal.jsx via
// `supabase.functions.invoke('create-parent-account', { body: {...} })`.
//
// Pourquoi une Edge Function et pas un simple insert côté client :
// - Créer un utilisateur Supabase Auth (avec mot de passe) nécessite la clé de
//   service (service_role), qui ne doit JAMAIS être exposée dans le bundle front.
// - Seul un admin doit pouvoir créer des comptes parents : la vérification du rôle
//   de l'appelant se fait ici, côté serveur, avant toute opération privilégiée.
//
// Déploiement : `supabase functions deploy create-parent-account`
// Secrets nécessaires (déjà fournis automatiquement par la plateforme Supabase aux
// Edge Functions, rien à configurer manuellement) : SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Non authentifié" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client scopé à l'appelant (respecte le RLS) : sert uniquement à vérifier
    // qui appelle et avec quel rôle.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Non authentifié" }, 401);
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("user_profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profileError || callerProfile?.role !== "admin") {
      return json(
        { error: "Seul un administrateur peut créer un compte parent" },
        403,
      );
    }

    const { firstName, lastName, email, password, studentId } = await req
      .json();

    if (!firstName || !lastName || !email || !password) {
      return json({ error: "Champs obligatoires manquants" }, 400);
    }
    if (password.length < 6) {
      return json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        400,
      );
    }

    // Client privilégié (service_role) : bypasse le RLS, requis pour créer un
    // utilisateur Auth et pour forcer son rôle dans user_profiles.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: created, error: createError } = await adminClient.auth
      .admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });

    if (createError) {
      return json({ error: createError.message }, 400);
    }

    const newUserId = created.user.id;

    // Le trigger handle_new_user() vient de créer la ligne user_profiles avec le
    // rôle forcé à 'secretaire' (protection contre l'auto-inscription en admin).
    // On l'élève explicitement ici, en tant qu'opération admin privilégiée.
    const { error: updateError } = await adminClient
      .from("user_profiles")
      .update({ role: "parent", first_name: firstName, last_name: lastName })
      .eq("id", newUserId);

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    if (studentId) {
      const { error: linkError } = await adminClient
        .from("parent_students")
        .insert({ parent_id: newUserId, student_id: studentId });

      if (linkError) {
        return json({
          success: true,
          userId: newUserId,
          warning: `Compte créé mais liaison élève échouée : ${linkError.message}`,
        });
      }
    }

    return json({ success: true, userId: newUserId });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
