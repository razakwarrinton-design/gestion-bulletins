import React, { useState } from 'react';
import { Shield, Smartphone, Check, Copy, Eye, EyeOff, AlertTriangle, ChevronRight } from 'lucide-react';
import { useMFA } from '../hooks/useMFA';

// ── Étapes d'activation ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Télécharger une app' },
  { id: 2, label: 'Scanner le QR code' },
  { id: 3, label: 'Vérifier le code' },
];

export default function MFASetup({ onSuccess, onCancel }) {
  const { loading, error, setError, enrollMFA, verifyAndActivateMFA } = useMFA();
  const [step, setStep]           = useState(1);
  const [factorId, setFactorId]   = useState('');
  const [qrCode, setQrCode]       = useState('');
  const [secret, setSecret]       = useState('');
  const [code, setCode]           = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied]       = useState(false);

  const handleStartSetup = async () => {
    const data = await enrollMFA();
    if (!data) return;
    setFactorId(data.factorId);
    setQrCode(data.qrCode);
    setSecret(data.secret);
    setStep(2);
  };

  const handleVerify = async () => {
    if (code.replace(/\s/g, '').length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }
    const success = await verifyAndActivateMFA(factorId, code);
    if (success) {
      setStep(3);
      setTimeout(() => onSuccess?.(), 1500);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Activer l'authentification 2FA</h2>
        <p className="text-gray-500 mt-2 text-sm">Sécurisez votre compte avec une application d'authentification</p>
      </div>

      {/* Barre de progression */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-2 ${step >= s.id ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                step > s.id ? 'bg-blue-600 border-blue-600 text-white' :
                step === s.id ? 'border-blue-600 text-blue-600' :
                'border-gray-300 text-gray-400'
              }`}>
                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 max-w-12 ${step > s.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Étape 1 — Choisir une app */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Smartphone className="w-5 h-5" /> Installez une app d'authentification
            </h3>
            <p className="text-sm text-blue-700 mb-4">Téléchargez l'une de ces applications sur votre téléphone :</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Google Authenticator', icon: '🔑', desc: 'Android & iOS' },
                { name: 'Microsoft Authenticator', icon: '🛡️', desc: 'Android & iOS' },
                { name: 'Authy', icon: '📱', desc: 'Android & iOS' },
                { name: '1Password', icon: '🔐', desc: 'Android & iOS' },
              ].map((app, i) => (
                <div key={i} className="bg-white border border-blue-100 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-2xl">{app.icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-gray-800">{app.name}</div>
                    <div className="text-xs text-gray-400">{app.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
              Annuler
            </button>
            <button onClick={handleStartSetup} disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Continuer <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Étape 2 — Scanner QR */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">Scannez ce QR code avec votre application d'authentification</p>
            {qrCode ? (
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm">
                <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-gray-100 rounded-2xl mx-auto animate-pulse" />
            )}
          </div>

          {/* Code manuel */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Ou entrez ce code manuellement :</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono bg-white border border-gray-200 rounded-lg px-3 py-2 break-all">
                {showSecret ? secret : '•'.repeat(secret.length)}
              </code>
              <button onClick={() => setShowSecret(!showSecret)} className="p-2 text-gray-400 hover:text-gray-600">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={handleCopySecret} className="p-2 text-gray-400 hover:text-gray-600">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Saisie du code */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Entrez le code à 6 chiffres généré par l'app :
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={7}
              value={code}
              onChange={(e) => {
                setError('');
                const val = e.target.value.replace(/[^0-9\s]/g, '');
                setCode(val);
              }}
              placeholder="000 000"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {error && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
              Retour
            </button>
            <button onClick={handleVerify} disabled={loading || code.replace(/\s/g, '').length !== 6}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Vérifier et activer
            </button>
          </div>
        </div>
      )}

      {/* Étape 3 — Succès */}
      {step === 3 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">2FA activé avec succès ! 🎉</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Votre compte est maintenant protégé par l'authentification à deux facteurs. À chaque connexion, vous devrez entrer un code de votre application.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mt-4">
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Important !
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Conservez l'accès à votre application d'authentification. Si vous perdez votre téléphone, contactez l'administrateur pour désactiver le 2FA.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}