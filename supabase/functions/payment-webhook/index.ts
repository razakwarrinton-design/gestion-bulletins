// supabase/functions/payment-webhook/index.ts
//
// Reçoit les notifications FedaPay (transaction.approved, transaction.declined,
// transaction.canceled…) et met à jour la table payments.
//
// Sécurité, en deux temps :
//   1. la signature X-FEDAPAY-SIGNATURE du corps brut est vérifiée avec le secret du
//      webhook ;
//   2. le statut n'est PAS lu dans le corps reçu : la transaction est relue chez
//      FedaPay avec la clé secrète (source de vérité), et le montant est contrôlé.
//
// Déploiement (cette fonction est appelée par FedaPay, sans jeton Supabase) :
//   supabase functions deploy payment-webhook --no-verify-jwt
// Secrets : FEDAPAY_SECRET_KEY, FEDAPAY_ENV, FEDAPAY_WEBHOOK_SECRET
// URL à enregistrer dans le tableau de bord FedaPay :
//   https://<projet>.supabase.co/functions/v1/payment-webhook

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createFedapayClient,
  type FedapayEnv,
  mapFedapayStatus,
  verifyWebhookSignature,
} from "../_shared/fedapay.ts";

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return respond({ error: "Méthode non autorisée" }, 405);

  const webhookSecret = Deno.env.get("FEDAPAY_WEBHOOK_SECRET");
  const fedapayKey = Deno.env.get("FEDAPAY_SECRET_KEY");
  if (!webhookSecret || !fedapayKey) {
    console.error("payment-webhook : secrets FedaPay non configurés");
    return respond({ error: "Non configuré" }, 503);
  }

  // Le corps BRUT est nécessaire : la signature porte sur les octets reçus.
  const rawBody = await req.text();
  const valid = await verifyWebhookSignature(
    rawBody,
    req.headers.get("x-fedapay-signature"),
    webhookSecret,
  );
  if (!valid) {
    console.warn("payment-webhook : signature invalide");
    return respond({ error: "Signature invalide" }, 401);
  }

  try {
    const event = JSON.parse(rawBody);
    const eventName = String(event?.name ?? "");
    if (!eventName.startsWith("transaction.")) {
      return respond({ received: true, ignored: eventName || "inconnu" });
    }

    const entity = event.entity ?? event.data?.object ?? event.object_data;
    const externalId = entity?.id;
    if (externalId === undefined || externalId === null) {
      return respond({ received: true, ignored: "transaction sans identifiant" });
    }

    // Source de vérité : relire la transaction chez FedaPay
    const fedapay = createFedapayClient({
      secretKey: fedapayKey,
      env: (Deno.env.get("FEDAPAY_ENV") ?? "sandbox") as FedapayEnv,
    });
    const transaction = await fedapay.getTransaction(externalId);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment, error: findError } = await adminClient
      .from("payments")
      .select("id, status, amount_paid")
      .eq("provider", "fedapay")
      .eq("external_id", transaction.externalId)
      .maybeSingle();
    if (findError) throw findError;
    if (!payment) {
      // Transaction qui ne vient pas de cette application : on acquitte sans rien écrire.
      return respond({ received: true, ignored: "paiement inconnu" });
    }

    // Idempotence : un paiement terminé ne repasse jamais en arrière (rejeu, ordre inversé)
    if (payment.status === "completed") {
      return respond({ received: true, unchanged: true });
    }

    let newStatus = mapFedapayStatus(transaction.status);
    let failureReason: string | null = null;

    if (newStatus === "completed" && Number(payment.amount_paid) !== transaction.amount) {
      // Ne jamais valider un paiement dont le montant ne correspond pas à la demande
      newStatus = "failed";
      failureReason =
        `Montant incohérent (attendu ${payment.amount_paid}, reçu ${transaction.amount})`;
      console.error("payment-webhook :", failureReason, "paiement", payment.id);
    } else if (newStatus === "failed") {
      failureReason = transaction.lastErrorCode ?? `Paiement ${transaction.status}`;
    }

    const { error: updateError } = await adminClient
      .from("payments")
      .update({
        status: newStatus,
        failure_reason: failureReason,
        paid_at: newStatus === "completed"
          ? (transaction.approvedAt ?? new Date().toISOString())
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    if (updateError) throw updateError;

    return respond({ received: true, status: newStatus });
  } catch (err) {
    // 500 : FedaPay rejouera la notification plus tard
    console.error("payment-webhook : erreur de traitement", err);
    return respond({ error: "Erreur de traitement" }, 500);
  }
});
