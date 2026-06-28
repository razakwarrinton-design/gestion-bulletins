// src/hooks/usePayments.js
import { useState, useCallback } from "react";
import { paymentService } from "../services/PaymentService";

/**
 * Hook pour gérer les paiements
 * Usage: const { initiatePayment, checkStatus, providers } = usePayments();
 */
export function usePayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPayment, setCurrentPayment] = useState(null);

  /**
   * Obtenir les providers disponibles
   */
  const getProviders = useCallback(() => {
    return paymentService.getAvailableProviders();
  }, []);

  /**
   * Initier un paiement
   */
  const initiatePayment = useCallback(async (paymentData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await paymentService.initiatePayment(paymentData);
      if (result.success) {
        setCurrentPayment(result);
        return result;
      } else {
        setError(result.error);
        return result;
      }
    } catch (err) {
      const errorMsg = err.message || "Erreur lors du paiement";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Vérifier le statut d'un paiement
   */
  const checkPaymentStatus = useCallback(async (paymentId) => {
    try {
      const payment = await paymentService.checkPaymentStatus(paymentId);
      setCurrentPayment(payment);
      return payment;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Obtenir l'historique des paiements
   */
  const getPaymentHistory = useCallback(async (studentId) => {
    setLoading(true);
    try {
      const history = await paymentService.getPaymentHistory(studentId);
      return history;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Formater un montant
   */
  const formatAmount = useCallback((amount, currency = "XOF") => {
    return paymentService.formatAmount(amount, currency);
  }, []);

  /**
   * Réinitialiser l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // État
    loading,
    error,
    currentPayment,

    // Méthodes
    initiatePayment,
    checkPaymentStatus,
    getPaymentHistory,
    getProviders,
    formatAmount,
    clearError,
  };
}
