// src/services/providers/MobileMoneyProviders.js
import axios from "axios";

/**
 * Service pour intégrer les paiements mobiles africains
 * Orange Money, Moov Money, Vodafone Cash, Wave
 */

// ─────────────────────────────────────────────────────────────────────────────
// ORANGE MONEY
// ─────────────────────────────────────────────────────────────────────────────

export class OrangeMoneyProvider {
  constructor(config) {
    this.clientId = config.clientId || process.env.REACT_APP_ORANGE_CLIENT_ID;
    this.clientSecret =
      config.clientSecret || process.env.REACT_APP_ORANGE_CLIENT_SECRET;
    this.baseUrl = "https://api.orange.com";
    this.redirectUrl = config.redirectUrl;
  }

  /**
   * Obtenir un token d'authentification
   */
  async getAuthToken() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/oauth/v3/token`,
        {
          grant_type: "client_credentials",
        },
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
        },
      );
      return response.data.access_token;
    } catch (error) {
      console.error("Orange Money Auth Error:", error);
      throw new Error("Impossible d'authentifier Orange Money");
    }
  }

  /**
   * Initier une requête de paiement
   */
  async requestPayment(paymentData) {
    try {
      const token = await this.getAuthToken();

      const response = await axios.post(
        `${this.baseUrl}/money/v1/payment/pay`,
        {
          reference: paymentData.reference,
          subscriber_phone: paymentData.phoneNumber,
          amount: paymentData.amount,
          currency: "XOF",
          description: paymentData.description,
          return_url: `${this.redirectUrl}/payment/callback`,
          webhook_url: `${this.redirectUrl}/api/webhooks/orange-money`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        success: true,
        externalReference: response.data.transaction_id,
        redirectUrl: response.data.payment_url,
        message: "Requête Orange Money créée",
      };
    } catch (error) {
      console.error("Orange Money Payment Error:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(transactionId) {
    try {
      const token = await this.getAuthToken();

      const response = await axios.get(
        `${this.baseUrl}/money/v1/payment/status/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return {
        status: response.data.status, // completed, pending, failed
        amount: response.data.amount,
        timestamp: response.data.timestamp,
      };
    } catch (error) {
      console.error("Orange Money Status Error:", error);
      return { status: "error", error: error.message };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOOV MONEY
// ─────────────────────────────────────────────────────────────────────────────

export class MoovMoneyProvider {
  constructor(config) {
    this.apiKey = config.apiKey || process.env.REACT_APP_MOOV_API_KEY;
    this.baseUrl = "https://api.moov.money";
    this.redirectUrl = config.redirectUrl;
  }

  /**
   * Initier une requête de paiement
   */
  async requestPayment(paymentData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/transactions/mobile-money`,
        {
          reference: paymentData.reference,
          amount: paymentData.amount,
          currency: "XOF",
          phone_number: paymentData.phoneNumber,
          operator: "mtn", // ou 'vodafone', 'airtel'
          description: paymentData.description,
          callback_url: `${this.redirectUrl}/api/webhooks/moov-money`,
          return_url: `${this.redirectUrl}/payment/callback`,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        success: true,
        externalReference: response.data.transaction_id,
        redirectUrl: response.data.authorization_url || null,
        message: "Requête Moov Money créée",
      };
    } catch (error) {
      console.error("Moov Money Payment Error:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(transactionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      return {
        status: response.data.status, // pending, completed, failed, cancelled
        amount: response.data.amount,
        timestamp: response.data.created_at,
      };
    } catch (error) {
      console.error("Moov Money Status Error:", error);
      return { status: "error", error: error.message };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VODAFONE CASH
// ─────────────────────────────────────────────────────────────────────────────

export class VodafoneCashProvider {
  constructor(config) {
    this.merchantId =
      config.merchantId || process.env.REACT_APP_VODAFONE_MERCHANT_ID;
    this.apiKey = config.apiKey || process.env.REACT_APP_VODAFONE_API_KEY;
    this.baseUrl = "https://api.vodafonecash.com";
    this.redirectUrl = config.redirectUrl;
  }

  /**
   * Initier une requête de paiement
   */
  async requestPayment(paymentData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/payment/request`,
        {
          merchant_id: this.merchantId,
          reference: paymentData.reference,
          amount: paymentData.amount,
          currency: "XOF",
          customer_phone: paymentData.phoneNumber,
          description: paymentData.description,
          callback_url: `${this.redirectUrl}/api/webhooks/vodafone-cash`,
        },
        {
          headers: {
            "X-API-Key": this.apiKey,
            "Content-Type": "application/json",
          },
        },
      );

      return {
        success: true,
        externalReference: response.data.request_id,
        redirectUrl: null, // Vodafone Cash envoie SMS au client
        message: "SMS de paiement envoyé au client",
      };
    } catch (error) {
      console.error("Vodafone Cash Payment Error:", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(requestId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/payment/status/${requestId}`,
        {
          headers: {
            "X-API-Key": this.apiKey,
          },
        },
      );

      return {
        status: response.data.status, // pending, completed, failed
        amount: response.data.amount,
        timestamp: response.data.timestamp,
      };
    } catch (error) {
      console.error("Vodafone Cash Status Error:", error);
      return { status: "error", error: error.message };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WAVE
// ─────────────────────────────────────────────────────────────────────────────

export class WaveProvider {
  constructor(config) {
    this.apiToken = config.apiToken || process.env.REACT_APP_WAVE_API_TOKEN;
    this.baseUrl = "https://api.wave.com";
    this.redirectUrl = config.redirectUrl;
  }

  /**
   * Initier une requête de paiement (GraphQL)
   */
  async requestPayment(paymentData) {
    try {
      const query = `
        mutation CreatePaymentRequest {
          paymentRequestCreate(input: {
            amount: "${paymentData.amount}"
            currency: "XOF"
            description: "${paymentData.description}"
            phoneNumber: "${paymentData.phoneNumber}"
            reference: "${paymentData.reference}"
            callbackUrl: "${this.redirectUrl}/api/webhooks/wave"
            redirectUrl: "${this.redirectUrl}/payment/callback"
          }) {
            paymentRequest {
              id
              url
              status
            }
            errors {
              message
            }
          }
        }
      `;

      const response = await axios.post(
        `${this.baseUrl}/graphql`,
        { query },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const paymentRequest =
        response.data.data.paymentRequestCreate.paymentRequest;

      return {
        success: true,
        externalReference: paymentRequest.id,
        redirectUrl: paymentRequest.url,
        message: "Requête Wave créée",
      };
    } catch (error) {
      console.error("Wave Payment Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Vérifier le statut d'un paiement (GraphQL)
   */
  async checkPaymentStatus(paymentRequestId) {
    try {
      const query = `
        query GetPaymentRequest {
          paymentRequest(id: "${paymentRequestId}") {
            id
            status
            amount
            currency
            createdAt
          }
        }
      `;

      const response = await axios.post(
        `${this.baseUrl}/graphql`,
        { query },
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const request = response.data.data.paymentRequest;

      return {
        status: request.status, // PENDING, COMPLETED, FAILED, CANCELLED
        amount: request.amount,
        timestamp: request.createdAt,
      };
    } catch (error) {
      console.error("Wave Status Error:", error);
      return { status: "error", error: error.message };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createMobileMoneyProvider(provider, config) {
  const providers = {
    orange_money: OrangeMoneyProvider,
    moov_money: MoovMoneyProvider,
    vodafone_cash: VodafoneCashProvider,
    wave: WaveProvider,
  };

  const ProviderClass = providers[provider];
  if (!ProviderClass) {
    throw new Error(`Provider mobile money non supporté: ${provider}`);
  }

  return new ProviderClass(config);
}
