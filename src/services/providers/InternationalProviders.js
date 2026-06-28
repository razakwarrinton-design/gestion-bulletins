// src/services/providers/InternationalProviders.js
import axios from "axios";

/**
 * Service pour intégrer les paiements internationaux
 * Stripe, PayPal, Virement Bancaire
 */

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE
// ─────────────────────────────────────────────────────────────────────────────

export class StripeProvider {
  constructor(config) {
    this.publishableKey =
      config.publishableKey || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
    this.secretKey =
      config.secretKey || process.env.REACT_APP_STRIPE_SECRET_KEY;
    this.baseUrl = "https://api.stripe.com/v1";
    this.redirectUrl = config.redirectUrl;
  }

  /**
   * Créer une intention de paiement (PaymentIntent)
   */
  async requestPayment(paymentData) {
    try {
      // Créer une PaymentIntent
      const response = await axios.post(
        `${this.baseUrl}/payment_intents`,
        {
          amount: Math.round(paymentData.amount * 100), // Montant en centimes
          currency: "eur", // ou autre devise
          payment_method_types: ["card"],
          description: paymentData.description,
          metadata: {
            reference: paymentData.reference,
            student_id: paymentData.studentId,
          },
          receipt_email: paymentData.email,
        },
        {
          auth: {
            username: this.secretKey,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      return {
        success: true,
        externalReference: response.data.id,
        clientSecret: response.data.client_secret,
        redirectUrl: null, // Le frontend utilisera le clientSecret pour confirmer
        message: "PaymentIntent créée",
      };
    } catch (error) {
      console.error("Stripe Payment Error:", error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Confirmer le paiement (côté frontend avec Stripe.js)
   */
  async confirmPayment(clientSecret, paymentMethodId) {
    // Cette fonction est généralement appelée côté frontend avec @stripe/js
    try {
      const response = await axios.post(
        `${this.baseUrl}/payment_intents/${clientSecret}/confirm`,
        {
          payment_method: paymentMethodId,
        },
        {
          auth: {
            username: this.secretKey,
          },
        },
      );

      return {
        success: response.data.status === "succeeded",
        status: response.data.status,
        paymentIntentId: response.data.id,
      };
    } catch (error) {
      console.error("Stripe Confirm Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(paymentIntentId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/payment_intents/${paymentIntentId}`,
        {
          auth: {
            username: this.secretKey,
          },
        },
      );

      return {
        status:
          response.data.status === "succeeded"
            ? "completed"
            : response.data.status,
        amount: response.data.amount / 100, // Convertir de centimes
        currency: response.data.currency,
        timestamp: new Date(response.data.created * 1000),
      };
    } catch (error) {
      console.error("Stripe Status Error:", error);
      return { status: "error", error: error.message };
    }
  }

  /**
   * Créer une facture Stripe (pour les paiements récurrents)
   */
  async createInvoice(customerId, amount, description) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/invoices`,
        {
          customer: customerId,
          description,
          collection_method: "charge_automatically",
        },
        {
          auth: {
            username: this.secretKey,
          },
        },
      );

      return {
        success: true,
        invoiceId: response.data.id,
        status: response.data.status,
      };
    } catch (error) {
      console.error("Stripe Invoice Error:", error);
      return { success: false, error: error.message };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYPAL
// ─────────────────────────────────────────────────────────────────────────────

export class PayPalProvider {
  constructor(config) {
    this.clientId = config.clientId || process.env.REACT_APP_PAYPAL_CLIENT_ID;
    this.clientSecret =
      config.clientSecret || process.env.REACT_APP_PAYPAL_CLIENT_SECRET;
    this.baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://api.paypal.com"
        : "https://api.sandbox.paypal.com";
    this.redirectUrl = config.redirectUrl;
  }

  /**
   * Obtenir un token d'accès PayPal
   */
  async getAccessToken() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/oauth2/token`,
        "grant_type=client_credentials",
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
      return response.data.access_token;
    } catch (error) {
      console.error("PayPal Auth Error:", error);
      throw new Error("Impossible d'authentifier PayPal");
    }
  }

  /**
   * Créer une commande PayPal (order)
   */
  async requestPayment(paymentData) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders`,
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: paymentData.reference,
              amount: {
                currency_code: "EUR", // ou autre
                value: paymentData.amount.toString(),
              },
              description: paymentData.description,
            },
          ],
          payer: {
            email_address: paymentData.email,
          },
          return_url: `${this.redirectUrl}/payment/success`,
          cancel_url: `${this.redirectUrl}/payment/cancel`,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      // Trouver le lien "approve"
      const approveLink = response.data.links.find(
        (link) => link.rel === "approve",
      );

      return {
        success: true,
        externalReference: response.data.id,
        redirectUrl: approveLink?.href,
        message: "Commande PayPal créée",
      };
    } catch (error) {
      console.error("PayPal Payment Error:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Capturer une commande (après que le client approuve)
   */
  async captureOrder(orderId) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const capture = response.data.purchase_units[0].payments.captures[0];

      return {
        success: capture.status === "COMPLETED",
        status: capture.status,
        transactionId: capture.id,
        amount: capture.amount.value,
      };
    } catch (error) {
      console.error("PayPal Capture Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Vérifier le statut d'une commande
   */
  async checkPaymentStatus(orderId) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/v2/checkout/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const capture = response.data.purchase_units[0]?.payments?.captures?.[0];

      return {
        status:
          capture?.status === "COMPLETED" ? "completed" : response.data.status,
        amount: response.data.purchase_units[0].amount.value,
        timestamp: response.data.create_time,
      };
    } catch (error) {
      console.error("PayPal Status Error:", error);
      return { status: "error", error: error.message };
    }
  }

  /**
   * Créer un plan de paiement récurrent (subscription)
   */
  async createSubscription(planId, email) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/v1/billing/subscriptions`,
        {
          plan_id: planId,
          subscriber: {
            email_address: email,
          },
          application_context: {
            brand_name: "EduPulse",
            return_url: `${this.redirectUrl}/subscription/success`,
            cancel_url: `${this.redirectUrl}/subscription/cancel`,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const approveLink = response.data.links.find(
        (link) => link.rel === "approve",
      );

      return {
        success: true,
        subscriptionId: response.data.id,
        redirectUrl: approveLink?.href,
      };
    } catch (error) {
      console.error("PayPal Subscription Error:", error);
      return { success: false, error: error.message };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VIREMENT BANCAIRE MANUEL
// ─────────────────────────────────────────────────────────────────────────────

export class BankTransferProvider {
  constructor(config) {
    this.bankDetails = {
      accountName: "EduPulse SARL",
      accountNumber: config.accountNumber || "1234567890",
      bankName: config.bankName || "Banque Togolaise",
      swift: config.swift || "BKTGTG",
      iban: config.iban || "TG12 XXXX XXXX XXXX XXXX XXXX",
      currency: "XOF",
      reference: "",
    };
  }

  /**
   * Générer les détails de virement
   */
  async requestPayment(paymentData) {
    const bankDetails = {
      ...this.bankDetails,
      reference: paymentData.reference,
      amount: paymentData.amount,
      description: paymentData.description,
    };

    return {
      success: true,
      externalReference: `BT-${paymentData.reference}`,
      bankDetails,
      message:
        "Détails de virement générés. Veuillez envoyer le virement avec la référence comme libellé.",
    };
  }

  /**
   * Générer un reçu de paiement en attente
   */
  async generateReceiptTemplate(paymentData) {
    return {
      accountName: this.bankDetails.accountName,
      accountNumber: this.bankDetails.accountNumber,
      bankName: this.bankDetails.bankName,
      swift: this.bankDetails.swift,
      iban: this.bankDetails.iban,
      reference: paymentData.reference,
      amount: paymentData.amount,
      currency: this.bankDetails.currency,
      date: new Date().toLocaleDateString("fr-FR"),
    };
  }

  /**
   * Vérifier le statut d'un virement (manual - nécessite vérification admin)
   */
  async checkPaymentStatus(reference) {
    // À implémenter avec vérification admin
    return {
      status: "pending_manual_verification",
      message: "En attente de vérification manuelle par l'administrateur",
      reference,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createInternationalProvider(provider, config) {
  const providers = {
    stripe: StripeProvider,
    paypal: PayPalProvider,
    bank_transfer: BankTransferProvider,
  };

  const ProviderClass = providers[provider];
  if (!ProviderClass) {
    throw new Error(`Provider international non supporté: ${provider}`);
  }

  return new ProviderClass(config);
}
