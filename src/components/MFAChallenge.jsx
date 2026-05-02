import React, { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { useMFA } from '../hooks/useMFA';

/**
 * Modal qui apparaît lors de la connexion si le 2FA est activé
 * Demande le code TOTP pour finaliser la connexion
 */
export default function MFAChallenge({ factorId, onSuccess, onCancel }) {
  const { loading, error, setError, verifyMFAChallenge } = useMFA();
  const [code, setCode]       = useState('');
  const [attempts, setAttempts] = useState(0);
  const inputRef              = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleVerify = async () => {
    const cleanCode = code.replace(/\s/g, '');
    if (cleanCode.length !== 6) {
      setError('Entrez le code à 6 chiffres');
      return;
    }
    const result = await verifyMFAChallenge(factorId, cleanCode);
    if (result.success) {
      onSuccess?.();
    } else {
      setAttempts(a => a + 1);
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleVerify();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">

        {/* Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Vérification en 2 étapes</h2>
          <p className="text-sm text-gray-500 mt-1">
            Entrez le code généré par votre application d'authentification
          </p>
        </div>

        {/* Input code */}
        <div className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            maxLength={7}
            value={code}
            onChange={(e) => {
              setError('');
              setCode(e.target.value.replace(/[^0-9\s]/g, ''));
            }}
            onKeyDown={handleKeyDown}
            placeholder="000 000"
            className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl text-center text-3xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              {attempts > 0 && <span className="ml-auto text-xs text-red-400">{attempts} essai{attempts > 1 ? 's' : ''}</span>}
            </div>
          )}

          {/* Info rafraîchissement */}
          <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
            <RefreshCw className="w-3 h-3" />
            Le code se renouvelle toutes les 30 secondes
          </div>

          {/* Boutons */}
          <button
            onClick={handleVerify}
            disabled={loading || code.replace(/\s/g, '').length !== 6}
            className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Vérification...</>
            ) : (
              <><Shield className="w-4 h-4" /> Vérifier</>
            )}
          </button>

          <button onClick={onCancel}
            className="w-full py-2.5 text-gray-500 text-sm hover:text-gray-700 transition">
            ← Retour à la connexion
          </button>
        </div>

        {/* Aide */}
        {attempts >= 2 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-semibold">Problème avec le code ?</p>
            <ul className="text-xs text-amber-600 mt-1 space-y-0.5">
              <li>• Vérifiez que l'heure de votre téléphone est correcte</li>
              <li>• Le code change toutes les 30 secondes</li>
              <li>• Assurez-vous d'utiliser la bonne app</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}