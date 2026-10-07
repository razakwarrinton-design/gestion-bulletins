// Fonctions pures partagées par send-sms (testées dans sms.test.ts).

/** Rôles autorisés à envoyer des SMS : un parent ne doit pas pouvoir faire payer des SMS à l'école. */
export const SMS_ALLOWED_ROLES = ["admin", "secretaire"];

/** 3 SMS concaténés de 153 caractères. */
export const MAX_SMS_LENGTH = 459;

/**
 * Numéro au format international "+22890123456", ou null.
 * Le pays doit être indiqué (+ ou 00) : on ne devine pas l'indicatif.
 */
export function normalizeRecipient(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (!/^\+\d{8,15}$/.test(digits)) return null;
  return digits;
}

/** Message nettoyé, ou null s'il est vide ou trop long. */
export function validateMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const message = raw.trim();
  if (message.length === 0 || message.length > MAX_SMS_LENGTH) return null;
  return message;
}

export interface SmsResult {
  success: boolean;
  reference?: string;
  error?: string;
}

/**
 * Interprète la réponse JSON d'Africa's Talking. Le code 100 (traité), 101 (envoyé) ou 102 (en file)
 * signifie que l'opérateur a accepté le message ; tout autre code est un refus.
 */
export function parseAfricasTalkingResponse(body: unknown): SmsResult {
  const recipients = (body as { SMSMessageData?: { Recipients?: unknown[] } })
    ?.SMSMessageData?.Recipients;
  if (!Array.isArray(recipients) || recipients.length === 0) {
    const message = (body as { SMSMessageData?: { Message?: string } })?.SMSMessageData?.Message;
    return { success: false, error: message || "Réponse inattendue du fournisseur SMS" };
  }
  const first = recipients[0] as { statusCode?: number; status?: string; messageId?: string };
  if (first.statusCode !== undefined && [100, 101, 102].includes(Number(first.statusCode))) {
    return { success: true, reference: first.messageId };
  }
  return { success: false, error: first.status || "SMS refusé par le fournisseur" };
}
