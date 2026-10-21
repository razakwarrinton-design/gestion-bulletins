// Fichier GÉNÉRÉ par scripts/bundle-function.mjs à partir de supabase/functions/notify-parents/index.ts : ne pas le modifier ici.
// À coller dans Supabase → Edge Functions → notify-parents → Code.
import { createClient } from "npm:@supabase/supabase-js@2";

// ───── notify-email.ts (copié de supabase/functions/_shared) ─────
// Fonctions pures partagées par notify-parents (testées dans notify-email.test.ts).

/** Rôles autorisés à prévenir les parents (mêmes que la fonction SQL notify_class_parents). */
const NOTIFY_ALLOWED_ROLES = ["admin", "professeur"];

interface PendingNotification {
  id: number;
  user_id: string;
  student_id: number | null;
  trimester: string | null;
  body: string;
}

interface ParentEmail {
  userId: string;
  notificationIds: number[];
  firstNames: string[];
}

const TRIMESTER_LABELS: Record<string, string> = {
  "1": "1er trimestre",
  "2": "2e trimestre",
  "3": "3e trimestre",
};

function trimesterLabel(trimester: unknown): string | null {
  return typeof trimester === "string" && trimester in TRIMESTER_LABELS ? TRIMESTER_LABELS[trimester] : null;
}

