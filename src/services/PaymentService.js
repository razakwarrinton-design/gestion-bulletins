// src/services/PaymentService.js
import { supabase } from "../config/supabase";
import { smsService } from "./SMSService";
import { readFunctionError } from "../utils/functionError";

/**
 * Service de paiement
 *
 * Les paiements Mobile Money (Moov Money / Flooz, T-Money, MTN, Wave, Orange…) passent
 * par l'Edge Function `payment-initiate`, qui appelle FedaPay avec la clé secrète côté
 * serveur. Le statut final (completed / failed) n'est écrit que par `payment-webhook`
 * après confirmation signée : le navigateur ne peut jamais marquer un paiement comme
 * réussi. Voir docs/PAIEMENTS.md.
 */

const PROVIDERS = {
  mobile_money: {
    label: "Mobile Money",
    icon: "📱",
    region: "Togo, Bénin, Côte d'Ivoire, Sénégal",
    description: "Moov Money (Flooz), T-Money, MTN, Wave, Orange Money",
  },
};

export class PaymentService {
  constructor() {
    this.providers = Object.fromEntries(
      Object.entries(PROVIDERS).map(([id, p]) => [id, p.label]),
    );
  }

  /** Liste les moyens de paiement disponibles */
  getAvailableProviders() {
    return Object.entries(PROVIDERS).map(([id, p]) => ({
      id,
      label: p.label,
      icon: p.icon,
      region: p.region,
      description: p.description,
    }));
  }

  /** Ce moyen de paiement nécessite-t-il un numéro de téléphone ? */
  providerNeedsPhone(providerId) {
    return providerId === "mobile_money";
  }

  /**
   * Initie un paiement. Renvoie { success, paymentId, reference, redirectUrl } ou
   * { success: false, error }.
   */
  async initiatePayment(paymentData) {
    try {
      const { studentId, amount, provider, description, phoneNumber, feeTypeId } =
        paymentData;

      if (!studentId || !amount || !provider) {
        throw new Error(
          "Données de paiement incomplètes (studentId, amount, provider)",
        );
      }
      if (!PROVIDERS[provider]) {
        throw new Error("Moyen de paiement non pris en charge");
      }
      const numericAmount = Number(amount);
      if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
        throw new Error("Le montant doit être un nombre entier de FCFA");
      }

      const { data, error } = await supabase.functions.invoke(
        "payment-initiate",
        {
          body: {
            studentId,
            amount: numericAmount,
            feeTypeId: feeTypeId ?? null,
            description,
            phoneNumber,
          },
        },
      );
      if (error) throw new Error(await readFunctionError(error, "Erreur lors du paiement"));
      if (!data?.success || !data?.paymentUrl) {
        throw new Error(data?.error || "Réponse inattendue du service de paiement");
      }

      // SMS de confirmation (best-effort : ne doit pas faire échouer le paiement)
      if (paymentData.parentPhone) {
        try {
          await smsService.notifyPaymentCreated(
            paymentData.parentPhone,
            paymentData.parentName,
            numericAmount,
            data.reference,
          );
        } catch (smsError) {
          console.error("Erreur envoi SMS paiement:", smsError);
        }
      }

      return {
        success: true,
        paymentId: data.paymentId,
        reference: data.reference,
        provider,
        description,
        redirectUrl: data.paymentUrl,
        message: `Redirection vers ${PROVIDERS[provider].label}`,
      };
    } catch (error) {
      console.error("Erreur initiation paiement:", error);
      return { success: false, error: error.message };
    }
  }

  /** Statut réel d'un paiement, tel qu'écrit par le webhook */
  async checkPaymentStatus(paymentId) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("id, status, amount_paid, student_id, paid_at, failure_reason")
        .eq("id", paymentId)
        .single();
      if (error) throw error;

      return {
        paymentId: data.id,
        status: data.status || "pending",
        amount: data.amount_paid,
        studentId: data.student_id,
        paidAt: data.paid_at,
        failureReason: data.failure_reason,
      };
    } catch (error) {
      console.error("Erreur vérification paiement:", error);
      return null;
    }
  }

  /** Historique des paiements d'un élève */
  async getPaymentHistory(studentId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Erreur historique paiements:", error);
      return [];
    }
  }

  /** Statistiques : seuls les paiements confirmés comptent dans le total encaissé */
  async getPaymentStatistics(studentId) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("amount_paid, status")
        .eq("student_id", studentId);
      if (error) throw error;

      const completed = data.filter((p) => p.status === "completed");
      const totalAmount = completed.reduce(
        (sum, p) => sum + parseFloat(p.amount_paid || 0),
        0,
      );

      return {
        total: data.length,
        completed: completed.length,
        totalAmount,
        averageAmount: completed.length > 0 ? totalAmount / completed.length : 0,
      };
    } catch (error) {
      console.error("Erreur statistiques paiements:", error);
      return null;
    }
  }

  /** Formate un montant en FCFA */
  formatAmount(amount, currency = "XOF") {
    return new Intl.NumberFormat("fr-TG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount) || 0);
  }
}

export const paymentService = new PaymentService();
