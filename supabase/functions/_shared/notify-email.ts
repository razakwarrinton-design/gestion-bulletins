// Fonctions pures partagées par notify-parents (testées dans notify-email.test.ts).

/** Rôles autorisés à prévenir les parents (mêmes que la fonction SQL notify_class_parents). */
export const NOTIFY_ALLOWED_ROLES = ["admin", "professeur"];

/** Rôles qui peuvent publier une actualité (mêmes que la fonction SQL notify_announcement) ; l'auteur ou l'admin seulement. */
export const ANNOUNCE_ALLOWED_ROLES = ["admin", "professeur", "secretaire"];

export interface PendingNotification {
  id: number;
  user_id: string;
  student_id: number | null;
  trimester: string | null;
  body: string;
}

export interface ParentEmail {
  userId: string;
  notificationIds: number[];
  firstNames: string[];
}

const TRIMESTER_LABELS: Record<string, string> = {
  "1": "1er trimestre",
  "2": "2e trimestre",
  "3": "3e trimestre",
};

export function trimesterLabel(trimester: unknown): string | null {
  return typeof trimester === "string" && trimester in TRIMESTER_LABELS ? TRIMESTER_LABELS[trimester] : null;
}

/** Identifiant de classe numérique strictement positif, ou null. */
export function parseClassId(raw: unknown): number | null {
  const n = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw;
  return typeof n === "number" && Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Une adresse e-mail plausible (la validation réelle est celle du fournisseur). */
export function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

/** Retire retours à la ligne et chevrons d'un texte saisi par l'école avant de l'insérer dans un e-mail. */
export function cleanText(value: unknown, max = 100): string {
  return String(value ?? "").replace(/[\r\n\t<>]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * Regroupe les notifications en un e-mail par parent (un parent de deux enfants de la classe reçoit un seul message).
 * `firstNames` : prénom de chaque élève, par identifiant d'élève.
 */
export function groupByParent(
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
export function buildParentEmail(
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

const CATEGORY_PREFIXES: Record<string, string> = {
  frais: "Frais : ",
  reglement: "Règlement : ",
};

/** « 2 000 FCFA » (espaces ordinaires : un e-mail en texte brut ne gère pas toujours les espaces insécables fines). */
export function formatAmount(amount: unknown): string {
  if (amount == null || amount === "") return "";
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return "";
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

/** « 2026-11-15 » → « 15/11/2026 » ; autre chose → chaîne vide. */
export function formatDeadline(date: unknown): string {
  const m = typeof date === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(date) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/**
 * Annonce d'une actualité : titre, montant et date limite éventuels, puis renvoi vers l'espace parents pour le détail.
 * Le texte complet n'est pas copié dans l'e-mail (il reste dans l'application). Texte brut, entrées nettoyées.
 */
export function buildAnnouncementEmail(
  { schoolName, title, category, amountFcfa, deadline, appUrl }: {
    schoolName: string;
    title: string;
    category: string;
    amountFcfa?: number | null;
    deadline?: string | null;
    appUrl?: string | null;
  },
): { subject: string; text: string } {
  const school = cleanText(schoolName, 80) || "l'école";
  const heading = cleanText(title, 150) || "Nouvelle information";
  const subject = `${school} : ${CATEGORY_PREFIXES[category] ?? "Info de l'école : "}${heading}`;
  const details: string[] = [];
  const amount = formatAmount(amountFcfa);
  if (category === "frais" && amount) details.push(`Montant : ${amount}`);
  const limit = formatDeadline(deadline);
  if (category === "frais" && limit) details.push(`À régler avant le ${limit}`);
  const lines = [
    "Bonjour,",
    "",
    `${school} vient de publier une information pour les parents : « ${heading} ».`,
  ];
  if (details.length) lines.push(details.join(" — "));
  lines.push("");
  if (appUrl) lines.push(`Lisez le détail dans l'espace parents : ${appUrl}`, "");
  else lines.push("Le détail est disponible dans l'espace parents de l'application.", "");
  lines.push("Cordialement,", school);
  return { subject, text: lines.join("\n") };
}

export interface MailResult {
  success: boolean;
  error?: string;
}

/** Interprète la réponse de l'API transactionnelle de Brevo : 201 avec un messageId = accepté. */
export function parseBrevoResponse(status: number, body: unknown): MailResult {
  const b = body as { messageId?: string; message?: string; code?: string } | null;
  if (status >= 200 && status < 300 && b?.messageId) return { success: true };
  const detail = typeof b?.message === "string" ? cleanText(b.message, 160) : "";
  // 401 : clé invalide, mais aussi adresse IP non autorisée dans le compte Brevo ; le motif de Brevo est repris tel quel
  if (status === 401) {
    return { success: false, error: `Clé API e-mail refusée (BREVO_API_KEY)${detail ? ` : ${detail}` : ""}` };
  }
  return { success: false, error: detail || `Refusé par le service d'e-mail (HTTP ${status})` };
}