/** Identifiant de classe numérique strictement positif, ou null. */
function parseClassId(raw: unknown): number | null {
  const n = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw;
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Une adresse e-mail plausible (la validation réelle est celle du fournisseur). */
function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

/** Retire retours à la ligne et chevrons d'un texte saisi par l'école avant de l'insérer dans un e-mail. */
function cleanText(value: unknown, max = 100): string {
  return String(value ?? "").replace(/[\r\n\t<>]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Regroupe les notifications en un e-mail par parent (un parent de deux enfants de la classe reçoit un seul message).
 * `firstNames` : prénom de chaque élève, par identifiant d'élève.
 */
function groupByParent(
  pending: PendingNotification[],
  firstNames: Map<number, string>,
): ParentEmail[] {
  const byParent = new Map<string, ParentEmail>();
  for (const item of pending) {
    const entry = byParent.get(item.user_id) ?? { userId: item.user_id, notificationIds: [], firstNames: [] };
    entry.notificationIds.push(item.id);
    const name = item.student_id != null ? cleanText(firstNames.get(item.student_id), 60) : "";
    if (name && !entry.firstNames.includes(name)) entry.firstNames.push(name);
    byParent.set(item.user_id, entry);
  }
  return [...byParent.values()];
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "votre enfant";
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

/**
 * Texte brut (pas de HTML : rien à échapper). Ni note ni moyenne : le parent se connecte pour les consulter.
 * `appUrl` vient d'un secret du serveur, jamais de la requête.
 */
function buildParentEmail(
  { schoolName, trimester, firstNames, appUrl }: {
    schoolName: string;
    trimester: string;
    firstNames: string[];
    appUrl?: string | null;
  },
): { subject: string; text: string } {
  const school = cleanText(schoolName, 80) || "l'école";
  const label = trimesterLabel(trimester) ?? "trimestre";
  const names = joinNames(firstNames.map((n) => cleanText(n, 60)).filter(Boolean));
  const subject = `${school} : notes du ${label} disponibles`;
  const lines = [
    "Bonjour,",
    "",
    `Les notes du ${label} de ${names} sont disponibles sur l'espace parents de ${school}.`,
    "",
  ];
  if (appUrl) lines.push(`Connectez-vous pour les consulter : ${appUrl}`, "");
  lines.push("Cordialement,", school);
  return { subject, text: lines.join("\n") };
}

interface MailResult {
  success: boolean;
  error?: string;
}

/** Interprète la réponse de l'API transactionnelle de Brevo : 201 avec un messageId = accepté. */
function parseBrevoResponse(status: number, body: unknown): MailResult {
  const b = body as { messageId?: string; message?: string; code?: string } | null;
  if (status >= 200 && status < 300 && b?.messageId) return { success: true };
  const detail = typeof b?.message === "string" ? cleanText(b.message, 160) : "";
  if (status === 401) return { success: false, error: "Clé API e-mail refusée (BREVO_API_KEY)" };
  return { success: false, error: detail || `Refusé par le service d'e-mail (HTTP ${status})` };
}


// supabase/functions/notify-parents/index.ts
//
// Envoie par e-mail aux parents d'une classe l'annonce « les notes du trimestre sont disponibles ».
// Appelée par l'écran de saisie des notes (GradesForm) APRÈS la fonction SQL notify_class_parents, qui crée les
// notifications affichées dans l'application. Cette fonction ne fait que l'e-mail : elle envoie un message pour chaque
// notification pas encore envoyée (colonne emailed_at vide) et la marque ensuite — un second clic n'envoie donc rien de plus.
//
// Ce que l'appelant NE choisit PAS : les destinataires (parents liés aux élèves de la classe, lus dans la base), le texte
// du message (modèle ci-dessous), le lien (secret APP_URL), le nom de l'école (réglages de l'école). Sans cela, la
// fonction serait un relais d'e-mails ouvert à tout compte connecté. Aucune note ni moyenne n'est envoyée.
//
// Déploiement : supabase functions deploy notify-parents
// Secrets : supabase secrets set BREVO_API_KEY=xkeysib-... MAIL_FROM_EMAIL=ecole@votre-domaine.tg \
//             [MAIL_FROM_NAME="Collège …"] [APP_URL=https://votre-application]
//   (SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis par la plateforme)
//   MAIL_FROM_EMAIL doit être un expéditeur validé dans le compte Brevo (voir docs/NOUVEAU-CLIENT.md).
//   Sans BREVO_API_KEY / MAIL_FROM_EMAIL, la fonction répond 503 « non configuré » et les notifications de l'application
//   fonctionnent quand même.


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

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const MAX_PARENTS_PER_CALL = 200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié" }, 401);

    const apiKey = Deno.env.get("BREVO_API_KEY");
    const fromEmail = Deno.env.get("MAIL_FROM_EMAIL");
    if (!apiKey || !isEmail(fromEmail)) {
      return json({ error: "L'envoi d'e-mails n'est pas configuré (BREVO_API_KEY, MAIL_FROM_EMAIL)", notConfigured: true }, 503);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) return json({ error: "Non authentifié" }, 401);

    const { data: profile } = await callerClient.from("user_profiles").select("role").eq("id", user.id).single();
    if (!profile || !NOTIFY_ALLOWED_ROLES.includes(profile.role)) {
      return json({ error: "Action non autorisée pour votre rôle" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const classId = parseClassId(body.classId);
    const trimester = trimesterLabel(body.trimester) ? String(body.trimester) : null;
    if (!classId || !trimester) return json({ error: "Classe ou trimestre invalide" }, 400);

    // Lectures privilégiées (les e-mails des parents ne sont pas lisibles par le professeur)
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: students, error: studentsError } = await admin
      .from("students").select("id, first_name").eq("class_id", classId);
    if (studentsError) throw studentsError;
    const firstNames = new Map<number, string>((students ?? []).map((s) => [Number(s.id), String(s.first_name ?? "")]));
    if (firstNames.size === 0) return json({ sent: 0, failed: 0, pending: 0, noEmail: 0 });

    const { data: pending, error: pendingError } = await admin
      .from("notifications")
      .select("id, user_id, student_id, trimester, body")
      .eq("kind", "grades_available").eq("trimester", trimester)
      .in("student_id", [...firstNames.keys()])
      .is("emailed_at", null)
      .gt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    if (pendingError) throw pendingError;

    const mails = groupByParent(pending ?? [], firstNames).slice(0, MAX_PARENTS_PER_CALL);
    if (mails.length === 0) return json({ sent: 0, failed: 0, pending: 0, noEmail: 0 });

    const { data: profiles, error: profilesError } = await admin
      .from("user_profiles").select("id, email").in("id", mails.map((m) => m.userId));
    if (profilesError) throw profilesError;
    const emails = new Map<string, string>((profiles ?? []).map((p) => [String(p.id), String(p.email ?? "")]));

    const { data: info } = await admin.from("app_data").select("value").eq("key", "schoolInfo").maybeSingle();
    const schoolName = cleanText(info?.value?.name, 80) || "École";
    const fromName = cleanText(Deno.env.get("MAIL_FROM_NAME"), 80) || schoolName;
    const appUrl = Deno.env.get("APP_URL") || null;

    let sent = 0;
    let failed = 0;
    let noEmail = 0;
    let firstError: string | undefined;
    for (const mail of mails) {
      const to = emails.get(mail.userId);
      if (!isEmail(to)) { noEmail += 1; continue; }
      const { subject, text } = buildParentEmail({ schoolName, trimester, firstNames: mail.firstNames, appUrl });
      const response = await fetch(BREVO_URL, {
        method: "POST",
        headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ sender: { name: fromName, email: fromEmail }, to: [{ email: to }], subject, textContent: text }),
      });
      let payload: unknown = null;
      try { payload = await response.json(); } catch { /* réponse non JSON : traitée comme un refus */ }
      const result = parseBrevoResponse(response.status, payload);
      if (result.success) {
        sent += 1;
        const { error: markError } = await admin
          .from("notifications").update({ emailed_at: new Date().toISOString() }).in("id", mail.notificationIds);
        if (markError) console.error("notify-parents : marquage emailed_at échoué", markError.message);
      } else {
        failed += 1;
        firstError ??= result.error;
        console.error("notify-parents : refusé par le fournisseur", response.status, result.error);
        if (response.status === 401) break; // clé invalide : inutile d'insister pour chaque parent
      }
    }

    return json({ sent, failed, noEmail, pending: mails.length, error: sent === 0 && failed > 0 ? firstError : undefined });
  } catch (err) {
    console.error("notify-parents : erreur inattendue", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
