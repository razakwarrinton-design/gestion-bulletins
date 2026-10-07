// supabase/functions/send-sms/index.ts
//
// Envoie un SMS via Africa's Talking. Appelée par SMSService.js via
// `supabase.functions.invoke('send-sms', { body: { to, message } })`.
//
// Pourquoi une Edge Function : la clé API Africa's Talking ne doit jamais atteindre le navigateur
// (avant, le service client lisait une variable d'environnement inaccessible et simulait l'envoi),
// et seul le personnel autorisé peut déclencher des SMS facturés à l'école.
//
// Déploiement : supabase functions deploy send-sms
// Secrets : supabase secrets set AT_USERNAME=... AT_API_KEY=... AT_ENV=sandbox|production [AT_SENDER_ID=...]
//   (SUPABASE_URL et SUPABASE_ANON_KEY sont fournis par la plateforme)
//   Avec AT_ENV=sandbox le nom d'utilisateur doit être « sandbox » et aucun SMS réel n'est remis.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  normalizeRecipient,
  parseAfricasTalkingResponse,
  SMS_ALLOWED_ROLES,
  validateMessage,
} from "../_shared/sms.ts";

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

const ENDPOINTS: Record<string, string> = {
  sandbox: "https://api.sandbox.africastalking.com/version1/messaging",
  production: "https://api.africastalking.com/version1/messaging",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    const username = Deno.env.get("AT_USERNAME");
    const apiKey = Deno.env.get("AT_API_KEY");
    const env = Deno.env.get("AT_ENV") === "production" ? "production" : "sandbox";
    if (!username || !apiKey) {
      console.error("send-sms : AT_USERNAME ou AT_API_KEY non configuré");
      return json({ error: "L'envoi de SMS n'est pas configuré" }, 503);
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "Non authentifié" }, 401);

    const { data: profile } = await callerClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !SMS_ALLOWED_ROLES.includes(profile.role)) {
      return json({ error: "Action non autorisée pour votre rôle" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const to = normalizeRecipient(body.to);
    const message = validateMessage(body.message);
    if (!to) {
      return json({ error: "Numéro invalide : indiquez-le avec l'indicatif du pays (ex. +228 90 12 34 56)" }, 400);
    }
    if (!message) return json({ error: "Message vide ou trop long (459 caractères maximum)" }, 400);

    const form = new URLSearchParams({ username, to, message });
    const senderId = Deno.env.get("AT_SENDER_ID");
    if (senderId) form.set("from", senderId);

    const response = await fetch(ENDPOINTS[env], {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey,
      },
      body: form,
    });

    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = JSON.parse(text);
    } catch {
      // réponse non JSON (ex. clé invalide) : journalisée sans le message ni le numéro
      console.error("send-sms : réponse non JSON du fournisseur", response.status);
    }

    const result = parseAfricasTalkingResponse(payload);
    if (!result.success) {
      console.error("send-sms : refusé par le fournisseur", response.status, result.error);
      return json({ error: result.error ?? "SMS refusé par le fournisseur" }, 502);
    }
    return json({ success: true, reference: result.reference, sandbox: env === "sandbox" });
  } catch (err) {
    console.error("send-sms : erreur inattendue", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
