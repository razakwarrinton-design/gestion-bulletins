import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook pour gérer le 2FA TOTP avec Supabase MFA
 */
export function useMFA() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // ── Vérifier si l'utilisateur a le 2FA activé ─────────────────────────────
  const checkMFAStatus = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return { enabled: false, factors: [] };
    const totpFactors = data?.totp || [];
    const verified    = totpFactors.filter(f => f.status === 'verified');
    return { enabled: verified.length > 0, factors: verified, all: totpFactors };
  }, []);

  // ── Démarrer l'enrollment 2FA (génère QR code) ────────────────────────────
  const enrollMFA = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });
      if (error) throw error;
      return {
        factorId:  data.id,
        qrCode:    data.totp.qr_code,
        secret:    data.totp.secret,
        uri:       data.totp.uri,
      };
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Vérifier et activer le 2FA (confirmer enrollment) ────────────────────
  const verifyAndActivateMFA = useCallback(async (factorId, code) => {
    setLoading(true); setError('');
    try {
      // Créer un challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      // Vérifier le code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: code.replace(/\s/g, ''),
      });
      if (verifyError) throw verifyError;
      return true;
    } catch (e) {
      setError(e.message === 'Invalid TOTP code' ? 'Code invalide. Réessayez.' : e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Vérifier un challenge MFA (lors de la connexion) ─────────────────────
  const verifyMFAChallenge = useCallback(async (factorId, code) => {
    setLoading(true); setError('');
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: code.replace(/\s/g, ''),
      });
      if (verifyError) throw verifyError;
      return { success: true, session: data };
    } catch (e) {
      setError(e.message === 'Invalid TOTP code' ? 'Code invalide. Réessayez.' : e.message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Désactiver le 2FA ─────────────────────────────────────────────────────
  const disableMFA = useCallback(async (factorId) => {
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Obtenir le niveau d'assurance actuel ──────────────────────────────────
  const getAssuranceLevel = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) return null;
    return data;
  }, []);

  return {
    loading, error, setError,
    checkMFAStatus, enrollMFA, verifyAndActivateMFA,
    verifyMFAChallenge, disableMFA, getAssuranceLevel,
  };
}