// src/services/PaymentService.js - VERSION MISE À JOUR AVEC TOUS LES PROVIDERS
import { supabase } from "../config/supabase";
import {
  createMobileMoneyProvider,
  OrangeMoneyProvider,
  MoovMoneyProvider,
  VodafoneCashProvider,
  WaveProvider,
} from "./providers/MobileMoneyProviders";
import {
  createInternationalProvider,
  StripeProvider,
  PayPalProvider,
  BankTransferProvider,
} from "./providers/InternationalProviders";

/**
 * Service centralisé pour gérer TOUS les paiements
 * Avec support complet des 7 providers
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

    // Initialiser les instances des providers
    this.providerInstances = this.initializeProviders();
  }

  /**
   * Initialiser les instances des providers
   */
  initializeProviders() {
    const instances = {};

    try {
      // Providers africains
      instances.orange_money = new OrangeMoneyProvider({
        redirectUrl: process.env.REACT_APP_ORANGE_REDIRECT_URL,
      });

      instances.moov_money = new MoovMoneyProvider({
        redirectUrl: process.env.REACT_APP_MOOV_REDIRECT_URL,
      });

      instances.vodafone_cash = new VodafoneCashProvider({
        redirectUrl: process.env.REACT_APP_VODAFONE_REDIRECT_URL,
      });

      instances.wave = new WaveProvider({
        redirectUrl: process.env.REACT_APP_WAVE_REDIRECT_URL,
      });

      // Providers internationaux
      instances.stripe = new StripeProvider({
        redirectUrl: process.env.REACT_APP_STRIPE_REDIRECT_URL,
      });

      instances.paypal = new PayPalProvider({
        redirectUrl: process.env.REACT_APP_PAYPAL_REDIRECT_URL,
      });

      instances.bank_transfer = new BankTransferProvider({
        accountNumber: process.env.REACT_APP_BANK_ACCOUNT_NUMBER,
        bankName: process.env.REACT_APP_BANK_NAME,
        swift: process.env.REACT_APP_BANK_SWIFT,
        iban: process.env.REACT_APP_BANK_IBAN,
      });
    } catch (error) {
      console.warn("Erreur initialisation providers:", error);
    }

    return instances;
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
      available: !!this.providerInstances[key],
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
   */
  async initiatePayment(paymentData) {
    try {
      const { studentId, amount, provider, description, phoneNumber, email } =
        paymentData;

      // Valider les données
      if (!studentId || !amount || !provider) {
        throw new Error("Données de paiement incomplètes");
      }

      // Créer un enregistrement de paiement en attente
      const paymentRecord = {
        student_id: studentId,
        amount: parseFloat(amount),
        provider,
        description: description || "Frais de scolarité",
        phone_number: phoneNumber,
        email,
        status: "pending",
        reference: this.generatePaymentReference(),
        created_at: new Date().toISOString(),
        metadata: {
          initiatedAt: new Date().toISOString(),
        },
      };

      // Sauvegarder en base
      const { data, error } = await supabase
        .from("payments")
        .insert([paymentRecord])
        .select()
        .single();

      if (error) throw error;

      // Appeler le provider approprié
      const providerResult = await this.callProvider(provider, {
        ...paymentData,
        paymentId: data.id,
        reference: data.reference,
      });

      // Mettre à jour avec la réponse du provider
      await supabase
        .from("payments")
        .update({
          status: "processing",
          external_reference: providerResult.externalReference,
          provider_response: providerResult,
        })
        .eq("id", data.id);

      return {
        success: true,
        paymentId: data.id,
        reference: data.reference,
        ...providerResult,
      };
    } catch (error) {
      console.error("Erreur initiation paiement:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Appeler le provider approprié
   */
  async callProvider(provider, data) {
    const providerInstance = this.providerInstances[provider];

    if (!providerInstance) {
      throw new Error(`Provider non disponible: ${provider}`);
    }

    console.log(`Appel provider: ${provider}`, data);

    try {
      return await providerInstance.requestPayment(data);
    } catch (error) {
      console.error(`Erreur ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(paymentId) {
    try {
      const { data: payment, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (error) throw error;

      // Si le statut est déjà complété ou échoué, retourner
      if (["completed", "failed", "cancelled"].includes(payment.status)) {
        return payment;
      }

      // Sinon, vérifier auprès du provider
      const providerInstance = this.providerInstances[payment.provider];
      if (!providerInstance) {
        return payment;
      }

      const providerStatus = await providerInstance.checkPaymentStatus(
        payment.external_reference,
      );

      // Mettre à jour le statut en base
      const newStatus = this.mapProviderStatus(providerStatus.status);
      await supabase
        .from("payments")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      return {
        ...payment,
        status: newStatus,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Erreur vérification paiement:", error);
      return null;
    }
  }

  /**
   * Mapper le statut du provider vers le statut interne
   */
  mapProviderStatus(status) {
    const mapping = {
      completed: "completed",
      succeeded: "completed",
      COMPLETED: "completed",
      pending: "processing",
      PENDING: "processing",
      processing: "processing",
      failed: "failed",
      FAILED: "failed",
      cancelled: "cancelled",
      CANCELLED: "cancelled",
    };
    return mapping[status] || "pending";
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

      const stats = {
        total: data.length,
        completed: data.filter((p) => p.status === "completed").length,
        pending: data.filter((p) => p.status === "pending").length,
        failed: data.filter((p) => p.status === "failed").length,
        totalAmount: data
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + p.amount, 0),
      };

      return stats;
    } catch (error) {
      console.error("Erreur statistiques paiements:", error);
      return null;
    }
  }

  /**
   * Générer une référence de paiement unique
   */
  generatePaymentReference() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAY-${timestamp}-${random}`;
  }

  /**
   * Formater un montant
   */
  formatAmount(amount, currency = "XOF") {
    return new Intl.NumberFormat("fr-TG", {
      style: "currency",
      currency,
    }).format(amount);
  }

  /**
   * Générer un reçu de paiement
   */
  async generateReceipt(paymentId) {
    try {
      const payment = await this.checkPaymentStatus(paymentId);
      if (!payment) throw new Error("Paiement non trouvé");

      return {
        reference: payment.reference,
        date: new Date(payment.created_at).toLocaleDateString("fr-FR"),
        amount: this.formatAmount(payment.amount),
        provider: this.providers[payment.provider],
        status: payment.status,
        description: payment.description,
      };
    } catch (error) {
      console.error("Erreur génération reçu:", error);
      return null;
    }
  }
}

// Export singleton
export const paymentService = new PaymentService();
