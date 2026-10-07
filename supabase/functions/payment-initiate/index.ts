// supabase/functions/payment-initiate/index.ts
//
// Initie un paiement Mobile Money via FedaPay pour un élève et renvoie le lien de
// paiement hébergé. Appelée par PaymentService.js via
// `supabase.functions.invoke('payment-initiate', { body: {...} })`.
//
// Pourquoi une Edge Function : la clé secrète FedaPay ne doit jamais atteindre le
// navigateur, et le statut du paiement ne doit pouvoir être modifié que par le
// serveur (ici à la création, puis par payment-webhook à la confirmation).
//
// Déploiement : supabase functions deploy payment-initiate
// Secrets : supabase secrets set FEDAPAY_SECRET_KEY=... FEDAPAY_ENV=sandbox APP_URL=https://...
//   (SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis par la plateforme)

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createFedapayClient,
  type FedapayEnv,
  splitPhoneNumber,
} from "../_shared/fedapay.ts";

const MAX_AMOUNT_XOF = 10_000_000;
const ALLOWED_ROLES = ["admin", "secretaire", "parent"];

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
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fedapayKey = Deno.env.get("FEDAPAY_SECRET_KEY");
    const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "");
    const env = (Deno.env.get("FEDAPAY_ENV") ?? "sandbox") as FedapayEnv;

    if (!fedapayKey || !appUrl) {
      console.error("payment-initiate : FEDAPAY_SECRET_KEY ou APP_URL non configuré");
      return json({ error: "Les paiements en ligne ne sont pas configurés" }, 503);
    }

    // Identité de l'appelant (client scopé : respecte le RLS)
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth
      .getUser();
    if (callerError || !caller) return json({ error: "Non authentifié" }, 401);

    const { data: profile } = await callerClient
      .from("user_profiles")
      .select("role, first_name, last_name")
      .eq("id", caller.id)
      .single();
    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return json({ error: "Action non autorisée pour votre rôle" }, 403);
    }

    // ── Validation de la demande ───────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const studentId = body.studentId;
    const feeTypeId = body.feeTypeId ?? null;
    const amount = Number(body.amount);
    const description = String(body.description ?? "Frais de scolarité").slice(0, 200);

    if (studentId === undefined || studentId === null || studentId === "") {
      return json({ error: "Élève manquant" }, 400);
    }
    if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT_XOF) {
      return json({
        error: `Le montant doit être un entier en FCFA, entre 1 et ${MAX_AMOUNT_XOF}`,
      }, 400);
    }
    const phone = splitPhoneNumber(String(body.phoneNumber ?? ""));
    if (!phone) {
      return json({
        error:
          "Numéro invalide : indiquez-le avec l'indicatif du pays (ex. +228 90 12 34 56, +229, +225 ou +221)",
      }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Un parent ne peut payer que pour ses propres enfants
    if (profile.role === "parent") {
      const { data: link } = await adminClient
        .from("parent_students")
        .select("student_id")
        .eq("parent_id", caller.id)
        .eq("student_id", studentId)
        .maybeSingle();
      if (!link) return json({ error: "Cet élève n'est pas lié à votre compte" }, 403);
    }

    const { data: student } = await adminClient
      .from("students")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();
    if (!student) return json({ error: "Élève introuvable" }, 404);

    const payerName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      null;

    // ── Enregistrement (statut "pending", jamais "completed" ici) ───────────
    const { data: payment, error: insertError } = await adminClient
      .from("payments")
      .insert({
        student_id: studentId,
        fee_type_id: feeTypeId,
        amount_paid: amount,
        status: "pending",
        provider: "fedapay",
        currency: "XOF",
        payer_name: payerName,
        payer_phone: String(body.phoneNumber).trim(),
      })
      .select("id")
      .single();
    if (insertError || !payment) {
      console.error("payment-initiate : insertion impossible", insertError);
      return json({ error: "Impossible d'enregistrer le paiement" }, 500);
    }

    // ── Création de la collecte chez FedaPay ────────────────────────────────
    const fedapay = createFedapayClient({ secretKey: fedapayKey, env });
    try {
      const [firstname, ...rest] = (payerName ?? "Parent").split(" ");
      const collect = await fedapay.createCollect({
        description,
        amount,
        callbackUrl: `${appUrl}/?payment=${payment.id}`,
        merchantReference: payment.id,
        customer: { firstname, lastname: rest.join(" ") || firstname, phone },
        metadata: { payment_id: payment.id, student_id: String(studentId) },
      });

      await adminClient
        .from("payments")
        .update({
          external_id: collect.externalId,
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      return json({
        success: true,
        paymentId: payment.id,
        reference: collect.reference ?? `PAY-${String(payment.id).slice(0, 8)}`,
        paymentUrl: collect.paymentUrl,
      });
    } catch (err) {
      console.error("payment-initiate : échec FedaPay", err);
      await adminClient
        .from("payments")
        .update({
          status: "failed",
          failure_reason: err instanceof Error ? err.message.slice(0, 300) : "Erreur FedaPay",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      return json({ error: "Le service de paiement est momentanément indisponible" }, 502);
    }
  } catch (err) {
    console.error("payment-initiate : erreur inattendue", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
