import { readFunctionError } from './functionError';

/**
 * Prévenir les parents d'une classe que les notes d'un trimestre sont disponibles, en deux temps indépendants :
 *  1. la fonction SQL notify_class_parents crée les notifications affichées dans l'application (aucun service externe) ;
 *  2. la fonction Edge notify-parents envoie les e-mails correspondants, au mieux : si elle n'est pas déployée ou pas
 *     configurée, les notifications de l'application restent envoyées et le résultat le dit.
 * Renvoie { inApp: { notified, already, students, studentsWithoutParent }, email: { status, sent, failed, noEmail, error } }
 * avec email.status = 'sent' | 'none' (rien à envoyer) | 'unavailable' (non configuré / non déployé) | 'failed'.
 * Lève une Error au message lisible si l'étape 1 échoue.
 */
export async function notifyParents(supabase, { classId, trimester }) {
  const { data, error } = await supabase.rpc('notify_class_parents', { p_class_id: classId, p_trimester: trimester });
  if (error) {
    if (['PGRST202', '42883'].includes(error.code) || /notify_class_parents/.test(error.message ?? '') && /not (find|exist)|does not exist/i.test(error.message ?? '')) {
      throw new Error("Les notifications ne sont pas encore installées : exécutez sql/notifications.sql dans l'éditeur SQL de Supabase.");
    }
    throw new Error(error.message || "Impossible de créer les notifications");
  }
  const inApp = {
    notified: Number(data?.notified ?? 0),
    already: Number(data?.already ?? 0),
    students: Number(data?.students ?? 0),
    studentsWithoutParent: Number(data?.studentsWithoutParent ?? 0),
  };

  let email;
  try {
    const { data: mailData, error: mailError } = await supabase.functions.invoke('notify-parents', { body: { classId, trimester } });
    if (mailError) {
      const message = await readFunctionError(mailError, "Envoi d'e-mails impossible", 'notify-parents');
      email = {
        status: /n'est pas configuré|n'est pas déployée|injoignable/.test(message) ? 'unavailable' : 'failed',
        sent: 0, failed: 0, noEmail: 0, error: message,
      };
    } else {
      const sent = Number(mailData?.sent ?? 0);
      const failed = Number(mailData?.failed ?? 0);
      email = {
        status: failed > 0 && sent === 0 ? 'failed' : sent > 0 ? 'sent' : 'none',
        sent, failed, noEmail: Number(mailData?.noEmail ?? 0), error: mailData?.error,
      };
    }
  } catch (err) {
    email = { status: 'failed', sent: 0, failed: 0, noEmail: 0, error: err?.message || "Envoi d'e-mails impossible" };
  }
  return { inApp, email };
}

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

/** Phrases affichables du résultat : { text, tone: 'ok' | 'warn' | 'error' }. */
export function describeOutcome({ inApp, email }) {
  const lines = [];
  if (inApp.notified > 0) {
    lines.push({ tone: 'ok', text: `${plural(inApp.notified, 'notification envoyée', 'notifications envoyées')} dans l'application.` });
  } else if (inApp.already > 0) {
    lines.push({ tone: 'ok', text: 'Les parents ont déjà été prévenus pour ce trimestre (dans les dernières 24 h).' });
  } else {
    lines.push({ tone: 'warn', text: "Aucun parent n'a de compte lié à un élève de cette classe : personne n'a été prévenu." });
  }
  if (email.status === 'sent') {
    lines.push({ tone: 'ok', text: `${plural(email.sent, 'e-mail envoyé', 'e-mails envoyés')}.${email.failed ? ` ${plural(email.failed, 'échec', 'échecs')}.` : ''}` });
  } else if (email.status === 'failed') {
    lines.push({ tone: 'error', text: `E-mails non envoyés : ${email.error ?? 'erreur inconnue'}` });
  } else if (email.status === 'unavailable') {
    lines.push({ tone: 'warn', text: "E-mails non envoyés : le service d'e-mail n'est pas configuré pour cet établissement." });
  }
  if (email.noEmail > 0) {
    lines.push({ tone: 'warn', text: `${plural(email.noEmail, 'parent sans adresse e-mail', 'parents sans adresse e-mail')}.` });
  }
  if (inApp.studentsWithoutParent > 0) {
    lines.push({
      tone: 'warn',
      text: `${plural(inApp.studentsWithoutParent, 'élève sans compte parent', 'élèves sans compte parent')} : ${inApp.studentsWithoutParent > 1 ? 'ils ne peuvent pas être prévenus' : 'il ne peut pas être prévenu'} (Gestion parents).`,
    });
  }
  return lines;
}
