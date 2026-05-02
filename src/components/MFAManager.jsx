import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, AlertTriangle, Check } from 'lucide-react';
import { useMFA } from '../hooks/useMFA';
import MFASetup from './MFASetup';
import ConfirmModal from './ConfirmModal';

export default function MFAManager({ showNotification }) {
  const { checkMFAStatus, disableMFA, loading } = useMFA();
  const [mfaEnabled, setMfaEnabled]   = useState(false);
  const [factors, setFactors]         = useState([]);
  const [showSetup, setShowSetup]     = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checking, setChecking]       = useState(true);

  useEffect(() => {
    loadMFAStatus();
  }, []);

  const loadMFAStatus = async () => {
    setChecking(true);
    const { enabled, factors } = await checkMFAStatus();
    setMfaEnabled(enabled);
    setFactors(factors);
    setChecking(false);
  };

  const handleDisable = async () => {
    if (factors.length === 0) return;
    const success = await disableMFA(factors[0].id);
    if (success) {
      setMfaEnabled(false);
      setFactors([]);
      showNotification?.('2FA désactivé');
    }
  };

  if (checking) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-20 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (showSetup) {
    return (
      <MFASetup
        onSuccess={() => {
          setShowSetup(false);
          loadMFAStatus();
          showNotification?.('✅ 2FA activé avec succès !');
        }}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold text-gray-900">Authentification à deux facteurs</h3>
      </div>

      {/* Statut */}
      <div className={`rounded-2xl border-2 p-5 ${mfaEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${mfaEnabled ? 'bg-green-100' : 'bg-gray-200'}`}>
              {mfaEnabled
                ? <ShieldCheck className="w-6 h-6 text-green-600" />
                : <ShieldOff className="w-6 h-6 text-gray-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">
                  {mfaEnabled ? 'Activé' : 'Désactivé'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mfaEnabled ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                  {mfaEnabled ? '🛡️ Sécurisé' : '⚠️ Non sécurisé'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {mfaEnabled
                  ? 'Votre compte est protégé par une application d\'authentification TOTP.'
                  : 'Activez le 2FA pour protéger votre compte contre les accès non autorisés.'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4">
          {mfaEnabled ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-xl px-3 py-2">
                <Check className="w-4 h-4" />
                Application TOTP configurée
              </div>
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
                className="w-full py-2.5 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldOff className="w-4 h-4" /> Désactiver le 2FA
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSetup(true)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-md"
            >
              <ShieldCheck className="w-4 h-4" /> Activer le 2FA
            </button>
          )}
        </div>
      </div>

      {/* Info sécurité */}
      {!mfaEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Recommandé pour les admins</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Le 2FA empêche tout accès non autorisé même si votre mot de passe est compromis. Activez-le maintenant pour sécuriser les données scolaires.
            </p>
          </div>
        </div>
      )}

      {/* Modal confirmation désactivation */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDisable}
        title="Désactiver le 2FA ?"
        message="Votre compte sera moins sécurisé. Vous pourrez le réactiver à tout moment."
      />
    </div>
  );
}