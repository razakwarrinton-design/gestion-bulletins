// src/services/SMSService.js
/**
 * Service SMS
 *
 * Les SMS partent par l'Edge Function `send-sms` (Africa's Talking), qui garde la clé API côté
 * serveur et réserve l'envoi à l'administrateur et au secrétariat. Avant, ce service simulait
 * l'envoi en permanence et répondait « envoyé » sans qu'aucun SMS ne parte.
 * Déploiement et secrets : voir supabase/functions/send-sms/index.ts.
 */
import { supabase } from "../config/supabase";
import { readFunctionError } from "../utils/functionError";

export class SMSService {
  constructor() {
    // Historique de la session en cours (non persisté)
    this.smsHistory = [];
  }

  /**
   * Envoyer un SMS.
   * @returns {Promise<{success: boolean, reference?: string, error?: string, sandbox?: boolean}>}
   *   `success` n'est vrai que si le fournisseur a accepté le message.
   */
  async sendSMS(phoneNumber, message) {
    if (!phoneNumber || !String(phoneNumber).trim()) {
      return { success: false, error: "Numéro de téléphone manquant" };
    }
    if (!message || !message.trim()) {
      return { success: false, error: "Message vide" };
    }

    const to = this.formatPhoneNumber(phoneNumber);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { to, message },
      });
      if (error) throw new Error(await readFunctionError(error, "Envoi du SMS impossible"));
      if (!data?.success) throw new Error(data?.error || "Réponse inattendue du service SMS");

      this.logSMS(to, message, "sent");
      return {
        success: true,
        reference: data.reference,
        sandbox: Boolean(data.sandbox),
        message: data.sandbox ? "SMS accepté (mode test : aucun SMS réel remis)" : "SMS envoyé avec succès",
      };
    } catch (error) {
      this.logSMS(to, message, "failed", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Logger l'historique des SMS (en mémoire)
   */
  logSMS(phoneNumber, message, status, error = null) {
    const smsRecord = {
      id: `sms-${Date.now()}-${this.smsHistory.length}`,
      phoneNumber,
      message,
      status, // 'sent', 'failed', 'pending'
      timestamp: new Date().toISOString(),
      error,
    };

    this.smsHistory.push(smsRecord);
    return smsRecord;
  }

  /**
   * Modèles de SMS prédéfinis
   */

  // SMS paiement créé
  paymentCreatedSMS(parentName, amount, reference) {
    return `Bonjour ${parentName}, vous avez initié un paiement de ${amount} F CFA pour EduPulse. Référence: ${reference}. Confirmez via l'application.`;
  }

  // SMS paiement validé
  paymentValidatedSMS(parentName, amount, studentName) {
    return `✅ Paiement confirmé! ${amount} F CFA reçu pour ${studentName}. Merci de votre confiance! - EduPulse`;
  }

  // SMS paiement échoué
  paymentFailedSMS(parentName, amount, reason) {
    return `❌ Paiement de ${amount} F CFA échoué. Raison: ${reason}. Veuillez réessayer. - EduPulse`;
  }

  // SMS notification générale
  generalNotificationSMS(studentName, message) {
    return `${studentName}: ${message} - EduPulse`;
  }

  /**
   * Envoyer SMS de paiement créé au parent
   */
  async notifyPaymentCreated(parentPhoneNumber, parentName, amount, reference) {
    const message = this.paymentCreatedSMS(parentName, amount, reference);
    return await this.sendSMS(parentPhoneNumber, message);
  }

  /**
   * Envoyer SMS de paiement validé au parent
   */
  async notifyPaymentValidated(
    parentPhoneNumber,
    parentName,
    amount,
    studentName,
  ) {
    const message = this.paymentValidatedSMS(parentName, amount, studentName);
    return await this.sendSMS(parentPhoneNumber, message);
  }

  /**
   * Envoyer SMS de paiement échoué au parent
   */
  async notifyPaymentFailed(parentPhoneNumber, parentName, amount, reason) {
    const message = this.paymentFailedSMS(parentName, amount, reason);
    return await this.sendSMS(parentPhoneNumber, message);
  }

  /**
   * Récupérer l'historique des SMS
   */
  getSMSHistory() {
    return this.smsHistory;
  }

  /**
   * Formater un numéro de téléphone (Togo)
   * +228xxxxxxxxxx ou 228xxxxxxxxxx
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;

    // Retirer les espaces et caractères spéciaux
    let cleaned = phone.replace(/\D/g, "");

    // Ajouter le code pays Togo si manquant
    if (!cleaned.startsWith("228")) {
      if (
        cleaned.startsWith("90") ||
        cleaned.startsWith("92") ||
        cleaned.startsWith("93") ||
        cleaned.startsWith("97") ||
        cleaned.startsWith("98")
      ) {
        cleaned = "228" + cleaned;
      }
    }

    return "+" + cleaned;
  }
}

// Export singleton
export const smsService = new SMSService();
