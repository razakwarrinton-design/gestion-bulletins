// src/hooks/useSMS.js
import { useState } from "react";
import { smsService } from "../services/SMSService";

/**
 * Hook pour gérer les SMS
 */
export function useSMS() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [smsHistory, setSmsHistory] = useState([]);

  /**
   * Envoyer un SMS simple
   */
  const sendSMS = async (phoneNumber, message) => {
    try {
      setLoading(true);
      setError(null);

      const result = await smsService.sendSMS(phoneNumber, message);

      if (result.success) {
        console.log("✅ SMS envoyé");
        updateHistory();
        return result;
      } else {
        throw new Error(result.error || "Erreur envoi SMS");
      }
    } catch (err) {
      setError(err.message);
      console.error("❌ Erreur SMS:", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envoyer SMS de paiement créé
   */
  const notifyPaymentCreated = async (
    phoneNumber,
    parentName,
    amount,
    reference,
  ) => {
    return await sendSMS(
      phoneNumber,
      smsService.paymentCreatedSMS(parentName, amount, reference),
    );
  };

  /**
   * Envoyer SMS de paiement validé
   */
  const notifyPaymentValidated = async (
    phoneNumber,
    parentName,
    amount,
    studentName,
  ) => {
    return await sendSMS(
      phoneNumber,
      smsService.paymentValidatedSMS(parentName, amount, studentName),
    );
  };

  /**
   * Envoyer SMS de paiement échoué
   */
  const notifyPaymentFailed = async (
    phoneNumber,
    parentName,
    amount,
    reason,
  ) => {
    return await sendSMS(
      phoneNumber,
      smsService.paymentFailedSMS(parentName, amount, reason),
    );
  };

  /**
   * Mettre à jour l'historique
   */
  const updateHistory = () => {
    setSmsHistory(smsService.getSMSHistory());
  };

  /**
   * Récupérer l'historique
   */
  const getHistory = () => {
    return smsService.getSMSHistory();
  };

  /**
   * Formater un numéro de téléphone
   */
  const formatPhone = (phone) => {
    return smsService.formatPhoneNumber(phone);
  };

  return {
    sendSMS,
    notifyPaymentCreated,
    notifyPaymentValidated,
    notifyPaymentFailed,
    loading,
    error,
    smsHistory,
    updateHistory,
    getHistory,
    formatPhone,
  };
}
