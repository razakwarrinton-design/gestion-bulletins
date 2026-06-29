// src/services/PaymentService.js - VERSION ULTRA-SIMPLE (Structure réelle)
import { supabase } from "../config/supabase";

/**
 * Service de paiement simplifié
 * ✅ Utilise UNIQUEMENT les colonnes existantes : id, student_id, fee_type_id, amount_paid
 */

export class PaymentService {
  constructor() {
    this.providers = {
      orange_money: "Orange Money",
      moov_money: "Moov Money",
      vodafone_cash: "Vodafone Cash",
      wave: "Wave",
      stripe: "Stripe",
      paypal: "PayPal",
      bank_transfer: "Bank Transfer",
    };
  }

  /**
   * Liste tous les providers disponibles
   */
  getAvailableProviders() {
    return Object.entries(this.providers).map(([key, label]) => ({
      id: key,
      label,
      icon: this.getProviderIcon(key),
      region: this.getProviderRegion(key),
    }));
  }

  /**
   * Get icon pour chaque provider
   */
  getProviderIcon(provider) {
    const icons = {
      orange_money: "🟠",
      moov_money: "📱",
      vodafone_cash: "💳",
      wave: "🌊",
      stripe: "💳",
      paypal: "🅿️",
      bank_transfer: "🏦",
    };
    return icons[provider] || "💰";
  }

  /**
   * Get région/zone pour chaque provider
   */
  getProviderRegion(provider) {
    const regions = {
      orange_money: "Afrique Francophone",
      moov_money: "Afrique Francophone",
      vodafone_cash: "Togo",
      wave: "Afrique Subsaharienne",
      stripe: "International",
      paypal: "International",
      bank_transfer: "Global",
    };
    return regions[provider] || "Global";
  }

  /**
   * Initier un paiement
   * ✅ UNIQUEMENT : student_id, fee_type_id, amount_paid
   */
  async initiatePayment(paymentData) {
    try {
      const {
        studentId,
        amount,
        provider,
        description,
        phoneNumber,
        email,
        feeTypeId,
      } = paymentData;

      // Valider les données
      if (!studentId || !amount || !provider) {
        throw new Error(
          "Données de paiement incomplètes (studentId, amount, provider)",
        );
      }

      console.log("📝 Initiation paiement:", {
        studentId,
        amount,
        provider,
        feeTypeId,
      });

      // ✅ UNIQUEMENT les colonnes existantes
      const paymentRecord = {
        student_id: studentId,
        amount_paid: parseFloat(amount),
        fee_type_id: feeTypeId || null,
      };

      // Sauvegarder en base
      const { data, error } = await supabase
        .from("payments")
        .insert([paymentRecord])
        .select()
        .single();

      if (error) {
        console.error("❌ Erreur Supabase:", error);
        throw error;
      }

      console.log("✅ Paiement créé en base:", data);

      // Simuler la redirection selon le provider
      const result = {
        externalReference: `${provider.toUpperCase()}-${data.id.substring(0, 8)}`,
        message: `Requête ${this.providers[provider]} créée`,
      };

      // Ajouter infos spécifiques au provider
      if (provider === "bank_transfer") {
        result.bankDetails = {
          accountName: "EduPulse SARL",
          accountNumber: "1234567890",
          bankName: "Banque Togolaise",
          swift: "BKTGTG",
          reference: `PAY-${data.id.substring(0, 8)}`,
          amount: amount,
        };
      } else if (provider === "stripe") {
        result.redirectUrl = `https://stripe.example.com/pay/${data.id}`;
      } else if (
        ["orange_money", "moov_money", "vodafone_cash", "wave"].includes(
          provider,
        )
      ) {
        result.redirectUrl = `https://${provider}.example.com/pay/${data.id}`;
      }

      return {
        success: true,
        paymentId: data.id,
        reference: `PAY-${data.id.substring(0, 8)}`,
        provider,
        description,
        ...result,
      };
    } catch (error) {
      console.error("❌ Erreur initiation paiement:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(paymentId) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (error) throw error;

      return {
        status: "pending", // À implémenter avec webhooks
        amount: data.amount_paid,
        studentId: data.student_id,
      };
    } catch (error) {
      console.error("Erreur vérification paiement:", error);
      return null;
    }
  }

  /**
   * Récupérer l'historique des paiements
   */
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

  /**
   * Obtenir les statistiques des paiements
   */
  async getPaymentStatistics(studentId) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", studentId);

      if (error) throw error;

      const totalAmount = data.reduce(
        (sum, p) => sum + parseFloat(p.amount_paid || 0),
        0,
      );

      return {
        total: data.length,
        totalAmount,
        averageAmount: data.length > 0 ? totalAmount / data.length : 0,
      };
    } catch (error) {
      console.error("Erreur statistiques paiements:", error);
      return null;
    }
  }

  /**
   * Formater un montant
   */
  formatAmount(amount, currency = "XOF") {
    return new Intl.NumberFormat("fr-TG", {
      style: "currency",
      currency,
    }).format(parseFloat(amount) || 0);
  }
}

// Export singleton
export const paymentService = new PaymentService();
