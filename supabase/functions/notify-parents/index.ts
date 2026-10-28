// supabase/functions/notify-parents/index.ts
//
// Envoie par e-mail aux parents deux sortes d'avis :
//   • { classId, trimester } : « les notes du trimestre sont disponibles » (écran de saisie des notes) ;
//   • { announcementId }     : « une nouvelle information de l'école est publiée » (écran Actualités).
// Appelée APRÈS les fonctions SQL notify_class_parents / notify_announcement, qui créent les notifications affichées dans
// l'application. Cette fonction ne fait que l'e-mail : elle envoie un message pour chaque notification pas encore envoyée
// (colonne emailed_at vide) et la marque ensuite — un second clic n'envoie donc rien de plus.
//
// Ce que l'appelant NE choisit PAS : les destinataires (parents liés aux élèves, lus dans la base), le texte du message
// (modèles ci-dessous), le lien (secret APP_URL), le nom de l'école (réglages de l'école). Sans cela, la fonction serait un
// relais d'e-mails ouvert à tout compte connecté. Aucune note ni moyenne n'est envoyée ; une actualité n'est annoncée que par
// son titre (et son montant / sa date limite pour les frais).
//
// Déploiement : supabase functions deploy notify-parents
// Secrets : supabase secrets set BREVO_API_KEY=xkeysib-... MAIL_FROM_EMAIL=ecole@votre-domaine.tg \
//             [MAIL_FROM_NAME="Collège …"] [APP_URL=https://votre-application]
//   (SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis par la plateforme)
//   MAIL_FROM_EMAIL doit être un expéditeur validé dans le compte Brevo (voir docs/NOUVEAU-CLIENT.md).
//   Sans BREVO_API_KEY / MAIL_FROM_EMAIL, la fonction répond 503 « non configuré » et les notifications de l'application
//   fonctionnent quand même.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  ANNOUNCE_ALLOWED_ROLES,
  buildAnnouncementEmail,
  buildParentEmail,
  cleanText,
  groupByParent,
  isEmail,
  NOTIFY_ALLOWED_ROLES,
  parseBrevoResponse,
  parseClassId,
  trimesterLabel,
} from "../_shared/notify-email.ts";

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
const PARALLEL_SENDS = 5; // une école entière = des centaines d'envois : par petits groupes pour tenir dans le délai de la fonction
const NOTHING = { sent: 0, failed: 0, pending: 0, noEmail: 0 };

interface Mail { userId: string; notificationIds: number[]; firstNames: string[] }

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
    if (!profile) return json({ error: "Action non autorisée pour votre rôle" }, 403);

    const body = await req.json().catch(() => ({}));
    const announcementId = body.announcementId != null ? parseClassId(body.announcementId) : null;
    if (body.announcementId != null && !announcementId) return json({ error: "Information invalide" }, 400);

    // Lectures privilégiées (les e-mails des parents ne sont pas lisibles par le personnel)
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Ce qui diffère entre les deux avis : qui est prévenu, et le message
    let mails: Mail[];
    let build: (mail: Mail) => { subject: string; text: string };
    const { data: info } = await admin.from("app_data").select("value").eq("key", "schoolInfo").maybeSingle();
    const schoolName = cleanText(info?.value?.name, 80) || "École";
    const fromName = cleanText(Deno.env.get("MAIL_FROM_NAME"), 80) || schoolName;
    const appUrl = Deno.env.get("APP_URL") || null;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    if (announcementId) {
      if (!ANNOUNCE_ALLOWED_ROLES.includes(profile.role)) return json({ error: "Action non autorisée pour votre rôle" }, 403);
      const { data: announcement, error: announcementError } = await admin
        .from("announcements").select("id, title, category, amount_fcfa, deadline, author_id").eq("id", announcementId).maybeSingle();
      if (announcementError) throw announcementError;
      if (!announcement) return json({ error: "Information introuvable" }, 404);
      // comme notify_announcement : l'administrateur ou l'auteur de la publication
      if (profile.role !== "admin" && announcement.author_id !== user.id) {
        return json({ error: "Réservé à l'auteur de la publication et aux administrateurs" }, 403);
      }

      const { data: pending, error: pendingError } = await admin
        .from("notifications")
        .select("id, user_id, student_id, trimester, body")
        .eq("kind", "announcement").eq("announcement_id", announcementId)
        .is("emailed_at", null).gt("created_at", since);
      if (pendingError) throw pendingError;
      mails = groupByParent(pending ?? [], new Map());
      const content = buildAnnouncementEmail({
        schoolName, title: announcement.title, category: announcement.category,
        amountFcfa: announcement.amount_fcfa, deadline: announcement.deadline, appUrl,
      });
      build = () => content;
    } else {
      if (!NOTIFY_ALLOWED_ROLES.includes(profile.role)) return json({ error: "Action non autorisée pour votre rôle" }, 403);
      const classId = parseClassId(body.classId);
      const trimester = trimesterLabel(body.trimester) ? String(body.trimester) : null;
      if (!classId || !trimester) return json({ error: "Classe ou trimestre invalide" }, 400);

      const { data: students, error: studentsError } = await admin
        .from("students").select("id, first_name").eq("class_id", classId);
      if (studentsError) throw studentsError;
      const firstNames = new Map<number, string>((students ?? []).map((s) => [Number(s.id), String(s.first_name ?? "")]));
      if (firstNames.size === 0) return json(NOTHING);

      const { data: pending, error: pendingError } = await admin
        .from("notifications")
        .select("id, user_id, student_id, trimester, body")
        .eq("kind", "grades_available").eq("trimester", trimester)
        .in("student_id", [...firstNames.keys()])
        .is("emailed_at", null).gt("created_at", since);
      if (pendingError) throw pendingError;
      mails = groupByParent(pending ?? [], firstNames);
      build = (mail) => buildParentEmail({ schoolName, trimester, firstNames: mail.firstNames, appUrl });
    }

    mails = mails.slice(0, MAX_PARENTS_PER_CALL);
    if (mails.length === 0) return json(NOTHING);

    const { data: profiles, error: profilesError } = await admin
      .from("user_profiles").select("id, email").in("id", mails.map((m) => m.userId));
    if (profilesError) throw profilesError;
    const emails = new Map<string, string>((profiles ?? []).map((p) => [String(p.id), String(p.email ?? "")]));

    let sent = 0;
    let failed = 0;
    let noEmail = 0;
    let firstError: string | undefined;
    let keyRefused = false;

    const deliver = async (mail: Mail) => {
      const to = emails.get(mail.userId);
      if (!isEmail(to)) { noEmail += 1; return; }
      const { subject, text } = build(mail);
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
        if (response.status === 401) keyRefused = true;
      }
    };

    for (let i = 0; i < mails.length && !keyRefused; i += PARALLEL_SENDS) {
      // clé invalide : inutile d'insister pour chaque parent, on s'arrête après le groupe en cours
      await Promise.all(mails.slice(i, i + PARALLEL_SENDS).map(deliver));
    }

    return json({ sent, failed, noEmail, pending: mails.length, error: sent === 0 && failed > 0 ? firstError : undefined });
  } catch (err) {
    console.error("notify-parents : erreur inattendue", err);
    return json({ error: "Erreur interne" }, 500);
  }
});
