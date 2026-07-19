// src/services/SMSService.js
/**
 * Service SMS - AfricasTalking
 * Envoie des SMS aux parents pour notifications de paiement
 */

const AFRICAS_TALKING_API_URL =
  "https://api.sandbox.africastalking.com/version1/messaging";
const API_KEY = import.meta.env.REACT_APP_AFRICAS_TALKING_API_KEY || "";
const SHORTCODE =
  import.meta.env.REACT_APP_AFRICAS_TALKING_SHORTCODE || "44801";
const USERNAME = "sandbox"; // Sandbox mode

export class SMSService {
  constructor() {
    this.apiKey = API_KEY;
    this.shortcode = SHORTCODE;
    this.username = USERNAME;
    this.smsHistory = [];
  }

  /**
   * Envoyer un SMS
   */
  async sendSMS(phoneNumber, message) {
    try {
      // Valider le numéro
      if (!phoneNumber || !phoneNumber.trim()) {
        throw new Error("Numéro de téléphone manquant");
      }

      if (!message || !message.trim()) {
        throw new Error("Message vide");
      }

      console.log(`📱 Envoi SMS à ${phoneNumber}: ${message}`);

      // En mode sandbox/test, simuler l'envoi
      if (this.username === "sandbox" || !this.apiKey) {
        return this.simulateSMSSend(phoneNumber, message);
      }

      // En production, appeler l'API réelle
      return await this.sendViaAPI(phoneNumber, message);
    } catch (error) {
      console.error("❌ Erreur envoi SMS:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envoyer via API AfricasTalking (production)
   */
  async sendViaAPI(phoneNumber, message) {
    try {
      const formData = new FormData();
      formData.append("username", this.username);
      formData.append("to", phoneNumber);
      formData.append("message", message);

      const response = await fetch(AFRICAS_TALKING_API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          apiKey: this.apiKey,
        },
        body: new URLSearchParams(formData),
      });

      const data = await response.json();

      if (
        data.SMSMessageData?.Message === "Sent successfully" ||
        data.success
      ) {
        console.log("✅ SMS envoyé avec succès");
        this.logSMS(phoneNumber, message, "sent");
        return {
          success: true,
          reference:
            data.SMSMessageData?.Recipients?.[0]?.messageid || "unknown",
          message: "SMS envoyé avec succès",
        };
      } else {
        throw new Error(data.error || "Erreur API AfricasTalking");
      }
    } catch (error) {
      console.error("❌ Erreur API SMS:", error);
      this.logSMS(phoneNumber, message, "failed", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Simuler l'envoi SMS (mode sandbox)
   */
  simulateSMSSend(phoneNumber, message) {
    console.log(`📱 [SANDBOX] SMS envoyé à ${phoneNumber}`);
    console.log(`📝 Message: ${message}`);

    this.logSMS(phoneNumber, message, "sent");

    return {
      success: true,
      reference: `SANDBOX-${Date.now()}`,
      message: "✅ SMS simulé (mode sandbox)",
      sandbox: true,
    };
  }

  /**
   * Logger l'historique des SMS
   */
  logSMS(phoneNumber, message, status, error = null) {
    const smsRecord = {
      id: `sms-${Date.now()}`,
      phoneNumber,
      message,
      status, // 'sent', 'failed', 'pending'
      timestamp: new Date().toISOString(),
      error,
    };

    this.smsHistory.push(smsRecord);
    console.log("📋 SMS enregistré:", smsRecord);

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
